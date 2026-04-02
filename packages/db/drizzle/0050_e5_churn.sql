-- ============================================================================
-- 0050_e5_churn.sql — Faza 9a (E5): Semnale Churn, Factori, Sentiment Analysis
-- Schema: gold
-- Tabele: gold_churn_signals, gold_churn_factors, gold_sentiment_analysis
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ENUM-uri
-- ---------------------------------------------------------------------------

CREATE TYPE churn_signal_type_enum AS ENUM (
  'COMMUNICATION_FADE',
  'NEGATIVE_SENTIMENT',
  'COMPETITOR_MENTION',
  'SUPPORT_ESCALATION',
  'ORDER_FREQUENCY_DROP',
  'PAYMENT_DELAY',
  'PRICE_COMPLAINT',
  'QUALITY_COMPLAINT'
);
--> statement-breakpoint

CREATE TYPE detection_method_enum AS ENUM (
  'RULE_BASED',
  'ML_MODEL'
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TABEL 5: gold_churn_signals
-- Semnale individuale de churn detectate per client
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_churn_signals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id           UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  signal_type       churn_signal_type_enum NOT NULL,
  strength          INTEGER NOT NULL DEFAULT 50,
  detection_method  detection_method_enum NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  detected_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_churn_signal_strength CHECK (strength BETWEEN 0 AND 100)
);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_churn_signals_tenant_lead_active
  ON gold.gold_churn_signals (tenant_id, lead_id, is_active);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_churn_signals_tenant_type
  ON gold.gold_churn_signals (tenant_id, signal_type);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TABEL 6: gold_churn_factors
-- Scor agregat churn per client — UNIQUE(tenant_id, lead_id)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_churn_factors (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id              UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  overall_churn_score  INTEGER NOT NULL DEFAULT 0,
  risk_level           churn_risk_level_enum NOT NULL DEFAULT 'LOW',
  factor_breakdown     JSONB NOT NULL DEFAULT '{}',
  active_signal_count  INTEGER NOT NULL DEFAULT 0,
  last_calculated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_churn_overall_score CHECK (overall_churn_score BETWEEN 0 AND 100),
  CONSTRAINT uq_gold_churn_factors_tenant_lead UNIQUE (tenant_id, lead_id)
);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_churn_factors_tenant_risk
  ON gold.gold_churn_factors (tenant_id, risk_level);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TABEL 7: gold_sentiment_analysis
-- Analiză sentiment mesaje AI (model specialist claude-sonnet)
-- churnSignalStrength = min(100, indicators.length × 25) — formula EXACTĂ din plan
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_sentiment_analysis (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id                UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  message_id             TEXT NOT NULL,
  model_name             TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  sentiment_score        NUMERIC(4,3) NOT NULL,
  emotions               JSONB NOT NULL DEFAULT '{}',
  mentioned_competitors  JSONB NOT NULL DEFAULT '[]',
  churn_indicators       JSONB NOT NULL DEFAULT '[]',
  churn_signal_strength  INTEGER NOT NULL DEFAULT 0,
  analyzed_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_sentiment_score           CHECK (sentiment_score BETWEEN -1 AND 1),
  CONSTRAINT chk_sentiment_signal_strength CHECK (churn_signal_strength BETWEEN 0 AND 100)
);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_sentiment_analysis_tenant_lead
  ON gold.gold_sentiment_analysis (tenant_id, lead_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_sentiment_analysis_analyzed_at
  ON gold.gold_sentiment_analysis (analyzed_at DESC);
