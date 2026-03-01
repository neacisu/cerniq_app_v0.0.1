import { createHash } from "node:crypto";
import { Queue } from "bullmq";
import { approvalTasks, db, setSessionTenantId, silverCompanies, sql } from "@cerniq/db";
import { getQueuePrefix, getRedisConnectionOptions } from "@cerniq/worker-shared";

export async function resolveRequesterUserId(tenantId: string): Promise<string | null> {
  if (process.env.SYSTEM_USER_ID) return process.env.SYSTEM_USER_ID;
  await setSessionTenantId(tenantId);
  const found = await db.query.users.findFirst({
    where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.status, "active")),
  });
  return found?.id ?? null;
}

export async function createHitlApprovalTask(args: {
  tenantId: string;
  entityType: string;
  entityId: string;
  type:
    | "dedup_review"
    | "quality_review"
    | "ai_structuring_review"
    | "ai_merge_review"
    | "low_confidence_review"
    | "data_anomaly"
    | "manual_verification"
    | "error_review";
  title: string;
  description?: string;
  aiConfidence?: number;
  aiRecommendation?: string;
  aiReasoning?: string;
  priority?: number;
  urgency?: "low" | "medium" | "high" | "critical";
  blockedJobId?: string;
  blockedQueueName?: string;
  metadata?: Record<string, unknown>;
  expiresInHours?: number;
}): Promise<string | null> {
  await setSessionTenantId(args.tenantId);
  const requestedBy = await resolveRequesterUserId(args.tenantId);
  if (!requestedBy) return null;

  const inserted = await db
    .insert(approvalTasks)
    .values({
      tenantId: args.tenantId,
      type: args.type,
      approvalType: args.type,
      status: "pending",
      urgency: args.urgency ?? "medium",
      priorityLevel:
        (args.urgency ?? "medium") === "critical"
          ? "critical"
          : (args.urgency ?? "medium") === "high"
            ? "high"
            : (args.urgency ?? "medium") === "low"
              ? "low"
              : "normal",
      pipelineStage: "E1",
      entityType: args.entityType,
      entityId: args.entityId,
      title: args.title,
      description: args.description,
      aiConfidence: args.aiConfidence,
      aiRecommendation: args.aiRecommendation,
      aiReasoning: args.aiReasoning,
      requestedBy,
      createdBy: requestedBy,
      etapa: "E1",
      priority: args.priority ?? 0,
      dueAt: new Date(Date.now() + (args.expiresInHours ?? 24) * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + (args.expiresInHours ?? 24) * 60 * 60 * 1000),
      blockedJobId: args.blockedJobId,
      blockedQueueName: args.blockedQueueName,
      metadata: args.metadata ?? {},
    })
    .returning({ id: approvalTasks.id });

  return inserted[0]?.id ?? null;
}

export async function addQueueJob(queueName: string, payload: Record<string, unknown>) {
  const connection = getRedisConnectionOptions();
  const prefix = getQueuePrefix();
  const queue = new Queue(queueName, { connection, prefix });
  const payloadForId = {
    tenantId: typeof payload.tenantId === "string" ? payload.tenantId : null,
    companyId: typeof payload.companyId === "string" ? payload.companyId : null,
    entityId: typeof payload.entityId === "string" ? payload.entityId : null,
    stage: typeof payload.stage === "string" ? payload.stage : null,
    source: typeof payload.source === "string" ? payload.source : null,
    explicitKey: typeof payload.idempotencyKey === "string" ? payload.idempotencyKey : null,
  };
  const deterministicHash = createHash("sha256")
    .update(JSON.stringify(payloadForId))
    .digest("hex")
    .slice(0, 20);
  await queue.add("process", payload, {
    jobId: `${queueName}:${deterministicHash}`,
    attempts: Number(process.env.DEFAULT_JOB_ATTEMPTS ?? "3"),
    backoff: {
      type: "exponential",
      delay: Number(process.env.DEFAULT_JOB_BACKOFF_MS ?? "1000"),
    },
    removeOnComplete: {
      age: Number(process.env.JOB_RETENTION_COMPLETE_SECONDS ?? "86400"),
      count: Number(process.env.JOB_RETENTION_COMPLETE_COUNT ?? "2000"),
    },
    removeOnFail: {
      age: Number(process.env.JOB_RETENTION_FAIL_SECONDS ?? "604800"),
      count: Number(process.env.JOB_RETENTION_FAIL_COUNT ?? "5000"),
    },
  });
  await queue.close();
}

export async function patchCompanyMetadata(
  tenantId: string,
  companyId: string,
  patch: Record<string, unknown>,
) {
  await setSessionTenantId(tenantId);
  await db
    .update(silverCompanies)
    .set({
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`,
      updatedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${companyId}`);
}
