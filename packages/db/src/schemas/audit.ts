import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { users } from "./users.js";

export const auditSchema = pgSchema("audit");

export const approvalAuditLog = auditSchema.table(
  "approval_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    approvalTaskId: uuid("approval_task_id").notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    performedBy: uuid("performed_by"),
    performedByRole: varchar("performed_by_role", { length: 50 }),
    previousStatus: varchar("previous_status", { length: 20 }),
    newStatus: varchar("new_status", { length: 20 }),
    previousData: jsonb("previous_data"),
    newData: jsonb("new_data"),
    reason: text("reason"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    eventHash: varchar("event_hash", { length: 64 }).notNull(),
    previousHash: varchar("previous_hash", { length: 64 }),
    source: varchar("source", { length: 50 }).notNull().default("api"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("approval_audit_log_tenant_id_idx").on(t.tenantId)],
);

/** Jurnal consimțământ cookie (banner web) — sursă SQL: 0063_gdpr_audit_tables.sql */
export const gdprConsentLog = auditSchema.table(
  "gdpr_consent_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    consentCategories: jsonb("consent_categories").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    clientTimestamp: timestamp("client_timestamp", { withTimezone: true }),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
  },
  (t) => [
    index("idx_gdpr_consent_log_tenant").on(t.tenantId, t.recordedAt),
    index("idx_gdpr_consent_log_recorded").on(t.recordedAt),
  ],
);

/** Jurnal operațiuni drept la ștergere (Art. 17) — 0063_gdpr_audit_tables.sql */
export const gdprErasureLog = auditSchema.table(
  "gdpr_erasure_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    subjectType: varchar("subject_type", { length: 20 }).notNull(),
    subjectId: uuid("subject_id").notNull(),
    requestedBy: uuid("requested_by").references(() => users.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    affectedTables: jsonb("affected_tables").notNull().default([]),
    rowsDeleted: integer("rows_deleted").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_gdpr_erasure_log_tenant").on(t.tenantId, t.createdAt)],
);

/**
 * Audit HTTP API (mutații) — sursa SQL: 0068_audit_api_audit_log.sql.
 * Separat de `approval_audit_log` (workflow aprobări).
 */
export const auditLog = auditSchema.table(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    correlationId: uuid("correlation_id"),
    traceId: text("trace_id"),
    spanId: text("span_id"),
    method: varchar("method", { length: 16 }).notNull(),
    routePattern: text("route_pattern").notNull(),
    statusCode: integer("status_code").notNull(),
    ipHash: varchar("ip_hash", { length: 64 }),
    userAgent: text("user_agent"),
    requestBodyHash: varchar("request_body_hash", { length: 64 }),
    metadata: jsonb("metadata").notNull().default({}),
    eventHash: varchar("event_hash", { length: 64 }).notNull(),
    previousHash: varchar("previous_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_audit_log_tenant_created").on(t.tenantId, t.createdAt),
    index("idx_audit_log_user_created").on(t.userId, t.createdAt),
    index("idx_audit_log_correlation").on(t.correlationId),
    index("idx_audit_log_created").on(t.createdAt),
  ],
);

/** Rând insert Drizzle — același modul ca `auditLog` (`$inferInsert` evită TS2344 la consumatori când IDE amestecă instanțe de tipuri). */
export type AuditLogInsertRow = typeof auditLog.$inferInsert;
