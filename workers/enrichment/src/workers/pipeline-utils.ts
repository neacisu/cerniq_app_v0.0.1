import { createHash } from "node:crypto";
import {
  approvalTasks,
  db,
  setSessionTenantId,
  silverCompanies,
  silverEnrichmentLog,
  sql,
} from "@cerniq/db";
import type { JobsOptions } from "bullmq";
import {
  enqueueImportJob,
  getImportExecutionContext,
  getRetryStrategy,
  hitlTasksCreatedTotal,
  type ImportRuntimeSessionKind,
} from "@cerniq/worker-shared";

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
  /** Default TTL for the approval task in hours. Defaults to 72. */
  ttlHours?: number;
}): Promise<string | null> {
  await setSessionTenantId(args.tenantId);
  const requestedBy = await resolveRequesterUserId(args.tenantId);
  if (!requestedBy) return null;

  const ttl = args.ttlHours ?? args.expiresInHours ?? 72;

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
      dueAt: new Date(Date.now() + ttl * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + ttl * 60 * 60 * 1000),
      blockedJobId: args.blockedJobId,
      blockedQueueName: args.blockedQueueName,
      metadata: { ...args.metadata, ttlHours: ttl },
    })
    .returning({ id: approvalTasks.id });

  const taskId = inserted[0]?.id ?? null;
  if (taskId) {
    hitlTasksCreatedTotal.inc({ approval_type: args.type, tenant_id: args.tenantId });
  }
  return taskId;
}

export async function addQueueJob(
  queueName: string,
  payload: Record<string, unknown>,
  options?: {
    jobName?: string;
    opts?: JobsOptions;
    workerName?: string;
    stageKey?: string;
    entityType?: string | null;
    entityId?: string | null;
    contactId?: string | null;
    sessionKind?: ImportRuntimeSessionKind;
    idempotencyScope?: string | null;
  },
) {
  const payloadForId = {
    tenantId: typeof payload.tenantId === "string" ? payload.tenantId : null,
    companyId: typeof payload.companyId === "string" ? payload.companyId : null,
    entityId: typeof payload.entityId === "string" ? payload.entityId : null,
    stage: typeof payload.stage === "string" ? payload.stage : null,
    source: typeof payload.source === "string" ? payload.source : null,
    explicitKey:
      options?.idempotencyScope ??
      (typeof payload.idempotencyKey === "string" ? payload.idempotencyKey : null),
  };
  const deterministicHash = createHash("sha256")
    .update(JSON.stringify(payloadForId))
    .digest("hex")
    .slice(0, 20);
  const parentImportExecution = getImportExecutionContext(payload);
  const retryStrategy = getRetryStrategy(queueName);

  return enqueueImportJob({
    queueName,
    jobName: options?.jobName ?? "process",
    payload,
    opts: {
      jobId: `${queueName}:${deterministicHash}`,
      ...retryStrategy,
      ...options?.opts,
    },
    parentImportExecution,
    importExecution: parentImportExecution,
    workerName: options?.workerName ?? queueName,
    stageKey: options?.stageKey,
    entityType: options?.entityType ?? null,
    entityId: options?.entityId ?? null,
    contactId: options?.contactId ?? null,
    sessionKind: options?.sessionKind,
    idempotencyScope: options?.idempotencyScope ?? payloadForId.explicitKey,
  });
}

export async function patchCompanyMetadata(
  tenantId: string,
  companyId: string,
  patch: Record<string, unknown>,
) {
  await setSessionTenantId(tenantId);
  const keys = Object.keys(patch);
  if (keys.length === 0) return;

  let metaExpr = sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb)`;
  for (const key of keys) {
    const pathLiteral = sql.raw(`'{${key}}'`);
    metaExpr = sql`jsonb_set(${metaExpr}, ${pathLiteral}, ${JSON.stringify(patch[key])}::jsonb)`;
  }

  await db
    .update(silverCompanies)
    .set({
      metadata: metaExpr,
      updatedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${companyId}`);
}

/**
 * Insert an audit log entry into silver_enrichment_log with field-level changes.
 * Used for tracking enrichment mutations with before/after values.
 */
export async function logEnrichmentAudit(args: {
  tenantId: string;
  entityType: string;
  entityId: string;
  source: string;
  operation: string;
  status?: string;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  correlationId?: string;
  jobId?: string;
  durationMs?: number;
  errorMessage?: string;
  errorCode?: string;
}): Promise<void> {
  await setSessionTenantId(args.tenantId);

  const fieldsUpdated: string[] = [];
  if (args.previousValues && args.newValues) {
    const allKeys = new Set([...Object.keys(args.previousValues), ...Object.keys(args.newValues)]);
    for (const key of allKeys) {
      if (JSON.stringify(args.previousValues[key]) !== JSON.stringify(args.newValues[key])) {
        fieldsUpdated.push(key);
      }
    }
  }

  await db.insert(silverEnrichmentLog).values({
    tenantId: args.tenantId,
    entityType: args.entityType,
    entityId: args.entityId,
    source: args.source,
    operation: args.operation,
    status: args.status ?? "success",
    previousValues: args.previousValues ?? {},
    newValues: args.newValues ?? {},
    fieldsUpdated,
    correlationId: args.correlationId ?? null,
    jobId: args.jobId ?? null,
    durationMs: args.durationMs ?? null,
    errorMessage: args.errorMessage ?? null,
    errorCode: args.errorCode ?? null,
  });
}
