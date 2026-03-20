import { createHash } from "node:crypto";
import { approvalTasks, db, setSessionTenantId, silverCompanies, sql } from "@cerniq/db";
import { createQueue, hitlTasksCreatedTotal, getRetryStrategy } from "@cerniq/worker-shared";

export async function resolveRequesterUserId(tenantId: string): Promise<string | null> {
  if (process.env.SYSTEM_USER_ID) return process.env.SYSTEM_USER_ID;
  await setSessionTenantId(tenantId);
  const found = await db.query.users.findFirst({
    where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.status, "active")),
  });
  return found?.id ?? null;
}

function urgencyToPriority(urgency: string): "critical" | "high" | "normal" | "low" {
  if (urgency === "critical") return "critical";
  if (urgency === "high") return "high";
  if (urgency === "low") return "low";
  return "normal";
}

export async function createHitlApprovalTask(args: {
  tenantId: string;
  entityType: string;
  entityId: string;
  type:
    | "dedup_review"
    | "quality_review"
    | "identity_conflict"
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
      priorityLevel: urgencyToPriority(args.urgency ?? "medium"),
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

  const taskId = inserted[0]?.id ?? null;
  if (taskId) {
    hitlTasksCreatedTotal.inc({ approval_type: args.type, tenant_id: args.tenantId });
  }
  return taskId;
}

export async function addQueueJob(queueName: string, payload: Record<string, unknown>) {
  const queue = createQueue(queueName);
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
  const retryStrategy = getRetryStrategy(queueName);
  await queue.add("process", payload, {
    jobId: `${queueName}:${deterministicHash}`,
    ...retryStrategy,
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
