import { index, jsonb, pgSchema, real, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";

export const observabilitySchema = pgSchema("observability");

/** Universal per-worker / per-job logs (all etape). Replaces bronze.job_logs for new writes. */
export const jobLogs = observabilitySchema.table(
  "job_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    etapa: text("etapa").notNull(),
    batchId: uuid("batch_id"),
    contactId: uuid("contact_id"),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    workerName: varchar("worker_name", { length: 64 }).notNull(),
    queueName: text("queue_name"),
    jobId: varchar("job_id", { length: 255 }),
    sessionId: uuid("session_id"),
    runtimeJobKey: varchar("runtime_job_key", { length: 255 }),
    parentRuntimeJobKey: varchar("parent_runtime_job_key", { length: 255 }),
    level: text("level").notNull().default("info"),
    step: varchar("step", { length: 128 }),
    message: text("message").notNull(),
    context: jsonb("context"),
    correlationId: uuid("correlation_id"),
    traceId: text("trace_id"),
    spanId: text("span_id"),
    errorFingerprint: text("error_fingerprint"),
    durationMs: real("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_obs_job_logs_tenant_etapa_created").on(t.tenantId, t.etapa, t.createdAt),
    index("idx_obs_job_logs_correlation").on(t.correlationId),
    index("idx_obs_job_logs_error_fingerprint").on(t.errorFingerprint),
    index("idx_obs_job_logs_worker_created").on(t.workerName, t.createdAt),
    index("idx_obs_job_logs_tenant_batch").on(t.tenantId, t.batchId),
    index("idx_obs_job_logs_batch_created").on(t.batchId, t.createdAt),
    index("idx_obs_job_logs_batch_level").on(t.batchId, t.level),
    index("idx_obs_job_logs_batch_session_created").on(t.batchId, t.sessionId, t.createdAt),
    index("idx_obs_job_logs_runtime_job_key").on(t.tenantId, t.runtimeJobKey),
  ],
);

/** Rând insert pentru `job_logs` — același modul ca definiția tabelului (`$inferInsert`). */
export type JobLogInsertRow = typeof jobLogs.$inferInsert;

/** Erori persistate pentru analiză —0068_audit_api_audit_log.sql */
export const errorLog = observabilitySchema.table(
  "error_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
    fingerprint: text("fingerprint"),
    message: text("message").notNull(),
    errorType: text("error_type"),
    context: jsonb("context"),
    traceId: text("trace_id"),
    spanId: text("span_id"),
    correlationId: uuid("correlation_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_obs_error_log_tenant_created").on(t.tenantId, t.createdAt),
    index("idx_obs_error_log_fingerprint").on(t.fingerprint),
  ],
);
