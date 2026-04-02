/**
 * gold-e5-clusters.ts — Schema E5: Clustere, Asociații, OUAI, Afilieri (Plan §X FAZA 9a)
 * Tabele: gold_clusters, gold_cluster_members, gold_associations, gold_affiliations, gold_ouai_registry
 * Migrare: 0052_e5_clusters.sql
 * NOTĂ PostGIS:
 *   - GEOGRAPHY(POINT, 4326)  → geographyPoint  (coordonate punct)
 *   - GEOMETRY(POLYGON, 4326) → geometryPolygon  (poligoane teritoriu)
 *   Anti-halucin. (A): GEOGRAPHY pentru puncte, GEOMETRY pentru poligoane — NU inversate.
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
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { goldSchema, goldCompanies } from "./gold.js";
import { geographyPoint, geometryPolygon } from "./postgis.js";

function sqlInList(values: readonly string[]): string {
  return values.map((v) => "'" + v + "'").join(",");
}

// ---------------------------------------------------------------------------
// ENUM-URI E5 Clustere & Asociații
// ---------------------------------------------------------------------------

const clusterDetectionMethods = ["LEIDEN", "MANUAL"] as const;
export const clusterDetectionMethodEnum = pgEnum("cluster_detection_method_enum", [
  ...clusterDetectionMethods,
]);

const clusterMembershipTypes = ["CORE", "PERIPHERAL"] as const;
export const clusterMembershipTypeEnum = pgEnum("cluster_membership_type_enum", [
  ...clusterMembershipTypes,
]);

const associationTypes = ["OUAI", "COOPERATIVE", "PRODUCER_GROUP", "OTHER"] as const;
export const associationTypeEnum = pgEnum("association_type_enum", [...associationTypes]);

const associationSources = ["MADR", "ONRC", "MANUAL"] as const;
export const associationSourceEnum = pgEnum("association_source_enum", [...associationSources]);

const affiliationEvidenceSources = ["PUBLIC_REGISTER", "SELF_DECLARED", "INFERRED"] as const;
export const affiliationEvidenceEnum = pgEnum("affiliation_evidence_enum", [
  ...affiliationEvidenceSources,
]);

// ---------------------------------------------------------------------------
// TABEL 11: gold_clusters
// Clustere de clienți (Leiden algorithm / manual)
// GEOMETRY(POLYGON, 4326) pentru territoryPolygon, GEOGRAPHY(POINT, 4326) pentru centerPoint
// ---------------------------------------------------------------------------

export const goldClusters = goldSchema.table(
  "gold_clusters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    detectionMethod: clusterDetectionMethodEnum("detection_method").notNull(),
    modularityScore: numeric("modularity_score", { precision: 6, scale: 4 }).notNull().default("0"),
    cohesionScore: numeric("cohesion_score", { precision: 6, scale: 4 }).notNull().default("0"),
    kolClientId: uuid("kol_client_id").references(() => goldCompanies.id, {
      onDelete: "set null",
    }),
    territoryPolygon: geometryPolygon("territory_polygon"),
    centerPoint: geographyPoint("center_point"),
    radiusKm: numeric("radius_km", { precision: 8, scale: 2 }),
    memberCount: integer("member_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "chk_cluster_detection_method",
      sql`${t.detectionMethod} IN (${sql.raw(sqlInList(clusterDetectionMethods))})`,
    ),
    index("idx_gold_clusters_tenant").on(t.tenantId),
    index("idx_gold_clusters_territory").using("gist", t.territoryPolygon),
    index("idx_gold_clusters_center").using("gist", t.centerPoint),
  ],
);

// ---------------------------------------------------------------------------
// TABEL 12: gold_cluster_members
// Membri cluster cu tip membership și centralitate
// ---------------------------------------------------------------------------

export const goldClusterMembers = goldSchema.table(
  "gold_cluster_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clusterId: uuid("cluster_id")
      .notNull()
      .references(() => goldClusters.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    membershipType: clusterMembershipTypeEnum("membership_type").notNull().default("PERIPHERAL"),
    centralityScore: numeric("centrality_score", { precision: 6, scale: 4 }).notNull().default("0"),
    isKol: boolean("is_kol").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_gold_cluster_members_cluster").on(t.clusterId),
    index("idx_gold_cluster_members_client").on(t.clientId),
  ],
);

// ---------------------------------------------------------------------------
// TABEL 13: gold_associations
// Asociații agricole (OUAI, cooperative, grupuri producători)
// GEOMETRY(POLYGON, 4326) pentru coveragePolygon
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
    county: text("county").notNull(),
    declaredAreaHa: numeric("declared_area_ha", { precision: 10, scale: 2 }),
    coveragePolygon: geometryPolygon("coverage_polygon"),
    source: associationSourceEnum("source").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "chk_association_type",
      sql`${t.associationType} IN (${sql.raw(sqlInList(associationTypes))})`,
    ),
    index("idx_gold_associations_tenant_type").on(t.tenantId, t.associationType),
    index("idx_gold_associations_coverage").using("gist", t.coveragePolygon),
  ],
);

// ---------------------------------------------------------------------------
// TABEL 14: gold_affiliations
// Afilieri client-asociație cu sursă de evidență
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
    evidenceSource: affiliationEvidenceEnum("evidence_source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_gold_affiliations_client").on(t.clientId),
    index("idx_gold_affiliations_association").on(t.associationId),
  ],
);

// ---------------------------------------------------------------------------
// TABEL 15: gold_ouai_registry
// Registru OUAI (Organizații Utilizatori Apă pentru Irigații)
// ---------------------------------------------------------------------------

export const goldOuaiRegistry = goldSchema.table(
  "gold_ouai_registry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ouaiName: text("ouai_name").notNull(),
    county: text("county").notNull(),
    netAreaHa: numeric("net_area_ha", { precision: 10, scale: 2 }).notNull(),
    hydroameliorationName: text("hydroamelioration_name"),
    registryYear: integer("registry_year").notNull(),
    cui: text("cui"),
    memberCount: integer("member_count"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_gold_ouai_registry_name").on(t.ouaiName),
    index("idx_gold_ouai_registry_county").on(t.county),
  ],
);
