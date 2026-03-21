import type { Processor } from "bullmq";
import { db, silverCompanies, silverEnrichmentLog, setSessionTenantId, sql } from "@cerniq/db";
import { sanitizeCui } from "@cerniq/worker-shared";
import { fetchAnafSingleByCui } from "../lib/anaf-api-client.js";
import { markEnrichmentSourceComplete } from "../lib/enrichment-completion.js";

export type AnafTvaJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

export const anafTvaProcessor: Processor<AnafTvaJobData> = async (job) => {
  const startedAt = Date.now();
  const cleanedCui = sanitizeCui(job.data.cui);
  await setSessionTenantId(job.data.tenantId);

  const record = await fetchAnafSingleByCui(cleanedCui);
  if (!record) {
    await db.insert(silverEnrichmentLog).values({
      tenantId: job.data.tenantId,
      entityType: "company",
      entityId: job.data.companyId,
      source: "anaf_tva",
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
      "anaf_tva",
      job.data.correlationId,
    );
    return { ok: true, status: "not_found", source: "anaf_tva", cleanedCui };
  }

  const tvaActive = record.inregistrare_scop_Tva?.scpTVA ?? null;
  const tvaIncasare = record.inregistrare_RTVAI?.statusTvaIncasare ?? null;

  const tvaSummary = {
    scpTVA: tvaActive,
    statusTvaIncasare: tvaIncasare,
    perioade_TVA: record.inregistrare_scop_Tva?.perioade_TVA ?? [],
  };

  await db
    .update(silverCompanies)
    .set({
      metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{anafTva}', ${JSON.stringify(tvaSummary)}::jsonb)`,
      lastEnrichedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "anaf_tva",
    operation: "fetch",
    requestPayload: { cui: cleanedCui },
    responsePayload: tvaSummary,
    fieldsUpdated: ["metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });
  await markEnrichmentSourceComplete(
    job.data.tenantId,
    job.data.companyId,
    "anaf_tva",
    job.data.correlationId,
  );

  return { ok: true, status: "success", source: "anaf_tva", cleanedCui, tvaActive };
};
