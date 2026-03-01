import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";

export type CompletenessJobData = {
  tenantId: string;
  companyId: string;
  correlationId?: string;
};

const FIELD_WEIGHTS: Record<string, number> = {
  cui: 8,
  denumire: 8,
  localitate: 6,
  judet: 6,
  adresa: 5,
  email: 5,
  telefon: 5,
  website: 4,
  statusFirma: 5,
  codCaenPrincipal: 5,
  cifraAfaceri: 4,
  numarAngajati: 4,
  latitude: 3,
  longitude: 3,
  categorieRisc: 4,
  metadata: 5,
};

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export const scoreCompletenessProcessor: Processor<CompletenessJobData> = async (job) => {
  const startedAt = Date.now();
  await setSessionTenantId(job.data.tenantId);
  const company = await db.query.silverCompanies.findFirst({
    where: (t, { and, eq }) => and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
  });
  if (!company) return { ok: false, status: "not_found" };

  let total = 0;
  let earned = 0;
  const missing: string[] = [];
  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    total += weight;
    const value = (company as Record<string, unknown>)[field];
    if (hasValue(value)) earned += weight;
    else missing.push(field);
  }
  const score = Math.round((earned / total) * 100);

  await db
    .update(silverCompanies)
    .set({
      completenessScore: String(score),
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
        qualityCompleteness: { score, missing, calculatedAt: new Date().toISOString() },
      })}::jsonb`,
      updatedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "score_completeness",
    operation: "score",
    requestPayload: null,
    responsePayload: { score, missing },
    fieldsUpdated: ["completenessScore", "metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return { ok: true, status: "success", score, missing: missing.length };
};
