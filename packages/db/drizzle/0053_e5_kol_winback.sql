-- ============================================================================
-- 0053_e5_kol_winback.sql — Faza 9a (E5): KOL Profiles, Winback Campaigns
-- Schema: gold
-- Tabele: gold_kol_profiles, gold_winback_campaigns
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ENUM-uri
-- ---------------------------------------------------------------------------

CREATE TYPE kol_tier_enum AS ENUM (
  'EMERGING',
  'ESTABLISHED',
  'ELITE'
);
--> statement-breakpoint

CREATE TYPE winback_campaign_type_enum AS ENUM (
  'PERSONAL_CALL',
  'DISCOUNT',
  'PRODUCT_UPDATE'
);
--> statement-breakpoint

CREATE TYPE winback_campaign_status_enum AS ENUM (
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED'
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TABEL 16: gold_kol_profiles
-- Profiluri Key Opinion Leader cu metrici rețea (PageRank, centralitate)
-- UNIQUE(tenant_id, client_id)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_kol_profiles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id               UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  kol_tier                kol_tier_enum NOT NULL DEFAULT 'EMERGING',
  overall_kol_score       NUMERIC(6,2) NOT NULL DEFAULT 0,
  network_centrality      NUMERIC(6,4) NOT NULL DEFAULT 0,
  degree_centrality       INTEGER NOT NULL DEFAULT 0,
  betweenness_centrality  NUMERIC(8,6) NOT NULL DEFAULT 0,
  eigenvector_centrality  NUMERIC(8,6) NOT NULL DEFAULT 0,
  page_rank               NUMERIC(8,6) NOT NULL DEFAULT 0,
  direct_connections      INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_gold_kol_profiles_tenant_client UNIQUE (tenant_id, client_id)
);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_kol_profiles_tenant_tier
  ON gold.gold_kol_profiles (tenant_id, kol_tier);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TABEL 17: gold_winback_campaigns
-- Campanii reactivare clienți churned cu pași configurabili
-- Exemplu steps: [{day:0, action:'INITIAL_EMAIL'}, {day:3, action:'WA'}, ...]
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_winback_campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  campaign_type     winback_campaign_type_enum NOT NULL,
  strategy          JSONB NOT NULL DEFAULT '{}',
  offer_value       NUMERIC(10,2),
  offer_valid_until TIMESTAMPTZ,
  status            winback_campaign_status_enum NOT NULL DEFAULT 'DRAFT',
  requires_hitl     BOOLEAN NOT NULL DEFAULT false,
  steps             JSONB NOT NULL DEFAULT '[]',
  current_step      INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_winback_campaigns_tenant_status
  ON gold.gold_winback_campaigns (tenant_id, status);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_winback_campaigns_tenant_client
  ON gold.gold_winback_campaigns (tenant_id, client_id);
