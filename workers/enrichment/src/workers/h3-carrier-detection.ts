import type { Processor } from "bullmq";
import {
  db,
  setSessionTenantId,
  silverCompanies,
  silverContacts,
  silverEnrichmentLog,
  sql,
} from "@cerniq/db";

export type CarrierDetectionJobData = {
  tenantId: string;
  entityType: "company" | "contact";
  entityId: string;
  phone: string;
  correlationId?: string;
};

const ROMANIAN_PREFIXES: Record<string, { carrier: string; type: "MOBILE" | "FIXED" }> = {
  "072": { carrier: "Vodafone", type: "MOBILE" },
  "073": { carrier: "Vodafone", type: "MOBILE" },
  "074": { carrier: "Orange", type: "MOBILE" },
  "075": { carrier: "Orange", type: "MOBILE" },
  "076": { carrier: "Digi/Telekom", type: "MOBILE" },
  "077": { carrier: "Digi/Vodafone", type: "MOBILE" },
  "078": { carrier: "Orange/Vodafone", type: "MOBILE" },
  "079": { carrier: "Orange/Vodafone", type: "MOBILE" },
  "021": { carrier: "Bucuresti", type: "FIXED" },
  "031": { carrier: "Bucuresti", type: "FIXED" },
  "0239": { carrier: "Braila", type: "FIXED" },
};

function normalizeToNational(phone: string): string {
  return phone.replace(/^\+40/, "0").replace(/^40/, "0").replace(/[^\d]/g, "");
}

function detectCarrier(phone: string): { carrier: string; type: "MOBILE" | "FIXED" } | null {
  const national = normalizeToNational(phone);
  const prefix4 = national.slice(0, 4);
  const prefix3 = national.slice(0, 3);
  return ROMANIAN_PREFIXES[prefix4] ?? ROMANIAN_PREFIXES[prefix3] ?? null;
}

export const carrierDetectionProcessor: Processor<CarrierDetectionJobData> = async (job) => {
  const startedAt = Date.now();
  await setSessionTenantId(job.data.tenantId);

  const detected = detectCarrier(job.data.phone);
  if (!detected) {
    return { ok: true, status: "unknown_carrier", phone: job.data.phone };
  }

  const patch = {
    carrierDetection: {
      phone: job.data.phone,
      carrier: detected.carrier,
      phoneType: detected.type,
      detectedAt: new Date().toISOString(),
    },
  };

  if (job.data.entityType === "company") {
    await db
      .update(silverCompanies)
      .set({
        metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`,
        updatedAt: new Date(),
      })
      .where(sql`${silverCompanies.id} = ${job.data.entityId}`);
  } else {
    await db
      .update(silverContacts)
      .set({
        metadata: sql`COALESCE(${silverContacts.metadata}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`,
        updatedAt: new Date(),
      })
      .where(sql`${silverContacts.id} = ${job.data.entityId}`);
  }

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: job.data.entityType,
    entityId: job.data.entityId,
    source: "carrier_detection",
    operation: "detect",
    requestPayload: { phone: job.data.phone },
    responsePayload: detected,
    fieldsUpdated: ["metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return { ok: true, status: "success", carrier: detected.carrier, phoneType: detected.type };
};
