import Papa from "papaparse";
import type { Processor } from "bullmq";
import { bronzeImportBatches, db, sql } from "@cerniq/db";
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
  updateImportBatchCounters,
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

async function parseSmallFile(job: { data: CsvParserJobData }) {
  const resumeFrom = job.data.resumeFrom ?? {};
  let processedRows = Number(resumeFrom.processedRows ?? 0);
  let successRows = Number(resumeFrom.successRows ?? 0);
  let errorRows = Number(resumeFrom.errorRows ?? 0);
  let duplicateRows = Number(resumeFrom.duplicateRows ?? 0);
  let resolvedRows = 0;
  let identityConflictRows = 0;
  let insufficientIdentifierRows = 0;

  try {
    const content = await readInputContent(job.data);
    const parsed = Papa.parse<CsvRow>(content, {
      header: job.data.hasHeader ?? true,
      delimiter: job.data.delimiter ?? ",",
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (parsed.errors.length > 0) {
      throw new Error(`CSV parse failed: ${parsed.errors[0]?.message ?? "unknown error"}`);
    }

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

    if (job.data.batchId && Object.keys(autoMapping).length > 0) {
      await db
        .update(bronzeImportBatches)
        .set({
          metadata: sql`COALESCE(${bronzeImportBatches.metadata}, '{}'::jsonb) || ${JSON.stringify({
            columnMapping: autoMapping,
          })}::jsonb`,
        })
        .where(sql`${bronzeImportBatches.id} = ${job.data.batchId}`);
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
    await triggerNormalizationForContacts(
      job.data.tenantId,
      result.processableIds,
      job.data.correlationId,
    );

    return {
      ok: true as const,
      rowsRead: processedRows,
      rowsInserted: successRows,
      duplicateRows,
      errorRows,
    };
  } catch (error) {
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

    await new Promise<void>((resolve, reject) => {
      Papa.parse(readable, {
        header: job.data.hasHeader ?? true,
        delimiter: job.data.delimiter ?? ",",
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
            flushBuffer()
              .then(() => parser.resume())
              .catch((err) => {
                parser.abort();
                reject(err);
              });
          }
        },
        complete: () => {
          if (rowBuffer.length > 0) {
            flushBuffer().then(resolve).catch(reject);
          } else {
            resolve();
          }
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

    if (job.data.batchId && autoMapping && Object.keys(autoMapping).length > 0) {
      await db
        .update(bronzeImportBatches)
        .set({
          metadata: sql`COALESCE(${bronzeImportBatches.metadata}, '{}'::jsonb) || ${JSON.stringify({
            columnMapping: autoMapping,
          })}::jsonb`,
        })
        .where(sql`${bronzeImportBatches.id} = ${job.data.batchId}`);
    }

    return {
      ok: true as const,
      rowsRead: totalRowsRead,
      rowsInserted: totalRowsInserted,
      duplicateRows: totalDuplicateRows,
      errorRows: totalErrorRows,
    };
  } catch (error) {
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
  const useStreaming = await shouldUseStreaming(job.data);

  if (useStreaming) {
    return parseLargeFileStreaming(job);
  }
  return parseSmallFile(job);
};
