import type { Processor } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createQueue, QUEUES, withCognitiveSpan } from "@cerniq/worker-shared";
import { createJobLogger } from "../lib/job-logger.js";

const svcLog = createServiceLogger("n2-score-accuracy", { etapa: "e1" });
import { validateCuiModulo11 } from "../lib/cui-validation.js";

export type AccuracyJobData = {
  tenantId: string;
  companyId: string;
  correlationId?: string;
};

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function computeAccuracyScore(company: {
  cui: string | null;
  email: string | null;
  telefon: string | null;
  latitude: string | null;
  longitude: string | null;
  statusFirma: string | null;
  codCaenPrincipal: string | null;
  categorieRisc: string | null;
}): { score: number; issues: string[] } {
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
  if (company.latitude !== null && company.longitude !== null) points += 15;
  if (company.statusFirma) points += 10;
  if (company.codCaenPrincipal) points += 10;
  if (company.categorieRisc) points += 5;

  return { score: Math.max(0, Math.min(100, points)), issues };
}

export const scoreAccuracyProcessor: Processor<AccuracyJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:score:accuracy",
    async (_span) => {
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "N2:score-accuracy",
        jobId: String(job.id ?? ""),
        startedAt,
        etapa: "e1",
        correlationId: job.data.correlationId,
        entityType: "company",
        entityId: job.data.companyId,
      });
      try {
        await setSessionTenantId(job.data.tenantId);
        svcLog.info({ tenantId: job.data.tenantId, companyId: job.data.companyId }, "N2 accuracy");
        const company = await db.query.silverCompanies.findFirst({
          where: (t, { and, eq }) =>
            and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
        });
        if (!company) return { ok: false, status: "not_found" };

        const { score, issues } = computeAccuracyScore(company);

        await db
          .update(silverCompanies)
          .set({
            accuracyScore: String(score),
            metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{qualityAccuracy}', ${JSON.stringify({ score, issues, calculatedAt: new Date().toISOString() })}::jsonb)`,
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

        // Sequential scoring: accuracy -> freshness (spec: N.1 -> N.2 -> N.3)
        const freshnessQueue = createQueue(QUEUES.SCORE_FRESHNESS);
        await freshnessQueue.add("score", {
          tenantId: job.data.tenantId,
          companyId: job.data.companyId,
          correlationId: job.data.correlationId,
        });
        await freshnessQueue.close();

        log.step("done", "Accuracy calculat", {
          latencyMs: Date.now() - startedAt,
          confidenceScore: score / 100,
        });
        return { ok: true, status: "success", score, issues: issues.length };
      } catch (error) {
        log.error(
          "fatal",
          `Score accuracy eșuat: ${error instanceof Error ? error.message : String(error)}`,
          {
            ...enrichError(error, {
              tenantId: job.data.tenantId,
              entityType: "company",
              entityId: job.data.companyId,
            }),
          },
        );
        throw error;
      }
    },
    { tenantId: job.data.tenantId },
  );
};
