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
