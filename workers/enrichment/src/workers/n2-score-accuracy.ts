import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { validateCuiModulo11 } from "../lib/cui-validation.js";

export type AccuracyJobData = {
  tenantId: string;
  companyId: string;
  correlationId?: string;
};

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const scoreAccuracyProcessor: Processor<AccuracyJobData> = async (job) => {
  const startedAt = Date.now();
  await setSessionTenantId(job.data.tenantId);
  const company = await db.query.silverCompanies.findFirst({
    where: (t, { and, eq }) => and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
  });
  if (!company) return { ok: false, status: "not_found" };

  let points = 0;
  const issues: string[] = [];
  if (company.cui) {
    const res = validateCuiModulo11(company.cui);
    if (res.isValid) points += 30;
    else issues.push("CUI invalid");
  } else {
    issues.push("CUI missing");
  }
  if (company.email) {
    if (validEmail(company.email)) points += 20;
    else issues.push("Email invalid");
  }
  if (company.telefon) points += 10;
  if (company.latitude && company.longitude) points += 15;
  if (company.statusFirma) points += 10;
  if (company.codCaenPrincipal) points += 10;
  if (company.categorieRisc) points += 5;
  const score = Math.max(0, Math.min(100, points));

  await db
    .update(silverCompanies)
    .set({
      accuracyScore: String(score),
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
        qualityAccuracy: { score, issues, calculatedAt: new Date().toISOString() },
      })}::jsonb`,
      updatedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "score_accuracy",
    operation: "score",
    requestPayload: null,
    responsePayload: { score, issues },
    fieldsUpdated: ["accuracyScore", "metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return { ok: true, status: "success", score, issues: issues.length };
};
