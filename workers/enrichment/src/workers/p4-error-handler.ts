import { type Processor } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { db, pipelineErrors, setSessionTenantId, silverCompanies, sql } from "@cerniq/db";
import { createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import { createJobLogger } from "../lib/job-logger.js";
import { createHitlApprovalTask } from "./pipeline-utils.js";

const svcLog = createServiceLogger("p4-error-handler", { etapa: "e1" });

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

function mapErrorSeverity(errorType: string): "critical" | "error" | "warning" {
  if (errorType === "PERMANENT_FAILURE" || errorType === "AUTH_ERROR") return "critical";
  if (errorType === "DATA_NOT_FOUND" || errorType === "QUOTA_EXCEEDED") return "warning";
  return "error";
}

function getBaseDelay(errorType: string): number {
  if (errorType === "RATE_LIMITED" || errorType === "QUOTA_EXCEEDED") return 60_000;
  if (errorType === "CIRCUIT_OPEN") return 120_000;
  return 30_000;
}

export const pipelineErrorHandlerProcessor: Processor<ErrorHandlerJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:pipeline:error-handler",
    async (_span) => {
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "P4:error-handler",
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
          {
            tenantId: job.data.tenantId,
            companyId: job.data.companyId,
            sourceWorker: job.data.sourceWorker,
          },
          "P4 pipeline error handler",
        );

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
          severity: mapErrorSeverity(job.data.errorType),
          recoveryAction: "pending",
          metadata: {
            sourcePayload: job.data.sourcePayload ?? null,
            retryCount,
            maxRetries,
          },
        });

        switch (job.data.errorType) {
          case "API_TIMEOUT":
          case "NETWORK_ERROR":
          case "RATE_LIMITED":
          case "QUOTA_EXCEEDED":
          case "CIRCUIT_OPEN": {
            const baseDelay = getBaseDelay(job.data.errorType);
            if (retryCount < maxRetries) {
              const delayMs = Math.min(600_000, baseDelay * 2 ** retryCount);
              const sourcePayload = job.data.sourcePayload ?? {};
              const cid =
                typeof job.data.correlationId === "string" ? job.data.correlationId : undefined;
              const replayPayload = {
                ...sourcePayload,
                tenantId: job.data.tenantId,
                companyId: job.data.companyId,
                correlationId: cid,
                ...(cid && cid.length > 0 ? { httpCorrelationId: cid } : {}),
              };
              const queue = createQueue(job.data.sourceWorker);
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
          case "AUTH_ERROR": {
            await createHitlApprovalTask({
              tenantId: job.data.tenantId,
              entityType: "company",
              entityId: job.data.companyId,
              type: "error_review",
              title: "Eroare autentificare API extern",
              description: `${job.data.sourceWorker}: ${job.data.errorMessage}`,
              urgency: "critical",
              aiRecommendation: "check_credentials",
              blockedJobId: job.data.sourceJobId,
              blockedQueueName: job.data.sourceWorker,
              metadata: {
                errorType: job.data.errorType,
                sourceWorker: job.data.sourceWorker,
                sourcePayload: job.data.sourcePayload ?? null,
              },
              expiresInHours: 4,
            });
            recoveryAction = "alert_credentials";
            break;
          }
          case "VALIDATION_ERROR": {
            await createHitlApprovalTask({
              tenantId: job.data.tenantId,
              entityType: "company",
              entityId: job.data.companyId,
              type: "quality_review",
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
                metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{enrichmentErrors}', ${JSON.stringify(
                  {
                    sourceWorker: job.data.sourceWorker,
                    error: job.data.errorMessage,
                    skippedAt: new Date().toISOString(),
                  },
                )}::jsonb)`,
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
                metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{permanentFailure}', ${JSON.stringify(
                  {
                    error: job.data.errorMessage,
                    sourceWorker: job.data.sourceWorker,
                    failedAt: new Date().toISOString(),
                  },
                )}::jsonb)`,
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

        log.step("done", "Eroare procesată", {
          latencyMs: Date.now() - startedAt,
          pipelineContext: {
            companyId: job.data.companyId,
            batchId: job.data.correlationId,
            sourceWorker: job.data.sourceWorker,
            errorType: job.data.errorType,
          },
        });
        return { ok: true, status: "handled", recoveryAction };
      } catch (error) {
        log.error(
          "fatal",
          `Error handler eșuat: ${error instanceof Error ? error.message : String(error)}`,
          {
            ...enrichError(error, {
              tenantId: job.data.tenantId,
              entityType: "company",
              entityId: job.data.companyId,
              pipelineContext: {
                companyId: job.data.companyId,
                batchId: job.data.correlationId,
                sourceWorker: job.data.sourceWorker,
              },
            }),
          },
        );
        throw error;
      }
    },
    { tenantId: job.data.tenantId },
  );
};
