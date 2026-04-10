import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { Transform } from "node:stream";
import {
  bronzeContacts,
  bronzeImportBatches,
  computeStableSourcePayloadHash,
  db,
  eq,
  importRowQuarantine,
  resolveBronzeContactIdentity,
  setSessionTenantId,
  sql,
} from "@cerniq/db";
import {
  enqueueImportJob,
  enqueueImportJobBulk,
  sanitizeNrRegCom,
  QUEUES,
  bronzeContactsIngestedTotal,
  type ImportExecutionContext,
} from "@cerniq/worker-shared";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { buildColumnAliasToTargetMap } from "@cerniq/shared-types";
import { sanitizeCui } from "../lib/cui-validation.js";
import { createHitlApprovalTask, logEnrichmentAudit } from "./pipeline-utils.js";

const STREAMING_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50 MB
const INSERT_BATCH_SIZE = 1000;
const LOOKUP_KEY_RE = /[^a-z0-9]/g;
const svcLog = createServiceLogger("ingest-utils", { etapa: "e1" });

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
  importExecution?: ImportExecutionContext;
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
      svcLog.warn(
        {
          target,
          sources,
          sourcesCount: sources.length,
        },
        "Column mapping collision detected; first matching header will be used",
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
  quarantineRows: number;
  sanitizedRows: number;
  invariantConflictRows: number;
  resolvedRows: number;
  identityConflictRows: number;
  insufficientIdentifierRows: number;
  rowErrors: Array<{ rowNumber: number | null; message: string }>;
};

type BronzeRowCoordinate = {
  rowNumber?: number | null;
  worksheetRow?: number | null;
  globalRow?: number | null;
};

type ImportRowViolation = {
  action: "removed" | "quarantined";
  codePoint: string;
  count: number;
  fieldName: string;
  path: string;
};

type InsertBronzeRowsOptions = {
  startingRowNumber?: number;
  columnMapping?: Record<string, string>;
  rowCoordinates?: BronzeRowCoordinate[];
  importExecution?: ImportExecutionContext | null;
};

type BronzeContactInsert = typeof bronzeContacts.$inferInsert;

type ExistingBronzeContactSummary = Pick<
  typeof bronzeContacts.$inferSelect,
  | "id"
  | "sourceIdentifier"
  | "contentHash"
  | "sourcePayloadHash"
  | "identityStatus"
  | "doNotProcess"
> & {
  processingStatus: typeof bronzeContacts.$inferSelect.processingStatus | null;
};

type SanitizedRowInspection = {
  sanitizedRow: Record<string, unknown>;
  auditEscapedRow: Record<string, unknown>;
  violations: ImportRowViolation[];
  removedControlCount: number;
  quarantinedControlCount: number;
  firstQuarantineField: string | null;
};

type InsertBronzePayloadContext = {
  batchId?: string;
  importExecution?: ImportExecutionContext | null;
  sourceType: "csv_import" | "excel_import" | "webhook" | "manual" | "api";
};

type QuarantinedImportRow = Parameters<typeof persistQuarantinedImportRows>[0][number];

type ExistingBronzePrehandleResult = {
  rowsToInsert: BronzeContactInsert[];
  quarantinedRows: QuarantinedImportRow[];
  prehandledResult: BronzeInsertResult;
};

type InsertedBronzeResolutionResult = Pick<
  BronzeInsertResult,
  | "rowsRead"
  | "rowsInserted"
  | "insertedIds"
  | "processableIds"
  | "errorRows"
  | "duplicateRows"
  | "quarantineRows"
  | "sanitizedRows"
  | "invariantConflictRows"
  | "resolvedRows"
  | "identityConflictRows"
  | "insufficientIdentifierRows"
  | "rowErrors"
>;

const ALLOWED_CONTROL_CHAR_CODES = new Set([9, 10, 13]);

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
    quarantineRows: 0,
    sanitizedRows: 0,
    invariantConflictRows: 0,
    resolvedRows: 0,
    identityConflictRows: 0,
    insufficientIdentifierRows: 0,
    rowErrors: [],
  };
}

function getMetadataRowNumber(metadataInput: unknown): number | null {
  const metadata = (metadataInput as Record<string, unknown> | undefined) ?? {};
  if (typeof metadata.globalRow === "number" && Number.isFinite(metadata.globalRow)) {
    return metadata.globalRow;
  }
  return typeof metadata.rowNumber === "number" && Number.isFinite(metadata.rowNumber)
    ? metadata.rowNumber
    : null;
}

/** I10: context rând import pentru log structurat (echivalent vechiului batchId / fileName / rowIndex). */
function ingestRowSourceContext(metadataInput: unknown): {
  batchId: string | null;
  fileName: string | null;
} {
  const metadata = (metadataInput as Record<string, unknown> | undefined) ?? {};
  let batchId: string | null = null;
  if (typeof metadata.batchId === "string") batchId = metadata.batchId;
  else if (typeof metadata.importBatchId === "string") batchId = metadata.importBatchId;

  let fileName: string | null = null;
  if (typeof metadata.fileName === "string") fileName = metadata.fileName;
  else if (typeof metadata.sourceFileName === "string") fileName = metadata.sourceFileName;

  return { batchId, fileName };
}

function getMetadataWorksheetRow(metadataInput: unknown): number | null {
  const metadata = (metadataInput as Record<string, unknown> | undefined) ?? {};
  return typeof metadata.worksheetRow === "number" && Number.isFinite(metadata.worksheetRow)
    ? metadata.worksheetRow
    : null;
}

function getMetadataSheetName(metadataInput: unknown): string | null {
  const metadata = (metadataInput as Record<string, unknown> | undefined) ?? {};
  return typeof metadata.sheetName === "string" && metadata.sheetName.trim().length > 0
    ? metadata.sheetName
    : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function escapeCodePoint(codePoint: number): string {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
}

const AUDIT_UNICODE_ESCAPE_PREFIX = String.raw`\u`;

function escapeControlCharsForAudit(value: string): string {
  let escaped = "";
  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;
    escaped +=
      codePoint < 0x20
        ? AUDIT_UNICODE_ESCAPE_PREFIX + codePoint.toString(16).padStart(4, "0")
        : char;
  }
  return escaped;
}

function fieldNameFromPath(path: string): string {
  const fieldName = path.split(/[.[\]]/).find(Boolean);
  return fieldName ?? "row";
}

function recordViolation(
  violations: Map<string, ImportRowViolation>,
  action: ImportRowViolation["action"],
  path: string,
  codePoint: number,
) {
  const code = escapeCodePoint(codePoint);
  const key = `${action}:${path}:${code}`;
  const existing = violations.get(key);
  if (existing) {
    existing.count += 1;
    return;
  }
  violations.set(key, {
    action,
    codePoint: code,
    count: 1,
    fieldName: fieldNameFromPath(path),
    path,
  });
}

function sanitizeStringControls(
  value: string,
  path: string,
  violations: Map<string, ImportRowViolation>,
  counters: { removed: number; quarantined: number },
): string {
  let sanitized = "";
  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (codePoint === 0) {
      counters.removed += 1;
      recordViolation(violations, "removed", path, codePoint);
      continue;
    }
    if (codePoint < 0x20 && !ALLOWED_CONTROL_CHAR_CODES.has(codePoint)) {
      counters.quarantined += 1;
      recordViolation(violations, "quarantined", path, codePoint);
      continue;
    }
    sanitized += char;
  }
  return sanitized;
}

function sanitizeValueDeep(
  value: unknown,
  path: string,
  violations: Map<string, ImportRowViolation>,
  counters: { removed: number; quarantined: number },
): unknown {
  if (typeof value === "string") {
    return sanitizeStringControls(value, path || "row", violations, counters);
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      sanitizeValueDeep(entry, `${path || "row"}[${index}]`, violations, counters),
    );
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        sanitizeValueDeep(entry, path ? `${path}.${key}` : key, violations, counters),
      ]),
    );
  }
  return value;
}

function escapeValueForAudit(value: unknown): unknown {
  if (typeof value === "string") {
    return escapeControlCharsForAudit(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => escapeValueForAudit(entry));
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, escapeValueForAudit(entry)]),
    );
  }
  return value;
}

function inspectAndSanitizeRow(row: Record<string, unknown>): SanitizedRowInspection {
  const violations = new Map<string, ImportRowViolation>();
  const counters = { removed: 0, quarantined: 0 };
  const sanitizedRow = sanitizeValueDeep(row, "", violations, counters);
  const auditEscapedRow = escapeValueForAudit(row);
  const allViolations = [...violations.values()];

  return {
    sanitizedRow: isPlainObject(sanitizedRow) ? sanitizedRow : {},
    auditEscapedRow: isPlainObject(auditEscapedRow) ? auditEscapedRow : {},
    violations: allViolations,
    removedControlCount: counters.removed,
    quarantinedControlCount: counters.quarantined,
    firstQuarantineField:
      allViolations.find((violation) => violation.action === "quarantined")?.fieldName ?? null,
  };
}

function isExistingBronzeProcessable(contact: ExistingBronzeContactSummary): boolean {
  if (contact.doNotProcess) {
    return false;
  }
  if (contact.processingStatus === "promoted") {
    return false;
  }
  return (
    contact.identityStatus === "unresolved" ||
    contact.identityStatus === "resolved" ||
    contact.identityStatus == null
  );
}

async function loadExistingBronzeContactsBySourceIdentifier(
  tenantId: string,
  sourceIdentifiers: string[],
): Promise<Map<string, ExistingBronzeContactSummary>> {
  if (sourceIdentifiers.length === 0) {
    return new Map();
  }

  const existing = await db.query.bronzeContacts.findMany({
    where: (t, { and, eq, inArray }) =>
      and(eq(t.tenantId, tenantId), inArray(t.sourceIdentifier, sourceIdentifiers)),
    columns: {
      id: true,
      sourceIdentifier: true,
      contentHash: true,
      sourcePayloadHash: true,
      identityStatus: true,
      doNotProcess: true,
      processingStatus: true,
    },
  });

  return new Map(existing.map((row) => [row.sourceIdentifier, row]));
}

async function persistQuarantinedImportRows(
  rows: Array<{
    tenantId: string;
    batchId?: string | null;
    sourceType: "csv_import" | "excel_import" | "webhook" | "manual" | "api";
    sourceIdentifier: string;
    metadata: Record<string, unknown>;
    auditEscapedRow: Record<string, unknown>;
    sanitizedPayload: Record<string, unknown> | null;
    violations: ImportRowViolation[];
    reasonCode: string;
    message: string;
    importExecution?: ImportExecutionContext | null;
  }>,
): Promise<void> {
  const persistedRows = rows
    .filter((row) => typeof row.batchId === "string" && row.batchId.length > 0)
    .map((row) => ({
      tenantId: row.tenantId,
      batchId: row.batchId as string,
      sessionId: row.importExecution?.sessionId ?? null,
      runtimeJobKey: row.importExecution?.runtimeJobKey ?? null,
      sourceType: row.sourceType,
      sourceIdentifier: row.sourceIdentifier,
      sheetName: getMetadataSheetName(row.metadata),
      worksheetRow: getMetadataWorksheetRow(row.metadata),
      globalRow: getMetadataRowNumber(row.metadata),
      fieldName: row.violations[0]?.fieldName ?? null,
      reasonCode: row.reasonCode,
      rowPayloadEscaped: row.auditEscapedRow,
      sanitizedPayload: row.sanitizedPayload,
      violations: row.violations,
      metadata: {
        ...row.metadata,
        message: row.message,
        hiddenViolationCount: row.violations.length,
      },
    }));

  if (persistedRows.length === 0) {
    return;
  }

  await db.insert(importRowQuarantine).values(persistedRows);
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

    svcLog.info({
      event: "bronze_identity_resolution",
      context: "ingest_insert",
      tenantId: String(sourceRow.tenantId),
      bronzeContactId: insertedId,
      rowNumber,
      status: resolution.status,
      ...(resolution.status === "resolved" ? { companyId: resolution.companyId } : {}),
      ...(resolution.status === "duplicate_source"
        ? { companyId: resolution.companyId, duplicateOfId: resolution.duplicateOfId }
        : {}),
      ...(resolution.status === "identity_conflict"
        ? { conflictCompanyCount: resolution.conflictCompanyIds.length }
        : {}),
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
    const rowCtx = ingestRowSourceContext(sourceRow.metadata);
    const enr = enrichError(error, {
      insertedId,
      tenantId: String(sourceRow.tenantId),
      rowNumber,
      ...rowCtx,
    });
    const message = truncateErrorMessage(getErrorMessage(error));
    svcLog.error(
      {
        event: "ingest_row_identity_resolution_failed",
        err: error,
        fingerprint: enr.fingerprint,
        errorType: enr.errorType,
        insertedId,
        rowNumber,
        batchId: rowCtx.batchId,
        fileName: rowCtx.fileName,
        errorDetail: message,
      },
      "resolveInsertedBronzeRow identity resolution failed",
    );
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
    quarantineRows: 0,
    sanitizedRows: 0,
    invariantConflictRows: 0,
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

function getRawPayloadObject(value: unknown): Record<string, unknown> | null {
  return isPlainObject(value) ? value : null;
}

function createSourceIdentifierHashConflictMessage(sourceIdentifier: string): string {
  return truncateErrorMessage(
    `Source identifier conflict for ${sourceIdentifier}: existing row has a different payload hash`,
  );
}

function createHashConflictQuarantineRow(
  sourceRow: BronzeContactInsert,
  tenantId: string,
  context: InsertBronzePayloadContext,
): QuarantinedImportRow {
  const metadata = (sourceRow.metadata as Record<string, unknown> | undefined) ?? {};
  const rawPayload = getRawPayloadObject(sourceRow.rawPayload);

  return {
    tenantId,
    batchId: context.batchId ?? null,
    sourceType: context.sourceType,
    sourceIdentifier: String(sourceRow.sourceIdentifier),
    metadata,
    auditEscapedRow: rawPayload ?? {},
    sanitizedPayload: rawPayload,
    violations: [
      {
        action: "quarantined",
        codePoint: "HASH_CONFLICT",
        count: 1,
        fieldName: "sourceIdentifier",
        path: "sourceIdentifier",
      },
    ],
    reasonCode: "source_identifier_hash_conflict",
    message: createSourceIdentifierHashConflictMessage(String(sourceRow.sourceIdentifier)),
    importExecution: context.importExecution ?? null,
  };
}

function applySourceIdentifierHashConflict(
  result: BronzeInsertResult,
  sourceRow: BronzeContactInsert,
): void {
  const metadata = (sourceRow.metadata as Record<string, unknown> | undefined) ?? {};
  result.errorRows += 1;
  result.quarantineRows += 1;
  result.invariantConflictRows += 1;
  result.rowErrors.push({
    rowNumber: getMetadataRowNumber(metadata),
    message: createSourceIdentifierHashConflictMessage(String(sourceRow.sourceIdentifier)),
  });
}

async function prehandleExistingBronzeRows(
  payload: BronzeContactInsert[],
  context: InsertBronzePayloadContext,
): Promise<ExistingBronzePrehandleResult> {
  const tenantId = String(payload[0]?.tenantId ?? "");
  const existingBySourceIdentifier = await loadExistingBronzeContactsBySourceIdentifier(
    tenantId,
    payload.map((row) => String(row.sourceIdentifier)),
  );
  const rowsToInsert: BronzeContactInsert[] = [];
  const prehandledResult = createEmptyBronzeInsertResult();
  const quarantinedRows: QuarantinedImportRow[] = [];

  for (const sourceRow of payload) {
    const existing = existingBySourceIdentifier.get(String(sourceRow.sourceIdentifier));
    if (!existing) {
      rowsToInsert.push(sourceRow);
      continue;
    }

    prehandledResult.rowsRead += 1;

    if (
      existing.contentHash === sourceRow.contentHash &&
      existing.sourcePayloadHash === sourceRow.sourcePayloadHash
    ) {
      prehandledResult.duplicateRows += 1;
      if (isExistingBronzeProcessable(existing)) {
        prehandledResult.processableIds.push(existing.id);
      }
      continue;
    }

    quarantinedRows.push(createHashConflictQuarantineRow(sourceRow, tenantId, context));
    applySourceIdentifierHashConflict(prehandledResult, sourceRow);
  }

  return {
    rowsToInsert,
    quarantinedRows,
    prehandledResult,
  };
}

async function resolveInsertedBronzeRows(
  insertedRows: Array<{ id: string }>,
  rowsToInsert: BronzeContactInsert[],
): Promise<InsertedBronzeResolutionResult> {
  const processableIds: string[] = [];
  const rowErrors: Array<{ rowNumber: number | null; message: string }> = [];
  let duplicateRows = 0;
  let resolvedRows = 0;
  let identityConflictRows = 0;
  let insufficientIdentifierRows = 0;

  for (const [index, inserted] of insertedRows.entries()) {
    const sourceRow = rowsToInsert[index];
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

  return {
    rowsRead: rowsToInsert.length,
    rowsInserted: Math.max(0, insertedRows.length - duplicateRows - errorRows),
    insertedIds: insertedRows.map((row) => row.id),
    processableIds,
    errorRows,
    duplicateRows,
    quarantineRows: 0,
    sanitizedRows: 0,
    invariantConflictRows: 0,
    resolvedRows,
    identityConflictRows,
    insufficientIdentifierRows,
    rowErrors,
  };
}

async function insertAndResolveBronzePayload(
  rowsToInsert: BronzeContactInsert[],
): Promise<InsertedBronzeResolutionResult> {
  const insertedRows = await db
    .insert(bronzeContacts)
    .values(rowsToInsert)
    .returning({ id: bronzeContacts.id });

  return resolveInsertedBronzeRows(insertedRows, rowsToInsert);
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
    quarantineRows: left.quarantineRows + right.quarantineRows,
    sanitizedRows: left.sanitizedRows + right.sanitizedRows,
    invariantConflictRows: left.invariantConflictRows + right.invariantConflictRows,
    resolvedRows: left.resolvedRows + right.resolvedRows,
    identityConflictRows: left.identityConflictRows + right.identityConflictRows,
    insufficientIdentifierRows: left.insufficientIdentifierRows + right.insufficientIdentifierRows,
    rowErrors: [...left.rowErrors, ...right.rowErrors],
  };
}

async function insertBronzePayloadSafely(
  payload: BronzeContactInsert[],
  context: InsertBronzePayloadContext,
): Promise<BronzeInsertResult> {
  if (payload.length === 0) {
    return createEmptyBronzeInsertResult();
  }

  const { rowsToInsert, quarantinedRows, prehandledResult } = await prehandleExistingBronzeRows(
    payload,
    context,
  );

  await persistQuarantinedImportRows(quarantinedRows);

  if (rowsToInsert.length === 0) {
    return prehandledResult;
  }

  try {
    const insertedResult = await insertAndResolveBronzePayload(rowsToInsert);
    return mergeBronzeInsertResults(prehandledResult, insertedResult);
  } catch (error) {
    const splitCtx = {
      rowsToInsert: rowsToInsert.length,
      batchId: context.batchId,
      sourceType: context.sourceType,
    };
    if (!shouldSplitInsertBatch(error, rowsToInsert.length)) {
      const enr = enrichError(error, splitCtx);
      svcLog.error({ err: error, ...enr }, "insertBronzePayloadSafely failed (non-splittable)");
      throw error;
    }

    if (rowsToInsert.length === 1) {
      const enr = enrichError(error, splitCtx);
      svcLog.warn({ err: error, ...enr }, "insertBronzePayloadSafely single-row insert failed");
      return mergeBronzeInsertResults(
        prehandledResult,
        createSingleRowInsertFailure(rowsToInsert, error),
      );
    }

    const mid = Math.ceil(rowsToInsert.length / 2);
    const left = await insertBronzePayloadSafely(rowsToInsert.slice(0, mid), context);
    const right = await insertBronzePayloadSafely(rowsToInsert.slice(mid), context);

    return mergeBronzeInsertResults(prehandledResult, mergeBronzeInsertResults(left, right));
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
  const payload: BronzeContactInsert[] = [];
  const quarantinedRows: Array<Parameters<typeof persistQuarantinedImportRows>[0][number]> = [];
  const preflightResult = createEmptyBronzeInsertResult();

  for (const [index, row] of rows.entries()) {
    const rowCoordinate = options?.rowCoordinates?.[index];
    const globalRow =
      rowCoordinate?.globalRow ??
      rowCoordinate?.rowNumber ??
      (options?.startingRowNumber ?? 1) + index;
    const worksheetRow = rowCoordinate?.worksheetRow ?? rowCoordinate?.rowNumber ?? globalRow;
    const sanitizedInspection = inspectAndSanitizeRow(row);
    const sanitizedRow = sanitizedInspection.sanitizedRow;
    const mappedRow = normalizeRow(sanitizedRow, columnMapping);
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

    const metadata = {
      batchId: batchId ?? null,
      sourceType,
      sheetName: sheetName ?? null,
      rowNumber: globalRow,
      worksheetRow,
      globalRow,
      importedAt: new Date().toISOString(),
      columnMapping,
      controlCharSanitization:
        sanitizedInspection.removedControlCount > 0
          ? {
              removedControlCount: sanitizedInspection.removedControlCount,
              violations: sanitizedInspection.violations.filter(
                (violation) => violation.action === "removed",
              ),
            }
          : undefined,
    };
    const sourceIdentifier = `${sourceType}:${batchId ?? "adhoc"}:${sheetName ?? "default"}:${globalRow}`;

    if (sanitizedInspection.removedControlCount > 0) {
      preflightResult.sanitizedRows += 1;
    }

    if (sanitizedInspection.quarantinedControlCount > 0) {
      const message = truncateErrorMessage(
        `Row contains disallowed control characters in ${sanitizedInspection.firstQuarantineField ?? "unknown field"}`,
      );
      quarantinedRows.push({
        tenantId,
        batchId: batchId ?? null,
        sourceType,
        sourceIdentifier,
        metadata,
        auditEscapedRow: sanitizedInspection.auditEscapedRow,
        sanitizedPayload: sanitizedRow,
        violations: sanitizedInspection.violations,
        reasonCode: "disallowed_control_character",
        message,
        importExecution: options?.importExecution ?? null,
      });
      preflightResult.rowsRead += 1;
      preflightResult.errorRows += 1;
      preflightResult.quarantineRows += 1;
      preflightResult.rowErrors.push({
        rowNumber: globalRow,
        message,
      });
      continue;
    }

    payload.push({
      tenantId,
      sourceType,
      sourceIdentifier,
      rawPayload: sanitizedRow,
      contentHash: createHash("sha256")
        .update(
          JSON.stringify(
            sanitizedRow,
            Object.keys(sanitizedRow).sort((a, b) => a.localeCompare(b)),
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
      metadata,
    });
  }

  await persistQuarantinedImportRows(quarantinedRows);

  const result = await insertBronzePayloadSafely(payload, {
    batchId,
    importExecution: options?.importExecution ?? null,
    sourceType,
  });
  const mergedResult = mergeBronzeInsertResults(preflightResult, result);
  if (result.rowsInserted > 0) {
    bronzeContactsIngestedTotal.inc(
      { source: sourceType, tenant_id: tenantId },
      result.rowsInserted,
    );
  }
  return mergedResult;
}

const NORMALIZATION_BULK_CHUNK_SIZE = 500;

/**
 * Maps each normalization queue name to the canonical worker label used for
 * BullMQ job telemetry, runtime topology, and structured logging.
 *
 * Declared as a module-level constant so the mapping is co-located with the
 * queue definitions, is O(1), and avoids nested ternaries inside hot loop
 * bodies (S3358 / S3776).
 */
const NORMALIZATION_WORKER_BY_QUEUE: ReadonlyMap<string, string> = new Map([
  [QUEUES.NORMALIZE_NAME, "B1:name-normalizer"],
  [QUEUES.NORMALIZE_EMAIL, "B2:email-normalizer"],
  [QUEUES.NORMALIZE_PHONE, "B3:phone-normalizer"],
  [QUEUES.NORMALIZE_ADDRESS, "B4:address-normalizer"],
]);

function resolveNormalizerWorkerName(queueName: string): string {
  const workerName = NORMALIZATION_WORKER_BY_QUEUE.get(queueName);
  if (!workerName) {
    throw new Error(
      `[ingest-utils] Unknown normalization queue "${queueName}". Update NORMALIZATION_WORKER_BY_QUEUE.`,
    );
  }
  return workerName;
}

export async function triggerNormalizationForContacts(
  tenantId: string,
  bronzeContactIds: string[],
  correlationId?: string,
  batchId?: string,
  importExecution?: ImportExecutionContext | null,
): Promise<void> {
  if (bronzeContactIds.length === 0) return;
  const targetQueues = [
    QUEUES.NORMALIZE_NAME,
    QUEUES.NORMALIZE_EMAIL,
    QUEUES.NORMALIZE_PHONE,
    QUEUES.NORMALIZE_ADDRESS,
  ] as const;

  for (const queueName of targetQueues) {
    for (let i = 0; i < bronzeContactIds.length; i += NORMALIZATION_BULK_CHUNK_SIZE) {
      const chunk = bronzeContactIds.slice(i, i + NORMALIZATION_BULK_CHUNK_SIZE);
      await enqueueImportJobBulk({
        queueName,
        parentImportExecution: importExecution ?? null,
        workerName: resolveNormalizerWorkerName(queueName),
        stageKey: "normalization",
        sessionKind: "ingest",
        items: chunk.map((bronzeContactId) => ({
          jobName: "normalize",
          payload: { tenantId, bronzeContactId, correlationId, batchId },
          opts: {
            jobId: `${queueName}-${bronzeContactId}`,
            attempts: 2,
            backoff: { type: "fixed" as const, delay: 500 },
          },
          entityType: "bronze_contact",
          entityId: bronzeContactId,
          contactId: bronzeContactId,
          idempotencyScope: `${queueName}-${bronzeContactId}`,
        })),
      });
    }
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

  if (args.status === "completed") {
    const [batchRow] = await db
      .select({ metadata: bronzeImportBatches.metadata })
      .from(bronzeImportBatches)
      .where(eq(bronzeImportBatches.id, args.batchId))
      .limit(1);
    const meta = (batchRow?.metadata as Record<string, unknown> | null) ?? {};
    const correlationRaw = meta.correlationId;
    const correlationId =
      typeof correlationRaw === "string" && correlationRaw.trim().length > 0
        ? correlationRaw.trim()
        : undefined;
    await logEnrichmentAudit({
      tenantId: args.tenantId,
      entityType: "bronze_import_batch",
      entityId: args.batchId,
      source: "ingest-utils",
      operation: "import_batch_completed",
      status: "success",
      newValues: {
        processedRows: args.processedRows,
        successRows: args.successRows,
        errorRows: args.errorRows,
        duplicateRows: args.duplicateRows,
        totalRows: args.totalRows ?? null,
        fileName: meta.fileName ?? null,
        sourceType: meta.sourceType ?? null,
      },
      correlationId,
    });
  }
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

  const [batchRow] = await db
    .select({ metadata: bronzeImportBatches.metadata })
    .from(bronzeImportBatches)
    .where(eq(bronzeImportBatches.id, args.batchId))
    .limit(1);
  const meta = (batchRow?.metadata as Record<string, unknown> | null) ?? {};
  const correlationRaw = meta.correlationId;
  const correlationId =
    typeof correlationRaw === "string" && correlationRaw.trim().length > 0
      ? correlationRaw.trim()
      : undefined;
  const enr = enrichError(new Error(args.errorMessage), {
    batchId: args.batchId,
    processedRows: args.processedRows,
  });
  await logEnrichmentAudit({
    tenantId: args.tenantId,
    entityType: "bronze_import_batch",
    entityId: args.batchId,
    source: "ingest-utils",
    operation: "import_batch_failed",
    status: "failed",
    newValues: {
      processedRows: args.processedRows,
      successRows: args.successRows,
      errorRows: args.errorRows,
      duplicateRows: args.duplicateRows,
      totalRows: args.totalRows ?? null,
    },
    correlationId,
    errorMessage: truncateErrorMessage(args.errorMessage, 4000),
    errorCode: enr.errorCode,
  });
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
  importExecution?: ImportExecutionContext | null,
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
    svcLog.info(
      {
        contactsWithCui: contactsWithCui.length,
        uniqueCuis: allCuis.length,
        duplicateCuiCount,
      },
      "Deduped duplicate CUIs before ANAF bronze enrichment batch enqueue",
    );
  }

  const nrRegComOnlyIds = contactsNrRegComOnly.map((c) => c.id);
  const totalBatches = Math.ceil(allCuis.length / ANAF_BATCH_SIZE);
  for (let i = 0; i < totalBatches; i++) {
    const cuiChunk = allCuis.slice(i * ANAF_BATCH_SIZE, (i + 1) * ANAF_BATCH_SIZE);
    const chunkBronzeIds = collectBronzeIdsForChunk(
      cuiChunk,
      cuiToBronzeIds,
      nrRegComOnlyIds,
      i === 0,
    );
    await enqueueImportJob({
      queueName: QUEUES.ENRICH_BRONZE_ANAF,
      jobName: "anaf-bronze-enrich",
      payload: {
        tenantId,
        batchId,
        cuiList: cuiChunk,
        bronzeContactIds: chunkBronzeIds,
        correlationId: correlationId ?? batchId,
        batchIndex: i,
        totalBatches,
      },
      opts: {
        jobId: `anaf-bronze-${batchId}-${i}`,
        delay: i * ANAF_BATCH_DELAY_MS,
        attempts: 5,
        backoff: { type: "exponential", delay: 1000 },
      },
      parentImportExecution: importExecution ?? null,
      workerName: "B5:anaf-bronze-enricher",
      stageKey: "anaf_bronze",
      entityType: "batch",
      entityId: `${batchId}:${i}`,
      sessionKind: "ingest",
      idempotencyScope: `anaf-bronze-${batchId}-${i}`,
    });
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
