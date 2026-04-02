/**
 * gold-e5-referrals.ts — Schema E5: Referrals, Relații Entități, Scoruri Proximitate (Plan §X FAZA 9a)
 * Tabele: gold_referrals, gold_entity_relationships, gold_proximity_scores
 * Migrare: 0051_e5_referrals.sql
 * NOTĂ PostGIS: gold_proximity_scores folosește GEOGRAPHY(POINT, 4326) — geographyPoint din postgis.ts
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
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { goldSchema, goldCompanies } from "./gold.js";
import { geographyPoint } from "./postgis.js";

function sqlInList(values: readonly string[]): string {
  return values.map((v) => "'" + v + "'").join(",");
}

// ---------------------------------------------------------------------------
// ENUM-URI E5 Referrals & Relații
// ---------------------------------------------------------------------------

const referralTypes = ["EXPLICIT", "SOFT_MENTION", "NEIGHBOR_STRATEGY", "GROUP_DEAL"] as const;

export const referralTypeEnum = pgEnum("referral_type_enum", [...referralTypes]);

const referralStatuses = ["PENDING_CONSENT", "ACTIVE", "CONVERTED", "EXPIRED", "DECLINED"] as const;

export const referralStatusEnum = pgEnum("referral_status_enum", [...referralStatuses]);

const entityRelationTypes = [
  "NEIGHBOR",
  "SAME_ASSOCIATION",
  "SHARED_SHAREHOLDER",
  "RECOMMENDED_BY",
  "BEHAVIORAL_CLUSTER",
] as const;

export const entityRelationTypeEnum = pgEnum("entity_relation_type_enum", [...entityRelationTypes]);

// ---------------------------------------------------------------------------
// TABEL 8: gold_referrals
// Referrals explicite sau soft mentions cu consimțământ GDPR
// ---------------------------------------------------------------------------

export const goldReferrals = goldSchema.table(
  "gold_referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    referrerId: uuid("referrer_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    referredId: uuid("referred_id").references(() => goldCompanies.id, {
      onDelete: "set null",
    }),
    referralType: referralTypeEnum("referral_type").notNull(),
    status: referralStatusEnum("status").notNull().default("PENDING_CONSENT"),
    consentGiven: boolean("consent_given").notNull().default(false),
    consentGivenAt: timestamp("consent_given_at", { withTimezone: true }),
    consentProofMessageId: text("consent_proof_message_id"),
    rewardType: text("reward_type"),
    rewardValue: numeric("reward_value", { precision: 10, scale: 2 }),
    rewardIssuedAt: timestamp("reward_issued_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("chk_referral_type", sql`${t.referralType} IN (${sql.raw(sqlInList(referralTypes))})`),
    check("chk_referral_status", sql`${t.status} IN (${sql.raw(sqlInList(referralStatuses))})`),
    index("idx_gold_referrals_tenant_referrer").on(t.tenantId, t.referrerId),
    index("idx_gold_referrals_tenant_status").on(t.tenantId, t.status),
  ],
);

// ---------------------------------------------------------------------------
// TABEL 9: gold_entity_relationships
// Relații între entități (vecini, asociații, acționari comuni, etc.)
// ---------------------------------------------------------------------------

export const goldEntityRelationships = goldSchema.table(
  "gold_entity_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    entityAId: uuid("entity_a_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    entityBId: uuid("entity_b_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    relationType: entityRelationTypeEnum("relation_type").notNull(),
    distanceMeters: numeric("distance_meters", { precision: 10, scale: 1 }),
    bidirectional: boolean("bidirectional").notNull().default(false),
    confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull(),
    source: text("source").notNull(),
    // FAZA 9d: metadata pentru zone catchment, context relație
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "chk_entity_relation_type",
      sql`${t.relationType} IN (${sql.raw(sqlInList(entityRelationTypes))})`,
    ),
    check("chk_entity_confidence", sql`${t.confidence} BETWEEN 0 AND 1`),
    index("idx_gold_entity_rel_tenant_a").on(t.tenantId, t.entityAId),
    index("idx_gold_entity_rel_tenant_b").on(t.tenantId, t.entityBId),
    index("idx_gold_entity_rel_tenant_type").on(t.tenantId, t.relationType),
  ],
);

// ---------------------------------------------------------------------------
// TABEL 10: gold_proximity_scores
// Scoruri de proximitate geografică (PostGIS GEOGRAPHY POINT)
// GEOGRAPHY(POINT, 4326) — NU GEOMETRY — conform plan §X Anti-halucin. (A)
// ---------------------------------------------------------------------------

export const goldProximityScores = goldSchema.table(
  "gold_proximity_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    anchorId: uuid("anchor_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    prospectId: uuid("prospect_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    anchorLocation: geographyPoint("anchor_location"),
    prospectLocation: geographyPoint("prospect_location"),
    distanceMeters: numeric("distance_meters", { precision: 10, scale: 1 }).notNull(),
    proximityScore: numeric("proximity_score", { precision: 5, scale: 4 }).notNull(),
    // FAZA 9d: decompoziție scor (Plan §X L2282-2284)
    distanceScore: numeric("distance_score", { precision: 6, scale: 4 }),
    anchorQuality: numeric("anchor_quality", { precision: 6, scale: 4 }).notNull().default("0"),
    sharedBonus: numeric("shared_bonus", { precision: 6, scale: 4 }).notNull().default("0"),
    radiusMeters: integer("radius_meters").notNull().default(50000),
    sameCounty: boolean("same_county").notNull().default(false),
    sameCrop: boolean("same_crop").notNull().default(false),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("chk_proximity_score", sql`${t.proximityScore} BETWEEN 0 AND 1`),
    index("idx_gold_proximity_scores_tenant_anchor").on(t.tenantId, t.anchorId),
    index("idx_gold_proximity_anchor_location").using("gist", t.anchorLocation),
  ],
);
