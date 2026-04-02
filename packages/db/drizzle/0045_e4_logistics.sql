-- ============================================================================
-- 0045_e4_logistics.sql — Faza 8a (E4): Adrese, Livrări AWB, Tracking, COD
-- Schema: gold
-- Tabele: gold_addresses, gold_shipments, gold_shipment_tracking, gold_cod_collections
-- Depinde de: 0043_e4_orders.sql, 0044_e4_credit.sql
--
-- *** IMPORTANT ***
-- La finalul acestui fișier se rezolvă dependențele circulare:
--   ALTER TABLE gold.gold_orders ADD CONSTRAINT fk_orders_credit_approval
--     FOREIGN KEY (credit_approval_id) REFERENCES gold.gold_credit_reservations(id);
--   ALTER TABLE gold.gold_orders ADD CONSTRAINT fk_orders_shipment
--     FOREIGN KEY (shipment_id) REFERENCES gold.gold_shipments(id);
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ENUM-uri
-- ---------------------------------------------------------------------------

CREATE TYPE carrier AS ENUM (
  'SAMEDAY',
  'FAN_COURIER',
  'CARGUS',
  'DPD',
  'GLS'
);
--> statement-breakpoint

CREATE TYPE shipment_status AS ENUM (
  'CREATED',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERY_FAILED',
  'RETURNED'
);
--> statement-breakpoint

CREATE TYPE delivery_type AS ENUM (
  'STANDARD',
  'EXPRESS',
  'LOCKER'
);
--> statement-breakpoint

CREATE TYPE cod_type AS ENUM (
  'NONE',
  'CASH',
  'CARD'
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- gold_addresses
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_addresses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id     UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  street        VARCHAR(255),
  city          VARCHAR(100) NOT NULL,
  county        VARCHAR(100),
  postal_code   VARCHAR(20),
  country       VARCHAR(2) NOT NULL DEFAULT 'RO',
  contact_name  VARCHAR(255),
  contact_phone VARCHAR(32),
  is_default    BOOLEAN NOT NULL DEFAULT false,
  latitude      NUMERIC(10,7),
  longitude     NUMERIC(10,7),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_gold_addresses_coords CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  )
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- gold_shipments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_shipments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id             UUID NOT NULL REFERENCES gold.gold_orders(id) ON DELETE RESTRICT,
  awb_number           VARCHAR(100),
  carrier              carrier NOT NULL,
  status               shipment_status NOT NULL DEFAULT 'CREATED',
  delivery_type        delivery_type NOT NULL DEFAULT 'STANDARD',
  cod_type             cod_type NOT NULL DEFAULT 'NONE',
  cod_amount           NUMERIC(10,2) NOT NULL DEFAULT 0,
  cod_collected        BOOLEAN NOT NULL DEFAULT false,
  sameday_parcel_id    VARCHAR(100),
  tracking_url         VARCHAR(500),
  label_pdf_url        VARCHAR(500),
  estimated_delivery   TIMESTAMPTZ,
  actual_delivery      TIMESTAMPTZ,
  weight               NUMERIC(8,2),
  address_id           UUID REFERENCES gold.gold_addresses(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_gold_shipments_cod_amount CHECK (cod_amount >= 0),
  CONSTRAINT chk_gold_shipments_weight     CHECK (weight IS NULL OR weight > 0)
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- gold_shipment_tracking
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_shipment_tracking (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id     UUID NOT NULL REFERENCES gold.gold_shipments(id) ON DELETE CASCADE,
  status_code     VARCHAR(50),
  status_text     VARCHAR(255),
  location_city   VARCHAR(100),
  location_county VARCHAR(100),
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- gold_cod_collections
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.gold_cod_collections (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id            UUID NOT NULL REFERENCES gold.gold_shipments(id) ON DELETE CASCADE,
  amount                 NUMERIC(10,2) NOT NULL,
  collected_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  transferred_to_account BOOLEAN NOT NULL DEFAULT false,
  transfer_date          TIMESTAMPTZ,
  CONSTRAINT chk_gold_cod_amount CHECK (amount > 0)
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- INDECȘI
-- ---------------------------------------------------------------------------

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_addresses_tenant_client
  ON gold.gold_addresses (tenant_id, client_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_shipments_tenant_status
  ON gold.gold_shipments (tenant_id, status);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_shipments_awb
  ON gold.gold_shipments (awb_number);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_shipments_order
  ON gold.gold_shipments (order_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_shipment_tracking_shipment_ts
  ON gold.gold_shipment_tracking (shipment_id, event_timestamp DESC);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_cod_collections_shipment
  ON gold.gold_cod_collections (shipment_id);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- TRIGGERE updated_at
-- ---------------------------------------------------------------------------

CREATE TRIGGER gold_addresses_updated_at
  BEFORE UPDATE ON gold.gold_addresses
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
--> statement-breakpoint

CREATE TRIGGER gold_shipments_updated_at
  BEFORE UPDATE ON gold.gold_shipments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
--> statement-breakpoint

-- ============================================================================
-- REZOLVARE DEPENDENȚE CIRCULARE
-- La acest punct, gold_credit_reservations (0044) și gold_shipments (0045)
-- sunt create. Se adaugă FK-urile deferred pe gold_orders.
-- ============================================================================

ALTER TABLE gold.gold_orders
  ADD CONSTRAINT fk_gold_orders_credit_approval
  FOREIGN KEY (credit_approval_id)
  REFERENCES gold.gold_credit_reservations(id)
  ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE gold.gold_orders
  ADD CONSTRAINT fk_gold_orders_shipment
  FOREIGN KEY (shipment_id)
  REFERENCES gold.gold_shipments(id)
  ON DELETE SET NULL;
