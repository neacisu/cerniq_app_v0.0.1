import type { Processor } from "bullmq";
import { db, silverCompanies, silverEnrichmentLog, setSessionTenantId, sql } from "@cerniq/db";
import { sanitizeCui } from "@cerniq/worker-shared";
import { fetchAnafSingleByCui } from "../lib/anaf-api-client.js";
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

  const record = await fetchAnafSingleByCui(cleanedCui);
  if (!record) {
    await db.insert(silverEnrichmentLog).values({
      tenantId: job.data.tenantId,
      entityType: "company",
      entityId: job.data.companyId,
      source: "anaf_efactura",
      operation: "fetch",
      requestPayload: { cui: cleanedCui },
      responsePayload: null,
      fieldsUpdated: [],
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
    return { ok: true, status: "not_found", source: "anaf_efactura", cleanedCui };
  }

  const inregistratEFactura = record.date_generale?.statusRO_e_Factura ?? null;

  const efacturaSummary = { inregistratEFactura };

  await db
    .update(silverCompanies)
    .set({
      metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{anafEfactura}', ${JSON.stringify(efacturaSummary)}::jsonb)`,
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
    responsePayload: efacturaSummary,
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
    status: "success",
    source: "anaf_efactura",
    cleanedCui,
    inregistratEFactura,
  };
};
