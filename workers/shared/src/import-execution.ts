import { createHash, randomUUID } from "node:crypto";
import type { Job, JobsOptions } from "bullmq";
import {
  bronzeImportBatches,
  db,
  importRuntimeJobs,
  importRuntimeSessions,
  importRuntimeWorkerCounters,
  setSessionTenantId,
  silverContacts,
  sql,
  tenants,
} from "@cerniq/db";
import { createQueue } from "./factory.js";

export type ImportRuntimeSessionKind =
  | "ingest"
  | "retry"
  | "anaf"
  | "reprocess"
  | "recovery"
  | "delete";

export type ImportRuntimeStatus =
  | "queued"
  | "running"
  | "paused"
  | "recovering"
  | "completed"
  | "failed"
  | "stale"
  | "terminal_error_skipped"
  | "cancelled"
  | "deleted";

export type ImportExecutionContext = {
  tenantId: string;
  batchId: string;
  sessionId: string;
  runtimeJobKey: string;
  parentRuntimeJobKey?: string | null;
  correlationId?: string | null;
  queueName?: string | null;
  workerName: string;
  stageKey: string;
  entityType?: string | null;
  entityId?: string | null;
  idempotencyScope?: string | null;
};

export type ImportExecutionControlState = {
  globalPaused: boolean;
  batchPaused: boolean;
  workerPaused: boolean;
  tenantSettings: Record<string, unknown>;
  batchMetadata: Record<string, unknown>;
  batchControl: Record<string, unknown>;
};

type JsonRecord = Record<string, unknown>;

type WorkerCounterDelta = Partial<{
  totalJobs: number;
  queuedJobs: number;
  runningJobs: number;
  pausedJobs: number;
  completedJobs: number;
  failedJobs: number;
  skippedJobs: number;
  warningJobs: number;
  totalUnits: number;
  processedUnits: number;
  successUnits: number;
  failedUnits: number;
  skippedUnits: number;
  insertedUnits: number;
  updatedUnits: number;
}>;

type EnqueueCommonArgs<TPayload extends JsonRecord> = {
  queueName: string;
  jobName: string;
  payload: TPayload;
  opts?: JobsOptions;
  importExecution?: Partial<ImportExecutionContext> | null;
  parentImportExecution?: ImportExecutionContext | null;
  sessionKind?: ImportRuntimeSessionKind;
  workerName?: string;
  stageKey?: string;
  entityType?: string | null;
  entityId?: string | null;
  contactId?: string | null;
  idempotencyScope?: string | null;
  correlationId?: string | null;
  maxRecoveryAttempts?: number;
};

type EnqueueBulkItem<TPayload extends JsonRecord> = {
  jobName: string;
  payload: TPayload;
  opts?: JobsOptions;
  entityType?: string | null;
  entityId?: string | null;
  contactId?: string | null;
  workerName?: string;
  stageKey?: string;
  idempotencyScope?: string | null;
  correlationId?: string | null;
};

type EnqueueBulkArgs<TPayload extends JsonRecord> = {
  queueName: string;
  items: EnqueueBulkItem<TPayload>[];
  importExecution?: Partial<ImportExecutionContext> | null;
  parentImportExecution?: ImportExecutionContext | null;
  sessionKind?: ImportRuntimeSessionKind;
  workerName?: string;
  stageKey?: string;
  maxRecoveryAttempts?: number;
};

type RuntimeProgressPatch = {
  checkpointPayload?: JsonRecord;
  resumePayload?: JsonRecord;
  metrics?: JsonRecord;
  workerMetrics?: JsonRecord;
  sessionMetrics?: JsonRecord;
  counterDelta?: WorkerCounterDelta;
  markPaused?: boolean;
};

type WorkerCounterColumnName =
  | "totalJobs"
  | "queuedJobs"
  | "runningJobs"
  | "pausedJobs"
  | "completedJobs"
  | "failedJobs"
  | "skippedJobs"
  | "warningJobs"
  | "totalUnits"
  | "processedUnits"
  | "successUnits"
  | "failedUnits"
  | "skippedUnits"
  | "insertedUnits"
  | "updatedUnits";

const DEFAULT_RECOVERY_ATTEMPTS = 3;
const IMPORT_CONTROL_SETTINGS_KEY = "importContactsControl";

const QUEUE_STAGE_PREFIX_MAP: Array<[string, string]> = [
  ["ingest:", "ingest"],
  ["normalize:", "normalization"],
  ["enrich:bronze:anaf", "anaf_bronze"],
  ["validate:cui:", "validation"],
  ["pipeline:promote:bronze-silver", "promotion"],
  ["pipeline:orchestrate", "orchestrate"],
  ["enrich:", "enrichment"],
  ["discover:", "discovery"],
  ["geo:", "geography"],
  ["score:", "scoring"],
  ["aggregate:", "aggregation"],
  ["dedup:", "dedup"],
  ["hitl:", "hitl"],
  ["agri:", "agri"],
  ["scrape:", "scrape"],
  ["ai:", "ai"],
];

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Extracts the bronzeContactId from a raw job payload.
 * Using a named const before the typeof guard avoids S6551 (String() on unknown)
 * and eliminates the repeated double-call to asRecord(data).bronzeContactId.
 */
function resolveBronzeContactId(data: unknown): string | null {
  const bronzeContactId = asRecord(data).bronzeContactId;
  return typeof bronzeContactId === "string" ? bronzeContactId : null;
}

/**
 * Serialises an unknown thrown value to a human-readable message string.
 * Handles Error instances, primitives, and plain objects safely (S6551 fix).
 * Falls back to a bracketed sentinel only when JSON.stringify itself throws.
 */
function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "[non-serializable error]";
  }
}

function getStageKey(queueName: string, explicit?: string): string {
  if (explicit && explicit.trim().length > 0) return explicit;
  const found = QUEUE_STAGE_PREFIX_MAP.find(([prefix]) => queueName.startsWith(prefix));
  return found?.[1] ?? "import_pipeline";
}

function buildHashKey(parts: Array<string | null | undefined>) {
  return createHash("sha256").update(parts.filter(Boolean).join("::")).digest("hex").slice(0, 24);
}

export function buildImportRuntimeJobKey(args: {
  queueName: string;
  jobName: string;
  workerName: string;
  batchId: string;
  entityType?: string | null;
  entityId?: string | null;
  idempotencyScope?: string | null;
  correlationId?: string | null;
  parentRuntimeJobKey?: string | null;
}) {
  const hash = buildHashKey([
    args.queueName,
    args.jobName,
    args.workerName,
    args.batchId,
    args.entityType,
    args.entityId,
    args.idempotencyScope,
    args.correlationId,
    args.parentRuntimeJobKey,
  ]);
  return `${args.workerName}:${hash}`;
}

function buildImportResumeJobId(runtimeJobKey: string, attempt: number) {
  const hash = buildHashKey([runtimeJobKey, String(attempt)]);
  return `resume__${hash}`;
}

function extractTenantBatchContext(payload: JsonRecord) {
  const tenantId = typeof payload.tenantId === "string" ? payload.tenantId : null;
  const batchId = typeof payload.batchId === "string" ? payload.batchId : null;
  const correlationId = typeof payload.correlationId === "string" ? payload.correlationId : null;
  return { tenantId, batchId, correlationId };
}

export function getImportExecutionContext(payload: unknown): ImportExecutionContext | null {
  const record = asRecord(payload);
  const importExecution = asRecord(record.importExecution);
  if (
    typeof importExecution.tenantId !== "string" ||
    typeof importExecution.batchId !== "string" ||
    typeof importExecution.sessionId !== "string" ||
    typeof importExecution.runtimeJobKey !== "string" ||
    typeof importExecution.workerName !== "string" ||
    typeof importExecution.stageKey !== "string"
  ) {
    return null;
  }

  return {
    tenantId: importExecution.tenantId,
    batchId: importExecution.batchId,
    sessionId: importExecution.sessionId,
    runtimeJobKey: importExecution.runtimeJobKey,
    parentRuntimeJobKey:
      typeof importExecution.parentRuntimeJobKey === "string"
        ? importExecution.parentRuntimeJobKey
        : null,
    correlationId:
      typeof importExecution.correlationId === "string" ? importExecution.correlationId : null,
    queueName: typeof importExecution.queueName === "string" ? importExecution.queueName : null,
    workerName: importExecution.workerName,
    stageKey: importExecution.stageKey,
    entityType: typeof importExecution.entityType === "string" ? importExecution.entityType : null,
    entityId: typeof importExecution.entityId === "string" ? importExecution.entityId : null,
    idempotencyScope:
      typeof importExecution.idempotencyScope === "string"
        ? importExecution.idempotencyScope
        : null,
  };
}

async function countTenantSilverContacts(tenantId: string): Promise<number> {
  await setSessionTenantId(tenantId);
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(silverContacts)
    .where(sql`${silverContacts.tenantId} = ${tenantId}`);
  return Number(row?.count ?? 0);
}

export async function createImportRuntimeSession(args: {
  tenantId: string;
  batchId: string;
  kind: ImportRuntimeSessionKind;
  correlationId?: string | null;
  label?: string | null;
  metadata?: JsonRecord;
}) {
  const silverCount = await countTenantSilverContacts(args.tenantId);
  const [session] = await db
    .insert(importRuntimeSessions)
    .values({
      tenantId: args.tenantId,
      batchId: args.batchId,
      kind: args.kind,
      status: "queued",
      correlationId: args.correlationId ?? null,
      label: args.label ?? null,
      silverContactsInitial: silverCount,
      silverContactsCurrent: silverCount,
      externalDelta: 0,
      metadata: args.metadata ?? {},
    })
    .returning();

  return session;
}

export async function patchImportRuntimeSession(args: {
  sessionId: string;
  tenantId: string;
  status?: ImportRuntimeStatus;
  metrics?: JsonRecord;
  metadata?: JsonRecord;
  paused?: boolean;
  completed?: boolean;
  failed?: boolean;
  deleted?: boolean;
}) {
  await setSessionTenantId(args.tenantId);
  const silverCurrent = await countTenantSilverContacts(args.tenantId);
  const values: Record<string, unknown> = {
    updatedAt: new Date(),
    lastHeartbeatAt: new Date(),
    silverContactsCurrent: silverCurrent,
  };
  if (args.status) values.status = args.status;
  if (args.paused) values.pausedAt = new Date();
  if (args.completed) values.completedAt = new Date();
  if (args.failed) values.failedAt = new Date();
  if (args.deleted) values.deletedAt = new Date();
  if (args.metrics) {
    values.metrics = sql`COALESCE(${importRuntimeSessions.metrics}, '{}'::jsonb) || ${JSON.stringify(args.metrics)}::jsonb`;
  }
  if (args.metadata) {
    values.metadata = sql`COALESCE(${importRuntimeSessions.metadata}, '{}'::jsonb) || ${JSON.stringify(args.metadata)}::jsonb`;
  }

  await db
    .update(importRuntimeSessions)
    .set(values)
    .where(
      sql`${importRuntimeSessions.id} = ${args.sessionId} AND ${importRuntimeSessions.tenantId} = ${args.tenantId}`,
    );

  const [session] = await db
    .select({
      silverContactsInitial: importRuntimeSessions.silverContactsInitial,
      silverContactsPromotedDuringSession:
        importRuntimeSessions.silverContactsPromotedDuringSession,
      silverContactsCurrent: importRuntimeSessions.silverContactsCurrent,
    })
    .from(importRuntimeSessions)
    .where(
      sql`${importRuntimeSessions.id} = ${args.sessionId} AND ${importRuntimeSessions.tenantId} = ${args.tenantId}`,
    )
    .limit(1);

  if (session) {
    const externalDelta =
      Number(session.silverContactsCurrent ?? 0) -
      (Number(session.silverContactsInitial ?? 0) +
        Number(session.silverContactsPromotedDuringSession ?? 0));

    await db
      .update(importRuntimeSessions)
      .set({
        externalDelta,
        updatedAt: new Date(),
      })
      .where(
        sql`${importRuntimeSessions.id} = ${args.sessionId} AND ${importRuntimeSessions.tenantId} = ${args.tenantId}`,
      );
  }
}

async function ensureWorkerCounterRow(args: {
  tenantId: string;
  batchId: string;
  sessionId: string;
  workerName: string;
  queueName: string;
  stageKey: string;
}) {
  await db
    .insert(importRuntimeWorkerCounters)
    .values({
      tenantId: args.tenantId,
      batchId: args.batchId,
      sessionId: args.sessionId,
      workerName: args.workerName,
      queueName: args.queueName,
      stageKey: args.stageKey,
    })
    .onConflictDoNothing()
    .returning({ id: importRuntimeWorkerCounters.id });
}

function buildCounterExpression(column: unknown, delta: number | undefined) {
  if (!delta) return undefined;
  return sql`GREATEST(${column as never} + ${delta}, 0)`;
}

async function applyWorkerCounterDelta(args: {
  tenantId: string;
  sessionId: string;
  workerName: string;
  delta?: WorkerCounterDelta;
  metrics?: JsonRecord;
}) {
  if (!args.delta && !args.metrics) return;
  const values: Record<string, unknown> = {
    updatedAt: new Date(),
    lastHeartbeatAt: new Date(),
  };

  const mapping: Array<[keyof WorkerCounterDelta, unknown, WorkerCounterColumnName]> = [
    ["totalJobs", importRuntimeWorkerCounters.totalJobs, "totalJobs"],
    ["queuedJobs", importRuntimeWorkerCounters.queuedJobs, "queuedJobs"],
    ["runningJobs", importRuntimeWorkerCounters.runningJobs, "runningJobs"],
    ["pausedJobs", importRuntimeWorkerCounters.pausedJobs, "pausedJobs"],
    ["completedJobs", importRuntimeWorkerCounters.completedJobs, "completedJobs"],
    ["failedJobs", importRuntimeWorkerCounters.failedJobs, "failedJobs"],
    ["skippedJobs", importRuntimeWorkerCounters.skippedJobs, "skippedJobs"],
    ["warningJobs", importRuntimeWorkerCounters.warningJobs, "warningJobs"],
    ["totalUnits", importRuntimeWorkerCounters.totalUnits, "totalUnits"],
    ["processedUnits", importRuntimeWorkerCounters.processedUnits, "processedUnits"],
    ["successUnits", importRuntimeWorkerCounters.successUnits, "successUnits"],
    ["failedUnits", importRuntimeWorkerCounters.failedUnits, "failedUnits"],
    ["skippedUnits", importRuntimeWorkerCounters.skippedUnits, "skippedUnits"],
    ["insertedUnits", importRuntimeWorkerCounters.insertedUnits, "insertedUnits"],
    ["updatedUnits", importRuntimeWorkerCounters.updatedUnits, "updatedUnits"],
  ];

  for (const [deltaKey, columnExpr, targetKey] of mapping) {
    const expr = buildCounterExpression(columnExpr, args.delta?.[deltaKey]);
    if (expr) values[targetKey] = expr;
  }

  if (args.metrics) {
    values.metrics = sql`COALESCE(${importRuntimeWorkerCounters.metrics}, '{}'::jsonb) || ${JSON.stringify(args.metrics)}::jsonb`;
  }

  await db
    .update(importRuntimeWorkerCounters)
    .set(values)
    .where(
      sql`${importRuntimeWorkerCounters.sessionId} = ${args.sessionId}
        AND ${importRuntimeWorkerCounters.tenantId} = ${args.tenantId}
        AND ${importRuntimeWorkerCounters.workerName} = ${args.workerName}`,
    );
}

function mergeJsonRecords(left: JsonRecord | undefined, right: JsonRecord | undefined): JsonRecord {
  // Spreading undefined is valid JS/TS and produces {}; the ?? {} fallbacks were redundant (S7744).
  return { ...left, ...right };
}

async function upsertImportRuntimeJob(args: {
  tenantId: string;
  batchId: string;
  sessionId: string;
  runtimeJobKey: string;
  parentRuntimeJobKey?: string | null;
  queueName: string;
  jobName: string;
  workerName: string;
  stageKey: string;
  bullJobId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  contactId?: string | null;
  state: ImportRuntimeStatus;
  resumePayload?: JsonRecord;
  checkpointPayload?: JsonRecord;
  metrics?: JsonRecord;
  metadata?: JsonRecord;
  lastError?: string | null;
  maxRecoveryAttempts?: number;
}) {
  const now = new Date();
  await db
    .insert(importRuntimeJobs)
    .values({
      tenantId: args.tenantId,
      batchId: args.batchId,
      sessionId: args.sessionId,
      runtimeJobKey: args.runtimeJobKey,
      parentRuntimeJobKey: args.parentRuntimeJobKey ?? null,
      queueName: args.queueName,
      jobName: args.jobName,
      workerName: args.workerName,
      stageKey: args.stageKey,
      bullJobId: args.bullJobId ?? null,
      entityType: args.entityType ?? null,
      entityId: args.entityId ?? null,
      contactId: args.contactId ?? null,
      state: args.state,
      heartbeatAt: now,
      startedAt: args.state === "running" ? now : null,
      pausedAt: args.state === "paused" ? now : null,
      completedAt: args.state === "completed" ? now : null,
      failedAt: args.state === "failed" || args.state === "terminal_error_skipped" ? now : null,
      maxRecoveryAttempts: args.maxRecoveryAttempts ?? DEFAULT_RECOVERY_ATTEMPTS,
      checkpointPayload: args.checkpointPayload ?? {},
      resumePayload: args.resumePayload ?? {},
      metrics: args.metrics ?? {},
      lastError: args.lastError ?? null,
      metadata: args.metadata ?? {},
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [importRuntimeJobs.tenantId, importRuntimeJobs.runtimeJobKey],
      set: {
        parentRuntimeJobKey: args.parentRuntimeJobKey ?? null,
        queueName: args.queueName,
        jobName: args.jobName,
        workerName: args.workerName,
        stageKey: args.stageKey,
        bullJobId: args.bullJobId ?? null,
        entityType: args.entityType ?? null,
        entityId: args.entityId ?? null,
        contactId: args.contactId ?? null,
        state: args.state,
        heartbeatAt: now,
        startedAt:
          args.state === "running"
            ? sql`COALESCE(${importRuntimeJobs.startedAt}, ${now.toISOString()}::timestamptz)`
            : importRuntimeJobs.startedAt,
        pausedAt: args.state === "paused" ? now : importRuntimeJobs.pausedAt,
        completedAt: args.state === "completed" ? now : importRuntimeJobs.completedAt,
        failedAt:
          args.state === "failed" || args.state === "terminal_error_skipped"
            ? now
            : importRuntimeJobs.failedAt,
        checkpointPayload: args.checkpointPayload ?? {},
        resumePayload: args.resumePayload ?? {},
        metrics: sql`COALESCE(${importRuntimeJobs.metrics}, '{}'::jsonb) || ${JSON.stringify(args.metrics ?? {})}::jsonb`,
        lastError: args.lastError ?? null,
        metadata: sql`COALESCE(${importRuntimeJobs.metadata}, '{}'::jsonb) || ${JSON.stringify(args.metadata ?? {})}::jsonb`,
        maxRecoveryAttempts: args.maxRecoveryAttempts ?? DEFAULT_RECOVERY_ATTEMPTS,
        updatedAt: now,
      },
    });
}

async function getTenantAndBatchControlState(
  tenantId: string,
  batchId: string,
  workerName: string,
): Promise<ImportExecutionControlState> {
  await setSessionTenantId(tenantId);
  const [[tenantRow] = [], [batchRow] = []] = await Promise.all([
    db
      .select({ settings: tenants.settings })
      .from(tenants)
      .where(sql`${tenants.id} = ${tenantId}`)
      .limit(1),
    db
      .select({ metadata: bronzeImportBatches.metadata })
      .from(bronzeImportBatches)
      .where(
        sql`${bronzeImportBatches.tenantId} = ${tenantId} AND ${bronzeImportBatches.id} = ${batchId}`,
      )
      .limit(1),
  ]);

  const tenantSettings = asRecord(tenantRow?.settings);
  const tenantControl = asRecord(tenantSettings[IMPORT_CONTROL_SETTINGS_KEY]);
  const batchMetadata = asRecord(batchRow?.metadata);
  const batchControl = asRecord(batchMetadata.importExecutionControl);
  const workerPauses = asRecord(batchControl.workerPauses);

  return {
    globalPaused: Boolean(tenantControl.globalPaused),
    batchPaused: Boolean(batchControl.batchPaused),
    workerPaused: Boolean(workerPauses[workerName]),
    tenantSettings,
    batchMetadata,
    batchControl,
  };
}

export async function getImportExecutionControlState(args: {
  tenantId: string;
  batchId: string;
  workerName: string;
}) {
  return getTenantAndBatchControlState(args.tenantId, args.batchId, args.workerName);
}

async function updateTenantControlSettings(
  tenantId: string,
  mutate: (current: JsonRecord) => JsonRecord,
) {
  await setSessionTenantId(tenantId);
  const [existing] = await db
    .select({ settings: tenants.settings })
    .from(tenants)
    .where(sql`${tenants.id} = ${tenantId}`)
    .limit(1);
  const currentSettings = asRecord(existing?.settings);
  const currentControl = asRecord(currentSettings[IMPORT_CONTROL_SETTINGS_KEY]);
  const nextControl = mutate(currentControl);
  await db
    .update(tenants)
    .set({
      settings: {
        ...currentSettings,
        [IMPORT_CONTROL_SETTINGS_KEY]: nextControl,
      },
      updatedAt: new Date(),
    })
    .where(sql`${tenants.id} = ${tenantId}`);
}

async function updateBatchExecutionControl(
  tenantId: string,
  batchId: string,
  mutate: (current: JsonRecord, metadata: JsonRecord) => JsonRecord,
) {
  await setSessionTenantId(tenantId);
  const [existing] = await db
    .select({ metadata: bronzeImportBatches.metadata })
    .from(bronzeImportBatches)
    .where(
      sql`${bronzeImportBatches.tenantId} = ${tenantId} AND ${bronzeImportBatches.id} = ${batchId}`,
    )
    .limit(1);
  const metadata = asRecord(existing?.metadata);
  const currentControl = asRecord(metadata.importExecutionControl);
  const nextControl = mutate(currentControl, metadata);

  await db
    .update(bronzeImportBatches)
    .set({
      metadata: {
        ...metadata,
        importExecutionControl: nextControl,
      },
      updatedAt: new Date(),
    })
    .where(
      sql`${bronzeImportBatches.id} = ${batchId} AND ${bronzeImportBatches.tenantId} = ${tenantId}`,
    );
}

export async function setTenantImportGlobalPause(args: {
  tenantId: string;
  paused: boolean;
  actorId?: string | null;
}) {
  await updateTenantControlSettings(args.tenantId, (current) => ({
    ...current,
    globalPaused: args.paused,
    pausedAt: args.paused ? new Date().toISOString() : null,
    pausedBy: args.paused ? (args.actorId ?? null) : null,
    resumeRequestedAt: args.paused ? (current.resumeRequestedAt ?? null) : new Date().toISOString(),
    version: toFiniteNumber(current.version, 0) + 1,
  }));
}

export async function setBatchImportPause(args: {
  tenantId: string;
  batchId: string;
  paused: boolean;
  actorId?: string | null;
}) {
  await updateBatchExecutionControl(args.tenantId, args.batchId, (current) => ({
    ...current,
    batchPaused: args.paused,
    pausedAt: args.paused ? new Date().toISOString() : null,
    pausedBy: args.paused ? (args.actorId ?? null) : null,
    resumeRequestedAt: args.paused ? (current.resumeRequestedAt ?? null) : new Date().toISOString(),
  }));
}

export async function setBatchWorkerPause(args: {
  tenantId: string;
  batchId: string;
  workerName: string;
  paused: boolean;
  actorId?: string | null;
}) {
  await updateBatchExecutionControl(args.tenantId, args.batchId, (current) => {
    const workerPauses = {
      ...asRecord(current.workerPauses),
      [args.workerName]: args.paused,
    };
    return {
      ...current,
      workerPauses,
      workerPauseUpdatedAt: new Date().toISOString(),
      workerPauseUpdatedBy: args.actorId ?? null,
    };
  });
}

export async function markImportBatchDeleteRequested(args: {
  tenantId: string;
  batchId: string;
  actorId?: string | null;
}) {
  await updateBatchExecutionControl(args.tenantId, args.batchId, (current) => ({
    ...current,
    deleteRequested: true,
    deleteRequestedAt: new Date().toISOString(),
    deleteRequestedBy: args.actorId ?? null,
  }));
}

function withImportExecutionPayload<TPayload extends JsonRecord>(
  payload: TPayload,
  importExecution: ImportExecutionContext,
): TPayload & { importExecution: ImportExecutionContext } {
  return {
    ...payload,
    importExecution,
  };
}

/**
 * Infers the entity type from a raw job payload.
 * Priority: explicit entityType field → companyId → bronzeContactId.
 * Extracted to eliminate nested ternary chains (S3358).
 */
function resolveEntityTypeFromPayload(payload: JsonRecord): string | null {
  if (typeof payload.entityType === "string") return payload.entityType;
  if (typeof payload.companyId === "string") return "company";
  if (typeof payload.bronzeContactId === "string") return "bronze_contact";
  return null;
}

/**
 * Infers the entity ID from a raw job payload, parallel to resolveEntityTypeFromPayload.
 * Priority: explicit entityId → companyId → bronzeContactId.
 * Extracted to eliminate nested ternary chains (S3358).
 */
function resolveEntityIdFromPayload(payload: JsonRecord): string | null {
  if (typeof payload.entityId === "string") return payload.entityId;
  if (typeof payload.companyId === "string") return String(payload.companyId);
  if (typeof payload.bronzeContactId === "string") return String(payload.bronzeContactId);
  return null;
}

async function createExecutionContextFromArgs<TPayload extends JsonRecord>(
  args: EnqueueCommonArgs<TPayload>,
): Promise<ImportExecutionContext | null> {
  const payloadContext = getImportExecutionContext(args.payload);
  if (payloadContext) {
    return {
      ...payloadContext,
      workerName: args.workerName ?? payloadContext.workerName,
      stageKey: getStageKey(args.queueName, args.stageKey ?? payloadContext.stageKey),
    };
  }

  const explicit = args.importExecution;
  const parent = args.parentImportExecution;
  const {
    tenantId: payloadTenantId,
    batchId: payloadBatchId,
    correlationId: payloadCorrelationId,
  } = extractTenantBatchContext(args.payload);

  const tenantId = explicit?.tenantId ?? parent?.tenantId ?? payloadTenantId;
  const batchId = explicit?.batchId ?? parent?.batchId ?? payloadBatchId;
  if (!tenantId || !batchId) {
    return null;
  }

  const workerName = args.workerName ?? explicit?.workerName ?? args.queueName;
  const stageKey = getStageKey(args.queueName, args.stageKey ?? explicit?.stageKey);
  const entityType =
    args.entityType ??
    explicit?.entityType ??
    resolveEntityTypeFromPayload(args.payload as JsonRecord);
  const entityId =
    args.entityId ?? explicit?.entityId ?? resolveEntityIdFromPayload(args.payload as JsonRecord);
  const correlationId =
    args.correlationId ??
    explicit?.correlationId ??
    parent?.correlationId ??
    payloadCorrelationId ??
    null;
  const sessionId =
    explicit?.sessionId ??
    parent?.sessionId ??
    (
      await createImportRuntimeSession({
        tenantId,
        batchId,
        kind: args.sessionKind ?? "ingest",
        correlationId,
        label: `${stageKey}:${workerName}`,
      })
    ).id;

  const parentRuntimeJobKey = explicit?.parentRuntimeJobKey ?? parent?.runtimeJobKey ?? null;
  const idempotencyScope =
    args.idempotencyScope ??
    explicit?.idempotencyScope ??
    (args.opts?.jobId ? String(args.opts.jobId) : null);
  const runtimeJobKey =
    explicit?.runtimeJobKey ??
    buildImportRuntimeJobKey({
      queueName: args.queueName,
      jobName: args.jobName,
      workerName,
      batchId,
      entityType,
      entityId,
      idempotencyScope,
      correlationId,
      parentRuntimeJobKey,
    });

  return {
    tenantId,
    batchId,
    sessionId,
    runtimeJobKey,
    parentRuntimeJobKey,
    correlationId,
    queueName: args.queueName,
    workerName,
    stageKey,
    entityType,
    entityId,
    idempotencyScope,
  };
}

export async function enqueueImportJob<TPayload extends JsonRecord>(
  args: EnqueueCommonArgs<TPayload>,
) {
  const importExecution = await createExecutionContextFromArgs(args);
  const queue = createQueue(args.queueName);

  try {
    if (!importExecution) {
      const job = await queue.add(args.jobName, args.payload, args.opts);
      return {
        queued: true,
        sessionId: null,
        runtimeJobKey: null,
        jobId: String(job.id ?? ""),
      };
    }

    await setSessionTenantId(importExecution.tenantId);
    await ensureWorkerCounterRow({
      tenantId: importExecution.tenantId,
      batchId: importExecution.batchId,
      sessionId: importExecution.sessionId,
      workerName: importExecution.workerName,
      queueName: args.queueName,
      stageKey: importExecution.stageKey,
    });

    const payloadWithContext = withImportExecutionPayload(args.payload, importExecution);
    const control = await getTenantAndBatchControlState(
      importExecution.tenantId,
      importExecution.batchId,
      importExecution.workerName,
    );
    const isPaused = control.globalPaused || control.batchPaused || control.workerPaused;
    const jobId = args.opts?.jobId
      ? String(args.opts.jobId)
      : `rt__${buildHashKey([importExecution.runtimeJobKey, importExecution.sessionId])}`;

    await upsertImportRuntimeJob({
      tenantId: importExecution.tenantId,
      batchId: importExecution.batchId,
      sessionId: importExecution.sessionId,
      runtimeJobKey: importExecution.runtimeJobKey,
      parentRuntimeJobKey: importExecution.parentRuntimeJobKey,
      queueName: args.queueName,
      jobName: args.jobName,
      workerName: importExecution.workerName,
      stageKey: importExecution.stageKey,
      bullJobId: isPaused ? null : jobId,
      entityType: importExecution.entityType,
      entityId: importExecution.entityId,
      contactId: args.contactId,
      state: isPaused ? "paused" : "queued",
      resumePayload: payloadWithContext,
      checkpointPayload: payloadWithContext,
      metadata: {
        enqueueOptions: args.opts ?? {},
      },
      maxRecoveryAttempts: args.maxRecoveryAttempts,
    });

    await applyWorkerCounterDelta({
      tenantId: importExecution.tenantId,
      sessionId: importExecution.sessionId,
      workerName: importExecution.workerName,
      delta: {
        totalJobs: 1,
        queuedJobs: isPaused ? 0 : 1,
        pausedJobs: isPaused ? 1 : 0,
      },
    });
    await patchImportRuntimeSession({
      sessionId: importExecution.sessionId,
      tenantId: importExecution.tenantId,
      status: isPaused ? "paused" : "queued",
      metadata: {
        lastQueuedWorker: importExecution.workerName,
      },
    });

    if (isPaused) {
      return {
        queued: false,
        sessionId: importExecution.sessionId,
        runtimeJobKey: importExecution.runtimeJobKey,
        jobId: null,
      };
    }

    const job = await queue.add(args.jobName, payloadWithContext, {
      ...args.opts,
      jobId,
    });
    return {
      queued: true,
      sessionId: importExecution.sessionId,
      runtimeJobKey: importExecution.runtimeJobKey,
      jobId: String(job.id ?? ""),
    };
  } finally {
    await queue.close();
  }
}

type BulkJobEntry = {
  runtimeRow: typeof importRuntimeJobs.$inferInsert;
  queueItem: { name: string; data: JsonRecord; opts: JobsOptions } | null;
};

/**
 * Builds the DB row and optional queue item for a single entry in a bulk enqueue.
 * Extracted from the enqueueImportJobBulk for-loop to reduce cognitive complexity (S3776).
 * All conditional branching on isPaused is isolated here, keeping the loop body clean.
 */
function buildBulkJobEntry<TPayload extends JsonRecord>(
  item: EnqueueBulkItem<TPayload>,
  context: ImportExecutionContext,
  queueName: string,
  isPaused: boolean,
  maxRecoveryAttempts: number,
): BulkJobEntry {
  const payloadWithContext = withImportExecutionPayload(item.payload, context);
  const jobId = item.opts?.jobId
    ? String(item.opts.jobId)
    : `rt__${buildHashKey([context.runtimeJobKey, context.sessionId])}`;

  const runtimeRow: typeof importRuntimeJobs.$inferInsert = {
    tenantId: context.tenantId,
    batchId: context.batchId,
    sessionId: context.sessionId,
    runtimeJobKey: context.runtimeJobKey,
    parentRuntimeJobKey: context.parentRuntimeJobKey ?? null,
    queueName,
    jobName: item.jobName,
    workerName: context.workerName,
    stageKey: context.stageKey,
    bullJobId: isPaused ? null : jobId,
    entityType: context.entityType ?? null,
    entityId: context.entityId ?? null,
    contactId: item.contactId ?? null,
    state: isPaused ? "paused" : "queued",
    heartbeatAt: new Date(),
    checkpointPayload: payloadWithContext,
    resumePayload: payloadWithContext,
    maxRecoveryAttempts,
    metadata: { enqueueOptions: item.opts ?? {} },
    updatedAt: new Date(),
  };

  const queueItem = isPaused
    ? null
    : {
        name: item.jobName,
        data: payloadWithContext,
        opts: { ...item.opts, jobId },
      };

  return { runtimeRow, queueItem };
}

export async function enqueueImportJobBulk<TPayload extends JsonRecord>(
  args: EnqueueBulkArgs<TPayload>,
) {
  if (args.items.length === 0) return { queued: 0, paused: 0, sessionId: null };
  const firstContext = await createExecutionContextFromArgs({
    queueName: args.queueName,
    jobName: args.items[0]?.jobName ?? "process",
    payload: args.items[0]?.payload ?? ({} as TPayload),
    importExecution: args.importExecution,
    parentImportExecution: args.parentImportExecution,
    sessionKind: args.sessionKind,
    workerName: args.workerName ?? args.items[0]?.workerName,
    stageKey: args.stageKey ?? args.items[0]?.stageKey,
    correlationId: args.items[0]?.correlationId ?? null,
  });
  if (!firstContext) {
    const queue = createQueue(args.queueName);
    try {
      await queue.addBulk(
        args.items.map((item) => ({
          name: item.jobName,
          data: item.payload,
          opts: item.opts,
        })),
      );
      return { queued: args.items.length, paused: 0, sessionId: null };
    } finally {
      await queue.close();
    }
  }

  await ensureWorkerCounterRow({
    tenantId: firstContext.tenantId,
    batchId: firstContext.batchId,
    sessionId: firstContext.sessionId,
    workerName: args.workerName ?? firstContext.workerName,
    queueName: args.queueName,
    stageKey: getStageKey(args.queueName, args.stageKey ?? firstContext.stageKey),
  });

  const control = await getTenantAndBatchControlState(
    firstContext.tenantId,
    firstContext.batchId,
    args.workerName ?? firstContext.workerName,
  );
  const isPaused = control.globalPaused || control.batchPaused || control.workerPaused;
  const runtimeRows: Array<typeof importRuntimeJobs.$inferInsert> = [];
  const queueItems: Array<{
    name: string;
    data: JsonRecord;
    opts: JobsOptions;
  }> = [];

  for (const item of args.items) {
    const context = await createExecutionContextFromArgs({
      queueName: args.queueName,
      jobName: item.jobName,
      payload: item.payload,
      opts: item.opts,
      importExecution: args.importExecution,
      parentImportExecution: args.parentImportExecution,
      sessionKind: args.sessionKind,
      workerName: item.workerName ?? args.workerName ?? firstContext.workerName,
      stageKey: item.stageKey ?? args.stageKey ?? firstContext.stageKey,
      entityType: item.entityType,
      entityId: item.entityId,
      contactId: item.contactId,
      idempotencyScope: item.idempotencyScope,
      correlationId: item.correlationId ?? firstContext.correlationId ?? null,
      maxRecoveryAttempts: args.maxRecoveryAttempts,
    });
    if (!context) continue;

    const { runtimeRow, queueItem } = buildBulkJobEntry(
      item,
      context,
      args.queueName,
      isPaused,
      args.maxRecoveryAttempts ?? DEFAULT_RECOVERY_ATTEMPTS,
    );
    runtimeRows.push(runtimeRow);
    if (queueItem) queueItems.push(queueItem);
  }

  if (runtimeRows.length > 0) {
    await db
      .insert(importRuntimeJobs)
      .values(runtimeRows)
      .onConflictDoUpdate({
        target: [importRuntimeJobs.tenantId, importRuntimeJobs.runtimeJobKey],
        set: {
          state: isPaused ? "paused" : "queued",
          queueName: args.queueName,
          bullJobId: sql`excluded.bull_job_id`,
          resumePayload: sql`excluded.resume_payload`,
          checkpointPayload: sql`excluded.checkpoint_payload`,
          metadata: sql`excluded.metadata`,
          updatedAt: new Date(),
          heartbeatAt: new Date(),
        },
      });
  }

  await applyWorkerCounterDelta({
    tenantId: firstContext.tenantId,
    sessionId: firstContext.sessionId,
    workerName: args.workerName ?? firstContext.workerName,
    delta: {
      totalJobs: runtimeRows.length,
      queuedJobs: isPaused ? 0 : queueItems.length,
      pausedJobs: isPaused ? runtimeRows.length : 0,
    },
  });
  await patchImportRuntimeSession({
    sessionId: firstContext.sessionId,
    tenantId: firstContext.tenantId,
    status: isPaused ? "paused" : "queued",
  });

  if (!isPaused && queueItems.length > 0) {
    const queue = createQueue(args.queueName);
    try {
      await queue.addBulk(queueItems);
    } finally {
      await queue.close();
    }
  }

  return {
    queued: queueItems.length,
    paused: runtimeRows.length - queueItems.length,
    sessionId: firstContext.sessionId,
  };
}

function getResumePayloadFromRow(row: typeof importRuntimeJobs.$inferSelect): JsonRecord | null {
  const payload = asRecord(row.resumePayload);
  return Object.keys(payload).length > 0 ? payload : null;
}

export async function resumeImportRuntimeJobs(args: {
  tenantId: string;
  batchId: string;
  workerName?: string | null;
  mode?: "resume" | "recover";
  states?: ImportRuntimeStatus[];
}) {
  await setSessionTenantId(args.tenantId);
  const states = args.states ?? ["paused", "stale", "failed"];
  const rows = await db
    .select()
    .from(importRuntimeJobs)
    .where(
      args.workerName
        ? sql`${importRuntimeJobs.tenantId} = ${args.tenantId}
            AND ${importRuntimeJobs.batchId} = ${args.batchId}
            AND ${importRuntimeJobs.state} = ANY(${states})
            AND ${importRuntimeJobs.workerName} = ${args.workerName}`
        : sql`${importRuntimeJobs.tenantId} = ${args.tenantId}
            AND ${importRuntimeJobs.batchId} = ${args.batchId}
            AND ${importRuntimeJobs.state} = ANY(${states})`,
    )
    .orderBy(importRuntimeJobs.updatedAt)
    .limit(1000);

  let requeued = 0;
  let skipped = 0;

  for (const row of rows) {
    const payload = getResumePayloadFromRow(row);
    if (!payload) {
      skipped += 1;
      continue;
    }

    const attemptsUsed = Number(row.attemptsUsed ?? 0);
    const maxAttempts = Number(row.maxRecoveryAttempts ?? DEFAULT_RECOVERY_ATTEMPTS);
    const isRecover = args.mode === "recover" || row.state === "failed" || row.state === "stale";
    if (isRecover && attemptsUsed >= maxAttempts) {
      await db
        .update(importRuntimeJobs)
        .set({
          state: "terminal_error_skipped",
          failedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(sql`${importRuntimeJobs.id} = ${row.id}`);
      skipped += 1;
      continue;
    }

    const queue = createQueue(row.queueName);
    try {
      await queue.add(row.jobName, payload, {
        jobId: buildImportResumeJobId(row.runtimeJobKey, attemptsUsed + 1),
        attempts: 1,
        backoff: { type: "fixed", delay: 1000 },
      });
    } finally {
      await queue.close();
    }

    await db
      .update(importRuntimeJobs)
      .set({
        state: isRecover ? "recovering" : "queued",
        bullJobId: buildImportResumeJobId(row.runtimeJobKey, attemptsUsed + 1),
        attemptsUsed: isRecover ? attemptsUsed + 1 : attemptsUsed,
        updatedAt: new Date(),
        heartbeatAt: new Date(),
        pausedAt: null,
      })
      .where(sql`${importRuntimeJobs.id} = ${row.id}`);

    await ensureWorkerCounterRow({
      tenantId: row.tenantId,
      batchId: row.batchId,
      sessionId: row.sessionId,
      workerName: row.workerName,
      queueName: row.queueName,
      stageKey: row.stageKey ?? getStageKey(row.queueName),
    });
    await applyWorkerCounterDelta({
      tenantId: row.tenantId,
      sessionId: row.sessionId,
      workerName: row.workerName,
      delta: {
        queuedJobs: 1,
        pausedJobs: row.state === "paused" ? -1 : 0,
        failedJobs: row.state === "failed" || row.state === "stale" ? -1 : 0,
      },
    });
    requeued += 1;
  }

  return { requeued, skipped };
}

/**
 * Maps a BullMQ queue name to the appropriate import runtime session kind.
 * Centralises the queue-to-kind mapping so callers never embed ternary chains (S3358).
 * For new queue types that need a distinct kind, add a mapping here.
 */
function resolveSessionKindFromQueue(queueName: string): ImportRuntimeSessionKind {
  if (queueName === "enrich:bronze:anaf") return "anaf";
  if (queueName === "pipeline:promote:bronze-silver") return "reprocess";
  return "ingest";
}

export async function beginImportRuntimeJob(queueName: string, job: Job, workerName: string) {
  const context =
    getImportExecutionContext(job.data) ??
    (await createExecutionContextFromArgs({
      queueName,
      jobName: job.name,
      payload: asRecord(job.data),
      opts: { jobId: String(job.id ?? randomUUID()) },
      workerName,
      stageKey: getStageKey(queueName),
      sessionKind: resolveSessionKindFromQueue(queueName),
    }));

  if (!context) {
    return { context: null, paused: false };
  }

  await ensureWorkerCounterRow({
    tenantId: context.tenantId,
    batchId: context.batchId,
    sessionId: context.sessionId,
    workerName: context.workerName,
    queueName,
    stageKey: context.stageKey,
  });

  const control = await getTenantAndBatchControlState(
    context.tenantId,
    context.batchId,
    context.workerName,
  );
  const isPaused = control.globalPaused || control.batchPaused || control.workerPaused;
  await upsertImportRuntimeJob({
    tenantId: context.tenantId,
    batchId: context.batchId,
    sessionId: context.sessionId,
    runtimeJobKey: context.runtimeJobKey,
    parentRuntimeJobKey: context.parentRuntimeJobKey,
    queueName,
    jobName: job.name,
    workerName: context.workerName,
    stageKey: context.stageKey,
    bullJobId: String(job.id ?? ""),
    entityType: context.entityType,
    entityId: context.entityId,
    contactId: resolveBronzeContactId(job.data),
    state: isPaused ? "paused" : "running",
    resumePayload: asRecord(job.data),
    checkpointPayload: asRecord(job.data),
  });
  await applyWorkerCounterDelta({
    tenantId: context.tenantId,
    sessionId: context.sessionId,
    workerName: context.workerName,
    delta: {
      queuedJobs: -1,
      runningJobs: isPaused ? 0 : 1,
      pausedJobs: isPaused ? 1 : 0,
    },
  });
  await patchImportRuntimeSession({
    sessionId: context.sessionId,
    tenantId: context.tenantId,
    status: isPaused ? "paused" : "running",
    metadata: {
      activeWorker: context.workerName,
    },
  });

  return { context, paused: isPaused };
}

export async function updateImportRuntimeProgress(job: Job, patch: RuntimeProgressPatch = {}) {
  const context = getImportExecutionContext(job.data);
  if (!context) return { paused: false, context: null };

  const control = await getTenantAndBatchControlState(
    context.tenantId,
    context.batchId,
    context.workerName,
  );
  const paused =
    patch.markPaused || control.globalPaused || control.batchPaused || control.workerPaused;
  const nextState: ImportRuntimeStatus = paused ? "paused" : "running";

  await upsertImportRuntimeJob({
    tenantId: context.tenantId,
    batchId: context.batchId,
    sessionId: context.sessionId,
    runtimeJobKey: context.runtimeJobKey,
    parentRuntimeJobKey: context.parentRuntimeJobKey,
    queueName: context.queueName ?? context.workerName,
    jobName: job.name,
    workerName: context.workerName,
    stageKey: context.stageKey,
    bullJobId: String(job.id ?? ""),
    entityType: context.entityType,
    entityId: context.entityId,
    contactId: resolveBronzeContactId(job.data),
    state: nextState,
    checkpointPayload: mergeJsonRecords(asRecord(patch.checkpointPayload), asRecord(job.progress)),
    resumePayload: patch.resumePayload ?? asRecord(job.data),
    metrics: patch.metrics,
    metadata: paused ? { pausedByControl: true } : undefined,
  });
  await applyWorkerCounterDelta({
    tenantId: context.tenantId,
    sessionId: context.sessionId,
    workerName: context.workerName,
    delta: patch.counterDelta,
    metrics: patch.workerMetrics,
  });
  await patchImportRuntimeSession({
    sessionId: context.sessionId,
    tenantId: context.tenantId,
    status: paused ? "paused" : "running",
    metrics: patch.sessionMetrics,
    paused,
  });

  return { paused, context };
}

export async function completeImportRuntimeJob(job: Job, result?: JsonRecord) {
  const context = getImportExecutionContext(job.data);
  if (!context) return;
  await upsertImportRuntimeJob({
    tenantId: context.tenantId,
    batchId: context.batchId,
    sessionId: context.sessionId,
    runtimeJobKey: context.runtimeJobKey,
    parentRuntimeJobKey: context.parentRuntimeJobKey,
    queueName: context.queueName ?? context.workerName,
    jobName: job.name,
    workerName: context.workerName,
    stageKey: context.stageKey,
    bullJobId: String(job.id ?? ""),
    entityType: context.entityType,
    entityId: context.entityId,
    contactId: resolveBronzeContactId(job.data),
    state: "completed",
    checkpointPayload: result ?? asRecord(job.progress),
    resumePayload: asRecord(job.data),
    metrics: result,
  });
  await applyWorkerCounterDelta({
    tenantId: context.tenantId,
    sessionId: context.sessionId,
    workerName: context.workerName,
    delta: {
      runningJobs: -1,
      pausedJobs: -1,
      completedJobs: 1,
    },
  });
  await patchImportRuntimeSession({
    sessionId: context.sessionId,
    tenantId: context.tenantId,
    status: "running",
  });
}

export async function failImportRuntimeJob(job: Job, error: unknown) {
  const context = getImportExecutionContext(job.data);
  if (!context) return;
  const message = toErrorMessage(error);
  await upsertImportRuntimeJob({
    tenantId: context.tenantId,
    batchId: context.batchId,
    sessionId: context.sessionId,
    runtimeJobKey: context.runtimeJobKey,
    parentRuntimeJobKey: context.parentRuntimeJobKey,
    queueName: context.queueName ?? context.workerName,
    jobName: job.name,
    workerName: context.workerName,
    stageKey: context.stageKey,
    bullJobId: String(job.id ?? ""),
    entityType: context.entityType,
    entityId: context.entityId,
    contactId: resolveBronzeContactId(job.data),
    state: "failed",
    resumePayload: asRecord(job.data),
    checkpointPayload: asRecord(job.progress),
    lastError: message.slice(0, 4000),
  });
  await applyWorkerCounterDelta({
    tenantId: context.tenantId,
    sessionId: context.sessionId,
    workerName: context.workerName,
    delta: {
      runningJobs: -1,
      failedJobs: 1,
    },
  });
  await patchImportRuntimeSession({
    sessionId: context.sessionId,
    tenantId: context.tenantId,
    status: "failed",
    failed: true,
  });
}
