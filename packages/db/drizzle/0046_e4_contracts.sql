-- ============================================================================
-- 0046_e4_contracts.sql — Faza 8a (E4): Contracte, Template-uri, Clauze, Audit Log
-- Schema: gold
-- Tabele: gold_contracts, gold_contract_templates, gold_contract_clauses,
--         gold_audit_logs_etapa4 (PARTIȚIONAT by month, ADR-0095)
-- Depinde de: 0043_e4_orders.sql, 0044_e4_credit.sql (risk_tier enum)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ENUM-uri
-- ---------------------------------------------------------------------------

CREATE TYPE contract_status AS ENUM (
  'DRAFT',
  'PENDING_SIGNATURE',
  'SENT_DOCUSIGN',
  'SIGNED',
  'EXPIRED',
  'CANCELLED'
);
--> statement-breakpoint

CREATE TYPE actor_type AS ENUM (
  'SYSTEM',
  'USER',
  'WORKER',
  'CRON'
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- gold_contracts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_contracts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id           UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE RESTRICT,
  order_id            UUID REFERENCES gold.gold_orders(id) ON DELETE SET NULL,
  risk_tier           risk_tier NOT NULL DEFAULT 'MEDIUM',
  status              contract_status NOT NULL DEFAULT 'DRAFT',
  docusign_envelope_id VARCHAR(255),
  docusign_status     VARCHAR(100),
  pdf_url             VARCHAR(500),
  signed_pdf_url      VARCHAR(500),
  clauses_used        JSONB NOT NULL DEFAULT '[]',
  valid_for_days      INTEGER NOT NULL DEFAULT 30,
  expires_at          TIMESTAMPTZ,
  signed_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_gold_contracts_valid_days CHECK (valid_for_days > 0)
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- gold_contract_templates
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_contract_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name                  VARCHAR(255) NOT NULL,
  version               INTEGER NOT NULL DEFAULT 1,
  template_docx_url     VARCHAR(500),
  applicable_risk_tiers JSONB NOT NULL DEFAULT '[]',
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_gold_contract_template_version CHECK (version > 0)
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- gold_contract_clauses
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_contract_clauses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  VARCHAR(50) NOT NULL,
  content               TEXT NOT NULL,
  is_mandatory          BOOLEAN NOT NULL DEFAULT false,
  applicable_risk_tiers JSONB NOT NULL DEFAULT '[]',
  category              VARCHAR(100),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_gold_contract_clauses_code UNIQUE (code)
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- gold_audit_logs_etapa4 — PARTIȚIONAT BY RANGE (created_at)
--
-- PK composite (id, created_at) — cerință PostgreSQL pentru tabele partiționate
-- cu UNIQUE/PK pe coloane non-partitionare.
-- Hash chain SHA-256: prev_hash = sha256(id||eventType||entityId||createdAt||prevHash)
-- ADR-0095: partitionare lunară, 3 partiții inițiale (martie 2026 + 2 luni viitoare)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_audit_logs_etapa4 (
  id          UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type  VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id   UUID NOT NULL,
  actor_id    UUID,
  actor_type  actor_type NOT NULL DEFAULT 'SYSTEM',
  old_values  JSONB,
  new_values  JSONB,
  prev_hash   VARCHAR(64),
  ip_address  VARCHAR(45),
  user_agent  VARCHAR(500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Partiții inițiale: luna curentă (2026-03) + 2 luni viitoare
-- Se creează noi partiții lunar via cron job / scheduled migration
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_audit_logs_etapa4_2026_03
  PARTITION OF gold.gold_audit_logs_etapa4
  FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.gold_audit_logs_etapa4_2026_04
  PARTITION OF gold.gold_audit_logs_etapa4
  FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.gold_audit_logs_etapa4_2026_05
  PARTITION OF gold.gold_audit_logs_etapa4
  FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- INDECȘI (creați pe tabelul parent — PostgreSQL le propagă pe partiții)
-- ---------------------------------------------------------------------------

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_contracts_tenant_status
  ON gold.gold_contracts (tenant_id, status);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_contracts_docusign
  ON gold.gold_contracts (docusign_envelope_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_contracts_client
  ON gold.gold_contracts (client_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_contract_templates_tenant_active
  ON gold.gold_contract_templates (tenant_id, is_active);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_gold_audit_e4_tenant_entity
  ON gold.gold_audit_logs_etapa4 (tenant_id, entity_type, entity_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_gold_audit_e4_tenant_event
  ON gold.gold_audit_logs_etapa4 (tenant_id, event_type);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_gold_audit_e4_created
  ON gold.gold_audit_logs_etapa4 (created_at DESC);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TRIGGERE updated_at
-- ---------------------------------------------------------------------------

CREATE TRIGGER gold_contracts_updated_at
  BEFORE UPDATE ON gold.gold_contracts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
--> statement-breakpoint

CREATE TRIGGER gold_contract_templates_updated_at
  BEFORE UPDATE ON gold.gold_contract_templates
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
--> statement-breakpoint

CREATE TRIGGER gold_contract_clauses_updated_at
  BEFORE UPDATE ON gold.gold_contract_clauses
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
