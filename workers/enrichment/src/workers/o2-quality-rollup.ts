import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createQueue, QUEUES } from "@cerniq/worker-shared";
import { createHitlApprovalTask } from "./pipeline-utils.js";

export type QualityRollupJobData = {
  tenantId: string;
  companyId: string;
  correlationId?: string;
};

function getBlockedReason(args: {
  score: number;
  hasCui: boolean;
  statusFirma: string | null | undefined;
}): string {
  if (args.score < 40) return "Quality score too low (<40)";
  if (!args.hasCui) return "CUI missing";
  if (args.statusFirma && args.statusFirma !== "ACTIVA")
    return `Company status ${args.statusFirma}`;
  return "Review required";
}

export const qualityRollupProcessor: Processor<QualityRollupJobData> = async (job) => {
  const startedAt = Date.now();
  await setSessionTenantId(job.data.tenantId);
  const company = await db.query.silverCompanies.findFirst({
    where: (t, { and, eq }) => and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
  });
  if (!company) return { ok: false, status: "not_found" };

  const completeness = Number(company.completenessScore ?? 0);
  const accuracy = Number(company.accuracyScore ?? 0);
  const freshness = Number(company.freshnessScore ?? 0);
  const total = Math.round(completeness * 0.4 + accuracy * 0.35 + freshness * 0.25);

  const eligible =
    total >= 70 &&
    Boolean(company.cui) &&
    (company.statusFirma ? company.statusFirma === "ACTIVA" : true);
  let promotionStatus: "eligible" | "review_required" | "blocked";
  if (eligible) promotionStatus = "eligible";
  else if (total >= 40) promotionStatus = "review_required";
  else promotionStatus = "blocked";
  const blockedReason = eligible
    ? null
    : getBlockedReason({
        score: total,
        hasCui: Boolean(company.cui),
        statusFirma: company.statusFirma,
      });

  await db
    .update(silverCompanies)
    .set({
      totalQualityScore: String(total),
      promotionStatus,
      metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{qualityRollup}', ${JSON.stringify(
        {
          completeness,
          accuracy,
          freshness,
          total,
          promotionStatus,
          blockedReason,
          rolledAt: new Date().toISOString(),
        },
      )}::jsonb)`,
      updatedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  if (promotionStatus === "review_required") {
    await createHitlApprovalTask({
      tenantId: job.data.tenantId,
      entityType: "company",
      entityId: job.data.companyId,
      type: "quality_review",
      title: "Revizuire calitate date",
      description: blockedReason ?? "Scor calitate intermediar",
      aiConfidence: total / 100,
      aiRecommendation: "review",
      urgency: "medium",
      metadata: { completeness, accuracy, freshness, total, blockedReason },
      expiresInHours: 24,
    });
  }

  if (promotionStatus === "eligible") {
    const queue = createQueue(QUEUES.PIPELINE_PROMOTE_TO_GOLD);
    await queue.add("promote", {
      tenantId: job.data.tenantId,
      companyId: job.data.companyId,
      correlationId: job.data.correlationId,
    });
    await queue.close();
  }

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "quality_rollup",
    operation: "rollup",
    requestPayload: null,
    responsePayload: { completeness, accuracy, freshness, total, promotionStatus, blockedReason },
    fieldsUpdated: ["totalQualityScore", "promotionStatus", "metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return { ok: true, status: "success", totalQualityScore: total, promotionStatus };
};
