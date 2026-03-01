import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createHitlApprovalTask } from "./pipeline-utils.js";

export type AiConfidenceJobData = {
  tenantId: string;
  companyId: string;
  correlationId?: string;
};

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

export const aiConfidenceScorerProcessor: Processor<AiConfidenceJobData> = async (job) => {
  const startedAt = Date.now();
  await setSessionTenantId(job.data.tenantId);
  const company = await db.query.silverCompanies.findFirst({
    where: (t, { and, eq }) => and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
  });
  if (!company) return { ok: false, status: "not_found" };

  const fieldScores: Record<string, number> = {
    cui: company.cui ? 0.6 : 0,
    denumire: company.denumire ? 0.8 : 0,
    email: company.email ? 0.7 : 0,
    telefon: company.telefon ? 0.7 : 0,
    adresa: company.adresa ? 0.7 : 0,
    caen: company.codCaenPrincipal ? 0.8 : 0,
    fiscal: company.statusFirma ? 0.8 : 0,
    financiar: hasValue(company.cifraAfaceri) || hasValue(company.profitNet) ? 0.7 : 0,
    geodata: hasValue(company.latitude) && hasValue(company.longitude) ? 0.8 : 0,
  };

  const values = Object.values(fieldScores);
  const overall = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const lowFields = Object.entries(fieldScores)
    .filter(([, v]) => v < 0.5)
    .map(([k]) => k);

  if (lowFields.length > 2 || overall < 0.5) {
    await createHitlApprovalTask({
      tenantId: job.data.tenantId,
      entityType: "company",
      entityId: job.data.companyId,
      type: "low_confidence_review",
      title: "Scor de incredere scazut",
      description: "Compania are date cu incredere insuficienta",
      aiConfidence: overall,
      aiRecommendation: "review",
      urgency: "high",
      metadata: { fieldScores, overall, lowFields },
      expiresInHours: 24,
    });
  }

  await db
    .update(silverCompanies)
    .set({
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
        aiConfidence: { overall, fieldScores, lowFields, scoredAt: new Date().toISOString() },
      })}::jsonb`,
      updatedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "ai_confidence_scorer",
    operation: "score",
    requestPayload: null,
    responsePayload: { overall, fieldScores, lowFields },
    fieldsUpdated: ["metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return { ok: true, status: "success", overall, lowFields: lowFields.length };
};
