import {
  boolean,
  index,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";
import { users } from "./users.js";

export const bronzeSchema = pgSchema("bronze");

export const bronzeSourceTypeEnum = pgEnum("bronze_source_type", [
  "csv_import",
  "webhook",
  "scrape",
  "manual",
  "api",
  "excel_import",
]);

export const bronzeProcessingStatusEnum = pgEnum("bronze_processing_status", [
  "pending",
  "processing",
  "promoted",
  "rejected",
  "error",
]);

export const bronzeIdentityStatusEnum = pgEnum("bronze_identity_status", [
  "unresolved",
  "resolved",
  "duplicate_source",
  "identity_conflict",
  "insufficient_identifiers",
]);

export const importStatusEnum = pgEnum("import_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const reprocessTypeEnum = pgEnum("reprocess_type", ["identity", "promotion", "anaf"]);

export const reprocessStatusEnum = pgEnum("reprocess_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const importRuntimeSessionKindEnum = pgEnum("import_runtime_session_kind", [
  "ingest",
  "retry",
  "anaf",
  "reprocess",
  "recovery",
  "delete",
]);

export const importRuntimeStatusEnum = pgEnum("import_runtime_status", [
  "queued",
  "running",
  "paused",
  "recovering",
  "completed",
  "failed",
  "stale",
  "terminal_error_skipped",
  "cancelled",
  "deleted",
]);

export const bronzeContacts = bronzeSchema.table(
  "bronze_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    sourceType: bronzeSourceTypeEnum("source_type").notNull(),
    sourceIdentifier: varchar("source_identifier", { length: 500 }).notNull(),
    rawPayload: jsonb("raw_payload").notNull(),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    sourcePayloadHash: varchar("source_payload_hash", { length: 64 }).notNull(),
    processingStatus: bronzeProcessingStatusEnum("processing_status").notNull().default("pending"),
    extractedCuiRaw: varchar("extracted_cui_raw", { length: 64 }),
    extractedCui: varchar("extracted_cui", { length: 32 }),
    extractedNrRegComRaw: varchar("extracted_nr_reg_com_raw", { length: 32 }),
    extractedNrRegCom: varchar("extracted_nr_reg_com", { length: 32 }),
    extractedNrRegComCanonical: varchar("extracted_nr_reg_com_canonical", { length: 20 }),
    extractedEmail: varchar("extracted_email", { length: 320 }),
    extractedPhone: varchar("extracted_phone", { length: 32 }),
    extractedName: varchar("extracted_name", { length: 255 }),
    extractedJudet: varchar("extracted_judet", { length: 100 }),
    extractedLocalitate: varchar("extracted_localitate", { length: 100 }),
    extractedAddress: text("extracted_address"),
    extractedCaen: varchar("extracted_caen", { length: 8 }),
    isDuplicate: boolean("is_duplicate").notNull().default(false),
    duplicateOfId: uuid("duplicate_of_id").references((): AnyPgColumn => bronzeContacts.id, {
      onDelete: "set null",
    }),
    identityStatus: bronzeIdentityStatusEnum("identity_status").notNull().default("unresolved"),
    resolvedCompanyId: uuid("resolved_company_id"),
    identityResolutionMetadata: jsonb("identity_resolution_metadata").notNull().default({}),
    promotedToSilverId: uuid("promoted_to_silver_id"),
    doNotProcess: boolean("do_not_process").notNull().default(false),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_bronze_contacts_tenant_status").on(t.tenantId, t.processingStatus),
    index("idx_bronze_contacts_pending")
      .on(t.tenantId, t.createdAt)
      .where(sql`${t.processingStatus} = 'pending'`),
    index("idx_bronze_contacts_source_payload_hash").on(t.tenantId, t.sourcePayloadHash),
    index("idx_bronze_contacts_cui").on(t.extractedCui),
    index("idx_bronze_contacts_nr_reg_com").on(t.extractedNrRegCom),
    index("idx_bronze_contacts_email").on(t.extractedEmail),
    index("idx_bronze_contacts_source").on(t.sourceType),
    index("idx_bronze_contacts_identity_status").on(t.tenantId, t.identityStatus),
    index("idx_bronze_contacts_resolved_company").on(t.resolvedCompanyId),
    index("idx_bronze_contacts_payload_gin").using("gin", t.rawPayload),
    index("idx_bronze_contacts_promoted").on(t.promotedToSilverId),
  ],
);

export const bronzeImportBatches = bronzeSchema.table(
  "bronze_import_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    filename: varchar("filename", { length: 255 }).notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    fileChecksum: varchar("file_checksum", { length: 64 }),
    totalRows: integer("total_rows").notNull().default(0),
    processedRows: integer("processed_rows").notNull().default(0),
    successRows: integer("success_rows").notNull().default(0),
    errorRows: integer("error_rows").notNull().default(0),
    duplicateRows: integer("duplicate_rows").notNull().default(0),
    status: importStatusEnum("status").notNull().default("pending"),
    importedBy: uuid("imported_by").references(() => users.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_bronze_batches_tenant").on(t.tenantId, t.createdAt),
    index("idx_bronze_batches_status").on(t.status),
  ],
);

export const bronzeWebhooks = bronzeSchema.table(
  "bronze_webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    webhookType: varchar("webhook_type", { length: 100 }).notNull(),
    sourceIp: inet("source_ip"),
    requestHeaders: jsonb("request_headers").notNull().default({}),
    requestBody: jsonb("request_body").notNull(),
    signatureHeader: text("signature_header"),
    signatureValid: boolean("signature_valid").notNull().default(false),
    processedContactIds: uuid("processed_contact_ids").array().notNull().default([]),
    processingStatus: bronzeProcessingStatusEnum("processing_status").notNull().default("pending"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_bronze_webhooks_tenant").on(t.tenantId, t.createdAt),
    index("idx_bronze_webhooks_type").on(t.webhookType),
    index("idx_bronze_webhooks_pending")
      .on(t.createdAt)
      .where(sql`${t.processingStatus} = 'pending'`),
  ],
);

export const bronzeScrapeResults = bronzeSchema.table(
  "bronze_scrape_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    sourceUrl: text("source_url").notNull(),
    sourceDomain: varchar("source_domain", { length: 255 }).notNull(),
    scrapeType: varchar("scrape_type", { length: 100 }).notNull(),
    rawHtml: text("raw_html"),
    extractedData: jsonb("extracted_data").notNull().default({}),
    confidenceScore: integer("confidence_score"),
    validationErrors: jsonb("validation_errors").notNull().default([]),
    processingStatus: bronzeProcessingStatusEnum("processing_status").notNull().default("pending"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_bronze_scrape_tenant").on(t.tenantId, t.createdAt),
    index("idx_bronze_scrape_domain").on(t.sourceDomain),
    index("idx_bronze_scrape_pending")
      .on(t.createdAt)
      .where(sql`${t.processingStatus} = 'pending'`),
  ],
);

export const importReprocessSessions = bronzeSchema.table(
  "import_reprocess_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => bronzeImportBatches.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: reprocessTypeEnum("type").notNull(),
    status: reprocessStatusEnum("status").notNull().default("pending"),
    phase: varchar("phase", { length: 50 }),
    cursorCreatedAt: timestamp("cursor_created_at", { withTimezone: true }),
    cursorLastBronzeId: uuid("cursor_last_bronze_id"),
    processedRows: integer("processed_rows").notNull().default(0),
    totalRows: integer("total_rows").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    lastError: text("last_error"),
    lastProgressAt: timestamp("last_progress_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_reprocess_sessions_batch").on(t.batchId),
    index("idx_reprocess_sessions_tenant_status").on(t.tenantId, t.status),
  ],
);

export const importRuntimeSessions = bronzeSchema.table(
  "import_runtime_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => bronzeImportBatches.id, { onDelete: "cascade" }),
    kind: importRuntimeSessionKindEnum("kind").notNull(),
    status: importRuntimeStatusEnum("status").notNull().default("queued"),
    correlationId: varchar("correlation_id", { length: 255 }),
    label: varchar("label", { length: 255 }),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    silverContactsInitial: integer("silver_contacts_initial").notNull().default(0),
    silverContactsPromotedDuringSession: integer("silver_contacts_promoted_during_session")
      .notNull()
      .default(0),
    silverContactsCurrent: integer("silver_contacts_current").notNull().default(0),
    externalDelta: integer("external_delta").notNull().default(0),
    metrics: jsonb("metrics").notNull().default({}),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_import_runtime_sessions_batch").on(t.batchId, t.createdAt),
    index("idx_import_runtime_sessions_tenant_status").on(t.tenantId, t.status, t.createdAt),
    index("idx_import_runtime_sessions_batch_status").on(t.batchId, t.status),
  ],
);

export const importRuntimeJobs = bronzeSchema.table(
  "import_runtime_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => bronzeImportBatches.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => importRuntimeSessions.id, { onDelete: "cascade" }),
    runtimeJobKey: varchar("runtime_job_key", { length: 255 }).notNull(),
    parentRuntimeJobKey: varchar("parent_runtime_job_key", { length: 255 }),
    queueName: varchar("queue_name", { length: 80 }).notNull(),
    jobName: varchar("job_name", { length: 120 }).notNull(),
    workerName: varchar("worker_name", { length: 120 }).notNull(),
    stageKey: varchar("stage_key", { length: 80 }),
    bullJobId: varchar("bull_job_id", { length: 255 }),
    entityType: varchar("entity_type", { length: 80 }),
    entityId: varchar("entity_id", { length: 255 }),
    contactId: uuid("contact_id"),
    state: importRuntimeStatusEnum("state").notNull().default("queued"),
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    attemptsUsed: integer("attempts_used").notNull().default(0),
    maxRecoveryAttempts: integer("max_recovery_attempts").notNull().default(3),
    checkpointPayload: jsonb("checkpoint_payload").notNull().default({}),
    resumePayload: jsonb("resume_payload").notNull().default({}),
    metrics: jsonb("metrics").notNull().default({}),
    lastError: text("last_error"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_import_runtime_jobs_batch").on(t.batchId, t.updatedAt),
    index("idx_import_runtime_jobs_session_worker").on(t.sessionId, t.workerName, t.updatedAt),
    index("idx_import_runtime_jobs_batch_parent").on(t.batchId, t.parentRuntimeJobKey),
    index("idx_import_runtime_jobs_tenant_state").on(t.tenantId, t.state, t.updatedAt),
    index("idx_import_runtime_jobs_runtime_key").on(t.tenantId, t.runtimeJobKey),
    uniqueIndex("idx_import_runtime_jobs_unique_runtime_key").on(t.tenantId, t.runtimeJobKey),
  ],
);

export const importRuntimeWorkerCounters = bronzeSchema.table(
  "import_runtime_worker_counters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => bronzeImportBatches.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => importRuntimeSessions.id, { onDelete: "cascade" }),
    workerName: varchar("worker_name", { length: 120 }).notNull(),
    queueName: varchar("queue_name", { length: 80 }).notNull(),
    stageKey: varchar("stage_key", { length: 80 }),
    totalJobs: integer("total_jobs").notNull().default(0),
    queuedJobs: integer("queued_jobs").notNull().default(0),
    runningJobs: integer("running_jobs").notNull().default(0),
    pausedJobs: integer("paused_jobs").notNull().default(0),
    completedJobs: integer("completed_jobs").notNull().default(0),
    failedJobs: integer("failed_jobs").notNull().default(0),
    skippedJobs: integer("skipped_jobs").notNull().default(0),
    warningJobs: integer("warning_jobs").notNull().default(0),
    totalUnits: integer("total_units").notNull().default(0),
    processedUnits: integer("processed_units").notNull().default(0),
    successUnits: integer("success_units").notNull().default(0),
    failedUnits: integer("failed_units").notNull().default(0),
    skippedUnits: integer("skipped_units").notNull().default(0),
    insertedUnits: integer("inserted_units").notNull().default(0),
    updatedUnits: integer("updated_units").notNull().default(0),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
    metrics: jsonb("metrics").notNull().default({}),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_import_runtime_worker_counters_batch").on(t.batchId, t.updatedAt),
    index("idx_import_runtime_worker_counters_session").on(t.sessionId, t.workerName),
    index("idx_import_runtime_worker_counters_tenant").on(t.tenantId, t.workerName, t.updatedAt),
    uniqueIndex("idx_import_runtime_worker_counters_unique_session_worker").on(
      t.sessionId,
      t.workerName,
    ),
  ],
);

// ─── Job Logs ─────────────────────────────────────────────────────────────────
// Granular per-worker / per-job execution logs for the import pipeline.
// Queried by GET /imports/:id/logs and streamed via GET /imports/:id/logs/stream (SSE).

export const jobLogLevelEnum = pgEnum("job_log_level", ["debug", "info", "warn", "error"]);

export const jobLogs = bronzeSchema.table(
  "job_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    // Loose reference (no FK constraint) so logs survive batch deletion gracefully.
    batchId: uuid("batch_id").notNull(),
    sessionId: uuid("session_id"),
    contactId: uuid("contact_id"),
    workerName: varchar("worker_name", { length: 64 }).notNull(),
    jobId: varchar("job_id", { length: 255 }),
    runtimeJobKey: varchar("runtime_job_key", { length: 255 }),
    parentRuntimeJobKey: varchar("parent_runtime_job_key", { length: 255 }),
    level: jobLogLevelEnum("level").notNull().default("info"),
    step: varchar("step", { length: 128 }),
    message: text("message").notNull(),
    context: jsonb("context"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_job_logs_batch_created").on(t.batchId, t.createdAt),
    index("idx_job_logs_batch_level").on(t.batchId, t.level),
    index("idx_job_logs_tenant_batch").on(t.tenantId, t.batchId),
    index("idx_job_logs_batch_session_created").on(t.batchId, t.sessionId, t.createdAt),
    index("idx_job_logs_runtime_job_key").on(t.tenantId, t.runtimeJobKey),
  ],
);

export const importRowQuarantine = bronzeSchema.table(
  "import_row_quarantine",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => bronzeImportBatches.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => importRuntimeSessions.id, {
      onDelete: "set null",
    }),
    runtimeJobKey: varchar("runtime_job_key", { length: 255 }),
    sourceType: bronzeSourceTypeEnum("source_type").notNull(),
    sourceIdentifier: varchar("source_identifier", { length: 500 }).notNull(),
    sheetName: varchar("sheet_name", { length: 255 }),
    worksheetRow: integer("worksheet_row"),
    globalRow: integer("global_row"),
    fieldName: varchar("field_name", { length: 255 }),
    reasonCode: varchar("reason_code", { length: 80 }).notNull(),
    rowPayloadEscaped: jsonb("row_payload_escaped").notNull(),
    sanitizedPayload: jsonb("sanitized_payload"),
    violations: jsonb("violations").notNull().default([]),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_import_row_quarantine_batch").on(t.batchId, t.createdAt),
    index("idx_import_row_quarantine_session").on(t.sessionId, t.createdAt),
    index("idx_import_row_quarantine_reason").on(t.reasonCode, t.createdAt),
    index("idx_import_row_quarantine_source_identifier").on(t.tenantId, t.sourceIdentifier),
  ],
);

export const sourceIdentifierRepairAudit = bronzeSchema.table(
  "source_identifier_repair_audit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repairRunId: uuid("repair_run_id").notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id").references(() => bronzeImportBatches.id, { onDelete: "set null" }),
    sourceIdentifier: varchar("source_identifier", { length: 500 }).notNull(),
    canonicalBronzeId: uuid("canonical_bronze_id").references(() => bronzeContacts.id, {
      onDelete: "set null",
    }),
    duplicateBronzeId: uuid("duplicate_bronze_id").references(() => bronzeContacts.id, {
      onDelete: "set null",
    }),
    classification: varchar("classification", { length: 40 }).notNull(),
    reason: text("reason"),
    metadata: jsonb("metadata").notNull().default({}),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_source_identifier_repair_run").on(t.repairRunId, t.createdAt),
    index("idx_source_identifier_repair_source").on(t.tenantId, t.sourceIdentifier),
    index("idx_source_identifier_repair_classification").on(t.classification, t.createdAt),
  ],
);
