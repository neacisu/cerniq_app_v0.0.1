import type { Processor } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createJobLogger } from "../lib/job-logger.js";
import { createHitlApprovalTask } from "./pipeline-utils.js";

const svcLog = createServiceLogger("j3-ai-confidence-scorer", { etapa: "e1" });

/** Worker determinist — fără apel LLM; Plan §XIII fastClient nu se aplică aici. */

export type AiConfidenceJobData = {
  tenantId: string;
  companyId: string;
  correlationId?: string;
};

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

type SilverCompanyRow = NonNullable<Awaited<ReturnType<typeof db.query.silverCompanies.findFirst>>>;

function computeJ3FieldScores(company: SilverCompanyRow): {
  fieldScores: Record<string, number>;
  overall: number;
  lowFields: string[];
} {
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
  return { fieldScores, overall, lowFields };
}

export const aiConfidenceScorerProcessor: Processor<AiConfidenceJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:ai:score-confidence",
    async (_span) => {
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "J3:ai-confidence-scorer",
        jobId: String(job.id ?? ""),
        startedAt,
        etapa: "e1",
        correlationId: job.data.correlationId,
        entityType: "company",
        entityId: job.data.companyId,
      });
      try {
        await setSessionTenantId(job.data.tenantId);
        svcLog.info(
          { tenantId: job.data.tenantId, companyId: job.data.companyId },
          "J3 confidence",
        );
        const company = await db.query.silverCompanies.findFirst({
          where: (t, { and, eq }) =>
            and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
        });
        if (!company) return { ok: false, status: "not_found" };

        const { fieldScores, overall, lowFields } = computeJ3FieldScores(company);

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
            metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{aiConfidence}', ${JSON.stringify({ overall, fieldScores, lowFields, scoredAt: new Date().toISOString() })}::jsonb)`,
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

        log.step("done", "Scor încredere calculat", {
          modelUsed: "deterministic_field_heuristic",
          latencyMs: Date.now() - startedAt,
          confidenceScore: overall,
        });
        return { ok: true, status: "success", overall, lowFields: lowFields.length };
      } catch (error) {
        log.error(
          "fatal",
          `Confidence scorer eșuat: ${error instanceof Error ? error.message : String(error)}`,
          {
            ...enrichError(error, {
              tenantId: job.data.tenantId,
              entityType: "company",
              entityId: job.data.companyId,
              model: "deterministic_field_heuristic",
            }),
          },
        );
        throw error;
      }
    },
    { tenantId: job.data.tenantId },
  );
};
