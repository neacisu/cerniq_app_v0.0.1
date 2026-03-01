import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, silverDedupCandidates, sql } from "@cerniq/db";
import { addQueueJob, patchCompanyMetadata } from "./pipeline-utils.js";

export type HitlResumeAfterApprovalJobData = {
  tenantId: string;
  approvalTaskId: string;
  correlationId?: string;
};

function readMetadataObject(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
}

export const hitlResumeAfterApprovalProcessor: Processor<HitlResumeAfterApprovalJobData> = async (
  job,
) => {
  await setSessionTenantId(job.data.tenantId);
  const task = await db.query.approvalTasks.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.approvalTaskId)),
  });

  if (!task) return { ok: false, status: "task_not_found" };
  if (!["approved", "rejected"].includes(task.status)) {
    return { ok: true, status: "skipped", reason: `task_status_${task.status}` };
  }

  const decision = task.decision ?? (task.status === "approved" ? "approve" : "reject");
  const taskMetadata = readMetadataObject(task.metadata);
  const decisionMetadata = readMetadataObject(
    (
      task as {
        decisionMetadata?: unknown;
      }
    ).decisionMetadata,
  );
  const resolvedApprovalType = ((
    task as {
      approvalType?: string | null;
    }
  ).approvalType ?? task.type) as string;

  if (resolvedApprovalType === "dedup_review") {
    const companyAId = typeof taskMetadata.companyA === "string" ? taskMetadata.companyA : null;
    const companyBId = typeof taskMetadata.companyB === "string" ? taskMetadata.companyB : null;
    if (!companyAId || !companyBId) return { ok: false, status: "invalid_metadata_dedup" };

    if (decision === "merge" || decision === "approve") {
      await db
        .update(silverDedupCandidates)
        .set({
          status: "merged",
          masterCompanyId: companyBId,
          updatedAt: new Date(),
          metadata: sql`COALESCE(${silverDedupCandidates.metadata}, '{}'::jsonb) || ${JSON.stringify(
            {
              hitlDecision: "merge",
              approvalTaskId: task.id,
              decidedAt: task.decidedAt?.toISOString() ?? new Date().toISOString(),
              decisionMetadata,
            },
          )}::jsonb`,
        })
        .where(
          sql`${silverDedupCandidates.tenantId} = ${task.tenantId}
          AND ${silverDedupCandidates.companyAId} = ${companyAId}
          AND ${silverDedupCandidates.companyBId} = ${companyBId}`,
        );

      await db
        .update(silverCompanies)
        .set({ dedupStatus: "merged", updatedAt: new Date() })
        .where(sql`${silverCompanies.id} = ${companyAId}`);
    } else {
      await db
        .update(silverDedupCandidates)
        .set({
          status: "rejected",
          updatedAt: new Date(),
          metadata: sql`COALESCE(${silverDedupCandidates.metadata}, '{}'::jsonb) || ${JSON.stringify(
            {
              hitlDecision: "reject",
              approvalTaskId: task.id,
              decidedAt: task.decidedAt?.toISOString() ?? new Date().toISOString(),
              decisionMetadata,
            },
          )}::jsonb`,
        })
        .where(
          sql`${silverDedupCandidates.tenantId} = ${task.tenantId}
          AND ${silverDedupCandidates.companyAId} = ${companyAId}
          AND ${silverDedupCandidates.companyBId} = ${companyBId}`,
        );

      await db
        .update(silverCompanies)
        .set({ dedupStatus: "rejected", updatedAt: new Date() })
        .where(sql`${silverCompanies.id} = ${companyAId}`);
    }

    await addQueueJob("pipeline:orchestrate", {
      tenantId: task.tenantId,
      companyId: companyAId,
      stage: "post_enrichment",
      correlationId: job.data.correlationId,
      source: "hitl-resume-dedup",
    });
    return { ok: true, status: "success", handled: "dedup_review" };
  }

  if (resolvedApprovalType === "quality_review") {
    const companyId = task.entityId;
    if (decision === "approve" || decision === "merge") {
      await db
        .update(silverCompanies)
        .set({
          promotionStatus: "eligible",
          updatedAt: new Date(),
          metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
            hitlQualityDecision: "approved",
            approvalTaskId: task.id,
            decisionMetadata,
          })}::jsonb`,
        })
        .where(sql`${silverCompanies.id} = ${companyId}`);
      await addQueueJob("pipeline:promote-to-gold", {
        tenantId: task.tenantId,
        companyId,
        force: true,
        correlationId: job.data.correlationId,
        source: "hitl-resume-quality",
      });
    } else {
      await db
        .update(silverCompanies)
        .set({
          promotionStatus: "blocked",
          updatedAt: new Date(),
          metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
            hitlQualityDecision: "rejected",
            approvalTaskId: task.id,
            decisionMetadata,
          })}::jsonb`,
        })
        .where(sql`${silverCompanies.id} = ${companyId}`);
    }
    return { ok: true, status: "success", handled: "quality_review" };
  }

  if (
    resolvedApprovalType === "ai_structuring_review" ||
    resolvedApprovalType === "ai_merge_review" ||
    resolvedApprovalType === "low_confidence_review" ||
    resolvedApprovalType === "manual_verification" ||
    resolvedApprovalType === "data_anomaly"
  ) {
    await patchCompanyMetadata(task.tenantId, task.entityId, {
      hitlAiDecision: decision,
      hitlAiApprovalTaskId: task.id,
      hitlAiDecisionMetadata: decisionMetadata,
      hitlAiDecisionAt: task.decidedAt?.toISOString() ?? new Date().toISOString(),
    });
    await addQueueJob("pipeline:orchestrate", {
      tenantId: task.tenantId,
      companyId: task.entityId,
      stage: "post_enrichment",
      correlationId: job.data.correlationId,
      source: "hitl-resume-ai",
    });
    return { ok: true, status: "success", handled: resolvedApprovalType };
  }

  if (resolvedApprovalType === "error_review") {
    const sourcePayload = readMetadataObject(taskMetadata.sourcePayload);
    const fallbackQueue =
      typeof (task as { blockedQueueName?: unknown }).blockedQueueName === "string"
        ? ((task as { blockedQueueName?: string }).blockedQueueName ?? null)
        : null;
    if ((decision === "approve" || decision === "skip") && fallbackQueue) {
      await addQueueJob(fallbackQueue, {
        ...sourcePayload,
        tenantId: task.tenantId,
        replayedFromApprovalTaskId: task.id,
        correlationId: job.data.correlationId,
      });
    }
    await patchCompanyMetadata(task.tenantId, task.entityId, {
      hitlErrorDecision: decision,
      hitlErrorApprovalTaskId: task.id,
      hitlErrorDecisionMetadata: decisionMetadata,
    });
    return { ok: true, status: "success", handled: "error_review" };
  }

  return { ok: true, status: "skipped", reason: "unknown_approval_type" };
};
