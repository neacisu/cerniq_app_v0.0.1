import { readFile } from "node:fs/promises";
import type { Processor } from "bullmq";
import ExcelJS from "exceljs";
import { bronzeImportBatches, db, sql } from "@cerniq/db";
import {
  updateImportRuntimeProgress,
  type ImportExecutionContext,
  withCognitiveSpan,
} from "@cerniq/worker-shared";
import { jobsProcessed, jobDuration, jobErrors } from "../lib/worker-metrics.js";
import { createJobLogger } from "../lib/job-logger.js";
import {
  detectColumnMapping,
  getInsertBatchSize,
  insertBronzeRows,
  markImportBatchFailed,
  triggerAnafBronzeEnrichment,
  triggerNormalizationForContacts,
  updateImportBatchCounters,
  verifyFileHash,
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
    lastSheetIndex?: number;
    lastRowNumber?: number;
  };
  importExecution?: ImportExecutionContext;
  correlationId: string;
};

function extractFormulaResult(result: unknown): string {
  if (result == null) return "";
  if (result instanceof Date) return result.toISOString();
  if (typeof result === "string") return result;
  if (typeof result === "number" || typeof result === "boolean") return String(result);
  return "";
}

function cellToString(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return "";
  if (typeof v !== "object") return String(v);
  if (v instanceof Date) return v.toISOString();
  if ("text" in v) return typeof v.text === "string" ? v.text : String(v.text);
  if ("richText" in v) return v.richText.map((rt: { text: string }) => rt.text).join("");
  if ("error" in v) return v.error;
  if ("formula" in v) return extractFormulaResult((v as ExcelJS.CellFormulaValue).result);
  if ("sharedFormula" in v) return extractFormulaResult(v.result);
  return "";
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
  resumeSheetIndex: number;
  resumeRowNumber: number;
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
    resumeSheetIndex: Number(resumeFrom.lastSheetIndex ?? -1),
    resumeRowNumber: Number(resumeFrom.lastRowNumber ?? -1),
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
  currentSheetIndex: number,
  currentRowNumber: number,
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

  await db
    .update(bronzeImportBatches)
    .set({
      metadata: sql`jsonb_set(COALESCE(${bronzeImportBatches.metadata}, '{}'::jsonb), '{resumeCursor}', ${JSON.stringify({ lastSheetIndex: currentSheetIndex, lastRowNumber: currentRowNumber })}::jsonb)`,
    })
    .where(sql`${bronzeImportBatches.id} = ${job.data.batchId}`);

  await updateImportRuntimeProgress(job as never, {
    checkpointPayload: {
      processedRows: state.totalRowsRead,
      successRows: state.totalRowsInserted,
      errorRows: state.totalErrorRows,
      duplicateRows: state.totalDuplicateRows,
      lastSheetIndex: currentSheetIndex,
      lastRowNumber: currentRowNumber,
    },
    resumePayload: {
      ...job.data,
      skipRows: state.totalRowsRead,
      resumeFrom: {
        processedRows: state.totalRowsRead,
        successRows: state.totalRowsInserted,
        errorRows: state.totalErrorRows,
        duplicateRows: state.totalDuplicateRows,
        lastSheetIndex: currentSheetIndex,
        lastRowNumber: currentRowNumber,
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

  return processableIds;
}

function shouldSkipRow(
  row: ExcelJS.Row,
  rowNum: number,
  state: ExcelImportState,
  skipRows: number,
  resumeAfterRow: number,
): boolean {
  if (!row.hasValues) return true;
  if (state.skippedDataRows < skipRows) {
    state.skippedDataRows += 1;
    return true;
  }
  if (resumeAfterRow >= 0 && rowNum <= resumeAfterRow) return true;
  return false;
}

async function processWorksheet(
  job: Parameters<typeof excelParserProcessor>[0],
  worksheet: ExcelJS.Worksheet,
  sheetName: string,
  sheetIndex: number,
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

  const isResumeSheet = state.resumeSheetIndex >= 0 && sheetIndex === state.resumeSheetIndex;
  const resumeAfterRow = isResumeSheet ? state.resumeRowNumber : -1;

  const rowBuffer: Array<Record<string, unknown>> = [];
  let lastRowNum = dataStartRowNum;
  for (let rowNum = dataStartRowNum; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    if (shouldSkipRow(row, rowNum, state, skipRows, resumeAfterRow)) continue;

    const rowObject = buildWorksheetRowObject(row, headers, hasHeader);
    if (Object.keys(rowObject).length === 0) continue;

    rowBuffer.push(rowObject);
    state.totalRowsRead += 1;
    lastRowNum = rowNum;
    if (rowBuffer.length >= batchSize) {
      await flushWorksheetBuffer(job, state, sheetName, rowBuffer, sheetIndex, lastRowNum);
    }
  }

  await flushWorksheetBuffer(job, state, sheetName, rowBuffer, sheetIndex, lastRowNum);
}

async function assertFileIntegrity(batchId: string, filePath: string): Promise<void> {
  if (!batchId) return;
  const batch = await db.query.bronzeImportBatches.findFirst({
    where: (t, { eq }) => eq(t.id, batchId),
  });
  const storedHash = (batch?.metadata as Record<string, unknown> | null)?.fileHash as
    | string
    | undefined;
  if (!storedHash) return;
  const { valid } = await verifyFileHash(filePath, storedHash);
  if (!valid) throw new Error("File integrity check failed: SHA-256 hash mismatch");
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
      metadata: sql`jsonb_set(jsonb_set(COALESCE(${bronzeImportBatches.metadata}, '{}'::jsonb), '{columnMapping}', ${JSON.stringify(autoDetectedMapping)}::jsonb), '{sheetNames}', ${JSON.stringify(targetSheets)}::jsonb)`,
    })
    .where(sql`${bronzeImportBatches.id} = ${batchId}`);
}

export const excelParserProcessor: Processor<ExcelParserJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:ingest:excel",
    async (_span) => {
      const startedAt = Date.now();
      const state = createExcelImportState(job.data);
      const log = createJobLogger({
        batchId: job.data.batchId,
        tenantId: job.data.tenantId,
        workerName: "A2:excel-parser",
        jobId: String(job.id ?? ""),
        startedAt,
      });

      try {
        log.step("start", `Parsare fișier Excel: ${job.data.fileName}`, {
          filePath: job.data.filePath,
          sheetName: job.data.sheetName,
          sheetIndex: job.data.sheetIndex,
          resumeFrom: job.data.resumeFrom,
        });

        const fileBuffer = await readFile(job.data.filePath);

        await assertFileIntegrity(job.data.batchId, job.data.filePath);
        log.info("file_integrity", `Integritate fișier verificată (SHA-256 ok)`, {
          filePath: job.data.filePath,
        });

        const workbook = new ExcelJS.Workbook();
        // ExcelJS 4.x types expect legacy Buffer; incompatible with Node 22+ resizable ArrayBuffer
        await workbook.xlsx.load(fileBuffer as unknown as import("exceljs").Buffer);

        const targetSheets = resolveTargetSheets(workbook, job.data);
        if (targetSheets.length === 0) {
          log.error("no_sheets", `Nu s-au găsit foi cu date în fișierul Excel`, {
            fileName: job.data.fileName,
          });
          throw new Error("Excel parse failed: no sheets with data found");
        }

        log.info(
          "sheets_detected",
          `${targetSheets.length} foi detectate: ${targetSheets.join(", ")}`,
          {
            sheets: targetSheets,
          },
        );
        await job.log(`Processing ${targetSheets.length} sheet(s): ${targetSheets.join(", ")}`);

        const batchSize = getInsertBatchSize();
        const dataStartRowNum = job.data.dataStartRow ?? 2;
        state.totalRowsExpected = calculateExpectedRows(workbook, targetSheets, dataStartRowNum);

        for (let sheetIdx = 0; sheetIdx < targetSheets.length; sheetIdx++) {
          if (state.resumeSheetIndex >= 0 && sheetIdx < state.resumeSheetIndex) {
            continue;
          }
          const sheetName = targetSheets[sheetIdx];
          const worksheet = workbook.getWorksheet(sheetName);
          if (!worksheet || worksheet.rowCount === 0) {
            continue;
          }
          log.info("sheet_start", `Procesare foaie "${sheetName}" (index ${sheetIdx})`, {
            sheetName,
            sheetIdx,
            rowCount: worksheet.rowCount,
          });
          await processWorksheet(job, worksheet, sheetName, sheetIdx, state, batchSize);
          log.info(
            "sheet_done",
            `Foaie "${sheetName}" procesată — ${state.totalRowsInserted} rânduri salvate total`,
            {
              sheetName,
              rowsRead: state.totalRowsRead,
              rowsInserted: state.totalRowsInserted,
              errorRows: state.totalErrorRows,
            },
          );
        }

        await persistBatchMappingMetadata(
          job.data.batchId,
          state.autoDetectedMapping,
          targetSheets,
        );

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
          job.data.batchId,
          job.data.importExecution ?? null,
        );
        await triggerAnafBronzeEnrichment(
          job.data.tenantId,
          job.data.batchId,
          state.allInsertedIds,
          job.data.correlationId,
          job.data.importExecution ?? null,
        );

        log.step(
          "done",
          `Import Excel finalizat: ${state.totalRowsInserted} contacte salvate în bronze`,
          {
            sheetsParsed: targetSheets.length,
            rowsRead: state.totalRowsRead,
            rowsInserted: state.totalRowsInserted,
            duplicateRows: state.totalDuplicateRows,
            errorRows: state.totalErrorRows,
            durationMs: Date.now() - startedAt,
          },
        );

        jobsProcessed.add(1, { worker: "a2-excel-parser", status: "success" });
        jobDuration.record(Date.now() - startedAt, { worker: "a2-excel-parser" });
        return {
          ok: true,
          sheetsParsed: targetSheets.length,
          rowsRead: state.totalRowsRead,
          rowsInserted: state.totalRowsInserted,
          duplicateRows: state.totalDuplicateRows,
          errorRows: state.totalErrorRows,
        };
      } catch (error) {
        jobErrors.add(1, { worker: "a2-excel-parser" });
        log.error("fatal", `Eroare critică la parsare Excel — importul a eșuat`, {
          fileName: job.data.fileName,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          rowsReadSoFar: state.totalRowsRead,
          rowsInsertedSoFar: state.totalRowsInserted,
        });
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
    },
    { tenantId: job.data.tenantId },
  );
};
