import Papa from "papaparse";
import type { Processor } from "bullmq";
import {
  createFileReadStream,
  detectColumnMapping,
  detectEncoding,
  getInsertBatchSize,
  insertBronzeRows,
  normalizeRow,
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
  correlationId: string;
};

type CsvRow = Record<string, unknown>;

async function parseSmallFile(job: { data: CsvParserJobData }) {
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
    .map((row) => normalizeRow(row, autoMapping));

  const startIdx = Math.max(0, job.data.skipRows ?? 0);
  const limitedRows =
    typeof job.data.maxRows === "number"
      ? allRows.slice(startIdx, startIdx + job.data.maxRows)
      : allRows.slice(startIdx);

  const { rowsInserted, insertedIds } = await insertBronzeRows(
    job.data.tenantId,
    limitedRows,
    "csv_import",
    job.data.batchId,
  );
  const duplicateRows = Math.max(0, limitedRows.length - rowsInserted);

  await updateImportBatchCounters({
    tenantId: job.data.tenantId,
    batchId: job.data.batchId,
    processedRows: limitedRows.length,
    successRows: rowsInserted,
    errorRows: 0,
    duplicateRows,
    status: "completed",
  });
  await triggerNormalizationForContacts(job.data.tenantId, insertedIds, job.data.correlationId);

  return { ok: true as const, rowsRead: limitedRows.length, rowsInserted, duplicateRows };
}

async function parseLargeFileStreaming(job: { data: CsvParserJobData }) {
  const encoding = job.data.encoding ?? (await detectFileEncoding(job.data.filePath));
  const readable = createFileReadStream(job.data.filePath, encoding);

  const skipRows = Math.max(0, job.data.skipRows ?? 0);
  const maxRows = job.data.maxRows;
  const batchSize = getInsertBatchSize();

  let autoMapping: Record<string, string> | undefined = job.data.columnMapping;
  let rowBuffer: Array<Record<string, unknown>> = [];
  let totalRowsRead = 0;
  let totalRowsInserted = 0;
  let totalDuplicateRows = 0;
  let allInsertedIds: string[] = [];
  let rowIndex = 0;
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

        rowBuffer.push(normalizeRow(row, autoMapping ?? {}));
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

    const { rowsInserted, insertedIds } = await insertBronzeRows(
      job.data.tenantId,
      batch,
      "csv_import",
      job.data.batchId,
    );
    totalRowsInserted += rowsInserted;
    totalDuplicateRows += Math.max(0, batch.length - rowsInserted);
    allInsertedIds = allInsertedIds.concat(insertedIds);

    await updateImportBatchCounters({
      tenantId: job.data.tenantId,
      batchId: job.data.batchId,
      processedRows: totalRowsRead,
      successRows: totalRowsInserted,
      errorRows: 0,
      duplicateRows: totalDuplicateRows,
      status: "processing",
    });
  }

  await updateImportBatchCounters({
    tenantId: job.data.tenantId,
    batchId: job.data.batchId,
    processedRows: totalRowsRead,
    successRows: totalRowsInserted,
    errorRows: 0,
    duplicateRows: totalDuplicateRows,
    status: "completed",
  });
  await triggerNormalizationForContacts(job.data.tenantId, allInsertedIds, job.data.correlationId);

  return {
    ok: true as const,
    rowsRead: totalRowsRead,
    rowsInserted: totalRowsInserted,
    duplicateRows: totalDuplicateRows,
  };
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
