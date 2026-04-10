import { mkdir, writeFile, readFile, access, copyFile, unlink } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { basename, extname } from "node:path";
import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  bronzeContacts,
  bronzeImportBatches,
  db,
  importRowQuarantine,
  importRuntimeJobs,
  importRuntimeSessions,
  importRuntimeWorkerCounters,
  inArray,
  jobLogs,
  silverContacts,
  silverEnrichmentLog,
  setSessionTenantId,
  sql,
  tenants,
  batchIdMetadataEquals,
  failedReprocessContactEquals,
  type SQL,
} from "@cerniq/db";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { z } from "zod";
import { COLUMN_MAPPING_DEFINITIONS } from "@cerniq/shared-types";
import {
  QUEUES,
  enqueueImportJob,
  resumeImportRuntimeJobs,
  setBatchImportPause,
  setBatchWorkerPause,
  setTenantImportGlobalPause,
  markImportBatchDeleteRequested,
} from "@cerniq/worker-shared";
import { getActorId, parseLimit, parseOffset, requireTenantId } from "./utils.js";
import { requireRole } from "../middleware/authz.js";
import { importConfigSchema, listBronzeContactsSchema } from "../schemas/etapa1.js";
import { createQueue } from "../lib/queue-factory.js";
import { buildApiJobPayloadContext } from "../lib/http-job-tracing.js";

const IMPORT_DIR = process.env.IMPORT_UPLOAD_DIR || "/app/data/imports";
const LEGACY_IMPORT_DIR = process.env.LEGACY_IMPORT_DIR ?? `${IMPORT_DIR}/legacy`;
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

const importStatusSchema = z.enum(["pending", "processing", "completed", "failed", "cancelled"]);
const sourceTypeSchema = z.enum([
  "csv_import",
  "webhook",
  "scrape",
  "manual",
  "api",
  "excel_import",
]);
const idParamsSchema = z.object({ id: z.uuid() });
const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
});
const successListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.record(z.string(), z.unknown())),
  meta: z
    .object({
      total: z.number().int().nonnegative(),
      limit: z.number().int().positive(),
      offset: z.number().int().nonnegative(),
    })
    .optional(),
});
const successObjectResponseSchema = z.object({
  success: z.literal(true),
  data: z.record(z.string(), z.unknown()),
});
const reprocessResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ id: z.uuid(), requeued: z.boolean() }),
});
const mappingBodySchema = z.object({
  mapping: z.record(z.string(), z.string()),
});
function readFieldValue(
  fields: Record<string, unknown> | undefined,
  name: string,
): string | undefined {
  const raw = fields?.[name] as { value?: unknown } | undefined;
  if (raw && typeof raw === "object" && "value" in raw && typeof raw.value === "string") {
    return raw.value;
  }
  return undefined;
}

type TemplateColumnDef = {
  header: string;
  required: boolean;
  description: string;
  example: string;
  autoMapped: boolean;
};

type BatchMetadata = Record<string, unknown>;

type ImportGlobalControlState = {
  globalPaused: boolean;
  pausedAt: string | null;
  pausedBy: string | null;
  resumeRequestedAt: string | null;
  version: number;
};

type IdentitySummary = {
  resolvedCompanies: number;
  duplicateSourceRows: number;
  identityConflictRows: number;
  insufficientIdentifierRows: number;
  resolvedRows: number;
};

type ImportBatchControlState = {
  batchPaused: boolean;
  pausedAt: string | null;
  pausedBy: string | null;
  resumeRequestedAt: string | null;
  workerPauses: Record<string, boolean>;
  deleteRequested: boolean;
  deleteRequestedAt: string | null;
  deleteRequestedBy: string | null;
  hidden: boolean;
  deletedAt: string | null;
  deletedBy: string | null;
  fileDeleted: boolean;
};

const IMPORT_CONTROL_SETTINGS_KEY = "importContactsControl";
const IMPORT_RUNTIME_STALE_THRESHOLD_MS = 5 * 60 * 1000;
const SCHEMA_COMPATIBILITY_ERROR_CODES = new Set(["42P01", "42703"]);

function getPgErrorCode(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  const record = err as Record<string, unknown>;
  if (typeof record.code === "string") return record.code;
  if (record.cause && typeof record.cause === "object") {
    const cause = record.cause as Record<string, unknown>;
    if (typeof cause.code === "string") return cause.code;
  }
  return "";
}

function isSchemaCompatibilityError(err: unknown): boolean {
  return SCHEMA_COMPATIBILITY_ERROR_CODES.has(getPgErrorCode(err));
}

function logSchemaCompatibilityFallback(
  request: FastifyRequest,
  err: unknown,
  label: string,
  extra: Record<string, unknown> = {},
) {
  request.log.warn(
    { err, pgCode: getPgErrorCode(err), ...extra },
    `${label}: schema compatibility fallback`,
  );
}

function readTenantImportControlState(settings: unknown): ImportGlobalControlState {
  const settingsRecord = asRecord(settings) ?? {};
  const control = asRecord(settingsRecord[IMPORT_CONTROL_SETTINGS_KEY]) ?? {};
  return {
    globalPaused: Boolean(control.globalPaused),
    pausedAt: typeof control.pausedAt === "string" ? control.pausedAt : null,
    pausedBy: typeof control.pausedBy === "string" ? control.pausedBy : null,
    resumeRequestedAt:
      typeof control.resumeRequestedAt === "string" ? control.resumeRequestedAt : null,
    version: Number(control.version ?? 0),
  };
}

function createEmptyIdentitySummary(): IdentitySummary {
  return {
    resolvedCompanies: 0,
    duplicateSourceRows: 0,
    identityConflictRows: 0,
    insufficientIdentifierRows: 0,
    resolvedRows: 0,
  };
}

function readBatchImportControlState(metadata: BatchMetadata): ImportBatchControlState {
  const control = asRecord(metadata.importExecutionControl) ?? {};
  const workerPausesRecord = asRecord(control.workerPauses) ?? {};
  const workerPauses = Object.fromEntries(
    Object.entries(workerPausesRecord).map(([key, value]) => [key, Boolean(value)]),
  );

  return {
    batchPaused: Boolean(control.batchPaused),
    pausedAt: typeof control.pausedAt === "string" ? control.pausedAt : null,
    pausedBy: typeof control.pausedBy === "string" ? control.pausedBy : null,
    resumeRequestedAt:
      typeof control.resumeRequestedAt === "string" ? control.resumeRequestedAt : null,
    workerPauses,
    deleteRequested: Boolean(control.deleteRequested),
    deleteRequestedAt:
      typeof control.deleteRequestedAt === "string" ? control.deleteRequestedAt : null,
    deleteRequestedBy:
      typeof control.deleteRequestedBy === "string" ? control.deleteRequestedBy : null,
    hidden: Boolean(control.hidden),
    deletedAt: typeof control.deletedAt === "string" ? control.deletedAt : null,
    deletedBy: typeof control.deletedBy === "string" ? control.deletedBy : null,
    fileDeleted: Boolean(control.fileDeleted),
  };
}

function isImportBatchHidden(metadata: BatchMetadata) {
  const control = readBatchImportControlState(metadata);
  return control.hidden || control.deletedAt !== null;
}

function importVisibleSql(column: typeof bronzeImportBatches.metadata) {
  return sql`COALESCE(${column}->'importExecutionControl'->>'hidden', 'false') <> 'true'`;
}

function sanitizeImportFilename(filename: string): string {
  return filename.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
}

function escapeCsvValue(value: string): string {
  if (!value.includes(",") && !value.includes('"') && !value.includes("\n")) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}

function buildTemplateFilterRange(columnCount: number): string {
  return `${String.fromCodePoint(64 + columnCount)}1`;
}

function normalizeMappingLookupKey(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

function resolveBatchOrderSql(sortBy: "createdAt" | "updatedAt", sortDir: "asc" | "desc") {
  if (sortBy === "updatedAt") {
    return sortDir === "asc"
      ? sql`${bronzeImportBatches.updatedAt} ASC`
      : sql`${bronzeImportBatches.updatedAt} DESC`;
  }

  return sortDir === "asc"
    ? sql`${bronzeImportBatches.createdAt} ASC`
    : sql`${bronzeImportBatches.createdAt} DESC`;
}

async function listImportBatchesWithCompatibility(args: {
  request: FastifyRequest;
  tenantId: string;
  limit: number;
  offset: number;
  status?: z.infer<typeof importStatusSchema>;
  sourceType?: z.infer<typeof sourceTypeSchema>;
  dateFrom?: Date;
  dateTo?: Date;
  orderSql: ReturnType<typeof resolveBatchOrderSql>;
}) {
  const primaryFilters = [
    sql`${bronzeImportBatches.tenantId} = ${args.tenantId}`,
    importVisibleSql(bronzeImportBatches.metadata),
  ];
  if (args.status) primaryFilters.push(sql`${bronzeImportBatches.status} = ${args.status}`);
  if (args.sourceType) {
    primaryFilters.push(
      sql`COALESCE(${bronzeImportBatches.metadata}->>'sourceType', '') = ${args.sourceType}`,
    );
  }
  if (args.dateFrom) primaryFilters.push(sql`${bronzeImportBatches.createdAt} >= ${args.dateFrom}`);
  if (args.dateTo) primaryFilters.push(sql`${bronzeImportBatches.createdAt} <= ${args.dateTo}`);
  const primaryWhere = sql.join(primaryFilters, sql` AND `);

  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${args.tenantId}, true)`);
      const resultRows = await tx.query.bronzeImportBatches.findMany({
        where: primaryWhere,
        orderBy: () => [args.orderSql],
        limit: args.limit,
        offset: args.offset,
      });
      const [{ total: totalCount }] = await tx
        .select({ total: sql<number>`COUNT(*)` })
        .from(bronzeImportBatches)
        .where(primaryWhere);
      return [resultRows, Number(totalCount)] as const;
    });
  } catch (err) {
    if (!isSchemaCompatibilityError(err) || args.sourceType) {
      throw err;
    }

    logSchemaCompatibilityFallback(args.request, err, "imports list query", {
      tenantId: args.tenantId,
      sourceTypeFilterIgnored: Boolean(args.sourceType),
    });

    const legacyFilters = [sql`${bronzeImportBatches.tenantId} = ${args.tenantId}`];
    if (args.status) legacyFilters.push(sql`${bronzeImportBatches.status} = ${args.status}`);
    if (args.dateFrom)
      legacyFilters.push(sql`${bronzeImportBatches.createdAt} >= ${args.dateFrom}`);
    if (args.dateTo) legacyFilters.push(sql`${bronzeImportBatches.createdAt} <= ${args.dateTo}`);
    const legacyWhere = sql.join(legacyFilters, sql` AND `);

    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${args.tenantId}, true)`);
      const resultRows = await tx.query.bronzeImportBatches.findMany({
        where: legacyWhere,
        orderBy: () => [args.orderSql],
        limit: args.limit,
        offset: args.offset,
      });
      const [{ total: totalCount }] = await tx
        .select({ total: sql<number>`COUNT(*)` })
        .from(bronzeImportBatches)
        .where(legacyWhere);
      return [resultRows, Number(totalCount)] as const;
    });
  }
}

function extractFormulaResult(result: ExcelJS.CellFormulaValue["result"]): string {
  if (result == null) return "";
  if (result instanceof Date) return result.toISOString();
  if (typeof result === "object") return "";
  return String(result);
}

function extractExcelCellObject(
  value: Exclude<ExcelJS.CellValue, null | undefined | number | string | boolean | Date>,
): string {
  if ("text" in value) return String(value.text);
  if ("richText" in value) return value.richText.map((rt) => rt.text).join("");
  if ("error" in value) return value.error;
  if ("formula" in value) return extractFormulaResult(value.result);
  if ("sharedFormula" in value) return extractFormulaResult(value.result);
  return "";
}

function extractExcelCellText(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return "";
  if (typeof value !== "object") return String(value);
  if (value instanceof Date) return value.toISOString();
  return extractExcelCellObject(value);
}

function detectImportSourceType(
  uploadConfig: Record<string, unknown>,
  filename: string,
): "csv_import" | "excel_import" {
  if (typeof uploadConfig.sourceType === "string" && uploadConfig.sourceType === "excel_import") {
    return "excel_import";
  }

  return /\.xlsx?$/i.exec(filename) ? "excel_import" : "csv_import";
}

function parseOptionalMapping(rawMapping: string | undefined): Record<string, string> | undefined {
  if (!rawMapping || rawMapping.trim().length === 0) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(rawMapping) as unknown;
    if (!parsed || typeof parsed !== "object") return undefined;
    return parsed as Record<string, string>;
  } catch {
    return undefined;
  }
}

async function collectImportHeaders(args: {
  fileBuffer: Buffer;
  filename: string;
  uploadConfig: Record<string, unknown>;
}): Promise<Array<{ sheetName: string; headers: string[] }>> {
  if (detectImportSourceType(args.uploadConfig, args.filename) === "excel_import") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(args.fileBuffer);

    const sheetsInfo: Array<{ sheetName: string; headers: string[] }> = [];
    for (const ws of workbook.worksheets) {
      if (ws.rowCount === 0) continue;
      const headers: string[] = [];
      const headerRow = ws.getRow(1);
      headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber - 1] = extractExcelCellText(cell.value).trim();
      });
      sheetsInfo.push({ sheetName: ws.name, headers: headers.filter(Boolean) });
    }

    return sheetsInfo;
  }

  const content = args.fileBuffer.toString("utf-8").replace(/^\uFEFF/, "");
  const delimiter =
    typeof args.uploadConfig.delimiter === "string" ? args.uploadConfig.delimiter : undefined;
  const parsed = Papa.parse(content, { header: false, preview: 1, delimiter });
  const firstRow = (parsed.data as string[][])[0] ?? [];
  return [{ sheetName: "CSV", headers: firstRow.map((header) => header.trim()).filter(Boolean) }];
}

function buildAutoMapping(sheetsInfo: Array<{ sheetName: string; headers: string[] }>) {
  const autoMapping: Record<string, string> = {};
  const allHeaders = sheetsInfo.flatMap((sheet) => sheet.headers);
  for (const header of allHeaders) {
    const key = normalizeMappingLookupKey(header);
    const match = DB_MAPPING_TARGETS.find((target) =>
      target.aliases.some((alias) => normalizeMappingLookupKey(alias) === key),
    );
    if (match) {
      autoMapping[header] = match.key;
    }
  }
  return autoMapping;
}

function buildBronzeSearchCondition(search: string) {
  const searchPattern = `%${search}%`;
  return sql`(
    COALESCE(${bronzeContacts.extractedCui}, '') ILIKE ${searchPattern}
    OR COALESCE(${bronzeContacts.extractedName}, '') ILIKE ${searchPattern}
    OR COALESCE(${bronzeContacts.extractedEmail}, '') ILIKE ${searchPattern}
    OR COALESCE(${bronzeContacts.extractedNrRegCom}, '') ILIKE ${searchPattern}
  )`;
}

function buildStoredImportPath(batchId: string, filename: string): string {
  return `${IMPORT_DIR}/${batchId}-${sanitizeImportFilename(filename)}`;
}

async function findAccessibleImportPath(storedPath: string): Promise<string | null> {
  const candidates = Array.from(
    new Set([
      storedPath,
      `${IMPORT_DIR}/${basename(storedPath)}`,
      `${LEGACY_IMPORT_DIR}/${basename(storedPath)}`,
    ]),
  );

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

async function ensureBatchImportFile(batch: {
  id: string;
  filename: string;
  metadata: unknown;
}): Promise<{ storedPath: string; metadata: BatchMetadata; migrated: boolean }> {
  const metadata = (batch.metadata as BatchMetadata | null) ?? {};
  const storedPath = typeof metadata.storedPath === "string" ? metadata.storedPath : null;
  if (!storedPath) {
    throw new Error("Fișierul original nu mai este disponibil");
  }

  const accessiblePath = await findAccessibleImportPath(storedPath);
  if (!accessiblePath) {
    throw new Error("Fișierul original nu mai este disponibil");
  }

  if (accessiblePath.startsWith(`${IMPORT_DIR}/`)) {
    if (accessiblePath === storedPath) {
      return { storedPath: accessiblePath, metadata, migrated: false };
    }

    return {
      storedPath: accessiblePath,
      metadata: {
        ...metadata,
        storedPath: accessiblePath,
        legacyStoredPath: storedPath,
        storageMigratedAt: new Date().toISOString(),
      },
      migrated: true,
    };
  }

  await mkdir(IMPORT_DIR, { recursive: true });
  const targetPath = buildStoredImportPath(batch.id, batch.filename || basename(accessiblePath));
  if (accessiblePath !== targetPath) {
    await copyFile(accessiblePath, targetPath);
  }

  return {
    storedPath: targetPath,
    metadata: {
      ...metadata,
      storedPath: targetPath,
      legacyStoredPath: storedPath,
      storageMigratedAt: new Date().toISOString(),
    },
    migrated: true,
  };
}

const TEMPLATE_COLUMNS: TemplateColumnDef[] = [
  {
    header: "denumire",
    required: true,
    description: "Numele complet al firmei",
    example: "SC EXEMPLU TECH SRL",
    autoMapped: true,
  },
  {
    header: "cui",
    required: true,
    description: "Cod Unic de Identificare (cu sau fara prefix RO)",
    example: "RO12345678",
    autoMapped: true,
  },
  {
    header: "email",
    required: false,
    description: "Adresa de email principala a firmei",
    example: "office@exemplu-tech.ro",
    autoMapped: true,
  },
  {
    header: "telefon",
    required: false,
    description: "Numarul de telefon principal",
    example: "0212345678",
    autoMapped: true,
  },
  {
    header: "website",
    required: false,
    description: "Adresa site-ului web",
    example: "https://exemplu-tech.ro",
    autoMapped: true,
  },
  {
    header: "adresa",
    required: false,
    description: "Adresa completa a sediului social",
    example: "Str. Exemplu Nr. 10, Sector 1",
    autoMapped: true,
  },
  {
    header: "judet",
    required: false,
    description: "Judetul sediului social",
    example: "Bucuresti",
    autoMapped: false,
  },
  {
    header: "localitate",
    required: false,
    description: "Orasul sau comuna sediului social",
    example: "Bucuresti",
    autoMapped: false,
  },
  {
    header: "cod_postal",
    required: false,
    description: "Codul postal",
    example: "010101",
    autoMapped: false,
  },
  {
    header: "caen",
    required: false,
    description: "Codul CAEN principal al activitatii",
    example: "6201",
    autoMapped: false,
  },
  {
    header: "nr_reg_comert",
    required: false,
    description: "Numarul de inregistrare la Registrul Comertului",
    example: "J40/1234/2020",
    autoMapped: false,
  },
  {
    header: "persoana_contact",
    required: false,
    description: "Numele persoanei de contact",
    example: "Ion Popescu",
    autoMapped: false,
  },
  {
    header: "functie_contact",
    required: false,
    description: "Functia persoanei de contact",
    example: "Director General",
    autoMapped: false,
  },
  {
    header: "telefon_contact",
    required: false,
    description: "Telefonul persoanei de contact",
    example: "0721123456",
    autoMapped: false,
  },
  {
    header: "email_contact",
    required: false,
    description: "Emailul persoanei de contact",
    example: "ion.popescu@exemplu-tech.ro",
    autoMapped: false,
  },
  {
    header: "note",
    required: false,
    description: "Observatii sau note interne",
    example: "Client potential din sector IT",
    autoMapped: false,
  },
];

const DB_MAPPING_TARGETS = COLUMN_MAPPING_DEFINITIONS;

const TEMPLATE_EXAMPLE_ROWS: string[][] = [
  TEMPLATE_COLUMNS.map((c) => c.example),
  [
    "SC AGRO VEST SRL",
    "87654321",
    "contact@agrovest.ro",
    "0256789012",
    "https://agrovest.ro",
    "Calea Aradului Nr. 55",
    "Timis",
    "Timisoara",
    "300001",
    "0111",
    "J35/5678/2018",
    "Maria Ionescu",
    "Manager Achizitii",
    "0742987654",
    "maria.ionescu@agrovest.ro",
    "Recomandare partener",
  ],
];

function buildTemplateCsv(): string {
  const headers = TEMPLATE_COLUMNS.map((c) => c.header);
  const lines = [headers.join(",")];
  for (const row of TEMPLATE_EXAMPLE_ROWS) {
    lines.push(row.map(escapeCsvValue).join(","));
  }
  return "\uFEFF" + lines.join("\n") + "\n";
}

async function buildTemplateXlsx(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Cerniq.app";
  wb.created = new Date();

  const wsData = wb.addWorksheet("Date Import", {
    properties: { defaultColWidth: 20 },
  });

  const headerRow = wsData.addRow(TEMPLATE_COLUMNS.map((c) => c.header));
  headerRow.eachCell((cell, colNumber) => {
    const col = TEMPLATE_COLUMNS[colNumber - 1];
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: col?.required ? "FF991B1B" : "FF1E3A5F" },
    };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF444444" } },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  for (const row of TEMPLATE_EXAMPLE_ROWS) {
    const dataRow = wsData.addRow(row);
    dataRow.eachCell((cell) => {
      cell.font = { size: 10, color: { argb: "FF333333" } };
      cell.alignment = { vertical: "middle" };
    });
  }

  TEMPLATE_COLUMNS.forEach((col, idx) => {
    const maxLen = Math.max(
      col.header.length,
      ...TEMPLATE_EXAMPLE_ROWS.map((r) => (r[idx] ?? "").length),
    );
    wsData.getColumn(idx + 1).width = Math.min(Math.max(maxLen + 4, 14), 40);
  });

  wsData.autoFilter = { from: "A1", to: buildTemplateFilterRange(TEMPLATE_COLUMNS.length) };

  const wsInstr = wb.addWorksheet("Instructiuni", {
    properties: { defaultColWidth: 22 },
  });

  const instrHeader = wsInstr.addRow([
    "Coloana",
    "Obligatoriu",
    "Auto-mapare",
    "Descriere",
    "Exemplu",
  ]);
  instrHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  for (const col of TEMPLATE_COLUMNS) {
    const row = wsInstr.addRow([
      col.header,
      col.required ? "OBLIGATORIU" : "optional",
      col.autoMapped ? "DA" : "-",
      col.description,
      col.example,
    ]);
    row.getCell(1).font = { bold: true, size: 10 };
    if (col.required) {
      row.getCell(2).font = { bold: true, color: { argb: "FF991B1B" }, size: 10 };
    } else {
      row.getCell(2).font = { color: { argb: "FF666666" }, size: 10 };
    }
    row.getCell(3).font = { color: { argb: col.autoMapped ? "FF166534" : "FF999999" }, size: 10 };
    row.getCell(4).font = { size: 10 };
    row.getCell(5).font = { size: 10, color: { argb: "FF666666" } };
  }

  wsInstr.getColumn(1).width = 20;
  wsInstr.getColumn(2).width = 14;
  wsInstr.getColumn(3).width = 14;
  wsInstr.getColumn(4).width = 50;
  wsInstr.getColumn(5).width = 30;

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

async function loadImportIdentitySummary(
  tenantId: string,
  batchId: string,
): Promise<IdentitySummary> {
  await setSessionTenantId(tenantId);
  const [row] = await db
    .select({
      resolvedCompanies: sql<number>`COUNT(DISTINCT ${bronzeContacts.resolvedCompanyId}) FILTER (WHERE ${bronzeContacts.resolvedCompanyId} IS NOT NULL)`,
      duplicateSourceRows: sql<number>`COUNT(*) FILTER (WHERE ${bronzeContacts.identityStatus} = 'duplicate_source')`,
      identityConflictRows: sql<number>`COUNT(*) FILTER (WHERE ${bronzeContacts.identityStatus} = 'identity_conflict')`,
      insufficientIdentifierRows: sql<number>`COUNT(*) FILTER (WHERE ${bronzeContacts.identityStatus} = 'insufficient_identifiers')`,
      resolvedRows: sql<number>`COUNT(*) FILTER (WHERE ${bronzeContacts.identityStatus} = 'resolved')`,
    })
    .from(bronzeContacts)
    .where(
      sql`${bronzeContacts.tenantId} = ${tenantId}
        AND ${batchIdMetadataEquals(bronzeContacts.metadata, batchId)}`,
    );

  return {
    resolvedCompanies: Number(row?.resolvedCompanies ?? 0),
    duplicateSourceRows: Number(row?.duplicateSourceRows ?? 0),
    identityConflictRows: Number(row?.identityConflictRows ?? 0),
    insufficientIdentifierRows: Number(row?.insufficientIdentifierRows ?? 0),
    resolvedRows: Number(row?.resolvedRows ?? 0),
  };
}

async function loadImportIdentitySummaryCompat(
  tenantId: string,
  batchId: string,
  request?: FastifyRequest,
): Promise<IdentitySummary> {
  try {
    return await loadImportIdentitySummary(tenantId, batchId);
  } catch (err) {
    if (!isSchemaCompatibilityError(err)) {
      throw err;
    }
    if (request) {
      logSchemaCompatibilityFallback(request, err, "imports identity summary", { batchId });
    }
    return createEmptyIdentitySummary();
  }
}

async function loadTenantImportControlStateCompat(
  tenantId: string,
  request?: FastifyRequest,
): Promise<ImportGlobalControlState> {
  try {
    const [tenantRow] = await db
      .select({ settings: tenants.settings })
      .from(tenants)
      .where(sql`${tenants.id} = ${tenantId}`)
      .limit(1);
    return readTenantImportControlState(tenantRow?.settings);
  } catch (err) {
    if (!isSchemaCompatibilityError(err)) {
      throw err;
    }
    if (request) {
      logSchemaCompatibilityFallback(request, err, "imports global control", { tenantId });
    }
    return readTenantImportControlState(null);
  }
}

type ImportAttemptSummary = {
  id: string;
  kind: string;
  status: string;
  label: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  pausedAt: string | null;
  lastHeartbeatAt: string | null;
  updatedAt: string | null;
  totalRows: number;
  processedRows: number;
  successRows: number;
  errorRows: number;
  duplicateRows: number;
  quarantineRows: number;
};

type ImportQuarantineSummary = {
  totalRows: number;
  disallowedControlCharacterRows: number;
  sourceIdentifierHashConflictRows: number;
};

function createEmptyQuarantineSummary(): ImportQuarantineSummary {
  return {
    totalRows: 0,
    disallowedControlCharacterRows: 0,
    sourceIdentifierHashConflictRows: 0,
  };
}

const INGEST_ATTEMPT_WORKERS = new Set(["A1:csv-parser", "A2:excel-parser"]);

type RuntimeSessionLike = {
  id: string;
  kind: typeof importRuntimeSessions.$inferSelect.kind;
  status: typeof importRuntimeSessions.$inferSelect.status;
  label?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  failedAt?: Date | null;
  pausedAt?: Date | null;
  lastHeartbeatAt?: Date | null;
  updatedAt?: Date | null;
} | null;

function serializeRuntimeSessionRow(row: RuntimeSessionLike) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    kind: row.kind,
    status: normalizeRuntimeHeartbeatState(row.status, row.lastHeartbeatAt),
    label: row.label ?? null,
    startedAt: row.startedAt?.toISOString?.() ?? null,
    completedAt: row.completedAt?.toISOString?.() ?? null,
    failedAt: row.failedAt?.toISOString?.() ?? null,
    pausedAt: row.pausedAt?.toISOString?.() ?? null,
    lastHeartbeatAt: row.lastHeartbeatAt?.toISOString?.() ?? null,
    updatedAt: row.updatedAt?.toISOString?.() ?? null,
  };
}

function buildBatchAttemptFallback(
  row: typeof bronzeImportBatches.$inferSelect,
  latestSession: RuntimeSessionLike,
): ImportAttemptSummary {
  const serialized = serializeRuntimeSessionRow(latestSession);
  return {
    id: serialized?.id ?? `batch-${row.id}`,
    kind: serialized?.kind ?? "legacy",
    status: serialized?.status ?? row.status,
    label: serialized?.label ?? null,
    startedAt: serialized?.startedAt ?? row.createdAt?.toISOString?.() ?? null,
    completedAt: serialized?.completedAt ?? null,
    failedAt: serialized?.failedAt ?? null,
    pausedAt: serialized?.pausedAt ?? null,
    lastHeartbeatAt: serialized?.lastHeartbeatAt ?? null,
    updatedAt: serialized?.updatedAt ?? row.updatedAt?.toISOString?.() ?? null,
    totalRows: Number(row.totalRows ?? 0),
    processedRows: Number(row.processedRows ?? 0),
    successRows: Number(row.successRows ?? 0),
    errorRows: Number(row.errorRows ?? 0),
    duplicateRows: Number(row.duplicateRows ?? 0),
    quarantineRows: 0,
  };
}

async function loadImportQuarantineSummary(
  tenantId: string,
  batchId: string,
  sessionId?: string | null,
): Promise<ImportQuarantineSummary> {
  const filters = [
    sql`${importRowQuarantine.tenantId} = ${tenantId}`,
    sql`${importRowQuarantine.batchId} = ${batchId}`,
  ];
  if (sessionId) {
    filters.push(sql`${importRowQuarantine.sessionId} = ${sessionId}`);
  }

  const [row] = await db
    .select({
      totalRows: sql<number>`COUNT(*)`,
      disallowedControlCharacterRows: sql<number>`COUNT(*) FILTER (WHERE ${importRowQuarantine.reasonCode} = 'disallowed_control_character')`,
      sourceIdentifierHashConflictRows: sql<number>`COUNT(*) FILTER (WHERE ${importRowQuarantine.reasonCode} = 'source_identifier_hash_conflict')`,
    })
    .from(importRowQuarantine)
    .where(sql.join(filters, sql` AND `));

  return {
    totalRows: Number(row?.totalRows ?? 0),
    disallowedControlCharacterRows: Number(row?.disallowedControlCharacterRows ?? 0),
    sourceIdentifierHashConflictRows: Number(row?.sourceIdentifierHashConflictRows ?? 0),
  };
}

async function loadImportQuarantineSummaryCompat(
  tenantId: string,
  batchId: string,
  sessionId?: string | null,
  request?: FastifyRequest,
): Promise<ImportQuarantineSummary> {
  try {
    return await loadImportQuarantineSummary(tenantId, batchId, sessionId);
  } catch (err) {
    if (!isSchemaCompatibilityError(err)) {
      throw err;
    }
    if (request) {
      logSchemaCompatibilityFallback(request, err, "imports quarantine summary", {
        batchId,
        sessionId: sessionId ?? null,
      });
    }
    return createEmptyQuarantineSummary();
  }
}

async function loadImportRuntimeAttempts(
  tenantId: string,
  batchId: string,
  totalRowsFallback: number,
): Promise<ImportAttemptSummary[]> {
  const sessions = await db
    .select()
    .from(importRuntimeSessions)
    .where(
      sql`${importRuntimeSessions.tenantId} = ${tenantId}
        AND ${importRuntimeSessions.batchId} = ${batchId}`,
    )
    .orderBy(sql`${importRuntimeSessions.updatedAt} DESC`);

  if (sessions.length === 0) {
    return [];
  }

  const sessionIds = sessions.map((session) => session.id);
  const [counterRows, quarantineRows] = await Promise.all([
    db
      .select({
        sessionId: importRuntimeWorkerCounters.sessionId,
        workerName: importRuntimeWorkerCounters.workerName,
        totalUnits: importRuntimeWorkerCounters.totalUnits,
        processedUnits: importRuntimeWorkerCounters.processedUnits,
        successUnits: importRuntimeWorkerCounters.successUnits,
        failedUnits: importRuntimeWorkerCounters.failedUnits,
        skippedUnits: importRuntimeWorkerCounters.skippedUnits,
      })
      .from(importRuntimeWorkerCounters)
      .where(inArray(importRuntimeWorkerCounters.sessionId, sessionIds)),
    db
      .select({
        sessionId: importRowQuarantine.sessionId,
        totalRows: sql<number>`COUNT(*)`,
      })
      .from(importRowQuarantine)
      .where(
        sql`${importRowQuarantine.tenantId} = ${tenantId}
          AND ${importRowQuarantine.batchId} = ${batchId}
          AND ${importRowQuarantine.sessionId} IS NOT NULL
          AND ${inArray(importRowQuarantine.sessionId, sessionIds)}`,
      )
      .groupBy(importRowQuarantine.sessionId),
  ]);

  const countersBySession = new Map<
    string,
    {
      totalRows: number;
      processedRows: number;
      successRows: number;
      errorRows: number;
      duplicateRows: number;
    }
  >();
  for (const counter of counterRows) {
    if (!INGEST_ATTEMPT_WORKERS.has(counter.workerName)) {
      continue;
    }
    const current = countersBySession.get(counter.sessionId) ?? {
      totalRows: 0,
      processedRows: 0,
      successRows: 0,
      errorRows: 0,
      duplicateRows: 0,
    };
    current.totalRows += Number(counter.totalUnits ?? 0);
    current.processedRows += Number(counter.processedUnits ?? 0);
    current.successRows += Number(counter.successUnits ?? 0);
    current.errorRows += Number(counter.failedUnits ?? 0);
    current.duplicateRows += Number(counter.skippedUnits ?? 0);
    countersBySession.set(counter.sessionId, current);
  }

  const quarantineBySession = new Map(
    quarantineRows
      .filter((row): row is typeof row & { sessionId: string } => typeof row.sessionId === "string")
      .map((row) => [row.sessionId, Number(row.totalRows ?? 0)] as const),
  );

  return sessions.map((session) => {
    const counters = countersBySession.get(session.id);
    const totalRows = Math.max(Number(counters?.totalRows ?? 0), totalRowsFallback);
    return {
      id: session.id,
      kind: session.kind,
      status: normalizeRuntimeHeartbeatState(session.status, session.lastHeartbeatAt),
      label: session.label ?? null,
      startedAt: session.startedAt?.toISOString?.() ?? null,
      completedAt: session.completedAt?.toISOString?.() ?? null,
      failedAt: session.failedAt?.toISOString?.() ?? null,
      pausedAt: session.pausedAt?.toISOString?.() ?? null,
      lastHeartbeatAt: session.lastHeartbeatAt?.toISOString?.() ?? null,
      updatedAt: session.updatedAt?.toISOString?.() ?? null,
      totalRows,
      processedRows: Number(counters?.processedRows ?? 0),
      successRows: Number(counters?.successRows ?? 0),
      errorRows: Number(counters?.errorRows ?? 0),
      duplicateRows: Number(counters?.duplicateRows ?? 0),
      quarantineRows: Number(quarantineBySession.get(session.id) ?? 0),
    };
  });
}

async function loadImportRuntimeAttemptsCompat(
  tenantId: string,
  batchId: string,
  totalRowsFallback: number,
  request?: FastifyRequest,
): Promise<ImportAttemptSummary[]> {
  try {
    return await loadImportRuntimeAttempts(tenantId, batchId, totalRowsFallback);
  } catch (err) {
    if (!isSchemaCompatibilityError(err)) {
      throw err;
    }
    if (request) {
      logSchemaCompatibilityFallback(request, err, "imports runtime attempts", { batchId });
    }
    return [];
  }
}

async function enrichImportBatch(tenantId: string, row: typeof bronzeImportBatches.$inferSelect) {
  const metadata = (row.metadata as Record<string, unknown> | null) ?? {};
  const uploadConfig = (metadata.uploadConfig as Record<string, unknown> | undefined) ?? {};
  const [tenantRow, latestSession, historicalSummary, quarantineSummary, attempts] =
    await Promise.all([
      db
        .select({ settings: tenants.settings })
        .from(tenants)
        .where(sql`${tenants.id} = ${tenantId}`)
        .limit(1)
        .then((rows) => rows[0] ?? null),
      db
        .select({
          id: importRuntimeSessions.id,
          kind: importRuntimeSessions.kind,
          status: importRuntimeSessions.status,
          lastHeartbeatAt: importRuntimeSessions.lastHeartbeatAt,
          updatedAt: importRuntimeSessions.updatedAt,
        })
        .from(importRuntimeSessions)
        .where(
          sql`${importRuntimeSessions.tenantId} = ${tenantId}
          AND ${importRuntimeSessions.batchId} = ${row.id}`,
        )
        .orderBy(sql`${importRuntimeSessions.updatedAt} DESC`)
        .limit(1)
        .then((rows) => rows[0] ?? null),
      loadImportIdentitySummary(tenantId, row.id),
      loadImportQuarantineSummary(tenantId, row.id),
      loadImportRuntimeAttempts(tenantId, row.id, Number(row.totalRows ?? 0)),
    ]);
  const latestAttemptSummary = attempts[0] ?? buildBatchAttemptFallback(row, latestSession);
  const serializedSession = serializeRuntimeSessionRow(latestSession);

  return {
    ...row,
    identitySummary: historicalSummary,
    historicalSummary,
    latestAttemptSummary,
    selectedAttemptSummary: latestAttemptSummary,
    quarantineSummary,
    attempts,
    globalControl: readTenantImportControlState(tenantRow?.settings),
    control: readBatchImportControlState(metadata),
    hidden: isImportBatchHidden(metadata),
    activeRuntimeSession: serializedSession,
    selectedRuntimeSession: serializedSession,
    appliedMapping:
      (metadata.columnMapping as Record<string, string> | undefined) ??
      (uploadConfig.mapping as Record<string, string> | undefined) ??
      null,
  };
}

async function buildLegacyImportBatchResponse(
  tenantId: string,
  row: typeof bronzeImportBatches.$inferSelect,
  request: FastifyRequest,
) {
  const metadata = (row.metadata as Record<string, unknown> | null) ?? {};
  const uploadConfig = (metadata.uploadConfig as Record<string, unknown> | undefined) ?? {};
  const [globalControl, historicalSummary, latestSession] = await Promise.all([
    loadTenantImportControlStateCompat(tenantId, request),
    loadImportIdentitySummaryCompat(tenantId, row.id, request),
    loadImportRuntimeSessionForBatchCompat(tenantId, row.id, null, request),
  ]);
  const latestAttemptSummary = buildBatchAttemptFallback(row, latestSession);
  const serializedSession = serializeRuntimeSessionRow(latestSession);

  return {
    ...row,
    identitySummary: historicalSummary,
    historicalSummary,
    latestAttemptSummary,
    selectedAttemptSummary: latestAttemptSummary,
    quarantineSummary: createEmptyQuarantineSummary(),
    attempts: [],
    globalControl,
    control: readBatchImportControlState(metadata),
    hidden: isImportBatchHidden(metadata),
    activeRuntimeSession: serializedSession,
    selectedRuntimeSession: serializedSession,
    appliedMapping:
      (metadata.columnMapping as Record<string, string> | undefined) ??
      (uploadConfig.mapping as Record<string, string> | undefined) ??
      null,
  };
}

async function enrichImportBatchCompat(
  tenantId: string,
  row: typeof bronzeImportBatches.$inferSelect,
  request: FastifyRequest,
) {
  try {
    return await enrichImportBatch(tenantId, row);
  } catch (err) {
    if (!isSchemaCompatibilityError(err)) {
      throw err;
    }
    logSchemaCompatibilityFallback(request, err, "imports list enrichment", { batchId: row.id });
    return buildLegacyImportBatchResponse(tenantId, row, request);
  }
}

function withIdentityReprocessQueuedMetadata(
  metadata: BatchMetadata,
  options?: { preserveCheckpoint?: boolean; runTotalRows?: number },
): BatchMetadata {
  const preserveCheckpoint = options?.preserveCheckpoint ?? false;
  const queuedAt = new Date().toISOString();

  return {
    ...metadata,
    identityReprocessStatus: "queued",
    identityReprocessQueuedAt: queuedAt,
    identityReprocessSessionStartedAt: queuedAt,
    identityReprocessSessionProcessedBaseRows: preserveCheckpointNumber(
      preserveCheckpoint,
      metadata.identityReprocessProcessedRows,
    ),
    identityReprocessCompletedAt: null,
    identityReprocessFailedAt: null,
    identityReprocessLastError: null,
    ...buildQueuedReprocessCheckpointState(metadata, preserveCheckpoint),
    identityReprocessRunTotalRows: resolveQueuedRunTotalRows(metadata, options),
  };
}

function preserveCheckpointValue<T>(
  preserveCheckpoint: boolean,
  value: T | null | undefined,
  fallback: T,
): T {
  if (!preserveCheckpoint) {
    return fallback;
  }

  return value ?? fallback;
}

function coerceFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function preserveCheckpointNumber(
  preserveCheckpoint: boolean,
  value: unknown,
  fallback = 0,
): number {
  if (!preserveCheckpoint) {
    return fallback;
  }

  return coerceFiniteNumber(value, fallback);
}

function resolveQueuedRunTotalRows(
  metadata: BatchMetadata,
  options?: { preserveCheckpoint?: boolean; runTotalRows?: number },
): number {
  const runTotalRowsCandidate =
    typeof options?.runTotalRows === "number"
      ? options.runTotalRows
      : coerceFiniteNumber(metadata.identityReprocessRunTotalRows, 0);

  return Number.isFinite(runTotalRowsCandidate)
    ? Math.max(0, Math.floor(runTotalRowsCandidate))
    : 0;
}

function buildQueuedReprocessCheckpointState(
  metadata: BatchMetadata,
  preserveCheckpoint: boolean,
): BatchMetadata {
  const cursorRowIndex =
    metadata.identityReprocessCursorRowIndex ?? metadata.identityReprocessProcessedRows ?? 0;

  return {
    identityReprocessStartedAt: preserveCheckpointValue(
      preserveCheckpoint,
      metadata.identityReprocessStartedAt,
      null,
    ),
    identityReprocessLastProgressAt: preserveCheckpointValue(
      preserveCheckpoint,
      metadata.identityReprocessLastProgressAt,
      null,
    ),
    identityReprocessPhase: preserveCheckpointValue(
      preserveCheckpoint,
      metadata.identityReprocessPhase,
      "resolve_identities",
    ),
    identityReprocessCursorCreatedAt: preserveCheckpointValue(
      preserveCheckpoint,
      metadata.identityReprocessCursorCreatedAt,
      null,
    ),
    identityReprocessCursorLastBronzeId: preserveCheckpointValue(
      preserveCheckpoint,
      metadata.identityReprocessCursorLastBronzeId,
      null,
    ),
    identityReprocessCursorRowIndex: preserveCheckpointNumber(preserveCheckpoint, cursorRowIndex),
    identityReprocessPromotionCursorCreatedAt: preserveCheckpointValue(
      preserveCheckpoint,
      metadata.identityReprocessPromotionCursorCreatedAt,
      null,
    ),
    identityReprocessPromotionCursorLastBronzeId: preserveCheckpointValue(
      preserveCheckpoint,
      metadata.identityReprocessPromotionCursorLastBronzeId,
      null,
    ),
    identityReprocessMode: preserveCheckpointValue(
      preserveCheckpoint,
      metadata.identityReprocessMode,
      null,
    ),
    identityReprocessProcessedRows: preserveCheckpointNumber(
      preserveCheckpoint,
      metadata.identityReprocessProcessedRows,
    ),
    identityReprocessResolvedRows: preserveCheckpointNumber(
      preserveCheckpoint,
      metadata.identityReprocessResolvedRows,
    ),
    identityReprocessDuplicateSourceRows: preserveCheckpointNumber(
      preserveCheckpoint,
      metadata.identityReprocessDuplicateSourceRows,
    ),
    identityReprocessIdentityConflictRows: preserveCheckpointNumber(
      preserveCheckpoint,
      metadata.identityReprocessIdentityConflictRows,
    ),
    identityReprocessInsufficientIdentifierRows: preserveCheckpointNumber(
      preserveCheckpoint,
      metadata.identityReprocessInsufficientIdentifierRows,
    ),
    identityReprocessPromotionQueued: preserveCheckpointNumber(
      preserveCheckpoint,
      metadata.identityReprocessPromotionQueued,
    ),
  };
}

function extractReprocessHeartbeat(metadata: BatchMetadata): {
  lastProgressAtRaw: string | null;
  startedAtRaw: string | null;
  heartbeatAtMs: number;
} {
  const lastProgressAtRaw =
    typeof metadata.identityReprocessLastProgressAt === "string"
      ? metadata.identityReprocessLastProgressAt
      : null;
  const startedAtRaw =
    typeof metadata.identityReprocessStartedAt === "string"
      ? metadata.identityReprocessStartedAt
      : null;
  const heartbeatAtRaw = lastProgressAtRaw ?? startedAtRaw;
  const heartbeatAtMs = heartbeatAtRaw ? Date.parse(heartbeatAtRaw) : Number.NaN;
  return { lastProgressAtRaw, startedAtRaw, heartbeatAtMs };
}

function derivePromoteStateFromDb(
  reprocessStatus: string,
  heartbeatAtMs: number,
  staleThresholdMs: number,
): string {
  if (reprocessStatus === "running") {
    return Number.isFinite(heartbeatAtMs) && Date.now() - heartbeatAtMs <= staleThresholdMs
      ? "active"
      : "stale";
  }
  if (reprocessStatus === "queued") {
    return "stale";
  }
  return reprocessStatus;
}

function resolvePromoteResponseState(
  isStale: boolean,
  isBacklogged: boolean,
  state: string,
): string {
  if (isStale) return "stale";
  if (isBacklogged) return "backlogged";
  return state;
}

type BullJobLike = {
  id?: string | null;
  attemptsMade?: number;
  opts?: { attempts?: number };
  failedReason?: string | null;
  stacktrace?: unknown;
  progress?: number | string | object | boolean | null;
  timestamp?: number | null;
  processedOn?: number | null;
  finishedOn?: number | null;
};

type JobLogsApiLevel = "info" | "warn" | "error" | "step";
type JobLogsStoredLevel = (typeof jobLogs.$inferSelect)["level"];

const importJobLogsQuerySchema = z.object({
  level: z.enum(["info", "warn", "error", "step"]).optional(),
  worker: z.string().optional(),
  jobId: z.string().optional(),
  bronzeContactId: z.uuid().optional(),
  sessionId: z.uuid().optional(),
  includeLegacy: z.coerce.boolean().default(false),
  tail: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(2000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

type ImportJobLogsQuery = z.infer<typeof importJobLogsQuerySchema>;
type ImportJobLogsListArgs = ImportJobLogsQuery & {
  tenantId: string;
  batchId: string;
  targetSessionId: string | null;
};

function normalizeJobLogLevel(level: string): JobLogsApiLevel {
  return level === "debug" ? "step" : (level as JobLogsApiLevel);
}

function resolveStoredJobLogLevel(level?: JobLogsApiLevel): JobLogsStoredLevel | null {
  if (!level) {
    return null;
  }
  return level === "step" ? "debug" : level;
}

function buildCommonJobLogFilters(args: ImportJobLogsListArgs): SQL[] {
  const filters: SQL[] = [
    sql`${jobLogs.tenantId} = ${args.tenantId}`,
    sql`${jobLogs.batchId} = ${args.batchId}`,
    sql`${jobLogs.etapa} = ${"e1"}`,
  ];
  const storedLevel = resolveStoredJobLogLevel(args.level);

  if (storedLevel) {
    filters.push(sql`${jobLogs.level} = ${storedLevel}`);
  }
  if (args.worker) {
    filters.push(sql`${jobLogs.workerName} = ${args.worker}`);
  }
  if (args.jobId) {
    filters.push(sql`${jobLogs.jobId} = ${args.jobId}`);
  }
  if (args.bronzeContactId) {
    filters.push(sql`${jobLogs.contactId} = ${args.bronzeContactId}`);
  }

  return filters;
}

function buildJobLogsWhereClause(args: ImportJobLogsListArgs): SQL {
  const filters = buildCommonJobLogFilters(args);

  if (args.targetSessionId) {
    filters.push(
      args.includeLegacy
        ? sql`(${jobLogs.sessionId} = ${args.targetSessionId} OR ${jobLogs.sessionId} IS NULL)`
        : sql`${jobLogs.sessionId} = ${args.targetSessionId}`,
    );
  }

  return sql.join(filters, sql` AND `);
}

function buildLegacyJobLogsWhereClause(args: ImportJobLogsListArgs): SQL {
  return sql.join(buildCommonJobLogFilters(args), sql` AND `);
}

async function fetchImportJobLogsPage(
  whereClause: SQL,
  args: Pick<ImportJobLogsListArgs, "tail" | "limit" | "offset">,
) {
  const [rows, [countRow]] = await Promise.all([
    db
      .select()
      .from(jobLogs)
      .where(whereClause)
      .orderBy(sql`${jobLogs.createdAt} ${sql.raw(args.tail ? "DESC" : "ASC")}`)
      .limit(args.limit)
      .offset(args.offset),
    db
      .select({ total: sql<number>`COUNT(*)` })
      .from(jobLogs)
      .where(whereClause),
  ]);

  return {
    rows,
    total: Number(countRow?.total ?? 0),
  };
}

async function listImportJobLogs(args: ImportJobLogsListArgs) {
  return fetchImportJobLogsPage(buildJobLogsWhereClause(args), args);
}

async function listImportJobLogsLegacy(args: ImportJobLogsListArgs) {
  return fetchImportJobLogsPage(buildLegacyJobLogsWhereClause(args), args);
}

async function listImportJobLogsWithCompatibility(
  request: FastifyRequest,
  args: ImportJobLogsListArgs,
) {
  try {
    return await listImportJobLogs(args);
  } catch (err) {
    if (!isSchemaCompatibilityError(err)) {
      throw err;
    }

    logSchemaCompatibilityFallback(request, err, "imports job logs", {
      batchId: args.batchId,
      targetSessionId: args.targetSessionId,
    });

    return listImportJobLogsLegacy(args);
  }
}

function buildJobLogResponseRow(row: typeof jobLogs.$inferSelect) {
  const details =
    row.context && typeof row.context === "object"
      ? (row.context as Record<string, unknown>)
      : null;
  const durationMs =
    details && typeof details.durationMs === "number" ? Math.round(details.durationMs) : null;

  return {
    id: row.id,
    tenantId: row.tenantId,
    batchId: row.batchId,
    sessionId: row.sessionId ?? null,
    bronzeContactId: row.contactId ?? null,
    workerName: row.workerName,
    jobId: row.jobId ?? null,
    runtimeJobKey: row.runtimeJobKey ?? null,
    parentRuntimeJobKey: row.parentRuntimeJobKey ?? null,
    level: normalizeJobLogLevel(row.level),
    step: row.step ?? "event",
    message: row.message,
    details,
    durationMs,
    createdAt: row.createdAt.toISOString(),
    correlationId: row.correlationId ?? null,
    traceId: row.traceId ?? null,
    entityType: row.entityType ?? null,
    entityId: row.entityId ?? null,
  };
}

type ImportRuntimeWorkerDef = {
  workerName: string;
  label: string;
  stage: string;
  queueName: string;
  description: string;
};

type ImportRuntimeObservedBronzeLog = ReturnType<typeof buildJobLogResponseRow>;

type ImportRuntimeObservedSilverLog = {
  id: string;
  entityId: string | null;
  entityType: string | null;
  workerName: string;
  queueName: string;
  jobId: string | null;
  correlationId: string | null;
  level: JobLogsApiLevel;
  step: string;
  message: string;
  details: Record<string, unknown> | null;
  durationMs: number | null;
  createdAt: string;
};

type ImportRuntimeJobSnapshot = {
  key: string;
  source: "bullmq" | "job_logs" | "silver_logs" | "runtime" | "merged";
  state: string;
  workerName: string;
  queueName: string;
  jobId: string | null;
  bronzeContactId: string | null;
  entityId: string | null;
  entityType: string | null;
  correlationId: string | null;
  level: JobLogsApiLevel | null;
  step: string | null;
  message: string | null;
  progress: number | null;
  attemptsMade: number;
  maxAttempts: number;
  failedReason: string | null;
  createdAt: string | null;
  processedOn: string | null;
  finishedOn: string | null;
  lastEventAt: string | null;
  durationMs: number | null;
};

type ImportRuntimeWorkerSnapshot = {
  workerName: string;
  label: string;
  stage: string;
  queueName: string;
  description: string;
  counts: {
    waiting: number;
    active: number;
    delayed: number;
    prioritized: number;
    failedLive: number;
    observedCompleted: number;
    observedWarnings: number;
    observedErrors: number;
    observedLogs: number;
    observedJobs: number;
  };
  jobs: ImportRuntimeJobSnapshot[];
};

type ImportRuntimeWorkerCounts = ImportRuntimeWorkerSnapshot["counts"];

type RuntimeObservedLogsByWorker<T extends { workerName: string }> = Map<string, T[]>;

type ImportRuntimeObservedLogBundle = {
  recentLogs: ImportRuntimeObservedBronzeLog[];
  recentSilverLogs: ImportRuntimeObservedSilverLog[];
  bronzeLogsByWorker: RuntimeObservedLogsByWorker<ImportRuntimeObservedBronzeLog>;
  silverLogsByWorker: RuntimeObservedLogsByWorker<ImportRuntimeObservedSilverLog>;
};

type RuntimeQueueJobLike = {
  id?: string | number | null;
  data?: unknown;
  progress?: unknown;
  attemptsMade?: number;
  opts?: { attempts?: number };
  failedReason?: string | null;
  timestamp?: number | null;
  processedOn?: number | null;
  finishedOn?: number | null;
  getState(): Promise<string>;
};

type RuntimeQueueJobIdentity = {
  bronzeContactId: string | null;
  entityId: string | null;
  entityType: string | null;
  correlationId: string | null;
};

function defineRuntimeWorker(
  workerName: string,
  label: string,
  stage: string,
  queueName: string,
  description: string,
): ImportRuntimeWorkerDef {
  return { workerName, label, stage, queueName, description };
}

function groupObservedLogsByWorker<T extends { workerName: string }>(
  logs: T[],
): RuntimeObservedLogsByWorker<T> {
  const logsByWorker = new Map<string, T[]>();

  for (const log of logs) {
    const bucket = logsByWorker.get(log.workerName) ?? [];
    bucket.push(log);
    logsByWorker.set(log.workerName, bucket);
  }

  return logsByWorker;
}

export const IMPORT_RUNTIME_WORKERS: ImportRuntimeWorkerDef[] = [
  defineRuntimeWorker(
    "A1:csv-parser",
    "A1 CSV Parser",
    "Ingestie",
    QUEUES.INGEST_CSV,
    "Parseaza CSV-ul, detecteaza mapping-ul si insereaza Bronze.",
  ),
  defineRuntimeWorker(
    "A2:excel-parser",
    "A2 Excel Parser",
    "Ingestie",
    QUEUES.INGEST_EXCEL,
    "Parseaza workbook-ul Excel, unifica foile si lanseaza Bronze.",
  ),
  defineRuntimeWorker(
    "A3:webhook-receiver",
    "A3 Webhook Receiver",
    "Ingestie",
    QUEUES.INGEST_WEBHOOK,
    "Valideaza payload-uri webhook si creeaza contacte Bronze.",
  ),
  defineRuntimeWorker(
    "A4:api-poller",
    "A4 API Poller",
    "Ingestie",
    QUEUES.INGEST_API,
    "Importa contacte din surse API externe cu delta detection.",
  ),
  defineRuntimeWorker(
    "A5:manual-entry",
    "A5 Manual Entry",
    "Ingestie",
    QUEUES.INGEST_MANUAL,
    "Creeaza contacte Bronze din introducere manuala.",
  ),
  defineRuntimeWorker(
    "B1:name-normalizer",
    "B1 Name Normalizer",
    "Normalizare",
    QUEUES.NORMALIZE_NAME,
    "Normalizeaza numele si decide ruta spre C1 sau promotion.",
  ),
  defineRuntimeWorker(
    "B2:email-normalizer",
    "B2 Email Normalizer",
    "Normalizare",
    QUEUES.NORMALIZE_EMAIL,
    "Normalizeaza emailul si semnalizeaza adrese invalide ori generice.",
  ),
  defineRuntimeWorker(
    "B3:phone-normalizer",
    "B3 Phone Normalizer",
    "Normalizare",
    QUEUES.NORMALIZE_PHONE,
    "Normalizeaza telefonul Bronze si tipul numarului.",
  ),
  defineRuntimeWorker(
    "B4:address-normalizer",
    "B4 Address Normalizer",
    "Normalizare",
    QUEUES.NORMALIZE_ADDRESS,
    "Standardizeaza adresa si extrage componente structurale.",
  ),
  defineRuntimeWorker(
    "B5:anaf-bronze-enricher",
    "B5 ANAF Bronze",
    "Normalizare/Enrichment",
    QUEUES.ENRICH_BRONZE_ANAF,
    "Face batching pe CUI-uri Bronze si completeaza identificatorii din ANAF.",
  ),
  defineRuntimeWorker(
    "C1:cui-modulo11",
    "C1 CUI Modulo-11",
    "Validare",
    QUEUES.VALIDATE_CUI_MOD11,
    "Valideaza matematic CUI-ul inainte de validarea oficiala.",
  ),
  defineRuntimeWorker(
    "C2:cui-anaf-validator",
    "C2 CUI ANAF",
    "Validare",
    QUEUES.VALIDATE_CUI_ANAF,
    "Confirma CUI-ul la ANAF si trimite contactul in promotion.",
  ),
  defineRuntimeWorker(
    "promotion:bronze-silver",
    "Promotion Bronze -> Silver",
    "Promotion",
    QUEUES.PIPELINE_PROMOTE_BRONZE_SILVER,
    "Reproceseaza identitatea, promoveaza contactul si porneste enrichment-ul Silver.",
  ),
  defineRuntimeWorker(
    "D0:anaf-full-fetch",
    "D0 ANAF Full Fetch",
    "ANAF",
    QUEUES.ENRICH_ANAF_FULL,
    "Fetch complet ANAF v9 unificat — D1-D5 într-un singur apel cu cache Redis 5 min.",
  ),
  defineRuntimeWorker(
    "E1:termene-balance",
    "E1 Termene Balance",
    "Termene",
    QUEUES.ENRICH_TERMENE_BALANCE,
    "Aduce cifre financiare, profit si numar de angajati.",
  ),
  defineRuntimeWorker(
    "E2:termene-risk",
    "E2 Termene Risk",
    "Termene",
    QUEUES.ENRICH_TERMENE_RISK,
    "Actualizeaza scorul si categoria de risc.",
  ),
  defineRuntimeWorker(
    "E3:termene-dosare",
    "E3 Termene Dosare",
    "Termene",
    QUEUES.ENRICH_TERMENE_DOSARE,
    "Incarca dosarele juridice si indicatorii asociati.",
  ),
  defineRuntimeWorker(
    "E4:termene-actionari",
    "E4 Termene Actionari",
    "Termene",
    QUEUES.ENRICH_TERMENE_ACTIONARI,
    "Extrage actionari, asociati si persoane relevante.",
  ),
  defineRuntimeWorker(
    "F1:onrc-data",
    "F1 ONRC Data",
    "ONRC",
    QUEUES.ENRICH_ONRC_DATA,
    "Sincronizeaza datele oficiale ONRC pentru companie.",
  ),
  defineRuntimeWorker(
    "F2:onrc-administratori",
    "F2 ONRC Administratori",
    "ONRC",
    QUEUES.ENRICH_ONRC_ADMINISTRATORI,
    "Extrage administratorii si rolurile din ONRC.",
  ),
  defineRuntimeWorker(
    "F3:onrc-sedii",
    "F3 ONRC Sedii",
    "ONRC",
    QUEUES.ENRICH_ONRC_SEDII,
    "Recupereaza istoricul de sedii si locatii ONRC.",
  ),
  defineRuntimeWorker(
    "G1:hunter-email-finder",
    "G1 Hunter Email Finder",
    "Email",
    QUEUES.DISCOVER_EMAIL_HUNTER,
    "Cauta emailuri de companie si contacte relevante pe domeniu.",
  ),
  defineRuntimeWorker(
    "G2:hunter-verifier",
    "G2 Hunter Verifier",
    "Email",
    QUEUES.DISCOVER_EMAIL_HUNTER_VERIFY,
    "Verifica emailurile descoperite prin Hunter.",
  ),
  defineRuntimeWorker(
    "G2:zerobounce-validation",
    "G2 ZeroBounce Validation",
    "Email",
    QUEUES.DISCOVER_EMAIL_ZEROBOUNCE,
    "Valideaza livrabilitatea emailurilor la ZeroBounce.",
  ),
  defineRuntimeWorker(
    "G3:email-enricher",
    "G3 Email Enricher",
    "Email",
    QUEUES.ENRICH_EMAIL_ENRICHER,
    "Face enrichment pe emailuri deja cunoscute.",
  ),
  defineRuntimeWorker(
    "G4:email-pattern",
    "G4 Email Pattern",
    "Email",
    QUEUES.DISCOVER_EMAIL_PATTERN,
    "Inferă pattern-ul corporativ de email.",
  ),
  defineRuntimeWorker(
    "G5:email-generator",
    "G5 Email Generator",
    "Email",
    QUEUES.DISCOVER_EMAIL_GENERATE,
    "Genereaza emailuri candidate pe baza pattern-ului confirmat.",
  ),
  defineRuntimeWorker(
    "H1:phone-normalizer-silver",
    "H1 Phone Normalizer",
    "Phone",
    QUEUES.ENRICH_PHONE_NORMALIZE,
    "Normalizeaza telefoanele Silver si lanseaza validari ulterioare.",
  ),
  defineRuntimeWorker(
    "H2:hlr-lookup",
    "H2 HLR Lookup",
    "Phone",
    QUEUES.ENRICH_PHONE_HLR,
    "Confirma validitatea si reteaua numerelor de telefon.",
  ),
  defineRuntimeWorker(
    "H3:carrier-detection",
    "H3 Carrier Detection",
    "Phone",
    QUEUES.ENRICH_PHONE_CARRIER,
    "Detecteaza operatorul si semnalizeaza portarea.",
  ),
  defineRuntimeWorker(
    "I1:daj-scraper",
    "I1 DAJ Scraper",
    "Scraping",
    QUEUES.SCRAPE_LEGAL_DAJ,
    "Cauta dosare in DAJ si completeaza contextul juridic.",
  ),
  defineRuntimeWorker(
    "I2:anif-scraper",
    "I2 ANIF Scraper",
    "Scraping",
    QUEUES.SCRAPE_LEGAL_ANIF,
    "Cauta incidente sau litigii in ANIF.",
  ),
  defineRuntimeWorker(
    "I3:website-finder",
    "I3 Website Finder",
    "Scraping",
    QUEUES.SCRAPE_WEBSITE_FINDER,
    "Identifica website-ul companiei si continua scraping-ul.",
  ),
  defineRuntimeWorker(
    "I4:contact-page-scraper",
    "I4 Contact Page Scraper",
    "Scraping",
    QUEUES.SCRAPE_WEBSITE_CONTACT_PAGE,
    "Extrage emailuri, telefoane si pagini de contact de pe website.",
  ),
  defineRuntimeWorker(
    "J1:ai-structuring",
    "J1 AI Structuring",
    "AI",
    QUEUES.AI_STRUCTURE_XAI,
    "Structureaza campurile neuniforme cu ajutor AI.",
  ),
  defineRuntimeWorker(
    "J2:ai-data-merger",
    "J2 AI Data Merger",
    "AI",
    QUEUES.AI_MERGE_XAI,
    "Conciliaza datele venite din surse multiple.",
  ),
  defineRuntimeWorker(
    "J3:ai-confidence-scorer",
    "J3 AI Confidence",
    "AI",
    QUEUES.AI_SCORE_CONFIDENCE,
    "Calculeaza increderea pentru campurile AI-generate.",
  ),
  defineRuntimeWorker(
    "J4:ai-fallback",
    "J4 AI Fallback",
    "AI",
    QUEUES.AI_FALLBACK,
    "Ruleaza fallback-ul AI cand procesorul principal nu poate finaliza.",
  ),
  defineRuntimeWorker(
    "K1:nominatim-geocoding",
    "K1 Nominatim Geocoding",
    "Geo",
    QUEUES.GEO_GEOCODE_NOMINATIM,
    "Geocodeaza adresa si propaga coordonatele.",
  ),
  defineRuntimeWorker(
    "K2:postgis-zones",
    "K2 PostGIS Zones",
    "Geo",
    QUEUES.GEO_ZONES_POSTGIS,
    "Mapeaza judet, UAT si zonele postgis.",
  ),
  defineRuntimeWorker(
    "K3:proximity-calculator",
    "K3 Proximity Calculator",
    "Geo",
    QUEUES.GEO_PROXIMITY,
    "Calculeaza proximitatea fata de reperele importante.",
  ),
  defineRuntimeWorker(
    "L1:apia-data",
    "L1 APIA Data",
    "Agri",
    QUEUES.AGRI_APIA,
    "Cauta subventii si suprafete APIA pentru companiile agricole.",
  ),
  defineRuntimeWorker(
    "L2:ouai-membership",
    "L2 OUAI Membership",
    "Agri",
    QUEUES.AGRI_OUAI,
    "Verifica apartenenta la OUAI.",
  ),
  defineRuntimeWorker(
    "L3:cooperative-membership",
    "L3 Cooperative Membership",
    "Agri",
    QUEUES.AGRI_COOPERATIVE,
    "Verifica participarea in cooperative agricole.",
  ),
  defineRuntimeWorker(
    "L4:culturi-classifier",
    "L4 Culturi Classifier",
    "Agri",
    QUEUES.AGRI_CULTURI,
    "Clasifica culturile si profilele agricole.",
  ),
  defineRuntimeWorker(
    "L5:animale-classifier",
    "L5 Animale Classifier",
    "Agri",
    QUEUES.AGRI_ANIMALE,
    "Clasifica efectivele si activitatile zootehnice.",
  ),
  defineRuntimeWorker(
    "M1:dedup-exact-hash",
    "M1 Dedup Exact",
    "Dedup",
    QUEUES.DEDUP_EXACT,
    "Detecteaza duplicate exacte pe baza cheilor tari.",
  ),
  defineRuntimeWorker(
    "M2:dedup-fuzzy-match",
    "M2 Dedup Fuzzy",
    "Dedup",
    QUEUES.DEDUP_FUZZY,
    "Calculeaza similitudini fuzzy si propune merge/HITL.",
  ),
  defineRuntimeWorker(
    "N1:score-completeness",
    "N1 Completeness Score",
    "Scoring",
    QUEUES.SCORE_COMPLETENESS,
    "Evalueaza cat de completa este fisa companiei.",
  ),
  defineRuntimeWorker(
    "N2:score-accuracy",
    "N2 Accuracy Score",
    "Scoring",
    QUEUES.SCORE_ACCURACY,
    "Evalueaza consistenta si acuratetea datelor.",
  ),
  defineRuntimeWorker(
    "N3:score-freshness",
    "N3 Freshness Score",
    "Scoring",
    QUEUES.SCORE_FRESHNESS,
    "Evalueaza cat de recente sunt datele acumulate.",
  ),
  defineRuntimeWorker(
    "O2:quality-rollup",
    "O2 Quality Rollup",
    "Aggregare",
    QUEUES.AGGREGATE_QUALITY_ROLLUP,
    "Calculeaza scorul total si eligibilitatea pentru Gold.",
  ),
  defineRuntimeWorker(
    "P1:pipeline-orchestrate",
    "P1 Pipeline Orchestrate",
    "Orchestrare",
    QUEUES.PIPELINE_ORCHESTRATE,
    "Porneste valurile post-validation, post-enrichment si post-scoring.",
  ),
  defineRuntimeWorker(
    "P2:promote-to-gold",
    "P2 Promote to Gold",
    "Gold",
    QUEUES.PIPELINE_PROMOTE_TO_GOLD,
    "Promoveaza compania Silver in Gold cand scorul o permite.",
  ),
  defineRuntimeWorker(
    "P4:error-handler",
    "P4 Error Handler",
    "Recovery",
    QUEUES.PIPELINE_ERROR_HANDLER,
    "Rejoaca sau escaladeaza joburile esuate din pipeline.",
  ),
  defineRuntimeWorker(
    "HITL:escalation",
    "HITL Escalation",
    "HITL",
    QUEUES.HITL_ESCALATION,
    "Escaladeaza taskurile umane care depasesc SLA-ul.",
  ),
  defineRuntimeWorker(
    "HITL:resume-after-approval",
    "HITL Resume",
    "HITL",
    QUEUES.HITL_RESUME_AFTER_APPROVAL,
    "Reia fluxul dupa aprobarea sau respingerea umana.",
  ),
];

export const IMPORT_RUNTIME_WORKER_BY_NAME = new Map(
  IMPORT_RUNTIME_WORKERS.map((worker) => [worker.workerName, worker] as const),
);

export const SILVER_LOG_SOURCE_TO_WORKER_NAME: Record<string, string> = {
  cui_modulo11: "C1:cui-modulo11",
  anaf_cui_validation: "C2:cui-anaf-validator",
  batch_reprocess: "promotion:bronze-silver",
  anaf_full: "D0:anaf-full-fetch",
  anaf_fiscal: "D0:anaf-full-fetch",
  anaf_tva: "D0:anaf-full-fetch",
  anaf_efactura: "D0:anaf-full-fetch",
  anaf_datorii: "D0:anaf-full-fetch",
  anaf_caen: "D0:anaf-full-fetch",
  termene_balance: "E1:termene-balance",
  termene_risk: "E2:termene-risk",
  termene_dosare: "E3:termene-dosare",
  termene_actionari: "E4:termene-actionari",
  onrc_data: "F1:onrc-data",
  onrc_admin: "F2:onrc-administratori",
  onrc_sedii_history: "F3:onrc-sedii",
  hunter_email: "G1:hunter-email-finder",
  hunter_verify: "G2:hunter-verifier",
  zerobounce_validation: "G2:zerobounce-validation",
  email_enricher: "G3:email-enricher",
  email_pattern: "G4:email-pattern",
  email_generator: "G5:email-generator",
  phone_normalizer: "H1:phone-normalizer-silver",
  hlr_lookup: "H2:hlr-lookup",
  carrier_detection: "H3:carrier-detection",
  daj_scraper: "I1:daj-scraper",
  anif_scraper: "I2:anif-scraper",
  website_finder: "I3:website-finder",
  contact_scraper: "I4:contact-page-scraper",
  ai_structuring: "J1:ai-structuring",
  ai_data_merger: "J2:ai-data-merger",
  ai_confidence_scorer: "J3:ai-confidence-scorer",
  ai_fallback: "J4:ai-fallback",
  nominatim_geocoding: "K1:nominatim-geocoding",
  postgis_zones: "K2:postgis-zones",
  proximity_calculator: "K3:proximity-calculator",
  apia_data: "L1:apia-data",
  ouai_membership: "L2:ouai-membership",
  cooperative_membership: "L3:cooperative-membership",
  culturi_classifier: "L4:culturi-classifier",
  animale_classifier: "L5:animale-classifier",
  dedup_exact: "M1:dedup-exact-hash",
  dedup_fuzzy: "M2:dedup-fuzzy-match",
  score_completeness: "N1:score-completeness",
  score_accuracy: "N2:score-accuracy",
  score_freshness: "N3:score-freshness",
  quality_rollup: "O2:quality-rollup",
  promote_to_gold: "P2:promote-to-gold",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function toIso(value: number | null | undefined): string | null {
  return typeof value === "number" ? new Date(value).toISOString() : null;
}

function extractProgressValue(value: unknown): number | null {
  if (typeof value === "number") {
    return Math.round(value);
  }

  const record = asRecord(value);
  if (!record) return null;

  const candidate = record.progress ?? record.value ?? record.percent ?? null;
  return typeof candidate === "number" ? Math.round(candidate) : null;
}

function buildRuntimeJobKey(workerName: string, jobId: string | null, entityId: string | null) {
  if (jobId) return `${workerName}:${jobId}`;
  if (entityId) return `${workerName}:entity:${entityId}`;
  return `${workerName}:unknown`;
}

function correlationMatchesBatch(correlationId: unknown, batchId: string) {
  return typeof correlationId === "string" && correlationId.includes(batchId);
}

function isRelevantImportQueueJob(
  queueName: string,
  job: { id?: string | number | null; data?: unknown },
  batchId: string,
) {
  const data = asRecord(job.data);
  const jobId = job.id == null ? "" : String(job.id);

  if (data?.batchId === batchId) return true;
  if (correlationMatchesBatch(data?.correlationId, batchId)) return true;

  if (queueName === QUEUES.ENRICH_BRONZE_ANAF && jobId.startsWith(`anaf-bronze-${batchId}`)) {
    return true;
  }

  if (
    queueName === QUEUES.PIPELINE_PROMOTE_BRONZE_SILVER &&
    (jobId === `reprocess-batch__${batchId}` || jobId === `reprocess-errors-batch__${batchId}`)
  ) {
    return true;
  }

  return false;
}

function inferObservedBronzeRuntimeState(logs: ImportRuntimeObservedBronzeLog[]) {
  const latest = logs[0];
  const step = latest.step.toLowerCase();
  const message = latest.message.toLowerCase();
  const hasError = logs.some((log) => log.level === "error");
  const hasWarn = logs.some((log) => log.level === "warn");

  if (hasError) return "error";
  if (
    step.includes("done") ||
    step.includes("complete") ||
    step.includes("invalid") ||
    step.includes("skip") ||
    message.includes("finaliz") ||
    message.includes("sarit") ||
    message.includes("procesat cu succes")
  ) {
    return hasWarn ? "warning" : "completed";
  }
  if (hasWarn) return "warning";
  if (step.includes("start") || latest.level === "step") return "running";
  return "seen";
}

function normalizeSilverObservedLevel(
  row: typeof silverEnrichmentLog.$inferSelect,
): JobLogsApiLevel {
  if (row.errorMessage) return "error";
  const status = typeof row.status === "string" ? row.status.toLowerCase() : "";
  if (status.includes("fail") || status.includes("error")) return "error";
  if (status === "not_found" || status === "skipped" || status === "blocked") return "warn";
  if (status === "started" || status === "in_progress" || status === "processing") return "step";
  return "info";
}

function buildSilverObservedMessage(
  row: typeof silverEnrichmentLog.$inferSelect,
  workerLabel: string,
): string {
  if (row.errorMessage) return row.errorMessage;

  const status =
    typeof row.status === "string" && row.status.trim().length > 0 ? row.status : "success";
  const operation = row.operation?.trim() || "process";

  if (status === "not_found") return `${workerLabel} · ${operation}: fara rezultat`;
  if (status === "skipped") return `${workerLabel} · ${operation}: sarit`;
  if (status === "blocked") return `${workerLabel} · ${operation}: blocat`;
  if (status === "started" || status === "in_progress" || status === "processing") {
    return `${workerLabel} · ${operation}: in curs`;
  }

  return `${workerLabel} · ${operation}: finalizat`;
}

function buildSilverObservedLogRow(
  row: typeof silverEnrichmentLog.$inferSelect,
): ImportRuntimeObservedSilverLog | null {
  const workerName = SILVER_LOG_SOURCE_TO_WORKER_NAME[row.source];
  if (!workerName) return null;

  const worker = IMPORT_RUNTIME_WORKER_BY_NAME.get(workerName);
  if (!worker) return null;

  const level = normalizeSilverObservedLevel(row);
  const fieldsUpdated = Array.isArray(row.fieldsUpdated) ? row.fieldsUpdated.map(String) : [];

  return {
    id: row.id,
    entityId: row.entityId,
    entityType: row.entityType,
    workerName,
    queueName: worker.queueName,
    jobId: row.jobId ?? null,
    correlationId: row.correlationId ?? null,
    level,
    step: row.operation || "event",
    message: buildSilverObservedMessage(row, worker.label),
    details: {
      source: row.source,
      operation: row.operation,
      status: row.status ?? "success",
      fieldsUpdated,
      errorCode: row.errorCode ?? null,
    },
    durationMs: row.durationMs ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function resolveFinishedOnFromDuration(
  createdAt: string,
  durationMs: number | null,
): string | null {
  return typeof durationMs === "number" ? createdAt : null;
}

function inferObservedSilverRuntimeState(logs: ImportRuntimeObservedSilverLog[]) {
  const latest = logs[0];
  if (logs.some((log) => log.level === "error")) return "error";
  if (logs.some((log) => log.level === "warn")) return "warning";
  if (latest.level === "step") return "running";
  return "completed";
}

function buildObservedBronzeRuntimeJob(
  workerName: string,
  queueName: string,
  logs: ImportRuntimeObservedBronzeLog[],
): ImportRuntimeJobSnapshot {
  const latest = logs[0];
  const earliest = logs.at(-1) ?? latest;
  const entityId = latest.bronzeContactId;

  return {
    key: buildRuntimeJobKey(workerName, latest.jobId, entityId),
    source: "job_logs",
    state: inferObservedBronzeRuntimeState(logs),
    workerName,
    queueName,
    jobId: latest.jobId,
    bronzeContactId: entityId,
    entityId,
    entityType: entityId ? "bronze_contact" : null,
    correlationId: null,
    level: latest.level,
    step: latest.step,
    message: latest.message,
    progress: null,
    attemptsMade: 0,
    maxAttempts: 0,
    failedReason: latest.level === "error" ? latest.message : null,
    createdAt: earliest.createdAt,
    processedOn: null,
    finishedOn: resolveFinishedOnFromDuration(latest.createdAt, latest.durationMs),
    lastEventAt: latest.createdAt,
    durationMs: latest.durationMs,
  };
}

function buildObservedSilverRuntimeJob(
  workerName: string,
  queueName: string,
  logs: ImportRuntimeObservedSilverLog[],
): ImportRuntimeJobSnapshot {
  const latest = logs[0];
  const earliest = logs.at(-1) ?? latest;
  const bronzeContactId = latest.entityType === "bronze_contact" ? latest.entityId : null;

  return {
    key: buildRuntimeJobKey(workerName, latest.jobId, latest.entityId),
    source: "silver_logs",
    state: inferObservedSilverRuntimeState(logs),
    workerName,
    queueName,
    jobId: latest.jobId,
    bronzeContactId,
    entityId: latest.entityId,
    entityType: latest.entityType,
    correlationId: latest.correlationId,
    level: latest.level,
    step: latest.step,
    message: latest.message,
    progress: null,
    attemptsMade: 0,
    maxAttempts: 0,
    failedReason: latest.level === "error" ? latest.message : null,
    createdAt: earliest.createdAt,
    processedOn: null,
    finishedOn: resolveFinishedOnFromDuration(latest.createdAt, latest.durationMs),
    lastEventAt: latest.createdAt,
    durationMs: latest.durationMs,
  };
}

function buildBullJobResponseData(
  job: BullJobLike,
  state: string,
  isStale: boolean,
  isBacklogged: boolean,
  waitingJobs: number,
  lastProgressAtRaw: string | null,
  reprocessStatus: string,
) {
  const stacktraceLines = Array.isArray(job.stacktrace) ? job.stacktrace : [];
  const lastStacktrace =
    stacktraceLines.length > 0 ? String(stacktraceLines.at(-1) ?? "").slice(0, 2000) || null : null;
  const processedOnIso = job.processedOn == null ? null : new Date(job.processedOn).toISOString();
  const finishedOnIso = job.finishedOn == null ? null : new Date(job.finishedOn).toISOString();
  const responseState = resolvePromoteResponseState(isStale, isBacklogged, state);
  return {
    state: responseState,
    isStale,
    isBacklogged,
    jobId: job.id ?? null,
    attemptsMade: job.attemptsMade ?? 0,
    maxAttempts: job.opts?.attempts ?? 3,
    failedReason: job.failedReason ?? null,
    stacktrace: lastStacktrace,
    progress: typeof job.progress === "number" ? job.progress : null,
    timestamp: job.timestamp ? new Date(job.timestamp).toISOString() : null,
    processedOn: processedOnIso,
    finishedOn: finishedOnIso,
    lastProgressAt: lastProgressAtRaw,
    waitingJobs,
    dbStatus: reprocessStatus,
  };
}

function getRuntimeTimestamp(value: string | null | undefined): number {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveMergedRuntimeState(primaryState: string, secondaryState: string): string {
  if (primaryState === "error" || secondaryState === "error") return "error";
  if (primaryState === "warning" || secondaryState === "warning") return "warning";
  return primaryState;
}

function mergeObservedRuntimeJobs(
  left: ImportRuntimeJobSnapshot,
  right: ImportRuntimeJobSnapshot,
): ImportRuntimeJobSnapshot {
  const leftTs = getRuntimeTimestamp(left.lastEventAt ?? left.createdAt);
  const rightTs = getRuntimeTimestamp(right.lastEventAt ?? right.createdAt);
  const primary = rightTs >= leftTs ? right : left;
  const secondary = primary === right ? left : right;

  return {
    ...secondary,
    ...primary,
    source: "merged",
    state: resolveMergedRuntimeState(primary.state, secondary.state),
    bronzeContactId: primary.bronzeContactId ?? secondary.bronzeContactId ?? null,
    entityId: primary.entityId ?? secondary.entityId ?? null,
    entityType: primary.entityType ?? secondary.entityType ?? null,
    correlationId: primary.correlationId ?? secondary.correlationId ?? null,
    level: primary.level ?? secondary.level ?? null,
    step: primary.step ?? secondary.step ?? null,
    message: primary.message ?? secondary.message ?? null,
    failedReason: primary.failedReason ?? secondary.failedReason ?? null,
    durationMs: primary.durationMs ?? secondary.durationMs ?? null,
    createdAt: secondary.createdAt ?? primary.createdAt,
    lastEventAt: primary.lastEventAt ?? secondary.lastEventAt,
  };
}

function groupObservedLogsByRuntimeKey<T>(
  workerName: string,
  logs: T[],
  getJobId: (log: T) => string | null,
  getEntityId: (log: T) => string | null,
): Map<string, T[]> {
  const groupedLogs = new Map<string, T[]>();

  for (const log of logs) {
    const key = buildRuntimeJobKey(workerName, getJobId(log), getEntityId(log));
    const bucket = groupedLogs.get(key) ?? [];
    bucket.push(log);
    groupedLogs.set(key, bucket);
  }

  return groupedLogs;
}

function createBaseRuntimeWorkerCounts(
  observedJobs: Map<string, ImportRuntimeJobSnapshot>,
  observedLogs: number,
): ImportRuntimeWorkerCounts {
  const observedJobList = [...observedJobs.values()];

  return {
    waiting: 0,
    active: 0,
    delayed: 0,
    prioritized: 0,
    failedLive: 0,
    observedCompleted: observedJobList.filter((job) => job.state === "completed").length,
    observedWarnings: observedJobList.filter((job) => job.state === "warning").length,
    observedErrors: observedJobList.filter((job) => job.state === "error").length,
    observedLogs,
    observedJobs: observedJobs.size,
  };
}

function incrementRuntimeWorkerCount(counts: ImportRuntimeWorkerCounts, state: string) {
  if (state === "waiting") {
    counts.waiting += 1;
    return;
  }

  if (state === "active") {
    counts.active += 1;
    return;
  }

  if (state === "delayed") {
    counts.delayed += 1;
    return;
  }

  if (state === "prioritized") {
    counts.prioritized += 1;
    return;
  }

  if (state === "failed") {
    counts.failedLive += 1;
  }
}

function resolveRuntimeQueueJobIdentity(
  data: Record<string, unknown> | null,
): RuntimeQueueJobIdentity {
  const bronzeContactId = typeof data?.bronzeContactId === "string" ? data.bronzeContactId : null;
  const companyId = typeof data?.companyId === "string" ? data.companyId : null;
  const explicitEntityId = typeof data?.entityId === "string" ? data.entityId : null;
  const entityId = bronzeContactId ?? companyId ?? explicitEntityId;

  let entityType: string | null = null;
  if (bronzeContactId) {
    entityType = "bronze_contact";
  } else if (companyId) {
    entityType = "company";
  } else if (typeof data?.entityType === "string") {
    entityType = data.entityType;
  }

  return {
    bronzeContactId,
    entityId,
    entityType,
    correlationId: typeof data?.correlationId === "string" ? data.correlationId : null,
  };
}

function buildRuntimeWorkerJobs(observedJobs: Map<string, ImportRuntimeJobSnapshot>) {
  return [...observedJobs.values()]
    .sort(
      (left, right) =>
        getRuntimeTimestamp(right.lastEventAt ?? right.createdAt) -
        getRuntimeTimestamp(left.lastEventAt ?? left.createdAt),
    )
    .slice(0, 120);
}

async function loadImportRuntimeObservedLogs(
  tenantId: string,
  batchId: string,
): Promise<ImportRuntimeObservedLogBundle> {
  const batchCorrelationPattern = `%${batchId}%`;

  await setSessionTenantId(tenantId);
  const [recentLogRows, recentSilverLogRows] = await Promise.all([
    db
      .select()
      .from(jobLogs)
      .where(
        sql`${jobLogs.tenantId} = ${tenantId} AND ${jobLogs.batchId} = ${batchId} AND ${jobLogs.etapa} = ${"e1"}`,
      )
      .orderBy(sql`${jobLogs.createdAt} DESC`)
      .limit(6000),
    db
      .select()
      .from(silverEnrichmentLog)
      .where(
        sql`${silverEnrichmentLog.tenantId} = ${tenantId}
            AND COALESCE(${silverEnrichmentLog.correlationId}, '') ILIKE ${batchCorrelationPattern}`,
      )
      .orderBy(sql`${silverEnrichmentLog.createdAt} DESC`)
      .limit(6000),
  ]);

  const recentLogs = recentLogRows.map((row) => buildJobLogResponseRow(row));
  const recentSilverLogs = recentSilverLogRows
    .map((row) => buildSilverObservedLogRow(row))
    .filter((row): row is ImportRuntimeObservedSilverLog => row !== null);

  return {
    recentLogs,
    recentSilverLogs,
    bronzeLogsByWorker: groupObservedLogsByWorker(recentLogs),
    silverLogsByWorker: groupObservedLogsByWorker(recentSilverLogs),
  };
}

function buildPersistedObservedJobs(args: {
  workerDef: ImportRuntimeWorkerDef;
  workerLogs: ImportRuntimeObservedBronzeLog[];
  workerSilverLogs: ImportRuntimeObservedSilverLog[];
}) {
  const observedJobs = new Map<string, ImportRuntimeJobSnapshot>();
  const groupedBronzeLogs = groupObservedLogsByRuntimeKey(
    args.workerDef.workerName,
    args.workerLogs,
    (log) => log.jobId,
    (log) => log.bronzeContactId,
  );
  const groupedSilverLogs = groupObservedLogsByRuntimeKey(
    args.workerDef.workerName,
    args.workerSilverLogs,
    (log) => log.jobId,
    (log) => log.entityId,
  );

  for (const [key, grouped] of groupedBronzeLogs) {
    observedJobs.set(
      key,
      buildObservedBronzeRuntimeJob(args.workerDef.workerName, args.workerDef.queueName, grouped),
    );
  }

  for (const [key, grouped] of groupedSilverLogs) {
    const silverObserved = buildObservedSilverRuntimeJob(
      args.workerDef.workerName,
      args.workerDef.queueName,
      grouped,
    );
    const existing = observedJobs.get(key);
    observedJobs.set(
      key,
      existing ? mergeObservedRuntimeJobs(existing, silverObserved) : silverObserved,
    );
  }

  return observedJobs;
}

function buildLiveRuntimeJobSnapshot(args: {
  workerDef: ImportRuntimeWorkerDef;
  job: RuntimeQueueJobLike;
  state: string;
  existing: ImportRuntimeJobSnapshot | undefined;
}): ImportRuntimeJobSnapshot {
  const data = asRecord(args.job.data);
  const jobId = args.job.id == null ? null : String(args.job.id);
  const identity = resolveRuntimeQueueJobIdentity(data);

  return {
    key: buildRuntimeJobKey(args.workerDef.workerName, jobId, identity.entityId),
    source: args.existing ? "merged" : "bullmq",
    state: args.state,
    workerName: args.workerDef.workerName,
    queueName: args.workerDef.queueName,
    jobId,
    bronzeContactId: identity.bronzeContactId,
    entityId: identity.entityId,
    entityType: identity.entityType,
    correlationId: identity.correlationId,
    level: args.existing?.level ?? null,
    step: args.existing?.step ?? null,
    message:
      args.existing?.message ??
      (typeof args.job.failedReason === "string" ? args.job.failedReason : null),
    progress: extractProgressValue(args.job.progress),
    attemptsMade: args.job.attemptsMade ?? args.existing?.attemptsMade ?? 0,
    maxAttempts: args.job.opts?.attempts ?? args.existing?.maxAttempts ?? 0,
    failedReason:
      typeof args.job.failedReason === "string"
        ? args.job.failedReason
        : (args.existing?.failedReason ?? null),
    createdAt: toIso(args.job.timestamp) ?? args.existing?.createdAt ?? null,
    processedOn: toIso(args.job.processedOn) ?? args.existing?.processedOn ?? null,
    finishedOn: toIso(args.job.finishedOn) ?? args.existing?.finishedOn ?? null,
    lastEventAt:
      args.existing?.lastEventAt ??
      toIso(args.job.processedOn) ??
      toIso(args.job.timestamp) ??
      null,
    durationMs: args.existing?.durationMs ?? null,
  };
}

async function mergeLiveQueueJobsIntoObservedJobs(args: {
  workerDef: ImportRuntimeWorkerDef;
  batchId: string;
  observedJobs: Map<string, ImportRuntimeJobSnapshot>;
  counts: ImportRuntimeWorkerCounts;
}) {
  const queue = createQueue(args.workerDef.queueName);

  try {
    const queueJobs = (await queue.getJobs(
      ["wait", "active", "delayed", "prioritized", "failed"],
      0,
      300,
      true,
    )) as RuntimeQueueJobLike[];

    const relevantJobs = queueJobs.filter(
      (job): job is RuntimeQueueJobLike =>
        job != null && isRelevantImportQueueJob(args.workerDef.queueName, job, args.batchId),
    );
    const liveStates = await Promise.all(
      relevantJobs.map(async (job) => {
        try {
          return await job.getState();
        } catch {
          return "unknown";
        }
      }),
    );

    for (const [index, job] of relevantJobs.entries()) {
      const state = liveStates[index] ?? "unknown";
      incrementRuntimeWorkerCount(args.counts, state);
      const identity = resolveRuntimeQueueJobIdentity(asRecord(job.data));
      const key = buildRuntimeJobKey(
        args.workerDef.workerName,
        job.id == null ? null : String(job.id),
        identity.entityId,
      );
      const existing = args.observedJobs.get(key);

      args.observedJobs.set(
        key,
        buildLiveRuntimeJobSnapshot({
          workerDef: args.workerDef,
          job,
          state,
          existing,
        }),
      );
    }
  } finally {
    await queue.close();
  }
}

async function buildRuntimeWorkerSnapshot(args: {
  workerDef: ImportRuntimeWorkerDef;
  batchId: string;
  bronzeLogsByWorker: RuntimeObservedLogsByWorker<ImportRuntimeObservedBronzeLog>;
  silverLogsByWorker: RuntimeObservedLogsByWorker<ImportRuntimeObservedSilverLog>;
}): Promise<ImportRuntimeWorkerSnapshot> {
  const workerLogs = args.bronzeLogsByWorker.get(args.workerDef.workerName) ?? [];
  const workerSilverLogs = args.silverLogsByWorker.get(args.workerDef.workerName) ?? [];
  const observedJobs = buildPersistedObservedJobs({
    workerDef: args.workerDef,
    workerLogs,
    workerSilverLogs,
  });
  const counts = createBaseRuntimeWorkerCounts(
    observedJobs,
    workerLogs.length + workerSilverLogs.length,
  );

  await mergeLiveQueueJobsIntoObservedJobs({
    workerDef: args.workerDef,
    batchId: args.batchId,
    observedJobs,
    counts,
  });

  return {
    workerName: args.workerDef.workerName,
    label: args.workerDef.label,
    stage: args.workerDef.stage,
    queueName: args.workerDef.queueName,
    description: args.workerDef.description,
    counts,
    jobs: buildRuntimeWorkerJobs(observedJobs),
  };
}

function normalizeRuntimeHeartbeatState(
  state: string,
  heartbeatAt: Date | null | undefined,
  staleThresholdMs = IMPORT_RUNTIME_STALE_THRESHOLD_MS,
) {
  if (
    (state === "running" || state === "recovering") &&
    heartbeatAt &&
    Date.now() - heartbeatAt.getTime() > staleThresholdMs
  ) {
    return "stale";
  }

  return state;
}

function extractRuntimeJobProgress(row: typeof importRuntimeJobs.$inferSelect): number | null {
  const metrics = asRecord(row.metrics);
  const checkpoint = asRecord(row.checkpointPayload);
  return (
    extractProgressValue(metrics) ??
    extractProgressValue(checkpoint) ??
    (row.state === "completed" ? 100 : null)
  );
}

function resolveRuntimeBronzeContactId(row: typeof importRuntimeJobs.$inferSelect) {
  if (row.contactId) return row.contactId;
  if (row.entityType === "bronze_contact" || row.entityType === "contact") {
    return row.entityId;
  }
  return null;
}

function resolveRuntimeJobCorrelationId(metrics: Record<string, unknown> | null) {
  return typeof metrics?.correlationId === "string" ? metrics.correlationId : null;
}

function resolveRuntimeJobLevel(state: string): JobLogsApiLevel | null {
  if (state === "failed" || state === "terminal_error_skipped") return "error";
  if (state === "paused" || state === "stale") return "warn";
  if (state === "running" || state === "recovering") return "step";
  if (state === "completed") return "info";
  return null;
}

function resolveRuntimeJobTextValue(
  primary: Record<string, unknown> | null,
  secondary: Record<string, unknown> | null,
  field: "message" | "step",
) {
  const primaryValue = primary?.[field];
  if (typeof primaryValue === "string" && primaryValue.length > 0) {
    return primaryValue;
  }

  const secondaryValue = secondary?.[field];
  if (typeof secondaryValue === "string" && secondaryValue.length > 0) {
    return secondaryValue;
  }

  return null;
}

function buildRuntimeJobTiming(row: typeof importRuntimeJobs.$inferSelect) {
  const finishedAt = row.completedAt ?? row.failedAt;
  return {
    finishedAt,
    createdAt: row.createdAt?.toISOString?.() ?? null,
    processedOn: row.startedAt?.toISOString?.() ?? null,
    finishedOn: finishedAt?.toISOString?.() ?? null,
    lastEventAt: row.heartbeatAt?.toISOString?.() ?? row.updatedAt?.toISOString?.() ?? null,
    durationMs: row.startedAt && finishedAt ? finishedAt.getTime() - row.startedAt.getTime() : null,
  };
}

function buildRuntimeJobSnapshotFromRow(
  row: typeof importRuntimeJobs.$inferSelect,
): ImportRuntimeJobSnapshot {
  const state = normalizeRuntimeHeartbeatState(row.state, row.heartbeatAt);
  const bronzeContactId = resolveRuntimeBronzeContactId(row);
  const metrics = asRecord(row.metrics);
  const checkpoint = asRecord(row.checkpointPayload);
  const messageCandidate = resolveRuntimeJobTextValue(metrics, checkpoint, "message");
  const stepCandidate = resolveRuntimeJobTextValue(metrics, checkpoint, "step");
  const timing = buildRuntimeJobTiming(row);

  return {
    key: row.runtimeJobKey,
    source: "runtime",
    state,
    workerName: row.workerName,
    queueName: row.queueName,
    jobId: row.bullJobId ?? null,
    bronzeContactId,
    entityId: row.entityId ?? null,
    entityType: row.entityType ?? null,
    correlationId: resolveRuntimeJobCorrelationId(metrics),
    level: resolveRuntimeJobLevel(state),
    step: stepCandidate,
    message: messageCandidate,
    progress: extractRuntimeJobProgress(row),
    attemptsMade: Number(row.attemptsUsed ?? 0),
    maxAttempts: Number(row.maxRecoveryAttempts ?? 0),
    failedReason: row.lastError ?? null,
    createdAt: timing.createdAt,
    processedOn: timing.processedOn,
    finishedOn: timing.finishedOn,
    lastEventAt: timing.lastEventAt,
    durationMs: timing.durationMs,
  };
}

function runtimeJobMatchesSearch(job: ImportRuntimeJobSnapshot, search: string | null | undefined) {
  const normalized = search?.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [
    job.workerName,
    job.queueName,
    job.jobId,
    job.bronzeContactId,
    job.entityId,
    job.entityType,
    job.correlationId,
    job.step,
    job.message,
    job.state,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalized);
}

async function loadImportRuntimeBatchContext(tenantId: string, batchId: string) {
  const [globalControl, batchRow] = await Promise.all([
    loadTenantImportControlStateCompat(tenantId),
    db
      .select({ metadata: bronzeImportBatches.metadata })
      .from(bronzeImportBatches)
      .where(
        sql`${bronzeImportBatches.tenantId} = ${tenantId}
          AND ${bronzeImportBatches.id} = ${batchId}`,
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  const batchMetadata = ((batchRow?.metadata as Record<string, unknown> | null) ??
    {}) as BatchMetadata;
  return {
    batchMetadata,
    globalControl,
    batchControl: readBatchImportControlState(batchMetadata),
  };
}

async function loadImportRuntimeSessionForBatch(
  tenantId: string,
  batchId: string,
  sessionId?: string | null,
) {
  const [session] = await db
    .select()
    .from(importRuntimeSessions)
    .where(
      sessionId
        ? sql`${importRuntimeSessions.tenantId} = ${tenantId}
            AND ${importRuntimeSessions.batchId} = ${batchId}
            AND ${importRuntimeSessions.id} = ${sessionId}`
        : sql`${importRuntimeSessions.tenantId} = ${tenantId}
            AND ${importRuntimeSessions.batchId} = ${batchId}`,
    )
    .orderBy(sql`${importRuntimeSessions.updatedAt} DESC`)
    .limit(1);

  return session ?? null;
}

async function loadImportRuntimeSessionForBatchCompat(
  tenantId: string,
  batchId: string,
  sessionId?: string | null,
  request?: FastifyRequest,
) {
  try {
    return await loadImportRuntimeSessionForBatch(tenantId, batchId, sessionId);
  } catch (err) {
    if (!isSchemaCompatibilityError(err)) {
      throw err;
    }
    if (request) {
      logSchemaCompatibilityFallback(request, err, "imports runtime session", {
        batchId,
        sessionId: sessionId ?? null,
      });
    }
    return null;
  }
}

async function resolveRequestedRuntimeSessionId(
  tenantId: string,
  batchId: string,
  requestedSessionId?: string | null,
  allSessions = false,
) {
  if (allSessions) {
    return null;
  }
  if (requestedSessionId) {
    return requestedSessionId;
  }
  const latestSession = await loadImportRuntimeSessionForBatchCompat(tenantId, batchId);
  return latestSession?.id ?? null;
}

type RuntimeTopologyFilters = {
  sessionId?: string | null;
  worker?: string | null;
  state?: string | null;
  search?: string | null;
  limit?: number;
};

function getRuntimeTopologyLimit(options?: RuntimeTopologyFilters) {
  return Math.max(10, Math.min(options?.limit ?? 160, 500));
}

function buildRuntimeJobsWhereSql(args: {
  tenantId: string;
  batchId: string;
  sessionId: string;
  worker?: string | null;
  state?: string | null;
}) {
  const clauses = [
    sql`${importRuntimeJobs.tenantId} = ${args.tenantId}`,
    sql`${importRuntimeJobs.batchId} = ${args.batchId}`,
    sql`${importRuntimeJobs.sessionId} = ${args.sessionId}`,
  ];

  if (args.worker) {
    clauses.push(sql`${importRuntimeJobs.workerName} = ${args.worker}`);
  }

  if (args.state) {
    clauses.push(sql`${importRuntimeJobs.state} = ${args.state}`);
  }

  return sql.join(clauses, sql` AND `);
}

async function loadRuntimeJobsForSession(args: {
  tenantId: string;
  batchId: string;
  sessionId: string;
  search?: string | null;
  worker?: string | null;
  state?: string | null;
  limit: number;
}) {
  const queryLimit = args.search ? Math.max(args.limit * 4, 400) : args.limit;
  const runtimeJobRows = await db
    .select()
    .from(importRuntimeJobs)
    .where(
      buildRuntimeJobsWhereSql({
        tenantId: args.tenantId,
        batchId: args.batchId,
        sessionId: args.sessionId,
        worker: args.worker,
        state: args.state,
      }),
    )
    .orderBy(sql`${importRuntimeJobs.updatedAt} DESC`)
    .limit(queryLimit);

  return runtimeJobRows
    .map((row) => buildRuntimeJobSnapshotFromRow(row))
    .filter((job) => runtimeJobMatchesSearch(job, args.search))
    .slice(0, args.limit);
}

async function loadPromotedSilverContactsDuringSession(tenantId: string, sessionId: string) {
  const promotedDuringSessionRow = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*) AS count
        FROM silver.silver_contacts
        WHERE tenant_id = ${tenantId}
          AND COALESCE(metadata->'importProvenance'->>'sessionId', '') = ${sessionId}
          AND COALESCE(metadata->'importProvenance'->>'createdByPromotion', 'false') = 'true'`,
  );

  return Number(promotedDuringSessionRow[0]?.count ?? 0);
}

function deriveRuntimeAnafState(args: {
  globalPaused: boolean;
  batchPaused: boolean;
  workerPaused: boolean;
  batchMetadata: BatchMetadata;
  anafCounter: typeof importRuntimeWorkerCounters.$inferSelect | undefined;
}) {
  if (args.globalPaused || args.batchPaused || args.workerPaused) {
    return "paused";
  }

  if (typeof args.batchMetadata.anafEnrichmentStatus === "string") {
    return args.batchMetadata.anafEnrichmentStatus;
  }

  if (Number(args.anafCounter?.runningJobs ?? 0) > 0) {
    return normalizeRuntimeHeartbeatState("running", args.anafCounter?.lastHeartbeatAt);
  }

  if (Number(args.anafCounter?.queuedJobs ?? 0) > 0) {
    return "queued";
  }

  if (Number(args.anafCounter?.completedJobs ?? 0) > 0) {
    return "completed";
  }

  return "waiting";
}

function buildRuntimeAnafProgress(args: {
  globalControl: ImportGlobalControlState;
  batchControl: ImportBatchControlState;
  batchMetadata: BatchMetadata;
  anafCounter: typeof importRuntimeWorkerCounters.$inferSelect | undefined;
  sessionStartedAt: Date | null;
}) {
  const anafMetrics = asRecord(args.anafCounter?.metrics) ?? {};
  const workerPaused = Boolean(args.batchControl.workerPauses["B5:anaf-bronze-enricher"]);
  const state = deriveRuntimeAnafState({
    globalPaused: args.globalControl.globalPaused,
    batchPaused: args.batchControl.batchPaused,
    workerPaused,
    batchMetadata: args.batchMetadata,
    anafCounter: args.anafCounter,
  });
  const processedCuis = Number(
    anafMetrics.processedCuis ?? args.batchMetadata.anafEnrichmentProcessedCuis ?? 0,
  );

  return {
    state,
    totalCuis: Number(anafMetrics.totalCuis ?? args.batchMetadata.anafEnrichmentTotalCuis ?? 0),
    processedCuis,
    totalBatches: Number(
      anafMetrics.totalBatches ?? args.batchMetadata.anafEnrichmentTotalBatches ?? 0,
    ),
    processedBatches: Number(
      anafMetrics.processedBatches ?? args.batchMetadata.anafEnrichmentProcessedBatches ?? 0,
    ),
    failedBatches: Number(args.batchMetadata.anafEnrichmentFailedBatches ?? 0),
    heartbeatAt: args.anafCounter?.lastHeartbeatAt?.toISOString?.() ?? null,
    startedAt:
      typeof args.batchMetadata.anafEnrichmentQueuedAt === "string"
        ? args.batchMetadata.anafEnrichmentQueuedAt
        : (args.sessionStartedAt?.toISOString?.() ?? null),
    completedAt:
      typeof args.batchMetadata.anafEnrichmentCompletedAt === "string"
        ? args.batchMetadata.anafEnrichmentCompletedAt
        : null,
    throughput:
      processedCuis > 0 && args.anafCounter?.lastHeartbeatAt && args.sessionStartedAt
        ? processedCuis /
          Math.max(
            1,
            (args.anafCounter.lastHeartbeatAt.getTime() - args.sessionStartedAt.getTime()) / 1000,
          )
        : null,
  };
}

async function buildImportRuntimeTopologyFromRuntime(
  tenantId: string,
  batchId: string,
  batchStatus: string,
  options?: RuntimeTopologyFilters,
) {
  const { batchMetadata, globalControl, batchControl } = await loadImportRuntimeBatchContext(
    tenantId,
    batchId,
  );
  const limit = getRuntimeTopologyLimit(options);

  const session = await loadImportRuntimeSessionForBatch(tenantId, batchId, options?.sessionId);
  if (!session) {
    return null;
  }

  const [counterRows, liveSilverCountRow] = await Promise.all([
    db
      .select()
      .from(importRuntimeWorkerCounters)
      .where(
        sql`${importRuntimeWorkerCounters.tenantId} = ${tenantId}
          AND ${importRuntimeWorkerCounters.batchId} = ${batchId}
          AND ${importRuntimeWorkerCounters.sessionId} = ${session.id}`,
      ),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(silverContacts)
      .where(sql`${silverContacts.tenantId} = ${tenantId}`)
      .then((rows) => rows[0] ?? null),
  ]);

  const runtimeJobs = await loadRuntimeJobsForSession({
    tenantId,
    batchId,
    sessionId: session.id,
    search: options?.search,
    worker: options?.worker,
    state: options?.state,
    limit,
  });

  const workerCountersByName = new Map(counterRows.map((row) => [row.workerName, row] as const));
  const jobsByWorker = new Map<string, ImportRuntimeJobSnapshot[]>();
  for (const job of runtimeJobs) {
    const current = jobsByWorker.get(job.workerName) ?? [];
    current.push(job);
    jobsByWorker.set(job.workerName, current);
  }

  const promotedDuringSession = await loadPromotedSilverContactsDuringSession(tenantId, session.id);
  const liveSilverCount = Number(liveSilverCountRow?.count ?? session.silverContactsCurrent ?? 0);
  const silverInitial = Number(session.silverContactsInitial ?? 0);
  const externalDelta = liveSilverCount - (silverInitial + promotedDuringSession);

  const anafCounter = workerCountersByName.get("B5:anaf-bronze-enricher");
  const anafProgress = buildRuntimeAnafProgress({
    globalControl,
    batchControl,
    batchMetadata,
    anafCounter,
    sessionStartedAt: session.startedAt ?? null,
  });

  const promotionCounter = workerCountersByName.get("promotion:bronze-silver");
  const promotionMetrics = {
    scopeTotal: Number(promotionCounter?.totalJobs ?? 0),
    processed:
      Number(promotionCounter?.completedJobs ?? 0) +
      Number(promotionCounter?.failedJobs ?? 0) +
      Number(promotionCounter?.skippedJobs ?? 0),
    completed: Number(promotionCounter?.completedJobs ?? 0),
    failed: Number(promotionCounter?.failedJobs ?? 0),
    skipped: Number(promotionCounter?.skippedJobs ?? 0),
    running: Number(promotionCounter?.runningJobs ?? 0),
    paused: Number(promotionCounter?.pausedJobs ?? 0),
    silverContactsInitial: silverInitial,
    silverContactsPromotedDuringSession: promotedDuringSession,
    silverContactsCurrent: liveSilverCount,
    externalDelta,
  };

  const workers = IMPORT_RUNTIME_WORKERS.filter((workerDef) =>
    options?.worker ? workerDef.workerName === options.worker : true,
  ).map((workerDef) => {
    const counter = workerCountersByName.get(workerDef.workerName);
    const workerJobs = jobsByWorker.get(workerDef.workerName) ?? [];
    return {
      workerName: workerDef.workerName,
      label: workerDef.label,
      stage: workerDef.stage,
      queueName: workerDef.queueName,
      description: workerDef.description,
      control: {
        globalPaused: globalControl.globalPaused,
        batchPaused: batchControl.batchPaused,
        workerPaused: Boolean(batchControl.workerPauses[workerDef.workerName]),
      },
      counts: {
        waiting: Number(counter?.queuedJobs ?? 0),
        active: Number(counter?.runningJobs ?? 0),
        delayed: 0,
        prioritized: 0,
        failedLive: Number(counter?.failedJobs ?? 0),
        observedCompleted: Number(counter?.completedJobs ?? 0),
        observedWarnings: Number(counter?.warningJobs ?? 0),
        observedErrors: Number(counter?.failedJobs ?? 0) + Number(counter?.skippedJobs ?? 0),
        observedLogs: 0,
        observedJobs: Number(counter?.totalJobs ?? workerJobs.length),
        pausedJobs: Number(counter?.pausedJobs ?? 0),
        skippedJobs: Number(counter?.skippedJobs ?? 0),
        totalUnits: Number(counter?.totalUnits ?? 0),
        processedUnits: Number(counter?.processedUnits ?? 0),
        successUnits: Number(counter?.successUnits ?? 0),
        failedUnits: Number(counter?.failedUnits ?? 0),
        insertedUnits: Number(counter?.insertedUnits ?? 0),
        updatedUnits: Number(counter?.updatedUnits ?? 0),
      },
      jobs: workerJobs,
    };
  });

  return {
    batchId,
    batchStatus,
    legacyTelemetry: false,
    session: {
      id: session.id,
      kind: session.kind,
      status: normalizeRuntimeHeartbeatState(session.status, session.lastHeartbeatAt),
      label: session.label ?? null,
      startedAt: session.startedAt?.toISOString?.() ?? null,
      completedAt: session.completedAt?.toISOString?.() ?? null,
      failedAt: session.failedAt?.toISOString?.() ?? null,
      pausedAt: session.pausedAt?.toISOString?.() ?? null,
      lastHeartbeatAt: session.lastHeartbeatAt?.toISOString?.() ?? null,
      updatedAt: session.updatedAt?.toISOString?.() ?? null,
    },
    control: {
      global: globalControl,
      batch: batchControl,
    },
    anafProgress,
    promotionMetrics,
    workers,
    totals: {
      logsLoaded: 0,
      workersDefined: IMPORT_RUNTIME_WORKERS.length,
      liveWaiting: workers.reduce((sum, worker) => sum + worker.counts.waiting, 0),
      liveActive: workers.reduce((sum, worker) => sum + worker.counts.active, 0),
      liveDelayed: 0,
      liveFailed: workers.reduce((sum, worker) => sum + worker.counts.failedLive, 0),
      observedJobs: workers.reduce((sum, worker) => sum + worker.counts.observedJobs, 0),
    },
  };
}

async function buildImportRuntimeTopology(
  tenantId: string,
  batchId: string,
  batchStatus: string,
  options?: {
    sessionId?: string | null;
    worker?: string | null;
    state?: string | null;
    search?: string | null;
    limit?: number;
  },
) {
  let runtimeBacked = null;
  try {
    runtimeBacked = await buildImportRuntimeTopologyFromRuntime(
      tenantId,
      batchId,
      batchStatus,
      options,
    );
  } catch (err) {
    if (!isSchemaCompatibilityError(err)) {
      throw err;
    }
  }
  if (runtimeBacked) {
    return runtimeBacked;
  }

  const observedLogs = await loadImportRuntimeObservedLogs(tenantId, batchId);
  const workerSnapshots: ImportRuntimeWorkerSnapshot[] = [];

  for (const workerDef of IMPORT_RUNTIME_WORKERS) {
    const snapshot = await buildRuntimeWorkerSnapshot({
      workerDef,
      batchId,
      bronzeLogsByWorker: observedLogs.bronzeLogsByWorker,
      silverLogsByWorker: observedLogs.silverLogsByWorker,
    });
    workerSnapshots.push(snapshot);
  }

  return {
    batchId,
    batchStatus,
    legacyTelemetry: true,
    workers: workerSnapshots,
    totals: {
      logsLoaded: observedLogs.recentLogs.length + observedLogs.recentSilverLogs.length,
      workersDefined: IMPORT_RUNTIME_WORKERS.length,
      liveWaiting: workerSnapshots.reduce((sum, worker) => sum + worker.counts.waiting, 0),
      liveActive: workerSnapshots.reduce((sum, worker) => sum + worker.counts.active, 0),
      liveDelayed: workerSnapshots.reduce((sum, worker) => sum + worker.counts.delayed, 0),
      liveFailed: workerSnapshots.reduce((sum, worker) => sum + worker.counts.failedLive, 0),
      observedJobs: workerSnapshots.reduce((sum, worker) => sum + worker.counts.observedJobs, 0),
    },
  };
}

type BatchReprocessProgress = {
  phase: string | null;
  processed: number;
  total: number;
  counterDrift: boolean;
  resolved: number;
  duplicateSource: number;
  identityConflict: number;
  insufficientIdentifiers: number;
  failedContacts: number;
  promotionQueued: number;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  sessionStartedAt: string | null;
  mode: string | null;
};

function extractBatchReprocessProgress(
  metadata: BatchMetadata,
  totalRowsFallback: number,
): BatchReprocessProgress {
  const processed = Number(metadata.identityReprocessProcessedRows ?? 0);
  const total = Number(metadata.identityReprocessRunTotalRows ?? totalRowsFallback);

  return {
    phase:
      typeof metadata.identityReprocessPhase === "string" ? metadata.identityReprocessPhase : null,
    processed,
    total,
    counterDrift: total > 0 && processed > total,
    resolved: Number(metadata.identityReprocessResolvedRows ?? 0),
    duplicateSource: Number(metadata.identityReprocessDuplicateSourceRows ?? 0),
    identityConflict: Number(metadata.identityReprocessIdentityConflictRows ?? 0),
    insufficientIdentifiers: Number(metadata.identityReprocessInsufficientIdentifierRows ?? 0),
    promotionQueued: Number(metadata.identityReprocessPromotionQueued ?? 0),
    failedContacts: Number(metadata.identityReprocessFailedContactCount ?? 0),
    startedAt:
      typeof metadata.identityReprocessStartedAt === "string"
        ? metadata.identityReprocessStartedAt
        : null,
    completedAt:
      typeof metadata.identityReprocessCompletedAt === "string"
        ? metadata.identityReprocessCompletedAt
        : null,
    failedAt:
      typeof metadata.identityReprocessFailedAt === "string"
        ? metadata.identityReprocessFailedAt
        : null,
    sessionStartedAt:
      typeof metadata.identityReprocessSessionStartedAt === "string"
        ? metadata.identityReprocessSessionStartedAt
        : null,
    mode:
      typeof metadata.identityReprocessMode === "string" ? metadata.identityReprocessMode : null,
  };
}

// ── Promote Job Heartbeat thresholds ────────────────────────────────────────
const PROMOTE_STALE_THRESHOLD_MS = 5 * 60 * 1000;
const PROMOTE_BACKLOG_THRESHOLD_MS = 60 * 1000;
const PROMOTE_BACKLOG_WAIT_COUNT_THRESHOLD = 1000;

async function lookupReprocessJobStatus(
  queue: ReturnType<typeof createQueue>,
  batchId: string,
  reprocessStatus: string,
  heartbeatAtMs: number,
  lastProgressAtRaw: string | null,
  allCounts: Record<string, number>,
  extraProgress: BatchReprocessProgress,
): Promise<Record<string, unknown>> {
  const reprocessJobId = `reprocess-batch__${batchId}`;
  const job = await queue.getJob(reprocessJobId);

  if (job) {
    const state = await job.getState();
    const now = Date.now();
    const waitingDurationMs = typeof job.timestamp === "number" ? now - job.timestamp : 0;
    const waitingJobs = Number(allCounts.wait ?? 0) + Number(allCounts.prioritized ?? 0);
    const isStale =
      state === "active" &&
      Number.isFinite(heartbeatAtMs) &&
      now - heartbeatAtMs > PROMOTE_STALE_THRESHOLD_MS;
    const isBacklogged =
      state === "waiting" &&
      waitingDurationMs > PROMOTE_BACKLOG_THRESHOLD_MS &&
      waitingJobs > PROMOTE_BACKLOG_WAIT_COUNT_THRESHOLD;

    return {
      ...buildBullJobResponseData(
        job,
        state,
        isStale,
        isBacklogged,
        waitingJobs,
        lastProgressAtRaw,
        reprocessStatus,
      ),
      ...extraProgress,
    };
  }

  const derivedState = derivePromoteStateFromDb(
    reprocessStatus,
    heartbeatAtMs,
    PROMOTE_STALE_THRESHOLD_MS,
  );
  return {
    state: derivedState,
    isStale: derivedState === "stale",
    isBacklogged: false,
    jobId: null,
    attemptsMade: 0,
    maxAttempts: 10,
    failedReason: null,
    stacktrace: null,
    processedOn: null,
    finishedOn: null,
    lastProgressAt: lastProgressAtRaw,
    dbStatus: reprocessStatus,
    ...extraProgress,
  };
}

export async function importsBronzeRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };
  const operatorAuthOpts = {
    onRequest: [async (req: FastifyRequest) => req.jwtVerify(), requireRole("operator")],
  };
  const importMutationRateLimit = app.rateLimit({
    max: 10,
    timeWindow: "1 minute",
  });

  app.get(
    "/imports",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "List import batches",
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(100).optional(),
          offset: z.coerce.number().int().min(0).optional(),
          status: importStatusSchema.optional(),
          sourceType: sourceTypeSchema.optional(),
          dateFrom: z.coerce.date().optional(),
          dateTo: z.coerce.date().optional(),
          sortBy: z.enum(["createdAt", "updatedAt"]).optional(),
          sortDir: z.enum(["asc", "desc"]).optional(),
        }),
        response: {
          200: successListResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const querySchema = z.object({
        limit: z.coerce.number().int().min(1).max(100).optional(),
        offset: z.coerce.number().int().min(0).optional(),
        status: importStatusSchema.optional(),
        sourceType: sourceTypeSchema.optional(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
        sortBy: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
        sortDir: z.enum(["asc", "desc"]).default("desc"),
      });
      const parsed = querySchema.safeParse(request.query);
      if (!parsed.success)
        return reply
          .code(400)
          .send({ success: false, error: "Query invalida", details: parsed.error.issues });
      const q = parsed.data;
      const limit = parseLimit(q.limit, 25);
      const offset = parseOffset(q.offset, 0);
      const orderSql = resolveBatchOrderSql(q.sortBy, q.sortDir);

      const [rows, total] = await listImportBatchesWithCompatibility({
        request,
        tenantId,
        limit,
        offset,
        status: q.status,
        sourceType: q.sourceType,
        dateFrom: q.dateFrom,
        dateTo: q.dateTo,
        orderSql,
      });

      const enrichedRows = await Promise.all(
        rows.map((row) => enrichImportBatchCompat(tenantId, row, request)),
      );
      return { success: true, data: enrichedRows, meta: { total, limit, offset } };
    },
  );

  app.get(
    "/imports/control",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "Get global import control state",
        response: {
          200: successObjectResponseSchema,
        },
      },
    },
    async (request) => {
      const tenantId = requireTenantId(request);

      return {
        success: true,
        data: await loadTenantImportControlStateCompat(tenantId, request),
      };
    },
  );

  app.post(
    "/imports/control/pause",
    {
      ...operatorAuthOpts,
      preHandler: [importMutationRateLimit],
      schema: {
        response: {
          200: successObjectResponseSchema,
        },
      },
    },
    async (request) => {
      const tenantId = requireTenantId(request);
      await setTenantImportGlobalPause({
        tenantId,
        paused: true,
        actorId: getActorId(request),
      });

      const [tenantRow] = await db
        .select({ settings: tenants.settings })
        .from(tenants)
        .where(sql`${tenants.id} = ${tenantId}`)
        .limit(1);

      return {
        success: true,
        data: readTenantImportControlState(tenantRow?.settings),
      };
    },
  );

  app.post(
    "/imports/control/resume",
    {
      ...operatorAuthOpts,
      preHandler: [importMutationRateLimit],
      schema: {
        body: z.object({
          mode: z.enum(["resume", "recover"]).optional(),
        }),
        response: {
          200: successObjectResponseSchema,
        },
      },
    },
    async (request) => {
      const tenantId = requireTenantId(request);
      const actorId = getActorId(request);
      const parsedBody = z
        .object({ mode: z.enum(["resume", "recover"]).optional() })
        .safeParse(request.body ?? {});
      const mode = parsedBody.success ? parsedBody.data.mode : undefined;

      await setTenantImportGlobalPause({
        tenantId,
        paused: false,
        actorId,
      });

      const pausedRows = await db.execute<{ batchId: string }>(
        sql`SELECT DISTINCT batch_id AS "batchId"
            FROM bronze.import_runtime_jobs
            WHERE tenant_id = ${tenantId}
              AND state IN ('paused', 'stale', 'failed')`,
      );

      let resumed = 0;
      let skipped = 0;
      for (const row of pausedRows) {
        const result = await resumeImportRuntimeJobs({
          tenantId,
          batchId: row.batchId,
          mode,
        });
        resumed += result.requeued;
        skipped += result.skipped;
      }

      const [tenantRow] = await db
        .select({ settings: tenants.settings })
        .from(tenants)
        .where(sql`${tenants.id} = ${tenantId}`)
        .limit(1);

      return {
        success: true,
        data: {
          ...readTenantImportControlState(tenantRow?.settings),
          resumed,
          skipped,
        },
      };
    },
  );

  app.get(
    "/imports/template",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "Download CSV or Excel import template",
        querystring: z.object({
          format: z.enum(["csv", "xlsx"]).default("csv"),
        }),
        response: { 200: { type: "string" } },
      },
    },
    async (request, reply) => {
      const { format } = (request.query as { format?: string }) ?? {};

      if (format === "xlsx") {
        const buf = await buildTemplateXlsx();
        return reply
          .header(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          )
          .header("Content-Disposition", 'attachment; filename="template_import_cerniq.xlsx"')
          .send(buf);
      }

      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", 'attachment; filename="template_import_cerniq.csv"')
        .send(buildTemplateCsv());
    },
  );

  app.get(
    "/imports/template/columns",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "Get import template column definitions",
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(
              z.object({
                header: z.string(),
                required: z.boolean(),
                description: z.string(),
                example: z.string(),
                autoMapped: z.boolean(),
              }),
            ),
          }),
        },
      },
    },
    async () => {
      return { success: true, data: TEMPLATE_COLUMNS };
    },
  );

  app.get(
    "/imports/mapping-targets",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "Get available DB columns for manual mapping",
      },
    },
    async () => {
      return { success: true, data: DB_MAPPING_TARGETS };
    },
  );

  app.put(
    "/imports/:id/mapping",
    {
      ...operatorAuthOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "Save mapping configuration for Bronze->Silver promotion",
        params: idParamsSchema,
        body: mappingBodySchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsedParams = idParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });
      }
      const parsedBody = mappingBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.code(400).send({
          success: false,
          error: "Body invalid",
          details: parsedBody.error.issues,
        });
      }

      const existing = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsedParams.data.id)),
      });
      if (!existing) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }

      const meta = (existing.metadata as Record<string, unknown> | null) ?? {};
      const uploadConfig = (meta.uploadConfig as Record<string, unknown> | undefined) ?? {};
      const updatedMeta = {
        ...meta,
        columnMapping: parsedBody.data.mapping,
        uploadConfig: {
          ...uploadConfig,
          mapping: parsedBody.data.mapping,
        },
      };

      const [updated] = await db
        .update(bronzeImportBatches)
        .set({ metadata: updatedMeta, updatedAt: new Date() })
        .where(sql`${bronzeImportBatches.id} = ${parsedParams.data.id}`)
        .returning();

      return {
        success: true,
        data: {
          id: updated.id,
          mappingSaved: true,
        },
      };
    },
  );

  app.post(
    "/imports/:id/re-promote",
    {
      ...operatorAuthOpts,
      preHandler: [importMutationRateLimit],
      schema: {
        params: idParamsSchema,
        body: z
          .object({
            mapping: z.record(z.string(), z.string()).optional(),
          })
          .optional(),
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsedParams = idParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });
      }

      const existing = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsedParams.data.id)),
      });
      if (!existing) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }

      await setSessionTenantId(tenantId);
      const [{ count: contactCount }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bronzeContacts)
        .where(
          sql`${bronzeContacts.tenantId} = ${tenantId}
            AND ${batchIdMetadataEquals(bronzeContacts.metadata, parsedParams.data.id)}`,
        );

      if (Number(contactCount) === 0) {
        return { success: true, data: { id: parsedParams.data.id, requeued: 0 } };
      }

      const queue = createQueue("pipeline:promote:bronze-silver");
      const reprocessJobId = `reprocess-batch__${parsedParams.data.id}`;
      const existingJob = await queue.getJob(reprocessJobId);
      const existingState = existingJob ? await existingJob.getState() : null;
      const canReuseTerminalJob =
        existingJob && ["completed", "failed"].includes(existingState ?? "");

      if (canReuseTerminalJob) {
        await existingJob.remove();
      }

      if (!existingJob || canReuseTerminalJob) {
        await enqueueImportJob({
          queueName: QUEUES.PIPELINE_PROMOTE_BRONZE_SILVER,
          jobName: "reprocess-batch",
          payload: {
            tenantId,
            batchId: parsedParams.data.id,
            correlationId: `re-promote-${parsedParams.data.id}-${Date.now()}`,
            ...buildApiJobPayloadContext(request),
          },
          opts: {
            jobId: reprocessJobId,
            attempts: 10,
            backoff: {
              type: "exponential",
              delay: 5000,
            },
            removeOnComplete: 20,
            removeOnFail: 50,
          },
          workerName: "promotion:bronze-silver",
          stageKey: "promotion",
          entityType: "batch",
          entityId: parsedParams.data.id,
          idempotencyScope: reprocessJobId,
          sessionKind: "reprocess",
        });
      }
      await queue.close();

      const nextMetadata = withIdentityReprocessQueuedMetadata(
        (existing.metadata as BatchMetadata | null) ?? {},
        { preserveCheckpoint: false, runTotalRows: Number(contactCount) },
      );
      await db
        .update(bronzeImportBatches)
        .set({
          metadata: nextMetadata,
          updatedAt: new Date(),
        })
        .where(sql`${bronzeImportBatches.id} = ${parsedParams.data.id}`);

      return {
        success: true,
        data: {
          id: parsedParams.data.id,
          requeued: Number(contactCount),
          alreadyQueued: Boolean(
            existingJob && !["completed", "failed"].includes(existingState ?? ""),
          ),
        },
      };
    },
  );

  // ── Promote Job Heartbeat ─────────────────────────────────────────────

  app.get(
    "/imports/:id/promote-job-status",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "Live BullMQ state of the re-promote batch job",
        params: idParamsSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsedParams = idParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });
      }

      const batchId = parsedParams.data.id;
      const existing = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, batchId)),
      });
      if (!existing) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }
      const batchMetadata = ((existing.metadata as Record<string, unknown> | null) ??
        {}) as BatchMetadata;
      if (isImportBatchHidden(batchMetadata)) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }

      const metadata = batchMetadata;
      const reprocessStatus =
        typeof metadata.identityReprocessStatus === "string"
          ? metadata.identityReprocessStatus
          : "";
      const { lastProgressAtRaw, heartbeatAtMs } = extractReprocessHeartbeat(metadata);

      if (!reprocessStatus) {
        return { success: true, data: { state: "none" } };
      }

      const queue = createQueue("pipeline:promote:bronze-silver");
      try {
        const reprocessJobId = `reprocess-batch__${batchId}`;
        const job = await queue.getJob(reprocessJobId);

        if (!job) {
          // Job was pruned from Redis — derive state from DB metadata
          const derivedState = derivePromoteStateFromDb(
            reprocessStatus,
            heartbeatAtMs,
            PROMOTE_STALE_THRESHOLD_MS,
          );
          return {
            success: true,
            data: {
              state: derivedState,
              isStale: derivedState === "stale",
              isBacklogged: false,
              jobId: null,
              attemptsMade: 0,
              maxAttempts: 3,
              failedReason: null,
              stacktrace: null,
              progress: null,
              timestamp: null,
              processedOn: null,
              finishedOn: null,
              lastProgressAt: lastProgressAtRaw,
              waitingJobs: 0,
              dbStatus: reprocessStatus,
            },
          };
        }

        const state = await job.getState();
        const now = Date.now();
        const waitingDurationMs = typeof job.timestamp === "number" ? now - job.timestamp : 0;
        const queueCounts = await queue.getJobCounts("wait", "prioritized");
        const waitingJobs =
          Number(queueCounts.wait ?? 0) +
          Number((queueCounts as Record<string, number>).prioritized ?? 0);

        // Stale: job is active but DB progress heartbeat has not advanced recently.
        const isStale =
          state === "active" &&
          Number.isFinite(heartbeatAtMs) &&
          now - heartbeatAtMs > PROMOTE_STALE_THRESHOLD_MS;
        const isBacklogged =
          state === "waiting" &&
          waitingDurationMs > PROMOTE_BACKLOG_THRESHOLD_MS &&
          waitingJobs > PROMOTE_BACKLOG_WAIT_COUNT_THRESHOLD;

        return {
          success: true,
          data: buildBullJobResponseData(
            job,
            state,
            isStale,
            isBacklogged,
            waitingJobs,
            lastProgressAtRaw,
            reprocessStatus,
          ),
        };
      } finally {
        await queue.close();
      }
    },
  );

  app.get(
    "/imports/:id/pipeline-status",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "Full real-time pipeline status for a batch (identity resolution + promotions)",
        params: idParamsSchema,
        querystring: z.object({
          session: z.uuid().optional(),
        }),
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsedParams = idParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });
      }

      const batchId = parsedParams.data.id;
      const parsedQuery = z
        .object({
          session: z.uuid().optional(),
        })
        .safeParse(request.query ?? {});
      if (!parsedQuery.success) {
        return reply.code(400).send({ success: false, error: "Query invalid" });
      }

      const existing = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, batchId)),
      });
      if (!existing) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }

      const metadata = (existing.metadata as BatchMetadata | null) ?? {};
      const selectedSessionId = parsedQuery.data.session ?? null;
      const reprocessStatus =
        typeof metadata.identityReprocessStatus === "string"
          ? metadata.identityReprocessStatus
          : "";
      const { lastProgressAtRaw, heartbeatAtMs } = extractReprocessHeartbeat(metadata);
      const extraProgress = extractBatchReprocessProgress(
        metadata,
        Number(existing.totalRows ?? 0),
      );

      const queue = createQueue("pipeline:promote:bronze-silver");
      try {
        const runtimeTopology = await buildImportRuntimeTopology(
          tenantId,
          batchId,
          existing.status,
          { sessionId: selectedSessionId },
        );
        const [attempts, historicalSummary, latestQuarantineSummary, selectedQuarantineSummary] =
          await Promise.all([
            loadImportRuntimeAttemptsCompat(
              tenantId,
              batchId,
              Number(existing.totalRows ?? 0),
              request,
            ),
            loadImportIdentitySummaryCompat(tenantId, batchId, request),
            loadImportQuarantineSummaryCompat(tenantId, batchId, null, request),
            loadImportQuarantineSummaryCompat(
              tenantId,
              batchId,
              "session" in runtimeTopology ? (runtimeTopology.session?.id ?? null) : null,
              request,
            ),
          ]);
        const latestAttemptSummary =
          attempts[0] ??
          buildBatchAttemptFallback(
            existing,
            await loadImportRuntimeSessionForBatchCompat(tenantId, batchId, null, request),
          );
        const selectedAttemptSummary =
          attempts.find(
            (attempt) =>
              attempt.id ===
              (("session" in runtimeTopology ? runtimeTopology.session?.id : null) ??
                selectedSessionId),
          ) ?? latestAttemptSummary;
        const allCounts = await queue.getJobCounts(
          "wait",
          "active",
          "completed",
          "failed",
          "delayed",
          "prioritized",
        );
        const countsMap = allCounts as Record<string, number>;

        const reprocessJobData = reprocessStatus
          ? await lookupReprocessJobStatus(
              queue,
              batchId,
              reprocessStatus,
              heartbeatAtMs,
              lastProgressAtRaw,
              countsMap,
              extraProgress,
            )
          : null;

        return {
          success: true,
          data: {
            batchId,
            batchStatus: existing.status,
            totalRows: Number(existing.totalRows ?? 0),
            successRows: Number(existing.successRows ?? 0),
            selectedRuntimeSession:
              "session" in runtimeTopology ? (runtimeTopology.session ?? null) : null,
            attempts,
            selectedAttemptSummary,
            latestAttemptSummary,
            historicalSummary,
            quarantineSummary: latestQuarantineSummary,
            selectedQuarantineSummary,
            reprocessJob: reprocessJobData,
            promotionQueue: {
              waiting: Number(countsMap.wait ?? 0),
              active: Number(countsMap.active ?? 0),
              completed: Number(countsMap.completed ?? 0),
              failed: Number(countsMap.failed ?? 0),
              delayed: Number(countsMap.delayed ?? 0),
            },
            globalControl:
              asRecord((runtimeTopology as Record<string, unknown>).control)?.global ?? null,
            batchControl:
              asRecord((runtimeTopology as Record<string, unknown>).control)?.batch ?? null,
            workerControls: Array.isArray((runtimeTopology as Record<string, unknown>).workers)
              ? (
                  (runtimeTopology as Record<string, unknown>).workers as Array<
                    Record<string, unknown>
                  >
                ).map((worker) => ({
                  workerName: String(worker.workerName ?? ""),
                  control: asRecord(worker.control) ?? {},
                }))
              : [],
            anafProgress: (runtimeTopology as Record<string, unknown>).anafProgress ?? null,
            promotionMetrics: (runtimeTopology as Record<string, unknown>).promotionMetrics ?? null,
            legacyTelemetry: Boolean((runtimeTopology as Record<string, unknown>).legacyTelemetry),
          },
        };
      } finally {
        await queue.close();
      }
    },
  );

  app.get(
    "/imports/:id/runtime-topology",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "Live runtime topology for import workers and jobs",
        params: idParamsSchema,
        querystring: z.object({
          session: z.uuid().optional(),
          worker: z.string().min(1).optional(),
          state: z.string().min(1).optional(),
          search: z.string().min(1).optional(),
          limit: z.coerce.number().int().min(10).max(500).optional(),
        }),
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsedParams = idParamsSchema.safeParse(request.params);
      const parsedQuery = z
        .object({
          session: z.uuid().optional(),
          worker: z.string().min(1).optional(),
          state: z.string().min(1).optional(),
          search: z.string().min(1).optional(),
          limit: z.coerce.number().int().min(10).max(500).optional(),
        })
        .safeParse(request.query);
      if (!parsedParams.success) {
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });
      }
      if (!parsedQuery.success) {
        return reply
          .code(400)
          .send({ success: false, error: "Query invalidă", details: parsedQuery.error.issues });
      }

      const batchId = parsedParams.data.id;
      const batch = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, batchId)),
        columns: { id: true, status: true },
      });
      if (!batch) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }
      return {
        success: true,
        data: await buildImportRuntimeTopology(tenantId, batchId, batch.status, {
          sessionId: parsedQuery.data.session ?? null,
          worker: parsedQuery.data.worker ?? null,
          state: parsedQuery.data.state ?? null,
          search: parsedQuery.data.search ?? null,
          limit: parsedQuery.data.limit,
        }),
      };
    },
  );

  app.post(
    "/imports/:id/resume-promote",
    {
      ...operatorAuthOpts,
      preHandler: [importMutationRateLimit],
      schema: {
        params: idParamsSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsedParams = idParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });
      }

      const batchId = parsedParams.data.id;
      const existing = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, batchId)),
      });
      if (!existing) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }

      await setSessionTenantId(tenantId);
      const [{ count: contactCount }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bronzeContacts)
        .where(
          sql`${bronzeContacts.tenantId} = ${tenantId}
            AND ${batchIdMetadataEquals(bronzeContacts.metadata, batchId)}`,
        );

      if (Number(contactCount) === 0) {
        return { success: true, data: { id: batchId, requeued: 0 } };
      }

      const queue = createQueue("pipeline:promote:bronze-silver");
      try {
        const reprocessJobId = `reprocess-batch__${batchId}`;
        const existingJob = await queue.getJob(reprocessJobId);

        if (existingJob) {
          const state = await existingJob.getState();
          if (state === "active") {
            throw new Error("Job activ in curs");
          }
          await existingJob.remove();
        }

        await enqueueImportJob({
          queueName: QUEUES.PIPELINE_PROMOTE_BRONZE_SILVER,
          jobName: "reprocess-batch",
          payload: {
            tenantId,
            batchId,
            correlationId: `resume-promote-${batchId}-${Date.now()}`,
            ...buildApiJobPayloadContext(request),
          },
          opts: {
            jobId: reprocessJobId,
            attempts: 10,
            priority: 1,
            backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: 20,
            removeOnFail: 50,
          },
          workerName: "promotion:bronze-silver",
          stageKey: "promotion",
          entityType: "batch",
          entityId: batchId,
          idempotencyScope: reprocessJobId,
          sessionKind: "recovery",
        });
      } finally {
        await queue.close();
      }

      const nextMetadata = withIdentityReprocessQueuedMetadata(
        (existing.metadata as BatchMetadata | null) ?? {},
        { preserveCheckpoint: true, runTotalRows: Number(contactCount) },
      );
      await db
        .update(bronzeImportBatches)
        .set({ metadata: nextMetadata, updatedAt: new Date() })
        .where(sql`${bronzeImportBatches.id} = ${batchId}`);

      return { success: true, data: { id: batchId, requeued: Number(contactCount) } };
    },
  );

  app.get(
    "/imports/:id/reprocess-errors",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "List contacts that failed during identity reprocess for a batch",
        params: idParamsSchema,
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(500).optional(),
          offset: z.coerce.number().int().min(0).optional(),
        }),
        response: {
          200: successListResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const params = idParamsSchema.safeParse(request.params);
      const query = z
        .object({
          limit: z.coerce.number().int().min(1).max(500).optional(),
          offset: z.coerce.number().int().min(0).optional(),
        })
        .safeParse(request.query);
      if (!params.success) {
        return reply
          .code(400)
          .send({ success: false, error: "Parametri invalizi", details: params.error.issues });
      }
      if (!query.success) {
        return reply
          .code(400)
          .send({ success: false, error: "Parametri invalizi", details: query.error.issues });
      }

      const batch = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, params.data.id)),
      });
      if (!batch) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }

      const limit = parseLimit(query.data.limit, 100);
      const offset = parseOffset(query.data.offset, 0);
      const whereSql = sql`${bronzeContacts.tenantId} = ${tenantId}
        AND ${batchIdMetadataEquals(bronzeContacts.metadata, params.data.id)}
        AND ${failedReprocessContactEquals(bronzeContacts.metadata)}`;

      const [rows, total] = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
        const resultRows = await tx.query.bronzeContacts.findMany({
          where: whereSql,
          orderBy: (t) => [sql`${t.updatedAt} DESC`, t.id],
          limit,
          offset,
        });
        const [countRow] = await tx
          .select({ total: sql<number>`COUNT(*)` })
          .from(bronzeContacts)
          .where(whereSql);
        return [resultRows, Number(countRow?.total ?? 0)] as const;
      });

      return {
        success: true,
        data: rows.map((row) => {
          const metadata = (row.metadata as Record<string, unknown> | undefined) ?? {};
          const error =
            metadata.identityReprocessError && typeof metadata.identityReprocessError === "object"
              ? (metadata.identityReprocessError as Record<string, unknown>)
              : {};

          return {
            ...row,
            rowNumber: metadata.rowNumber ?? null,
            reprocessError: error,
          };
        }),
        meta: { total, limit, offset },
      };
    },
  );

  app.post(
    "/imports/:id/reprocess-errors/resume",
    {
      ...operatorAuthOpts,
      preHandler: [importMutationRateLimit],
      schema: {
        params: idParamsSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsedParams = idParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });
      }

      const batchId = parsedParams.data.id;
      const existing = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, batchId)),
      });
      if (!existing) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }

      await setSessionTenantId(tenantId);
      const [{ count: failedCount }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bronzeContacts)
        .where(
          sql`${bronzeContacts.tenantId} = ${tenantId}
            AND ${batchIdMetadataEquals(bronzeContacts.metadata, batchId)}
            AND ${failedReprocessContactEquals(bronzeContacts.metadata)}`,
        );
      const failedContactCount = Number(failedCount);

      if (failedContactCount === 0) {
        return { success: true, data: { id: batchId, requeued: 0 } };
      }

      const queue = createQueue("pipeline:promote:bronze-silver");
      try {
        const reprocessJobId = `reprocess-errors-batch__${batchId}`;
        const existingJob = await queue.getJob(reprocessJobId);
        if (existingJob) {
          const jobState = await existingJob.getState();
          if (jobState === "active") {
            throw new Error("Job activ in curs");
          }
          await existingJob.remove();
        }

        await enqueueImportJob({
          queueName: QUEUES.PIPELINE_PROMOTE_BRONZE_SILVER,
          jobName: "reprocess-errors-batch",
          payload: {
            tenantId,
            batchId,
            reprocessErrorsOnly: true,
            correlationId: `resume-reprocess-errors-${batchId}-${Date.now()}`,
            ...buildApiJobPayloadContext(request),
          },
          opts: {
            jobId: reprocessJobId,
            attempts: 5,
            priority: 1,
            backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: 20,
            removeOnFail: 50,
          },
          workerName: "promotion:bronze-silver",
          stageKey: "promotion",
          entityType: "batch",
          entityId: batchId,
          idempotencyScope: reprocessJobId,
          sessionKind: "recovery",
        });
      } finally {
        await queue.close();
      }

      const currentMetadata = (existing.metadata as BatchMetadata | null) ?? {};
      const queuedAt = new Date().toISOString();
      const nextMetadata = {
        ...currentMetadata,
        identityReprocessStatus: "queued",
        identityReprocessQueuedAt: queuedAt,
        identityReprocessSessionStartedAt: queuedAt,
        identityReprocessSessionProcessedBaseRows: 0,
        identityReprocessCompletedAt: null,
        identityReprocessFailedAt: null,
        identityReprocessLastError: null,
        identityReprocessLastProgressAt: null,
        identityReprocessPhase: "resolve_identities",
        identityReprocessCursorCreatedAt: null,
        identityReprocessCursorLastBronzeId: null,
        identityReprocessCursorRowIndex: 0,
        identityReprocessPromotionCursorCreatedAt: null,
        identityReprocessPromotionCursorLastBronzeId: null,
        identityReprocessMode: "errors_only",
        identityReprocessProcessedRows: 0,
        identityReprocessResolvedRows: 0,
        identityReprocessDuplicateSourceRows: 0,
        identityReprocessIdentityConflictRows: 0,
        identityReprocessInsufficientIdentifierRows: 0,
        identityReprocessPromotionQueued: 0,
        identityReprocessRunTotalRows: failedContactCount,
      } satisfies BatchMetadata;

      await db
        .update(bronzeImportBatches)
        .set({ metadata: nextMetadata, updatedAt: new Date() })
        .where(sql`${bronzeImportBatches.id} = ${batchId}`);

      return { success: true, data: { id: batchId, requeued: failedContactCount } };
    },
  );

  // ── ANAF Bronze Enrichment (manual trigger for existing imports) ───
  const ANAF_BATCH_SIZE = 100;
  const ANAF_BATCH_DELAY_MS = 1100;

  app.post(
    "/imports/:id/anaf-enrich",
    {
      ...operatorAuthOpts,
      preHandler: [importMutationRateLimit],
      schema: {
        params: idParamsSchema,
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(50000).optional(),
        }),
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsedParams = idParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });
      }
      const batchId = parsedParams.data.id;
      const cuiLimit = (request.query as { limit?: number }).limit;

      const existing = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, batchId)),
      });
      if (!existing) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }

      await setSessionTenantId(tenantId);

      // Common filter for unenriched contacts in this batch
      const batchFilter = sql`tenant_id = ${tenantId}
        AND COALESCE(jsonb_extract_path_text(metadata, 'batchId'), '') = ${batchId}
        AND COALESCE(jsonb_extract_path_text(metadata, 'anafBronzeEnrichmentStatus'), '') NOT IN ('completed', 'pending')`;

      // Count total unique CUIs available
      const cuiCountResult = await db.execute<{ total: string }>(
        sql`SELECT COUNT(DISTINCT extracted_cui) AS total
            FROM bronze.bronze_contacts
            WHERE ${batchFilter} AND extracted_cui IS NOT NULL`,
      );
      const totalAvailableCuis = Number(cuiCountResult[0]?.total ?? 0);

      // Get unique CUIs with optional limit
      const cuiLimitClause = cuiLimit ? sql` LIMIT ${cuiLimit}` : sql``;
      const cuiRows = await db.execute<{ cui: string }>(
        sql`SELECT DISTINCT extracted_cui AS cui
            FROM bronze.bronze_contacts
            WHERE ${batchFilter} AND extracted_cui IS NOT NULL${cuiLimitClause}`,
      );
      const allCuis: string[] = [...cuiRows].map((r) => r.cui);

      // Count NrRegCom-only contacts (skip when using limit to keep test focused)
      let nrRegComCount = 0;
      if (!cuiLimit) {
        const nrResult = await db.execute<{ cnt: string }>(
          sql`SELECT COUNT(*) AS cnt
              FROM bronze.bronze_contacts
              WHERE ${batchFilter}
                AND extracted_cui IS NULL
                AND extracted_nr_reg_com IS NOT NULL`,
        );
        nrRegComCount = Number(nrResult[0]?.cnt ?? 0);
      }

      if (allCuis.length === 0 && nrRegComCount === 0) {
        return {
          success: true,
          data: {
            id: batchId,
            queued: 0,
            message: "Toate contactele au fost deja îmbogățite ANAF",
          },
        };
      }

      // Build a subquery for selected CUIs (avoids passing huge arrays via params)
      const cuiSubquery = sql`(SELECT DISTINCT extracted_cui FROM bronze.bronze_contacts
                               WHERE ${batchFilter} AND extracted_cui IS NOT NULL${cuiLimitClause})`;

      // Mark matching contacts as pending
      if (allCuis.length > 0) {
        await db.execute(
          sql`UPDATE bronze.bronze_contacts
              SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{anafBronzeEnrichmentStatus}', '"pending"'::jsonb),
                  updated_at = NOW()
              WHERE tenant_id = ${tenantId}
                AND COALESCE(jsonb_extract_path_text(metadata, 'batchId'), '') = ${batchId}
                AND extracted_cui IN ${cuiSubquery}`,
        );
      }

      if (nrRegComCount > 0) {
        await db.execute(
          sql`UPDATE bronze.bronze_contacts
              SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{anafBronzeEnrichmentStatus}', '"pending"'::jsonb),
                  updated_at = NOW()
              WHERE tenant_id = ${tenantId}
                AND COALESCE(jsonb_extract_path_text(metadata, 'batchId'), '') = ${batchId}
                AND extracted_cui IS NULL
                AND extracted_nr_reg_com IS NOT NULL
                AND COALESCE(jsonb_extract_path_text(metadata, 'anafBronzeEnrichmentStatus'), '') NOT IN ('completed', 'cross_referenced', 'pending')`,
        );
      }

      // Get contact IDs for the selected CUIs (for b5 worker reference)
      const contactIdRows = await db.execute<{ id: string }>(
        sql`SELECT id FROM bronze.bronze_contacts
            WHERE tenant_id = ${tenantId}
              AND COALESCE(jsonb_extract_path_text(metadata, 'batchId'), '') = ${batchId}
              AND extracted_cui IN ${cuiSubquery}`,
      );
      const allBronzeIds: string[] = [...contactIdRows].map((r) => r.id);

      const totalBatches = Math.ceil(allCuis.length / ANAF_BATCH_SIZE);

      for (let i = 0; i < totalBatches; i++) {
        const cuiChunk = allCuis.slice(i * ANAF_BATCH_SIZE, (i + 1) * ANAF_BATCH_SIZE);
        await enqueueImportJob({
          queueName: QUEUES.ENRICH_BRONZE_ANAF,
          jobName: "anaf-bronze-enrich",
          payload: {
            tenantId,
            batchId,
            cuiList: cuiChunk,
            bronzeContactIds: allBronzeIds,
            correlationId: `manual-anaf-${batchId}-${Date.now()}`,
            batchIndex: i,
            totalBatches,
            ...buildApiJobPayloadContext(request),
          },
          opts: {
            jobId: `anaf-bronze-${batchId}-manual-${i}`,
            delay: i * ANAF_BATCH_DELAY_MS,
            attempts: 5,
            backoff: { type: "exponential", delay: 1000 },
          },
          workerName: "B5:anaf-bronze-enricher",
          stageKey: "anaf_bronze",
          entityType: "batch",
          entityId: batchId,
          idempotencyScope: `manual-anaf-${batchId}-${i}`,
          sessionKind: "anaf",
        });
      }

      // Update batch metadata
      const batchMeta = (existing.metadata as BatchMetadata | null) ?? {};
      await db
        .update(bronzeImportBatches)
        .set({
          metadata: {
            ...batchMeta,
            anafEnrichmentStatus: "processing",
            anafEnrichmentQueuedAt: new Date().toISOString(),
            anafEnrichmentTotalCuis: allCuis.length,
            anafEnrichmentTotalBatches: totalBatches,
          },
          updatedAt: new Date(),
        })
        .where(sql`${bronzeImportBatches.id} = ${batchId}`);

      return {
        success: true,
        data: {
          id: batchId,
          queued: allCuis.length,
          totalAvailable: totalAvailableCuis,
          batches: totalBatches,
          nrRegComPending: nrRegComCount,
        },
      };
    },
  );

  app.get(
    "/imports/:id",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "Get import batch detail",
        params: idParamsSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsed = idParamsSchema.safeParse(request.params);
      if (!parsed.success)
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });

      const row = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsed.data.id)),
      });
      if (!row) return reply.code(404).send({ success: false, error: "Import batch not found" });
      if (
        isImportBatchHidden(
          ((row.metadata as Record<string, unknown> | null) ?? {}) as BatchMetadata,
        )
      ) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }
      return { success: true, data: await enrichImportBatch(tenantId, row) };
    },
  );

  app.post(
    "/imports/:id/pause",
    {
      ...operatorAuthOpts,
      preHandler: [importMutationRateLimit],
      schema: {
        params: idParamsSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const actorId = getActorId(request);
      const parsed = idParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });
      }

      const batch = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsed.data.id)),
      });
      if (
        !batch ||
        isImportBatchHidden(
          ((batch.metadata as Record<string, unknown> | null) ?? {}) as BatchMetadata,
        )
      ) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }

      await setBatchImportPause({
        tenantId,
        batchId: parsed.data.id,
        paused: true,
        actorId,
      });

      const refreshed = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsed.data.id)),
      });

      return {
        success: true,
        data: {
          id: parsed.data.id,
          control: readBatchImportControlState(
            ((refreshed?.metadata as Record<string, unknown> | null) ?? {}) as BatchMetadata,
          ),
        },
      };
    },
  );

  app.post(
    "/imports/:id/resume",
    {
      ...operatorAuthOpts,
      preHandler: [importMutationRateLimit],
      schema: {
        params: idParamsSchema,
        body: z.object({
          mode: z.enum(["resume", "recover"]).optional(),
          sessionId: z.uuid().optional(),
          allSessions: z.coerce.boolean().optional(),
        }),
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const actorId = getActorId(request);
      const parsed = idParamsSchema.safeParse(request.params);
      const parsedBody = z
        .object({
          mode: z.enum(["resume", "recover"]).optional(),
          sessionId: z.uuid().optional(),
          allSessions: z.coerce.boolean().optional(),
        })
        .safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });
      }

      const batch = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsed.data.id)),
      });
      if (
        !batch ||
        isImportBatchHidden(
          ((batch.metadata as Record<string, unknown> | null) ?? {}) as BatchMetadata,
        )
      ) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }

      const targetSessionId = await resolveRequestedRuntimeSessionId(
        tenantId,
        parsed.data.id,
        parsedBody.success ? parsedBody.data.sessionId : null,
        parsedBody.success ? Boolean(parsedBody.data.allSessions) : false,
      );
      await setBatchImportPause({
        tenantId,
        batchId: parsed.data.id,
        paused: false,
        actorId,
      });
      const resumed = await resumeImportRuntimeJobs({
        tenantId,
        batchId: parsed.data.id,
        sessionId: targetSessionId,
        mode: parsedBody.success ? parsedBody.data.mode : undefined,
      });

      const refreshed = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsed.data.id)),
      });

      return {
        success: true,
        data: {
          id: parsed.data.id,
          sessionId: targetSessionId,
          resumed,
          control: readBatchImportControlState(
            ((refreshed?.metadata as Record<string, unknown> | null) ?? {}) as BatchMetadata,
          ),
        },
      };
    },
  );

  app.post(
    "/imports/:id/workers/:workerName/pause",
    {
      ...operatorAuthOpts,
      preHandler: [importMutationRateLimit],
      schema: {
        params: z.object({ id: z.uuid(), workerName: z.string().min(1) }),
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const actorId = getActorId(request);
      const parsed = z
        .object({ id: z.uuid(), workerName: z.string().min(1) })
        .safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ success: false, error: "Parametri invalizi" });
      }

      const batch = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsed.data.id)),
      });
      if (
        !batch ||
        isImportBatchHidden(
          ((batch.metadata as Record<string, unknown> | null) ?? {}) as BatchMetadata,
        )
      ) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }

      await setBatchWorkerPause({
        tenantId,
        batchId: parsed.data.id,
        workerName: parsed.data.workerName,
        paused: true,
        actorId,
      });

      return {
        success: true,
        data: {
          id: parsed.data.id,
          workerName: parsed.data.workerName,
          paused: true,
        },
      };
    },
  );

  app.post(
    "/imports/:id/workers/:workerName/resume",
    {
      ...operatorAuthOpts,
      preHandler: [importMutationRateLimit],
      schema: {
        params: z.object({ id: z.uuid(), workerName: z.string().min(1) }),
        body: z.object({
          mode: z.enum(["resume", "recover"]).optional(),
          sessionId: z.uuid().optional(),
          allSessions: z.coerce.boolean().optional(),
        }),
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const actorId = getActorId(request);
      const parsed = z
        .object({ id: z.uuid(), workerName: z.string().min(1) })
        .safeParse(request.params);
      const parsedBody = z
        .object({
          mode: z.enum(["resume", "recover"]).optional(),
          sessionId: z.uuid().optional(),
          allSessions: z.coerce.boolean().optional(),
        })
        .safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ success: false, error: "Parametri invalizi" });
      }

      const batch = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsed.data.id)),
      });
      if (
        !batch ||
        isImportBatchHidden(
          ((batch.metadata as Record<string, unknown> | null) ?? {}) as BatchMetadata,
        )
      ) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }

      const targetSessionId = await resolveRequestedRuntimeSessionId(
        tenantId,
        parsed.data.id,
        parsedBody.success ? parsedBody.data.sessionId : null,
        parsedBody.success ? Boolean(parsedBody.data.allSessions) : false,
      );
      await setBatchWorkerPause({
        tenantId,
        batchId: parsed.data.id,
        workerName: parsed.data.workerName,
        paused: false,
        actorId,
      });
      const resumed = await resumeImportRuntimeJobs({
        tenantId,
        batchId: parsed.data.id,
        sessionId: targetSessionId,
        workerName: parsed.data.workerName,
        mode: parsedBody.success ? parsedBody.data.mode : undefined,
      });

      return {
        success: true,
        data: {
          id: parsed.data.id,
          workerName: parsed.data.workerName,
          sessionId: targetSessionId,
          resumed,
          paused: false,
        },
      };
    },
  );

  app.delete(
    "/imports/:id",
    {
      ...operatorAuthOpts,
      preHandler: [importMutationRateLimit],
      schema: {
        params: idParamsSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const actorId = getActorId(request);
      const parsed = idParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });
      }

      const batch = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsed.data.id)),
      });
      if (!batch) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }
      const currentMetadata = ((batch.metadata as Record<string, unknown> | null) ??
        {}) as BatchMetadata;
      if (isImportBatchHidden(currentMetadata)) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }

      await markImportBatchDeleteRequested({
        tenantId,
        batchId: parsed.data.id,
        actorId,
      });
      await setBatchImportPause({
        tenantId,
        batchId: parsed.data.id,
        paused: true,
        actorId,
      });

      const activeRuntimeJobs = await db.execute<{ count: string }>(
        sql`SELECT COUNT(*) AS count
            FROM bronze.import_runtime_jobs
            WHERE tenant_id = ${tenantId}
              AND batch_id = ${parsed.data.id}
              AND state IN ('queued', 'running', 'recovering')`,
      );
      const hasActiveRuntimeJobs = Number(activeRuntimeJobs[0]?.count ?? 0) > 0;

      let fileDeleted = false;
      const storedPath =
        typeof currentMetadata.storedPath === "string" ? currentMetadata.storedPath : null;
      if (storedPath && !hasActiveRuntimeJobs) {
        try {
          await unlink(storedPath);
          fileDeleted = true;
        } catch (error) {
          fileDeleted = (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
        }
      }

      const control = readBatchImportControlState(currentMetadata);
      const nextMetadata: BatchMetadata = {
        ...currentMetadata,
        importExecutionControl: {
          ...control,
          batchPaused: true,
          deleteRequested: true,
          deleteRequestedAt: new Date().toISOString(),
          deleteRequestedBy: actorId ?? null,
          hidden: true,
          deletedAt: new Date().toISOString(),
          deletedBy: actorId ?? null,
          fileDeleted,
        },
      };

      const [updated] = await db
        .update(bronzeImportBatches)
        .set({
          status: "cancelled",
          metadata: nextMetadata,
          updatedAt: new Date(),
        })
        .where(sql`${bronzeImportBatches.id} = ${parsed.data.id}`)
        .returning();

      return {
        success: true,
        data: {
          id: parsed.data.id,
          status: updated.status,
          fileDeleted,
          deletePending: hasActiveRuntimeJobs && !fileDeleted,
          control: readBatchImportControlState(
            ((updated.metadata as Record<string, unknown> | null) ?? {}) as BatchMetadata,
          ),
        },
      };
    },
  );

  app.get(
    "/imports/:id/headers",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "Extract column headers from uploaded import file",
        params: idParamsSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsed = idParamsSchema.safeParse(request.params);
      if (!parsed.success)
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });

      const batch = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsed.data.id)),
      });
      if (!batch) return reply.code(404).send({ success: false, error: "Import batch not found" });
      if (
        isImportBatchHidden(
          ((batch.metadata as Record<string, unknown> | null) ?? {}) as BatchMetadata,
        )
      ) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }

      let resolvedFile;
      try {
        resolvedFile = await ensureBatchImportFile(batch);
      } catch (error) {
        return reply.code(400).send({
          success: false,
          error: error instanceof Error ? error.message : "Fișierul a fost șters de pe disc",
        });
      }

      if (resolvedFile.migrated) {
        await db
          .update(bronzeImportBatches)
          .set({ metadata: resolvedFile.metadata, updatedAt: new Date() })
          .where(sql`${bronzeImportBatches.id} = ${batch.id}`);
      }

      const meta = resolvedFile.metadata;
      const fileBuffer = await readFile(resolvedFile.storedPath);
      const uploadConfig = (meta.uploadConfig as Record<string, unknown> | undefined) ?? {};
      const sheetsInfo = await collectImportHeaders({
        fileBuffer,
        filename: batch.filename,
        uploadConfig,
      });
      const autoMapping = buildAutoMapping(sheetsInfo);

      return {
        success: true,
        data: {
          sheets: sheetsInfo,
          autoMapping,
          savedMapping: (uploadConfig.mapping as Record<string, string> | null) ?? null,
        },
      };
    },
  );

  app.get(
    "/imports/:id/rows",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "List raw Bronze rows for an import batch with identity resolution fields",
        params: idParamsSchema,
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(500).optional(),
          offset: z.coerce.number().int().min(0).optional(),
          identityStatus: z
            .enum([
              "unresolved",
              "resolved",
              "duplicate_source",
              "identity_conflict",
              "insufficient_identifiers",
            ])
            .optional(),
        }),
        response: {
          200: successListResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const params = idParamsSchema.safeParse(request.params);
      const query = z
        .object({
          limit: z.coerce.number().int().min(1).max(500).optional(),
          offset: z.coerce.number().int().min(0).optional(),
          identityStatus: z
            .enum([
              "unresolved",
              "resolved",
              "duplicate_source",
              "identity_conflict",
              "insufficient_identifiers",
            ])
            .optional(),
        })
        .safeParse(request.query);
      if (!params.success) {
        return reply.code(400).send({
          success: false,
          error: "Parametri invalizi",
          details: params.error.issues,
        });
      }
      if (!query.success) {
        return reply.code(400).send({
          success: false,
          error: "Parametri invalizi",
          details: query.error.issues,
        });
      }

      const batch = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, params.data.id)),
      });
      if (!batch) return reply.code(404).send({ success: false, error: "Import batch not found" });
      if (
        isImportBatchHidden(
          ((batch.metadata as Record<string, unknown> | null) ?? {}) as BatchMetadata,
        )
      ) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }

      const limit = parseLimit(query.data.limit, 100);
      const offset = parseOffset(query.data.offset, 0);
      const conditions = [
        sql`${bronzeContacts.tenantId} = ${tenantId}`,
        batchIdMetadataEquals(bronzeContacts.metadata, params.data.id),
      ];
      if (query.data.identityStatus) {
        conditions.push(sql`${bronzeContacts.identityStatus} = ${query.data.identityStatus}`);
      }
      const whereSql = sql.join(conditions, sql` AND `);

      const [rows, total] = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
        const resultRows = await tx.query.bronzeContacts.findMany({
          where: whereSql,
          orderBy: (t) => [sql`${t.createdAt} ASC`],
          limit,
          offset,
        });
        const [countRow] = await tx
          .select({ total: sql<number>`COUNT(*)` })
          .from(bronzeContacts)
          .where(whereSql);
        return [resultRows, Number(countRow?.total ?? 0)] as const;
      });

      return {
        success: true,
        data: rows.map((row) => ({
          ...row,
          cuiRaw: row.extractedCuiRaw,
          cuiCanonical: row.extractedCui,
          nrRegComRaw: row.extractedNrRegComRaw,
          nrRegComCanonical: row.extractedNrRegCom,
        })),
        meta: { total, limit, offset },
      };
    },
  );

  app.get(
    "/imports/:id/entities",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "List canonical Silver companies resolved from an import batch",
        params: idParamsSchema,
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(500).optional(),
          offset: z.coerce.number().int().min(0).optional(),
        }),
        response: {
          200: successListResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const params = idParamsSchema.safeParse(request.params);
      const query = z
        .object({
          limit: z.coerce.number().int().min(1).max(500).optional(),
          offset: z.coerce.number().int().min(0).optional(),
        })
        .safeParse(request.query);
      if (!params.success) {
        return reply.code(400).send({
          success: false,
          error: "Parametri invalizi",
          details: params.error.issues,
        });
      }
      if (!query.success) {
        return reply.code(400).send({
          success: false,
          error: "Parametri invalizi",
          details: query.error.issues,
        });
      }

      const batch = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, params.data.id)),
      });
      if (!batch) return reply.code(404).send({ success: false, error: "Import batch not found" });
      if (
        isImportBatchHidden(
          ((batch.metadata as Record<string, unknown> | null) ?? {}) as BatchMetadata,
        )
      ) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }

      const limit = parseLimit(query.data.limit, 100);
      const offset = parseOffset(query.data.offset, 0);
      const groupedRows = await db
        .select({
          companyId: bronzeContacts.resolvedCompanyId,
          sourceRows: sql<number>`COUNT(*)`,
        })
        .from(bronzeContacts)
        .where(
          sql`${bronzeContacts.tenantId} = ${tenantId}
            AND ${batchIdMetadataEquals(bronzeContacts.metadata, params.data.id)}
            AND ${bronzeContacts.resolvedCompanyId} IS NOT NULL`,
        )
        .groupBy(bronzeContacts.resolvedCompanyId)
        .orderBy(sql`COUNT(*) DESC`);

      const total = groupedRows.length;
      const page = groupedRows.slice(offset, offset + limit);
      const entities = await Promise.all(
        page.map(async (item) => {
          const companyId = String(item.companyId);
          const company = await db.query.silverCompanies.findFirst({
            where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, companyId)),
          });
          return company
            ? {
                ...company,
                sourceRows: Number(item.sourceRows ?? 0),
              }
            : null;
        }),
      );

      return {
        success: true,
        data: entities.filter(Boolean),
        meta: { total, limit, offset },
      };
    },
  );

  app.post(
    "/imports",
    {
      ...operatorAuthOpts,
      preHandler: [importMutationRateLimit],
      schema: {
        response: {
          201: successObjectResponseSchema,
          400: errorResponseSchema,
          413: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const actorId = getActorId(request);
      await setSessionTenantId(tenantId);

      const part = await request.file({
        limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
      });
      if (!part) return reply.code(400).send({ success: false, error: "Fisier lipsa" });

      const ext = extname(part.filename).toLowerCase();
      const isCsv = ext === ".csv" || part.mimetype === "text/csv";
      const isExcel =
        ext === ".xlsx" ||
        ext === ".xls" ||
        part.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        part.mimetype === "application/vnd.ms-excel";
      if (!isCsv && !isExcel) {
        return reply
          .code(400)
          .send({ success: false, error: "Format neacceptat. Foloseste CSV sau Excel." });
      }

      const bytes = await part.toBuffer();
      if (bytes.length > MAX_UPLOAD_BYTES) {
        return reply.code(413).send({ success: false, error: "Fisierul depaseste 100MB" });
      }

      const rawMapping = readFieldValue(
        part.fields as Record<string, unknown> | undefined,
        "mapping",
      );
      const rawHasHeader = readFieldValue(
        part.fields as Record<string, unknown> | undefined,
        "hasHeader",
      );
      const rawEncoding = readFieldValue(
        part.fields as Record<string, unknown> | undefined,
        "encoding",
      );
      const rawDelimiter = readFieldValue(
        part.fields as Record<string, unknown> | undefined,
        "delimiter",
      );
      const rawSheetName = readFieldValue(
        part.fields as Record<string, unknown> | undefined,
        "sheetName",
      );
      const rawSourceType = readFieldValue(
        part.fields as Record<string, unknown> | undefined,
        "sourceType",
      );

      const mappingParsed = parseOptionalMapping(rawMapping);

      const hasHeader = rawHasHeader ? rawHasHeader === "true" : true;
      const sourceType = rawSourceType ?? (isExcel ? "excel_import" : "csv_import");
      const parsedConfig = importConfigSchema.safeParse({
        mapping: mappingParsed,
        hasHeader,
        encoding: rawEncoding ?? "utf-8",
        delimiter: rawDelimiter,
        sheetName: rawSheetName,
        sourceType,
      });
      if (!parsedConfig.success) {
        return reply.code(400).send({
          success: false,
          error: "Config upload invalid",
          details: parsedConfig.error.issues,
        });
      }
      const uploadConfig = parsedConfig.data;

      await mkdir(IMPORT_DIR, { recursive: true });
      const storedPath = `${IMPORT_DIR}/${randomUUID()}-${sanitizeImportFilename(part.filename)}`;
      await writeFile(storedPath, bytes);

      const fileHash = createHash("sha256").update(bytes).digest("hex");

      const [batch] = await db
        .insert(bronzeImportBatches)
        .values({
          tenantId,
          filename: part.filename,
          fileSizeBytes: bytes.length,
          status: "pending",
          importedBy: actorId,
          metadata: {
            mimetype: part.mimetype,
            storedPath,
            fileHash,
            uploadConfig: {
              hasHeader: uploadConfig.hasHeader,
              encoding: uploadConfig.encoding,
              delimiter: uploadConfig.delimiter ?? null,
              sheetName: uploadConfig.sheetName ?? null,
              mapping: uploadConfig.mapping ?? null,
              sourceType: uploadConfig.sourceType,
            },
          },
        })
        .returning();

      const queueName = isCsv ? "ingest:csv" : "ingest:excel";
      await enqueueImportJob({
        queueName,
        jobName: "ingest",
        payload: {
          tenantId,
          batchId: batch.id,
          filePath: storedPath,
          fileName: part.filename,
          fileSize: bytes.length,
          hasHeader: uploadConfig.hasHeader,
          encoding: uploadConfig.encoding,
          delimiter: uploadConfig.delimiter,
          sheetName: uploadConfig.sheetName,
          columnMapping: uploadConfig.mapping,
          correlationId: `import-${batch.id}`,
          ...buildApiJobPayloadContext(request),
        },
        workerName: isCsv ? "A1:csv-parser" : "A2:excel-parser",
        stageKey: "ingest",
        entityType: "batch",
        entityId: batch.id,
        idempotencyScope: batch.id,
        sessionKind: "ingest",
      });

      return reply.code(201).send({ success: true, data: batch });
    },
  );

  app.post(
    "/imports/:id/cancel",
    {
      ...operatorAuthOpts,
      preHandler: [importMutationRateLimit],
      schema: {
        params: idParamsSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsed = idParamsSchema.safeParse(request.params);
      if (!parsed.success)
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });

      const existing = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsed.data.id)),
      });
      if (!existing)
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      if (!["pending", "processing"].includes(existing.status)) {
        return reply
          .code(409)
          .send({ success: false, error: "Doar importurile active pot fi anulate" });
      }

      const [updated] = await db
        .update(bronzeImportBatches)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(sql`${bronzeImportBatches.id} = ${parsed.data.id}`)
        .returning();
      return { success: true, data: updated };
    },
  );

  app.post(
    "/imports/:id/retry",
    {
      ...operatorAuthOpts,
      preHandler: [importMutationRateLimit],
      schema: {
        params: idParamsSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsed = idParamsSchema.safeParse(request.params);
      if (!parsed.success)
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });

      const existing = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsed.data.id)),
      });
      if (!existing)
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      if (existing.status === "processing") {
        return reply.code(409).send({ success: false, error: "Importul este deja în procesare" });
      }
      if (existing.status === "completed") {
        return reply
          .code(409)
          .send({ success: false, error: "Importul a fost deja finalizat cu succes" });
      }

      const baseMeta = (existing.metadata as BatchMetadata | null) ?? {};
      const uploadConfig = (baseMeta.uploadConfig ?? {}) as Record<string, unknown>;
      const isExcel =
        typeof uploadConfig.sourceType === "string"
          ? uploadConfig.sourceType === "excel_import"
          : /\.xlsx?$/i.test(existing.filename);

      const body = (request.body ?? {}) as Record<string, unknown>;
      const newMapping =
        body.mapping && typeof body.mapping === "object"
          ? (body.mapping as Record<string, string>)
          : null;

      const effectiveMapping =
        newMapping ?? (uploadConfig.mapping as Record<string, string> | null) ?? null;
      const nextMeta: BatchMetadata = newMapping
        ? {
            ...baseMeta,
            uploadConfig: { ...uploadConfig, mapping: newMapping },
          }
        : baseMeta;

      let resolvedFile;
      try {
        resolvedFile = await ensureBatchImportFile({
          id: existing.id,
          filename: existing.filename,
          metadata: nextMeta,
        });
      } catch (error) {
        return reply.code(400).send({
          success: false,
          error:
            error instanceof Error ? error.message : "Fișierul original nu mai este disponibil",
        });
      }

      if (newMapping || resolvedFile.migrated) {
        await db
          .update(bronzeImportBatches)
          .set({ metadata: resolvedFile.metadata, updatedAt: new Date() })
          .where(sql`${bronzeImportBatches.id} = ${parsed.data.id}`);
      }

      const refreshedMeta: BatchMetadata = {
        ...resolvedFile.metadata,
        retryQueuedAt: new Date().toISOString(),
        lastError: null,
        failedAt: null,
        resumeCursor: null,
      };

      const [updated] = await db
        .update(bronzeImportBatches)
        .set({
          status: "pending",
          processedRows: 0,
          successRows: 0,
          errorRows: 0,
          duplicateRows: 0,
          metadata: refreshedMeta,
          updatedAt: new Date(),
        })
        .where(sql`${bronzeImportBatches.id} = ${parsed.data.id}`)
        .returning();

      const queueName = isExcel ? "ingest:excel" : "ingest:csv";
      await enqueueImportJob({
        queueName,
        jobName: "ingest",
        payload: {
          tenantId,
          batchId: existing.id,
          filePath: resolvedFile.storedPath,
          fileName: existing.filename,
          fileSize: existing.fileSizeBytes,
          hasHeader: uploadConfig.hasHeader ?? true,
          encoding: uploadConfig.encoding ?? "utf-8",
          delimiter: uploadConfig.delimiter ?? null,
          sheetName: uploadConfig.sheetName ?? null,
          columnMapping: effectiveMapping,
          correlationId: `retry-${existing.id}-${Date.now()}`,
          ...buildApiJobPayloadContext(request),
        },
        workerName: isExcel ? "A2:excel-parser" : "A1:csv-parser",
        stageKey: "ingest",
        entityType: "batch",
        entityId: existing.id,
        idempotencyScope: `retry-${existing.id}`,
        sessionKind: "retry",
      });

      return { success: true, data: updated };
    },
  );

  app.get(
    "/bronze/contacts",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-bronze"],
        summary: "List bronze contacts",
        querystring: listBronzeContactsSchema,
        response: {
          200: successListResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsed = listBronzeContactsSchema.safeParse(request.query);
      if (!parsed.success)
        return reply
          .code(400)
          .send({ success: false, error: "Query invalida", details: parsed.error.issues });
      const q = parsed.data;
      const limit = parseLimit(q.limit, 25);
      const offset = parseOffset(q.offset, 0);

      const conditions = [sql`${bronzeContacts.tenantId} = ${tenantId}`];
      if (q.status) conditions.push(sql`${bronzeContacts.processingStatus} = ${q.status}`);
      if (q.sourceType) conditions.push(sql`${bronzeContacts.sourceType} = ${q.sourceType}`);
      if (q.search) {
        conditions.push(buildBronzeSearchCondition(q.search));
      }
      if (q.batchId) {
        conditions.push(batchIdMetadataEquals(bronzeContacts.metadata, q.batchId));
      }
      if (q.dateFrom) conditions.push(sql`${bronzeContacts.createdAt} >= ${q.dateFrom}`);
      if (q.dateTo) conditions.push(sql`${bronzeContacts.createdAt} <= ${q.dateTo}`);

      const sortColumn =
        q.sortBy === "updatedAt" ? bronzeContacts.updatedAt : bronzeContacts.createdAt;
      const sortOrder = q.sortDir === "asc" ? sql`${sortColumn} ASC` : sql`${sortColumn} DESC`;
      const whereSql = sql.join(conditions, sql` AND `);

      const [rows, total] = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
        const resultRows = await tx.query.bronzeContacts.findMany({
          where: whereSql,
          orderBy: () => [sortOrder],
          limit,
          offset,
        });
        const [countRow] = await tx
          .select({ total: sql<number>`COUNT(*)` })
          .from(bronzeContacts)
          .where(whereSql);
        return [resultRows, Number(countRow?.total ?? 0)] as const;
      });

      return { success: true, data: rows, meta: { total, limit, offset } };
    },
  );

  app.get(
    "/bronze/contacts/:id",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-bronze"],
        summary: "Get bronze contact detail",
        params: idParamsSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsed = idParamsSchema.safeParse(request.params);
      if (!parsed.success)
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });
      const row = await db.query.bronzeContacts.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsed.data.id)),
      });
      if (!row) return reply.code(404).send({ success: false, error: "Bronze contact not found" });
      return { success: true, data: row };
    },
  );

  app.post(
    "/bronze/contacts/:id/reprocess",
    {
      ...operatorAuthOpts,
      preHandler: [importMutationRateLimit],
      schema: {
        params: idParamsSchema,
        response: {
          200: reprocessResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsed = idParamsSchema.safeParse(request.params);
      if (!parsed.success)
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });

      const contact = await db.query.bronzeContacts.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsed.data.id)),
      });
      if (!contact)
        return reply.code(404).send({ success: false, error: "Bronze contact not found" });

      await enqueueImportJob({
        queueName: QUEUES.PIPELINE_PROMOTE_BRONZE_SILVER,
        jobName: "reprocess",
        payload: {
          tenantId,
          bronzeContactId: contact.id,
          correlationId: `reprocess-${contact.id}`,
          ...buildApiJobPayloadContext(request),
        },
        workerName: "promotion:bronze-silver",
        stageKey: "promotion",
        entityType: "bronze_contact",
        entityId: contact.id,
        contactId: contact.id,
        idempotencyScope: contact.id,
        sessionKind: "recovery",
      });

      await db
        .update(bronzeContacts)
        .set({ processingStatus: "pending", doNotProcess: false, updatedAt: new Date() })
        .where(sql`${bronzeContacts.id} = ${contact.id}`);

      return { success: true, data: { id: contact.id, requeued: true } };
    },
  );

  app.get(
    "/imports/:id/quarantine",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "List quarantined import rows for a batch",
        params: idParamsSchema,
        querystring: z.object({
          sessionId: z.uuid().optional(),
          reasonCode: z.string().optional(),
          sheet: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(1000).optional(),
          offset: z.coerce.number().int().min(0).optional(),
        }),
        response: {
          200: successListResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsedParams = idParamsSchema.safeParse(request.params);
      const parsedQuery = z
        .object({
          sessionId: z.uuid().optional(),
          reasonCode: z.string().optional(),
          sheet: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(1000).default(100),
          offset: z.coerce.number().int().min(0).default(0),
        })
        .safeParse(request.query ?? {});
      if (!parsedParams.success) {
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });
      }
      if (!parsedQuery.success) {
        return reply.code(400).send({ success: false, error: "Query invalid" });
      }

      const batchId = parsedParams.data.id;
      const batch = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, batchId)),
        columns: { id: true },
      });
      if (!batch) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }

      const { sessionId, reasonCode, sheet, limit, offset } = parsedQuery.data;
      const filters = [
        sql`${importRowQuarantine.tenantId} = ${tenantId}`,
        sql`${importRowQuarantine.batchId} = ${batchId}`,
      ];
      if (sessionId) filters.push(sql`${importRowQuarantine.sessionId} = ${sessionId}`);
      if (reasonCode) filters.push(sql`${importRowQuarantine.reasonCode} = ${reasonCode}`);
      if (sheet) filters.push(sql`${importRowQuarantine.sheetName} = ${sheet}`);
      const where = sql.join(filters, sql` AND `);

      let rows: (typeof importRowQuarantine.$inferSelect)[] = [];
      let total = 0;
      try {
        const [resultRows, [countRow]] = await Promise.all([
          db
            .select()
            .from(importRowQuarantine)
            .where(where)
            .orderBy(sql`${importRowQuarantine.createdAt} DESC`)
            .limit(limit)
            .offset(offset),
          db
            .select({ total: sql<number>`COUNT(*)` })
            .from(importRowQuarantine)
            .where(where),
        ]);
        rows = resultRows;
        total = Number(countRow?.total ?? 0);
      } catch (err) {
        if (!isSchemaCompatibilityError(err)) {
          throw err;
        }
        logSchemaCompatibilityFallback(request, err, "imports quarantine list", { batchId });
      }

      return {
        success: true,
        data: rows.map((row) => ({
          id: row.id,
          batchId: row.batchId,
          sessionId: row.sessionId ?? null,
          runtimeJobKey: row.runtimeJobKey ?? null,
          sourceType: row.sourceType,
          sourceIdentifier: row.sourceIdentifier,
          sheetName: row.sheetName ?? null,
          worksheetRow: row.worksheetRow ?? null,
          globalRow: row.globalRow ?? null,
          fieldName: row.fieldName ?? null,
          reasonCode: row.reasonCode,
          rowPayloadEscaped: row.rowPayloadEscaped,
          sanitizedPayload: row.sanitizedPayload,
          violations: row.violations,
          metadata: row.metadata,
          createdAt: row.createdAt.toISOString(),
        })),
        meta: { total, limit, offset },
      };
    },
  );

  app.get(
    "/imports/:id/job-logs",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "Get per-worker job logs for a specific import batch",
        params: idParamsSchema,
        querystring: importJobLogsQuerySchema,
        response: {
          200: successListResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsedParams = idParamsSchema.safeParse(request.params);
      if (!parsedParams.success)
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });

      const parsedQuery = importJobLogsQuerySchema.safeParse(request.query);
      if (!parsedQuery.success)
        return reply
          .code(400)
          .send({ success: false, error: "Query invalid", details: parsedQuery.error.issues });

      const batchId = parsedParams.data.id;
      const query = parsedQuery.data;

      const batch = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, batchId)),
        columns: { id: true },
      });
      if (!batch) return reply.code(404).send({ success: false, error: "Import batch not found" });
      const targetSessionId = await resolveRequestedRuntimeSessionId(
        tenantId,
        batchId,
        query.sessionId,
      );

      await setSessionTenantId(tenantId);
      const { rows, total } = await listImportJobLogsWithCompatibility(request, {
        ...query,
        tenantId,
        batchId,
        targetSessionId,
      });

      return {
        success: true,
        data: rows.map((row) => buildJobLogResponseRow(row)),
        meta: { total, limit: query.limit, offset: query.offset },
      };
    },
  );
}
