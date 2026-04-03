/**
 * gold-e5-associations.ts — Schema E5: OUAI Registry + MADR Associations + Affiliations (FAZA 9g)
 * Tabele:
 *   - gold_ouai_registry   — registru global OUAI (fără tenantId)
 *   - gold_associations    — asociații per tenant (OUAI/COOPERATIVE/PRODUCER_GROUP/OTHER)
 *   - gold_affiliations    — afilieri client ↔ asociație (via goldCompanies)
 * Migrare: 0056_e5_associations.sql
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
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
// ENUM-URI FAZA 9g
// ---------------------------------------------------------------------------

const associationTypes = ["OUAI", "COOPERATIVE", "PRODUCER_GROUP", "OTHER"] as const;
export const associationTypeEnum = pgEnum("association_type_enum", [...associationTypes]);

const associationSources = ["MADR", "ONRC", "MANUAL"] as const;
export const associationSourceEnum = pgEnum("association_source_enum", [...associationSources]);

const evidenceSources = ["PUBLIC_REGISTER", "SELF_DECLARED", "INFERRED"] as const;
export const evidenceSourceEnum = pgEnum("evidence_source_enum", [...evidenceSources]);

// ---------------------------------------------------------------------------
// TABEL 1: gold_ouai_registry
// Registru global OUAI (Organizații Utilizatori de Apă pentru Irigații) — fără tenantId
// ---------------------------------------------------------------------------

export const goldOuaiRegistry = goldSchema.table(
  "gold_ouai_registry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ouaiName: text("ouai_name").notNull(),
    county: text("county").notNull(),
    netAreaHa: numeric("net_area_ha", { precision: 10, scale: 2 }),
    hydroameliorationName: text("hydroamelioration_name"),
    registryYear: integer("registry_year"),
    cui: text("cui"),
    memberCount: integer("member_count"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_gold_ouai_registry_county").on(t.county),
    index("idx_gold_ouai_registry_cui").on(t.cui),
  ],
);

// ---------------------------------------------------------------------------
// TABEL 2: gold_associations
// Asociații per tenant (OUAI, Cooperative, Grupuri de Producători, Other)
// ---------------------------------------------------------------------------

export const goldAssociations = goldSchema.table(
  "gold_associations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    associationType: associationTypeEnum("association_type").notNull(),
    cui: text("cui"),
    county: text("county"),
    declaredAreaHa: numeric("declared_area_ha", { precision: 10, scale: 2 }),
    coveragePolygon: text("coverage_polygon"),
    source: associationSourceEnum("source").notNull().default("MADR"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "chk_association_type",
      sql`${t.associationType} IN (${sql.raw(sqlInList(associationTypes))})`,
    ),
    check(
      "chk_association_source",
      sql`${t.source} IN (${sql.raw(sqlInList(associationSources))})`,
    ),
    index("idx_gold_associations_tenant").on(t.tenantId),
    index("idx_gold_associations_tenant_county").on(t.tenantId, t.county),
    index("idx_gold_associations_tenant_cui").on(t.tenantId, t.cui),
    index("idx_gold_associations_tenant_active").on(t.tenantId, t.isActive),
  ],
);

// ---------------------------------------------------------------------------
// TABEL 3: gold_affiliations
// Afilieri client ↔ asociație — accesate via JOIN cu goldAssociations pentru tenantId
// ---------------------------------------------------------------------------

export const goldAffiliations = goldSchema.table(
  "gold_affiliations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    associationId: uuid("association_id")
      .notNull()
      .references(() => goldAssociations.id, { onDelete: "cascade" }),
    isCurrent: boolean("is_current").notNull().default(true),
    evidenceSource: evidenceSourceEnum("evidence_source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "chk_affiliation_evidence",
      sql`${t.evidenceSource} IN (${sql.raw(sqlInList(evidenceSources))})`,
    ),
    unique("uq_gold_affiliation_client_association").on(t.clientId, t.associationId),
    index("idx_gold_affiliations_client").on(t.clientId),
    index("idx_gold_affiliations_association").on(t.associationId),
    index("idx_gold_affiliations_current").on(t.associationId, t.isCurrent),
  ],
);
