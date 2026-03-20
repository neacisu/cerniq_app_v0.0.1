/**
 * Etapa 2 — Outreach Schema
 * All Etapa 2 tables live in the `outreach` PostgreSQL schema.
 * Source: etapa2-schema-outreach.md, etapa2-migrations.md
 *
 * NOTE: Existing `gold.gold_lead_journey` (Etapa 1 event log) is KEPT as-is.
 * This file creates the Etapa 2 state machine tables in the `outreach` schema
 * to avoid naming conflicts and maintain clear layer separation.
 *
 * phone_status_enum: canonical value is RECONNECTING (not QUARANTINE)
 * per etapa2-migrations.md sec 2.1 (source-of-truth).
 */
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";
import { users } from "./users.js";
import { goldCompanies } from "./gold.js";
import {
  currentStateEnum,
  channelEnum,
  messageDirectionEnum,
  messageStatusEnum,
  phoneStatusEnum,
  reviewPriorityEnum,
  reviewReasonEnum,
  sequenceStatusEnum,
  templateStatusEnum,
  templateTypeEnum,
} from "./outreach-enums.js";

export const outreachSchema = pgSchema("outreach");

// ---------------------------------------------------------------------------
// Lead Journey (state machine — one row per lead)
// Source: etapa2-schema-outreach.md sec. 3
// ---------------------------------------------------------------------------
export const leadJourney = outreachSchema.table(
  "lead_journey",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),

    // WhatsApp sticky assignment (ADR-0055)
    assignedPhoneId: uuid("assigned_phone_id"),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),

    // State Machine (ADR-0062)
    currentState: currentStateEnum("current_state").notNull().default("COLD"),
    previousState: currentStateEnum("previous_state"),
    stateChangedAt: timestamp("state_changed_at", { withTimezone: true }).defaultNow(),
    stateChangeReason: text("state_change_reason"),

    // Quota tracking
    quotaConsumptionDate: date("quota_consumption_date", { mode: "string" }),
    isNewContact: boolean("is_new_contact").notNull().default(true),
    firstContactChannel: channelEnum("first_contact_channel"),

    // Channel preferences
    lastChannelUsed: channelEnum("last_channel_used"),
    preferredChannel: channelEnum("preferred_channel"),
    emailOptedOut: boolean("email_opted_out").notNull().default(false),
    whatsappOptedOut: boolean("whatsapp_opted_out").notNull().default(false),

    // Sequence state
    currentSequenceId: uuid("current_sequence_id"),
    sequenceStep: integer("sequence_step").default(0),
    sequenceStartedAt: timestamp("sequence_started_at", { withTimezone: true }),
    sequencePaused: boolean("sequence_paused").notNull().default(false),
    nextActionAt: timestamp("next_action_at", { withTimezone: true }),

    // Scoring (-100..100 for sentiment, 0..100 for engagement)
    sentimentScore: integer("sentiment_score").notNull().default(0),
    engagementScore: integer("engagement_score").notNull().default(0),
    replyCount: integer("reply_count").notNull().default(0),
    openCount: integer("open_count").notNull().default(0),
    clickCount: integer("click_count").notNull().default(0),

    // Human intervention (ADR-0064)
    requiresHumanReview: boolean("requires_human_review").notNull().default(false),
    humanReviewReason: reviewReasonEnum("human_review_reason"),
    humanReviewPriority: reviewPriorityEnum("human_review_priority"),
    isHumanControlled: boolean("is_human_controlled").notNull().default(false),
    assignedToUser: uuid("assigned_to_user").references(() => users.id, {
      onDelete: "set null",
    }),

    // Timestamps
    firstContactAt: timestamp("first_contact_at", { withTimezone: true }),
    lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
    lastReplyAt: timestamp("last_reply_at", { withTimezone: true }),
    lastOpenAt: timestamp("last_open_at", { withTimezone: true }),
    convertedAt: timestamp("converted_at", { withTimezone: true }),

    // Metadata
    tags: jsonb("tags").notNull().default([]),
    customFields: jsonb("custom_fields").notNull().default({}),

    // Audit
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("unique_lead_journey").on(t.tenantId, t.leadId),
    index("idx_lead_journey_tenant_state").on(t.tenantId, t.currentState),
    index("idx_lead_journey_next_action").on(t.nextActionAt),
    index("idx_lead_journey_review").on(t.tenantId, t.requiresHumanReview),
    index("idx_lead_journey_sequence").on(t.currentSequenceId, t.sequenceStep),
    check("chk_sentiment_score", sql`${t.sentimentScore} BETWEEN -100 AND 100`),
    check("chk_engagement_score", sql`${t.engagementScore} BETWEEN 0 AND 100`),
  ],
);

// ---------------------------------------------------------------------------
// Communication Log (immutable audit of all messages)
// Source: etapa2-schema-outreach.md sec. 4
// ---------------------------------------------------------------------------
export const communicationLog = outreachSchema.table(
  "communication_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadJourneyId: uuid("lead_journey_id").notNull(),

    // Message identity
    externalMessageId: varchar("external_message_id", { length: 255 }),
    threadId: varchar("thread_id", { length: 255 }),

    // Channel
    channel: channelEnum("channel").notNull(),
    direction: messageDirectionEnum("direction").notNull(),

    // Content
    templateId: uuid("template_id"),
    content: text("content").notNull(),
    contentRendered: text("content_rendered"),
    contentPreview: varchar("content_preview", { length: 500 }),
    subject: varchar("subject", { length: 255 }),

    // Status
    status: messageStatusEnum("status").notNull().default("QUEUED"),
    statusUpdatedAt: timestamp("status_updated_at", { withTimezone: true }).defaultNow(),

    // Delivery tracking
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    bouncedAt: timestamp("bounced_at", { withTimezone: true }),
    bounceReason: text("bounce_reason"),

    // Email specific
    openedAt: timestamp("opened_at", { withTimezone: true }),
    clickedAt: timestamp("clicked_at", { withTimezone: true }),
    clickUrl: text("click_url"),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),

    // Phone context
    phoneId: uuid("phone_id"),
    phoneNumber: varchar("phone_number", { length: 20 }),

    // Sequence context
    sequenceId: uuid("sequence_id"),
    sequenceStep: integer("sequence_step"),

    // AI analysis
    sentimentScore: integer("sentiment_score"),
    sentimentAnalyzedAt: timestamp("sentiment_analyzed_at", { withTimezone: true }),
    intentClassification: varchar("intent_classification", { length: 50 }),

    // Cost tracking (1 = new contact, 0 = follow-up)
    quotaCost: smallint("quota_cost").notNull().default(0),

    // Raw data (JSONB for provider responses)
    rawRequest: jsonb("raw_request"),
    rawResponse: jsonb("raw_response"),
    webhookPayload: jsonb("webhook_payload"),

    // Error handling
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),

    // Audit
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    index("idx_comm_log_journey").on(t.leadJourneyId, t.createdAt),
    index("idx_comm_log_external_id").on(t.externalMessageId),
    index("idx_comm_log_tenant_channel").on(t.tenantId, t.channel),
    index("idx_comm_log_status").on(t.status, t.createdAt),
    check("chk_quota_cost", sql`${t.quotaCost} IN (0, 1)`),
  ],
);

// ---------------------------------------------------------------------------
// WhatsApp Phone Numbers (20 phone accounts managed by TimelinesAI)
// Source: etapa2-schema-outreach.md sec. 5
// ---------------------------------------------------------------------------
export const waPhoneNumbers = outreachSchema.table(
  "wa_phone_numbers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    // Identity
    phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
    displayName: varchar("display_name", { length: 100 }),
    timelinesaiAccountId: varchar("timelinesai_account_id", { length: 100 }).notNull(),

    // Capacity
    dailyNewContactLimit: integer("daily_new_contact_limit").notNull().default(200),
    currentNewContactsToday: integer("current_new_contacts_today").notNull().default(0),
    followupLimit: integer("followup_limit").notNull().default(500),
    currentFollowupsToday: integer("current_followups_today").notNull().default(0),

    // Status (RECONNECTING is canonical per etapa2-migrations.md)
    status: phoneStatusEnum("status").notNull().default("ACTIVE"),
    lastStatusChange: timestamp("last_status_change", { withTimezone: true }),
    lastError: text("last_error"),

    // Health metrics
    messagesSent24h: integer("messages_sent_24h").notNull().default(0),
    messagesFailed24h: integer("messages_failed_24h").notNull().default(0),
    bounceRate24h: integer("bounce_rate_24h").notNull().default(0),
    avgResponseRate: integer("avg_response_rate"),

    // Control flags
    isEnabled: boolean("is_enabled").notNull().default(true),
    isConnected: boolean("is_connected").notNull().default(true),
    priority: integer("priority").notNull().default(1),
    reputationScore: integer("reputation_score").notNull().default(100),

    // Timestamps
    lastHealthCheckAt: timestamp("last_health_check_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_phone_number_tenant").on(t.tenantId, t.phoneNumber),
    unique("uq_timelinesai_account").on(t.timelinesaiAccountId),
    index("idx_wa_phones_tenant_enabled").on(t.tenantId, t.isEnabled),
    index("idx_wa_phones_status").on(t.status, t.isEnabled),
  ],
);

// ---------------------------------------------------------------------------
// WhatsApp Quota Usage (daily usage tracking per phone)
// Source: etapa2-schema-outreach.md sec. 5
// ---------------------------------------------------------------------------
export const waQuotaUsage = outreachSchema.table(
  "wa_quota_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phoneId: uuid("phone_id")
      .notNull()
      .references(() => waPhoneNumbers.id, { onDelete: "cascade" }),
    usageDate: date("usage_date", { mode: "string" }).notNull(),

    // Usage counters
    messagesSent: integer("messages_sent").notNull().default(0),
    newContacts: integer("new_contacts").notNull().default(0),
    followUps: integer("follow_ups").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_quota_phone_date").on(t.phoneId, t.usageDate),
    index("idx_quota_phone_date").on(t.phoneId, t.usageDate),
  ],
);

// ---------------------------------------------------------------------------
// Outreach Sequences (multi-step automation)
// Source: etapa2-schema-outreach.md sec. 6
// ---------------------------------------------------------------------------
export const outreachSequences = outreachSchema.table(
  "outreach_sequences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    primaryChannel: channelEnum("primary_channel").notNull(),

    // Behavior flags
    stopOnReply: boolean("stop_on_reply").notNull().default(true),
    respectBusinessHours: boolean("respect_business_hours").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),

    // Stats (updated by aggregator worker)
    totalEnrolled: integer("total_enrolled").notNull().default(0),
    totalCompletions: integer("total_completions").notNull().default(0),
    totalConversions: integer("total_conversions").notNull().default(0),

    // Audit
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_sequences_tenant_active").on(t.tenantId, t.isActive)],
);

// ---------------------------------------------------------------------------
// Sequence Steps (individual steps in a sequence)
// Source: etapa2-schema-outreach.md sec. 6
// ---------------------------------------------------------------------------
export const outreachSequenceSteps = outreachSchema.table(
  "outreach_sequence_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sequenceId: uuid("sequence_id")
      .notNull()
      .references(() => outreachSequences.id, { onDelete: "cascade" }),

    stepNumber: integer("step_number").notNull(),
    channel: channelEnum("channel").notNull(),
    templateId: uuid("template_id"),

    // Timing
    delayHours: integer("delay_hours").notNull().default(24),
    delayMinutes: integer("delay_minutes").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_sequence_step").on(t.sequenceId, t.stepNumber),
    index("idx_sequence_steps_sequence").on(t.sequenceId, t.stepNumber),
  ],
);

// ---------------------------------------------------------------------------
// Sequence Enrollments (per-lead enrollment in a sequence)
// Source: etapa2-schema-outreach.md sec. 7
// ---------------------------------------------------------------------------
export const sequenceEnrollments = outreachSchema.table(
  "sequence_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sequenceId: uuid("sequence_id")
      .notNull()
      .references(() => outreachSequences.id, { onDelete: "cascade" }),
    journeyId: uuid("journey_id").notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    status: sequenceStatusEnum("status").notNull().default("ACTIVE"),
    currentStep: integer("current_step").notNull().default(0),
    lastStepExecutedAt: timestamp("last_step_executed_at", { withTimezone: true }),
    nextStepAt: timestamp("next_step_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    stoppedReason: varchar("stopped_reason", { length: 100 }),

    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_enrollment_journey_sequence").on(t.journeyId, t.sequenceId),
    index("idx_enrollments_status").on(t.status, t.nextStepAt),
    index("idx_enrollments_journey").on(t.journeyId),
  ],
);

// ---------------------------------------------------------------------------
// Outreach Templates (message templates with spintax support)
// Source: etapa2-schema-outreach.md sec. 8
// ---------------------------------------------------------------------------
export const outreachTemplates = outreachSchema.table(
  "outreach_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    channel: channelEnum("channel").notNull(),
    templateType: templateTypeEnum("template_type").notNull().default("INITIAL"),
    status: templateStatusEnum("status").notNull().default("DRAFT"),

    // Content (spintax stored raw)
    subject: varchar("subject", { length: 255 }),
    bodyTemplate: text("body_template").notNull(),

    // Variables detected in template
    variables: jsonb("variables").notNull().default([]),

    // WhatsApp media
    hasMedia: boolean("has_media").notNull().default(false),
    mediaType: varchar("media_type", { length: 50 }),
    mediaUrl: text("media_url"),

    // Stats
    usageCount: integer("usage_count").notNull().default(0),

    // Audit
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_templates_tenant_channel").on(t.tenantId, t.channel, t.status),
    index("idx_templates_type").on(t.tenantId, t.templateType),
  ],
);

// ---------------------------------------------------------------------------
// Template Versions (audit trail for template changes)
// Source: etapa2-schema-outreach.md sec. 8
// ---------------------------------------------------------------------------
export const templateVersions = outreachSchema.table(
  "template_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => outreachTemplates.id, { onDelete: "cascade" }),

    versionNumber: integer("version_number").notNull(),
    bodyTemplate: text("body_template").notNull(),
    subject: varchar("subject", { length: 255 }),
    changeReason: text("change_reason"),

    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_template_version").on(t.templateId, t.versionNumber),
    index("idx_template_versions").on(t.templateId, t.versionNumber),
  ],
);

// ---------------------------------------------------------------------------
// Human Review Queue (HITL items)
// Source: etapa2-schema-outreach.md sec. 9, etapa2-hitl-system.md sec. 2
// ---------------------------------------------------------------------------
export const humanReviewQueue = outreachSchema.table(
  "human_review_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    journeyId: uuid("journey_id").notNull(),
    communicationLogId: uuid("communication_log_id"),

    // Review metadata
    priority: reviewPriorityEnum("priority").notNull().default("MEDIUM"),
    reason: reviewReasonEnum("reason").notNull(),
    status: varchar("status", { length: 30 }).notNull().default("PENDING"),

    // Content for review
    triggerContent: text("trigger_content"),
    aiSuggestedResponse: text("ai_suggested_response"),

    // SLA tracking
    slaDueAt: timestamp("sla_due_at", { withTimezone: true }).notNull(),
    slaBreached: boolean("sla_breached").notNull().default(false),

    // Assignment
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),

    // Resolution
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolutionAction: varchar("resolution_action", { length: 30 }),
    resolutionNotes: text("resolution_notes"),
    editedContent: text("edited_content"),

    // Audit
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_review_queue_tenant_status").on(t.tenantId, t.status, t.priority),
    index("idx_review_queue_sla").on(t.slaDueAt, t.status),
    index("idx_review_queue_journey").on(t.journeyId),
  ],
);

// ---------------------------------------------------------------------------
// HITL Audit Log (immutable audit trail for review actions)
// Source: etapa2-hitl-system.md sec. 2.2
// ---------------------------------------------------------------------------
export const hitlAuditLog = outreachSchema.table(
  "hitl_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id").notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),

    // Exactly the events from the documentation
    eventType: varchar("event_type", { length: 30 }).notNull(),
    payload: jsonb("payload"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_hitl_audit_review").on(t.reviewId, t.createdAt),
    index("idx_hitl_audit_tenant").on(t.tenantId, t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Webhook event archive (immutable; ADR-0061 SystemEvent persistence)
// Not hitl_audit_log: that table requires human_review_queue.id as review_id.
// Source: etapa2-workers-F-L-remaining.md Cat. G — Event Archive
// ---------------------------------------------------------------------------
export const webhookEventArchive = outreachSchema.table(
  "webhook_event_archive",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    eventId: varchar("event_id", { length: 255 }).notNull(),
    source: varchar("source", { length: 30 }).notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    eventTimestamp: timestamp("event_timestamp", { withTimezone: true }).notNull(),
    payload: jsonb("payload"),
    rawEvent: jsonb("raw_event"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_webhook_event_archive_tenant_event_id").on(t.tenantId, t.eventId),
    index("idx_webhook_archive_tenant_created").on(t.tenantId, t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Outreach Daily Stats (aggregated per day)
// Source: etapa2-schema-outreach.md sec. 9
// ---------------------------------------------------------------------------
export const outreachDailyStats = outreachSchema.table(
  "outreach_daily_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    statDate: date("stat_date", { mode: "string" }).notNull(),

    // Volume
    messagesSent: integer("messages_sent").notNull().default(0),
    messagesReceived: integer("messages_received").notNull().default(0),
    newContacts: integer("new_contacts").notNull().default(0),
    replies: integer("replies").notNull().default(0),
    conversions: integer("conversions").notNull().default(0),

    // Email health
    bounceCount: integer("bounce_count").notNull().default(0),

    // Phone usage avg
    quotaUsageAvg: integer("quota_usage_avg").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_daily_stats_tenant_date").on(t.tenantId, t.statDate),
    index("idx_daily_stats_tenant_date").on(t.tenantId, t.statDate),
  ],
);
