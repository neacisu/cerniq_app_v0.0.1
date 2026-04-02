-- ============================================================================
-- 0043_e4_orders.sql — Faza 8a (E4): Comenzi, Plăți, Reconcilieri, Rambursuri, Webhooks Revolut
-- Schema: gold
-- Tabele: gold_orders, gold_order_items, gold_payments,
--         gold_payment_reconciliations, gold_refunds, revolut_webhooks_raw
-- NOTĂ: gold_orders.credit_approval_id și .shipment_id sunt FK-uri deferred
--       adăugate cu ALTER TABLE în 0045_e4_logistics.sql
--       (dependențe circulare: gold_orders ↔ gold_credit_reservations, ↔ gold_shipments)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ENUM-uri (public schema, consistent cu pattern existent)
-- ---------------------------------------------------------------------------

CREATE TYPE order_status AS ENUM (
  'DRAFT',
  'CONFIRMED',
  'PROFORMA_SENT',
  'PROFORMA_PAID',
  'CREDIT_APPROVED',
  'CREDIT_PENDING',
  'CREDIT_REJECTED',
  'STOCK_RESERVED',
  'IN_PRODUCTION',
  'READY_TO_SHIP',
  'SHIPPED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERY_FAILED',
  'RETURNED',
  'RETURN_PROCESSING',
  'INVOICED',
  'PAID',
  'PARTIALLY_PAID',
  'OVERDUE',
  'CANCELLED',
  'COMPLETED'
);
--> statement-breakpoint

CREATE TYPE payment_method AS ENUM (
  'BANK_TRANSFER',
  'REVOLUT',
  'CARD',
  'COD',
  'CREDIT'
);
--> statement-breakpoint

CREATE TYPE payment_source AS ENUM (
  'REVOLUT',
  'BANK_TRANSFER',
  'CARD',
  'COD',
  'MANUAL'
);
--> statement-breakpoint

CREATE TYPE reconciliation_status AS ENUM (
  'PENDING',
  'MATCHED_EXACT',
  'MATCHED_FUZZY',
  'UNMATCHED',
  'MANUAL_MATCHED',
  'DISPUTED'
);
--> statement-breakpoint

CREATE TYPE refund_status AS ENUM (
  'REQUESTED',
  'APPROVED',
  'PROCESSING',
  'COMPLETED',
  'REJECTED'
);
--> statement-breakpoint

CREATE TYPE match_type AS ENUM (
  'EXACT_REFERENCE',
  'FUZZY_NAME_AMOUNT',
  'MANUAL',
  'AUTO_PARTIAL'
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- gold_orders
-- FK pentru credit_approval_id și shipment_id adăugate în 0045_e4_logistics.sql
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id             UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE RESTRICT,
  order_number        VARCHAR(50) NOT NULL,
  status              order_status NOT NULL DEFAULT 'DRAFT',
  payment_method      payment_method,
  total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid         NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_due          NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit_approval_id  UUID,
  shipment_id         UUID,
  currency            VARCHAR(3) NOT NULL DEFAULT 'RON',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,
  CONSTRAINT uq_gold_orders_tenant_number UNIQUE (tenant_id, order_number),
  CONSTRAINT chk_gold_orders_amounts CHECK (
    total_amount >= 0 AND amount_paid >= 0 AND amount_due >= 0
  )
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- gold_order_items
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES gold.gold_orders(id) ON DELETE CASCADE,
  product_id       UUID REFERENCES gold.gold_products(id) ON DELETE SET NULL,
  product_name     VARCHAR(255) NOT NULL,
  sku              VARCHAR(100),
  quantity         INTEGER NOT NULL,
  unit_price       NUMERIC(10,2) NOT NULL,
  total_price      NUMERIC(12,2) NOT NULL,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  stock_reserved   BOOLEAN NOT NULL DEFAULT false,
  stock_deducted   BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT chk_gold_order_items_qty CHECK (quantity > 0),
  CONSTRAINT chk_gold_order_items_discount CHECK (discount_percent BETWEEN 0 AND 100)
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- gold_payments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id              UUID REFERENCES gold.gold_orders(id) ON DELETE SET NULL,
  external_id           VARCHAR(255),
  external_source       payment_source NOT NULL,
  amount                NUMERIC(12,2) NOT NULL,
  currency              VARCHAR(3) NOT NULL DEFAULT 'RON',
  reconciliation_status reconciliation_status NOT NULL DEFAULT 'PENDING',
  counterparty_name     VARCHAR(255),
  counterparty_iban     VARCHAR(34),
  reference             VARCHAR(500),
  received_at           TIMESTAMPTZ,
  processed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_gold_payments_external_id UNIQUE (external_id),
  CONSTRAINT chk_gold_payments_amount CHECK (amount > 0)
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- gold_payment_reconciliations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_payment_reconciliations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id  UUID NOT NULL REFERENCES gold.gold_payments(id) ON DELETE CASCADE,
  order_id    UUID NOT NULL REFERENCES gold.gold_orders(id) ON DELETE CASCADE,
  match_type  match_type NOT NULL,
  confidence  NUMERIC(5,4),
  matched_by  VARCHAR(100),
  matched_at  TIMESTAMPTZ,
  CONSTRAINT chk_gold_reconciliation_confidence
    CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1)
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- gold_refunds
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_refunds (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  payment_id       UUID NOT NULL REFERENCES gold.gold_payments(id) ON DELETE RESTRICT,
  order_id         UUID NOT NULL REFERENCES gold.gold_orders(id) ON DELETE RESTRICT,
  status           refund_status NOT NULL DEFAULT 'REQUESTED',
  amount           NUMERIC(12,2) NOT NULL,
  reason           TEXT,
  revolut_refund_id VARCHAR(255),
  requested_by     UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_gold_refunds_amount CHECK (amount > 0)
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- revolut_webhooks_raw
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.revolut_webhooks_raw (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type       VARCHAR(100) NOT NULL,
  payload          JSONB NOT NULL,
  signature        VARCHAR(500),
  verified         BOOLEAN NOT NULL DEFAULT false,
  idempotency_key  VARCHAR(255) NOT NULL,
  processed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_revolut_webhooks_idempotency UNIQUE (idempotency_key)
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- INDECȘI — CREATE INDEX CONCURRENTLY (zero-downtime)
-- ---------------------------------------------------------------------------

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_orders_tenant_status
  ON gold.gold_orders (tenant_id, status);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_orders_tenant_lead
  ON gold.gold_orders (tenant_id, lead_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_orders_number
  ON gold.gold_orders (order_number);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_orders_soft_delete
  ON gold.gold_orders (deleted_at)
  WHERE deleted_at IS NOT NULL;
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_order_items_order
  ON gold.gold_order_items (order_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_payments_tenant_status
  ON gold.gold_payments (tenant_id, reconciliation_status);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_payments_order
  ON gold.gold_payments (order_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_payment_reconciliations_payment
  ON gold.gold_payment_reconciliations (payment_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_refunds_tenant_status
  ON gold.gold_refunds (tenant_id, status);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_refunds_order
  ON gold.gold_refunds (order_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_revolut_webhooks_tenant_event
  ON gold.revolut_webhooks_raw (tenant_id, event_type);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TRIGGERE updated_at (reutilizează funcția din 0004_updated_at_triggers.sql)
-- ---------------------------------------------------------------------------

CREATE TRIGGER gold_orders_updated_at
  BEFORE UPDATE ON gold.gold_orders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
--> statement-breakpoint

CREATE TRIGGER gold_payments_updated_at
  BEFORE UPDATE ON gold.gold_payments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
--> statement-breakpoint

CREATE TRIGGER gold_refunds_updated_at
  BEFORE UPDATE ON gold.gold_refunds
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
