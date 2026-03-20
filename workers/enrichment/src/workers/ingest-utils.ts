import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { Transform } from "node:stream";
import {
  bronzeContacts,
  bronzeImportBatches,
  computeStableSourcePayloadHash,
  db,
  resolveBronzeContactIdentity,
  setSessionTenantId,
  sql,
} from "@cerniq/db";
import {
  createQueue,
  sanitizeNrRegCom,
  QUEUES,
  bronzeContactsIngestedTotal,
} from "@cerniq/worker-shared";
import { sanitizeCui } from "../lib/cui-validation.js";
import { createHitlApprovalTask } from "./pipeline-utils.js";

const STREAMING_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50 MB
const INSERT_BATCH_SIZE = 1000;
const LOOKUP_KEY_RE = /[^a-z0-9]/g;

const COLUMN_MAPPING_PATTERNS: Array<{ target: string; aliases: string[] }> = [
  {
    target: "companyName",
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
  { target: "cui", aliases: ["cui", "cif", "vat", "vat_number", "cod_fiscal", "codfiscal"] },
  {
    target: "nrRegistru",
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
  { target: "email", aliases: ["email", "email_address", "mail"] },
  {
    target: "phone",
    aliases: ["phone", "telefon", "telefon_mobil", "mobile", "telefon mf", "telefonmf"],
  },
  { target: "website", aliases: ["website", "site", "url"] },
  {
    target: "address",
    aliases: ["address", "adresa", "street_address", "adresa anaf", "adresaanaf"],
  },
  { target: "judet", aliases: ["judet", "county", "region"] },
  { target: "localitate", aliases: ["localitate", "oras", "city", "town"] },
  {
    target: "caen",
    aliases: ["caen", "caen_code", "nace", "nace code", "nacecode", "cod_caen", "codcaen"],
  },
  {
    target: "caenText",
    aliases: ["nace text", "nacetext", "nace_text", "denumire_caen", "denumirecaen"],
  },
  {
    target: "cifraAfaceri",
    aliases: ["cifra de afaceri", "cifradeafaceri", "cifra_afaceri", "turnover", "revenue"],
  },
  {
    target: "profitNet",
    aliases: [
      "profit / pierdere neta",
      "profitpierderereta",
      "profit_net",
      "net_profit",
      "profit net",
    ],
  },
  {
    target: "profitBrut",
    aliases: [
      "profit / pierdere bruta",
      "profitpierderebruta",
      "profit_brut",
      "gross_profit",
      "profit brut",
    ],
  },
  {
    target: "venituriTotale",
    aliases: ["venituri totale", "venituritotale", "venituri_totale", "total_revenue"],
  },
  {
    target: "cheltuieliTotale",
    aliases: ["cheltuieli totale", "cheltuielitotale", "cheltuieli_totale", "total_expenses"],
  },
  {
    target: "activeTotale",
    aliases: ["total active", "totalactive", "active_totale", "total_assets"],
  },
  {
    target: "activeImobilizate",
    aliases: ["active imobilizate", "activeimobilizate", "active_imobilizate", "fixed_assets"],
  },
  {
    target: "activeCirculante",
    aliases: ["active circulante", "activecirculante", "active_circulante", "current_assets"],
  },
  { target: "creante", aliases: ["creante", "receivables", "trade_receivables"] },
  { target: "stocuri", aliases: ["stocuri", "inventories", "stocks"] },
  {
    target: "cheltuieliInAvans",
    aliases: [
      "cheltuieli in avans",
      "cheltuieliinavans",
      "cheltuieli_in_avans",
      "prepaid_expenses",
    ],
  },
  {
    target: "capitaluriProprii",
    aliases: ["capitaluri proprii total", "capitaluriproprittotal", "capitaluri_proprii", "equity"],
  },
  {
    target: "capitalSocial",
    aliases: ["capital social", "capitalsocial", "capital_social", "share_capital"],
  },
  {
    target: "datoriiTotale",
    aliases: ["datorii total", "datoriitotal", "datorii_totale", "total_liabilities"],
  },
  {
    target: "casaSiConturiBanci",
    aliases: [
      "casa si conturi la banci",
      "casasiconturilabanci",
      "casa_si_conturi_banci",
      "cash_and_bank",
    ],
  },
  { target: "provizioane", aliases: ["provizioane", "provisions"] },
  {
    target: "venituriInAvans",
    aliases: ["venituri in avans", "venituriinavans", "venituri_in_avans", "deferred_revenue"],
  },
  {
    target: "numarAngajati",
    aliases: [
      "numar mediu de salariati",
      "numarmediudesalariati",
      "numar_angajati",
      "employees",
      "nr_angajati",
    ],
  },
  {
    target: "anulInfiintarii",
    aliases: [
      "anul infiintarii calculat",
      "anulinfiintariicalculat",
      "anul_infiintarii",
      "year_founded",
    ],
  },
  {
    target: "ratingExtern",
    aliases: ["rating", "rating_extern", "external_rating", "credit_rating"],
  },
  {
    target: "limitaCreditEur",
    aliases: ["limita de credit (eur)", "limitadecrediteur", "limita_credit_eur", "credit_limit"],
  },
];

const COLUMN_ALIAS_TO_TARGET = new Map(
  COLUMN_MAPPING_PATTERNS.flatMap((pattern) =>
    pattern.aliases.map((alias) => [normalizeLookupKey(alias), pattern.target] as const),
  ),
);

export type IngestBaseJobData = {
  tenantId: string;
  batchId?: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  content?: string;
  encoding?: string;
  hasHeader?: boolean;
  delimiter?: string;
  columnMapping?: Record<string, string>;
  skipRows?: number;
  maxRows?: number;
  correlationId?: string;
};

export async function readInputContent(jobData: IngestBaseJobData): Promise<string> {
  if (typeof jobData.content === "string" && jobData.content.length > 0) {
    return jobData.content;
  }
  if (!jobData.filePath) {
    throw new Error("Missing input data: provide either content or filePath");
  }
  const buffer = await readFile(jobData.filePath);
  return buffer.toString(detectEncoding(buffer));
}

export async function shouldUseStreaming(jobData: IngestBaseJobData): Promise<boolean> {
  if (jobData.content) return false;
  if (!jobData.filePath) return false;
  const fileSize = jobData.fileSize ?? (await stat(jobData.filePath)).size;
  return fileSize >= STREAMING_THRESHOLD_BYTES;
}

export function createDecodingStream(encoding: string): Transform {
  const resolvedEncoding = resolveBufferEncoding(encoding);
  return new Transform({
    transform(chunk: Buffer, _enc, callback) {
      callback(null, chunk.toString(resolvedEncoding));
    },
  });
}

export function getInsertBatchSize(): number {
  return INSERT_BATCH_SIZE;
}

function resolveBufferEncoding(encoding: string): BufferEncoding {
  const lower = normalizeLookupKey(encoding);
  if (lower === "utf8") return "utf8";
  if (
    lower === "latin1" ||
    lower === "iso88591" ||
    lower === "iso88592" ||
    lower === "win1250" ||
    lower === "windows1250"
  ) {
    return "latin1";
  }
  if (lower === "utf16le") return "utf16le";
  if (lower === "ascii") return "ascii";
  return "utf8";
}

function inspectUtf8LeadByte(sample: Buffer, index: number) {
  const byte = sample[index] ?? 0;
  if ((byte & 0xe0) === 0xc0) {
    const invalid = index + 1 >= sample.length || ((sample[index + 1] ?? 0) & 0xc0) !== 0x80;
    return { invalid, advance: invalid ? 0 : 1 };
  }
  if ((byte & 0xf0) === 0xe0) {
    const invalid =
      index + 2 >= sample.length ||
      ((sample[index + 1] ?? 0) & 0xc0) !== 0x80 ||
      ((sample[index + 2] ?? 0) & 0xc0) !== 0x80;
    return { invalid, advance: invalid ? 0 : 2 };
  }

  return { invalid: true, advance: 0 };
}

export function detectEncoding(buffer: Buffer): BufferEncoding {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return "utf8";
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return "utf16le";
  }

  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  let hasHighBytes = false;
  let invalidUtf8 = false;
  let i = 0;
  while (i < sample.length) {
    const byte = sample[i] ?? 0;
    if (byte <= 0x7f) {
      i += 1;
      continue;
    }

    hasHighBytes = true;
    const { invalid, advance } = inspectUtf8LeadByte(sample, i);
    if (invalid) {
      invalidUtf8 = true;
    }
    i += advance + 1;
  }

  if (hasHighBytes && invalidUtf8) return "latin1";
  return "utf8";
}

export function detectEncodingFromPath(_filePath: string): string {
  return "utf8";
}

export function createFileReadStream(filePath: string, encoding: string) {
  const stream = createReadStream(filePath, { highWaterMark: 64 * 1024 });
  const decoder = createDecodingStream(encoding);
  return stream.pipe(decoder);
}

export function normalizeRow(
  row: Record<string, unknown>,
  mapping: Record<string, string> = {},
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const targetKey = mapping[key] ?? key;
    normalized[targetKey] = value;
  }
  return normalized;
}

function normalizeLookupKey(value: string) {
  return value.trim().toLowerCase().replaceAll(LOOKUP_KEY_RE, "");
}

export function detectColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  // GAP-B13: Track target→source mappings to detect collisions
  const targetToSources = new Map<string, string[]>();

  for (const originalHeader of headers) {
    const target = COLUMN_ALIAS_TO_TARGET.get(normalizeLookupKey(originalHeader)) ?? originalHeader;
    mapping[originalHeader] = target;

    if (target !== originalHeader) {
      const sources = targetToSources.get(target) ?? [];
      sources.push(originalHeader);
      targetToSources.set(target, sources);
    }
  }

  for (const [target, sources] of targetToSources) {
    if (sources.length > 1) {
      console.warn(
        `[ingest-utils] Column mapping collision: multiple headers (${sources.join(", ")}) map to "${target}". First match will be used.`,
      );
    }
  }

  return mapping;
}

function extractField(row: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const val = row[k];
    if (val != null && String(val).trim().length > 0) return String(val).trim();
  }
  const rowLowerMap = new Map(Object.entries(row).map(([k, v]) => [normalizeLookupKey(k), v]));
  for (const k of keys) {
    const val = rowLowerMap.get(normalizeLookupKey(k));
    if (val != null && String(val).trim().length > 0) return String(val).trim();
  }
  return null;
}

type BronzeInsertResult = {
  rowsRead: number;
  rowsInserted: number;
  insertedIds: string[];
  processableIds: string[];
  errorRows: number;
  duplicateRows: number;
  resolvedRows: number;
  identityConflictRows: number;
  insufficientIdentifierRows: number;
  rowErrors: Array<{ rowNumber: number | null; message: string }>;
};

type InsertBronzeRowsOptions = {
  startingRowNumber?: number;
  columnMapping?: Record<string, string>;
};

type BronzeContactInsert = typeof bronzeContacts.$inferInsert;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }
  return String(error);
}

function truncateErrorMessage(message: string, maxLength = 1000): string {
  return message.length > maxLength ? `${message.slice(0, maxLength - 1)}...` : message;
}

function shouldSplitInsertBatch(error: unknown, _batchLength: number): boolean {
  const message = getErrorMessage(error).toLowerCase();
  if (
    message.includes("timeout") ||
    message.includes("econn") ||
    message.includes("connection") ||
    message.includes("terminating connection") ||
    message.includes("could not connect")
  ) {
    return false;
  }

  return (
    message.includes('failed query: insert into "bronze"."bronze_contacts"') ||
    message.includes("bind message") ||
    message.includes("stack size") ||
    message.includes("statement too large") ||
    message.includes("invalid byte sequence") ||
    message.includes("unsupported unicode") ||
    message.includes("value too long")
  );
}

function createEmptyBronzeInsertResult(): BronzeInsertResult {
  return {
    rowsRead: 0,
    rowsInserted: 0,
    insertedIds: [],
    processableIds: [],
    errorRows: 0,
    duplicateRows: 0,
    resolvedRows: 0,
    identityConflictRows: 0,
    insufficientIdentifierRows: 0,
    rowErrors: [],
  };
}

function getMetadataRowNumber(metadataInput: unknown): number | null {
  const metadata = (metadataInput as Record<string, unknown> | undefined) ?? {};
  return typeof metadata.rowNumber === "number" && Number.isFinite(metadata.rowNumber)
    ? metadata.rowNumber
    : null;
}

async function handleIdentityConflictRow(
  insertedId: string,
  sourceRow: BronzeContactInsert,
  conflictCompanyIds: string[],
) {
  await createHitlApprovalTask({
    tenantId: String(sourceRow.tenantId),
    entityType: "bronze_contact",
    entityId: insertedId,
    type: "identity_conflict",
    title: "Conflict de identitate companie la ingestie",
    description:
      "CUI și/sau Nr. Reg. Com. rezolvă companii diferite sau intră în conflict cu registry-ul canonic.",
    urgency: "high",
    metadata: {
      bronzeContactId: insertedId,
      companyIds: conflictCompanyIds,
      sourcePayloadHash: sourceRow.sourcePayloadHash,
      extractedCui: sourceRow.extractedCui ?? null,
      extractedCuiRaw: sourceRow.extractedCuiRaw ?? null,
      extractedNrRegCom: sourceRow.extractedNrRegCom ?? null,
      extractedNrRegComRaw: sourceRow.extractedNrRegComRaw ?? null,
    },
  });
}

async function resolveInsertedBronzeRow(
  insertedId: string,
  sourceRow: BronzeContactInsert,
): Promise<{
  processableId: string | null;
  duplicateRows: number;
  resolvedRows: number;
  identityConflictRows: number;
  insufficientIdentifierRows: number;
  rowError: { rowNumber: number | null; message: string } | null;
}> {
  const rowNumber = getMetadataRowNumber(sourceRow.metadata);

  try {
    const resolution = await resolveBronzeContactIdentity({
      tenantId: String(sourceRow.tenantId),
      bronzeContactId: insertedId,
      sourceAuthority: "import",
    });

    switch (resolution.status) {
      case "resolved":
        return {
          processableId: insertedId,
          duplicateRows: 0,
          resolvedRows: 1,
          identityConflictRows: 0,
          insufficientIdentifierRows: 0,
          rowError: null,
        };
      case "duplicate_source":
        return {
          processableId: null,
          duplicateRows: 1,
          resolvedRows: 0,
          identityConflictRows: 0,
          insufficientIdentifierRows: 0,
          rowError: null,
        };
      case "insufficient_identifiers":
        return {
          processableId: null,
          duplicateRows: 0,
          resolvedRows: 0,
          identityConflictRows: 0,
          insufficientIdentifierRows: 1,
          rowError: null,
        };
      case "identity_conflict":
        await handleIdentityConflictRow(insertedId, sourceRow, resolution.conflictCompanyIds);
        return {
          processableId: null,
          duplicateRows: 0,
          resolvedRows: 0,
          identityConflictRows: 1,
          insufficientIdentifierRows: 0,
          rowError: null,
        };
    }
  } catch (error) {
    const message = truncateErrorMessage(getErrorMessage(error));
    await db
      .update(bronzeContacts)
      .set({
        processingStatus: "error",
        doNotProcess: true,
        identityResolutionMetadata: {
          resolution: "error",
          lastError: message,
          failedAt: new Date().toISOString(),
        },
      })
      .where(sql`${bronzeContacts.id} = ${insertedId}`);

    return {
      processableId: null,
      duplicateRows: 0,
      resolvedRows: 0,
      identityConflictRows: 0,
      insufficientIdentifierRows: 0,
      rowError: { rowNumber, message },
    };
  }
}

function createSingleRowInsertFailure(
  payload: BronzeContactInsert[],
  error: unknown,
): BronzeInsertResult {
  return {
    rowsRead: 1,
    rowsInserted: 0,
    insertedIds: [],
    processableIds: [],
    errorRows: 1,
    duplicateRows: 0,
    resolvedRows: 0,
    identityConflictRows: 0,
    insufficientIdentifierRows: 0,
    rowErrors: [
      {
        rowNumber: getMetadataRowNumber(payload[0]?.metadata),
        message: truncateErrorMessage(getErrorMessage(error)),
      },
    ],
  };
}

function mergeBronzeInsertResults(
  left: BronzeInsertResult,
  right: BronzeInsertResult,
): BronzeInsertResult {
  return {
    rowsRead: left.rowsRead + right.rowsRead,
    rowsInserted: left.rowsInserted + right.rowsInserted,
    insertedIds: [...left.insertedIds, ...right.insertedIds],
    processableIds: [...left.processableIds, ...right.processableIds],
    errorRows: left.errorRows + right.errorRows,
    duplicateRows: left.duplicateRows + right.duplicateRows,
    resolvedRows: left.resolvedRows + right.resolvedRows,
    identityConflictRows: left.identityConflictRows + right.identityConflictRows,
    insufficientIdentifierRows: left.insufficientIdentifierRows + right.insufficientIdentifierRows,
    rowErrors: [...left.rowErrors, ...right.rowErrors],
  };
}

async function insertBronzePayloadSafely(
  payload: BronzeContactInsert[],
): Promise<BronzeInsertResult> {
  if (payload.length === 0) {
    return createEmptyBronzeInsertResult();
  }

  try {
    const insertedRows = await db
      .insert(bronzeContacts)
      .values(payload)
      .returning({ id: bronzeContacts.id });

    const processableIds: string[] = [];
    const rowErrors: Array<{ rowNumber: number | null; message: string }> = [];
    let duplicateRows = 0;
    let resolvedRows = 0;
    let identityConflictRows = 0;
    let insufficientIdentifierRows = 0;

    for (let index = 0; index < insertedRows.length; index++) {
      const inserted = insertedRows[index];
      const sourceRow = payload[index];
      if (!inserted || !sourceRow) continue;

      const rowResolution = await resolveInsertedBronzeRow(inserted.id, sourceRow);
      if (rowResolution.processableId) {
        processableIds.push(rowResolution.processableId);
      }
      duplicateRows += rowResolution.duplicateRows;
      resolvedRows += rowResolution.resolvedRows;
      identityConflictRows += rowResolution.identityConflictRows;
      insufficientIdentifierRows += rowResolution.insufficientIdentifierRows;
      if (rowResolution.rowError) {
        rowErrors.push(rowResolution.rowError);
      }
    }

    const errorRows = rowErrors.length;
    const rowsInserted = Math.max(0, insertedRows.length - duplicateRows - errorRows);

    return {
      rowsRead: payload.length,
      rowsInserted,
      insertedIds: insertedRows.map((x) => x.id),
      processableIds,
      errorRows,
      duplicateRows,
      resolvedRows,
      identityConflictRows,
      insufficientIdentifierRows,
      rowErrors,
    };
  } catch (error) {
    if (!shouldSplitInsertBatch(error, payload.length)) {
      throw error;
    }

    if (payload.length === 1) {
      return createSingleRowInsertFailure(payload, error);
    }

    const mid = Math.ceil(payload.length / 2);
    const left = await insertBronzePayloadSafely(payload.slice(0, mid));
    const right = await insertBronzePayloadSafely(payload.slice(mid));

    return mergeBronzeInsertResults(left, right);
  }
}

export async function insertBronzeRows(
  tenantId: string,
  rows: Array<Record<string, unknown>>,
  sourceType: "csv_import" | "excel_import" | "webhook" | "manual" | "api",
  batchId?: string,
  sheetName?: string,
  options?: InsertBronzeRowsOptions,
): Promise<BronzeInsertResult> {
  await setSessionTenantId(tenantId);
  const columnMapping = options?.columnMapping ?? {};
  const payload = rows.map((row, index) => {
    const mappedRow = normalizeRow(row, columnMapping);
    const extractedCuiRaw =
      extractField(mappedRow, "cui", "CUI", "cif", "CIF", "cod_fiscal", "vat_number") ?? null;
    const extractedNrRegComRaw =
      extractField(
        mappedRow,
        "nrRegistru",
        "nr reg com",
        "Nr reg com",
        "Nr. RC.",
        "nr_reg_com",
        "nr_reg_comert",
        "reg_com",
        "j_number",
      ) ?? null;

    return {
      tenantId,
      sourceType,
      sourceIdentifier: `${sourceType}:${batchId ?? "adhoc"}:${sheetName ?? "default"}:${(options?.startingRowNumber ?? 1) + index}`,
      rawPayload: row,
      contentHash: createHash("sha256").update(JSON.stringify(row)).digest("hex"),
      sourcePayloadHash: computeStableSourcePayloadHash(mappedRow),
      processingStatus: "pending" as const,
      extractedCuiRaw,
      extractedCui: extractedCuiRaw ? sanitizeCui(extractedCuiRaw) || null : null,
      extractedNrRegComRaw,
      // Store raw format as-is — do NOT auto-convert old format (J09/98/2003) to canonical
      // new format (J2003000098095). Canonical is only set from authoritative official sources (ONRC).
      extractedNrRegCom: extractedNrRegComRaw ? sanitizeNrRegCom(extractedNrRegComRaw) : null,
      extractedNrRegComCanonical: null,
      extractedEmail:
        extractField(
          mappedRow,
          "email",
          "Email",
          "EMAIL",
          "email_address",
          "mail",
        )?.toLowerCase() ?? null,
      extractedPhone: extractField(
        mappedRow,
        "phone",
        "telefon",
        "Telefon MF",
        "Telefon",
        "mobile",
        "tel",
      ),
      extractedName: extractField(
        mappedRow,
        "companyName",
        "denumire",
        "Denumire Firma",
        "Denumire firma",
        "Denumire Companie",
        "Denumire companie",
        "company_name",
        "firma",
        "name",
      ),
      extractedJudet: extractField(mappedRow, "judet", "Judet", "county", "region"),
      extractedLocalitate: extractField(
        mappedRow,
        "localitate",
        "Localitate",
        "oras",
        "city",
        "town",
      ),
      extractedAddress: extractField(
        mappedRow,
        "address",
        "adresa",
        "Adresa ANAF",
        "street_address",
      ),
      extractedCaen: extractField(
        mappedRow,
        "caen",
        "nace code",
        "nace_code",
        "caen_code",
        "cod_caen",
        "CAEN",
      ),
      metadata: {
        batchId: batchId ?? null,
        sourceType,
        sheetName: sheetName ?? null,
        rowNumber: (options?.startingRowNumber ?? 1) + index,
        importedAt: new Date().toISOString(),
        columnMapping,
      },
    };
  });

  const result = await insertBronzePayloadSafely(payload);
  if (result.rowsInserted > 0) {
    bronzeContactsIngestedTotal.inc(
      { source: sourceType, tenant_id: tenantId },
      result.rowsInserted,
    );
  }
  return result;
}

export async function triggerNormalizationForContacts(
  tenantId: string,
  bronzeContactIds: string[],
  correlationId?: string,
): Promise<void> {
  if (bronzeContactIds.length === 0) return;
  const targetQueues = [
    QUEUES.NORMALIZE_NAME,
    QUEUES.NORMALIZE_EMAIL,
    QUEUES.NORMALIZE_PHONE,
    QUEUES.NORMALIZE_ADDRESS,
  ] as const;

  for (const queueName of targetQueues) {
    const queue = createQueue(queueName);
    for (const bronzeContactId of bronzeContactIds) {
      await queue.add(
        "normalize",
        {
          tenantId,
          bronzeContactId,
          correlationId,
        },
        {
          jobId: `${queueName}-${bronzeContactId}`,
          attempts: 2,
          backoff: { type: "fixed", delay: 500 },
        },
      );
    }
    await queue.close();
  }
}

export async function updateImportBatchCounters(args: {
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
}): Promise<void> {
  if (!args.batchId) return;
  await setSessionTenantId(args.tenantId);
  const values: Record<string, unknown> = {
    processedRows: args.processedRows,
    successRows: args.successRows,
    errorRows: args.errorRows,
    duplicateRows: args.duplicateRows,
    status: args.status ?? "processing",
    updatedAt: new Date(),
    metadata: sql`COALESCE(${bronzeImportBatches.metadata}, '{}'::jsonb) || ${JSON.stringify({
      lastProgressAt: new Date().toISOString(),
      identityMetrics: args.identityMetrics ?? undefined,
    })}::jsonb`,
  };
  if (typeof args.totalRows === "number") {
    values.totalRows = args.totalRows;
  }

  await db
    .update(bronzeImportBatches)
    .set(values)
    .where(sql`${bronzeImportBatches.id} = ${args.batchId}`);
}

export async function markImportBatchFailed(args: {
  tenantId: string;
  batchId?: string;
  processedRows: number;
  successRows: number;
  errorRows: number;
  duplicateRows: number;
  totalRows?: number;
  errorMessage: string;
}): Promise<void> {
  if (!args.batchId) return;
  await setSessionTenantId(args.tenantId);

  const values: Record<string, unknown> = {
    processedRows: args.processedRows,
    successRows: args.successRows,
    errorRows: args.errorRows,
    duplicateRows: args.duplicateRows,
    status: "failed",
    updatedAt: new Date(),
    metadata: sql`COALESCE(${bronzeImportBatches.metadata}, '{}'::jsonb) || ${JSON.stringify({
      lastProgressAt: new Date().toISOString(),
      failedAt: new Date().toISOString(),
      lastError: truncateErrorMessage(args.errorMessage, 4000),
    })}::jsonb`,
  };

  if (typeof args.totalRows === "number") {
    values.totalRows = args.totalRows;
  }

  await db
    .update(bronzeImportBatches)
    .set(values)
    .where(sql`${bronzeImportBatches.id} = ${args.batchId}`);
}

// ── ANAF Bronze Enrichment Trigger ──────────────────────────────────

const ANAF_BATCH_SIZE = 100;
const ANAF_BATCH_DELAY_MS = 1100;

export async function triggerAnafBronzeEnrichment(
  tenantId: string,
  batchId: string,
  bronzeContactIds: string[],
  correlationId?: string,
): Promise<void> {
  if (bronzeContactIds.length === 0) return;

  await setSessionTenantId(tenantId);

  // Find all contacts in this batch that have a CUI
  const contactsWithCui = await db.query.bronzeContacts.findMany({
    where: (t, { and, eq, isNotNull, inArray }) =>
      and(eq(t.tenantId, tenantId), inArray(t.id, bronzeContactIds), isNotNull(t.extractedCui)),
    columns: { id: true, extractedCui: true },
  });

  if (contactsWithCui.length === 0) return;

  // Mark all contacts with CUI as pending ANAF enrichment
  const cuiContactIds = contactsWithCui.map((c) => c.id);
  await db
    .update(bronzeContacts)
    .set({
      metadata: sql`COALESCE(${bronzeContacts.metadata}, '{}'::jsonb) || '{"anafBronzeEnrichmentStatus":"pending"}'::jsonb`,
      updatedAt: new Date(),
    })
    .where(
      sql`${bronzeContacts.tenantId} = ${tenantId} AND ${bronzeContacts.id} = ANY(${cuiContactIds})`,
    );

  // Also mark NrRegCom-only contacts as pending (they may get cross-referenced)
  const contactsNrRegComOnly = await db.query.bronzeContacts.findMany({
    where: (t, { and, eq, isNull, isNotNull, inArray }) =>
      and(
        eq(t.tenantId, tenantId),
        inArray(t.id, bronzeContactIds),
        isNull(t.extractedCui),
        isNotNull(t.extractedNrRegCom),
      ),
    columns: { id: true },
  });

  if (contactsNrRegComOnly.length > 0) {
    const nrRegComIds = contactsNrRegComOnly.map((c) => c.id);
    await db
      .update(bronzeContacts)
      .set({
        metadata: sql`COALESCE(${bronzeContacts.metadata}, '{}'::jsonb) || '{"anafBronzeEnrichmentStatus":"pending"}'::jsonb`,
        updatedAt: new Date(),
      })
      .where(
        sql`${bronzeContacts.tenantId} = ${tenantId} AND ${bronzeContacts.id} = ANY(${nrRegComIds})`,
      );
  }

  // Collect unique CUIs and chunk into batches of 100
  const cuiSet = new Set<string>();
  for (const contact of contactsWithCui) {
    if (contact.extractedCui) cuiSet.add(contact.extractedCui);
  }
  const allCuis = [...cuiSet];
  const allBronzeIds = [...new Set([...cuiContactIds, ...contactsNrRegComOnly.map((c) => c.id)])];
  const totalBatches = Math.ceil(allCuis.length / ANAF_BATCH_SIZE);

  const queue = createQueue(QUEUES.ENRICH_BRONZE_ANAF);
  try {
    for (let i = 0; i < totalBatches; i++) {
      const cuiChunk = allCuis.slice(i * ANAF_BATCH_SIZE, (i + 1) * ANAF_BATCH_SIZE);
      await queue.add(
        "anaf-bronze-enrich",
        {
          tenantId,
          batchId,
          cuiList: cuiChunk,
          bronzeContactIds: allBronzeIds,
          correlationId: correlationId ?? batchId,
          batchIndex: i,
          totalBatches,
        },
        {
          jobId: `anaf-bronze-${batchId}-${i}`,
          delay: i * ANAF_BATCH_DELAY_MS,
          attempts: 5,
          backoff: { type: "exponential", delay: 1000 },
        },
      );
    }
  } finally {
    await queue.close();
  }
}
