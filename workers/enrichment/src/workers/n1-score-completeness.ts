import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createQueue, QUEUES, withCognitiveSpan } from "@cerniq/worker-shared";

export type CompletenessJobData = {
  tenantId: string;
  companyId: string;
  correlationId?: string;
};

/**
 * Field weights for completeness scoring.
 * Exactly aligned with the DB silver_compute_completeness() function (20 fields).
 * Weights reflect business importance; DB trigger uses simple count (1 per field).
 * Total weight = 100 so score = (earned / total * 100) is already 0-100.
 */
const FIELD_WEIGHTS: Record<string, number> = {
  // Identity
  cui: 8,
  denumire: 8,
  nrRegCom: 6,
  // Location
  localitate: 6,
  judet: 6,
  adresa: 5,
  codSiruta: 3,
  // ANAF legal status
  statusFirma: 7,
  platitorTva: 4,
  inregistratEFactura: 3,
  codCaenPrincipal: 5,
  dataInregistrare: 4,
  // Financial
  cifraAfaceri: 6,
  profitNet: 4,
  numarAngajati: 4,
  anBilant: 3,
  // Risk/Geo
  categorieRisc: 6,
  scorRiscTermene: 4,
  latitude: 3,
  longitude: 5,
};

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export const scoreCompletenessProcessor: Processor<CompletenessJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:score:completeness",
    async (_span) => {
      const startedAt = Date.now();
      await setSessionTenantId(job.data.tenantId);
      const company = await db.query.silverCompanies.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
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
          metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{qualityCompleteness}', ${JSON.stringify({ score, missing, calculatedAt: new Date().toISOString() })}::jsonb)`,
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

      // Sequential scoring: completeness -> accuracy (spec: N.1 -> N.2 -> N.3)
      const accuracyQueue = createQueue(QUEUES.SCORE_ACCURACY);
      await accuracyQueue.add("score", {
        tenantId: job.data.tenantId,
        companyId: job.data.companyId,
        correlationId: job.data.correlationId,
      });
      await accuracyQueue.close();

      return { ok: true, status: "success", score, missing: missing.length };
    },
    { tenantId: job.data.tenantId },
  );
};
