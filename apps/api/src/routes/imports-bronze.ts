import { mkdir, writeFile, readFile, access, copyFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { basename, extname } from "node:path";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { bronzeContacts, bronzeImportBatches, db, setSessionTenantId, sql } from "@cerniq/db";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { z } from "zod";
import { getActorId, parseLimit, parseOffset, requireTenantId } from "./utils.js";
import { importConfigSchema, listBronzeContactsSchema } from "../schemas/etapa1.js";
import { createQueue } from "../lib/queue-factory.js";

const IMPORT_DIR = process.env.IMPORT_UPLOAD_DIR || "/app/data/imports";
const LEGACY_IMPORT_DIR = "/tmp/cerniq-imports";
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

function batchIdMetadataEquals(metadataColumn: unknown, batchId: string) {
  return sql`COALESCE(jsonb_extract_path_text(${metadataColumn}, ${"batchId"}), ${""}) = ${batchId}`;
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

function extractExcelCellText(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return "";
  if (typeof value === "object" && "text" in value) {
    return String((value as { text: string }).text);
  }
  return String(value);
}

function detectImportSourceType(
  uploadConfig: Record<string, unknown>,
  filename: string,
): "csv_import" | "excel_import" {
  const explicitSourceType = String(uploadConfig.sourceType ?? "csv_import");
  if (explicitSourceType === "excel_import") {
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
    // @ts-expect-error - ExcelJS types lag behind current Node Buffer generics; runtime is compatible.
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

const DB_MAPPING_TARGETS = [
  // --- Identificatori ---
  {
    key: "companyName",
    label: "Denumire Firmă",
    aliases: [
      "company",
      "company_name",
      "firma",
      "denumire",
      "nume_firma",
      "denumire firma",
      "denumirefirma",
      "denumire companie",
      "denumirecompanie",
    ],
  },
  {
    key: "cui",
    label: "CUI / CIF",
    aliases: ["cui", "cif", "vat", "vat_number", "cod_fiscal", "codfiscal"],
  },
  {
    key: "nrRegistru",
    label: "Nr. Registru Comerțului",
    aliases: [
      "reg_com",
      "j_number",
      "nr_registru",
      "nr reg com",
      "nrregcom",
      "nr_reg_com",
      "nr_reg_comert",
      "nr. rc.",
      "nrrc",
      "numar_registru",
    ],
  },
  // --- Contact ---
  { key: "email", label: "Email", aliases: ["email", "email_address", "mail"] },
  {
    key: "phone",
    label: "Telefon",
    aliases: ["phone", "telefon", "telefon_mobil", "mobile", "telefon mf", "telefonmf"],
  },
  { key: "website", label: "Website", aliases: ["website", "site", "url"] },
  {
    key: "contactPerson",
    label: "Persoana de contact",
    aliases: ["contact", "persoana", "contact_person", "responsabil"],
  },
  // --- Locație ---
  {
    key: "address",
    label: "Adresă",
    aliases: ["address", "adresa", "street_address", "adresa anaf", "adresaanaf"],
  },
  { key: "judet", label: "Județ", aliases: ["judet", "county", "region"] },
  { key: "localitate", label: "Localitate", aliases: ["localitate", "oras", "city", "town"] },
  { key: "codPostal", label: "Cod Poștal", aliases: ["cod_postal", "zip", "postal_code"] },
  // --- CAEN ---
  {
    key: "caen",
    label: "Cod CAEN",
    aliases: ["caen", "caen_code", "nace", "nace code", "nacecode", "cod_caen", "codcaen"],
  },
  {
    key: "caenText",
    label: "Denumire CAEN",
    aliases: ["nace text", "nacetext", "nace_text", "denumire_caen", "denumirecaen"],
  },
  // --- Financiar (Tab 1 „Baza de date") ---
  {
    key: "cifraAfaceri",
    label: "Cifra de afaceri",
    aliases: ["cifra de afaceri", "cifradeafaceri", "cifra_afaceri", "turnover", "revenue"],
  },
  {
    key: "profitNet",
    label: "Profit / Pierdere Netă",
    aliases: [
      "profit / pierdere neta",
      "profitpierderereta",
      "profit_net",
      "net_profit",
      "profit net",
    ],
  },
  {
    key: "profitBrut",
    label: "Profit / Pierdere Brută",
    aliases: [
      "profit / pierdere bruta",
      "profitpierderebruta",
      "profit_brut",
      "gross_profit",
      "profit brut",
    ],
  },
  {
    key: "venituriTotale",
    label: "Venituri totale",
    aliases: ["venituri totale", "venituritotale", "venituri_totale", "total_revenue"],
  },
  {
    key: "cheltuieliTotale",
    label: "Cheltuieli totale",
    aliases: ["cheltuieli totale", "cheltuielitotale", "cheltuieli_totale", "total_expenses"],
  },
  {
    key: "activeTotale",
    label: "Total Active",
    aliases: ["total active", "totalactive", "active_totale", "total_assets"],
  },
  {
    key: "activeImobilizate",
    label: "Active Imobilizate",
    aliases: ["active imobilizate", "activeimobilizate", "active_imobilizate", "fixed_assets"],
  },
  {
    key: "activeCirculante",
    label: "Active Circulante",
    aliases: ["active circulante", "activecirculante", "active_circulante", "current_assets"],
  },
  { key: "creante", label: "Creanțe", aliases: ["creante", "receivables", "trade_receivables"] },
  { key: "stocuri", label: "Stocuri", aliases: ["stocuri", "inventories", "stocks"] },
  {
    key: "cheltuieliInAvans",
    label: "Cheltuieli în avans",
    aliases: [
      "cheltuieli in avans",
      "cheltuieliinavans",
      "cheltuieli_in_avans",
      "prepaid_expenses",
    ],
  },
  {
    key: "capitaluriProprii",
    label: "Capitaluri proprii Total",
    aliases: [
      "capitaluri proprii total",
      "capitaluriproprittotal",
      "capitaluri_proprii",
      "equity",
      "shareholders_equity",
    ],
  },
  {
    key: "capitalSocial",
    label: "Capital social",
    aliases: ["capital social", "capitalsocial", "capital_social", "share_capital"],
  },
  {
    key: "datoriiTotale",
    label: "Datorii Total",
    aliases: ["datorii total", "datoriitotal", "datorii_totale", "total_liabilities"],
  },
  {
    key: "casaSiConturiBanci",
    label: "Casa și conturi la bănci",
    aliases: [
      "casa si conturi la banci",
      "casasiconturilabanci",
      "casa_si_conturi_banci",
      "cash_and_bank",
    ],
  },
  { key: "provizioane", label: "Provizioane", aliases: ["provizioane", "provisions"] },
  {
    key: "venituriInAvans",
    label: "Venituri în avans",
    aliases: ["venituri in avans", "venituriinavans", "venituri_in_avans", "deferred_revenue"],
  },
  {
    key: "numarAngajati",
    label: "Număr mediu de salariați",
    aliases: [
      "numar mediu de salariati",
      "numarmediudesalariati",
      "numar_angajati",
      "employees",
      "nr_angajati",
    ],
  },
  {
    key: "anulInfiintarii",
    label: "Anul înființării",
    aliases: [
      "anul infiintarii calculat",
      "anulinfiintariicalculat",
      "anul_infiintarii",
      "year_founded",
    ],
  },
  {
    key: "ratingExtern",
    label: "Rating extern",
    aliases: ["rating", "rating_extern", "external_rating", "credit_rating"],
  },
  {
    key: "limitaCreditEur",
    label: "Limita de credit (EUR)",
    aliases: ["limita de credit (eur)", "limitadecrediteur", "limita_credit_eur", "credit_limit"],
  },
];

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

async function loadImportIdentitySummary(tenantId: string, batchId: string) {
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

async function enrichImportBatch(tenantId: string, row: typeof bronzeImportBatches.$inferSelect) {
  const metadata = (row.metadata as Record<string, unknown> | null) ?? {};
  const uploadConfig = (metadata.uploadConfig as Record<string, unknown> | undefined) ?? {};
  return {
    ...row,
    identitySummary: await loadImportIdentitySummary(tenantId, row.id),
    appliedMapping:
      (metadata.columnMapping as Record<string, string> | undefined) ??
      (uploadConfig.mapping as Record<string, string> | undefined) ??
      null,
  };
}

function withIdentityReprocessQueuedMetadata(metadata: BatchMetadata): BatchMetadata {
  return {
    ...metadata,
    identityReprocessStatus: "queued",
    identityReprocessQueuedAt: new Date().toISOString(),
    identityReprocessStartedAt: null,
    identityReprocessCompletedAt: null,
    identityReprocessFailedAt: null,
    identityReprocessLastError: null,
    identityReprocessLastProgressAt: null,
  };
}

export async function importsBronzeRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };

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

      const filters = [sql`${bronzeImportBatches.tenantId} = ${tenantId}`];
      if (q.status) filters.push(sql`${bronzeImportBatches.status} = ${q.status}`);
      if (q.sourceType)
        filters.push(
          sql`COALESCE(${bronzeImportBatches.metadata}->>'sourceType', '') = ${q.sourceType}`,
        );
      if (q.dateFrom) filters.push(sql`${bronzeImportBatches.createdAt} >= ${q.dateFrom}`);
      if (q.dateTo) filters.push(sql`${bronzeImportBatches.createdAt} <= ${q.dateTo}`);
      const whereSql = sql.join(filters, sql` AND `);

      const [rows, total] = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
        const resultRows = await tx.query.bronzeImportBatches.findMany({
          where: whereSql,
          orderBy: () => [orderSql],
          limit,
          offset,
        });
        const [{ total: totalCount }] = await tx
          .select({ total: sql<number>`COUNT(*)` })
          .from(bronzeImportBatches)
          .where(whereSql);
        return [resultRows, Number(totalCount)] as const;
      });

      const enrichedRows = await Promise.all(rows.map((row) => enrichImportBatch(tenantId, row)));
      return { success: true, data: enrichedRows, meta: { total, limit, offset } };
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
      ...authOpts,
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
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "Re-run Bronze->Silver promotion for all contacts in batch",
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

      const existing = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsedParams.data.id)),
      });
      if (!existing) {
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      }

      const contacts = await db.query.bronzeContacts.findMany({
        where: (t) =>
          sql`${t.tenantId} = ${tenantId}
            AND ${batchIdMetadataEquals(t.metadata, parsedParams.data.id)}`,
      });

      if (contacts.length === 0) {
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
        await queue.add(
          "reprocess-batch",
          {
            tenantId,
            batchId: parsedParams.data.id,
            correlationId: `re-promote-${parsedParams.data.id}-${Date.now()}`,
          },
          {
            jobId: reprocessJobId,
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 5000,
            },
            removeOnComplete: 20,
            removeOnFail: 50,
          },
        );
      }
      await queue.close();

      const nextMetadata = withIdentityReprocessQueuedMetadata(
        (existing.metadata as BatchMetadata | null) ?? {},
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
          requeued: contacts.length,
          alreadyQueued: Boolean(
            existingJob && !["completed", "failed"].includes(existingState ?? ""),
          ),
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
      return { success: true, data: await enrichImportBatch(tenantId, row) };
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
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "Upload and enqueue import batch",
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
      const queue = createQueue(queueName);
      await queue.add("ingest", {
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
      });
      await queue.close();

      return reply.code(201).send({ success: true, data: batch });
    },
  );

  app.post(
    "/imports/:id/cancel",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "Cancel active import batch",
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
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "Retry (resume) a failed or pending import batch",
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
      const sourceType = String(uploadConfig.sourceType ?? "csv_import");
      const isExcel = sourceType === "excel_import";

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

      const resumeFrom = {
        processedRows: Number(existing.processedRows ?? 0),
        successRows: Number(existing.successRows ?? 0),
        errorRows: Number(existing.errorRows ?? 0),
        duplicateRows: Number(existing.duplicateRows ?? 0),
      };
      const refreshedMeta: BatchMetadata = {
        ...resolvedFile.metadata,
        retryQueuedAt: new Date().toISOString(),
        lastError: null,
        failedAt: null,
      };

      const [updated] = await db
        .update(bronzeImportBatches)
        .set({
          status: "pending",
          metadata: refreshedMeta,
          updatedAt: new Date(),
        })
        .where(sql`${bronzeImportBatches.id} = ${parsed.data.id}`)
        .returning();

      const queueName = isExcel ? "ingest:excel" : "ingest:csv";
      const queue = createQueue(queueName);
      await queue.add("ingest", {
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
        skipRows: resumeFrom.processedRows,
        resumeFrom,
        correlationId: `retry-${existing.id}-${Date.now()}`,
      });
      await queue.close();

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
      ...authOpts,
      schema: {
        tags: ["etapa1-bronze"],
        summary: "Requeue bronze contact for processing",
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

      const queue = createQueue("pipeline:promote:bronze-silver");
      await queue.add("reprocess", {
        tenantId,
        bronzeContactId: contact.id,
        correlationId: `reprocess-${contact.id}`,
      });
      await queue.close();

      await db
        .update(bronzeContacts)
        .set({ processingStatus: "pending", doNotProcess: false, updatedAt: new Date() })
        .where(sql`${bronzeContacts.id} = ${contact.id}`);

      return { success: true, data: { id: contact.id, requeued: true } };
    },
  );
}
