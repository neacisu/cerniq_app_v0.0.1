import type { Processor } from "bullmq";
import { db, silverCompanies, silverEnrichmentLog, setSessionTenantId, sql } from "@cerniq/db";
import { fetchAnafRecordByCui } from "../lib/anaf-api-client.js";
import { sanitizeCui } from "../lib/cui-validation.js";
import { markEnrichmentSourceComplete } from "../lib/enrichment-completion.js";

export type AnafEfacturaJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

export const anafEfacturaProcessor: Processor<AnafEfacturaJobData> = async (job) => {
  const startedAt = Date.now();
  const cleanedCui = sanitizeCui(job.data.cui);
  await setSessionTenantId(job.data.tenantId);

  const record = await fetchAnafRecordByCui(cleanedCui);
  const inregistratEFactura = Boolean(record && (record.eFactura ?? record.efactura ?? false));

  await db
    .update(silverCompanies)
    .set({
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
        anafEfactura: { inregistratEFactura, record },
      })}::jsonb`,
      lastEnrichedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "anaf_efactura",
    operation: "fetch",
    requestPayload: { cui: cleanedCui },
    responsePayload: record,
    fieldsUpdated: ["metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });
  await markEnrichmentSourceComplete(
    job.data.tenantId,
    job.data.companyId,
    "anaf_efactura",
    job.data.correlationId,
  );

  return {
    ok: true,
    status: record ? "success" : "not_found",
    source: "anaf_efactura",
    cleanedCui,
    inregistratEFactura,
  };
};
