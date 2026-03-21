import type { Processor } from "bullmq";
import { db, silverCompanies, silverEnrichmentLog, setSessionTenantId, sql } from "@cerniq/db";
import { sanitizeCui } from "@cerniq/worker-shared";
import { fetchAnafSingleByCui } from "../lib/anaf-api-client.js";
import { markEnrichmentSourceComplete } from "../lib/enrichment-completion.js";

export type AnafCaenJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

function isAgriculturalCaen(code: string): boolean {
  const prefix = code.slice(0, 2);
  return prefix === "01" || prefix === "02" || prefix === "03";
}

export const anafCaenProcessor: Processor<AnafCaenJobData> = async (job) => {
  const startedAt = Date.now();
  const cleanedCui = sanitizeCui(job.data.cui);
  await setSessionTenantId(job.data.tenantId);

  const record = await fetchAnafSingleByCui(cleanedCui);
  if (!record) {
    await db.insert(silverEnrichmentLog).values({
      tenantId: job.data.tenantId,
      entityType: "company",
      entityId: job.data.companyId,
      source: "anaf_caen",
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
      "anaf_caen",
      job.data.correlationId,
    );
    return { ok: true, status: "not_found", source: "anaf_caen", cleanedCui };
  }

  const codCaen = record.date_generale?.cod_CAEN?.trim() ?? "";
  const agricultural = codCaen ? isAgriculturalCaen(codCaen) : false;

  const caenSummary = { codCaen, agricultural };

  await db
    .update(silverCompanies)
    .set({
      codCaenPrincipal: codCaen || undefined,
      metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{anafCaen}', ${JSON.stringify(caenSummary)}::jsonb)`,
      lastEnrichedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "anaf_caen",
    operation: "fetch",
    requestPayload: { cui: cleanedCui },
    responsePayload: caenSummary,
    fieldsUpdated: codCaen ? ["codCaenPrincipal", "metadata"] : ["metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });
  await markEnrichmentSourceComplete(
    job.data.tenantId,
    job.data.companyId,
    "anaf_caen",
    job.data.correlationId,
  );

  return {
    ok: true,
    status: "success",
    source: "anaf_caen",
    cleanedCui,
    codCaenPrincipal: codCaen || null,
    isAgricultural: agricultural,
  };
};
