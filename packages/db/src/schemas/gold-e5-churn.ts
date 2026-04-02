/**
 * gold-e5-churn.ts — Schema E5: Semnale Churn, Factori, Sentiment Analysis (Plan §X FAZA 9a)
 * Tabele: gold_churn_signals, gold_churn_factors, gold_sentiment_analysis
 * Migrare: 0050_e5_churn.sql
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
import { churnRiskLevelEnum } from "./gold-e5-nurturing.js";

function sqlInList(values: readonly string[]): string {
  return values.map((v) => "'" + v + "'").join(",");
}

// ---------------------------------------------------------------------------
// ENUM-URI E5 Churn
// ---------------------------------------------------------------------------

const churnSignalTypes = [
  "COMMUNICATION_FADE",
  "NEGATIVE_SENTIMENT",
  "COMPETITOR_MENTION",
  "SUPPORT_ESCALATION",
  "ORDER_FREQUENCY_DROP",
  "PAYMENT_DELAY",
  "PRICE_COMPLAINT",
  "QUALITY_COMPLAINT",
] as const;

export const churnSignalTypeEnum = pgEnum("churn_signal_type_enum", [...churnSignalTypes]);

const detectionMethods = ["RULE_BASED", "ML_MODEL"] as const;
export const detectionMethodEnum = pgEnum("detection_method_enum", [...detectionMethods]);

// ---------------------------------------------------------------------------
// TABEL 5: gold_churn_signals
// Semnale individuale de churn detectate per client
// ---------------------------------------------------------------------------

export const goldChurnSignals = goldSchema.table(
  "gold_churn_signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    signalType: churnSignalTypeEnum("signal_type").notNull(),
    strength: integer("strength").notNull().default(50),
    detectionMethod: detectionMethodEnum("detection_method").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("chk_churn_signal_strength", sql`${t.strength} BETWEEN 0 AND 100`),
    check(
      "chk_churn_signal_type",
      sql`${t.signalType} IN (${sql.raw(sqlInList(churnSignalTypes))})`,
    ),
    index("idx_gold_churn_signals_tenant_lead_active").on(t.tenantId, t.leadId, t.isActive),
    index("idx_gold_churn_signals_tenant_type").on(t.tenantId, t.signalType),
  ],
);

// ---------------------------------------------------------------------------
// TABEL 6: gold_churn_factors
// Scor agregat churn per client — UNIQUE(tenant_id, lead_id)
// ---------------------------------------------------------------------------

export const goldChurnFactors = goldSchema.table(
  "gold_churn_factors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    overallChurnScore: integer("overall_churn_score").notNull().default(0),
    riskLevel: churnRiskLevelEnum("risk_level").notNull().default("LOW"),
    factorBreakdown: jsonb("factor_breakdown").notNull().default({}),
    activeSignalCount: integer("active_signal_count").notNull().default(0),
    lastCalculatedAt: timestamp("last_calculated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_gold_churn_factors_tenant_lead").on(t.tenantId, t.leadId),
    check("chk_churn_overall_score", sql`${t.overallChurnScore} BETWEEN 0 AND 100`),
    index("idx_gold_churn_factors_tenant_risk").on(t.tenantId, t.riskLevel),
  ],
);

// ---------------------------------------------------------------------------
// TABEL 7: gold_sentiment_analysis
// Analiză sentiment mesaje cu AI (model specialist claude-sonnet)
// churnSignalStrength = min(100, indicators.length × 25) — formula EXACTĂ din plan
// ---------------------------------------------------------------------------

export const goldSentimentAnalysis = goldSchema.table(
  "gold_sentiment_analysis",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    messageId: text("message_id").notNull(),
    modelName: text("model_name").notNull().default("claude-sonnet-4-20250514"),
    sentimentScore: numeric("sentiment_score", { precision: 4, scale: 3 }).notNull(),
    emotions: jsonb("emotions").notNull().default({}),
    mentionedCompetitors: jsonb("mentioned_competitors").notNull().default([]),
    churnIndicators: jsonb("churn_indicators").notNull().default([]),
    churnSignalStrength: integer("churn_signal_strength").notNull().default(0),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("chk_sentiment_score", sql`${t.sentimentScore} BETWEEN -1 AND 1`),
    check("chk_sentiment_churn_signal_strength", sql`${t.churnSignalStrength} BETWEEN 0 AND 100`),
    index("idx_gold_sentiment_analysis_tenant_lead").on(t.tenantId, t.leadId),
    index("idx_gold_sentiment_analysis_analyzed_at").on(t.analyzedAt),
  ],
);
