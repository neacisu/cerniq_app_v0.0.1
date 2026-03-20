import type { Processor } from "bullmq";
import { db, silverCompanies, silverEnrichmentLog, setSessionTenantId, sql } from "@cerniq/db";
import { fetchAnafRecordByCui } from "../lib/anaf-api-client.js";
import { sanitizeCui } from "../lib/cui-validation.js";
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

  const record = await fetchAnafRecordByCui(cleanedCui);
  const codCaen = String(record?.caen ?? record?.cod_CAEN ?? "").trim();
  const agricultural = codCaen ? isAgriculturalCaen(codCaen) : false;

  await db
    .update(silverCompanies)
    .set({
      codCaenPrincipal: codCaen || undefined,
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
        anafCaen: { codCaen, agricultural, record },
      })}::jsonb`,
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
    responsePayload: record,
    fieldsUpdated: ["codCaenPrincipal", "metadata"],
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
    status: record ? "success" : "not_found",
    source: "anaf_caen",
    cleanedCui,
    codCaenPrincipal: codCaen || null,
    isAgricultural: agricultural,
  };
};
