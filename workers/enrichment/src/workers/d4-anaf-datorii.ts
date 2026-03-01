import type { Processor } from "bullmq";
import { db, silverCompanies, silverEnrichmentLog, setSessionTenantId, sql } from "@cerniq/db";
import { fetchAnafRecordByCui } from "../lib/anaf-api-client.js";
import { sanitizeCui } from "../lib/cui-validation.js";

export type AnafDatoriiJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

export const anafDatoriiProcessor: Processor<AnafDatoriiJobData> = async (job) => {
  const startedAt = Date.now();
  const cleanedCui = sanitizeCui(job.data.cui);
  await setSessionTenantId(job.data.tenantId);

  const record = await fetchAnafRecordByCui(cleanedCui);
  const inactive = Boolean(record && (record.inactiv ?? record.stare === "INACTIV"));

  await db
    .update(silverCompanies)
    .set({
      statusFirma: inactive ? "INACTIVA" : undefined,
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
        anafDatorii: record,
      })}::jsonb`,
      lastEnrichedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "anaf_datorii",
    operation: "fetch",
    requestPayload: { cui: cleanedCui },
    responsePayload: record,
    fieldsUpdated: ["statusFirma", "metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return { ok: true, status: record ? "success" : "not_found", source: "anaf_datorii", cleanedCui };
};
