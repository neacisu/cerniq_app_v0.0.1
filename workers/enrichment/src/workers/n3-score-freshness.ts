import type { Processor } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createQueue, QUEUES, withCognitiveSpan } from "@cerniq/worker-shared";
import { createJobLogger } from "../lib/job-logger.js";

const svcLog = createServiceLogger("n3-score-freshness", { etapa: "e1" });

export type FreshnessJobData = {
  tenantId: string;
  companyId: string;
  correlationId?: string;
};

export const scoreFreshnessProcessor: Processor<FreshnessJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:score:freshness",
    async (_span) => {
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "N3:score-freshness",
        jobId: String(job.id ?? ""),
        startedAt,
        etapa: "e1",
        correlationId: job.data.correlationId,
        entityType: "company",
        entityId: job.data.companyId,
      });
      try {
        await setSessionTenantId(job.data.tenantId);
        svcLog.info({ tenantId: job.data.tenantId, companyId: job.data.companyId }, "N3 freshness");
        const company = await db.query.silverCompanies.findFirst({
          where: (t, { and, eq }) =>
            and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
        });
        if (!company) return { ok: false, status: "not_found" };

        const now = Date.now();
        let score = 100;
        const issues: string[] = [];
        if (company.lastEnrichedAt) {
          const days = Math.floor((now - company.lastEnrichedAt.getTime()) / (1000 * 60 * 60 * 24));
          if (days > 180) {
            score -= 40;
            issues.push("Enrichment older than 6 months");
          } else if (days > 90) {
            score -= 25;
            issues.push("Enrichment older than 3 months");
          } else if (days > 30) {
            score -= 10;
          }
        } else {
          score -= 40;
          issues.push("Never enriched");
        }
        if (company.updatedAt) {
          const daysSinceUpdate = Math.floor(
            (now - company.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (daysSinceUpdate > 120) {
            score -= 20;
            issues.push("Record update stale");
          } else if (daysSinceUpdate > 60) {
            score -= 10;
          }
        }
        score = Math.max(0, score);

        await db
          .update(silverCompanies)
          .set({
            freshnessScore: String(score),
            metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{qualityFreshness}', ${JSON.stringify({ score, issues, calculatedAt: new Date().toISOString() })}::jsonb)`,
            updatedAt: new Date(),
          })
          .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

        await db.insert(silverEnrichmentLog).values({
          tenantId: job.data.tenantId,
          entityType: "company",
          entityId: job.data.companyId,
          source: "score_freshness",
          operation: "score",
          requestPayload: null,
          responsePayload: { score, issues },
          fieldsUpdated: ["freshnessScore", "metadata"],
          correlationId: job.data.correlationId,
          jobId: String(job.id ?? ""),
          durationMs: Date.now() - startedAt,
        });

        // After all 3 scores complete, trigger post_scoring orchestration (spec: N.3 -> aggregate/promote)
        const orchestrateQueue = createQueue(QUEUES.PIPELINE_ORCHESTRATE);
        await orchestrateQueue.add("process", {
          tenantId: job.data.tenantId,
          companyId: job.data.companyId,
          stage: "post_scoring",
          correlationId: job.data.correlationId,
        });
        await orchestrateQueue.close();

        log.step("done", "Freshness calculat", {
          latencyMs: Date.now() - startedAt,
          confidenceScore: score / 100,
        });
        return { ok: true, status: "success", score, issues: issues.length };
      } catch (error) {
        log.error(
          "fatal",
          `Score freshness eșuat: ${error instanceof Error ? error.message : String(error)}`,
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
