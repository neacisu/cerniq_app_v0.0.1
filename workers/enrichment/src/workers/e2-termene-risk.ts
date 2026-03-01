import type { Processor } from "bullmq";
import { db, silverCompanies, silverEnrichmentLog, setSessionTenantId, sql } from "@cerniq/db";
import { sanitizeCui } from "../lib/cui-validation.js";
import { getTermeneRisk } from "../lib/termene-api-client.js";

export type TermeneRiskJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

function mapRiskCategory(score: number): "LOW" | "MEDIUM" | "HIGH" {
  if (score <= 30) return "LOW";
  if (score <= 60) return "MEDIUM";
  return "HIGH";
}

export const termeneRiskProcessor: Processor<TermeneRiskJobData> = async (job) => {
  const startedAt = Date.now();
  const cleanedCui = sanitizeCui(job.data.cui);
  await setSessionTenantId(job.data.tenantId);

  const payload = await getTermeneRisk(cleanedCui);
  if (!payload) {
    await db.insert(silverEnrichmentLog).values({
      tenantId: job.data.tenantId,
      entityType: "company",
      entityId: job.data.companyId,
      source: "termene_risk",
      operation: "fetch",
      requestPayload: { cui: cleanedCui },
      responsePayload: null,
      fieldsUpdated: [],
      correlationId: job.data.correlationId,
      jobId: String(job.id ?? ""),
      durationMs: Date.now() - startedAt,
    });
    return { ok: true, status: "not_found", source: "termene_risk", cleanedCui };
  }

  const scoreRaw = Number(payload.scor_risc ?? payload.risk_score ?? NaN);
  const hasValidScore = Number.isFinite(scoreRaw);
  const score = hasValidScore ? Math.max(0, Math.min(100, scoreRaw)) : null;
  const riskCategory = score !== null ? mapRiskCategory(score) : undefined;

  await db
    .update(silverCompanies)
    .set({
      categorieRisc: riskCategory,
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
        termeneRisk: { score, riskCategory, payload },
      })}::jsonb`,
      lastEnrichedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "termene_risk",
    operation: "fetch",
    requestPayload: { cui: cleanedCui },
    responsePayload: payload,
    fieldsUpdated: ["categorieRisc", "metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return {
    ok: true,
    status: "success",
    source: "termene_risk",
    cleanedCui,
    score,
    riskCategory,
  };
};
