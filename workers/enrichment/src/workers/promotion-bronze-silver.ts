import { setTimeout as delay } from "node:timers/promises";
import { type Processor } from "bullmq";
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
} from "@cerniq/db";
import { createQueue, normalizeNrRegCom } from "@cerniq/worker-shared";
import { sanitizeCui } from "../lib/cui-validation.js";
import { normalizeRow } from "./ingest-utils.js";
import { createHitlApprovalTask } from "./pipeline-utils.js";

export type PromotionBronzeSilverJobData = {
  tenantId: string;
  bronzeContactId?: string;
  batchId?: string;
  correlationId?: string;
};

const NEXT_ENRICHMENT_QUEUES = [
  "enrich:anaf:fiscal-status",
  "enrich:anaf:tva-status",
  "enrich:anaf:efactura",
  "enrich:anaf:datorii",
  "enrich:anaf:caen",
  "enrich:termene:balance",
  "enrich:termene:risk",
  "enrich:termene:dosare",
  "enrich:termene:actionari",
  "enrich:onrc:data",
  "enrich:onrc:administratori",
  "enrich:onrc:sedii",
  "discover:email:hunter",
  "discover:email:pattern",
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

function readErrorCode(error: unknown): string {
  if (error && typeof error === "object") {
    if ("code" in error && error.code) {
      return String(error.code);
    }
    if (
      "cause" in error &&
      error.cause &&
      typeof error.cause === "object" &&
      "code" in error.cause
    ) {
      const causeCode = (error.cause as { code?: unknown }).code;
      if (causeCode) {
        return String(causeCode);
      }
    }
  }
  return "";
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const causeMessage =
      error.cause instanceof Error
        ? error.cause.message
        : error.cause != null
          ? String(error.cause)
          : "";
    return causeMessage ? `${error.message} | cause: ${causeMessage}` : error.message;
  }
  return String(error);
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

function batchIdMetadataEquals(metadataColumn: unknown, batchId: string) {
  return sql`COALESCE(jsonb_extract_path_text(${metadataColumn}, ${"batchId"}), ${""}) = ${batchId}`;
}

function normalizeKey(input: string): string {
  return input.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

function readTrimmedValue(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
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
  if (value == null) return null;
  const str = String(value).trim();
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
  if (value == null) return null;
  const str = String(value).trim();
  if (!str || str === "-") return null;
  const n = Number.parseInt(str.replaceAll(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export function parseTimestampSafe(value: unknown): Date | null {
  if (value == null) return null;
  const str = String(value).trim();
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
  if (sn.includes("parti")) return "parti_dosare";
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
) {
  const { patch } = getIdentityReprocessPatch(bronze, payload, mapping);
  const hasChanges = Object.entries(patch).some(
    ([key, value]) => bronze[key as keyof BronzeContactRow] !== value,
  );

  if (!hasChanges) {
    return;
  }

  await db
    .update(bronzeContacts)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(sql`${bronzeContacts.id} = ${bronze.id}`);
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

async function handleBatchReprocess(jobData: PromotionBronzeSilverJobData) {
  if (!jobData.batchId) {
    return { ok: false, status: "missing_batch_id" };
  }
  const batchId = jobData.batchId;

  async function updateBatchReprocessMetadata(patch: Record<string, unknown>) {
    await withBatchMetadataRetry(jobData.tenantId, "updateBatchReprocessMetadata", async () => {
      const [batch] = await db
        .select({ metadata: bronzeImportBatches.metadata })
        .from(bronzeImportBatches)
        .where(
          sql`${bronzeImportBatches.tenantId} = ${jobData.tenantId} AND ${bronzeImportBatches.id} = ${jobData.batchId}`,
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
          sql`${bronzeImportBatches.tenantId} = ${jobData.tenantId} AND ${bronzeImportBatches.id} = ${jobData.batchId}`,
        );
    });
  }
  const pageSize = 500;

  let lastId: string | null = null;
  let processed = 0;
  let resolved = 0;
  let duplicateSource = 0;
  let identityConflict = 0;
  let insufficientIdentifiers = 0;
  let promotionQueued = 0;
  let mapping: Mapping;

  try {
    await updateBatchReprocessMetadata({
      identityReprocessStatus: "running",
      identityReprocessStartedAt: new Date().toISOString(),
      identityReprocessCompletedAt: null,
      identityReprocessFailedAt: null,
      identityReprocessLastError: null,
      identityReprocessLastProgressAt: new Date().toISOString(),
      identityReprocessProcessedRows: 0,
      identityReprocessResolvedRows: 0,
      identityReprocessDuplicateSourceRows: 0,
      identityReprocessIdentityConflictRows: 0,
      identityReprocessInsufficientIdentifierRows: 0,
      identityReprocessPromotionQueued: 0,
    });
    mapping = await loadBatchMapping(jobData.tenantId, batchId);

    while (true) {
      const contacts = await db.query.bronzeContacts.findMany({
        where: (t) => {
          const base = sql`${t.tenantId} = ${jobData.tenantId}
            AND ${batchIdMetadataEquals(t.metadata, batchId)}`;

          if (!lastId) {
            return base;
          }

          return sql`${base} AND ${t.id} > ${lastId}`;
        },
        orderBy: (t) => [t.id],
        limit: pageSize,
      });

      if (contacts.length === 0) {
        break;
      }

      for (const bronze of contacts) {
        const payload = bronze.rawPayload as Payload;
        await backfillBronzeIdentityFields(bronze, payload, mapping);

        const resolution = await resolveBronzeContactIdentity({
          tenantId: jobData.tenantId,
          bronzeContactId: bronze.id,
          sourceAuthority: "import",
        });

        processed += 1;

        if (resolution.status === "resolved") {
          resolved += 1;
          continue;
        }

        if (resolution.status === "duplicate_source") {
          duplicateSource += 1;
          continue;
        }

        if (resolution.status === "insufficient_identifiers") {
          insufficientIdentifiers += 1;
          continue;
        }

        identityConflict += 1;
        await ensureIdentityConflictApprovalTask(
          jobData.tenantId,
          bronze,
          resolution.conflictCompanyIds,
        );
      }

      await updateBatchReprocessMetadata({
        identityReprocessStatus: "running",
        identityReprocessFailedAt: null,
        identityReprocessLastError: null,
        identityReprocessLastProgressAt: new Date().toISOString(),
        identityReprocessProcessedRows: processed,
        identityReprocessResolvedRows: resolved,
        identityReprocessDuplicateSourceRows: duplicateSource,
        identityReprocessIdentityConflictRows: identityConflict,
        identityReprocessInsufficientIdentifierRows: insufficientIdentifiers,
        identityReprocessPromotionQueued: promotionQueued,
      });

      const lastContact = contacts.at(-1);
      lastId = lastContact?.id ?? null;
    }

    promotionQueued = await queueResolvedBatchPromotions(jobData.tenantId, batchId, pageSize);

    await updateBatchReprocessMetadata({
      identityReprocessStatus: "completed",
      identityReprocessCompletedAt: new Date().toISOString(),
      identityReprocessFailedAt: null,
      identityReprocessLastError: null,
      identityReprocessLastProgressAt: new Date().toISOString(),
      identityReprocessProcessedRows: processed,
      identityReprocessResolvedRows: resolved,
      identityReprocessDuplicateSourceRows: duplicateSource,
      identityReprocessIdentityConflictRows: identityConflict,
      identityReprocessInsufficientIdentifierRows: insufficientIdentifiers,
      identityReprocessPromotionQueued: promotionQueued,
    });
  } catch (error) {
    try {
      await updateBatchReprocessMetadata({
        identityReprocessStatus: "failed",
        identityReprocessFailedAt: new Date().toISOString(),
        identityReprocessLastProgressAt: new Date().toISOString(),
        identityReprocessLastError: readErrorMessage(error),
        identityReprocessProcessedRows: processed,
        identityReprocessResolvedRows: resolved,
        identityReprocessDuplicateSourceRows: duplicateSource,
        identityReprocessIdentityConflictRows: identityConflict,
        identityReprocessInsufficientIdentifierRows: insufficientIdentifiers,
        identityReprocessPromotionQueued: promotionQueued,
      });
    } catch (metadataError) {
      console.error(
        `[promotion-bronze-silver] failed to persist reprocess failure metadata for batch ${batchId}: ${readErrorMessage(metadataError)}`,
      );
    }
    throw error;
  }

  return {
    ok: true,
    status: "batch_reprocessed",
    batchId,
    processed,
    resolved,
    duplicateSource,
    identityConflict,
    insufficientIdentifiers,
    promotionQueued,
  };
}

async function queueResolvedBatchPromotions(tenantId: string, batchId: string, pageSize: number) {
  const promotionQueue = createQueue("pipeline:promote:bronze-silver");
  let lastId: string | null = null;
  let queued = 0;

  try {
    while (true) {
      const contacts = await db.query.bronzeContacts.findMany({
        where: (t) => {
          const base = sql`${t.tenantId} = ${tenantId}
            AND ${batchIdMetadataEquals(t.metadata, batchId)}
            AND ${t.identityStatus} = 'resolved'
            AND COALESCE(${t.doNotProcess}, FALSE) = FALSE`;

          if (!lastId) {
            return base;
          }

          return sql`${base} AND ${t.id} > ${lastId}`;
        },
        orderBy: (t) => [t.id],
        limit: pageSize,
        columns: {
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
      lastId = lastContact?.id ?? null;
    }
  } finally {
    await promotionQueue.close();
  }

  return queued;
}

async function markBronzePromoted(
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
    .where(sql`${bronzeContacts.id} = ${bronzeId}`);
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
    nrRegCom: rawNrRegCom ? normalizeNrRegCom(rawNrRegCom) : null,
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
    return "bronze_to_silver_fill_placeholder";
  }
  return "bronze_to_silver_insert";
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
  const companyName =
    bronze.extractedName ??
    resolveField(payload, mapping, "companyName", "denumire", "Denumire Firma", "name");
  const email =
    bronze.extractedEmail ??
    resolveField(payload, mapping, "email", "Email", "email_address", "mail");
  const phone =
    bronze.extractedPhone ??
    resolveField(payload, mapping, "phone", "telefon", "Telefon MF", "mobile");
  const address =
    bronze.extractedAddress ?? resolveField(payload, mapping, "address", "adresa", "Adresa ANAF");
  const website = resolveField(payload, mapping, "website", "site", "url");
  const identityStatus = getCompanyIdentityStatus(cui, nrRegCom);
  const promotion = getPromotionKind(existingSilver, bronze.id);
  const sourceSheet = (bronze.metadata as Record<string, unknown> | undefined)?.sheetName ?? null;

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
      identityStatus,
      codCaenPrincipal:
        resolveField(payload, mapping, "caen", "CAEN", "cod_caen", "nace code") ?? undefined,
      denumireCaen:
        resolveField(payload, mapping, "caenText", "denumire_caen", "nace text") ?? undefined,
      judet:
        bronze.extractedJudet ??
        (resolveField(payload, mapping, "judet", "Judet", "county") || undefined),
      localitate:
        bronze.extractedLocalitate ??
        (resolveField(payload, mapping, "localitate", "Localitate", "oras", "city") || undefined),
      cifraAfaceri: parseRomanianNumeric(
        resolveField(payload, mapping, "cifraAfaceri", "Cifra de afaceri"),
      ),
      profitNet: parseRomanianNumeric(
        resolveField(payload, mapping, "profitNet", "Profit / Pierdere Neta"),
      ),
      profitBrut: parseRomanianNumeric(
        resolveField(payload, mapping, "profitBrut", "Profit / Pierdere Bruta", "profit brut"),
      ),
      venituriTotale: parseRomanianNumeric(
        resolveField(payload, mapping, "venituriTotale", "Venituri totale"),
      ),
      cheltuieliTotale: parseRomanianNumeric(
        resolveField(payload, mapping, "cheltuieliTotale", "Cheltuieli totale"),
      ),
      activeTotale: parseRomanianNumeric(
        resolveField(payload, mapping, "activeTotale", "Total Active"),
      ),
      activeImobilizate: parseRomanianNumeric(
        resolveField(payload, mapping, "activeImobilizate", "Active Imobilizate"),
      ),
      activeCirculante: parseRomanianNumeric(
        resolveField(payload, mapping, "activeCirculante", "Active Circulante"),
      ),
      creante: parseRomanianNumeric(resolveField(payload, mapping, "creante", "Creante")),
      stocuri: parseRomanianNumeric(resolveField(payload, mapping, "stocuri", "Stocuri")),
      capitalSocial: parseRomanianNumeric(
        resolveField(payload, mapping, "capitalSocial", "Capital social"),
      ),
      capitaluriProprii: parseRomanianNumeric(
        resolveField(payload, mapping, "capitaluriProprii", "Capitaluri proprii Total"),
      ),
      datoriiTotale: parseRomanianNumeric(
        resolveField(payload, mapping, "datoriiTotale", "Datorii Total"),
      ),
      numarAngajati: parseIntSafe(
        resolveField(payload, mapping, "numarAngajati", "Numar mediu de salariati"),
      ),
      anulInfiintarii: parseIntSafe(
        resolveField(payload, mapping, "anulInfiintarii", "Anul infiintarii calculat"),
      ),
      ratingExtern: parseIntSafe(resolveField(payload, mapping, "ratingExtern", "Rating")),
      limitaCreditEur: parseRomanianNumeric(
        resolveField(payload, mapping, "limitaCreditEur", "Limita de credit (EUR)"),
      ),
      sourceBronzeId: bronze.id,
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
        promotion,
        promotedAt: new Date().toISOString(),
        sourceSheet,
      })}::jsonb`,
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
    .onConflictDoNothing();
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
          promotion: "stub_from_detail",
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

  await markBronzePromoted(bronze.id, silverId, dedupMerged, duplicateOfId);
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

  await markBronzePromoted(args.bronze.id, parent.id);
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

  await markBronzePromoted(args.bronze.id, parent.id);
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

  await markBronzePromoted(args.bronze.id, parent.id);
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
        metadata: { promotedAsStub: true },
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

  await markBronzePromoted(args.bronze.id, parent.id);
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

  await markBronzePromoted(args.bronze.id, parent.id);
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

  await markBronzePromoted(args.bronze.id, parent.id);
  return { ok: true, status: "detail_promoted", type: "termene_dosare", silverId: parent.id };
}

export const promotionBronzeSilverProcessor: Processor<PromotionBronzeSilverJobData> = async (
  job,
) => {
  await setSessionTenantId(job.data.tenantId);

  if (job.data.batchId && !job.data.bronzeContactId) {
    return handleBatchReprocess(job.data);
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
  const metadata = (bronze.metadata as Record<string, unknown>) ?? {};
  const mapping = await loadBatchMapping(
    job.data.tenantId,
    typeof metadata.batchId === "string" ? metadata.batchId : null,
  );
  const sheetType = detectSheetType(
    typeof metadata.sheetName === "string" ? metadata.sheetName : null,
    Object.keys(payload),
  );

  switch (sheetType) {
    case "company":
      return handleCompanyPromotion({ jobData: job.data, bronze, payload, mapping });
    case "anaf_debts":
      return handleAnafDebtDetail({ jobData: job.data, bronze, payload, mapping });
    case "bpi":
      return handleBpiDetail({ jobData: job.data, bronze, payload, mapping });
    case "cip":
      return handleCipDetail({ jobData: job.data, bronze, payload, mapping });
    case "dosare":
      return handleDosareDetail({ jobData: job.data, bronze, payload, mapping });
    case "parti_dosare":
      return handlePartiDosareDetail({ jobData: job.data, bronze, payload, mapping });
    case "termene_dosare":
      return handleTermeneDosareDetail({ jobData: job.data, bronze, payload, mapping });
    default:
      return handleCompanyPromotion({ jobData: job.data, bronze, payload, mapping });
  }
};
