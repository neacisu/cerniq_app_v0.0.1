/**
 * gold-e4-credit.ts — Schema E4: Profile Credit, Scoruri Istorice, Rezervări Credit
 *
 * riskTierEnum este exportat și reutilizat în gold-e4-contracts.ts
 * (planul E4 §XIV: același enum pentru credit și contracte).
 */
import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  numeric,
  pgEnum,
  timestamp,
  unique,
  uuid,
  varchar,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { goldSchema, goldCompanies } from "./gold.js";
import { goldOrders } from "./gold-e4-orders.js";

// ---------------------------------------------------------------------------
// ENUM-URI E4 Credit
// ---------------------------------------------------------------------------

export const riskTierEnum = pgEnum("risk_tier", ["BLOCKED", "LOW", "MEDIUM", "HIGH", "PREMIUM"]);

export const creditReservationStatusEnum = pgEnum("credit_reservation_status", [
  "ACTIVE",
  "USED",
  "RELEASED",
  "EXPIRED",
]);

// ---------------------------------------------------------------------------
// gold_credit_profiles
// ---------------------------------------------------------------------------

export const goldCreditProfiles = goldSchema.table(
  "gold_credit_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    creditScore: integer("credit_score").notNull().default(50),
    riskTier: riskTierEnum("risk_tier").notNull().default("MEDIUM"),
    creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }).notNull().default("0"),
    creditUsed: numeric("credit_used", { precision: 12, scale: 2 }).notNull().default("0"),
    /**
     * Componente scor: {anafStatus:15, financialHealth:30, bpiStatus:20,
     *                    paymentHistory:25, litigation:10}
     * Suma ponderilor = 100
     */
    scoreComponents: jsonb("score_components").notNull().default({}),
    bpiStatus: varchar("bpi_status", { length: 100 }),
    autoRefreshEnabled: boolean("auto_refresh_enabled").notNull().default(true),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_gold_credit_profiles_tenant_client").on(t.tenantId, t.clientId),
    index("idx_gold_credit_profiles_tenant_risk").on(t.tenantId, t.riskTier),
    check("chk_gold_credit_score_range", sql`${t.creditScore} BETWEEN 0 AND 100`),
    check("chk_gold_credit_limit", sql`${t.creditLimit} >= 0`),
    check("chk_gold_credit_used", sql`${t.creditUsed} >= 0`),
    check("chk_gold_credit_used_lte_limit", sql`${t.creditUsed} <= ${t.creditLimit}`),
  ],
);

// ---------------------------------------------------------------------------
// gold_credit_scores (historical log)
// ---------------------------------------------------------------------------

export const goldCreditScores = goldSchema.table(
  "gold_credit_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => goldCreditProfiles.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    riskTier: riskTierEnum("risk_tier").notNull(),
    scoreComponents: jsonb("score_components").notNull().default({}),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
    source: varchar("source", { length: 100 }),
  },
  (t) => [
    index("idx_gold_credit_scores_profile_date").on(t.profileId, t.calculatedAt),
    check("chk_gold_credit_scores_range", sql`${t.score} BETWEEN 0 AND 100`),
  ],
);

// ---------------------------------------------------------------------------
// gold_credit_reservations
// ---------------------------------------------------------------------------

export const goldCreditReservations = goldSchema.table(
  "gold_credit_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => goldCreditProfiles.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => goldOrders.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: creditReservationStatusEnum("status").notNull().default("ACTIVE"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_gold_credit_reservations_profile_status").on(t.profileId, t.status),
    index("idx_gold_credit_reservations_order").on(t.orderId),
    check("chk_gold_credit_reservation_amount", sql`${t.amount} > 0`),
  ],
);
