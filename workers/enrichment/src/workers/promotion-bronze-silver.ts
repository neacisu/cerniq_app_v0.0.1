import { setTimeout as delay } from "node:timers/promises";
import { type Job, type Processor } from "bullmq";
import {
  db,
  bronzeContacts,
  bronzeImportBatches,
  setSessionTenantId,
  silverCompanies,
  silverContacts,
  silverDatoriiAnaf,
  silverBpiActe,
  silverCipIncidente,
  silverDosare,
  silverPartiDosare,
  silverTermeneDosare,
  sql,
  computeStableSourcePayloadHash,
  resolveBronzeContactIdentity,
  upsertCompanyIdentityKey,
  batchIdMetadataEquals,
  failedReprocessContactEquals,
} from "@cerniq/db";
import { createQueue, sanitizeNrRegCom, QUEUES, validateJobData } from "@cerniq/worker-shared";
import { sanitizeCui } from "../lib/cui-validation.js";
import { normalizeRow } from "./ingest-utils.js";
import { createHitlApprovalTask } from "./pipeline-utils.js";
import { z } from "zod";

export type PromotionBronzeSilverJobData = {
  tenantId: string;
  bronzeContactId?: string;
  batchId?: string;
  correlationId?: string;
  reprocessErrorsOnly?: boolean;
};

const promotionBronzeSilverJobDataSchema = z
  .object({
    tenantId: z.uuid(),
    bronzeContactId: z.uuid().optional(),
    batchId: z.uuid().optional(),
    correlationId: z.string().trim().min(1).optional(),
    reprocessErrorsOnly: z.boolean().optional(),
  })
  .refine((data) => Boolean(data.bronzeContactId || data.batchId), {
    message: "Either bronzeContactId or batchId must be provided",
    path: ["bronzeContactId"],
  });

const CONTACT_REPROCESS_MAX_ATTEMPTS = 3;
const CONTACT_REPROCESS_RETRY_DELAYS_MS = [12_000, 24_000, 36_000] as const;
const REPROCESS_ERROR_HISTORY_LIMIT = 10;
const JOB_HEARTBEAT_MIN_INTERVAL_MS = 10_000;
const JOB_HEARTBEAT_CONTACT_INTERVAL = 25;

const NEXT_ENRICHMENT_QUEUES = [
  QUEUES.ENRICH_ANAF_FISCAL_STATUS,
  QUEUES.ENRICH_ANAF_TVA_STATUS,
  QUEUES.ENRICH_ANAF_EFACTURA,
  QUEUES.ENRICH_ANAF_DATORII,
  QUEUES.ENRICH_ANAF_CAEN,
  QUEUES.ENRICH_TERMENE_BALANCE,
  QUEUES.ENRICH_TERMENE_RISK,
  QUEUES.ENRICH_TERMENE_DOSARE,
  QUEUES.ENRICH_TERMENE_ACTIONARI,
  QUEUES.ENRICH_ONRC_DATA,
  QUEUES.ENRICH_ONRC_ADMINISTRATORI,
  QUEUES.ENRICH_ONRC_SEDII,
  QUEUES.DISCOVER_EMAIL_HUNTER,
  QUEUES.DISCOVER_EMAIL_PATTERN,
] as const;

type Payload = Record<string, unknown>;
type Mapping = Record<string, string>;
type SheetType =
  | "company"
  | "anaf_debts"
  | "bpi"
  | "cip"
  | "dosare"
  | "parti_dosare"
  | "termene_dosare";

type SilverCompanyRow = typeof silverCompanies.$inferSelect;
type BronzeContactRow = typeof bronzeContacts.$inferSelect;

function stringifyUnknownForLog(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Error) {
    return value.message;
  }
  try {
    const serialized = JSON.stringify(value);
    if (serialized) {
      return serialized;
    }
  } catch {
    // Fall through to a stable tag if the value is not JSON-serializable.
  }
  return Object.prototype.toString.call(value);
}

function coerceUnknownToText(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return null;
}

function readErrorCode(error: unknown): string {
  if (error && typeof error === "object") {
    if ("code" in error && error.code) {
      return stringifyUnknownForLog(error.code);
    }
    if (
      "cause" in error &&
      error.cause &&
      typeof error.cause === "object" &&
      "code" in error.cause
    ) {
      const causeCode = (error.cause as { code?: unknown }).code;
      if (causeCode) {
        return stringifyUnknownForLog(causeCode);
      }
    }
  }
  return "";
}

function resolveCauseMessage(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  if (cause != null) return stringifyUnknownForLog(cause);
  return "";
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const causeMessage = resolveCauseMessage(error.cause);
    return causeMessage ? `${error.message} | cause: ${causeMessage}` : error.message;
  }
  return stringifyUnknownForLog(error);
}

function isRetriableBatchMetadataError(error: unknown): boolean {
  const code = readErrorCode(error);
  const message = readErrorMessage(error).toLowerCase();

  return (
    code === "40001" ||
    code === "40p01" ||
    code === "08003" ||
    code === "08006" ||
    code === "57p01" ||
    code === "57p02" ||
    code === "53300" ||
    message.includes("could not serialize access") ||
    message.includes("deadlock detected") ||
    message.includes("connection terminated") ||
    message.includes("connection reset") ||
    message.includes("econnreset") ||
    message.includes("terminating connection") ||
    message.includes("timeout")
  );
}

async function withBatchMetadataRetry<T>(
  tenantId: string,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await setSessionTenantId(tenantId);
      return await fn();
    } catch (error) {
      if (!isRetriableBatchMetadataError(error) || attempt === maxAttempts) {
        throw error;
      }

      const delayMs = Math.min(100 * 2 ** (attempt - 1), 2000);
      console.warn(
        `[promotion-bronze-silver] retrying ${operation} for tenant ${tenantId} (attempt ${attempt}/${maxAttempts}): ${readErrorMessage(error)}`,
      );
      await delay(delayMs);
    }
  }

  throw new Error(`Retry loop exhausted for ${operation}`);
}

function sqlTimestamp(value: string) {
  return sql`${value}::timestamptz`;
}

type ContactReprocessErrorEntry = {
  attempt: number;
  at: string;
  message: string;
};

async function updateBronzeContactMetadata(
  tenantId: string,
  bronzeId: string,
  mutate: (currentMetadata: Record<string, unknown>) => Record<string, unknown>,
  extraPatch?: Partial<typeof bronzeContacts.$inferInsert>,
) {
  await withBatchMetadataRetry(tenantId, "updateBronzeContactMetadata", async () => {
    const [contact] = await db
      .select({ metadata: bronzeContacts.metadata })
      .from(bronzeContacts)
      .where(sql`${bronzeContacts.tenantId} = ${tenantId} AND ${bronzeContacts.id} = ${bronzeId}`)
      .limit(1);

    const currentMetadata = (contact?.metadata as Record<string, unknown> | undefined) ?? {};
    const patch = extraPatch ?? undefined;

    const nextValues = patch
      ? { metadata: mutate(currentMetadata), updatedAt: new Date(), ...patch }
      : { metadata: mutate(currentMetadata), updatedAt: new Date() };

    await db
      .update(bronzeContacts)
      .set(nextValues)
      .where(sql`${bronzeContacts.tenantId} = ${tenantId} AND ${bronzeContacts.id} = ${bronzeId}`);
  });
}

async function recordContactReprocessFailure(args: {
  tenantId: string;
  bronzeId: string;
  batchId: string;
  attempt: number;
  error: unknown;
}) {
  const timestamp = new Date().toISOString();
  const message = readErrorMessage(args.error);

  await updateBronzeContactMetadata(
    args.tenantId,
    args.bronzeId,
    (currentMetadata) => {
      const currentError =
        currentMetadata.identityReprocessError &&
        typeof currentMetadata.identityReprocessError === "object"
          ? (currentMetadata.identityReprocessError as Record<string, unknown>)
          : {};
      const currentHistory = Array.isArray(currentError.errorHistory)
        ? (currentError.errorHistory as ContactReprocessErrorEntry[])
        : [];

      return {
        ...currentMetadata,
        identityReprocessError: {
          status: "failed",
          batchId: args.batchId,
          attempts: args.attempt,
          lastErrorAt: timestamp,
          lastErrorMessage: message,
          lastErrorStack: args.error instanceof Error ? (args.error.stack ?? null) : null,
          errorHistory: [
            ...currentHistory,
            { attempt: args.attempt, at: timestamp, message },
          ].slice(-REPROCESS_ERROR_HISTORY_LIMIT),
        },
      };
    },
    { processingStatus: "error" },
  );
}

async function clearContactReprocessFailure(args: { tenantId: string; bronzeId: string }) {
  const timestamp = new Date().toISOString();
  await updateBronzeContactMetadata(args.tenantId, args.bronzeId, (currentMetadata) => {
    const currentError =
      currentMetadata.identityReprocessError &&
      typeof currentMetadata.identityReprocessError === "object"
        ? (currentMetadata.identityReprocessError as Record<string, unknown>)
        : {};

    return {
      ...currentMetadata,
      identityReprocessError: {
        ...currentError,
        status: "resolved",
        resolvedAt: timestamp,
      },
    };
  });
}

async function loadFailedReprocessContactsSummary(tenantId: string, batchId: string) {
  await setSessionTenantId(tenantId);
  const failedContacts = await db.query.bronzeContacts.findMany({
    where: (t) =>
      sql`${t.tenantId} = ${tenantId}
        AND ${batchIdMetadataEquals(t.metadata, batchId)}
        AND ${failedReprocessContactEquals(t.metadata)}`,
    columns: {
      id: true,
      extractedName: true,
      metadata: true,
    },
    orderBy: (t) => [t.id],
  });

  return {
    count: failedContacts.length,
    generatedAt: new Date().toISOString(),
    samples: failedContacts.slice(0, 10).map((contact) => {
      const metadata = (contact.metadata as Record<string, unknown> | undefined) ?? {};
      const error =
        metadata.identityReprocessError && typeof metadata.identityReprocessError === "object"
          ? (metadata.identityReprocessError as Record<string, unknown>)
          : {};
      return {
        contactId: contact.id,
        rowNumber: metadata.rowNumber ?? null,
        companyName: contact.extractedName ?? null,
        attempts: Number(error.attempts ?? 0),
        lastErrorMessage:
          typeof error.lastErrorMessage === "string" ? error.lastErrorMessage : null,
      };
    }),
  };
}

function normalizeKey(input: string): string {
  return input.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

function readTrimmedValue(value: unknown): string | null {
  const text = coerceUnknownToText(value)?.trim();
  if (!text) {
    return null;
  }
  return text.length > 0 ? text : null;
}

function findDirectFieldValue(payload: Payload, keys: string[]) {
  for (const key of keys) {
    const value = readTrimmedValue(payload[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

function findMappedFieldValue(payload: Payload, mapping: Mapping, canonicalKey: string) {
  for (const [original, mapped] of Object.entries(mapping)) {
    if (mapped !== canonicalKey) {
      continue;
    }
    const value = readTrimmedValue(payload[original]);
    if (value) {
      return value;
    }
  }
  return null;
}

function findNormalizedFieldValue(payload: Payload, keys: string[]) {
  const payloadLowerMap = new Map(
    Object.entries(payload).map(([key, value]) => [normalizeKey(key), value]),
  );
  for (const key of keys) {
    const value = readTrimmedValue(payloadLowerMap.get(normalizeKey(key)));
    if (value) {
      return value;
    }
  }
  return null;
}

export function resolveField(
  payload: Payload,
  mapping: Mapping,
  canonicalKey: string,
  ...aliases: string[]
): string | null {
  const keys = [canonicalKey, ...aliases];
  return (
    findDirectFieldValue(payload, keys) ??
    findMappedFieldValue(payload, mapping, canonicalKey) ??
    findNormalizedFieldValue(payload, keys)
  );
}

export function parseRomanianNumeric(value: unknown): string | null {
  const str = coerceUnknownToText(value)?.trim();
  if (!str) return null;
  if (!str || str === "-" || str.toLowerCase() === "n/a") return null;

  if (/^-?[\d.]+,\d{1,2}$/.test(str)) {
    return str.replaceAll(".", "").replaceAll(",", ".");
  }
  const cleaned = str.replaceAll(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-") return null;
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? String(num) : null;
}

export function parseIntSafe(value: unknown): number | null {
  const str = coerceUnknownToText(value)?.trim();
  if (!str) return null;
  if (!str || str === "-") return null;
  const n = Number.parseInt(str.replaceAll(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export function parseTimestampSafe(value: unknown): Date | null {
  const str = coerceUnknownToText(value)?.trim();
  if (!str) return null;
  if (!str) return null;
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function detectSheetType(sheetName: string | null, payloadKeys: string[]): SheetType {
  const sn = normalizeKey(sheetName ?? "");
  const keys = payloadKeys.map(normalizeKey);

  if (sn.includes("datoriianaf") || sn.includes("anaf")) return "anaf_debts";
  if (sn.includes("bpi") || sn.includes("insolventa")) return "bpi";
  if (sn.includes("cip") || sn.includes("incidente")) return "cip";
  if (/\bparti\b/.test(sn) || sn.includes("partidosare")) return "parti_dosare";
  if (sn.includes("termene")) return "termene_dosare";
  if (sn.includes("dosare") || sn.includes("litigii")) return "dosare";

  if (keys.some((k) => k.includes("tipbuget") || k.includes("sumarestanta"))) return "anaf_debts";
  if (keys.some((k) => k.includes("tipact") || k.includes("numaract"))) return "bpi";
  if (keys.some((k) => k.includes("tipinstrument") || k.includes("sumarefuzata"))) return "cip";
  if (keys.some((k) => k.includes("calitate")) && keys.some((k) => k.includes("dosar"))) {
    return "parti_dosare";
  }
  if (keys.some((k) => k.includes("datatermen") || k.includes("solutie"))) return "termene_dosare";
  if (keys.some((k) => k.includes("numardosar") || k.includes("obiectdosar"))) return "dosare";

  return "company";
}

async function findCompanyByIdentifiers(
  tenantId: string,
  cui: string | null,
  nrRegCom: string | null,
) {
  if (cui || nrRegCom) {
    const registryMatch = await db.query.companyIdentityKeys.findFirst({
      where: (t) =>
        sql`${t.tenantId} = ${tenantId}
          AND ${t.revokedAt} IS NULL
          AND (
            (${cui} IS NOT NULL AND ${t.keyType} = 'cui' AND ${t.keyValueCanonical} = ${cui})
            OR
            (${nrRegCom} IS NOT NULL AND ${t.keyType} = 'nr_reg_com' AND ${t.keyValueCanonical} = ${nrRegCom})
          )`,
    });

    if (registryMatch) {
      const byRegistry = await db.query.silverCompanies.findFirst({
        where: (t) => sql`${t.tenantId} = ${tenantId} AND ${t.id} = ${registryMatch.companyId}`,
      });
      if (byRegistry) return byRegistry;
    }
  }

  if (cui) {
    const byCui = await db.query.silverCompanies.findFirst({
      where: (t) =>
        sql`${t.tenantId} = ${tenantId} AND ${t.cui} = ${cui} AND COALESCE(${t.isMasterRecord}, TRUE) = TRUE`,
    });
    if (byCui) return byCui;
  }
  if (nrRegCom) {
    return db.query.silverCompanies.findFirst({
      where: (t) =>
        sql`${t.tenantId} = ${tenantId} AND ${t.nrRegCom} = ${nrRegCom} AND COALESCE(${t.isMasterRecord}, TRUE) = TRUE`,
    });
  }
  return undefined;
}

async function loadBatchMapping(tenantId: string, batchId: string | null): Promise<Mapping> {
  if (!batchId) return {};
  const batch = await withBatchMetadataRetry(tenantId, "loadBatchMapping", async () =>
    db.query.bronzeImportBatches.findFirst({
      where: (t) => sql`${t.tenantId} = ${tenantId} AND ${t.id} = ${batchId}`,
    }),
  );
  if (!batch?.metadata || typeof batch.metadata !== "object") return {};
  const mapping = (batch.metadata as Record<string, unknown>).columnMapping;
  return mapping && typeof mapping === "object" ? (mapping as Mapping) : {};
}

function getIdentityReprocessPatch(bronze: BronzeContactRow, payload: Payload, mapping: Mapping) {
  const normalizedPayload = normalizeRow(payload, mapping) as Payload;
  const rawCui =
    resolveField(normalizedPayload, {}, "cui", "CUI", "cif", "cod_fiscal") ??
    bronze.extractedCuiRaw ??
    bronze.extractedCui;
  const rawNrRegCom =
    resolveField(
      normalizedPayload,
      {},
      "nrRegistru",
      "nr reg com",
      "Nr reg com",
      "nr_reg_com",
      "Nr. RC.",
    ) ??
    bronze.extractedNrRegComRaw ??
    bronze.extractedNrRegCom;
  const { cui, nrRegCom } = sanitizeIdentifiers(rawCui, rawNrRegCom);
  const sourcePayloadHash = computeStableSourcePayloadHash(normalizedPayload);

  return {
    normalizedPayload,
    patch: {
      sourcePayloadHash,
      extractedCuiRaw: rawCui,
      extractedCui: cui,
      extractedNrRegComRaw: rawNrRegCom,
      extractedNrRegCom: nrRegCom,
      extractedName:
        bronze.extractedName ??
        resolveField(normalizedPayload, {}, "companyName", "denumire", "Denumire Firma", "name"),
      extractedEmail:
        bronze.extractedEmail ??
        resolveField(normalizedPayload, {}, "email", "Email", "email_address", "mail"),
      extractedPhone:
        bronze.extractedPhone ??
        resolveField(normalizedPayload, {}, "phone", "telefon", "Telefon MF", "mobile"),
      extractedAddress:
        bronze.extractedAddress ??
        resolveField(normalizedPayload, {}, "address", "adresa", "Adresa ANAF"),
      extractedJudet:
        bronze.extractedJudet ?? resolveField(normalizedPayload, {}, "judet", "Judet", "county"),
      extractedLocalitate:
        bronze.extractedLocalitate ??
        resolveField(normalizedPayload, {}, "localitate", "Localitate", "oras", "city"),
      extractedCaen:
        bronze.extractedCaen ??
        resolveField(normalizedPayload, {}, "caen", "CAEN", "cod_caen", "nace code"),
    },
  };
}

async function backfillBronzeIdentityFields(
  bronze: BronzeContactRow,
  payload: Payload,
  mapping: Mapping,
): Promise<{ identityFieldsChanged: boolean }> {
  const { patch } = getIdentityReprocessPatch(bronze, payload, mapping);

  const identityFieldsChanged =
    patch.extractedCui !== bronze.extractedCui ||
    patch.extractedNrRegCom !== bronze.extractedNrRegCom;

  const hasChanges = Object.entries(patch).some(
    ([key, value]) => bronze[key as keyof BronzeContactRow] !== value,
  );

  if (!hasChanges) {
    return { identityFieldsChanged: false };
  }

  await db
    .update(bronzeContacts)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(sql`${bronzeContacts.id} = ${bronze.id}`);

  return { identityFieldsChanged };
}

async function ensureIdentityConflictApprovalTask(
  tenantId: string,
  bronze: BronzeContactRow,
  conflictCompanyIds: string[],
) {
  const existingTask = await db.query.approvalTasks.findFirst({
    where: (t) =>
      sql`${t.tenantId} = ${tenantId}
        AND ${t.entityType} = 'bronze_contact'
        AND ${t.entityId} = ${bronze.id}
        AND ${t.approvalType} = 'identity_conflict'
        AND ${t.status} IN ('pending', 'assigned', 'escalated')`,
    columns: { id: true },
  });

  if (existingTask) {
    return;
  }

  await createHitlApprovalTask({
    tenantId,
    entityType: "bronze_contact",
    entityId: bronze.id,
    type: "identity_conflict",
    title: "Conflict de identitate companie la reprocesare",
    description:
      "CUI și/sau Nr. Reg. Com. rezolvă companii diferite sau intră în conflict cu registry-ul canonic.",
    urgency: "high",
    metadata: {
      bronzeContactId: bronze.id,
      companyIds: conflictCompanyIds,
      sourcePayloadHash: bronze.sourcePayloadHash,
      extractedCui: bronze.extractedCui ?? null,
      extractedCuiRaw: bronze.extractedCuiRaw ?? null,
      extractedNrRegCom: bronze.extractedNrRegCom ?? null,
      extractedNrRegComRaw: bronze.extractedNrRegComRaw ?? null,
      source: "batch_reprocess",
    },
  });
}

type ReprocessPhase = "resolve_identities" | "queue_promotions";

type ReprocessCheckpoint = {
  metadata: Record<string, unknown>;
  batchTotalRows: number;
  phase: ReprocessPhase;
  cursorCreatedAt: string | null;
  cursorLastBronzeId: string | null;
  promotionCursorCreatedAt: string | null;
  promotionCursorLastBronzeId: string | null;
  processed: number;
  resolved: number;
  duplicateSource: number;
  identityConflict: number;
  insufficientIdentifiers: number;
  promotionQueued: number;
  failedContacts: number;
};

type ReprocessRunCounters = {
  processed: number;
  resolved: number;
  duplicateSource: number;
  identityConflict: number;
  insufficientIdentifiers: number;
  promotionQueued: number;
  failedContacts: number;
};

type BatchProgressReporter = {
  force: (payload?: Record<string, unknown>) => Promise<void>;
  maybeReportContactProgress: (
    counters: ReprocessRunCounters,
    phase: ReprocessPhase,
    lastBronzeId: string,
  ) => Promise<void>;
  maybeReportPromotionProgress: (queued: number, lastQueuedId: string) => Promise<void>;
};

function createBatchProgressReporter(
  job: Job<PromotionBronzeSilverJobData> | undefined,
): BatchProgressReporter {
  let lastHeartbeatAt = 0;
  let lastProcessedCount = -1;
  let lastQueuedCount = -1;

  async function sendProgress(payload: Record<string, unknown>) {
    if (!job) {
      return;
    }

    lastHeartbeatAt = Date.now();
    try {
      await job.updateProgress({
        ...payload,
        heartbeatAt: new Date(lastHeartbeatAt).toISOString(),
      });
    } catch (error) {
      console.warn(
        `[promotion-bronze-silver] failed to update job progress for ${String(job.id)}: ${readErrorMessage(error)}`,
      );
    }
  }

  return {
    async force(payload = {}) {
      await sendProgress(payload);
    },
    async maybeReportContactProgress(counters, phase, lastBronzeId) {
      const now = Date.now();
      const shouldReportByCount = counters.processed % JOB_HEARTBEAT_CONTACT_INTERVAL === 0;
      const shouldReportByTime = now - lastHeartbeatAt >= JOB_HEARTBEAT_MIN_INTERVAL_MS;

      if (
        counters.processed === lastProcessedCount ||
        (!shouldReportByCount && !shouldReportByTime)
      ) {
        return;
      }

      lastProcessedCount = counters.processed;
      await sendProgress({
        phase,
        processed: counters.processed,
        resolved: counters.resolved,
        duplicateSource: counters.duplicateSource,
        identityConflict: counters.identityConflict,
        insufficientIdentifiers: counters.insufficientIdentifiers,
        failedContacts: counters.failedContacts,
        lastBronzeId,
      });
    },
    async maybeReportPromotionProgress(queued, lastQueuedId) {
      const now = Date.now();
      if (queued === lastQueuedCount || now - lastHeartbeatAt < JOB_HEARTBEAT_MIN_INTERVAL_MS) {
        return;
      }

      lastQueuedCount = queued;
      await sendProgress({
        phase: "queue_promotions",
        queued,
        lastQueuedId,
      });
    },
  };
}

async function processOneBronzeContact(
  bronze: BronzeContactRow,
  mapping: Mapping,
  tenantId: string,
  counters: ReprocessRunCounters,
): Promise<void> {
  const payload = bronze.rawPayload as Payload;
  const { identityFieldsChanged } = await backfillBronzeIdentityFields(bronze, payload, mapping);

  if (bronze.identityStatus === "resolved" && !identityFieldsChanged) {
    counters.resolved += 1;
    return;
  }

  const resolution = await resolveBronzeContactIdentity({
    tenantId,
    bronzeContactId: bronze.id,
    sourceAuthority: "import",
  });
  if (resolution.status === "resolved") {
    counters.resolved += 1;
    return;
  }
  if (resolution.status === "duplicate_source") {
    counters.duplicateSource += 1;
    return;
  }
  if (resolution.status === "insufficient_identifiers") {
    counters.insufficientIdentifiers += 1;
    return;
  }
  counters.identityConflict += 1;
  await ensureIdentityConflictApprovalTask(tenantId, bronze, resolution.conflictCompanyIds);
}

async function processOneBronzeContactWithRetries(
  bronze: BronzeContactRow,
  mapping: Mapping,
  tenantId: string,
  batchId: string,
  counters: ReprocessRunCounters,
): Promise<void> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= CONTACT_REPROCESS_MAX_ATTEMPTS; attempt += 1) {
    try {
      await processOneBronzeContact(bronze, mapping, tenantId, counters);
      await clearContactReprocessFailure({ tenantId, bronzeId: bronze.id });
      counters.processed += 1;
      return;
    } catch (error) {
      lastError = error;
      await recordContactReprocessFailure({
        tenantId,
        bronzeId: bronze.id,
        batchId,
        attempt,
        error,
      });

      if (attempt < CONTACT_REPROCESS_MAX_ATTEMPTS) {
        await delay(CONTACT_REPROCESS_RETRY_DELAYS_MS[attempt - 1]);
        continue;
      }
    }
  }

  counters.processed += 1;
  counters.failedContacts += 1;
  console.error(
    `[promotion-bronze-silver] contact ${bronze.id} failed after ${CONTACT_REPROCESS_MAX_ATTEMPTS} attempts in batch ${batchId}: ${readErrorMessage(lastError)}`,
  );
}

function readReprocessNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function rebuildFullRunCheckpointFromCursor(
  tenantId: string,
  batchId: string,
  args: {
    cursorCreatedAt: string | null;
    cursorLastBronzeId: string | null;
    batchTotalRows: number;
    phase: ReprocessPhase;
    promotionCursorCreatedAt: string | null;
    promotionCursorLastBronzeId: string | null;
    failedContacts: number;
    metadata: Record<string, unknown>;
  },
): Promise<ReprocessCheckpoint> {
  if (!args.cursorCreatedAt || !args.cursorLastBronzeId) {
    return {
      metadata: args.metadata,
      batchTotalRows: args.batchTotalRows,
      phase: args.phase,
      cursorCreatedAt: null,
      cursorLastBronzeId: null,
      promotionCursorCreatedAt: args.promotionCursorCreatedAt,
      promotionCursorLastBronzeId: args.promotionCursorLastBronzeId,
      processed: 0,
      resolved: 0,
      duplicateSource: 0,
      identityConflict: 0,
      insufficientIdentifiers: 0,
      promotionQueued: 0,
      failedContacts: args.failedContacts,
    };
  }

  await setSessionTenantId(tenantId);
  const [row] = await db
    .select({
      processed: sql<number>`COUNT(*)`,
      resolved: sql<number>`COUNT(*) FILTER (WHERE ${bronzeContacts.identityStatus} = 'resolved')`,
      duplicateSource: sql<number>`COUNT(*) FILTER (WHERE ${bronzeContacts.identityStatus} = 'duplicate_source')`,
      identityConflict: sql<number>`COUNT(*) FILTER (WHERE ${bronzeContacts.identityStatus} = 'identity_conflict')`,
      insufficientIdentifiers: sql<number>`COUNT(*) FILTER (WHERE ${bronzeContacts.identityStatus} = 'insufficient_identifiers')`,
    })
    .from(bronzeContacts)
    .where(
      sql`${bronzeContacts.tenantId} = ${tenantId}
        AND ${batchIdMetadataEquals(bronzeContacts.metadata, batchId)}
        AND (
          ${bronzeContacts.createdAt} < ${sqlTimestamp(args.cursorCreatedAt)}
          OR (
            ${bronzeContacts.createdAt} = ${sqlTimestamp(args.cursorCreatedAt)}
            AND ${bronzeContacts.id} <= ${args.cursorLastBronzeId}
          )
        )`,
    );

  return {
    metadata: args.metadata,
    batchTotalRows: args.batchTotalRows,
    phase: args.phase,
    cursorCreatedAt: args.cursorCreatedAt,
    cursorLastBronzeId: args.cursorLastBronzeId,
    promotionCursorCreatedAt: args.promotionCursorCreatedAt,
    promotionCursorLastBronzeId: args.promotionCursorLastBronzeId,
    processed: Number(row?.processed ?? 0),
    resolved: Number(row?.resolved ?? 0),
    duplicateSource: Number(row?.duplicateSource ?? 0),
    identityConflict: Number(row?.identityConflict ?? 0),
    insufficientIdentifiers: Number(row?.insufficientIdentifiers ?? 0),
    promotionQueued: Number(args.metadata.identityReprocessPromotionQueued ?? 0),
    failedContacts: args.failedContacts,
  };
}

async function loadBatchReprocessCheckpoint(
  tenantId: string,
  batchId: string,
): Promise<ReprocessCheckpoint> {
  const [batch] = await db
    .select({ metadata: bronzeImportBatches.metadata, totalRows: bronzeImportBatches.totalRows })
    .from(bronzeImportBatches)
    .where(
      sql`${bronzeImportBatches.tenantId} = ${tenantId} AND ${bronzeImportBatches.id} = ${batchId}`,
    )
    .limit(1);

  const metadata = (batch?.metadata as Record<string, unknown> | undefined) ?? {};
  const phase =
    metadata.identityReprocessPhase === "queue_promotions"
      ? "queue_promotions"
      : "resolve_identities";

  const baseCheckpoint: ReprocessCheckpoint = {
    metadata,
    batchTotalRows: Number(batch?.totalRows ?? 0),
    phase,
    cursorCreatedAt:
      typeof metadata.identityReprocessCursorCreatedAt === "string"
        ? metadata.identityReprocessCursorCreatedAt
        : null,
    cursorLastBronzeId:
      typeof metadata.identityReprocessCursorLastBronzeId === "string"
        ? metadata.identityReprocessCursorLastBronzeId
        : null,
    promotionCursorCreatedAt:
      typeof metadata.identityReprocessPromotionCursorCreatedAt === "string"
        ? metadata.identityReprocessPromotionCursorCreatedAt
        : null,
    promotionCursorLastBronzeId:
      typeof metadata.identityReprocessPromotionCursorLastBronzeId === "string"
        ? metadata.identityReprocessPromotionCursorLastBronzeId
        : null,
    processed: readReprocessNumber(metadata.identityReprocessProcessedRows),
    resolved: readReprocessNumber(metadata.identityReprocessResolvedRows),
    duplicateSource: readReprocessNumber(metadata.identityReprocessDuplicateSourceRows),
    identityConflict: readReprocessNumber(metadata.identityReprocessIdentityConflictRows),
    insufficientIdentifiers: readReprocessNumber(
      metadata.identityReprocessInsufficientIdentifierRows,
    ),
    promotionQueued: readReprocessNumber(metadata.identityReprocessPromotionQueued),
    failedContacts: readReprocessNumber(metadata.identityReprocessFailedContactCount),
  };

  const mode = metadata.identityReprocessMode === "errors_only" ? "errors_only" : "full";
  if (mode === "full") {
    try {
      return await rebuildFullRunCheckpointFromCursor(tenantId, batchId, baseCheckpoint);
    } catch (error) {
      console.error(
        `[promotion-bronze-silver] failed to rebuild checkpoint for batch ${batchId}; falling back to persisted metadata: ${readErrorMessage(error)}`,
      );
    }
  }

  return baseCheckpoint;
}

async function loadCompletedFullRunMetrics(tenantId: string, batchId: string) {
  await setSessionTenantId(tenantId);
  const [row] = await db
    .select({
      processed: sql<number>`COUNT(*)`,
      resolved: sql<number>`COUNT(*) FILTER (WHERE ${bronzeContacts.identityStatus} = 'resolved')`,
      duplicateSource: sql<number>`COUNT(*) FILTER (WHERE ${bronzeContacts.identityStatus} = 'duplicate_source')`,
      identityConflict: sql<number>`COUNT(*) FILTER (WHERE ${bronzeContacts.identityStatus} = 'identity_conflict')`,
      insufficientIdentifiers: sql<number>`COUNT(*) FILTER (WHERE ${bronzeContacts.identityStatus} = 'insufficient_identifiers')`,
      failedContacts: sql<number>`COUNT(*) FILTER (WHERE ${failedReprocessContactEquals(bronzeContacts.metadata)})`,
    })
    .from(bronzeContacts)
    .where(
      sql`${bronzeContacts.tenantId} = ${tenantId}
        AND ${batchIdMetadataEquals(bronzeContacts.metadata, batchId)}`,
    );

  return {
    processed: Number(row?.processed ?? 0),
    resolved: Number(row?.resolved ?? 0),
    duplicateSource: Number(row?.duplicateSource ?? 0),
    identityConflict: Number(row?.identityConflict ?? 0),
    insufficientIdentifiers: Number(row?.insufficientIdentifiers ?? 0),
    failedContacts: Number(row?.failedContacts ?? 0),
  };
}

async function updateBatchReprocessMetadata(
  tenantId: string,
  batchId: string,
  patch: Record<string, unknown>,
) {
  await withBatchMetadataRetry(tenantId, "updateBatchReprocessMetadata", async () => {
    const [batch] = await db
      .select({ metadata: bronzeImportBatches.metadata })
      .from(bronzeImportBatches)
      .where(
        sql`${bronzeImportBatches.tenantId} = ${tenantId} AND ${bronzeImportBatches.id} = ${batchId}`,
      )
      .limit(1);

    const currentMetadata = (batch?.metadata as Record<string, unknown> | undefined) ?? {};

    await db
      .update(bronzeImportBatches)
      .set({
        metadata: {
          ...currentMetadata,
          ...patch,
        },
        updatedAt: new Date(),
      })
      .where(
        sql`${bronzeImportBatches.tenantId} = ${tenantId} AND ${bronzeImportBatches.id} = ${batchId}`,
      );
  });
}

type IdentityResolutionLoopOptions = {
  tenantId: string;
  batchId: string;
  mapping: Mapping;
  errorsOnly: boolean;
  initialRunTotalRows: number;
  pageSize: number;
  initialCursor: { lastCreatedAt: string | null; lastId: string | null };
  counters: ReprocessRunCounters;
  progressReporter: BatchProgressReporter;
};

async function runIdentityResolutionLoop(
  opts: IdentityResolutionLoopOptions,
): Promise<{ lastCreatedAt: string | null; lastId: string | null }> {
  const {
    tenantId,
    batchId,
    mapping,
    errorsOnly,
    initialRunTotalRows,
    pageSize,
    counters,
    progressReporter,
  } = opts;
  let lastCreatedAt = opts.initialCursor.lastCreatedAt;
  let lastId = opts.initialCursor.lastId;

  while (true) {
    const contacts = await db.query.bronzeContacts.findMany({
      where: (t) => {
        const conditions = [
          sql`${t.tenantId} = ${tenantId}`,
          batchIdMetadataEquals(t.metadata, batchId),
        ];
        if (errorsOnly) {
          conditions.push(failedReprocessContactEquals(t.metadata));
        }
        const base = sql.join(conditions, sql` AND `);
        if (!lastCreatedAt || !lastId) {
          return base;
        }
        return sql`${base}
          AND (
            ${t.createdAt} > ${sqlTimestamp(lastCreatedAt)}
            OR (${t.createdAt} = ${sqlTimestamp(lastCreatedAt)} AND ${t.id} > ${lastId})
          )`;
      },
      orderBy: (t) => [t.createdAt, t.id],
      limit: pageSize,
    });

    if (contacts.length === 0) {
      break;
    }

    for (const bronze of contacts) {
      await processOneBronzeContactWithRetries(bronze, mapping, tenantId, batchId, counters);
      lastCreatedAt = bronze.createdAt.toISOString();
      lastId = bronze.id;
      await progressReporter.maybeReportContactProgress(counters, "resolve_identities", bronze.id);
    }

    await updateBatchReprocessMetadata(tenantId, batchId, {
      identityReprocessStatus: "running",
      identityReprocessPhase: "resolve_identities",
      identityReprocessCursorCreatedAt: lastCreatedAt,
      identityReprocessCursorLastBronzeId: lastId,
      identityReprocessMode: errorsOnly ? "errors_only" : "full",
      identityReprocessRunTotalRows: initialRunTotalRows,
      identityReprocessFailedAt: null,
      identityReprocessLastError: null,
      identityReprocessLastProgressAt: new Date().toISOString(),
      identityReprocessProcessedRows: counters.processed,
      identityReprocessResolvedRows: counters.resolved,
      identityReprocessDuplicateSourceRows: counters.duplicateSource,
      identityReprocessIdentityConflictRows: counters.identityConflict,
      identityReprocessInsufficientIdentifierRows: counters.insufficientIdentifiers,
      identityReprocessPromotionQueued: counters.promotionQueued,
      identityReprocessFailedContactCount: counters.failedContacts,
    });
  }

  return { lastCreatedAt, lastId };
}

async function handleBatchReprocess(
  jobData: PromotionBronzeSilverJobData,
  progressReporter: BatchProgressReporter = createBatchProgressReporter(undefined),
) {
  if (!jobData.batchId) {
    return { ok: false, status: "missing_batch_id" };
  }
  const batchId = jobData.batchId;

  const pageSize = 500;

  const checkpoint = await loadBatchReprocessCheckpoint(jobData.tenantId, batchId);
  let phase: ReprocessPhase = checkpoint.phase;
  let lastCreatedAt: string | null = checkpoint.cursorCreatedAt;
  let lastId: string | null = checkpoint.cursorLastBronzeId;
  let promotionLastCreatedAt: string | null = checkpoint.promotionCursorCreatedAt;
  let promotionLastId: string | null = checkpoint.promotionCursorLastBronzeId;
  const counters: ReprocessRunCounters = {
    processed: checkpoint.processed,
    resolved: checkpoint.resolved,
    duplicateSource: checkpoint.duplicateSource,
    identityConflict: checkpoint.identityConflict,
    insufficientIdentifiers: checkpoint.insufficientIdentifiers,
    promotionQueued: checkpoint.promotionQueued,
    failedContacts: checkpoint.failedContacts,
  };
  const errorsOnly = jobData.reprocessErrorsOnly === true;
  let mapping: Mapping;
  const initialRunTotalRows = errorsOnly ? checkpoint.failedContacts : checkpoint.batchTotalRows;
  const sessionStartedAt =
    typeof checkpoint.metadata.identityReprocessSessionStartedAt === "string"
      ? checkpoint.metadata.identityReprocessSessionStartedAt
      : new Date().toISOString();
  const sessionProcessedBaseRows = Number(
    checkpoint.metadata.identityReprocessSessionProcessedBaseRows ?? checkpoint.processed,
  );

  try {
    await updateBatchReprocessMetadata(jobData.tenantId, batchId, {
      identityReprocessStatus: "running",
      identityReprocessStartedAt:
        typeof checkpoint.metadata.identityReprocessStartedAt === "string"
          ? checkpoint.metadata.identityReprocessStartedAt
          : new Date().toISOString(),
      identityReprocessCompletedAt: null,
      identityReprocessFailedAt: null,
      identityReprocessLastError: null,
      identityReprocessSessionStartedAt: sessionStartedAt,
      identityReprocessSessionProcessedBaseRows: sessionProcessedBaseRows,
      identityReprocessLastProgressAt: new Date().toISOString(),
      identityReprocessPhase: phase,
      identityReprocessCursorCreatedAt: lastCreatedAt,
      identityReprocessCursorLastBronzeId: lastId,
      identityReprocessPromotionCursorCreatedAt: promotionLastCreatedAt,
      identityReprocessPromotionCursorLastBronzeId: promotionLastId,
      identityReprocessMode: errorsOnly ? "errors_only" : "full",
      identityReprocessRunTotalRows: initialRunTotalRows,
      identityReprocessProcessedRows: counters.processed,
      identityReprocessResolvedRows: counters.resolved,
      identityReprocessDuplicateSourceRows: counters.duplicateSource,
      identityReprocessIdentityConflictRows: counters.identityConflict,
      identityReprocessInsufficientIdentifierRows: counters.insufficientIdentifiers,
      identityReprocessPromotionQueued: counters.promotionQueued,
      identityReprocessFailedContactCount: counters.failedContacts,
    });
    mapping = await loadBatchMapping(jobData.tenantId, batchId);
    await progressReporter.force({
      phase,
      batchId,
      processed: counters.processed,
      queued: counters.promotionQueued,
      status: "running",
    });

    if (phase === "resolve_identities") {
      ({ lastCreatedAt, lastId } = await runIdentityResolutionLoop({
        tenantId: jobData.tenantId,
        batchId,
        mapping,
        errorsOnly,
        initialRunTotalRows,
        pageSize,
        initialCursor: { lastCreatedAt, lastId },
        counters,
        progressReporter,
      }));

      phase = "queue_promotions";
      promotionLastCreatedAt = null;
      promotionLastId = null;

      await updateBatchReprocessMetadata(jobData.tenantId, batchId, {
        identityReprocessStatus: "running",
        identityReprocessPhase: phase,
        identityReprocessCursorCreatedAt: lastCreatedAt,
        identityReprocessCursorLastBronzeId: lastId,
        identityReprocessPromotionCursorCreatedAt: promotionLastCreatedAt,
        identityReprocessPromotionCursorLastBronzeId: promotionLastId,
        identityReprocessMode: errorsOnly ? "errors_only" : "full",
        identityReprocessRunTotalRows: initialRunTotalRows,
        identityReprocessSessionStartedAt: sessionStartedAt,
        identityReprocessSessionProcessedBaseRows: sessionProcessedBaseRows,
        identityReprocessLastProgressAt: new Date().toISOString(),
        identityReprocessProcessedRows: counters.processed,
        identityReprocessResolvedRows: counters.resolved,
        identityReprocessDuplicateSourceRows: counters.duplicateSource,
        identityReprocessIdentityConflictRows: counters.identityConflict,
        identityReprocessInsufficientIdentifierRows: counters.insufficientIdentifiers,
        identityReprocessPromotionQueued: counters.promotionQueued,
        identityReprocessFailedContactCount: counters.failedContacts,
      });
      await progressReporter.force({
        phase,
        batchId,
        processed: counters.processed,
        queued: counters.promotionQueued,
        status: "running",
      });
    }

    counters.promotionQueued = await queueResolvedBatchPromotions(
      jobData.tenantId,
      batchId,
      pageSize,
      {
        initialQueued: counters.promotionQueued,
        resumeFromCreatedAt: promotionLastCreatedAt,
        resumeFromId: promotionLastId,
        progressReporter,
        onCheckpoint: async ({ queued, lastQueuedCreatedAt, lastQueuedId }) => {
          counters.promotionQueued = queued;
          promotionLastCreatedAt = lastQueuedCreatedAt;
          promotionLastId = lastQueuedId;
          await updateBatchReprocessMetadata(jobData.tenantId, batchId, {
            identityReprocessStatus: "running",
            identityReprocessPhase: "queue_promotions",
            identityReprocessCursorCreatedAt: lastCreatedAt,
            identityReprocessCursorLastBronzeId: lastId,
            identityReprocessPromotionCursorCreatedAt: promotionLastCreatedAt,
            identityReprocessPromotionCursorLastBronzeId: promotionLastId,
            identityReprocessMode: errorsOnly ? "errors_only" : "full",
            identityReprocessRunTotalRows: initialRunTotalRows,
            identityReprocessSessionStartedAt: sessionStartedAt,
            identityReprocessSessionProcessedBaseRows: sessionProcessedBaseRows,
            identityReprocessLastProgressAt: new Date().toISOString(),
            identityReprocessProcessedRows: counters.processed,
            identityReprocessResolvedRows: counters.resolved,
            identityReprocessDuplicateSourceRows: counters.duplicateSource,
            identityReprocessIdentityConflictRows: counters.identityConflict,
            identityReprocessInsufficientIdentifierRows: counters.insufficientIdentifiers,
            identityReprocessPromotionQueued: counters.promotionQueued,
            identityReprocessFailedContactCount: counters.failedContacts,
          });
          await progressReporter.force({
            phase: "queue_promotions",
            batchId,
            processed: counters.processed,
            queued: counters.promotionQueued,
            lastQueuedId: lastQueuedId ?? null,
            status: "running",
          });
        },
      },
    );

    const failedSummary = await loadFailedReprocessContactsSummary(jobData.tenantId, batchId);
    const completedMetrics = errorsOnly
      ? {
          processed: counters.processed,
          resolved: counters.resolved,
          duplicateSource: counters.duplicateSource,
          identityConflict: counters.identityConflict,
          insufficientIdentifiers: counters.insufficientIdentifiers,
          failedContacts: failedSummary.count,
        }
      : await loadCompletedFullRunMetrics(jobData.tenantId, batchId);

    await updateBatchReprocessMetadata(jobData.tenantId, batchId, {
      identityReprocessStatus: "completed",
      identityReprocessCompletedAt: new Date().toISOString(),
      identityReprocessFailedAt: null,
      identityReprocessLastError: null,
      identityReprocessLastProgressAt: new Date().toISOString(),
      identityReprocessPhase: null,
      identityReprocessCursorCreatedAt: null,
      identityReprocessCursorLastBronzeId: null,
      identityReprocessPromotionCursorCreatedAt: null,
      identityReprocessPromotionCursorLastBronzeId: null,
      identityReprocessMode: errorsOnly ? "errors_only" : "full",
      identityReprocessRunTotalRows: initialRunTotalRows,
      identityReprocessSessionStartedAt: sessionStartedAt,
      identityReprocessSessionProcessedBaseRows: sessionProcessedBaseRows,
      identityReprocessProcessedRows: completedMetrics.processed,
      identityReprocessResolvedRows: completedMetrics.resolved,
      identityReprocessDuplicateSourceRows: completedMetrics.duplicateSource,
      identityReprocessIdentityConflictRows: completedMetrics.identityConflict,
      identityReprocessInsufficientIdentifierRows: completedMetrics.insufficientIdentifiers,
      identityReprocessPromotionQueued: counters.promotionQueued,
      identityReprocessFailedContactCount: completedMetrics.failedContacts,
      identityReprocessFailedContactSamples: failedSummary.samples,
      identityReprocessErrorListGeneratedAt: failedSummary.generatedAt,
    });
    await progressReporter.force({
      phase: "queue_promotions",
      batchId,
      processed: completedMetrics.processed,
      queued: counters.promotionQueued,
      failedContacts: completedMetrics.failedContacts,
      status: "completed",
    });
  } catch (error) {
    try {
      await updateBatchReprocessMetadata(jobData.tenantId, batchId, {
        identityReprocessStatus: "failed",
        identityReprocessFailedAt: new Date().toISOString(),
        identityReprocessLastProgressAt: new Date().toISOString(),
        identityReprocessLastError: readErrorMessage(error),
        identityReprocessPhase: phase,
        identityReprocessCursorCreatedAt: lastCreatedAt,
        identityReprocessCursorLastBronzeId: lastId,
        identityReprocessPromotionCursorCreatedAt: promotionLastCreatedAt,
        identityReprocessPromotionCursorLastBronzeId: promotionLastId,
        identityReprocessMode: errorsOnly ? "errors_only" : "full",
        identityReprocessRunTotalRows: initialRunTotalRows,
        identityReprocessSessionStartedAt: sessionStartedAt,
        identityReprocessSessionProcessedBaseRows: sessionProcessedBaseRows,
        identityReprocessProcessedRows: counters.processed,
        identityReprocessResolvedRows: counters.resolved,
        identityReprocessDuplicateSourceRows: counters.duplicateSource,
        identityReprocessIdentityConflictRows: counters.identityConflict,
        identityReprocessInsufficientIdentifierRows: counters.insufficientIdentifiers,
        identityReprocessPromotionQueued: counters.promotionQueued,
        identityReprocessFailedContactCount: counters.failedContacts,
      });
    } catch (metadataError) {
      console.error(
        `[promotion-bronze-silver] failed to persist reprocess failure metadata for batch ${batchId}: ${readErrorMessage(metadataError)}`,
      );
    }
    await progressReporter.force({
      phase,
      batchId,
      processed: counters.processed,
      queued: counters.promotionQueued,
      failedContacts: counters.failedContacts,
      status: "failed",
      error: readErrorMessage(error),
    });
    throw error;
  }

  return {
    ok: true,
    status: "batch_reprocessed",
    batchId,
    processed: counters.processed,
    resolved: counters.resolved,
    duplicateSource: counters.duplicateSource,
    identityConflict: counters.identityConflict,
    insufficientIdentifiers: counters.insufficientIdentifiers,
    promotionQueued: counters.promotionQueued,
  };
}

async function queueResolvedBatchPromotions(
  tenantId: string,
  batchId: string,
  pageSize: number,
  options?: {
    initialQueued?: number;
    resumeFromCreatedAt?: string | null;
    resumeFromId?: string | null;
    onCheckpoint?: (checkpoint: {
      queued: number;
      lastQueuedCreatedAt: string | null;
      lastQueuedId: string | null;
    }) => Promise<void>;
    progressReporter?: BatchProgressReporter;
  },
) {
  const promotionQueue = createQueue(QUEUES.PIPELINE_PROMOTE_BRONZE_SILVER);
  let lastCreatedAt: string | null = options?.resumeFromCreatedAt ?? null;
  let lastId: string | null = options?.resumeFromId ?? null;
  let queued = options?.initialQueued ?? 0;

  try {
    while (true) {
      const contacts = await db.query.bronzeContacts.findMany({
        where: (t) => {
          const base = sql`${t.tenantId} = ${tenantId}
            AND ${batchIdMetadataEquals(t.metadata, batchId)}
            AND ${t.identityStatus} = 'resolved'
            AND COALESCE(${t.doNotProcess}, FALSE) = FALSE`;

          if (!lastCreatedAt || !lastId) {
            return base;
          }

          return sql`${base}
            AND (
                ${t.createdAt} > ${sqlTimestamp(lastCreatedAt)}
                OR (${t.createdAt} = ${sqlTimestamp(lastCreatedAt)} AND ${t.id} > ${lastId})
            )`;
        },
        orderBy: (t) => [t.createdAt, t.id],
        limit: pageSize,
        columns: {
          createdAt: true,
          id: true,
        },
      });

      if (contacts.length === 0) {
        break;
      }

      await promotionQueue.addBulk(
        contacts.map((bronze, index) => ({
          name: "promote",
          data: {
            tenantId,
            bronzeContactId: bronze.id,
            correlationId: `reprocess-${batchId}-promote-${queued + index + 1}`,
          },
          opts: {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 5000,
            },
            removeOnComplete: 100,
            removeOnFail: 200,
          },
        })),
      );

      queued += contacts.length;

      const lastContact = contacts.at(-1);
      lastCreatedAt = lastContact?.createdAt?.toISOString() ?? null;
      lastId = lastContact?.id ?? null;

      if (lastId && options?.progressReporter) {
        await options.progressReporter.maybeReportPromotionProgress(queued, lastId);
      }

      if (options?.onCheckpoint) {
        await options.onCheckpoint({
          queued,
          lastQueuedCreatedAt: lastCreatedAt,
          lastQueuedId: lastId,
        });
      }
    }
  } finally {
    await promotionQueue.close();
  }

  return queued;
}

async function handleBatchReprocessJob(
  job: Job<PromotionBronzeSilverJobData>,
  jobData: PromotionBronzeSilverJobData,
) {
  const progressReporter = createBatchProgressReporter(job);
  await progressReporter.force({
    phase: "resolve_identities",
    batchId: jobData.batchId ?? null,
    status: "started",
  });
  return handleBatchReprocess(jobData, progressReporter);
}

async function markBronzePromoted(
  tenantId: string,
  bronzeId: string,
  silverId: string,
  isDuplicate = false,
  duplicateOfId: string | null = null,
) {
  await db
    .update(bronzeContacts)
    .set({
      processingStatus: "promoted",
      promotedToSilverId: silverId,
      isDuplicate,
      duplicateOfId,
    })
    .where(sql`${bronzeContacts.tenantId} = ${tenantId} AND ${bronzeContacts.id} = ${bronzeId}`);
}

async function triggerCompanyEnrichment(data: {
  tenantId: string;
  companyId: string;
  cui: string | null;
  website: string | null;
  companyName: string | null;
  correlationId?: string;
}) {
  for (const queueName of NEXT_ENRICHMENT_QUEUES) {
    const queue = createQueue(queueName);
    await queue.add("enrich", {
      tenantId: data.tenantId,
      companyId: data.companyId,
      cui: data.cui ?? undefined,
      domain: data.website ?? undefined,
      companyName: data.companyName ?? undefined,
      correlationId: data.correlationId,
    });
    await queue.close();
  }
}

function sanitizeIdentifiers(rawCui: string | null, rawNrRegCom: string | null) {
  return {
    cui: rawCui ? sanitizeCui(rawCui) || null : null,
    // Store raw format — old format (J09/98/2003) is preserved as-is.
    // Canonical new format is only set from official ONRC source, never auto-converted.
    nrRegCom: rawNrRegCom ? sanitizeNrRegCom(rawNrRegCom) : null,
  };
}

async function getResolvedCompany(
  tenantId: string,
  resolvedCompanyId: string | null | undefined,
  cui: string | null,
  nrRegCom: string | null,
) {
  const resolvedCompany = resolvedCompanyId
    ? await db.query.silverCompanies.findFirst({
        where: (t) => sql`${t.tenantId} = ${tenantId} AND ${t.id} = ${resolvedCompanyId}`,
      })
    : undefined;

  return resolvedCompany ?? findCompanyByIdentifiers(tenantId, cui, nrRegCom);
}

function getCompanyIdentityStatus(cui: string | null, nrRegCom: string | null) {
  if (cui && nrRegCom) {
    return "resolved" as const;
  }
  if (cui || nrRegCom) {
    return "partial" as const;
  }
  return undefined;
}

function getPromotionKind(existingSilver: SilverCompanyRow | undefined, bronzeId: string) {
  const sourceBronzeId = existingSilver?.sourceBronzeId;
  if (sourceBronzeId && sourceBronzeId !== bronzeId) {
    return "bronze_to_silver_merge";
  }
  if (existingSilver) {
    return "bronze_to_silver_update";
  }
  return "bronze_to_silver_insert";
}

const FORMA_JURIDICA_MAP: Record<string, string> = {
  "SOCIETATE COMERCIALĂ CU RĂSPUNDERE LIMITATĂ": "SRL",
  "SOCIETATE CU RĂSPUNDERE LIMITATĂ": "SRL",
  "SOCIETATE PE ACȚIUNI": "SA",
  "SOCIETATE COMERCIALĂ PE ACȚIUNI": "SA",
  "PERSOANA FIZICA AUTORIZATA": "PFA",
  "INTREPRINDERE INDIVIDUALA": "II",
  "INTREPRINDERE FAMILIALA": "IF",
  "SOCIETATE IN NUME COLECTIV": "SNC",
  "SOCIETATE IN COMANDITA SIMPLA": "SCS",
  COOPERATIVA: "COOP",
  ASOCIATIE: "ONG",
  FUNDATIE: "ONG",
};

function mapFormaJuridica(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const upper = raw
    .toUpperCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "");
  for (const [pattern, value] of Object.entries(FORMA_JURIDICA_MAP)) {
    const normalized = pattern.normalize("NFD").replaceAll(/[\u0300-\u036f]/g, "");
    if (upper.includes(normalized)) return value;
  }
  return "OTHER";
}

function mapStatusFirma(
  stareInregistrare: string | undefined | null,
  statusInactivi: boolean | undefined | null,
): string | undefined {
  if (statusInactivi === true) return "INACTIVA";
  if (!stareInregistrare) return undefined;
  const upper = stareInregistrare.toUpperCase();
  if (upper.includes("RADIAT")) return "RADIATA";
  if (upper.includes("DIZOLV")) return "DIZOLVARE";
  if (upper.includes("INSOLV")) return "INSOLVENTA";
  if (upper.includes("INREGISTRAT")) return "ACTIVA";
  return undefined;
}

function mergeWithSource(
  excelValue: string | null | undefined,
  anafValue: string | null | undefined,
  fieldName: string,
  fieldSources: Record<string, string>,
): string | null {
  if (excelValue) {
    fieldSources[fieldName] = "excel";
    return excelValue;
  }
  if (anafValue) {
    fieldSources[fieldName] = "anaf";
    return anafValue;
  }
  return null;
}

function resolveAnulInfiintariiFromAnaf(
  anafDG: Record<string, unknown> | null,
  fieldSources: Record<string, string>,
): number | null {
  if (typeof anafDG?.data_inregistrare !== "string" || !anafDG.data_inregistrare) return null;
  const year = parseIntSafe(anafDG.data_inregistrare.slice(0, 4));
  if (year) {
    fieldSources.anulInfiintarii = "anaf";
    return year;
  }
  return null;
}

function setSourceIfTruthy(
  value: unknown,
  fieldName: string,
  fieldSources: Record<string, string>,
): void {
  if (value !== undefined && value !== null && value !== "" && value !== false) {
    fieldSources[fieldName] = "anaf";
  }
}

function anafStr(
  source: Record<string, unknown> | null,
  key: string,
  fieldName: string,
  fieldSources: Record<string, string>,
): string | undefined {
  const val = (source?.[key] as string | undefined) || undefined;
  if (val) fieldSources[fieldName] = "anaf";
  return val;
}

function resolveAnafOnlyFields(anafSources: {
  anafV9: Record<string, unknown> | null | undefined;
  anafDG: Record<string, unknown> | null;
  anafAddr: Record<string, unknown> | null;
  anafTva: Record<string, unknown> | null;
  anafRTVAI: Record<string, unknown> | null;
  anafSplit: Record<string, unknown> | null;
  anafInactiv: Record<string, unknown> | null;
  fieldSources: Record<string, string>;
}) {
  const { anafV9, anafDG, anafAddr, anafTva, anafRTVAI, anafSplit, anafInactiv, fieldSources } =
    anafSources;
  const statusFirma = mapStatusFirma(
    anafDG?.stare_inregistrare as string | undefined,
    anafInactiv?.statusInactivi as boolean | undefined,
  );
  setSourceIfTruthy(statusFirma, "statusFirma", fieldSources);

  const formaJuridica = mapFormaJuridica(anafDG?.forma_juridica as string | undefined);
  setSourceIfTruthy(formaJuridica, "formaJuridica", fieldSources);

  const platitorTva = anafTva?.scpTVA as boolean | undefined;
  if (platitorTva !== undefined) fieldSources.platitorTva = "anaf";

  const tvaLaIncasare = anafRTVAI?.statusTvaIncasare as boolean | undefined;
  if (tvaLaIncasare !== undefined) fieldSources.tvaLaIncasare = "anaf";

  const splitTvaVal = anafSplit?.statusSplitTVA as boolean | undefined;
  if (splitTvaVal !== undefined) fieldSources.splitTva = "anaf";

  const inregistratEfactura = anafDG?.statusRO_e_Factura as boolean | undefined;
  if (inregistratEfactura !== undefined) fieldSources.inregistratEfactura = "anaf";

  const periodeTva = anafTva?.perioade_TVA as Array<Record<string, string>> | undefined;
  const lastTvaPeriod = periodeTva?.length ? periodeTva.at(-1) : undefined;

  const codSiruta = anafAddr?.scod_Localitate
    ? Number(anafAddr.scod_Localitate) || undefined
    : undefined;
  setSourceIfTruthy(codSiruta, "codSiruta", fieldSources);

  const anafAddrFiscal = anafV9?.adresa_domiciliu_fiscal as
    | Record<string, unknown>
    | null
    | undefined;
  const adresaDomiciliuFiscal =
    anafAddrFiscal && Object.keys(anafAddrFiscal).length > 0 ? anafAddrFiscal : undefined;
  setSourceIfTruthy(adresaDomiciliuFiscal, "adresaDomiciliuFiscal", fieldSources);

  return {
    statusFirma,
    formaJuridica,
    dataInregistrare: anafStr(anafDG, "data_inregistrare", "dataInregistrare", fieldSources),
    platitorTva,
    periodeTva,
    dataInceputTva: lastTvaPeriod?.data_inceput_ScpTVA || undefined,
    dataSfarsitTva: lastTvaPeriod?.data_sfarsit_ScpTVA || undefined,
    tvaLaIncasare,
    dataInceputTvaIncasare: anafStr(
      anafRTVAI,
      "dataInceputTvaInc",
      "dataInceputTvaIncasare",
      fieldSources,
    ),
    dataSfarsitTvaIncasare: anafStr(
      anafRTVAI,
      "dataSfarsitTvaInc",
      "dataSfarsitTvaIncasare",
      fieldSources,
    ),
    splitTvaVal,
    dataInceputSplitTva: anafStr(
      anafSplit,
      "dataInceputSplitTVA",
      "dataInceputSplitTva",
      fieldSources,
    ),
    dataAnulareSplitTva: anafStr(
      anafSplit,
      "dataAnulareSplitTVA",
      "dataAnulareSplitTva",
      fieldSources,
    ),
    inregistratEfactura,
    dataInregistrareEfactura: anafStr(
      anafDG,
      "data_inreg_Reg_RO_e_Factura",
      "dataInregistrareEfactura",
      fieldSources,
    ),
    // Address details
    strada: mergeWithSource(
      null,
      anafAddr?.sdenumire_Strada as string | undefined,
      "strada",
      fieldSources,
    ),
    numar: mergeWithSource(
      null,
      anafAddr?.snumar_Strada as string | undefined,
      "numar",
      fieldSources,
    ),
    codPostal: mergeWithSource(
      null,
      anafAddr?.scod_Postal as string | undefined,
      "codPostal",
      fieldSources,
    ),
    judetCod: mergeWithSource(
      null,
      anafAddr?.scod_JudetAuto as string | undefined,
      "judetCod",
      fieldSources,
    ),
    detaliiAdresa: anafStr(anafAddr, "sdetalii_Adresa", "detaliiAdresa", fieldSources),
    codSiruta,
    adresaDomiciliuFiscal,
    // General fields
    fax: anafStr(anafDG, "fax", "fax", fieldSources),
    iban: anafStr(anafDG, "iban", "iban", fieldSources),
    stareInregistrare: anafStr(anafDG, "stare_inregistrare", "stareInregistrare", fieldSources),
    actInfiintare: anafStr(anafDG, "act", "actInfiintare", fieldSources),
    organFiscalCompetent: anafStr(
      anafDG,
      "organFiscalCompetent",
      "organFiscalCompetent",
      fieldSources,
    ),
    formaDeProprietate: anafStr(anafDG, "forma_de_proprietate", "formaDeProprietate", fieldSources),
    formaOrganizare: anafStr(anafDG, "forma_organizare", "formaOrganizare", fieldSources),
    // Inactivation/radiation dates
    dataInactivare: anafStr(anafInactiv, "dataInactivare", "dataInactivare", fieldSources),
    dataReactivare: anafStr(anafInactiv, "dataReactivare", "dataReactivare", fieldSources),
    dataRadiere: anafStr(anafInactiv, "dataRadiere", "dataRadiere", fieldSources),
  };
}

function buildCompanyUpdate(args: {
  bronze: BronzeContactRow;
  payload: Payload;
  mapping: Mapping;
  rawNrRegCom: string | null;
  cui: string | null;
  nrRegCom: string | null;
  existingSilver?: SilverCompanyRow;
}) {
  const { bronze, payload, mapping, rawNrRegCom, cui, nrRegCom, existingSilver } = args;
  const bronzeMeta = (bronze.metadata as Record<string, unknown>) ?? {};

  // ANAF v9 data appended by b5-anaf-bronze-enricher (multi-source collection)
  const anafV9 = bronzeMeta.anafResponse as Record<string, unknown> | null | undefined;
  const anafDG = (anafV9?.date_generale ?? null) as Record<string, unknown> | null;
  const anafAddr = (anafV9?.adresa_sediu_social ?? null) as Record<string, unknown> | null;
  const anafTva = (anafV9?.inregistrare_scop_Tva ?? null) as Record<string, unknown> | null;
  const anafRTVAI = (anafV9?.inregistrare_RTVAI ?? null) as Record<string, unknown> | null;
  const anafSplit = (anafV9?.inregistrare_SplitTVA ?? null) as Record<string, unknown> | null;
  const anafInactiv = (anafV9?.stare_inactiv ?? null) as Record<string, unknown> | null;
  const fieldSources: Record<string, string> = {};

  // Excel resolution
  const excelName =
    bronze.extractedName ??
    resolveField(payload, mapping, "companyName", "denumire", "Denumire Firma", "name");
  const excelEmail =
    bronze.extractedEmail ??
    resolveField(payload, mapping, "email", "Email", "email_address", "mail");
  const excelPhone =
    bronze.extractedPhone ??
    resolveField(payload, mapping, "phone", "telefon", "Telefon MF", "mobile");
  const excelAddress =
    bronze.extractedAddress ?? resolveField(payload, mapping, "address", "adresa", "Adresa ANAF");
  const excelCaen = resolveField(payload, mapping, "caen", "CAEN", "cod_caen", "nace code");
  const excelCaenText = resolveField(payload, mapping, "caenText", "denumire_caen", "nace text");
  const excelJudet =
    bronze.extractedJudet ?? resolveField(payload, mapping, "judet", "Judet", "county");
  const excelLocalitate =
    bronze.extractedLocalitate ??
    resolveField(payload, mapping, "localitate", "Localitate", "oras", "city");
  const excelAnulInfiintarii = parseIntSafe(
    resolveField(payload, mapping, "anulInfiintarii", "Anul infiintarii calculat"),
  );

  // Merge: Excel first, ANAF appends when Excel has no value
  const companyName = mergeWithSource(
    excelName,
    anafDG?.denumire as string | undefined,
    "denumire",
    fieldSources,
  );

  const email = excelEmail;
  if (email) fieldSources.email = "excel";

  const phone = mergeWithSource(
    excelPhone,
    anafDG?.telefon as string | undefined,
    "telefon",
    fieldSources,
  );
  const address = mergeWithSource(
    excelAddress,
    anafDG?.adresa as string | undefined,
    "adresa",
    fieldSources,
  );

  const website = resolveField(payload, mapping, "website", "site", "url");
  if (website) fieldSources.website = "excel";

  const codCaenPrincipal = mergeWithSource(
    excelCaen,
    anafDG?.cod_CAEN as string | undefined,
    "codCaenPrincipal",
    fieldSources,
  );
  if (excelCaenText) fieldSources.denumireCaen = "excel";

  const judet = mergeWithSource(
    excelJudet,
    anafAddr?.sdenumire_Judet as string | undefined,
    "judet",
    fieldSources,
  );
  const localitate = mergeWithSource(
    excelLocalitate,
    anafAddr?.sdenumire_Localitate as string | undefined,
    "localitate",
    fieldSources,
  );

  let anulInfiintarii = excelAnulInfiintarii;
  if (anulInfiintarii == null) {
    anulInfiintarii = resolveAnulInfiintariiFromAnaf(anafDG, fieldSources);
  } else {
    fieldSources.anulInfiintarii = "excel";
  }

  // ANAF-only fields (fiscal, TVA, split, inactiv, address details)
  const anaf = resolveAnafOnlyFields({
    anafV9,
    anafDG,
    anafAddr,
    anafTva,
    anafRTVAI,
    anafSplit,
    anafInactiv,
    fieldSources,
  });
  if (anaf.dataInceputTva) fieldSources.dataInceputTva = "anaf";
  if (anaf.dataSfarsitTva) fieldSources.dataSfarsitTva = "anaf";

  const identityStatus = getCompanyIdentityStatus(cui, nrRegCom);
  const promotion = getPromotionKind(existingSilver, bronze.id);
  const sourceSheet = bronzeMeta.sheetName ?? null;

  return {
    companyName,
    email,
    phone,
    website,
    companyUpdate: {
      denumire: companyName ?? undefined,
      email: email ?? undefined,
      telefon: phone ?? undefined,
      adresa: address ?? undefined,
      website: website ?? undefined,
      nrRegCom: nrRegCom ?? undefined,
      nrRegComOriginal: rawNrRegCom ?? undefined,
      nrRegComCanonical: bronze.extractedNrRegComCanonical ?? undefined,
      identityStatus,
      codCaenPrincipal: codCaenPrincipal ?? undefined,
      denumireCaen: excelCaenText ?? undefined,
      strada: anaf.strada ?? undefined,
      numar: anaf.numar ?? undefined,
      codPostal: anaf.codPostal ?? undefined,
      judet: judet || undefined,
      judetCod: anaf.judetCod ?? undefined,
      localitate: localitate || undefined,
      codSiruta: anaf.codSiruta,
      detaliiAdresa: anaf.detaliiAdresa,
      adresaDomiciliuFiscal: anaf.adresaDomiciliuFiscal,
      statusFirma: anaf.statusFirma as
        | "ACTIVA"
        | "INACTIVA"
        | "DIZOLVARE"
        | "RADIATA"
        | "INSOLVENTA"
        | undefined,
      stareInregistrare: anaf.stareInregistrare,
      formaJuridica: anaf.formaJuridica as
        | "SRL"
        | "SA"
        | "PFA"
        | "II"
        | "IF"
        | "SNC"
        | "SCS"
        | "ONG"
        | "COOP"
        | "OTHER"
        | undefined,
      dataInregistrare: anaf.dataInregistrare ?? undefined,
      dataRadiere: anaf.dataRadiere ?? undefined,
      dataInactivare: anaf.dataInactivare ?? undefined,
      dataReactivare: anaf.dataReactivare ?? undefined,
      actInfiintare: anaf.actInfiintare,
      organFiscalCompetent: anaf.organFiscalCompetent,
      formaDeProprietate: anaf.formaDeProprietate,
      formaOrganizare: anaf.formaOrganizare,
      fax: anaf.fax,
      iban: anaf.iban,
      platitorTva: anaf.platitorTva ?? undefined,
      dataInceputTva: anaf.dataInceputTva ?? undefined,
      dataSfarsitTva: anaf.dataSfarsitTva ?? undefined,
      periodeTva: anaf.periodeTva ?? undefined,
      tvaLaIncasare: anaf.tvaLaIncasare ?? undefined,
      dataInceputTvaIncasare: anaf.dataInceputTvaIncasare,
      dataSfarsitTvaIncasare: anaf.dataSfarsitTvaIncasare,
      splitTva: anaf.splitTvaVal ?? undefined,
      dataInceputSplitTva: anaf.dataInceputSplitTva,
      dataAnulareSplitTva: anaf.dataAnulareSplitTva,
      inregistratEfactura: anaf.inregistratEfactura ?? undefined,
      dataInregistrareEfactura: anaf.dataInregistrareEfactura ?? undefined,
      cifraAfaceri:
        parseRomanianNumeric(resolveField(payload, mapping, "cifraAfaceri", "Cifra de afaceri")) ??
        undefined,
      profitNet:
        parseRomanianNumeric(
          resolveField(payload, mapping, "profitNet", "Profit / Pierdere Neta"),
        ) ?? undefined,
      profitBrut:
        parseRomanianNumeric(
          resolveField(payload, mapping, "profitBrut", "Profit / Pierdere Bruta", "profit brut"),
        ) ?? undefined,
      venituriTotale:
        parseRomanianNumeric(resolveField(payload, mapping, "venituriTotale", "Venituri totale")) ??
        undefined,
      cheltuieliTotale:
        parseRomanianNumeric(
          resolveField(payload, mapping, "cheltuieliTotale", "Cheltuieli totale"),
        ) ?? undefined,
      activeTotale:
        parseRomanianNumeric(resolveField(payload, mapping, "activeTotale", "Total Active")) ??
        undefined,
      activeImobilizate:
        parseRomanianNumeric(
          resolveField(payload, mapping, "activeImobilizate", "Active Imobilizate"),
        ) ?? undefined,
      activeCirculante:
        parseRomanianNumeric(
          resolveField(payload, mapping, "activeCirculante", "Active Circulante"),
        ) ?? undefined,
      creante:
        parseRomanianNumeric(resolveField(payload, mapping, "creante", "Creante")) ?? undefined,
      stocuri:
        parseRomanianNumeric(resolveField(payload, mapping, "stocuri", "Stocuri")) ?? undefined,
      capitalSocial:
        parseRomanianNumeric(resolveField(payload, mapping, "capitalSocial", "Capital social")) ??
        undefined,
      capitaluriProprii:
        parseRomanianNumeric(
          resolveField(payload, mapping, "capitaluriProprii", "Capitaluri proprii Total"),
        ) ?? undefined,
      datoriiTotale:
        parseRomanianNumeric(resolveField(payload, mapping, "datoriiTotale", "Datorii Total")) ??
        undefined,
      numarAngajati:
        parseIntSafe(resolveField(payload, mapping, "numarAngajati", "Numar mediu de salariati")) ??
        undefined,
      anulInfiintarii: anulInfiintarii ?? undefined,
      ratingExtern:
        parseIntSafe(resolveField(payload, mapping, "ratingExtern", "Rating")) ?? undefined,
      limitaCreditEur:
        parseRomanianNumeric(
          resolveField(payload, mapping, "limitaCreditEur", "Limita de credit (EUR)"),
        ) ?? undefined,
      sourceBronzeId: bronze.id,
      metadata: (() => {
        let expr = sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb)`;
        expr = sql`jsonb_set(${expr}, '{promotion}', ${JSON.stringify(promotion)}::jsonb)`;
        expr = sql`jsonb_set(${expr}, '{promotedAt}', ${JSON.stringify(new Date().toISOString())}::jsonb)`;
        expr = sql`jsonb_set(${expr}, '{sourceSheet}', ${JSON.stringify(sourceSheet)}::jsonb)`;
        expr = sql`jsonb_set(${expr}, '{fieldSources}', ${JSON.stringify(fieldSources)}::jsonb)`;
        if (anafV9) {
          expr = sql`jsonb_set(${expr}, '{anafV9Response}', ${JSON.stringify(anafV9)}::jsonb)`;
        }
        return expr;
      })(),
    },
  };
}

async function persistSilverCompany(args: {
  tenantId: string;
  cui: string | null;
  nrRegCom: string | null;
  existingSilver?: SilverCompanyRow;
  companyUpdate: Record<string, unknown>;
}) {
  const { tenantId, cui, nrRegCom, existingSilver, companyUpdate } = args;
  if (existingSilver) {
    await db
      .update(silverCompanies)
      .set(companyUpdate)
      .where(sql`${silverCompanies.id} = ${existingSilver.id}`);
    return existingSilver.id;
  }

  try {
    const inserted = await db
      .insert(silverCompanies)
      .values({
        tenantId,
        cui: cui ?? undefined,
        ...companyUpdate,
        enrichmentStatus: "pending",
        promotionStatus: "blocked",
      })
      .returning({ id: silverCompanies.id });
    return inserted[0].id;
  } catch (error: unknown) {
    const pgError = error as { code?: string };
    if (pgError?.code !== "23505") {
      throw error;
    }
    const raced = await findCompanyByIdentifiers(tenantId, cui, nrRegCom);
    if (!raced) {
      throw error;
    }
    await db
      .update(silverCompanies)
      .set(companyUpdate)
      .where(sql`${silverCompanies.id} = ${raced.id}`);
    return raced.id;
  }
}

async function upsertPromotionIdentityKeys(args: {
  tenantId: string;
  companyId: string;
  bronzeId: string;
  cui: string | null;
  rawCui: string | null;
  nrRegCom: string | null;
  rawNrRegCom: string | null;
}) {
  if (args.cui) {
    await upsertCompanyIdentityKey({
      tenantId: args.tenantId,
      companyId: args.companyId,
      keyType: "cui",
      keyValueCanonical: args.cui,
      keyValueOriginal: args.rawCui,
      sourceAuthority: "import",
      sourceBronzeId: args.bronzeId,
    });
  }
  if (args.nrRegCom) {
    await upsertCompanyIdentityKey({
      tenantId: args.tenantId,
      companyId: args.companyId,
      keyType: "nr_reg_com",
      keyValueCanonical: args.nrRegCom,
      keyValueOriginal: args.rawNrRegCom,
      sourceAuthority: "import",
      sourceBronzeId: args.bronzeId,
    });
  }
}

async function upsertPromotionPrimaryContact(args: {
  tenantId: string;
  companyId: string;
  payload: Payload;
  mapping: Mapping;
  email: string | null;
  phone: string | null;
}) {
  const contactPrenume = resolveField(
    args.payload,
    args.mapping,
    "prenume",
    "firstName",
    "first_name",
  );
  const contactNume = resolveField(args.payload, args.mapping, "nume", "lastName", "last_name");
  if (!args.email && !args.phone && !contactPrenume && !contactNume) {
    return;
  }

  await db
    .insert(silverContacts)
    .values({
      tenantId: args.tenantId,
      companyId: args.companyId,
      prenume: contactPrenume ?? undefined,
      nume: contactNume ?? undefined,
      email: args.email ?? undefined,
      telefon: args.phone ?? undefined,
      isPrimary: true,
      metadata: { source: "promotion_bronze_silver" },
    })
    .onConflictDoUpdate({
      target: [silverContacts.tenantId, silverContacts.companyId, silverContacts.emailNormalized],
      targetWhere: sql`${silverContacts.emailNormalized} <> ''`,
      set: {
        prenume: sql`COALESCE(EXCLUDED."prenume", ${silverContacts.prenume})`,
        nume: sql`COALESCE(EXCLUDED."nume", ${silverContacts.nume})`,
        telefon: sql`COALESCE(EXCLUDED."telefon", ${silverContacts.telefon})`,
        isPrimary: true,
        updatedAt: new Date(),
      },
    });
}

async function findOrCreateParentCompany(args: {
  tenantId: string;
  bronzeId: string;
  resolvedCompanyId?: string | null;
  payload: Payload;
  mapping: Mapping;
  metadata: Record<string, unknown>;
}) {
  const rawCui = resolveField(args.payload, args.mapping, "cui", "CUI", "cif", "cod_fiscal");
  const rawNrRegCom = resolveField(
    args.payload,
    args.mapping,
    "nrRegistru",
    "nr reg com",
    "Nr reg com",
    "nr_reg_com",
    "Nr. RC.",
  );
  const { cui, nrRegCom } = sanitizeIdentifiers(rawCui, rawNrRegCom);

  if (!cui && !nrRegCom) return null;

  let parent = await getResolvedCompany(args.tenantId, args.resolvedCompanyId, cui, nrRegCom);
  if (!parent) {
    const inserted = await db
      .insert(silverCompanies)
      .values({
        tenantId: args.tenantId,
        sourceBronzeId: args.bronzeId,
        cui: cui ?? undefined,
        nrRegCom: nrRegCom ?? undefined,
        enrichmentStatus: "pending",
        promotionStatus: "blocked",
        metadata: {
          promotion: "auto_created_from_detail",
          sourceSheet: args.metadata.sheetName ?? null,
        },
      })
      .returning();
    parent = inserted[0];
    if (parent && cui) {
      await upsertCompanyIdentityKey({
        tenantId: args.tenantId,
        companyId: parent.id,
        keyType: "cui",
        keyValueCanonical: cui,
        keyValueOriginal: rawCui,
        sourceAuthority: "import",
        sourceBronzeId: args.bronzeId,
      });
    }
    if (parent && nrRegCom) {
      await upsertCompanyIdentityKey({
        tenantId: args.tenantId,
        companyId: parent.id,
        keyType: "nr_reg_com",
        keyValueCanonical: nrRegCom,
        keyValueOriginal: rawNrRegCom,
        sourceAuthority: "import",
        sourceBronzeId: args.bronzeId,
      });
    }
  }
  return parent;
}

async function handleCompanyPromotion(args: {
  jobData: PromotionBronzeSilverJobData;
  bronze: BronzeContactRow;
  payload: Payload;
  mapping: Mapping;
}) {
  const { jobData, bronze, payload, mapping } = args;
  const rawCui = bronze.extractedCui ?? resolveField(payload, mapping, "cui", "CUI", "cif");
  const rawNrRegCom =
    bronze.extractedNrRegCom ??
    resolveField(payload, mapping, "nrRegistru", "nr reg com", "Nr reg com", "nr_reg_com");
  const { cui, nrRegCom } = sanitizeIdentifiers(rawCui, rawNrRegCom);

  // GAP-B1: Verify CUI validation before promotion
  const metadata = (bronze.metadata as Record<string, unknown>) ?? {};
  const cuiValidation = metadata.cuiValidation as { status?: string } | undefined;
  const cuiValidated = cui
    ? cuiValidation?.status === "valid" || cuiValidation?.status === "not_found"
    : false;

  if (cui && !cuiValidated) {
    return {
      ok: false,
      status: "blocked",
      reason: "cui_not_validated",
      cui,
    };
  }
  const existingSilver = await getResolvedCompany(
    jobData.tenantId,
    bronze.resolvedCompanyId,
    cui,
    nrRegCom,
  );
  const { companyName, email, phone, website, companyUpdate } = buildCompanyUpdate({
    bronze,
    payload,
    mapping,
    rawNrRegCom,
    cui,
    nrRegCom,
    existingSilver,
  });
  const dedupMerged = Boolean(
    existingSilver?.sourceBronzeId && existingSilver.sourceBronzeId !== bronze.id,
  );
  const duplicateOfId = dedupMerged ? (existingSilver?.sourceBronzeId ?? null) : null;
  const silverId = await persistSilverCompany({
    tenantId: jobData.tenantId,
    cui,
    nrRegCom,
    existingSilver,
    companyUpdate,
  });
  await upsertPromotionIdentityKeys({
    tenantId: jobData.tenantId,
    companyId: silverId,
    bronzeId: bronze.id,
    cui,
    rawCui,
    nrRegCom,
    rawNrRegCom,
  });
  await upsertPromotionPrimaryContact({
    tenantId: jobData.tenantId,
    companyId: silverId,
    payload,
    mapping,
    email,
    phone,
  });

  await markBronzePromoted(jobData.tenantId, bronze.id, silverId, dedupMerged, duplicateOfId);
  await triggerCompanyEnrichment({
    tenantId: jobData.tenantId,
    companyId: silverId,
    cui,
    website,
    companyName,
    correlationId: jobData.correlationId,
  });

  return { ok: true, status: "promoted", silverId, dedupMerged };
}

async function handleAnafDebtDetail(args: {
  jobData: PromotionBronzeSilverJobData;
  bronze: typeof bronzeContacts.$inferSelect;
  payload: Payload;
  mapping: Mapping;
}) {
  const parent = await findOrCreateParentCompany({
    tenantId: args.jobData.tenantId,
    bronzeId: args.bronze.id,
    resolvedCompanyId: args.bronze.resolvedCompanyId,
    payload: args.payload,
    mapping: args.mapping,
    metadata: (args.bronze.metadata as Record<string, unknown>) ?? {},
  });
  if (!parent) return { ok: true, status: "skipped", reason: "no_identifiers" };

  await db.insert(silverDatoriiAnaf).values({
    tenantId: args.jobData.tenantId,
    companyId: parent.id,
    tipBuget:
      resolveField(args.payload, args.mapping, "tipBuget", "Tip Buget", "tip buget") ??
      "necunoscut",
    sumaRestanta: parseRomanianNumeric(
      resolveField(args.payload, args.mapping, "sumaRestanta", "Suma Restanta"),
    ),
    dataVerificare:
      resolveField(args.payload, args.mapping, "dataVerificare", "Data Verificare") ?? undefined,
    sursa: "excel_import",
    metadata: {
      bronzeContactId: args.bronze.id,
      sheetName: (args.bronze.metadata as Record<string, unknown>)?.sheetName ?? null,
    },
  });

  await markBronzePromoted(args.jobData.tenantId, args.bronze.id, parent.id);
  return { ok: true, status: "detail_promoted", type: "anaf_debts", silverId: parent.id };
}

async function handleBpiDetail(args: {
  jobData: PromotionBronzeSilverJobData;
  bronze: typeof bronzeContacts.$inferSelect;
  payload: Payload;
  mapping: Mapping;
}) {
  const parent = await findOrCreateParentCompany({
    tenantId: args.jobData.tenantId,
    bronzeId: args.bronze.id,
    resolvedCompanyId: args.bronze.resolvedCompanyId,
    payload: args.payload,
    mapping: args.mapping,
    metadata: (args.bronze.metadata as Record<string, unknown>) ?? {},
  });
  if (!parent) return { ok: true, status: "skipped", reason: "no_identifiers" };

  await db.insert(silverBpiActe).values({
    tenantId: args.jobData.tenantId,
    companyId: parent.id,
    tipAct: resolveField(args.payload, args.mapping, "tipAct", "Tip Act", "tip_act") ?? undefined,
    numarAct:
      resolveField(args.payload, args.mapping, "numarAct", "Numar Act", "numar_act") ?? undefined,
    dataAct:
      resolveField(args.payload, args.mapping, "dataAct", "Data Act", "data_act") ?? undefined,
    instanta: resolveField(args.payload, args.mapping, "instanta", "Instanta") ?? undefined,
    numarDosar:
      resolveField(args.payload, args.mapping, "numarDosar", "Numar Dosar", "numar_dosar") ??
      undefined,
    stare: resolveField(args.payload, args.mapping, "stare", "Stare") ?? undefined,
    metadata: {
      bronzeContactId: args.bronze.id,
      sheetName: (args.bronze.metadata as Record<string, unknown>)?.sheetName ?? null,
    },
  });

  await markBronzePromoted(args.jobData.tenantId, args.bronze.id, parent.id);
  return { ok: true, status: "detail_promoted", type: "bpi", silverId: parent.id };
}

async function handleCipDetail(args: {
  jobData: PromotionBronzeSilverJobData;
  bronze: typeof bronzeContacts.$inferSelect;
  payload: Payload;
  mapping: Mapping;
}) {
  const parent = await findOrCreateParentCompany({
    tenantId: args.jobData.tenantId,
    bronzeId: args.bronze.id,
    resolvedCompanyId: args.bronze.resolvedCompanyId,
    payload: args.payload,
    mapping: args.mapping,
    metadata: (args.bronze.metadata as Record<string, unknown>) ?? {},
  });
  if (!parent) return { ok: true, status: "skipped", reason: "no_identifiers" };

  await db.insert(silverCipIncidente).values({
    tenantId: args.jobData.tenantId,
    companyId: parent.id,
    tipInstrument:
      resolveField(
        args.payload,
        args.mapping,
        "tipInstrument",
        "Tip Instrument",
        "tip_instrument",
      ) ?? undefined,
    serieNumar:
      resolveField(args.payload, args.mapping, "serieNumar", "Serie Numar", "serie_numar") ??
      undefined,
    sumaRefuzata: parseRomanianNumeric(
      resolveField(args.payload, args.mapping, "sumaRefuzata", "Suma Refuzata"),
    ),
    dataRefuz:
      resolveField(args.payload, args.mapping, "dataRefuz", "Data Refuz", "data_refuz") ??
      undefined,
    motivRefuz:
      resolveField(args.payload, args.mapping, "motivRefuz", "Motiv Refuz", "motiv_refuz") ??
      undefined,
    institutieFinanciara:
      resolveField(
        args.payload,
        args.mapping,
        "institutieFinanciara",
        "Institutie Financiara",
        "institutie_financiara",
      ) ?? undefined,
    esteMajor:
      (resolveField(args.payload, args.mapping, "esteMajor", "este_major", "incident_major") ?? "")
        .toLowerCase()
        .trim() === "true",
    metadata: {
      bronzeContactId: args.bronze.id,
      sheetName: (args.bronze.metadata as Record<string, unknown>)?.sheetName ?? null,
    },
  });

  await markBronzePromoted(args.jobData.tenantId, args.bronze.id, parent.id);
  return { ok: true, status: "detail_promoted", type: "cip", silverId: parent.id };
}

async function findOrCreateDosar(args: {
  tenantId: string;
  companyId: string;
  payload: Payload;
  mapping: Mapping;
}) {
  const numarDosar =
    resolveField(args.payload, args.mapping, "numarDosar", "Numar Dosar", "numar_dosar") ?? null;
  let dosar =
    numarDosar == null
      ? undefined
      : await db.query.silverDosare.findFirst({
          where: (t) =>
            sql`${t.tenantId} = ${args.tenantId} AND ${t.companyId} = ${args.companyId} AND ${t.numarDosar} = ${numarDosar}`,
        });
  if (!dosar) {
    const inserted = await db
      .insert(silverDosare)
      .values({
        tenantId: args.tenantId,
        companyId: args.companyId,
        numarDosar: numarDosar ?? undefined,
        instanta: resolveField(args.payload, args.mapping, "instanta", "Instanta") ?? undefined,
        metadata: { autoCreatedFromDetail: true },
      })
      .returning();
    dosar = inserted[0];
  }
  return dosar;
}

async function handleDosareDetail(args: {
  jobData: PromotionBronzeSilverJobData;
  bronze: typeof bronzeContacts.$inferSelect;
  payload: Payload;
  mapping: Mapping;
}) {
  const parent = await findOrCreateParentCompany({
    tenantId: args.jobData.tenantId,
    bronzeId: args.bronze.id,
    resolvedCompanyId: args.bronze.resolvedCompanyId,
    payload: args.payload,
    mapping: args.mapping,
    metadata: (args.bronze.metadata as Record<string, unknown>) ?? {},
  });
  if (!parent) return { ok: true, status: "skipped", reason: "no_identifiers" };

  await db.insert(silverDosare).values({
    tenantId: args.jobData.tenantId,
    companyId: parent.id,
    numarDosar:
      resolveField(args.payload, args.mapping, "numarDosar", "Numar Dosar", "numar_dosar") ??
      undefined,
    instanta: resolveField(args.payload, args.mapping, "instanta", "Instanta") ?? undefined,
    categorieDosar:
      resolveField(
        args.payload,
        args.mapping,
        "categorieDosar",
        "Categorie Dosar",
        "categorie_dosar",
      ) ?? undefined,
    obiectDosar:
      resolveField(args.payload, args.mapping, "obiectDosar", "Obiect Dosar", "obiect_dosar") ??
      undefined,
    stadiu: resolveField(args.payload, args.mapping, "stadiu", "Stadiu") ?? undefined,
    dataUltimaModificare:
      parseTimestampSafe(
        resolveField(
          args.payload,
          args.mapping,
          "dataUltimaModificare",
          "Data Ultima Modificare",
          "data_ultima_modificare",
        ),
      ) ?? undefined,
    calitateParte:
      resolveField(
        args.payload,
        args.mapping,
        "calitateParte",
        "Calitate Parte",
        "calitate_parte",
      ) ?? undefined,
    metadata: {
      bronzeContactId: args.bronze.id,
      sheetName: (args.bronze.metadata as Record<string, unknown>)?.sheetName ?? null,
    },
  });

  await markBronzePromoted(args.jobData.tenantId, args.bronze.id, parent.id);
  return { ok: true, status: "detail_promoted", type: "dosare", silverId: parent.id };
}

async function handlePartiDosareDetail(args: {
  jobData: PromotionBronzeSilverJobData;
  bronze: typeof bronzeContacts.$inferSelect;
  payload: Payload;
  mapping: Mapping;
}) {
  const parent = await findOrCreateParentCompany({
    tenantId: args.jobData.tenantId,
    bronzeId: args.bronze.id,
    resolvedCompanyId: args.bronze.resolvedCompanyId,
    payload: args.payload,
    mapping: args.mapping,
    metadata: (args.bronze.metadata as Record<string, unknown>) ?? {},
  });
  if (!parent) return { ok: true, status: "skipped", reason: "no_identifiers" };

  const dosar = await findOrCreateDosar({
    tenantId: args.jobData.tenantId,
    companyId: parent.id,
    payload: args.payload,
    mapping: args.mapping,
  });

  await db.insert(silverPartiDosare).values({
    tenantId: args.jobData.tenantId,
    dosarId: dosar.id,
    numeParte:
      resolveField(args.payload, args.mapping, "numeParte", "Nume Parte", "nume_parte") ??
      undefined,
    calitate: resolveField(args.payload, args.mapping, "calitate", "Calitate") ?? undefined,
    metadata: {
      bronzeContactId: args.bronze.id,
      sheetName: (args.bronze.metadata as Record<string, unknown>)?.sheetName ?? null,
    },
  });

  await markBronzePromoted(args.jobData.tenantId, args.bronze.id, parent.id);
  return { ok: true, status: "detail_promoted", type: "parti_dosare", silverId: parent.id };
}

async function handleTermeneDosareDetail(args: {
  jobData: PromotionBronzeSilverJobData;
  bronze: typeof bronzeContacts.$inferSelect;
  payload: Payload;
  mapping: Mapping;
}) {
  const parent = await findOrCreateParentCompany({
    tenantId: args.jobData.tenantId,
    bronzeId: args.bronze.id,
    resolvedCompanyId: args.bronze.resolvedCompanyId,
    payload: args.payload,
    mapping: args.mapping,
    metadata: (args.bronze.metadata as Record<string, unknown>) ?? {},
  });
  if (!parent) return { ok: true, status: "skipped", reason: "no_identifiers" };

  const dosar = await findOrCreateDosar({
    tenantId: args.jobData.tenantId,
    companyId: parent.id,
    payload: args.payload,
    mapping: args.mapping,
  });

  await db.insert(silverTermeneDosare).values({
    tenantId: args.jobData.tenantId,
    dosarId: dosar.id,
    dataTermen:
      resolveField(args.payload, args.mapping, "dataTermen", "Data Termen", "data_termen") ??
      undefined,
    oraTermen:
      resolveField(args.payload, args.mapping, "oraTermen", "Ora Termen", "ora_termen") ??
      undefined,
    solutie: resolveField(args.payload, args.mapping, "solutie", "Solutie") ?? undefined,
    documenteSolutie:
      resolveField(
        args.payload,
        args.mapping,
        "documenteSolutie",
        "Documente Solutie",
        "documente_solutie",
      ) ?? undefined,
    metadata: {
      bronzeContactId: args.bronze.id,
      sheetName: (args.bronze.metadata as Record<string, unknown>)?.sheetName ?? null,
    },
  });

  await markBronzePromoted(args.jobData.tenantId, args.bronze.id, parent.id);
  return { ok: true, status: "detail_promoted", type: "termene_dosare", silverId: parent.id };
}

export const promotionBronzeSilverProcessor: Processor<PromotionBronzeSilverJobData> = async (
  job,
) => {
  validateJobData(promotionBronzeSilverJobDataSchema, job.data, {
    queueName: QUEUES.PIPELINE_PROMOTE_BRONZE_SILVER,
    jobId: job.id,
  });
  await setSessionTenantId(job.data.tenantId);

  if (job.data.batchId && !job.data.bronzeContactId) {
    return handleBatchReprocessJob(job, job.data);
  }

  const bronze = (
    await db
      .select()
      .from(bronzeContacts)
      .where(sql`${bronzeContacts.id} = ${job.data.bronzeContactId}`)
      .limit(1)
  )[0];

  if (!bronze) {
    return { ok: false, status: "not_found", reason: "bronze_contact_missing" };
  }

  if (bronze.doNotProcess) {
    return {
      ok: true,
      status: "skipped",
      reason: `bronze_${bronze.identityStatus ?? "blocked"}`,
    };
  }

  const payload = bronze.rawPayload as Payload;
  const bronzeMetadata = (bronze.metadata as Record<string, unknown>) ?? {};
  const mapping = await loadBatchMapping(
    job.data.tenantId,
    typeof bronzeMetadata.batchId === "string" ? bronzeMetadata.batchId : null,
  );
  const sheetType = detectSheetType(
    typeof bronzeMetadata.sheetName === "string" ? bronzeMetadata.sheetName : null,
    Object.keys(payload),
  );

  // GAP-B5: Wrap single promotion in retry logic for serialization/deadlock errors
  const promotionArgs = { jobData: job.data, bronze, payload, mapping };
  switch (sheetType) {
    case "company":
      return withBatchMetadataRetry(job.data.tenantId, "single-promote-company", () =>
        handleCompanyPromotion(promotionArgs),
      );
    case "anaf_debts":
      return withBatchMetadataRetry(job.data.tenantId, "single-promote-anaf-debts", () =>
        handleAnafDebtDetail(promotionArgs),
      );
    case "bpi":
      return withBatchMetadataRetry(job.data.tenantId, "single-promote-bpi", () =>
        handleBpiDetail(promotionArgs),
      );
    case "cip":
      return withBatchMetadataRetry(job.data.tenantId, "single-promote-cip", () =>
        handleCipDetail(promotionArgs),
      );
    case "dosare":
      return withBatchMetadataRetry(job.data.tenantId, "single-promote-dosare", () =>
        handleDosareDetail(promotionArgs),
      );
    case "parti_dosare":
      return withBatchMetadataRetry(job.data.tenantId, "single-promote-parti-dosare", () =>
        handlePartiDosareDetail(promotionArgs),
      );
    case "termene_dosare":
      return withBatchMetadataRetry(job.data.tenantId, "single-promote-termene-dosare", () =>
        handleTermeneDosareDetail(promotionArgs),
      );
    default:
      return withBatchMetadataRetry(job.data.tenantId, "single-promote-default", () =>
        handleCompanyPromotion(promotionArgs),
      );
  }
};
