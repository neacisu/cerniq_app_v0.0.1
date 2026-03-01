import { Queue, type Processor } from "bullmq";
import { db, pipelineErrors, setSessionTenantId, silverCompanies, sql } from "@cerniq/db";
import { getQueuePrefix, getRedisConnectionOptions } from "@cerniq/worker-shared";
import { createHitlApprovalTask } from "./pipeline-utils.js";

export type ErrorHandlerJobData = {
  tenantId: string;
  companyId: string;
  errorType: string;
  errorMessage: string;
  sourceWorker: string;
  sourceJobId?: string;
  sourcePayload?: Record<string, unknown>;
  retryCount?: number;
  maxRetries?: number;
  stackTrace?: string;
  correlationId?: string;
};

export const pipelineErrorHandlerProcessor: Processor<ErrorHandlerJobData> = async (job) => {
  await setSessionTenantId(job.data.tenantId);

  const retryCount = Number(job.data.retryCount ?? 0);
  const maxRetries = Number(job.data.maxRetries ?? 3);
  let recoveryAction: string;

  await db.insert(pipelineErrors).values({
    tenantId: job.data.tenantId,
    pipelineStage: "E1",
    workerName: job.data.sourceWorker,
    jobId: job.data.sourceJobId ?? String(job.id ?? ""),
    entityType: "company",
    entityId: job.data.companyId,
    errorType: job.data.errorType,
    errorMessage: job.data.errorMessage,
    errorStack: job.data.stackTrace,
    severity:
      job.data.errorType === "PERMANENT_FAILURE" || job.data.errorType === "VALIDATION_ERROR"
        ? "critical"
        : "error",
    recoveryAction: "pending",
    metadata: {
      sourcePayload: job.data.sourcePayload ?? null,
      retryCount,
      maxRetries,
    },
  });

  const connection = getRedisConnectionOptions();
  const prefix = getQueuePrefix();

  switch (job.data.errorType) {
    case "API_TIMEOUT":
    case "RATE_LIMITED": {
      if (retryCount < maxRetries) {
        const delayMs = Math.min(300_000, 30_000 * 2 ** retryCount);
        const replayPayload = {
          ...(job.data.sourcePayload ?? {}),
          tenantId: job.data.tenantId,
          companyId: job.data.companyId,
          correlationId: job.data.correlationId,
        };
        const queue = new Queue(job.data.sourceWorker, { connection, prefix });
        await queue.add("replay", replayPayload, {
          delay: delayMs,
          attempts: maxRetries,
          backoff: { type: "exponential", delay: 2000 },
        });
        await queue.close();
        recoveryAction = "scheduled_replay";
      } else {
        await createHitlApprovalTask({
          tenantId: job.data.tenantId,
          entityType: "company",
          entityId: job.data.companyId,
          type: "error_review",
          title: "Retry exhausted in pipeline",
          description: `${job.data.sourceWorker}: ${job.data.errorMessage}`,
          urgency: "high",
          aiRecommendation: "review",
          blockedJobId: job.data.sourceJobId,
          blockedQueueName: job.data.sourceWorker,
          metadata: {
            sourceWorker: job.data.sourceWorker,
            retryCount,
            maxRetries,
            lastErrorType: job.data.errorType,
            sourcePayload: job.data.sourcePayload ?? null,
            retryExhausted: true,
          },
          expiresInHours: 12,
        });
        recoveryAction = "retry_exhausted_hitl";
      }
      break;
    }
    case "VALIDATION_ERROR": {
      await createHitlApprovalTask({
        tenantId: job.data.tenantId,
        entityType: "company",
        entityId: job.data.companyId,
        type: "error_review",
        title: "Eroare validare in pipeline",
        description: `${job.data.sourceWorker}: ${job.data.errorMessage}`,
        aiRecommendation: "review",
        urgency: "high",
        blockedJobId: job.data.sourceJobId,
        blockedQueueName: job.data.sourceWorker,
        metadata: {
          errorType: job.data.errorType,
          sourceWorker: job.data.sourceWorker,
          sourcePayload: job.data.sourcePayload ?? null,
        },
        expiresInHours: 12,
      });
      recoveryAction = "hitl_review";
      break;
    }
    case "DATA_NOT_FOUND": {
      await db
        .update(silverCompanies)
        .set({
          metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
            enrichmentErrors: {
              sourceWorker: job.data.sourceWorker,
              error: job.data.errorMessage,
              skippedAt: new Date().toISOString(),
            },
          })}::jsonb`,
          updatedAt: new Date(),
        })
        .where(sql`${silverCompanies.id} = ${job.data.companyId}`);
      recoveryAction = "skip_source";
      break;
    }
    case "PERMANENT_FAILURE": {
      await db
        .update(silverCompanies)
        .set({
          enrichmentStatus: "failed",
          promotionStatus: "blocked",
          metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
            permanentFailure: {
              error: job.data.errorMessage,
              sourceWorker: job.data.sourceWorker,
              failedAt: new Date().toISOString(),
            },
          })}::jsonb`,
        })
        .where(sql`${silverCompanies.id} = ${job.data.companyId}`);
      recoveryAction = "blocked";
      break;
    }
    default:
      recoveryAction = "alert_only";
      break;
  }

  await db
    .update(pipelineErrors)
    .set({
      recoveryAction,
    })
    .where(
      sql`${pipelineErrors.tenantId} = ${job.data.tenantId}
          AND ${pipelineErrors.workerName} = ${job.data.sourceWorker}
          AND ${pipelineErrors.jobId} = ${job.data.sourceJobId ?? String(job.id ?? "")}`,
    );

  return { ok: true, status: "handled", recoveryAction };
};
