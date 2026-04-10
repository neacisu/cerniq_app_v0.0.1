import type { Processor } from "bullmq";
import {
  bronzeContacts,
  db,
  setSessionTenantId,
  silverCompanies,
  silverDedupCandidates,
  sql,
  upsertCompanyIdentityKey,
} from "@cerniq/db";
import {
  validateJobData,
  hitlTasksResolvedTotal,
  hitlResolutionTimeSeconds,
  createQueue,
  QUEUES,
  withCognitiveSpan,
  recordDataMutation,
} from "@cerniq/worker-shared";
import { addQueueJob, patchCompanyMetadata } from "./pipeline-utils.js";
import { z } from "zod";
import { createServiceLogger, enrichError, writeAuditEvent } from "@cerniq/observability";

export type HitlResumeAfterApprovalJobData = {
  tenantId: string;
  approvalTaskId: string;
  correlationId?: string;
  traceId?: string;
  causationKey?: string;
  sourceEndpoint?: string;
  actorId?: string;
  requestId?: string;
  httpCorrelationId?: string;
};

const hitlResumeAfterApprovalJobDataSchema = z.object({
  tenantId: z.uuid(),
  approvalTaskId: z.uuid(),
  correlationId: z.string().trim().min(1).optional(),
  traceId: z.string().optional(),
  causationKey: z.string().optional(),
  sourceEndpoint: z.string().optional(),
  actorId: z.string().optional(),
  requestId: z.string().optional(),
  httpCorrelationId: z.string().optional(),
});

function readMetadataObject(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
}

function readString(input: unknown): string | null {
  return typeof input === "string" && input.trim().length > 0 ? input.trim() : null;
}

type ApprovalTaskRecord = NonNullable<Awaited<ReturnType<typeof db.query.approvalTasks.findFirst>>>;

type ResumeProcessorResult = {
  ok: boolean;
  status: string;
  handled?: string;
  reason?: string;
};

type ApprovalContext = {
  task: ApprovalTaskRecord;
  decision: string;
  taskMetadata: Record<string, unknown>;
  decisionMetadata: Record<string, unknown>;
  resolvedApprovalType: string;
  correlationId?: string;
};

const svcLog = createServiceLogger("hitl-resume-after-approval", { etapa: "e1" });

function getResolvedApprovalType(task: ApprovalTaskRecord) {
  const taskRecord = task as Record<string, unknown>;
  return readString(taskRecord.approvalType) ?? task.type;
}

function getDecisionMetadata(task: ApprovalTaskRecord) {
  const taskRecord = task as Record<string, unknown>;
  return readMetadataObject(taskRecord.decisionMetadata);
}

function getBlockedQueueName(task: ApprovalTaskRecord) {
  const taskRecord = task as Record<string, unknown>;
  return readString(taskRecord.blockedQueueName);
}

function getBlockedJobId(task: ApprovalTaskRecord) {
  const taskRecord = task as Record<string, unknown>;
  return readString(taskRecord.blockedJobId);
}

function getDecisionTimestamp(task: ApprovalTaskRecord) {
  return task.decidedAt?.toISOString() ?? new Date().toISOString();
}

async function handleDedupReview(context: ApprovalContext): Promise<ResumeProcessorResult> {
  const companyAId = readString(context.taskMetadata.companyA);
  const companyBId = readString(context.taskMetadata.companyB);
  if (!companyAId || !companyBId) {
    return { ok: false, status: "invalid_metadata_dedup" };
  }

  const merged = context.decision === "merge" || context.decision === "approve";
  await db
    .update(silverDedupCandidates)
    .set({
      status: merged ? "merged" : "rejected",
      masterCompanyId: merged ? companyBId : undefined,
      updatedAt: new Date(),
      metadata: sql`jsonb_set(COALESCE(${silverDedupCandidates.metadata}, '{}'::jsonb), '{hitlDecision}', ${JSON.stringify(
        {
          decision: merged ? "merge" : "reject",
          approvalTaskId: context.task.id,
          decidedAt: getDecisionTimestamp(context.task),
          decisionMetadata: context.decisionMetadata,
        },
      )}::jsonb)`,
    })
    .where(
      sql`${silverDedupCandidates.tenantId} = ${context.task.tenantId}
      AND ${silverDedupCandidates.companyAId} = ${companyAId}
      AND ${silverDedupCandidates.companyBId} = ${companyBId}`,
    );

  await db
    .update(silverCompanies)
    .set({ dedupStatus: merged ? "merged" : "rejected", updatedAt: new Date() })
    .where(sql`${silverCompanies.id} = ${companyAId}`);

  await addQueueJob(QUEUES.PIPELINE_ORCHESTRATE, {
    tenantId: context.task.tenantId,
    companyId: companyAId,
    stage: "post_enrichment",
    correlationId: context.correlationId,
    source: "hitl-resume-dedup",
  });
  return { ok: true, status: "success", handled: "dedup_review" };
}

async function handleQualityReview(context: ApprovalContext): Promise<ResumeProcessorResult> {
  const companyId = context.task.entityId;
  const approved = context.decision === "approve" || context.decision === "merge";
  await db
    .update(silverCompanies)
    .set({
      promotionStatus: approved ? "eligible" : "blocked",
      updatedAt: new Date(),
      metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{hitlQualityDecision}', ${JSON.stringify(
        {
          decision: approved ? "approved" : "rejected",
          approvalTaskId: context.task.id,
          decisionMetadata: context.decisionMetadata,
        },
      )}::jsonb)`,
    })
    .where(sql`${silverCompanies.id} = ${companyId}`);

  if (approved) {
    await addQueueJob(QUEUES.PIPELINE_PROMOTE_TO_GOLD, {
      tenantId: context.task.tenantId,
      companyId,
      force: true,
      correlationId: context.correlationId,
      source: "hitl-resume-quality",
    });
  }

  return { ok: true, status: "success", handled: "quality_review" };
}

async function handleAiReview(context: ApprovalContext): Promise<ResumeProcessorResult> {
  await patchCompanyMetadata(context.task.tenantId, context.task.entityId, {
    hitlAiDecision: context.decision,
    hitlAiApprovalTaskId: context.task.id,
    hitlAiDecisionMetadata: context.decisionMetadata,
    hitlAiDecisionAt: getDecisionTimestamp(context.task),
  });
  await addQueueJob(QUEUES.PIPELINE_ORCHESTRATE, {
    tenantId: context.task.tenantId,
    companyId: context.task.entityId,
    stage: "post_enrichment",
    correlationId: context.correlationId,
    source: "hitl-resume-ai",
  });
  return { ok: true, status: "success", handled: context.resolvedApprovalType };
}

async function handleErrorReview(context: ApprovalContext): Promise<ResumeProcessorResult> {
  const blockedQueueName = getBlockedQueueName(context.task);
  const blockedJobId = getBlockedJobId(context.task);

  if ((context.decision === "approve" || context.decision === "skip") && blockedQueueName) {
    // Prefer resume blocked job if blockedJobId exists, otherwise replay from sourcePayload
    if (blockedJobId) {
      try {
        const queue = createQueue(blockedQueueName);
        const job = await queue.getJob(blockedJobId);

        if (job) {
          const state = await job.getState();
          // Only retry if job is in a retryable state
          if (state === "failed" || state === "delayed" || state === "waiting") {
            await job.retry();
          }
        }

        await queue.close();
      } catch (error) {
        // If resume fails, fall back to replay pattern
        svcLog.warn(
          {
            blockedJobId,
            blockedQueueName,
            approvalTaskId: context.task.id,
            ...enrichError(error, {
              tenantId: context.task.tenantId,
              approvalTaskId: context.task.id,
              blockedJobId,
              blockedQueueName,
            }),
          },
          "Failed to resume blocked job; falling back to replay",
        );
        const sourcePayload = readMetadataObject(context.taskMetadata.sourcePayload);
        await addQueueJob(blockedQueueName, {
          ...sourcePayload,
          tenantId: context.task.tenantId,
          replayedFromApprovalTaskId: context.task.id,
          correlationId: context.correlationId,
        });
      }
    } else {
      // No blockedJobId, use replay pattern with sourcePayload
      const sourcePayload = readMetadataObject(context.taskMetadata.sourcePayload);
      await addQueueJob(blockedQueueName, {
        ...sourcePayload,
        tenantId: context.task.tenantId,
        replayedFromApprovalTaskId: context.task.id,
        correlationId: context.correlationId,
      });
    }
  }

  await patchCompanyMetadata(context.task.tenantId, context.task.entityId, {
    hitlErrorDecision: context.decision,
    hitlErrorApprovalTaskId: context.task.id,
    hitlErrorDecisionMetadata: context.decisionMetadata,
  });
  return { ok: true, status: "success", handled: "error_review" };
}

function resolveIdentityConflictAction(context: ApprovalContext) {
  return (
    readString(context.decisionMetadata.action) ??
    (context.decision === "reject" ? "mark_source_invalid" : "attach_to_existing_company")
  );
}

async function createIdentityConflictCompany(
  context: ApprovalContext,
  bronze: typeof bronzeContacts.$inferSelect,
) {
  const identityStatus = bronze.extractedCui && bronze.extractedNrRegCom ? "resolved" : "partial";
  const inserted = await db
    .insert(silverCompanies)
    .values({
      tenantId: context.task.tenantId,
      sourceBronzeId: bronze.id,
      denumire: bronze.extractedName ?? undefined,
      cui: bronze.extractedCui ?? undefined,
      nrRegCom: bronze.extractedNrRegCom ?? undefined,
      nrRegComOriginal: bronze.extractedNrRegComRaw ?? undefined,
      identityStatus,
      identityMetadata: {
        createdFrom: "hitl_identity_conflict",
        approvalTaskId: context.task.id,
      },
      enrichmentStatus: "pending",
      promotionStatus: "blocked",
    })
    .returning({ id: silverCompanies.id });

  return inserted[0]?.id ?? null;
}

async function upsertManualIdentityKeys(
  context: ApprovalContext,
  bronze: typeof bronzeContacts.$inferSelect,
  targetCompanyId: string,
): Promise<ResumeProcessorResult | null> {
  if (bronze.extractedCui) {
    const result = await upsertCompanyIdentityKey({
      tenantId: context.task.tenantId,
      companyId: targetCompanyId,
      keyType: "cui",
      keyValueCanonical: bronze.extractedCui,
      keyValueOriginal: bronze.extractedCuiRaw,
      sourceAuthority: "manual",
      isAuthoritative: true,
      sourceBronzeId: bronze.id,
    });
    if (result.status === "conflict" && result.conflictCompanyId !== targetCompanyId) {
      return { ok: false, status: "identity_conflict_unresolved_cui" };
    }
  }

  if (bronze.extractedNrRegCom) {
    const result = await upsertCompanyIdentityKey({
      tenantId: context.task.tenantId,
      companyId: targetCompanyId,
      keyType: "nr_reg_com",
      keyValueCanonical: bronze.extractedNrRegCom,
      keyValueOriginal: bronze.extractedNrRegComRaw,
      sourceAuthority: "manual",
      isAuthoritative: true,
      sourceBronzeId: bronze.id,
    });
    if (result.status === "conflict" && result.conflictCompanyId !== targetCompanyId) {
      return { ok: false, status: "identity_conflict_unresolved_nr_reg_com" };
    }
  }

  return null;
}

async function handleIdentityConflict(context: ApprovalContext): Promise<ResumeProcessorResult> {
  const bronzeContactId =
    readString(context.taskMetadata.bronzeContactId) ?? readString(context.task.entityId);
  if (!bronzeContactId) {
    return { ok: false, status: "invalid_metadata_identity_conflict" };
  }

  const bronze = await db.query.bronzeContacts.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.tenantId, context.task.tenantId), eq(t.id, bronzeContactId)),
  });
  if (!bronze) {
    return { ok: false, status: "bronze_contact_not_found" };
  }

  const action = resolveIdentityConflictAction(context);
  if (action === "mark_source_invalid" || context.decision === "reject") {
    await db
      .update(bronzeContacts)
      .set({
        doNotProcess: true,
        processingStatus: "rejected",
        identityStatus: "identity_conflict",
        identityResolutionMetadata: {
          resolution: "identity_conflict_marked_invalid",
          approvalTaskId: context.task.id,
          action,
          decidedAt: getDecisionTimestamp(context.task),
          decisionMetadata: context.decisionMetadata,
        },
      })
      .where(sql`${bronzeContacts.id} = ${bronzeContactId}`);
    return { ok: true, status: "success", handled: "identity_conflict" };
  }

  let targetCompanyId =
    readString(context.decisionMetadata.targetCompanyId) ??
    readString(context.decisionMetadata.masterCompanyId);
  if (action === "create_new_company") {
    targetCompanyId = await createIdentityConflictCompany(context, bronze);
  }
  if (!targetCompanyId) {
    return { ok: false, status: "missing_target_company_for_identity_conflict" };
  }

  const unresolvedConflict = await upsertManualIdentityKeys(context, bronze, targetCompanyId);
  if (unresolvedConflict) {
    return unresolvedConflict;
  }

  await db
    .update(bronzeContacts)
    .set({
      resolvedCompanyId: targetCompanyId,
      doNotProcess: false,
      processingStatus: "pending",
      identityStatus: "resolved",
      identityResolutionMetadata: {
        resolution: "hitl_resolved",
        approvalTaskId: context.task.id,
        action,
        targetCompanyId,
        decidedAt: getDecisionTimestamp(context.task),
        decisionMetadata: context.decisionMetadata,
      },
    })
    .where(sql`${bronzeContacts.id} = ${bronzeContactId}`);

  await addQueueJob(QUEUES.PIPELINE_PROMOTE_BRONZE_SILVER, {
    tenantId: context.task.tenantId,
    bronzeContactId,
    correlationId: context.correlationId,
    source: "hitl-resume-identity",
  });
  return { ok: true, status: "success", handled: "identity_conflict" };
}

export const hitlResumeAfterApprovalProcessor: Processor<HitlResumeAfterApprovalJobData> = async (
  job,
) => {
  return withCognitiveSpan(
    "e1:hitl:resume",
    async (_span) => {
      validateJobData(hitlResumeAfterApprovalJobDataSchema, job.data, {
        queueName: QUEUES.HITL_RESUME_AFTER_APPROVAL,
        jobId: job.id,
      });
      await setSessionTenantId(job.data.tenantId);
      const task = await db.query.approvalTasks.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.approvalTaskId)),
      });

      if (!task) return { ok: false, status: "task_not_found" };
      if (!["approved", "rejected"].includes(task.status)) {
        return { ok: true, status: "skipped", reason: `task_status_${task.status}` };
      }

      const context: ApprovalContext = {
        task,
        decision: task.decision ?? (task.status === "approved" ? "approve" : "reject"),
        taskMetadata: readMetadataObject(task.metadata),
        decisionMetadata: getDecisionMetadata(task),
        resolvedApprovalType: getResolvedApprovalType(task),
        correlationId: job.data.correlationId,
      };

      // Track HITL resolution metrics
      const approvalType = context.resolvedApprovalType ?? task.type;
      hitlTasksResolvedTotal.inc({
        approval_type: approvalType,
        decision: context.decision ?? "unknown",
        tenant_id: job.data.tenantId,
      });
      if (task.createdAt) {
        const resolutionSeconds = (Date.now() - new Date(task.createdAt).getTime()) / 1000;
        hitlResolutionTimeSeconds.observe(
          { approval_type: approvalType, tenant_id: job.data.tenantId },
          resolutionSeconds,
        );
      }
      void recordDataMutation(
        {
          tenantId: job.data.tenantId,
          batchId: job.data.correlationId ?? "system",
          nodeKey: "e1:hitl:resume",
          entityType: "approval_task",
          entityId: job.data.approvalTaskId,
          mutationIntent: "ENRICH",
          beforeData: { status: task.status, approvalType },
          afterData: {
            decision: context.decision,
            resolvedApprovalType: context.resolvedApprovalType,
          },
        },
        {
          traceId: job.data.traceId,
          causationKey: job.data.causationKey,
          actorId: job.data.actorId,
        },
      ).catch(() => undefined);

      if (context.resolvedApprovalType === "dedup_review") {
        writeAuditEvent({
          tenantId: job.data.tenantId,
          correlationId: job.data.correlationId,
          method: "WORKER",
          routePattern: "e1/hitl/approve",
          statusCode: 200,
          action: "resume_dedup_review",
          resource: "approval_task",
          resourceId: job.data.approvalTaskId,
          metadata: { decision: context.decision, approvalType: context.resolvedApprovalType },
        });
        return handleDedupReview(context);
      }
      if (context.resolvedApprovalType === "quality_review") {
        writeAuditEvent({
          tenantId: job.data.tenantId,
          correlationId: job.data.correlationId,
          method: "WORKER",
          routePattern: "e1/hitl/approve",
          statusCode: 200,
          action: "resume_quality_review",
          resource: "approval_task",
          resourceId: job.data.approvalTaskId,
          metadata: { decision: context.decision, approvalType: context.resolvedApprovalType },
        });
        return handleQualityReview(context);
      }
      if (
        context.resolvedApprovalType === "ai_structuring_review" ||
        context.resolvedApprovalType === "ai_merge_review" ||
        context.resolvedApprovalType === "low_confidence_review" ||
        context.resolvedApprovalType === "manual_verification" ||
        context.resolvedApprovalType === "data_anomaly"
      ) {
        writeAuditEvent({
          tenantId: job.data.tenantId,
          correlationId: job.data.correlationId,
          method: "WORKER",
          routePattern: "e1/hitl/approve",
          statusCode: 200,
          action: "resume_ai_review",
          resource: "approval_task",
          resourceId: job.data.approvalTaskId,
          metadata: { decision: context.decision, approvalType: context.resolvedApprovalType },
        });
        return handleAiReview(context);
      }
      if (context.resolvedApprovalType === "error_review") {
        writeAuditEvent({
          tenantId: job.data.tenantId,
          correlationId: job.data.correlationId,
          method: "WORKER",
          routePattern: "e1/hitl/approve",
          statusCode: 200,
          action: "resume_error_review",
          resource: "approval_task",
          resourceId: job.data.approvalTaskId,
          metadata: { decision: context.decision, approvalType: context.resolvedApprovalType },
        });
        return handleErrorReview(context);
      }
      if (context.resolvedApprovalType === "identity_conflict") {
        writeAuditEvent({
          tenantId: job.data.tenantId,
          correlationId: job.data.correlationId,
          method: "WORKER",
          routePattern: "e1/hitl/approve",
          statusCode: 200,
          action: "resume_identity_conflict",
          resource: "approval_task",
          resourceId: job.data.approvalTaskId,
          metadata: { decision: context.decision, approvalType: context.resolvedApprovalType },
        });
        return handleIdentityConflict(context);
      }

      return { ok: true, status: "skipped", reason: "unknown_approval_type" };
    },
    { tenantId: job.data.tenantId },
  );
};

export { hitlResumeAfterApprovalJobDataSchema };
