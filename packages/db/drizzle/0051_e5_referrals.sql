-- ============================================================================
-- 0051_e5_referrals.sql — Faza 9a (E5): Referrals, Relații Entități, Scoruri Proximitate
-- Schema: gold
-- Tabele: gold_referrals, gold_entity_relationships, gold_proximity_scores
-- NOTĂ PostGIS: gold_proximity_scores → GEOGRAPHY(POINT,4326) — NU GEOMETRY
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ENUM-uri
-- ---------------------------------------------------------------------------

CREATE TYPE referral_type_enum AS ENUM (
  'EXPLICIT',
  'SOFT_MENTION',
  'NEIGHBOR_STRATEGY',
  'GROUP_DEAL'
);
--> statement-breakpoint

CREATE TYPE referral_status_enum AS ENUM (
  'PENDING_CONSENT',
  'ACTIVE',
  'CONVERTED',
  'EXPIRED',
  'DECLINED'
);
--> statement-breakpoint

CREATE TYPE entity_relation_type_enum AS ENUM (
  'NEIGHBOR',
  'SAME_ASSOCIATION',
  'SHARED_SHAREHOLDER',
  'RECOMMENDED_BY',
  'BEHAVIORAL_CLUSTER'
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TABEL 8: gold_referrals
-- Referrals cu consimțământ GDPR explicit
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_referrals (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  referrer_id              UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  referred_id              UUID REFERENCES gold.gold_companies(id) ON DELETE SET NULL,
  referral_type            referral_type_enum NOT NULL,
  status                   referral_status_enum NOT NULL DEFAULT 'PENDING_CONSENT',
  consent_given            BOOLEAN NOT NULL DEFAULT false,
  consent_given_at         TIMESTAMPTZ,
  consent_proof_message_id TEXT,
  reward_type              TEXT,
  reward_value             NUMERIC(10,2),
  reward_issued_at         TIMESTAMPTZ,
  expires_at               TIMESTAMPTZ NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_referrals_tenant_referrer
  ON gold.gold_referrals (tenant_id, referrer_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_referrals_tenant_status
  ON gold.gold_referrals (tenant_id, status);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TABEL 9: gold_entity_relationships
-- Relații între entități (vecini, asociații, acționari comuni, etc.)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_entity_relationships (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_a_id      UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  entity_b_id      UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  relation_type    entity_relation_type_enum NOT NULL,
  distance_meters  NUMERIC(10,1),
  bidirectional    BOOLEAN NOT NULL DEFAULT false,
  confidence       NUMERIC(5,4) NOT NULL,
  source           TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_entity_confidence CHECK (confidence BETWEEN 0 AND 1)
);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_entity_rel_tenant_a
  ON gold.gold_entity_relationships (tenant_id, entity_a_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_entity_rel_tenant_b
  ON gold.gold_entity_relationships (tenant_id, entity_b_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_entity_rel_tenant_type
  ON gold.gold_entity_relationships (tenant_id, relation_type);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TABEL 10: gold_proximity_scores
-- Scoruri de proximitate geografică
-- GEOGRAPHY(POINT,4326) — NU GEOMETRY — Anti-halucin. (A) din plan
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_proximity_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  anchor_id         UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  prospect_id       UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  anchor_location   geography(POINT,4326) NOT NULL,
  prospect_location geography(POINT,4326) NOT NULL,
  distance_meters   NUMERIC(10,1) NOT NULL,
  proximity_score   NUMERIC(5,4) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_proximity_score CHECK (proximity_score BETWEEN 0 AND 1)
);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_proximity_scores_tenant_anchor
  ON gold.gold_proximity_scores (tenant_id, anchor_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_gold_proximity_anchor_location
  ON gold.gold_proximity_scores USING GIST (anchor_location);
