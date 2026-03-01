import { Queue, type Processor } from "bullmq";
import {
  db,
  setSessionTenantId,
  silverCompanies,
  silverContacts,
  silverEnrichmentLog,
  sql,
} from "@cerniq/db";
import { getQueuePrefix, getRedisConnectionOptions } from "@cerniq/worker-shared";
import { parsePhoneNumberFromString } from "libphonenumber-js";

export type PhoneNormalizerJobData = {
  tenantId: string;
  entityType: "company" | "contact";
  entityId: string;
  rawPhone: string;
  correlationId?: string;
};

export const phoneNormalizerSilverProcessor: Processor<PhoneNormalizerJobData> = async (job) => {
  const startedAt = Date.now();
  await setSessionTenantId(job.data.tenantId);

  const parsed = parsePhoneNumberFromString(job.data.rawPhone, "RO");
  const isValid = parsed?.isValid() ?? false;
  const e164 = parsed?.number ?? null;
  const national = parsed?.formatNational() ?? null;
  const phoneType = parsed?.getType() ?? "UNKNOWN";

  const metadataPatch = {
    phoneNormalization: {
      original: job.data.rawPhone,
      normalized: e164,
      national,
      isValid,
      phoneType,
      normalizedAt: new Date().toISOString(),
    },
  };

  if (job.data.entityType === "company") {
    await db
      .update(silverCompanies)
      .set({
        telefon: e164 ?? undefined,
        metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify(metadataPatch)}::jsonb`,
        updatedAt: new Date(),
      })
      .where(sql`${silverCompanies.id} = ${job.data.entityId}`);
  } else {
    await db
      .update(silverContacts)
      .set({
        telefon: e164 ?? undefined,
        telefonE164: e164 ?? undefined,
        metadata: sql`COALESCE(${silverContacts.metadata}, '{}'::jsonb) || ${JSON.stringify(metadataPatch)}::jsonb`,
        updatedAt: new Date(),
      })
      .where(sql`${silverContacts.id} = ${job.data.entityId}`);
  }

  if (isValid && e164) {
    const connection = getRedisConnectionOptions();
    const prefix = getQueuePrefix();
    const hlrQueue = new Queue("silver:enrich:hlr-lookup", { connection, prefix });
    await hlrQueue.add("hlr-lookup", {
      tenantId: job.data.tenantId,
      entityType: job.data.entityType,
      entityId: job.data.entityId,
      phone: e164,
      correlationId: job.data.correlationId,
    });
    await hlrQueue.close();

    const carrierQueue = new Queue("silver:enrich:carrier-detection", { connection, prefix });
    await carrierQueue.add("carrier-detect", {
      tenantId: job.data.tenantId,
      entityType: job.data.entityType,
      entityId: job.data.entityId,
      phone: e164,
      correlationId: job.data.correlationId,
    });
    await carrierQueue.close();
  }

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: job.data.entityType,
    entityId: job.data.entityId,
    source: "phone_normalizer",
    operation: "normalize",
    requestPayload: { rawPhone: job.data.rawPhone },
    responsePayload: { isValid, e164, national, phoneType },
    fieldsUpdated: ["telefon", "telefonE164", "metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return { ok: true, status: "success", isValid, e164, national, phoneType };
};
