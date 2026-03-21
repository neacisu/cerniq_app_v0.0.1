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
import { buildColumnAliasToTargetMap } from "@cerniq/shared-types";
import { sanitizeCui } from "../lib/cui-validation.js";
import { createHitlApprovalTask } from "./pipeline-utils.js";

const STREAMING_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50 MB
const INSERT_BATCH_SIZE = 1000;
const LOOKUP_KEY_RE = /[^a-z0-9]/g;

const COLUMN_ALIAS_TO_TARGET = buildColumnAliasToTargetMap(normalizeLookupKey);

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
    if (targetKey in normalized) continue;
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
      contentHash: createHash("sha256")
        .update(
          JSON.stringify(
            row,
            Object.keys(row).sort((a, b) => a.localeCompare(b)),
          ),
        )
        .digest("hex"),
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

const NORMALIZATION_BULK_CHUNK_SIZE = 500;

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
    for (let i = 0; i < bronzeContactIds.length; i += NORMALIZATION_BULK_CHUNK_SIZE) {
      const chunk = bronzeContactIds.slice(i, i + NORMALIZATION_BULK_CHUNK_SIZE);
      await queue.addBulk(
        chunk.map((bronzeContactId) => ({
          name: "normalize",
          data: { tenantId, bronzeContactId, correlationId },
          opts: {
            jobId: `${queueName}-${bronzeContactId}`,
            attempts: 2,
            backoff: { type: "fixed" as const, delay: 500 },
          },
        })),
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
    metadata: (() => {
      let expr = sql`COALESCE(${bronzeImportBatches.metadata}, '{}'::jsonb)`;
      expr = sql`jsonb_set(${expr}, '{lastProgressAt}', ${JSON.stringify(new Date().toISOString())}::jsonb)`;
      if (args.identityMetrics) {
        expr = sql`jsonb_set(${expr}, '{identityMetrics}', ${JSON.stringify(args.identityMetrics)}::jsonb)`;
      }
      return expr;
    })(),
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
    metadata: sql`jsonb_set(jsonb_set(jsonb_set(COALESCE(${bronzeImportBatches.metadata}, '{}'::jsonb), '{lastProgressAt}', ${JSON.stringify(new Date().toISOString())}::jsonb), '{failedAt}', ${JSON.stringify(new Date().toISOString())}::jsonb), '{lastError}', ${JSON.stringify(truncateErrorMessage(args.errorMessage, 4000))}::jsonb)`,
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

async function markContactsPendingAnaf(tenantId: string, contactIds: string[]): Promise<void> {
  if (contactIds.length === 0) return;
  await db
    .update(bronzeContacts)
    .set({
      metadata: sql`jsonb_set(COALESCE(${bronzeContacts.metadata}, '{}'::jsonb), '{anafBronzeEnrichmentStatus}', '"pending"'::jsonb)`,
      updatedAt: new Date(),
    })
    .where(
      sql`${bronzeContacts.tenantId} = ${tenantId} AND ${bronzeContacts.id} = ANY(${contactIds})`,
    );
}

function buildCuiToBronzeIdsMap(
  contacts: { id: string; extractedCui: string | null }[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const contact of contacts) {
    if (!contact.extractedCui) continue;
    const ids = map.get(contact.extractedCui) ?? [];
    ids.push(contact.id);
    map.set(contact.extractedCui, ids);
  }
  return map;
}

function collectBronzeIdsForChunk(
  cuiChunk: string[],
  cuiToBronzeIds: Map<string, string[]>,
  nrRegComOnlyIds: string[],
  isFirstBatch: boolean,
): string[] {
  const ids = new Set<string>();
  for (const cui of cuiChunk) {
    for (const id of cuiToBronzeIds.get(cui) ?? []) ids.add(id);
  }
  if (isFirstBatch) {
    for (const id of nrRegComOnlyIds) ids.add(id);
  }
  return [...ids];
}

export async function triggerAnafBronzeEnrichment(
  tenantId: string,
  batchId: string,
  bronzeContactIds: string[],
  correlationId?: string,
): Promise<void> {
  if (bronzeContactIds.length === 0) return;

  await setSessionTenantId(tenantId);

  const contactsWithCui = await db.query.bronzeContacts.findMany({
    where: (t, { and, eq, isNotNull, inArray }) =>
      and(eq(t.tenantId, tenantId), inArray(t.id, bronzeContactIds), isNotNull(t.extractedCui)),
    columns: { id: true, extractedCui: true },
  });
  if (contactsWithCui.length === 0) return;

  await markContactsPendingAnaf(
    tenantId,
    contactsWithCui.map((c) => c.id),
  );

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
  await markContactsPendingAnaf(
    tenantId,
    contactsNrRegComOnly.map((c) => c.id),
  );

  const cuiToBronzeIds = buildCuiToBronzeIdsMap(contactsWithCui);
  const allCuis = [...cuiToBronzeIds.keys()];
  const duplicateCuiCount = contactsWithCui.length - allCuis.length;
  if (duplicateCuiCount > 0) {
    console.log(
      `[triggerAnafBronzeEnrichment] Deduped ${contactsWithCui.length} contacts → ${allCuis.length} unique CUIs (${duplicateCuiCount} duplicates skipped for ANAF batch)`,
    );
  }

  const nrRegComOnlyIds = contactsNrRegComOnly.map((c) => c.id);
  const totalBatches = Math.ceil(allCuis.length / ANAF_BATCH_SIZE);
  const queue = createQueue(QUEUES.ENRICH_BRONZE_ANAF);
  try {
    for (let i = 0; i < totalBatches; i++) {
      const cuiChunk = allCuis.slice(i * ANAF_BATCH_SIZE, (i + 1) * ANAF_BATCH_SIZE);
      const chunkBronzeIds = collectBronzeIdsForChunk(
        cuiChunk,
        cuiToBronzeIds,
        nrRegComOnlyIds,
        i === 0,
      );
      await queue.add(
        "anaf-bronze-enrich",
        {
          tenantId,
          batchId,
          cuiList: cuiChunk,
          bronzeContactIds: chunkBronzeIds,
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

/**
 * Verify file integrity by comparing SHA-256 hash against stored value.
 * Returns true if hash matches or no stored hash exists.
 */
export async function verifyFileHash(
  filePath: string,
  storedHash: string | undefined | null,
): Promise<{ valid: boolean; computedHash: string }> {
  const buffer = await readFile(filePath);
  const computedHash = createHash("sha256").update(buffer).digest("hex");
  if (!storedHash) return { valid: true, computedHash };
  return { valid: computedHash === storedHash, computedHash };
}
