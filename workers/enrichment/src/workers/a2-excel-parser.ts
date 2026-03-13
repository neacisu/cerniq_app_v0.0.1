import { readFile } from "node:fs/promises";
import type { Processor } from "bullmq";
import ExcelJS from "exceljs";
import { bronzeImportBatches, db, sql } from "@cerniq/db";
import {
  detectColumnMapping,
  getInsertBatchSize,
  insertBronzeRows,
  markImportBatchFailed,
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
  skipRows?: number;
  columnMapping?: Record<string, string>;
  resumeFrom?: {
    processedRows?: number;
    successRows?: number;
    errorRows?: number;
    duplicateRows?: number;
  };
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

type ExcelImportState = {
  totalRowsRead: number;
  totalRowsInserted: number;
  totalDuplicateRows: number;
  totalErrorRows: number;
  totalResolvedRows: number;
  totalIdentityConflictRows: number;
  totalInsufficientIdentifierRows: number;
  totalRowsExpected: number;
  skippedDataRows: number;
  allInsertedIds: string[];
  autoDetectedMapping: Record<string, string>;
};

function createExcelImportState(job: ExcelParserJobData): ExcelImportState {
  const resumeFrom = job.resumeFrom ?? {};
  return {
    totalRowsRead: Number(resumeFrom.processedRows ?? 0),
    totalRowsInserted: Number(resumeFrom.successRows ?? 0),
    totalDuplicateRows: Number(resumeFrom.duplicateRows ?? 0),
    totalErrorRows: Number(resumeFrom.errorRows ?? 0),
    totalResolvedRows: 0,
    totalIdentityConflictRows: 0,
    totalInsufficientIdentifierRows: 0,
    totalRowsExpected: 0,
    skippedDataRows: 0,
    allInsertedIds: [],
    autoDetectedMapping:
      job.columnMapping && Object.keys(job.columnMapping).length > 0 ? job.columnMapping : {},
  };
}

function resolveTargetSheets(workbook: ExcelJS.Workbook, jobData: ExcelParserJobData): string[] {
  const allSheets = workbook.worksheets.filter((worksheet) => worksheet.rowCount > 0);
  if (jobData.sheetName) {
    const worksheet = allSheets.find((sheet) => sheet.name === jobData.sheetName);
    return worksheet ? [worksheet.name] : [];
  }
  if (jobData.sheetIndex == null) {
    return allSheets.map((worksheet) => worksheet.name);
  }

  const worksheet = allSheets[jobData.sheetIndex];
  return worksheet ? [worksheet.name] : [];
}

function countSheetDataRows(worksheet: ExcelJS.Worksheet, dataStartRowNum: number) {
  let rows = 0;
  for (let rowNum = dataStartRowNum; rowNum <= worksheet.rowCount; rowNum++) {
    if (worksheet.getRow(rowNum).hasValues) {
      rows += 1;
    }
  }
  return rows;
}

function calculateExpectedRows(
  workbook: ExcelJS.Workbook,
  targetSheets: string[],
  dataStartRowNum: number,
) {
  return targetSheets.reduce((total, sheetName) => {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet || worksheet.rowCount === 0) {
      return total;
    }
    return total + countSheetDataRows(worksheet, dataStartRowNum);
  }, 0);
}

function readWorksheetHeaders(
  worksheet: ExcelJS.Worksheet,
  headerRowNum: number,
  hasHeader: boolean,
) {
  if (!hasHeader) {
    return [];
  }

  const headers: string[] = [];
  const headerRow = worksheet.getRow(headerRowNum);
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = cellToString(cell).trim();
  });
  return headers;
}

function buildWorksheetRowObject(row: ExcelJS.Row, headers: string[], hasHeader: boolean) {
  const rowObject: Record<string, unknown> = {};
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const key = hasHeader ? (headers[colNumber - 1] ?? `Column${colNumber}`) : `Column${colNumber}`;
    rowObject[key] = cellToString(cell);
  });
  return rowObject;
}

function buildIdentityMetrics(state: ExcelImportState) {
  return {
    resolvedRows: state.totalResolvedRows,
    duplicateSourceRows: state.totalDuplicateRows,
    identityConflictRows: state.totalIdentityConflictRows,
    insufficientIdentifierRows: state.totalInsufficientIdentifierRows,
  };
}

async function flushWorksheetBuffer(
  job: Parameters<typeof excelParserProcessor>[0],
  state: ExcelImportState,
  sheetName: string,
  rowBuffer: Array<Record<string, unknown>>,
) {
  if (rowBuffer.length === 0) {
    return [];
  }

  const batch = [...rowBuffer];
  rowBuffer.length = 0;
  const startingRowNumber = state.totalRowsRead - batch.length + 1;
  const {
    rowsInserted,
    processableIds,
    errorRows,
    rowErrors,
    duplicateRows,
    resolvedRows,
    identityConflictRows,
    insufficientIdentifierRows,
  } = await insertBronzeRows(
    job.data.tenantId,
    batch,
    "excel_import",
    job.data.batchId,
    sheetName,
    {
      startingRowNumber,
      columnMapping: state.autoDetectedMapping,
    },
  );

  state.totalRowsInserted += rowsInserted;
  state.totalErrorRows += errorRows;
  state.totalDuplicateRows += duplicateRows;
  state.totalResolvedRows += resolvedRows;
  state.totalIdentityConflictRows += identityConflictRows;
  state.totalInsufficientIdentifierRows += insufficientIdentifierRows;
  state.allInsertedIds.push(...processableIds);

  for (const rowError of rowErrors.slice(0, 5)) {
    await job.log(
      `Skipped row ${rowError.rowNumber ?? "unknown"} in ${sheetName}: ${rowError.message}`,
    );
  }

  await updateImportBatchCounters({
    tenantId: job.data.tenantId,
    batchId: job.data.batchId,
    processedRows: state.totalRowsRead,
    successRows: state.totalRowsInserted,
    errorRows: state.totalErrorRows,
    duplicateRows: state.totalDuplicateRows,
    totalRows: state.totalRowsExpected,
    status: "processing",
    identityMetrics: buildIdentityMetrics(state),
  });

  return processableIds;
}

async function processWorksheet(
  job: Parameters<typeof excelParserProcessor>[0],
  worksheet: ExcelJS.Worksheet,
  sheetName: string,
  state: ExcelImportState,
  batchSize: number,
) {
  const headerRowNum = job.data.headerRow ?? 1;
  const dataStartRowNum = job.data.dataStartRow ?? 2;
  const hasHeader = job.data.hasHeader !== false;
  const skipRows = Math.max(0, job.data.skipRows ?? 0);
  const headers = readWorksheetHeaders(worksheet, headerRowNum, hasHeader);

  if (hasHeader && Object.keys(state.autoDetectedMapping).length === 0) {
    state.autoDetectedMapping = detectColumnMapping(headers);
  }

  const rowBuffer: Array<Record<string, unknown>> = [];
  for (let rowNum = dataStartRowNum; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    if (!row.hasValues) {
      continue;
    }
    if (state.skippedDataRows < skipRows) {
      state.skippedDataRows += 1;
      continue;
    }

    const rowObject = buildWorksheetRowObject(row, headers, hasHeader);
    if (Object.keys(rowObject).length === 0) {
      continue;
    }

    rowBuffer.push(rowObject);
    state.totalRowsRead += 1;
    if (rowBuffer.length >= batchSize) {
      await flushWorksheetBuffer(job, state, sheetName, rowBuffer);
    }
  }

  await flushWorksheetBuffer(job, state, sheetName, rowBuffer);
}

async function persistBatchMappingMetadata(
  batchId: string,
  autoDetectedMapping: Record<string, string>,
  targetSheets: string[],
) {
  if (Object.keys(autoDetectedMapping).length === 0) {
    return;
  }

  await db
    .update(bronzeImportBatches)
    .set({
      metadata: sql`COALESCE(${bronzeImportBatches.metadata}, '{}'::jsonb) || ${JSON.stringify({
        columnMapping: autoDetectedMapping,
        sheetNames: targetSheets,
      })}::jsonb`,
    })
    .where(sql`${bronzeImportBatches.id} = ${batchId}`);
}

export const excelParserProcessor: Processor<ExcelParserJobData> = async (job) => {
  const state = createExcelImportState(job.data);

  try {
    const fileBuffer = await readFile(job.data.filePath);
    const workbook = new ExcelJS.Workbook();
    // @ts-expect-error — ExcelJS types expect pre-Node24 Buffer; compatible at runtime
    await workbook.xlsx.load(fileBuffer);

    const targetSheets = resolveTargetSheets(workbook, job.data);
    if (targetSheets.length === 0) {
      throw new Error("Excel parse failed: no sheets with data found");
    }

    await job.log(`Processing ${targetSheets.length} sheet(s): ${targetSheets.join(", ")}`);

    const batchSize = getInsertBatchSize();
    const dataStartRowNum = job.data.dataStartRow ?? 2;
    state.totalRowsExpected = calculateExpectedRows(workbook, targetSheets, dataStartRowNum);

    for (const sheetName of targetSheets) {
      const worksheet = workbook.getWorksheet(sheetName);
      if (!worksheet || worksheet.rowCount === 0) {
        continue;
      }
      await processWorksheet(job, worksheet, sheetName, state, batchSize);
    }

    await persistBatchMappingMetadata(job.data.batchId, state.autoDetectedMapping, targetSheets);

    await updateImportBatchCounters({
      tenantId: job.data.tenantId,
      batchId: job.data.batchId,
      processedRows: state.totalRowsRead,
      successRows: state.totalRowsInserted,
      errorRows: state.totalErrorRows,
      duplicateRows: state.totalDuplicateRows,
      totalRows: state.totalRowsExpected,
      status: "completed",
      identityMetrics: buildIdentityMetrics(state),
    });
    await triggerNormalizationForContacts(
      job.data.tenantId,
      state.allInsertedIds,
      job.data.correlationId,
    );

    return {
      ok: true,
      sheetsParsed: targetSheets.length,
      rowsRead: state.totalRowsRead,
      rowsInserted: state.totalRowsInserted,
      duplicateRows: state.totalDuplicateRows,
      errorRows: state.totalErrorRows,
    };
  } catch (error) {
    await markImportBatchFailed({
      tenantId: job.data.tenantId,
      batchId: job.data.batchId,
      processedRows: state.totalRowsRead,
      successRows: state.totalRowsInserted,
      errorRows: state.totalErrorRows,
      duplicateRows: state.totalDuplicateRows,
      totalRows: state.totalRowsExpected || undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
