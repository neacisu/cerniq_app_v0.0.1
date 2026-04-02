-- ============================================================================
-- 0052_e5_clusters.sql — Faza 9a (E5): Clustere, Asociații, Afilieri, OUAI
-- Schema: gold
-- Tabele: gold_clusters, gold_cluster_members, gold_associations,
--         gold_affiliations, gold_ouai_registry
-- NOTĂ PostGIS:
--   - GEOMETRY(POLYGON,4326)  pentru territoryPolygon, coveragePolygon
--   - GEOGRAPHY(POINT,4326)   pentru centerPoint
--   Anti-halucin. (A): NU inversate!
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ENUM-uri
-- ---------------------------------------------------------------------------

CREATE TYPE cluster_detection_method_enum AS ENUM (
  'LEIDEN',
  'MANUAL'
);
--> statement-breakpoint

CREATE TYPE cluster_membership_type_enum AS ENUM (
  'CORE',
  'PERIPHERAL'
);
--> statement-breakpoint

CREATE TYPE association_type_enum AS ENUM (
  'OUAI',
  'COOPERATIVE',
  'PRODUCER_GROUP',
  'OTHER'
);
--> statement-breakpoint

CREATE TYPE association_source_enum AS ENUM (
  'MADR',
  'ONRC',
  'MANUAL'
);
--> statement-breakpoint

CREATE TYPE affiliation_evidence_enum AS ENUM (
  'PUBLIC_REGISTER',
  'SELF_DECLARED',
  'INFERRED'
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TABEL 11: gold_clusters
-- Clustere de clienți detectate prin algoritmul Leiden sau manual
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_clusters (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  detection_method  cluster_detection_method_enum NOT NULL,
  modularity_score  NUMERIC(6,4) NOT NULL DEFAULT 0,
  cohesion_score    NUMERIC(6,4) NOT NULL DEFAULT 0,
  kol_client_id     UUID REFERENCES gold.gold_companies(id) ON DELETE SET NULL,
  territory_polygon geometry(POLYGON,4326),
  center_point      geography(POINT,4326),
  radius_km         NUMERIC(8,2),
  member_count      INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_clusters_tenant
  ON gold.gold_clusters (tenant_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_gold_clusters_territory
  ON gold.gold_clusters USING GIST (territory_polygon);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_gold_clusters_center
  ON gold.gold_clusters USING GIST (center_point);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TABEL 12: gold_cluster_members
-- Membri cluster cu tip membership și metrici de centralitate
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_cluster_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id       UUID NOT NULL REFERENCES gold.gold_clusters(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  membership_type  cluster_membership_type_enum NOT NULL DEFAULT 'PERIPHERAL',
  centrality_score NUMERIC(6,4) NOT NULL DEFAULT 0,
  is_kol           BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_cluster_members_cluster
  ON gold.gold_cluster_members (cluster_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_cluster_members_client
  ON gold.gold_cluster_members (client_id);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TABEL 13: gold_associations
-- Asociații agricole (OUAI, cooperative, grupuri producători)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_associations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  association_type  association_type_enum NOT NULL,
  cui               TEXT,
  county            TEXT NOT NULL,
  declared_area_ha  NUMERIC(10,2),
  coverage_polygon  geometry(POLYGON,4326),
  source            association_source_enum NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_associations_tenant_type
  ON gold.gold_associations (tenant_id, association_type);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_gold_associations_coverage
  ON gold.gold_associations USING GIST (coverage_polygon);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TABEL 14: gold_affiliations
-- Afilieri client-asociație cu sursă de evidență
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_affiliations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  association_id    UUID NOT NULL REFERENCES gold.gold_associations(id) ON DELETE CASCADE,
  is_current        BOOLEAN NOT NULL DEFAULT true,
  evidence_source   affiliation_evidence_enum NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_affiliations_client
  ON gold.gold_affiliations (client_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_affiliations_association
  ON gold.gold_affiliations (association_id);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TABEL 15: gold_ouai_registry
-- Registru national OUAI (Organizații Utilizatori Apă pentru Irigații)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_ouai_registry (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ouai_name                TEXT NOT NULL,
  county                   TEXT NOT NULL,
  net_area_ha              NUMERIC(10,2) NOT NULL,
  hydroamelioration_name   TEXT,
  registry_year            INTEGER NOT NULL,
  cui                      TEXT,
  member_count             INTEGER,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_ouai_registry_name
  ON gold.gold_ouai_registry (ouai_name);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_ouai_registry_county
  ON gold.gold_ouai_registry (county);
