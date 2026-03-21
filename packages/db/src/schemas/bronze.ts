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
    contactId: uuid("contact_id"),
    workerName: varchar("worker_name", { length: 64 }).notNull(),
    jobId: varchar("job_id", { length: 255 }),
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
  ],
);
