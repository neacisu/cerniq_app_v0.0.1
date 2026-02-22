import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const auditSchema = pgSchema("audit");

export const approvalAuditLog = auditSchema.table("approval_audit_log", {
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
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
