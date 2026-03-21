import Papa from "papaparse";
import type { Processor } from "bullmq";
import { bronzeImportBatches, db, sql } from "@cerniq/db";
import { jobsProcessed, jobDuration, jobErrors } from "../lib/worker-metrics.js";
import { createJobLogger } from "../lib/job-logger.js";
import { type JobLogger } from "../lib/job-logger.js";
import {
  createFileReadStream,
  detectColumnMapping,
  detectEncoding,
  getInsertBatchSize,
  insertBronzeRows,
  markImportBatchFailed,
  readInputContent,
  shouldUseStreaming,
  triggerNormalizationForContacts,
  triggerAnafBronzeEnrichment,
  updateImportBatchCounters,
  verifyFileHash,
} from "./ingest-utils.js";

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
  correlationId: string;
};

type CsvRow = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Helper: file integrity — extracted to reduce cognitive complexity (Sonar S3776)
// ---------------------------------------------------------------------------

/**
 * Verifies the SHA-256 hash of the uploaded file against the value stored
 * in `bronze_import_batches.metadata.fileHash`.  Throws if the file has been
 * tampered with after upload.  No-ops when either `filePath`, `batchId`, or
 * the stored hash are absent (supports the in-memory / `content`-only path).
 */
async function ensureFileIntegrity(data: CsvParserJobData, log: JobLogger): Promise<void> {
  if (!data.filePath || !data.batchId) return;

  const batch = await db.query.bronzeImportBatches.findFirst({
    where: (t, { eq }) => eq(t.id, data.batchId),
  });
  const storedHash = (batch?.metadata as Record<string, unknown> | null)?.fileHash as
    | string
    | undefined;

  if (storedHash === undefined) return;

  const { valid } = await verifyFileHash(data.filePath, storedHash);
  if (!valid) {
    log.error(
      "file_hash_check",
      "Verificare integritate SHA-256 EȘUATĂ — fișierul a fost modificat după upload",
      { filePath: data.filePath, expectedHash: storedHash },
    );
    throw new Error("File integrity check failed: SHA-256 hash mismatch");
  }

  log.info("file_hash_check", "Integritate fișier verificată cu succes (SHA-256 OK)", {
    filePath: data.filePath,
  });
}

async function parseSmallFile(job: { data: CsvParserJobData }) {
  const log = createJobLogger({
    batchId: job.data.batchId,
    tenantId: job.data.tenantId,
    workerName: "A1:csv-parser",
    jobId: String((job as unknown as { id?: string }).id ?? ""),
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

    await ensureFileIntegrity(job.data, log);

    const content = await readInputContent(job.data);
    const parsed = Papa.parse<CsvRow>(content, {
      header: job.data.hasHeader ?? true,
      delimiter: job.data.delimiter,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (parsed.errors.length > 0) {
      const firstErr = parsed.errors[0];
      log.error("csv_parse", `Parsare CSV eșuată: ${firstErr?.message ?? "eroare necunoscută"}`, {
        errorCode: firstErr?.code,
        errorRow: firstErr?.row,
        totalErrors: parsed.errors.length,
        allErrors: parsed.errors
          .slice(0, 10)
          .map((e) => ({ code: e.code, message: e.message, row: e.row })),
      });
      throw new Error(`CSV parse failed: ${firstErr?.message ?? "unknown error"}`);
    }
    log.info("csv_parse", `Fișier CSV parsat cu succes`, {
      totalRows: parsed.data.length,
      fields: parsed.meta.fields?.slice(0, 20),
    });

    const autoMapping =
      job.data.columnMapping ??
      detectColumnMapping(
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

    const result = await insertBronzeRows(
      job.data.tenantId,
      limitedRows,
      "csv_import",
      job.data.batchId,
      undefined,
      {
        startingRowNumber: processedRows + 1,
        columnMapping: autoMapping,
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
      await db
        .update(bronzeImportBatches)
        .set({
          metadata: sql`jsonb_set(COALESCE(${bronzeImportBatches.metadata}, '{}'::jsonb), '{columnMapping}', ${JSON.stringify(autoMapping)}::jsonb)`,
        })
        .where(
          sql`${bronzeImportBatches.tenantId} = ${job.data.tenantId} AND ${bronzeImportBatches.id} = ${job.data.batchId}`,
        );
    }

    await updateImportBatchCounters({
      tenantId: job.data.tenantId,
      batchId: job.data.batchId,
      processedRows,
      successRows,
      errorRows,
      duplicateRows,
      totalRows: processedRows,
      status: "completed",
      identityMetrics: {
        resolvedRows,
        duplicateSourceRows: duplicateRows,
        identityConflictRows,
        insufficientIdentifierRows,
      },
    });
    log.step(
      "dispatch_normalization",
      `Dispatch normalizare pentru ${result.processableIds?.length ?? 0} contacte (B1 Nume, B2 Email, B3 Telefon, B4 Adresă)`,
      {
        contactCount: result.processableIds?.length ?? 0,
      },
    );
    await triggerNormalizationForContacts(
      job.data.tenantId,
      result.processableIds,
      job.data.correlationId,
    );

    log.step(
      "dispatch_anaf_bronze",
      `Dispatch îmbogățire ANAF bronze (B5) — CUI-urile unice vor fi trimise în batch-uri de 100`,
      {
        contactCount: result.processableIds?.length ?? 0,
      },
    );
    await triggerAnafBronzeEnrichment(
      job.data.tenantId,
      job.data.batchId,
      result.processableIds,
      job.data.correlationId,
    );

    log.step("done", `Parsare CSV finalizată cu succes`, {
      rowsRead: processedRows,
      rowsInserted: successRows,
      duplicateRows,
      errorRows,
    });

    return {
      ok: true as const,
      rowsRead: processedRows,
      rowsInserted: successRows,
      duplicateRows,
      errorRows,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    log.error("fatal", `Parsare CSV eșuată: ${errMsg}`, {
      errorMessage: errMsg,
      errorStack: errStack,
      processedRows,
      successRows,
      errorRows,
      duplicateRows,
    });
    await markImportBatchFailed({
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

async function parseLargeFileStreaming(job: { data: CsvParserJobData }) {
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
    const encoding = job.data.encoding ?? (await detectFileEncoding(job.data.filePath));
    const readable = createFileReadStream(job.data.filePath, encoding);

    const skipRows = Math.max(0, job.data.skipRows ?? 0);
    const maxRows = job.data.maxRows;
    const batchSize = getInsertBatchSize();
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
            autoMapping = detectColumnMapping(
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
          flushInProgress
            .then(() => {
              if (rowBuffer.length > 0) {
                flushBuffer().then(resolve).catch(reject);
              } else {
                resolve();
              }
            })
            .catch(reject);
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
      } = await insertBronzeRows(
        job.data.tenantId,
        batch,
        "csv_import",
        job.data.batchId,
        undefined,
        {
          startingRowNumber: totalRowsRead - batch.length + 1,
          columnMapping: autoMapping,
        },
      );
      totalRowsInserted += rowsInserted;
      totalErrorRows += errorRows;
      totalDuplicateRows += duplicateRows;
      totalResolvedRows += resolvedRows;
      totalIdentityConflictRows += identityConflictRows;
      totalInsufficientIdentifierRows += insufficientIdentifierRows;
      allInsertedIds = allInsertedIds.concat(processableIds);

      await updateImportBatchCounters({
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
    }

    await updateImportBatchCounters({
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
    await triggerNormalizationForContacts(
      job.data.tenantId,
      allInsertedIds,
      job.data.correlationId,
    );
    await triggerAnafBronzeEnrichment(
      job.data.tenantId,
      job.data.batchId,
      allInsertedIds,
      job.data.correlationId,
    );

    if (job.data.batchId && autoMapping && Object.keys(autoMapping).length > 0) {
      await db
        .update(bronzeImportBatches)
        .set({
          metadata: sql`jsonb_set(COALESCE(${bronzeImportBatches.metadata}, '{}'::jsonb), '{columnMapping}', ${JSON.stringify(autoMapping)}::jsonb)`,
        })
        .where(
          sql`${bronzeImportBatches.tenantId} = ${job.data.tenantId} AND ${bronzeImportBatches.id} = ${job.data.batchId}`,
        );
    }

    return {
      ok: true as const,
      rowsRead: totalRowsRead,
      rowsInserted: totalRowsInserted,
      duplicateRows: totalDuplicateRows,
      errorRows: totalErrorRows,
    };
  } catch (error) {
    jobErrors.add(1, { worker: "a1-csv-parser" });
    await markImportBatchFailed({
      tenantId: job.data.tenantId,
      batchId: job.data.batchId,
      processedRows: totalRowsRead,
      successRows: totalRowsInserted,
      errorRows: totalErrorRows,
      duplicateRows: totalDuplicateRows,
      totalRows: totalRowsRead || undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function detectFileEncoding(filePath: string): Promise<string> {
  const { createReadStream } = await import("node:fs");
  const chunks: Buffer[] = [];
  let bytesRead = 0;
  const MAX_SAMPLE = 8192;

  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath, { start: 0, end: MAX_SAMPLE - 1 });
    stream.on("data", (chunk: Buffer | string) => {
      const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      chunks.push(buf);
      bytesRead += buf.length;
    });
    stream.on("end", resolve);
    stream.on("error", reject);
  });

  const sample = Buffer.concat(chunks, bytesRead);
  return detectEncoding(sample);
}

export const csvParserProcessor: Processor<CsvParserJobData> = async (job) => {
  const startedAt = Date.now();
  const useStreaming = await shouldUseStreaming(job.data);

  const result = useStreaming ? await parseLargeFileStreaming(job) : await parseSmallFile(job);
  jobsProcessed.add(1, { worker: "a1-csv-parser", status: "success" });
  jobDuration.record(Date.now() - startedAt, { worker: "a1-csv-parser" });
  return result;
};
