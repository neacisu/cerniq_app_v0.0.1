import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createQueue, QUEUES } from "@cerniq/worker-shared";

export type FreshnessJobData = {
  tenantId: string;
  companyId: string;
  correlationId?: string;
};

export const scoreFreshnessProcessor: Processor<FreshnessJobData> = async (job) => {
  const startedAt = Date.now();
  await setSessionTenantId(job.data.tenantId);
  const company = await db.query.silverCompanies.findFirst({
    where: (t, { and, eq }) => and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
  });
  if (!company) return { ok: false, status: "not_found" };

  const now = Date.now();
  let score = 100;
  const issues: string[] = [];
  if (!company.lastEnrichedAt) {
    score -= 40;
    issues.push("Never enriched");
  } else {
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
  }
  if (company.updatedAt) {
    const daysSinceUpdate = Math.floor((now - company.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
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
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
        qualityFreshness: { score, issues, calculatedAt: new Date().toISOString() },
      })}::jsonb`,
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

  return { ok: true, status: "success", score, issues: issues.length };
};
