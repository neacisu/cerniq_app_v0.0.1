/**
 * gold-e5-kol-winback.ts — Schema E5: KOL Profiles, Winback Campaigns (Plan §X FAZA 9a)
 * Tabele: gold_kol_profiles, gold_winback_campaigns
 * Migrare: 0053_e5_kol_winback.sql
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
// ENUM-URI E5 KOL & Winback
// ---------------------------------------------------------------------------

const kolTiers = ["EMERGING", "ESTABLISHED", "ELITE"] as const;
export const kolTierEnum = pgEnum("kol_tier_enum", [...kolTiers]);

const winbackCampaignTypes = ["PERSONAL_CALL", "DISCOUNT", "PRODUCT_UPDATE"] as const;
export const winbackCampaignTypeEnum = pgEnum("winback_campaign_type_enum", [
  ...winbackCampaignTypes,
]);

const winbackCampaignStatuses = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"] as const;
export const winbackCampaignStatusEnum = pgEnum("winback_campaign_status_enum", [
  ...winbackCampaignStatuses,
]);

// ---------------------------------------------------------------------------
// TABEL 16: gold_kol_profiles
// Profiluri Key Opinion Leader (KOL) cu metrici de rețea (PageRank, centralitate)
// UNIQUE(tenant_id, client_id)
// ---------------------------------------------------------------------------

export const goldKolProfiles = goldSchema.table(
  "gold_kol_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    kolTier: kolTierEnum("kol_tier").notNull().default("EMERGING"),
    overallKolScore: numeric("overall_kol_score", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
    networkCentrality: numeric("network_centrality", { precision: 6, scale: 4 })
      .notNull()
      .default("0"),
    degreeCentrality: integer("degree_centrality").notNull().default(0),
    betweennessCentrality: numeric("betweenness_centrality", {
      precision: 8,
      scale: 6,
    })
      .notNull()
      .default("0"),
    eigenvectorCentrality: numeric("eigenvector_centrality", {
      precision: 8,
      scale: 6,
    })
      .notNull()
      .default("0"),
    pageRank: numeric("page_rank", { precision: 8, scale: 6 }).notNull().default("0"),
    directConnections: integer("direct_connections").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_gold_kol_profiles_tenant_client").on(t.tenantId, t.clientId),
    check("chk_kol_tier", sql`${t.kolTier} IN (${sql.raw(sqlInList(kolTiers))})`),
    index("idx_gold_kol_profiles_tenant_tier").on(t.tenantId, t.kolTier),
  ],
);

// ---------------------------------------------------------------------------
// TABEL 17: gold_winback_campaigns
// Campanii de reactivare clienți churned — pași configurabili
// ---------------------------------------------------------------------------

export const goldWinbackCampaigns = goldSchema.table(
  "gold_winback_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    campaignType: winbackCampaignTypeEnum("campaign_type").notNull(),
    strategy: jsonb("strategy").notNull().default({}),
    offerValue: numeric("offer_value", { precision: 10, scale: 2 }),
    offerValidUntil: timestamp("offer_valid_until", { withTimezone: true }),
    status: winbackCampaignStatusEnum("status").notNull().default("DRAFT"),
    requiresHitl: boolean("requires_hitl").notNull().default(false),
    steps: jsonb("steps").notNull().default([]),
    currentStep: integer("current_step").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "chk_winback_campaign_type",
      sql`${t.campaignType} IN (${sql.raw(sqlInList(winbackCampaignTypes))})`,
    ),
    check(
      "chk_winback_status",
      sql`${t.status} IN (${sql.raw(sqlInList(winbackCampaignStatuses))})`,
    ),
    index("idx_gold_winback_campaigns_tenant_status").on(t.tenantId, t.status),
    index("idx_gold_winback_campaigns_tenant_client").on(t.tenantId, t.clientId),
  ],
);
