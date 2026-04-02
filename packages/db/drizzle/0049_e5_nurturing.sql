-- ============================================================================
-- 0049_e5_nurturing.sql — Faza 9a (E5): Nurturing FSM, Acțiuni, Content Drips, NPS
-- Schema: gold
-- Tabele: gold_nurturing_state, gold_nurturing_actions, gold_content_drips, gold_nps_surveys
-- NOTĂ: CREATE EXTENSION IF NOT EXISTS postgis — safe idempotent (deja activ din E1)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- ENUM-uri (public schema, consistent cu pattern existent)
-- ---------------------------------------------------------------------------

CREATE TYPE nurturing_state_enum AS ENUM (
  'ONBOARDING',
  'NURTURING_ACTIVE',
  'AT_RISK',
  'CHURNED',
  'REACTIVATED',
  'LOYAL_CLIENT',
  'ADVOCATE'
);
--> statement-breakpoint

CREATE TYPE churn_risk_level_enum AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);
--> statement-breakpoint

CREATE TYPE satisfaction_trend_enum AS ENUM (
  'IMPROVING',
  'STABLE',
  'DECLINING'
);
--> statement-breakpoint

CREATE TYPE e5_action_channel_enum AS ENUM (
  'EMAIL',
  'WHATSAPP',
  'SMS',
  'PHONE',
  'IN_APP'
);
--> statement-breakpoint

CREATE TYPE action_status_enum AS ENUM (
  'PENDING',
  'SENT',
  'DELIVERED',
  'FAILED',
  'SKIPPED'
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TABEL 1: gold_nurturing_state
-- FSM per client per tenant — UNIQUE(tenant_id, lead_id)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_nurturing_state (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id                UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  current_state          nurturing_state_enum NOT NULL DEFAULT 'ONBOARDING',
  churn_risk_score       INTEGER NOT NULL DEFAULT 0,
  churn_risk_level       churn_risk_level_enum NOT NULL DEFAULT 'LOW',
  total_orders           INTEGER NOT NULL DEFAULT 0,
  total_revenue          NUMERIC(14,2) NOT NULL DEFAULT 0,
  days_since_last_order  INTEGER,
  nps_score              INTEGER,
  satisfaction_trend     satisfaction_trend_enum,
  successful_referrals   INTEGER NOT NULL DEFAULT 0,
  neighbor_count         INTEGER NOT NULL DEFAULT 0,
  is_advocate            BOOLEAN NOT NULL DEFAULT false,
  is_kol                 BOOLEAN NOT NULL DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  last_interaction_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_nurturing_churn_risk_score CHECK (churn_risk_score BETWEEN 0 AND 100),
  CONSTRAINT chk_nurturing_nps_score        CHECK (nps_score IS NULL OR nps_score BETWEEN 0 AND 10),
  CONSTRAINT uq_gold_nurturing_state_tenant_lead UNIQUE (tenant_id, lead_id)
);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_nurturing_state_tenant_state
  ON gold.gold_nurturing_state (tenant_id, current_state);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_nurturing_state_tenant_risk
  ON gold.gold_nurturing_state (tenant_id, churn_risk_level);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_nurturing_state_lead
  ON gold.gold_nurturing_state (lead_id);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TABEL 2: gold_nurturing_actions
-- Acțiuni executate per client
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_nurturing_actions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nurturing_state_id  UUID NOT NULL REFERENCES gold.gold_nurturing_state(id) ON DELETE CASCADE,
  action_type         TEXT NOT NULL,
  channel             e5_action_channel_enum NOT NULL,
  status              action_status_enum NOT NULL DEFAULT 'PENDING',
  template_id         TEXT,
  executed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_nurturing_actions_tenant_type
  ON gold.gold_nurturing_actions (tenant_id, action_type);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_nurturing_actions_state
  ON gold.gold_nurturing_actions (nurturing_state_id);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TABEL 3: gold_content_drips
-- Configurații drip campaign
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_content_drips (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  target_states       JSONB NOT NULL DEFAULT '[]',
  days_after_trigger  INTEGER NOT NULL DEFAULT 0,
  channel             e5_action_channel_enum NOT NULL,
  template_id         TEXT NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_content_drips_tenant_active
  ON gold.gold_content_drips (tenant_id, is_active);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TABEL 4: gold_nps_surveys
-- NPS surveys cu cooldown 90 zile per client
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_nps_surveys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id         UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  score           INTEGER,
  comment         TEXT,
  sent_via        e5_action_channel_enum NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at    TIMESTAMPTZ,
  cooldown_until  TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_nps_score CHECK (score IS NULL OR score BETWEEN 0 AND 10)
);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_nps_surveys_tenant_lead
  ON gold.gold_nps_surveys (tenant_id, lead_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_nps_surveys_sent_at
  ON gold.gold_nps_surveys (sent_at DESC);
