import Papa from "papaparse";
import { enrichError } from "@cerniq/observability";
import type { JobLogger } from "@cerniq/observability";
import type { ImportExecutionContext } from "@cerniq/worker-shared";

export type CsvParserJobData = {
  tenantId: string;
  batchId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  content?: string;
  encoding?: string;
  hasHeader?: boolean;
  delimiter?: string;
  columnMapping?: Record<string, string>;
  skipRows?: number;
  maxRows?: number;
  resumeFrom?: {
    processedRows?: number;
    successRows?: number;
    errorRows?: number;
    duplicateRows?: number;
  };
  importExecution?: ImportExecutionContext;
  correlationId: string;
};

export type CsvParserJobLoggerOpts = {
  batchId: string;
  tenantId: string;
  workerName: string;
  jobId: string;
  importExecution?: ImportExecutionContext | null;
  etapa: string;
  correlationId: string;
};

export type CsvBronzeInsertResult = {
  rowsInserted: number;
  errorRows: number;
  duplicateRows: number;
  resolvedRows: number;
  identityConflictRows: number;
  insufficientIdentifierRows: number;
  processableIds?: string[];
};

export type CsvParserJobHandle = {
  id?: string | number;
  name: string;
  data: CsvParserJobData;
  progress?: unknown;
};

export type CsvParserRuntimeProgressPatch = {
  checkpointPayload?: {
    processedRows: number;
    successRows: number;
    errorRows: number;
    duplicateRows: number;
  };
  resumePayload?: CsvParserJobData;
  counterDelta?: {
    totalUnits: number;
    processedUnits: number;
    successUnits: number;
    failedUnits: number;
    skippedUnits: number;
  };
};

export type BronzeCsvParserDeps = {
  getBatchFileHash: (args: { tenantId: string; batchId: string }) => Promise<string | undefined>;
  verifyFileHash: (filePath: string, expectedHash: string) => Promise<{ valid: boolean }>;
  readInputContent: (data: CsvParserJobData) => Promise<string>;
  createFileReadStream: (filePath: string, encoding: string) => NodeJS.ReadableStream;
  detectEncoding: (sample: Buffer) => string;
  detectColumnMapping: (fields: string[]) => Record<string, string>;
  getInsertBatchSize: () => number;
  shouldUseStreaming: (data: CsvParserJobData) => Promise<boolean>;
  insertBronzeRows: (
    tenantId: string,
    rows: Array<Record<string, unknown>>,
    sourceType: "csv_import",
    batchId: string | undefined,
    sheetName: undefined,
    options: {
      startingRowNumber: number;
      columnMapping: Record<string, string> | undefined;
      importExecution: ImportExecutionContext | null;
    },
  ) => Promise<CsvBronzeInsertResult>;
  updateImportBatchCounters: (args: {
    tenantId: string;
    batchId?: string;
    processedRows: number;
    successRows: number;
    errorRows: number;
    duplicateRows: number;
    totalRows?: number;
    status?: "pending" | "processing" | "completed" | "failed" | "cancelled";
    identityMetrics?: {
      resolvedRows: number;
      duplicateSourceRows: number;
      identityConflictRows: number;
      insufficientIdentifierRows: number;
    };
  }) => Promise<void>;
  markImportBatchFailed: (args: {
    tenantId: string;
    batchId?: string;
    processedRows: number;
    successRows: number;
    errorRows: number;
    duplicateRows: number;
    totalRows?: number;
    errorMessage: string;
  }) => Promise<void>;
  triggerNormalizationForContacts: (
    tenantId: string,
    processableIds: string[],
    correlationId: string,
    batchId: string | undefined,
    importExecution: ImportExecutionContext | null,
  ) => Promise<void>;
  triggerAnafBronzeEnrichment: (
    tenantId: string,
    batchId: string,
    processableIds: string[],
    correlationId: string,
    importExecution: ImportExecutionContext | null,
  ) => Promise<void>;
  persistBatchColumnMapping: (
    tenantId: string,
    batchId: string,
    mapping: Record<string, string>,
  ) => Promise<void>;
  updateImportRuntimeProgress: (
    job: CsvParserJobHandle,
    patch: CsvParserRuntimeProgressPatch,
  ) => Promise<{ paused: boolean }>;
  createJobLogger: (opts: CsvParserJobLoggerOpts) => JobLogger;
  recordParserWorkerError?: () => void;
};

type CsvRow = Record<string, unknown>;

async function ensureFileIntegrity(
  data: CsvParserJobData,
  log: JobLogger,
  deps: BronzeCsvParserDeps,
): Promise<void> {
  if (!data.filePath || !data.batchId) return;

  const storedHash = await deps.getBatchFileHash({
    tenantId: data.tenantId,
    batchId: data.batchId,
  });
  if (storedHash === undefined) return;

  const { valid } = await deps.verifyFileHash(data.filePath, storedHash);
  if (!valid) {
    log.error(
      "file_hash_check",
      "Verificare integritate SHA-256 E��UAT�� — fișierul a fost modificat după upload",
      { filePath: data.filePath, expectedHash: storedHash },
    );
    throw new Error("File integrity check failed: SHA-256 hash mismatch");
  }

  log.info("file_hash_check", "Integritate fișier verificată cu succes (SHA-256 OK)", {
    filePath: data.filePath,
  });
}

export async function detectFileEncoding(
  filePath: string,
  deps: Pick<BronzeCsvParserDeps, "detectEncoding">,
): Promise<string> {
  const { createReadStream } = await import("node:fs");
  const chunks: Buffer[] = [];
  let bytesRead = 0;
  const MAX_SAMPLE = 8192;

  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath, { start: 0, end: MAX_SAMPLE - 1 });
    stream.on("data", (chunk: Buffer | string) => {
      const buf = Buffer.from(chunk);
      chunks.push(buf);
      bytesRead += buf.length;
    });
    stream.on("end", resolve);
    stream.on("error", reject);
  });

  const sample = Buffer.concat(chunks, bytesRead);
  return deps.detectEncoding(sample);
}

async function finalizeSmallFileAfterInsert(
  job: CsvParserJobHandle,
  deps: BronzeCsvParserDeps,
  log: JobLogger,
  autoMapping: Record<string, string>,
  result: CsvBronzeInsertResult,
  counters: {
    processedRows: number;
    successRows: number;
    errorRows: number;
    duplicateRows: number;
    resolvedRows: number;
    identityConflictRows: number;
    insufficientIdentifierRows: number;
  },
): Promise<{
  ok: true;
  rowsRead: number;
  rowsInserted: number;
  duplicateRows: number;
  errorRows: number;
}> {
  if (result.identityConflictRows > 0) {
    log.warn(
      "identity_conflict",
      `${result.identityConflictRows} rânduri au conflicte de identitate — au fost create taskuri HITL pentru revizie manuală`,
      {
        identityConflictRows: result.identityConflictRows,
      },
    );
  }

  if (job.data.batchId && Object.keys(autoMapping).length > 0) {
    await deps.persistBatchColumnMapping(job.data.tenantId, job.data.batchId, autoMapping);
  }

  await deps.updateImportBatchCounters({
    tenantId: job.data.tenantId,
    batchId: job.data.batchId,
    processedRows: counters.processedRows,
    successRows: counters.successRows,
    errorRows: counters.errorRows,
    duplicateRows: counters.duplicateRows,
    totalRows: counters.processedRows,
    status: "completed",
    identityMetrics: {
      resolvedRows: counters.resolvedRows,
      duplicateSourceRows: counters.duplicateRows,
      identityConflictRows: counters.identityConflictRows,
      insufficientIdentifierRows: counters.insufficientIdentifierRows,
    },
  });
  log.step(
    "dispatch_normalization",
    `Dispatch normalizare pentru ${result.processableIds?.length ?? 0} contacte (B1 Nume, B2 Email, B3 Telefon, B4 Adresă)`,
    {
      contactCount: result.processableIds?.length ?? 0,
    },
  );
  await deps.triggerNormalizationForContacts(
    job.data.tenantId,
    result.processableIds ?? [],
    job.data.correlationId,
    job.data.batchId,
    job.data.importExecution ?? null,
  );

  log.step(
    "dispatch_anaf_bronze",
    `Dispatch îmbogățire ANAF bronze (B5) — CUI-urile unice vor fi trimise în batch-uri de 100`,
    {
      contactCount: result.processableIds?.length ?? 0,
    },
  );
  await deps.triggerAnafBronzeEnrichment(
    job.data.tenantId,
    job.data.batchId,
    result.processableIds ?? [],
    job.data.correlationId,
    job.data.importExecution ?? null,
  );

  log.step("done", `Parsare CSV finalizată cu succes`, {
    rowsRead: counters.processedRows,
    rowsInserted: counters.successRows,
    duplicateRows: counters.duplicateRows,
    errorRows: counters.errorRows,
  });

  return {
    ok: true as const,
    rowsRead: counters.processedRows,
    rowsInserted: counters.successRows,
    duplicateRows: counters.duplicateRows,
    errorRows: counters.errorRows,
  };
}

export async function parseSmallFile(
  job: CsvParserJobHandle,
  deps: BronzeCsvParserDeps,
): Promise<{
  ok: true;
  rowsRead: number;
  rowsInserted: number;
  duplicateRows: number;
  errorRows: number;
}> {
  const log = deps.createJobLogger({
    batchId: job.data.batchId,
    tenantId: job.data.tenantId,
    workerName: "A1:csv-parser",
    jobId: String(job.id ?? ""),
    importExecution: job.data.importExecution ?? null,
    etapa: "e1",
    correlationId: job.data.correlationId,
  });
  const resumeFrom = job.data.resumeFrom ?? {};
  let processedRows = Number(resumeFrom.processedRows ?? 0);
  let successRows = Number(resumeFrom.successRows ?? 0);
  let errorRows = Number(resumeFrom.errorRows ?? 0);
  let duplicateRows = Number(resumeFrom.duplicateRows ?? 0);
  let resolvedRows = 0;
  let identityConflictRows = 0;
  let insufficientIdentifierRows = 0;

  try {
    log.step("start", `Începe parsarea CSV: ${job.data.fileName ?? "(necunoscut)"}`, {
      fileSize: job.data.fileSize,
      encoding: job.data.encoding,
      hasHeader: job.data.hasHeader,
      resumeFrom,
    });

    await ensureFileIntegrity(job.data, log, deps);

    const content = await deps.readInputContent(job.data);
    const parsed = Papa.parse<CsvRow>(content, {
      header: job.data.hasHeader ?? true,
      delimiter: job.data.delimiter,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (parsed.errors.length > 0) {
      const firstErr = parsed.errors[0];
      const detailRaw = typeof firstErr?.message === "string" ? firstErr.message.trim() : "";
      const detail = detailRaw.length > 0 ? detailRaw : "eroare necunoscută";
      log.error("csv_parse", `Parsare CSV eșuată: ${detail}`, {
        errorCode: firstErr?.code,
        errorRow: firstErr?.row,
        totalErrors: parsed.errors.length,
        allErrors: parsed.errors
          .slice(0, 10)
          .map((e) => ({ code: e.code, message: e.message, row: e.row })),
      });
      throw new Error(`CSV parse failed: ${detailRaw.length > 0 ? detailRaw : "unknown error"}`, {
        cause: firstErr,
      });
    }
    log.info("csv_parse", `Fișier CSV parsat cu succes`, {
      totalRows: parsed.data.length,
      fields: parsed.meta.fields?.slice(0, 20),
    });

    const autoMapping =
      job.data.columnMapping ??
      deps.detectColumnMapping(
        parsed.meta.fields?.filter((field): field is string => typeof field === "string") ?? [],
      );

    const allRows = parsed.data
      .filter((row) => row && Object.keys(row).length > 0)
      .map((row) => row);

    const startIdx = Math.max(0, job.data.skipRows ?? 0);
    const limitedRows =
      typeof job.data.maxRows === "number"
        ? allRows.slice(startIdx, startIdx + job.data.maxRows)
        : allRows.slice(startIdx);

    const rowsInThisRun = limitedRows.length;

    log.step(
      "column_mapping",
      `Mapare coloane detectată: ${Object.keys(autoMapping).length} câmpuri mapate`,
      {
        mapping: autoMapping,
        rawHeaders: parsed.meta.fields?.slice(0, 30),
      },
    );

    const result = await deps.insertBronzeRows(
      job.data.tenantId,
      limitedRows,
      "csv_import",
      job.data.batchId,
      undefined,
      {
        startingRowNumber: processedRows + 1,
        columnMapping: autoMapping,
        importExecution: job.data.importExecution ?? null,
      },
    );
    processedRows += rowsInThisRun;
    successRows += result.rowsInserted;
    errorRows += result.errorRows;
    duplicateRows += result.duplicateRows;
    resolvedRows += result.resolvedRows;
    identityConflictRows += result.identityConflictRows;
    insufficientIdentifierRows += result.insufficientIdentifierRows;

    log.step(
      "insert_rows",
      `Rânduri inserate în bronze: ${result.rowsInserted} succes, ${result.errorRows} erori, ${result.duplicateRows} duplicate`,
      {
        rowsInThisRun,
        rowsInserted: result.rowsInserted,
        errorRows: result.errorRows,
        duplicateRows: result.duplicateRows,
        resolvedRows: result.resolvedRows,
        identityConflictRows: result.identityConflictRows,
        insufficientIdentifierRows: result.insufficientIdentifierRows,
        processableIds: result.processableIds?.length ?? 0,
      },
    );

    return finalizeSmallFileAfterInsert(job, deps, log, autoMapping, result, {
      processedRows,
      successRows,
      errorRows,
      duplicateRows,
      resolvedRows,
      identityConflictRows,
      insufficientIdentifierRows,
    });
  } catch (error) {
    const enriched = enrichError(error, {
      fileName: job.data.fileName,
      tenantId: job.data.tenantId,
      rowCount: processedRows,
      batchId: job.data.batchId,
    });
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    log.error("fatal", `Parsare CSV eșuată: ${errMsg}`, {
      ...enriched,
      errorMessage: errMsg,
      errorStack: errStack,
      processedRows,
      successRows,
      errorRows,
      duplicateRows,
    });
    await deps.markImportBatchFailed({
      tenantId: job.data.tenantId,
      batchId: job.data.batchId,
      processedRows,
      successRows,
      errorRows,
      duplicateRows,
      totalRows: processedRows || undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function parseLargeFileStreaming(
  job: CsvParserJobHandle,
  deps: BronzeCsvParserDeps,
): Promise<{
  ok: true;
  rowsRead: number;
  rowsInserted: number;
  duplicateRows: number;
  errorRows: number;
}> {
  const log = deps.createJobLogger({
    batchId: job.data.batchId,
    tenantId: job.data.tenantId,
    workerName: "A1:csv-parser",
    jobId: String(job.id ?? ""),
    importExecution: job.data.importExecution ?? null,
    etapa: "e1",
    correlationId: job.data.correlationId,
  });
  let autoMapping: Record<string, string> | undefined = job.data.columnMapping;
  const resumeFrom = job.data.resumeFrom ?? {};
  let totalRowsRead = Number(resumeFrom.processedRows ?? 0);
  let totalRowsInserted = Number(resumeFrom.successRows ?? 0);
  let totalDuplicateRows = Number(resumeFrom.duplicateRows ?? 0);
  let totalErrorRows = Number(resumeFrom.errorRows ?? 0);
  let totalResolvedRows = 0;
  let totalIdentityConflictRows = 0;
  let totalInsufficientIdentifierRows = 0;
  let allInsertedIds: string[] = [];
  let rowIndex = 0;
  try {
    log.step("start", `Începe parsarea CSV (streaming): ${job.data.fileName ?? "(necunoscut)"}`, {
      fileSize: job.data.fileSize,
      filePath: job.data.filePath,
      encoding: job.data.encoding,
      hasHeader: job.data.hasHeader,
      resumeFrom,
    });
    await ensureFileIntegrity(job.data, log, deps);
    const encoding = job.data.encoding ?? (await detectFileEncoding(job.data.filePath, deps));
    const readable = deps.createFileReadStream(job.data.filePath, encoding);

    const skipRows = Math.max(0, job.data.skipRows ?? 0);
    const maxRows = job.data.maxRows;
    const batchSize = deps.getInsertBatchSize();
    let rowBuffer: Array<Record<string, unknown>> = [];
    let reachedMax = false;
    let flushInProgress: Promise<void> = Promise.resolve();

    await new Promise<void>((resolve, reject) => {
      Papa.parse(readable, {
        header: job.data.hasHeader ?? true,
        delimiter: job.data.delimiter,
        skipEmptyLines: true,
        dynamicTyping: false,
        step: (results: Papa.ParseStepResult<CsvRow>, parser: Papa.Parser) => {
          if (reachedMax) return;

          if (!autoMapping && results.meta.fields) {
            autoMapping = deps.detectColumnMapping(
              results.meta.fields.filter((f): f is string => typeof f === "string"),
            );
          }

          rowIndex++;
          if (rowIndex <= skipRows) return;
          if (maxRows !== undefined && totalRowsRead >= maxRows) {
            reachedMax = true;
            parser.abort();
            return;
          }

          const row = results.data;
          if (!row || Object.keys(row).length === 0) return;

          rowBuffer.push(row);
          totalRowsRead++;

          if (rowBuffer.length >= batchSize) {
            parser.pause();
            flushInProgress = flushBuffer()
              .then(() => parser.resume())
              .catch((err) => {
                parser.abort();
                reject(err);
              });
          }
        },
        complete: () => {
          flushInProgress.then(() => flushBuffer().then(resolve).catch(reject)).catch(reject);
        },
        error: (err: Error) => reject(err),
      });
    });

    async function flushBuffer() {
      if (rowBuffer.length === 0) return;
      const batch = rowBuffer;
      rowBuffer = [];

      const {
        rowsInserted,
        processableIds,
        errorRows,
        duplicateRows,
        resolvedRows,
        identityConflictRows,
        insufficientIdentifierRows,
      } = await deps.insertBronzeRows(
        job.data.tenantId,
        batch,
        "csv_import",
        job.data.batchId,
        undefined,
        {
          startingRowNumber: totalRowsRead - batch.length + 1,
          columnMapping: autoMapping,
          importExecution: job.data.importExecution ?? null,
        },
      );
      totalRowsInserted += rowsInserted;
      totalErrorRows += errorRows;
      totalDuplicateRows += duplicateRows;
      totalResolvedRows += resolvedRows;
      totalIdentityConflictRows += identityConflictRows;
      totalInsufficientIdentifierRows += insufficientIdentifierRows;
      allInsertedIds = allInsertedIds.concat(processableIds ?? []);

      await deps.updateImportBatchCounters({
        tenantId: job.data.tenantId,
        batchId: job.data.batchId,
        processedRows: totalRowsRead,
        successRows: totalRowsInserted,
        errorRows: totalErrorRows,
        duplicateRows: totalDuplicateRows,
        status: "processing",
        identityMetrics: {
          resolvedRows: totalResolvedRows,
          duplicateSourceRows: totalDuplicateRows,
          identityConflictRows: totalIdentityConflictRows,
          insufficientIdentifierRows: totalInsufficientIdentifierRows,
        },
      });

      const runtimeProgress = await deps.updateImportRuntimeProgress(job, {
        checkpointPayload: {
          processedRows: totalRowsRead,
          successRows: totalRowsInserted,
          errorRows: totalErrorRows,
          duplicateRows: totalDuplicateRows,
        },
        resumePayload: {
          ...job.data,
          skipRows: totalRowsRead,
          resumeFrom: {
            processedRows: totalRowsRead,
            successRows: totalRowsInserted,
            errorRows: totalErrorRows,
            duplicateRows: totalDuplicateRows,
          },
        },
        counterDelta: {
          totalUnits: batch.length,
          processedUnits: batch.length,
          successUnits: rowsInserted,
          failedUnits: errorRows,
          skippedUnits: duplicateRows,
        },
      });
      if (runtimeProgress.paused) {
        return;
      }
    }

    await deps.updateImportBatchCounters({
      tenantId: job.data.tenantId,
      batchId: job.data.batchId,
      processedRows: totalRowsRead,
      successRows: totalRowsInserted,
      errorRows: totalErrorRows,
      duplicateRows: totalDuplicateRows,
      totalRows: totalRowsRead,
      status: "completed",
      identityMetrics: {
        resolvedRows: totalResolvedRows,
        duplicateSourceRows: totalDuplicateRows,
        identityConflictRows: totalIdentityConflictRows,
        insufficientIdentifierRows: totalInsufficientIdentifierRows,
      },
    });
    await deps.triggerNormalizationForContacts(
      job.data.tenantId,
      allInsertedIds,
      job.data.correlationId,
      job.data.batchId,
      job.data.importExecution ?? null,
    );
    await deps.triggerAnafBronzeEnrichment(
      job.data.tenantId,
      job.data.batchId,
      allInsertedIds,
      job.data.correlationId,
      job.data.importExecution ?? null,
    );

    if (job.data.batchId && autoMapping && Object.keys(autoMapping).length > 0) {
      await deps.persistBatchColumnMapping(job.data.tenantId, job.data.batchId, autoMapping);
    }

    log.step("done", `Parsare CSV streaming finalizată cu succes`, {
      rowsRead: totalRowsRead,
      rowsInserted: totalRowsInserted,
      duplicateRows: totalDuplicateRows,
      errorRows: totalErrorRows,
    });

    return {
      ok: true as const,
      rowsRead: totalRowsRead,
      rowsInserted: totalRowsInserted,
      duplicateRows: totalDuplicateRows,
      errorRows: totalErrorRows,
    };
  } catch (error) {
    deps.recordParserWorkerError?.();
    const enriched = enrichError(error, {
      fileName: job.data.fileName,
      tenantId: job.data.tenantId,
      rowCount: totalRowsRead,
      batchId: job.data.batchId,
    });
    const errMsg = error instanceof Error ? error.message : String(error);
    log.error("fatal", `Parsare CSV streaming eșuată: ${errMsg}`, {
      ...enriched,
      totalRowsRead,
      totalRowsInserted,
      totalErrorRows,
      totalDuplicateRows,
    });
    await deps.markImportBatchFailed({
      tenantId: job.data.tenantId,
      batchId: job.data.batchId,
      processedRows: totalRowsRead,
      successRows: totalRowsInserted,
      errorRows: totalErrorRows,
      duplicateRows: totalDuplicateRows,
      totalRows: totalRowsRead || undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error instanceof Error ? error : new Error(String(error), { cause: error });
  }
}

export async function executeCsvParserJob(
  job: CsvParserJobHandle,
  deps: BronzeCsvParserDeps,
): Promise<{
  ok: true;
  rowsRead: number;
  rowsInserted: number;
  duplicateRows: number;
  errorRows: number;
}> {
  const useStreaming = await deps.shouldUseStreaming(job.data);
  return useStreaming ? parseLargeFileStreaming(job, deps) : parseSmallFile(job, deps);
}
