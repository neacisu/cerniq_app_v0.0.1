/**
 * gold-e5-nurturing.ts — Schema E5: Nurturing FSM, Acțiuni, Content Drips, NPS (Plan §X FAZA 9a)
 * Tabele: gold_nurturing_state, gold_nurturing_actions, gold_content_drips, gold_nps_surveys
 * Migrare: 0049_e5_nurturing.sql
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { goldSchema, goldCompanies } from "./gold.js";

function sqlInList(values: readonly string[]): string {
  return values.map((v) => "'" + v + "'").join(",");
}

// ---------------------------------------------------------------------------
// ENUM-URI E5 Nurturing
// ---------------------------------------------------------------------------

const nurturingStates = [
  "ONBOARDING",
  "NURTURING_ACTIVE",
  "AT_RISK",
  "CHURNED",
  "REACTIVATED",
  "LOYAL_CLIENT",
  "ADVOCATE",
] as const;

export const nurturingStateEnum = pgEnum("nurturing_state_enum", [...nurturingStates]);

const churnRiskLevels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const churnRiskLevelEnum = pgEnum("churn_risk_level_enum", [...churnRiskLevels]);

const satisfactionTrends = ["IMPROVING", "STABLE", "DECLINING"] as const;
export const satisfactionTrendEnum = pgEnum("satisfaction_trend_enum", [...satisfactionTrends]);

const actionChannels = ["EMAIL", "WHATSAPP", "SMS", "PHONE", "IN_APP"] as const;
export const e5ActionChannelEnum = pgEnum("e5_action_channel_enum", [...actionChannels]);

const actionStatuses = ["PENDING", "SENT", "DELIVERED", "FAILED", "SKIPPED"] as const;
export const actionStatusEnum = pgEnum("action_status_enum", [...actionStatuses]);

// ---------------------------------------------------------------------------
// TABEL 1: gold_nurturing_state
// FSM state per client per tenant — UNIQUE(tenant_id, lead_id)
// ---------------------------------------------------------------------------

export const goldNurturingState = goldSchema.table(
  "gold_nurturing_state",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    currentState: nurturingStateEnum("current_state").notNull().default("ONBOARDING"),
    churnRiskScore: integer("churn_risk_score").notNull().default(0),
    churnRiskLevel: churnRiskLevelEnum("churn_risk_level").notNull().default("LOW"),
    totalOrders: integer("total_orders").notNull().default(0),
    totalRevenue: numeric("total_revenue", { precision: 14, scale: 2 }).notNull().default("0"),
    daysSinceLastOrder: integer("days_since_last_order"),
    npsScore: integer("nps_score"),
    satisfactionTrend: satisfactionTrendEnum("satisfaction_trend"),
    successfulReferrals: integer("successful_referrals").notNull().default(0),
    neighborCount: integer("neighbor_count").notNull().default(0),
    isAdvocate: boolean("is_advocate").notNull().default(false),
    isKol: boolean("is_kol").notNull().default(false),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_gold_nurturing_state_tenant_lead").on(t.tenantId, t.leadId),
    check("chk_nurturing_churn_risk_score", sql`${t.churnRiskScore} BETWEEN 0 AND 100`),
    check("chk_nurturing_nps_score", sql`${t.npsScore} IS NULL OR ${t.npsScore} BETWEEN 0 AND 10`),
    check(
      "chk_nurturing_current_state",
      sql`${t.currentState} IN (${sql.raw(sqlInList(nurturingStates))})`,
    ),
    index("idx_gold_nurturing_state_tenant_state").on(t.tenantId, t.currentState),
    index("idx_gold_nurturing_state_tenant_risk").on(t.tenantId, t.churnRiskLevel),
    index("idx_gold_nurturing_state_lead").on(t.leadId),
  ],
);

// ---------------------------------------------------------------------------
// TABEL 2: gold_nurturing_actions
// Acțiuni executate per client (email, WA, SMS, phone, in-app)
// ---------------------------------------------------------------------------

export const goldNurturingActions = goldSchema.table(
  "gold_nurturing_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    nurturingStateId: uuid("nurturing_state_id")
      .notNull()
      .references(() => goldNurturingState.id, { onDelete: "cascade" }),
    actionType: text("action_type").notNull(),
    channel: e5ActionChannelEnum("channel").notNull(),
    status: actionStatusEnum("status").notNull().default("PENDING"),
    templateId: text("template_id"),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_gold_nurturing_actions_tenant_type").on(t.tenantId, t.actionType),
    index("idx_gold_nurturing_actions_state").on(t.nurturingStateId),
  ],
);

// ---------------------------------------------------------------------------
// TABEL 3: gold_content_drips
// Configurații drip campaign — mesaje automate bazate pe stare FSM
// ---------------------------------------------------------------------------

export const goldContentDrips = goldSchema.table(
  "gold_content_drips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetStates: jsonb("target_states").notNull().default([]),
    daysAfterTrigger: integer("days_after_trigger").notNull().default(0),
    channel: e5ActionChannelEnum("channel").notNull(),
    templateId: text("template_id").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_gold_content_drips_tenant_active").on(t.tenantId, t.isActive)],
);

// ---------------------------------------------------------------------------
// TABEL 4: gold_nps_surveys
// NPS surveys cu cooldown 90 zile per client
// ---------------------------------------------------------------------------

export const goldNpsSurveys = goldSchema.table(
  "gold_nps_surveys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    score: integer("score"),
    comment: text("comment"),
    sentVia: e5ActionChannelEnum("sent_via").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    cooldownUntil: timestamp("cooldown_until", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("chk_nps_score", sql`${t.score} IS NULL OR ${t.score} BETWEEN 0 AND 10`),
    index("idx_gold_nps_surveys_tenant_lead").on(t.tenantId, t.leadId),
    index("idx_gold_nps_surveys_sent_at").on(t.sentAt),
  ],
);
