import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  real,
  integer,
  jsonb,
  pgEnum,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { users } from "./users.js";

export const approvalSchema = pgSchema("approval");

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "assigned",
  "approved",
  "rejected",
  "escalated",
  "expired",
  "cancelled",
]);
export const approvalUrgencyEnum = pgEnum("approval_urgency", [
  "low",
  "medium",
  "high",
  "critical",
]);
export const approvalPriorityEnum = pgEnum("approval_priority", [
  "critical",
  "high",
  "normal",
  "low",
]);
export const approvalTypeEnum = pgEnum("approval_type", [
  "dedup_review",
  "identity_conflict",
  "quality_review",
  "ai_structuring_review",
  "ai_merge_review",
  "low_confidence_review",
  "data_anomaly",
  "manual_verification",
  "error_review",
]);

export const approvalTasks = approvalSchema.table(
  "approval_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(),
    approvalType: approvalTypeEnum("approval_type").notNull().default("manual_verification"),
    status: approvalStatusEnum("status").notNull().default("pending"),
    urgency: approvalUrgencyEnum("urgency").notNull().default("medium"),
    priorityLevel: approvalPriorityEnum("priority_level").notNull().default("normal"),
    pipelineStage: varchar("pipeline_stage", { length: 10 }).notNull().default("E1"),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    aiConfidence: real("ai_confidence"),
    aiRecommendation: varchar("ai_recommendation", { length: 20 }),
    aiReasoning: text("ai_reasoning"),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decision: varchar("decision", { length: 20 }),
    decisionReason: text("decision_reason"),
    decisionMetadata: jsonb("decision_metadata").default({}),
    dueAt: timestamp("due_at", { withTimezone: true }),
    escalationLevel: integer("escalation_level").notNull().default(0),
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),
    escalatedTo: uuid("escalated_to").references(() => users.id, { onDelete: "set null" }),
    blockedJobId: varchar("blocked_job_id", { length: 100 }),
    blockedQueueName: varchar("blocked_queue_name", { length: 100 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    etapa: varchar("etapa", { length: 10 }).notNull(),
    priority: real("priority").default(0),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("approval_tasks_tenant_id_idx").on(t.tenantId)],
);

export const approvalTypeConfigs = approvalSchema.table(
  "approval_type_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(),
    etapa: varchar("etapa", { length: 10 }).notNull(),
    autoApproveThreshold: real("auto_approve_threshold"),
    autoRejectThreshold: real("auto_reject_threshold"),
    requiresHumanReview: varchar("requires_human_review", { length: 10 })
      .notNull()
      .default("always"),
    maxDecisionTimeHours: real("max_decision_time_hours").default(24),
    escalationTimeHours: real("escalation_time_hours").default(4),
    escalateTo: varchar("escalate_to", { length: 20 }),
    notifyOnCreate: varchar("notify_on_create", { length: 200 }),
    notifyOnDecision: varchar("notify_on_decision", { length: 200 }),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("approval_type_configs_tenant_id_idx").on(t.tenantId)],
);
