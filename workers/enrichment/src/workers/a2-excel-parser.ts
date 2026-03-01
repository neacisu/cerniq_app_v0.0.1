import { readFile } from "node:fs/promises";
import type { Processor } from "bullmq";
import ExcelJS from "exceljs";
import {
  detectColumnMapping,
  insertBronzeRows,
  normalizeRow,
  triggerNormalizationForContacts,
  updateImportBatchCounters,
} from "./ingest-utils.js";

export type ExcelParserJobData = {
  tenantId: string;
  batchId: string;
  filePath: string;
  fileName: string;
  sheetName?: string;
  sheetIndex?: number;
  headerRow?: number;
  dataStartRow?: number;
  hasHeader?: boolean;
  columnMapping?: Record<string, string>;
  correlationId: string;
};

function cellToString(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object" && "text" in v) return String((v as { text: string }).text);
  if (typeof v === "object" && "result" in v)
    return String((v as { result: unknown }).result ?? "");
  return String(v);
}

export const excelParserProcessor: Processor<ExcelParserJobData> = async (job) => {
  const fileBuffer = await readFile(job.data.filePath);
  const workbook = new ExcelJS.Workbook();
  // @ts-expect-error — ExcelJS types expect pre-Node24 Buffer; compatible at runtime
  await workbook.xlsx.load(fileBuffer);

  const sheetNames = workbook.worksheets.map((ws) => ws.name);
  const targetSheets = job.data.sheetName
    ? [job.data.sheetName].filter((name) => sheetNames.includes(name))
    : [sheetNames[job.data.sheetIndex ?? 0]].filter(Boolean);

  if (targetSheets.length === 0) {
    throw new Error("Excel parse failed: no sheets available to parse");
  }

  const aggregatedRows: Array<Record<string, unknown>> = [];

  for (const sheetName of targetSheets) {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet || worksheet.rowCount === 0) continue;

    const headerRowNum = job.data.headerRow ?? 1;
    const dataStartRowNum = job.data.dataStartRow ?? 2;
    const hasHeader = job.data.hasHeader !== false;

    const headers: string[] = [];
    if (hasHeader) {
      const headerRow = worksheet.getRow(headerRowNum);
      headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber - 1] = cellToString(cell).trim();
      });
    }

    const mapping = job.data.columnMapping ?? (hasHeader ? detectColumnMapping(headers) : {});

    for (let rowNum = dataStartRowNum; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      if (!row.hasValues) continue;

      const rowObj: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const key = hasHeader
          ? (headers[colNumber - 1] ?? `Column${colNumber}`)
          : `Column${colNumber}`;
        rowObj[key] = cellToString(cell);
      });

      if (Object.keys(rowObj).length > 0) {
        aggregatedRows.push(normalizeRow(rowObj, mapping));
      }
    }
  }

  const { rowsInserted, insertedIds } = await insertBronzeRows(
    job.data.tenantId,
    aggregatedRows,
    "excel_import",
    job.data.batchId,
  );
  const duplicateRows = Math.max(0, aggregatedRows.length - rowsInserted);
  await updateImportBatchCounters({
    tenantId: job.data.tenantId,
    batchId: job.data.batchId,
    processedRows: aggregatedRows.length,
    successRows: rowsInserted,
    errorRows: 0,
    duplicateRows,
    status: "completed",
  });
  await triggerNormalizationForContacts(job.data.tenantId, insertedIds, job.data.correlationId);

  return {
    ok: true,
    sheetsParsed: targetSheets.length,
    rowsRead: aggregatedRows.length,
    rowsInserted,
    duplicateRows,
  };
};
