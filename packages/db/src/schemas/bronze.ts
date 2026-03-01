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

export const importStatusEnum = pgEnum("import_status", [
  "pending",
  "processing",
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
    rawPayload: jsonb("raw_payload").notNull(),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    processingStatus: bronzeProcessingStatusEnum("processing_status").notNull().default("pending"),
    extractedCui: varchar("extracted_cui", { length: 32 }),
    extractedEmail: varchar("extracted_email", { length: 320 }),
    extractedPhone: varchar("extracted_phone", { length: 32 }),
    extractedName: varchar("extracted_name", { length: 255 }),
    isDuplicate: boolean("is_duplicate").notNull().default(false),
    duplicateOfId: uuid("duplicate_of_id"),
    promotedToSilverId: uuid("promoted_to_silver_id"),
    doNotProcess: boolean("do_not_process").notNull().default(false),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_bronze_contacts_tenant_status").on(t.tenantId, t.processingStatus),
    uniqueIndex("idx_bronze_contacts_hash_unique")
      .on(t.tenantId, t.contentHash)
      .where(sql`${t.isDuplicate} = false`),
    index("idx_bronze_contacts_pending")
      .on(t.tenantId, t.createdAt)
      .where(sql`${t.processingStatus} = 'pending'`),
    index("idx_bronze_contacts_cui").on(t.extractedCui),
    index("idx_bronze_contacts_email").on(t.extractedEmail),
    index("idx_bronze_contacts_source").on(t.sourceType),
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
