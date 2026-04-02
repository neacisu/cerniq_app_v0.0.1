-- ============================================================================
-- 0044_e4_credit.sql — Faza 8a (E4): Profile Credit, Scoruri, Rezervări
-- Schema: gold
-- Tabele: gold_credit_profiles, gold_credit_scores, gold_credit_reservations
-- Depinde de: 0043_e4_orders.sql (gold_orders FK target)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ENUM-uri
-- ---------------------------------------------------------------------------

CREATE TYPE risk_tier AS ENUM (
  'BLOCKED',
  'LOW',
  'MEDIUM',
  'HIGH',
  'PREMIUM'
);
--> statement-breakpoint

CREATE TYPE credit_reservation_status AS ENUM (
  'ACTIVE',
  'USED',
  'RELEASED',
  'EXPIRED'
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- gold_credit_profiles
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_credit_profiles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id            UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  credit_score         INTEGER NOT NULL DEFAULT 50,
  risk_tier            risk_tier NOT NULL DEFAULT 'MEDIUM',
  credit_limit         NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit_used          NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- scoreComponents: {anafStatus:15, financialHealth:30, bpiStatus:20, paymentHistory:25, litigation:10}
  score_components     JSONB NOT NULL DEFAULT '{}',
  bpi_status           VARCHAR(100),
  auto_refresh_enabled BOOLEAN NOT NULL DEFAULT true,
  next_review_at       TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_gold_credit_profiles_tenant_client UNIQUE (tenant_id, client_id),
  CONSTRAINT chk_gold_credit_score_range   CHECK (credit_score BETWEEN 0 AND 100),
  CONSTRAINT chk_gold_credit_limit         CHECK (credit_limit >= 0),
  CONSTRAINT chk_gold_credit_used          CHECK (credit_used >= 0),
  CONSTRAINT chk_gold_credit_used_lte_limit CHECK (credit_used <= credit_limit)
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- gold_credit_scores (log istoric)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_credit_scores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID NOT NULL REFERENCES gold.gold_credit_profiles(id) ON DELETE CASCADE,
  score            INTEGER NOT NULL,
  risk_tier        risk_tier NOT NULL,
  score_components JSONB NOT NULL DEFAULT '{}',
  calculated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  source           VARCHAR(100),
  CONSTRAINT chk_gold_credit_scores_range CHECK (score BETWEEN 0 AND 100)
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- gold_credit_reservations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_credit_reservations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES gold.gold_credit_profiles(id) ON DELETE CASCADE,
  order_id    UUID NOT NULL REFERENCES gold.gold_orders(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL,
  status      credit_reservation_status NOT NULL DEFAULT 'ACTIVE',
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_gold_credit_reservation_amount CHECK (amount > 0)
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- INDECȘI
-- ---------------------------------------------------------------------------

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_credit_profiles_tenant_risk
  ON gold.gold_credit_profiles (tenant_id, risk_tier);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_credit_scores_profile_date
  ON gold.gold_credit_scores (profile_id, calculated_at DESC);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_credit_reservations_profile_status
  ON gold.gold_credit_reservations (profile_id, status);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_credit_reservations_order
  ON gold.gold_credit_reservations (order_id);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TRIGGERE updated_at
-- ---------------------------------------------------------------------------

CREATE TRIGGER gold_credit_profiles_updated_at
  BEFORE UPDATE ON gold.gold_credit_profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
--> statement-breakpoint

CREATE TRIGGER gold_credit_reservations_updated_at
  BEFORE UPDATE ON gold.gold_credit_reservations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
