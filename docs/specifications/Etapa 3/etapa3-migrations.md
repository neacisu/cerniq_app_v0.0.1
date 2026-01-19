# Migrări Bază de Date - Etapa 3
## Cerniq.app - AI Sales Agent Neuro-Simbolic

**Versiune:** 1.0  
**Data:** Ianuarie 2026  
**Autor:** Cerniq Development Team  
**ORM:** Drizzle v0.40.0  
**Bază de Date:** PostgreSQL 18.1  

---

## Cuprins

1. [Viziune Generală](#1-viziune-generală)
2. [Strategia de Migrare](#2-strategia-de-migrare)
3. [Migrări Products](#3-migrări-products)
4. [Migrări Negotiations](#4-migrări-negotiations)
5. [Migrări Fiscal](#5-migrări-fiscal)
6. [Migrări AI & MCP](#6-migrări-ai--mcp)
7. [Script de Deployment](#7-script-de-deployment)
8. [Rollback Procedures](#8-rollback-procedures)

---

## 1. Viziune Generală

### 1.1 Obiective Migrări Etapa 3

Migrările Etapa 3 introduc:
- **16 tabele noi** pentru Products, Negotiations, Fiscal
- **12 enum types** pentru state machines și status-uri
- **15+ funcții SQL** pentru business logic
- **8 triggere** pentru automatizări
- **30+ indexuri** pentru performance

### 1.2 Dependențe

```
Etapa 0 (Core)
    │
    ├── tenants
    ├── users  
    └── settings
         │
         ▼
Etapa 1 (Data Enrichment)
    │
    ├── gold_contacts
    ├── gold_leads
    └── worker_logs
         │
         ▼
Etapa 2 (Cold Outreach)
    │
    ├── outreach_campaigns
    ├── outreach_sequences
    └── communication_logs
         │
         ▼
Etapa 3 (AI Sales) ◄── CURENT
    │
    ├── gold_products
    ├── gold_negotiations
    ├── oblio_documents
    └── ai_conversations
```

### 1.3 Convenții Naming Migrări

```
Format: YYYYMMDDHHMMSS_description.sql

Exemple:
- 20260201100000_etapa3_create_enums.sql
- 20260201100100_etapa3_products_tables.sql
- 20260201100200_etapa3_negotiations_tables.sql
- 20260201100300_etapa3_fiscal_tables.sql
- 20260201100400_etapa3_ai_tables.sql
- 20260201100500_etapa3_functions.sql
- 20260201100600_etapa3_triggers.sql
- 20260201100700_etapa3_indexes.sql
- 20260201100800_etapa3_rls_policies.sql
```

---

## 2. Strategia de Migrare

### 2.1 Ordinea Execuție

```sql
-- Faza 1: Extensions (dacă nu există)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Faza 2: Enums
-- Faza 3: Tabele (în ordine dependențe)
-- Faza 4: Funcții SQL
-- Faza 5: Triggere
-- Faza 6: Indexuri
-- Faza 7: RLS Policies
-- Faza 8: Seed Data (serii, categorii default)
```

### 2.2 Drizzle Configuration

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/*.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
  migrations: {
    prefix: 'timestamp',
    table: '__drizzle_migrations',
    schema: 'public',
  },
});
```

---

## 3. Migrări Products

### 3.1 Migration: Create Product Enums

```sql
-- Migration: 20260201100000_etapa3_create_enums.sql
-- Description: Create all enum types for Etapa 3

BEGIN;

-- =====================
-- PRODUCT ENUMS
-- =====================

DO $$ BEGIN
  CREATE TYPE product_status_enum AS ENUM (
    'DRAFT',
    'ACTIVE', 
    'DISCONTINUED',
    'OUT_OF_STOCK',
    'ARCHIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE product_unit_enum AS ENUM (
    'BUC',      -- Bucată
    'KG',       -- Kilogram
    'L',        -- Litru
    'M',        -- Metru
    'M2',       -- Metru pătrat
    'M3',       -- Metru cub
    'SET',      -- Set
    'PALET',    -- Palet
    'TONA'      -- Tonă
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE price_rule_type_enum AS ENUM (
    'CATEGORY_DEFAULT',
    'PRODUCT_SPECIFIC',
    'VOLUME_DISCOUNT',
    'SEASONAL',
    'PROMOTIONAL'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================
-- NEGOTIATION ENUMS
-- =====================

DO $$ BEGIN
  CREATE TYPE negotiation_state_enum AS ENUM (
    'DISCOVERY',
    'PROPOSAL',
    'NEGOTIATION',
    'CLOSING',
    'PROFORMA_SENT',
    'INVOICED',
    'PAID',
    'DEAD'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE negotiation_priority_enum AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reservation_status_enum AS ENUM (
    'ACTIVE',
    'CONVERTED',
    'EXPIRED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE guardrail_type_enum AS ENUM (
    'PRICE_BELOW_MINIMUM',
    'STOCK_UNAVAILABLE',
    'DISCOUNT_EXCEEDED',
    'SKU_NOT_FOUND',
    'FISCAL_DATA_INVALID',
    'COMPETITOR_MENTIONED',
    'HALLUCINATION_DETECTED',
    'STATE_VIOLATION'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================
-- FISCAL ENUMS
-- =====================

DO $$ BEGIN
  CREATE TYPE document_type_enum AS ENUM (
    'PROFORMA',
    'INVOICE',
    'NOTICE',
    'RECEIPT',
    'STORNO'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_status_enum AS ENUM (
    'DRAFT',
    'CREATED',
    'SENT_TO_CLIENT',
    'CONVERTED',
    'CANCELLED',
    'STORNO'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE einvoice_status_enum AS ENUM (
    'NOT_APPLICABLE',
    'PENDING',
    'SENDING',
    'SENT',
    'PROCESSING',
    'VALIDATED',
    'REJECTED',
    'ERROR'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE spv_action_enum AS ENUM (
    'UPLOAD',
    'CHECK_STATUS',
    'DOWNLOAD_XML',
    'STORNO'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_source_enum AS ENUM (
    'BANK_TRANSFER',
    'REVOLUT',
    'CARD',
    'CASH',
    'MANUAL'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reconciliation_status_enum AS ENUM (
    'PENDING',
    'MATCHED',
    'PARTIAL',
    'MANUAL',
    'RECONCILED',
    'DISPUTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_channel_enum AS ENUM (
    'EMAIL',
    'WHATSAPP',
    'SMS',
    'DOWNLOAD',
    'PRINT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_status_enum AS ENUM (
    'PENDING',
    'SENDING',
    'SENT',
    'DELIVERED',
    'READ',
    'BOUNCED',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE fiscal_event_type_enum AS ENUM (
    'DOCUMENT_CREATED',
    'DOCUMENT_SENT',
    'DOCUMENT_CONVERTED',
    'DOCUMENT_CANCELLED',
    'DOCUMENT_STORNO',
    'EINVOICE_SUBMITTED',
    'EINVOICE_VALIDATED',
    'EINVOICE_REJECTED',
    'PAYMENT_RECEIVED',
    'PAYMENT_RECONCILED',
    'STOCK_DEDUCTED',
    'SERIES_NUMBER_GENERATED',
    'PRICE_OVERRIDE',
    'DISCOUNT_APPLIED',
    'MANUAL_CORRECTION'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
```

### 3.2 Migration: Product Tables

```sql
-- Migration: 20260201100100_etapa3_products_tables.sql
-- Description: Create product-related tables

BEGIN;

-- =====================
-- GOLD_PRODUCT_CATEGORIES
-- =====================

CREATE TABLE IF NOT EXISTS gold_product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  parent_id UUID REFERENCES gold_product_categories(id) ON DELETE SET NULL,
  level INTEGER NOT NULL DEFAULT 0,
  path TEXT NOT NULL DEFAULT '',
  
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  
  default_vat_percent DECIMAL(4,2) NOT NULL DEFAULT 19.00,
  default_max_discount DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  product_count INTEGER NOT NULL DEFAULT 0,
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_category_slug UNIQUE (tenant_id, slug),
  CONSTRAINT valid_category_vat CHECK (default_vat_percent IN (0, 5, 9, 19)),
  CONSTRAINT valid_category_discount CHECK (default_max_discount BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_category_parent ON gold_product_categories(tenant_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_category_path ON gold_product_categories USING GIST (path gist_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_category_level ON gold_product_categories(tenant_id, level);

COMMENT ON TABLE gold_product_categories IS 'Categorii ierarhice de produse';

-- =====================
-- GOLD_PRODUCTS
-- =====================

CREATE TABLE IF NOT EXISTS gold_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  
  category_id UUID REFERENCES gold_product_categories(id) ON DELETE SET NULL,
  
  base_price DECIMAL(15,2) NOT NULL,
  min_price DECIMAL(15,2) NOT NULL,
  max_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  vat_percent DECIMAL(4,2) NOT NULL DEFAULT 19.00,
  
  unit product_unit_enum NOT NULL DEFAULT 'BUC',
  weight_kg DECIMAL(10,3),
  
  specifications JSONB DEFAULT '{}',
  crop_types TEXT[],
  application_methods TEXT[],
  active_ingredients TEXT[],
  
  brand VARCHAR(255),
  manufacturer VARCHAR(255),
  origin_country VARCHAR(2),
  certification_ids UUID[],
  
  status product_status_enum NOT NULL DEFAULT 'ACTIVE',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_new BOOLEAN NOT NULL DEFAULT FALSE,
  
  search_vector TSVECTOR,
  name_trigram TEXT,
  
  seo_title VARCHAR(255),
  seo_description VARCHAR(500),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  CONSTRAINT unique_product_sku UNIQUE (tenant_id, sku),
  CONSTRAINT price_positive CHECK (base_price > 0),
  CONSTRAINT min_price_valid CHECK (min_price > 0 AND min_price <= base_price),
  CONSTRAINT max_discount_valid CHECK (max_discount_percent BETWEEN 0 AND 100),
  CONSTRAINT valid_vat CHECK (vat_percent IN (0, 5, 9, 19))
);

CREATE INDEX IF NOT EXISTS idx_product_search ON gold_products USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_product_trigram ON gold_products USING GIN (name_trigram gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_product_tenant_category ON gold_products(tenant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_product_tenant_status ON gold_products(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_product_price_range ON gold_products(tenant_id, base_price);
CREATE INDEX IF NOT EXISTS idx_product_featured ON gold_products(tenant_id, is_featured) WHERE is_featured = TRUE;

COMMENT ON TABLE gold_products IS 'Catalog produse pentru vânzare cu prețuri și specificații';
COMMENT ON COLUMN gold_products.min_price IS 'Prețul minim acceptat (guardrail anti-hallucination)';
COMMENT ON COLUMN gold_products.search_vector IS 'Vector pentru full-text search BM25';

-- =====================
-- GOLD_PRODUCT_EMBEDDINGS
-- =====================

CREATE TABLE IF NOT EXISTS gold_product_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES gold_products(id) ON DELETE CASCADE,
  
  embedding vector(1536) NOT NULL,
  model_name VARCHAR(100) NOT NULL DEFAULT 'text-embedding-3-small',
  model_version VARCHAR(50),
  
  source_text_hash VARCHAR(64) NOT NULL,
  tokens_used INTEGER,
  
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_current_embedding UNIQUE (tenant_id, product_id) WHERE is_current = TRUE
);

CREATE INDEX IF NOT EXISTS idx_embedding_hnsw ON gold_product_embeddings 
  USING hnsw (embedding vector_cosine_ops) 
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_embedding_product ON gold_product_embeddings(product_id, is_current);

COMMENT ON TABLE gold_product_embeddings IS 'Embeddings vectoriale pentru semantic search';

-- =====================
-- GOLD_PRODUCT_CHUNKS
-- =====================

CREATE TABLE IF NOT EXISTS gold_product_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES gold_products(id) ON DELETE CASCADE,
  
  chunk_index INTEGER NOT NULL,
  chunk_type VARCHAR(50) NOT NULL DEFAULT 'description',
  
  content TEXT NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  
  embedding vector(1536),
  search_vector TSVECTOR,
  
  token_count INTEGER,
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_chunk UNIQUE (tenant_id, product_id, chunk_index, chunk_type)
);

CREATE INDEX IF NOT EXISTS idx_chunk_embedding ON gold_product_chunks 
  USING hnsw (embedding vector_cosine_ops) 
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_chunk_search ON gold_product_chunks USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_chunk_product ON gold_product_chunks(product_id);

COMMENT ON TABLE gold_product_chunks IS 'Chunk-uri text pentru RAG retrieval granular';

-- =====================
-- GOLD_PRODUCT_IMAGES
-- =====================

CREATE TABLE IF NOT EXISTS gold_product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES gold_products(id) ON DELETE CASCADE,
  
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text VARCHAR(500),
  
  width INTEGER,
  height INTEGER,
  file_size_bytes INTEGER,
  mime_type VARCHAR(50),
  
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  
  ai_description TEXT,
  ai_tags TEXT[],
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT one_primary_image UNIQUE (tenant_id, product_id) WHERE is_primary = TRUE
);

CREATE INDEX IF NOT EXISTS idx_image_product ON gold_product_images(product_id, sort_order);

COMMENT ON TABLE gold_product_images IS 'Imagini produse cu metadata AI';

-- =====================
-- PRICE_RULES
-- =====================

CREATE TABLE IF NOT EXISTS price_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  category_id UUID REFERENCES gold_product_categories(id) ON DELETE CASCADE,
  product_id UUID REFERENCES gold_products(id) ON DELETE CASCADE,
  
  rule_type price_rule_type_enum NOT NULL DEFAULT 'CATEGORY_DEFAULT',
  priority INTEGER NOT NULL DEFAULT 0,
  
  min_margin_percent DECIMAL(5,2),
  max_discount_percent DECIMAL(5,2),
  
  volume_tiers JSONB DEFAULT '[]',
  seasonal_multiplier DECIMAL(4,2) DEFAULT 1.00,
  
  valid_from DATE,
  valid_until DATE,
  
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  CONSTRAINT category_or_product CHECK (
    (category_id IS NOT NULL AND product_id IS NULL) OR
    (category_id IS NULL AND product_id IS NOT NULL) OR
    (category_id IS NULL AND product_id IS NULL AND rule_type = 'CATEGORY_DEFAULT')
  ),
  CONSTRAINT valid_margin CHECK (min_margin_percent IS NULL OR min_margin_percent BETWEEN 0 AND 100),
  CONSTRAINT valid_discount CHECK (max_discount_percent IS NULL OR max_discount_percent BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_rule_category ON price_rules(tenant_id, category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rule_product ON price_rules(tenant_id, product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rule_active ON price_rules(tenant_id, is_active, priority DESC);

COMMENT ON TABLE price_rules IS 'Reguli de preț per categorie sau produs specific';

COMMIT;
```

---

## 4. Migrări Negotiations

### 4.1 Migration: Negotiation Tables

```sql
-- Migration: 20260201100200_etapa3_negotiations_tables.sql
-- Description: Create negotiation and stock tables

BEGIN;

-- =====================
-- STOCK_INVENTORY
-- =====================

CREATE TABLE IF NOT EXISTS stock_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES gold_products(id) ON DELETE CASCADE,
  
  warehouse_id UUID, -- Pentru viitor multi-warehouse
  warehouse_name VARCHAR(100) DEFAULT 'Principal',
  
  total_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  reserved_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  available_quantity DECIMAL(15,3) GENERATED ALWAYS AS (total_quantity - reserved_quantity) STORED,
  
  low_stock_threshold DECIMAL(15,3) DEFAULT 10,
  reorder_quantity DECIMAL(15,3),
  
  incoming_quantity DECIMAL(15,3) DEFAULT 0,
  next_restock_date DATE,
  
  average_cost DECIMAL(15,4),
  last_cost DECIMAL(15,4),
  
  last_stock_check DATE,
  last_movement_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_product_warehouse UNIQUE (tenant_id, product_id, warehouse_id),
  CONSTRAINT positive_quantities CHECK (
    total_quantity >= 0 AND 
    reserved_quantity >= 0 AND 
    reserved_quantity <= total_quantity
  )
);

CREATE INDEX IF NOT EXISTS idx_inventory_product ON stock_inventory(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON stock_inventory(tenant_id)
  WHERE available_quantity <= low_stock_threshold;

COMMENT ON TABLE stock_inventory IS 'Stocuri în timp real per produs/depozit';
COMMENT ON COLUMN stock_inventory.available_quantity IS 'Cantitate disponibilă = total - rezervată';

-- =====================
-- GOLD_NEGOTIATIONS
-- =====================

CREATE TABLE IF NOT EXISTS gold_negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  lead_id UUID NOT NULL REFERENCES gold_leads(id),
  journey_id UUID, -- Link la customer journey
  
  current_state negotiation_state_enum NOT NULL DEFAULT 'DISCOVERY',
  previous_state negotiation_state_enum,
  state_changed_at TIMESTAMPTZ DEFAULT NOW(),
  
  assigned_phone_id UUID, -- WhatsApp number asignat
  assigned_user_id UUID REFERENCES users(id),
  
  client_name VARCHAR(255),
  client_cif VARCHAR(15),
  client_email VARCHAR(255),
  client_phone VARCHAR(20),
  client_address TEXT,
  
  total_value DECIMAL(15,2) DEFAULT 0,
  total_vat DECIMAL(15,2) DEFAULT 0,
  total_discount DECIMAL(15,2) DEFAULT 0,
  
  max_discount_offered DECIMAL(5,2) DEFAULT 0,
  discount_approved_by UUID REFERENCES users(id),
  discount_approval_level VARCHAR(20),
  
  ai_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  mcp_session_id VARCHAR(100),
  mcp_session_expires_at TIMESTAMPTZ,
  
  proforma_ref VARCHAR(50),
  invoice_ref VARCHAR(50),
  
  priority negotiation_priority_enum NOT NULL DEFAULT 'MEDIUM',
  expected_close_date DATE,
  actual_close_date DATE,
  
  requires_human_review BOOLEAN NOT NULL DEFAULT FALSE,
  human_review_reason TEXT,
  is_human_controlled BOOLEAN NOT NULL DEFAULT FALSE,
  handed_off_at TIMESTAMPTZ,
  handed_off_to UUID REFERENCES users(id),
  
  conversation_summary TEXT,
  internal_notes TEXT,
  tags TEXT[],
  
  source VARCHAR(50),
  utm_campaign VARCHAR(100),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_active_negotiation UNIQUE (tenant_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_negotiation_tenant_state ON gold_negotiations(tenant_id, current_state);
CREATE INDEX IF NOT EXISTS idx_negotiation_lead ON gold_negotiations(lead_id);
CREATE INDEX IF NOT EXISTS idx_negotiation_assigned ON gold_negotiations(tenant_id, assigned_user_id) 
  WHERE assigned_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_negotiation_pending ON gold_negotiations(tenant_id, current_state, created_at DESC)
  WHERE current_state NOT IN ('PAID', 'DEAD');
CREATE INDEX IF NOT EXISTS idx_negotiation_priority ON gold_negotiations(tenant_id, priority DESC, created_at DESC);

COMMENT ON TABLE gold_negotiations IS 'Negocieri active cu state machine';
COMMENT ON COLUMN gold_negotiations.mcp_session_id IS 'Session ID pentru MCP context persistence';

-- =====================
-- NEGOTIATION_STATE_HISTORY
-- =====================

CREATE TABLE IF NOT EXISTS negotiation_state_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  negotiation_id UUID NOT NULL REFERENCES gold_negotiations(id) ON DELETE CASCADE,
  
  from_state negotiation_state_enum,
  to_state negotiation_state_enum NOT NULL,
  
  transition_reason TEXT,
  transition_trigger VARCHAR(50),
  
  triggered_by_type VARCHAR(20) NOT NULL,
  triggered_by_id UUID,
  
  context_snapshot JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_state_history_negotiation ON negotiation_state_history(negotiation_id, created_at DESC);

COMMENT ON TABLE negotiation_state_history IS 'Audit trail pentru tranziții FSM';

-- =====================
-- NEGOTIATION_ITEMS
-- =====================

CREATE TABLE IF NOT EXISTS negotiation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  negotiation_id UUID NOT NULL REFERENCES gold_negotiations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES gold_products(id),
  
  quantity DECIMAL(15,3) NOT NULL,
  unit product_unit_enum NOT NULL DEFAULT 'BUC',
  
  list_price DECIMAL(15,2) NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  
  line_total DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  
  vat_percent DECIMAL(4,2) NOT NULL DEFAULT 19.00,
  line_vat DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price * vat_percent / 100) STORED,
  
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  
  reservation_id UUID,
  reserved_at TIMESTAMPTZ,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT positive_item_values CHECK (
    quantity > 0 AND
    list_price > 0 AND
    unit_price > 0 AND
    discount_percent BETWEEN 0 AND 100
  )
);

CREATE INDEX IF NOT EXISTS idx_item_negotiation ON negotiation_items(negotiation_id);
CREATE INDEX IF NOT EXISTS idx_item_product ON negotiation_items(product_id);

COMMENT ON TABLE negotiation_items IS 'Produse în coșul de negociere';

-- =====================
-- STOCK_RESERVATIONS
-- =====================

CREATE TABLE IF NOT EXISTS stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  product_id UUID NOT NULL REFERENCES gold_products(id),
  inventory_id UUID NOT NULL REFERENCES stock_inventory(id),
  
  quantity DECIMAL(15,3) NOT NULL,
  
  negotiation_id UUID NOT NULL REFERENCES gold_negotiations(id) ON DELETE CASCADE,
  negotiation_item_id UUID REFERENCES negotiation_items(id),
  negotiation_state negotiation_state_enum NOT NULL,
  
  expires_at TIMESTAMPTZ NOT NULL,
  status reservation_status_enum NOT NULL DEFAULT 'ACTIVE',
  
  converted_to_order_id UUID,
  converted_at TIMESTAMPTZ,
  
  cancelled_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT positive_reservation CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_reservation_product ON stock_reservations(product_id, status);
CREATE INDEX IF NOT EXISTS idx_reservation_negotiation ON stock_reservations(negotiation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_expiring ON stock_reservations(expires_at)
  WHERE status = 'ACTIVE';

COMMENT ON TABLE stock_reservations IS 'Rezervări temporare stoc cu TTL';

-- =====================
-- FSM_VALID_TRANSITIONS
-- =====================

CREATE TABLE IF NOT EXISTS fsm_valid_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_state negotiation_state_enum NOT NULL,
  to_state negotiation_state_enum NOT NULL,
  requires_condition VARCHAR(255),
  description TEXT,
  
  CONSTRAINT unique_transition UNIQUE (from_state, to_state)
);

-- Seed valid transitions
INSERT INTO fsm_valid_transitions (from_state, to_state, description) VALUES
  ('DISCOVERY', 'PROPOSAL', 'Client arată interes'),
  ('DISCOVERY', 'DEAD', 'Client nu e interesat'),
  ('PROPOSAL', 'NEGOTIATION', 'Discuție preț/cantitate'),
  ('PROPOSAL', 'CLOSING', 'Acceptare directă'),
  ('PROPOSAL', 'DEAD', 'Refuz ofertă'),
  ('NEGOTIATION', 'CLOSING', 'Acord pe condiții'),
  ('NEGOTIATION', 'PROPOSAL', 'Revenire la ofertă'),
  ('NEGOTIATION', 'DEAD', 'Negociere eșuată'),
  ('CLOSING', 'PROFORMA_SENT', 'Proforma emisă'),
  ('CLOSING', 'NEGOTIATION', 'Revenire negociere'),
  ('CLOSING', 'DEAD', 'Renunțare în ultima clipă'),
  ('PROFORMA_SENT', 'INVOICED', 'Proforma acceptată'),
  ('PROFORMA_SENT', 'NEGOTIATION', 'Modificări cerute'),
  ('PROFORMA_SENT', 'DEAD', 'Proforma expirată/refuzată'),
  ('INVOICED', 'PAID', 'Plată primită'),
  ('INVOICED', 'DEAD', 'Factură anulată'),
  ('DEAD', 'DISCOVERY', 'Reînviere lead')
ON CONFLICT (from_state, to_state) DO NOTHING;

COMMENT ON TABLE fsm_valid_transitions IS 'Tranziții permise în FSM negociere';

-- =====================
-- FSM_STATE_ALLOWED_TOOLS
-- =====================

CREATE TABLE IF NOT EXISTS fsm_state_allowed_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state negotiation_state_enum NOT NULL,
  tool_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  CONSTRAINT unique_state_tool UNIQUE (state, tool_name)
);

-- Seed allowed tools per state
INSERT INTO fsm_state_allowed_tools (state, tool_name, description) VALUES
  -- DISCOVERY
  ('DISCOVERY', 'search_products', 'Căutare produse'),
  ('DISCOVERY', 'get_catalog', 'Listare catalog'),
  ('DISCOVERY', 'get_client_history', 'Istoric client'),
  -- PROPOSAL
  ('PROPOSAL', 'get_product_details', 'Detalii produs'),
  ('PROPOSAL', 'check_realtime_stock', 'Verificare stoc'),
  ('PROPOSAL', 'search_products', 'Căutare produse'),
  -- NEGOTIATION
  ('NEGOTIATION', 'calculate_discount', 'Calcul discount'),
  ('NEGOTIATION', 'check_realtime_stock', 'Verificare stoc'),
  ('NEGOTIATION', 'get_product_details', 'Detalii produs'),
  ('NEGOTIATION', 'request_discount_approval', 'Cerere aprobare discount'),
  ('NEGOTIATION', 'reserve_stock', 'Rezervare stoc'),
  -- CLOSING
  ('CLOSING', 'validate_client_data', 'Validare date fiscale'),
  ('CLOSING', 'create_proforma', 'Creare proforma'),
  ('CLOSING', 'get_payment_terms', 'Termene plată'),
  -- PROFORMA_SENT
  ('PROFORMA_SENT', 'track_proforma_status', 'Status proforma'),
  ('PROFORMA_SENT', 'resend_proforma', 'Retrimitere proforma'),
  ('PROFORMA_SENT', 'convert_to_invoice', 'Conversie în factură'),
  -- INVOICED
  ('INVOICED', 'send_einvoice', 'Trimitere e-Factura'),
  ('INVOICED', 'track_payment', 'Tracking plată'),
  ('INVOICED', 'send_payment_reminder', 'Reminder plată')
ON CONFLICT (state, tool_name) DO NOTHING;

COMMENT ON TABLE fsm_state_allowed_tools IS 'Tools permise per stare FSM';

COMMIT;
```

---

## 5. Migrări Fiscal

### 5.1 Migration: Fiscal Tables

```sql
-- Migration: 20260201100300_etapa3_fiscal_tables.sql
-- Description: Create fiscal and document tables

BEGIN;

-- =====================
-- OBLIO_CLIENTS
-- =====================

CREATE TABLE IF NOT EXISTS oblio_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  oblio_cif VARCHAR(15) NOT NULL,
  name VARCHAR(255) NOT NULL,
  cif VARCHAR(15) NOT NULL,
  registration_number VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  county VARCHAR(50),
  country VARCHAR(2) NOT NULL DEFAULT 'RO',
  email VARCHAR(255),
  phone VARCHAR(20),
  bank_account VARCHAR(30),
  bank_name VARCHAR(100),
  
  contact_name VARCHAR(255),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  
  default_vat_percent DECIMAL(4,2) NOT NULL DEFAULT 19.00,
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  credit_limit DECIMAL(15,2),
  
  is_synced_with_oblio BOOLEAN NOT NULL DEFAULT FALSE,
  oblio_client_id VARCHAR(50),
  last_synced_at TIMESTAMPTZ,
  
  total_invoiced DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_paid DECIMAL(15,2) NOT NULL DEFAULT 0,
  last_invoice_date DATE,
  last_payment_date DATE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_oblio_client_cif UNIQUE (tenant_id, cif),
  CONSTRAINT valid_client_vat CHECK (default_vat_percent IN (0, 5, 9, 19))
);

CREATE INDEX IF NOT EXISTS idx_oblio_clients_search ON oblio_clients 
  USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_oblio_clients_cif ON oblio_clients(tenant_id, cif);

COMMENT ON TABLE oblio_clients IS 'Cache local clienți Oblio';

-- =====================
-- OBLIO_SERIES
-- =====================

CREATE TABLE IF NOT EXISTS oblio_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  document_type document_type_enum NOT NULL,
  series_name VARCHAR(20) NOT NULL,
  fiscal_year INTEGER NOT NULL,
  
  current_number INTEGER NOT NULL DEFAULT 0,
  prefix VARCHAR(10),
  padding INTEGER NOT NULL DEFAULT 4,
  
  oblio_series_name VARCHAR(50),
  is_synced_with_oblio BOOLEAN NOT NULL DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_series_type_year UNIQUE (tenant_id, document_type, series_name, fiscal_year),
  CONSTRAINT valid_padding CHECK (padding BETWEEN 1 AND 10),
  CONSTRAINT valid_fiscal_year CHECK (fiscal_year BETWEEN 2020 AND 2100)
);

CREATE INDEX IF NOT EXISTS idx_oblio_series_lookup ON oblio_series(tenant_id, document_type, is_active, is_default);

COMMENT ON TABLE oblio_series IS 'Serii documente fiscale';

-- =====================
-- OBLIO_DOCUMENTS
-- =====================

CREATE TABLE IF NOT EXISTS oblio_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  document_type document_type_enum NOT NULL,
  series_name VARCHAR(20) NOT NULL,
  number VARCHAR(20) NOT NULL,
  
  negotiation_id UUID REFERENCES gold_negotiations(id),
  lead_id UUID REFERENCES gold_leads(id),
  original_document_id UUID REFERENCES oblio_documents(id),
  reference_document_id UUID REFERENCES oblio_documents(id),
  
  issuer_cif VARCHAR(15) NOT NULL,
  issuer_name VARCHAR(255) NOT NULL,
  
  client_id UUID REFERENCES oblio_clients(id),
  client_cif VARCHAR(15) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_address TEXT,
  client_email VARCHAR(255),
  
  subtotal DECIMAL(15,2) NOT NULL,
  vat_amount DECIMAL(15,2) NOT NULL,
  total DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'RON',
  exchange_rate DECIMAL(10,6) DEFAULT 1.0,
  
  issue_date DATE NOT NULL,
  due_date DATE,
  delivery_date DATE,
  
  status document_status_enum NOT NULL DEFAULT 'DRAFT',
  einvoice_status einvoice_status_enum NOT NULL DEFAULT 'NOT_APPLICABLE',
  
  oblio_id VARCHAR(50),
  pdf_link TEXT,
  pdf_stored_path TEXT,
  
  einvoice_id VARCHAR(50),
  einvoice_index VARCHAR(100),
  einvoice_sent_at TIMESTAMPTZ,
  einvoice_validated_at TIMESTAMPTZ,
  einvoice_error_message TEXT,
  einvoice_xml_path TEXT,
  
  products JSONB NOT NULL DEFAULT '[]',
  mentions TEXT,
  internal_note TEXT,
  
  affects_stock BOOLEAN NOT NULL DEFAULT FALSE,
  stock_deducted BOOLEAN NOT NULL DEFAULT FALSE,
  payment_collected BOOLEAN NOT NULL DEFAULT FALSE,
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_sent BOOLEAN NOT NULL DEFAULT FALSE,
  
  oblio_request JSONB,
  oblio_response JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  CONSTRAINT unique_doc_series_number UNIQUE (tenant_id, document_type, series_name, number),
  CONSTRAINT valid_amounts CHECK (ABS(total - (subtotal + vat_amount)) < 0.01),
  CONSTRAINT storno_needs_original CHECK (
    (document_type = 'STORNO' AND original_document_id IS NOT NULL)
    OR document_type != 'STORNO'
  )
);

CREATE INDEX IF NOT EXISTS idx_doc_series ON oblio_documents(tenant_id, series_name, number);
CREATE INDEX IF NOT EXISTS idx_doc_type_status ON oblio_documents(tenant_id, document_type, status);
CREATE INDEX IF NOT EXISTS idx_doc_client ON oblio_documents(tenant_id, client_cif);
CREATE INDEX IF NOT EXISTS idx_doc_date ON oblio_documents(tenant_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_doc_unpaid ON oblio_documents(tenant_id, due_date)
  WHERE document_type = 'INVOICE' AND payment_collected = FALSE AND status NOT IN ('CANCELLED', 'STORNO');
CREATE INDEX IF NOT EXISTS idx_doc_einvoice ON oblio_documents(tenant_id, issue_date)
  WHERE document_type = 'INVOICE' AND einvoice_status IN ('PENDING', 'ERROR');

COMMENT ON TABLE oblio_documents IS 'Documente fiscale emise prin Oblio';

-- =====================
-- EINVOICE_SUBMISSIONS
-- =====================

CREATE TABLE IF NOT EXISTS einvoice_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  document_id UUID NOT NULL REFERENCES oblio_documents(id),
  negotiation_id UUID REFERENCES gold_negotiations(id),
  
  action spv_action_enum NOT NULL,
  submission_attempt INTEGER NOT NULL DEFAULT 1,
  
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deadline_at TIMESTAMPTZ NOT NULL,
  
  spv_index VARCHAR(100),
  spv_upload_id VARCHAR(100),
  spv_status VARCHAR(50),
  spv_message TEXT,
  spv_errors JSONB,
  
  xml_content TEXT,
  xml_hash VARCHAR(64),
  response_xml TEXT,
  
  processed_at TIMESTAMPTZ,
  processing_duration_ms INTEGER,
  
  is_successful BOOLEAN,
  final_status einvoice_status_enum,
  error_category VARCHAR(50),
  
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  triggered_by VARCHAR(50),
  
  CONSTRAINT valid_retry CHECK (retry_count <= max_retries)
);

CREATE INDEX IF NOT EXISTS idx_einvoice_pending ON einvoice_submissions(tenant_id, deadline_at)
  WHERE is_successful IS NULL OR is_successful = FALSE;
CREATE INDEX IF NOT EXISTS idx_einvoice_spv ON einvoice_submissions(spv_index) WHERE spv_index IS NOT NULL;

COMMENT ON TABLE einvoice_submissions IS 'Log trimiteri e-Factura SPV';

-- =====================
-- PAYMENT_RECONCILIATION
-- =====================

CREATE TABLE IF NOT EXISTS payment_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  payment_source payment_source_enum NOT NULL,
  external_payment_id VARCHAR(100),
  transaction_reference VARCHAR(100),
  
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'RON',
  exchange_rate DECIMAL(10,6) DEFAULT 1.0,
  
  payer_name VARCHAR(255),
  payer_account VARCHAR(50),
  payer_cif VARCHAR(15),
  
  status reconciliation_status_enum NOT NULL DEFAULT 'PENDING',
  document_id UUID REFERENCES oblio_documents(id),
  negotiation_id UUID REFERENCES gold_negotiations(id),
  
  match_confidence DECIMAL(3,2),
  match_method VARCHAR(50),
  match_details JSONB,
  
  is_partial BOOLEAN NOT NULL DEFAULT FALSE,
  partial_sequence INTEGER,
  total_paid_for_document DECIMAL(15,2),
  remaining_amount DECIMAL(15,2),
  
  payment_date DATE NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  reconciled_at TIMESTAMPTZ,
  
  reconciled_by UUID REFERENCES users(id),
  reconciliation_note TEXT,
  
  bank_statement_text TEXT,
  bank_raw_data JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT positive_payment CHECK (amount > 0),
  CONSTRAINT valid_confidence CHECK (match_confidence IS NULL OR match_confidence BETWEEN 0 AND 1)
);

CREATE INDEX IF NOT EXISTS idx_payment_pending ON payment_reconciliation(tenant_id, payer_cif)
  WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_payment_ref ON payment_reconciliation(transaction_reference);

COMMENT ON TABLE payment_reconciliation IS 'Reconciliere plăți bancare';

-- =====================
-- DOCUMENT_DELIVERY
-- =====================

CREATE TABLE IF NOT EXISTS document_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  document_id UUID NOT NULL REFERENCES oblio_documents(id),
  
  channel delivery_channel_enum NOT NULL,
  recipient_address VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  
  status delivery_status_enum NOT NULL DEFAULT 'PENDING',
  
  provider_name VARCHAR(50),
  provider_message_id VARCHAR(100),
  provider_status VARCHAR(50),
  provider_response JSONB,
  
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  
  subject VARCHAR(255),
  body_preview TEXT,
  attachment_count INTEGER NOT NULL DEFAULT 1,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_status ON document_delivery(tenant_id, document_id, channel, status);
CREATE INDEX IF NOT EXISTS idx_delivery_retry ON document_delivery(next_retry_at)
  WHERE status IN ('PENDING', 'FAILED') AND retry_count < max_retries;

COMMENT ON TABLE document_delivery IS 'Tracking trimitere documente';

-- =====================
-- FISCAL_AUDIT_TRAIL
-- =====================

CREATE TABLE IF NOT EXISTS fiscal_audit_trail (
  id BIGSERIAL PRIMARY KEY,
  uuid UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  event_type fiscal_event_type_enum NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  document_id UUID REFERENCES oblio_documents(id),
  negotiation_id UUID REFERENCES gold_negotiations(id),
  einvoice_submission_id UUID REFERENCES einvoice_submissions(id),
  
  actor_type VARCHAR(20) NOT NULL,
  actor_id UUID,
  actor_name VARCHAR(255),
  actor_ip INET,
  
  event_data JSONB NOT NULL,
  
  previous_hash VARCHAR(64),
  current_hash VARCHAR(64) NOT NULL,
  
  is_verified BOOLEAN,
  verified_at TIMESTAMPTZ,
  
  source_system VARCHAR(50) NOT NULL DEFAULT 'CERNIQ',
  correlation_id UUID,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_chain ON fiscal_audit_trail(tenant_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_document ON fiscal_audit_trail(document_id) WHERE document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_type ON fiscal_audit_trail(tenant_id, event_type, event_timestamp DESC);

COMMENT ON TABLE fiscal_audit_trail IS 'Audit trail imutabil cu hash chain';

COMMIT;
```

---

## 6. Migrări AI & MCP

### 6.1 Migration: AI Tables

```sql
-- Migration: 20260201100400_etapa3_ai_tables.sql
-- Description: Create AI conversation and tool call tables

BEGIN;

-- =====================
-- AI_CONVERSATIONS
-- =====================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  negotiation_id UUID REFERENCES gold_negotiations(id),
  lead_id UUID REFERENCES gold_leads(id),
  
  channel VARCHAR(20) NOT NULL,
  channel_thread_id VARCHAR(100),
  
  message_count INTEGER NOT NULL DEFAULT 0,
  user_message_count INTEGER NOT NULL DEFAULT 0,
  assistant_message_count INTEGER NOT NULL DEFAULT 0,
  tool_call_count INTEGER NOT NULL DEFAULT 0,
  
  total_tokens_used INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0,
  
  mcp_session_id VARCHAR(100),
  
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  handed_off_to UUID REFERENCES users(id),
  handoff_reason TEXT,
  handoff_at TIMESTAMPTZ,
  
  summary TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_negotiation ON ai_conversations(negotiation_id);
CREATE INDEX IF NOT EXISTS idx_conv_lead ON ai_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conv_status ON ai_conversations(tenant_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_mcp ON ai_conversations(mcp_session_id) WHERE mcp_session_id IS NOT NULL;

COMMENT ON TABLE ai_conversations IS 'Conversații AI cu metadata';

-- =====================
-- AI_CONVERSATION_MESSAGES
-- =====================

CREATE TABLE IF NOT EXISTS ai_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  
  role VARCHAR(20) NOT NULL,
  content TEXT,
  
  tool_calls JSONB,
  tool_call_id VARCHAR(100),
  tool_name VARCHAR(100),
  
  model_used VARCHAR(50),
  tokens_used INTEGER,
  latency_ms INTEGER,
  
  guardrail_checks JSONB DEFAULT '[]',
  guardrail_passed BOOLEAN DEFAULT TRUE,
  
  regeneration_attempt INTEGER NOT NULL DEFAULT 0,
  original_content TEXT,
  
  external_message_id VARCHAR(100),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_role CHECK (role IN ('system', 'user', 'assistant', 'tool'))
);

CREATE INDEX IF NOT EXISTS idx_msg_conversation ON ai_conversation_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_msg_guardrail_fail ON ai_conversation_messages(conversation_id)
  WHERE guardrail_passed = FALSE;

COMMENT ON TABLE ai_conversation_messages IS 'Mesaje individuale conversație AI';

-- =====================
-- AI_TOOL_CALLS
-- =====================

CREATE TABLE IF NOT EXISTS ai_tool_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id),
  message_id UUID REFERENCES ai_conversation_messages(id),
  negotiation_id UUID REFERENCES gold_negotiations(id),
  
  tool_name VARCHAR(100) NOT NULL,
  tool_input JSONB NOT NULL,
  tool_output JSONB,
  
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  error_message TEXT,
  
  guardrail_results JSONB DEFAULT '[]',
  guardrail_passed BOOLEAN DEFAULT TRUE,
  
  retry_count INTEGER NOT NULL DEFAULT 0,
  
  tokens_used INTEGER,
  estimated_cost_usd DECIMAL(10,6),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_tool_status CHECK (status IN ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'BLOCKED'))
);

CREATE INDEX IF NOT EXISTS idx_tool_conversation ON ai_tool_calls(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tool_name ON ai_tool_calls(tenant_id, tool_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_guardrail_fail ON ai_tool_calls(tenant_id)
  WHERE guardrail_passed = FALSE;

COMMENT ON TABLE ai_tool_calls IS 'Log complet apeluri MCP tools';

-- =====================
-- GUARDRAIL_VIOLATIONS
-- =====================

CREATE TABLE IF NOT EXISTS guardrail_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  conversation_id UUID REFERENCES ai_conversations(id),
  negotiation_id UUID REFERENCES gold_negotiations(id),
  message_id UUID REFERENCES ai_conversation_messages(id),
  tool_call_id UUID REFERENCES ai_tool_calls(id),
  
  guardrail_type guardrail_type_enum NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'WARNING',
  
  ai_content TEXT,
  violation_details JSONB NOT NULL,
  
  correction_applied TEXT,
  was_auto_corrected BOOLEAN NOT NULL DEFAULT FALSE,
  was_regenerated BOOLEAN NOT NULL DEFAULT FALSE,
  regeneration_attempt INTEGER,
  
  final_resolution VARCHAR(50),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_severity CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL'))
);

CREATE INDEX IF NOT EXISTS idx_violation_negotiation ON guardrail_violations(negotiation_id);
CREATE INDEX IF NOT EXISTS idx_violation_type ON guardrail_violations(tenant_id, guardrail_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_violation_unresolved ON guardrail_violations(tenant_id)
  WHERE final_resolution IS NULL;

COMMENT ON TABLE guardrail_violations IS 'Log violări guardrails anti-hallucination';

COMMIT;
```

### 6.2 Migration: Functions

```sql
-- Migration: 20260201100500_etapa3_functions.sql
-- Description: Create SQL functions for Etapa 3

BEGIN;

-- =====================
-- PRODUCT FUNCTIONS
-- =====================

-- Update search vector on product change
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.sku, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.brand, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW.manufacturer, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.crop_types, ' '), '')), 'B');
  
  NEW.name_trigram := LOWER(NEW.name);
  
  RETURN NEW;
END;
$$;

-- Hybrid search function
CREATE OR REPLACE FUNCTION hybrid_product_search(
  p_tenant_id UUID,
  p_query_text TEXT,
  p_query_embedding vector(1536) DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_price_min DECIMAL DEFAULT NULL,
  p_price_max DECIMAL DEFAULT NULL,
  p_in_stock_only BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 20,
  p_vector_weight DECIMAL DEFAULT 0.6
)
RETURNS TABLE (
  product_id UUID,
  sku VARCHAR,
  name VARCHAR,
  combined_score DECIMAL,
  vector_score DECIMAL,
  bm25_score DECIMAL,
  match_reason TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_bm25_weight DECIMAL := 1.0 - p_vector_weight;
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT 
      pe.product_id,
      1 - (pe.embedding <=> p_query_embedding) as v_score,
      ROW_NUMBER() OVER (ORDER BY pe.embedding <=> p_query_embedding) as v_rank
    FROM gold_product_embeddings pe
    WHERE pe.tenant_id = p_tenant_id
      AND pe.is_current = TRUE
      AND p_query_embedding IS NOT NULL
    LIMIT 100
  ),
  bm25_results AS (
    SELECT 
      p.id as product_id,
      ts_rank_cd(p.search_vector, plainto_tsquery('simple', p_query_text)) as b_score,
      ROW_NUMBER() OVER (ORDER BY ts_rank_cd(p.search_vector, plainto_tsquery('simple', p_query_text)) DESC) as b_rank
    FROM gold_products p
    WHERE p.tenant_id = p_tenant_id
      AND p.status = 'ACTIVE'
      AND p.search_vector @@ plainto_tsquery('simple', p_query_text)
    LIMIT 100
  ),
  combined AS (
    SELECT 
      COALESCE(v.product_id, b.product_id) as product_id,
      COALESCE(v.v_score, 0) as v_score,
      COALESCE(b.b_score, 0) as b_score,
      -- RRF formula
      (1.0 / (60 + COALESCE(v.v_rank, 1000))) * p_vector_weight +
      (1.0 / (60 + COALESCE(b.b_rank, 1000))) * v_bm25_weight as rrf_score
    FROM vector_results v
    FULL OUTER JOIN bm25_results b ON v.product_id = b.product_id
  )
  SELECT 
    p.id,
    p.sku,
    p.name,
    c.rrf_score::DECIMAL,
    c.v_score::DECIMAL,
    c.b_score::DECIMAL,
    CASE 
      WHEN c.v_score > 0 AND c.b_score > 0 THEN 'HYBRID'
      WHEN c.v_score > 0 THEN 'VECTOR'
      ELSE 'BM25'
    END
  FROM combined c
  JOIN gold_products p ON c.product_id = p.id
  LEFT JOIN stock_inventory si ON si.product_id = p.id AND si.tenant_id = p_tenant_id
  WHERE (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_price_min IS NULL OR p.base_price >= p_price_min)
    AND (p_price_max IS NULL OR p.base_price <= p_price_max)
    AND (NOT p_in_stock_only OR COALESCE(si.available_quantity, 0) > 0)
  ORDER BY c.rrf_score DESC
  LIMIT p_limit;
END;
$$;

-- Get max discount for product
CREATE OR REPLACE FUNCTION get_max_discount(
  p_tenant_id UUID,
  p_product_id UUID
)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
DECLARE
  v_discount DECIMAL;
  v_product RECORD;
BEGIN
  SELECT * INTO v_product FROM gold_products WHERE id = p_product_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Try product-specific rule first
  SELECT max_discount_percent INTO v_discount
  FROM price_rules
  WHERE tenant_id = p_tenant_id
    AND product_id = p_product_id
    AND is_active = TRUE
    AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
  ORDER BY priority DESC
  LIMIT 1;
  
  IF v_discount IS NOT NULL THEN
    RETURN v_discount;
  END IF;
  
  -- Try category rule
  SELECT max_discount_percent INTO v_discount
  FROM price_rules
  WHERE tenant_id = p_tenant_id
    AND category_id = v_product.category_id
    AND is_active = TRUE
    AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
  ORDER BY priority DESC
  LIMIT 1;
  
  IF v_discount IS NOT NULL THEN
    RETURN v_discount;
  END IF;
  
  -- Return product default
  RETURN v_product.max_discount_percent;
END;
$$;

-- =====================
-- NEGOTIATION FUNCTIONS
-- =====================

-- Validate state transition
CREATE OR REPLACE FUNCTION validate_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.current_state IS NOT NULL AND OLD.current_state != NEW.current_state THEN
    IF NOT EXISTS (
      SELECT 1 FROM fsm_valid_transitions
      WHERE from_state = OLD.current_state AND to_state = NEW.current_state
    ) THEN
      RAISE EXCEPTION 'Invalid state transition: % -> %', OLD.current_state, NEW.current_state;
    END IF;
    
    -- Record transition
    INSERT INTO negotiation_state_history (
      tenant_id, negotiation_id, from_state, to_state,
      transition_trigger, triggered_by_type, triggered_by_id
    ) VALUES (
      NEW.tenant_id, NEW.id, OLD.current_state, NEW.current_state,
      'UPDATE', 'SYSTEM', NULL
    );
    
    NEW.previous_state := OLD.current_state;
    NEW.state_changed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Check if tool is allowed in current state
CREATE OR REPLACE FUNCTION is_tool_allowed(
  p_negotiation_id UUID,
  p_tool_name VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_state negotiation_state_enum;
BEGIN
  SELECT current_state INTO v_state
  FROM gold_negotiations
  WHERE id = p_negotiation_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM fsm_state_allowed_tools
    WHERE state = v_state AND tool_name = p_tool_name
  );
END;
$$;

-- Get reservation TTL based on state
CREATE OR REPLACE FUNCTION get_reservation_ttl(p_state negotiation_state_enum)
RETURNS INTERVAL
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN CASE p_state
    WHEN 'PROPOSAL' THEN INTERVAL '30 minutes'
    WHEN 'NEGOTIATION' THEN INTERVAL '2 hours'
    WHEN 'CLOSING' THEN INTERVAL '24 hours'
    WHEN 'PROFORMA_SENT' THEN INTERVAL '7 days'
    ELSE INTERVAL '1 hour'
  END;
END;
$$;

-- Update inventory on reservation
CREATE OR REPLACE FUNCTION update_inventory_on_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE stock_inventory
    SET reserved_quantity = reserved_quantity + NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.inventory_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'ACTIVE' AND NEW.status IN ('CONVERTED', 'EXPIRED', 'CANCELLED') THEN
      UPDATE stock_inventory
      SET reserved_quantity = reserved_quantity - NEW.quantity,
          updated_at = NOW()
      WHERE id = NEW.inventory_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'ACTIVE' THEN
      UPDATE stock_inventory
      SET reserved_quantity = reserved_quantity - OLD.quantity,
          updated_at = NOW()
      WHERE id = OLD.inventory_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update negotiation total from items
CREATE OR REPLACE FUNCTION update_negotiation_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total DECIMAL;
  v_vat DECIMAL;
  v_discount DECIMAL;
BEGIN
  SELECT 
    COALESCE(SUM(line_total), 0),
    COALESCE(SUM(line_vat), 0),
    COALESCE(SUM(line_total * discount_percent / 100), 0)
  INTO v_total, v_vat, v_discount
  FROM negotiation_items
  WHERE negotiation_id = COALESCE(NEW.negotiation_id, OLD.negotiation_id)
    AND status = 'ACTIVE';
  
  UPDATE gold_negotiations
  SET total_value = v_total,
      total_vat = v_vat,
      total_discount = v_discount,
      updated_at = NOW()
  WHERE id = COALESCE(NEW.negotiation_id, OLD.negotiation_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =====================
-- FISCAL FUNCTIONS
-- =====================

-- Generate next document number
CREATE OR REPLACE FUNCTION get_next_document_number(
  p_tenant_id UUID,
  p_document_type document_type_enum,
  p_series_name VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  series_name VARCHAR,
  full_number VARCHAR,
  numeric_value INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_series RECORD;
  v_next_num INTEGER;
  v_formatted VARCHAR;
BEGIN
  SELECT * INTO v_series
  FROM oblio_series
  WHERE tenant_id = p_tenant_id
    AND document_type = p_document_type
    AND is_active = TRUE
    AND (p_series_name IS NULL AND is_default = TRUE OR oblio_series.series_name = p_series_name)
    AND fiscal_year = EXTRACT(YEAR FROM CURRENT_DATE)
  LIMIT 1
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active series for % / %', p_document_type, COALESCE(p_series_name, 'default');
  END IF;
  
  v_next_num := v_series.current_number + 1;
  
  UPDATE oblio_series
  SET current_number = v_next_num, updated_at = NOW()
  WHERE id = v_series.id;
  
  v_formatted := COALESCE(v_series.prefix, '') || LPAD(v_next_num::TEXT, v_series.padding, '0');
  
  RETURN QUERY SELECT v_series.series_name, v_formatted, v_next_num;
END;
$$;

-- Calculate audit hash
CREATE OR REPLACE FUNCTION calculate_audit_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_previous_hash VARCHAR(64);
  v_hash_input TEXT;
BEGIN
  SELECT current_hash INTO v_previous_hash
  FROM fiscal_audit_trail
  WHERE tenant_id = NEW.tenant_id
  ORDER BY id DESC
  LIMIT 1;
  
  NEW.previous_hash := v_previous_hash;
  
  v_hash_input := COALESCE(v_previous_hash, 'GENESIS') || 
                  NEW.event_timestamp::TEXT ||
                  NEW.event_type::TEXT ||
                  NEW.event_data::TEXT;
  
  NEW.current_hash := encode(sha256(v_hash_input::bytea), 'hex');
  
  RETURN NEW;
END;
$$;

-- Verify audit chain integrity
CREATE OR REPLACE FUNCTION verify_audit_chain(
  p_tenant_id UUID,
  p_from_id BIGINT DEFAULT NULL,
  p_to_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
  total_records INTEGER,
  valid_records INTEGER,
  broken_at_id BIGINT,
  is_chain_valid BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_record RECORD;
  v_previous_hash VARCHAR(64) := 'GENESIS';
  v_expected_hash VARCHAR(64);
  v_total INTEGER := 0;
  v_valid INTEGER := 0;
  v_broken_id BIGINT := NULL;
  v_hash_input TEXT;
BEGIN
  FOR v_record IN
    SELECT * FROM fiscal_audit_trail
    WHERE tenant_id = p_tenant_id
      AND (p_from_id IS NULL OR id >= p_from_id)
      AND (p_to_id IS NULL OR id <= p_to_id)
    ORDER BY id ASC
  LOOP
    v_total := v_total + 1;
    
    v_hash_input := COALESCE(v_previous_hash, 'GENESIS') || 
                    v_record.event_timestamp::TEXT ||
                    v_record.event_type::TEXT ||
                    v_record.event_data::TEXT;
    v_expected_hash := encode(sha256(v_hash_input::bytea), 'hex');
    
    IF v_record.current_hash = v_expected_hash AND 
       (v_record.previous_hash = v_previous_hash OR 
        (v_record.previous_hash IS NULL AND v_previous_hash = 'GENESIS')) THEN
      v_valid := v_valid + 1;
    ELSIF v_broken_id IS NULL THEN
      v_broken_id := v_record.id;
    END IF;
    
    v_previous_hash := v_record.current_hash;
  END LOOP;
  
  RETURN QUERY SELECT v_total, v_valid, v_broken_id, (v_total = v_valid);
END;
$$;

-- Update conversation stats on new message
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE ai_conversations
  SET message_count = message_count + 1,
      user_message_count = user_message_count + CASE WHEN NEW.role = 'user' THEN 1 ELSE 0 END,
      assistant_message_count = assistant_message_count + CASE WHEN NEW.role = 'assistant' THEN 1 ELSE 0 END,
      total_tokens_used = total_tokens_used + COALESCE(NEW.tokens_used, 0),
      last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;

COMMIT;
```

### 6.3 Migration: Triggers

```sql
-- Migration: 20260201100600_etapa3_triggers.sql
-- Description: Create triggers for Etapa 3

BEGIN;

-- Product triggers
DROP TRIGGER IF EXISTS trg_product_search_vector ON gold_products;
CREATE TRIGGER trg_product_search_vector
  BEFORE INSERT OR UPDATE OF name, sku, description, brand, manufacturer, crop_types
  ON gold_products
  FOR EACH ROW
  EXECUTE FUNCTION update_product_search_vector();

-- Negotiation triggers
DROP TRIGGER IF EXISTS trg_validate_state_transition ON gold_negotiations;
CREATE TRIGGER trg_validate_state_transition
  BEFORE UPDATE OF current_state ON gold_negotiations
  FOR EACH ROW
  EXECUTE FUNCTION validate_state_transition();

-- Reservation triggers
DROP TRIGGER IF EXISTS trg_inventory_reservation ON stock_reservations;
CREATE TRIGGER trg_inventory_reservation
  AFTER INSERT OR UPDATE OF status OR DELETE ON stock_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_on_reservation();

-- Negotiation items triggers
DROP TRIGGER IF EXISTS trg_negotiation_total ON negotiation_items;
CREATE TRIGGER trg_negotiation_total
  AFTER INSERT OR UPDATE OR DELETE ON negotiation_items
  FOR EACH ROW
  EXECUTE FUNCTION update_negotiation_total();

-- Fiscal audit hash trigger
DROP TRIGGER IF EXISTS trg_audit_hash ON fiscal_audit_trail;
CREATE TRIGGER trg_audit_hash
  BEFORE INSERT ON fiscal_audit_trail
  FOR EACH ROW
  EXECUTE FUNCTION calculate_audit_hash();

-- Conversation stats trigger
DROP TRIGGER IF EXISTS trg_conversation_stats ON ai_conversation_messages;
CREATE TRIGGER trg_conversation_stats
  AFTER INSERT ON ai_conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_stats();

-- Timestamp triggers (generic)
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply timestamp triggers to all tables with updated_at
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'gold_products', 'gold_product_categories', 'price_rules',
    'stock_inventory', 'stock_reservations',
    'gold_negotiations', 'negotiation_items',
    'oblio_clients', 'oblio_series', 'oblio_documents',
    'payment_reconciliation', 'document_delivery',
    'ai_conversations'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%I_timestamp ON %I;
      CREATE TRIGGER trg_%I_timestamp
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END;
$$;

COMMIT;
```

---

## 7. Script de Deployment

### 7.1 Drizzle Migration Script

```typescript
// scripts/migrate-etapa3.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function runMigration() {
  console.log('🚀 Starting Etapa 3 migration...');
  
  const connectionString = process.env.DATABASE_URL!;
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);
  
  try {
    // Run migrations
    await migrate(db, { 
      migrationsFolder: './drizzle/migrations',
      migrationsTable: '__drizzle_migrations'
    });
    
    console.log('✅ Migrations completed successfully');
    
    // Verify tables created
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'gold_%' OR table_name LIKE 'ai_%' OR table_name LIKE 'oblio_%'
      ORDER BY table_name
    `;
    
    console.log('📋 Tables created:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));
    
    // Verify enums
    const enums = await sql`
      SELECT typname FROM pg_type 
      WHERE typname LIKE '%_enum' 
      ORDER BY typname
    `;
    
    console.log('🏷️ Enums created:');
    enums.forEach(e => console.log(`  - ${e.typname}`));
    
    // Verify functions
    const functions = await sql`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_type = 'FUNCTION'
        AND routine_name IN (
          'hybrid_product_search', 'get_max_discount', 'validate_state_transition',
          'is_tool_allowed', 'get_reservation_ttl', 'get_next_document_number',
          'verify_audit_chain', 'calculate_audit_hash'
        )
    `;
    
    console.log('⚙️ Functions created:');
    functions.forEach(f => console.log(`  - ${f.routine_name}`));
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
```

### 7.2 Seed Data Script

```sql
-- scripts/seed-etapa3.sql
-- Seed data for Etapa 3

BEGIN;

-- Default document series for tenant (replace UUID with actual tenant_id)
INSERT INTO oblio_series (tenant_id, document_type, series_name, fiscal_year, prefix, padding, is_default)
SELECT 
  t.id,
  dt.dtype,
  dt.sname,
  2026,
  dt.prefix,
  4,
  TRUE
FROM tenants t
CROSS JOIN (VALUES 
  ('PROFORMA', 'PRO', 'P'),
  ('INVOICE', 'FCT', 'F'),
  ('NOTICE', 'AVZ', 'A'),
  ('STORNO', 'STR', 'S')
) AS dt(dtype, sname, prefix)
WHERE NOT EXISTS (
  SELECT 1 FROM oblio_series 
  WHERE tenant_id = t.id AND fiscal_year = 2026
)
ON CONFLICT DO NOTHING;

-- Default product categories
INSERT INTO gold_product_categories (tenant_id, name, slug, level, default_vat_percent)
SELECT 
  t.id,
  cat.name,
  cat.slug,
  0,
  19.00
FROM tenants t
CROSS JOIN (VALUES 
  ('Semințe', 'seminte'),
  ('Îngrășăminte', 'ingrasaminte'),
  ('Pesticide', 'pesticide'),
  ('Echipamente', 'echipamente'),
  ('Irigații', 'irigatii'),
  ('Servicii', 'servicii')
) AS cat(name, slug)
WHERE NOT EXISTS (
  SELECT 1 FROM gold_product_categories 
  WHERE tenant_id = t.id AND slug = cat.slug
)
ON CONFLICT DO NOTHING;

COMMIT;
```

---

## 8. Rollback Procedures

### 8.1 Rollback Script

```sql
-- scripts/rollback-etapa3.sql
-- ⚠️ DANGER: This will drop all Etapa 3 tables and data!

BEGIN;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS guardrail_violations CASCADE;
DROP TABLE IF EXISTS ai_tool_calls CASCADE;
DROP TABLE IF EXISTS ai_conversation_messages CASCADE;
DROP TABLE IF EXISTS ai_conversations CASCADE;

DROP TABLE IF EXISTS fiscal_audit_trail CASCADE;
DROP TABLE IF EXISTS document_delivery CASCADE;
DROP TABLE IF EXISTS payment_reconciliation CASCADE;
DROP TABLE IF EXISTS einvoice_submissions CASCADE;
DROP TABLE IF EXISTS oblio_documents CASCADE;
DROP TABLE IF EXISTS oblio_series CASCADE;
DROP TABLE IF EXISTS oblio_clients CASCADE;

DROP TABLE IF EXISTS fsm_state_allowed_tools CASCADE;
DROP TABLE IF EXISTS fsm_valid_transitions CASCADE;
DROP TABLE IF EXISTS stock_reservations CASCADE;
DROP TABLE IF EXISTS negotiation_items CASCADE;
DROP TABLE IF EXISTS negotiation_state_history CASCADE;
DROP TABLE IF EXISTS gold_negotiations CASCADE;
DROP TABLE IF EXISTS stock_inventory CASCADE;

DROP TABLE IF EXISTS price_rules CASCADE;
DROP TABLE IF EXISTS gold_product_images CASCADE;
DROP TABLE IF EXISTS gold_product_chunks CASCADE;
DROP TABLE IF EXISTS gold_product_embeddings CASCADE;
DROP TABLE IF EXISTS gold_products CASCADE;
DROP TABLE IF EXISTS gold_product_categories CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS hybrid_product_search CASCADE;
DROP FUNCTION IF EXISTS get_max_discount CASCADE;
DROP FUNCTION IF EXISTS validate_state_transition CASCADE;
DROP FUNCTION IF EXISTS is_tool_allowed CASCADE;
DROP FUNCTION IF EXISTS get_reservation_ttl CASCADE;
DROP FUNCTION IF EXISTS update_inventory_on_reservation CASCADE;
DROP FUNCTION IF EXISTS update_negotiation_total CASCADE;
DROP FUNCTION IF EXISTS get_next_document_number CASCADE;
DROP FUNCTION IF EXISTS calculate_audit_hash CASCADE;
DROP FUNCTION IF EXISTS verify_audit_chain CASCADE;
DROP FUNCTION IF EXISTS update_conversation_stats CASCADE;
DROP FUNCTION IF EXISTS update_product_search_vector CASCADE;
DROP FUNCTION IF EXISTS update_timestamp CASCADE;

-- Drop enums
DROP TYPE IF EXISTS guardrail_type_enum CASCADE;
DROP TYPE IF EXISTS reservation_status_enum CASCADE;
DROP TYPE IF EXISTS negotiation_priority_enum CASCADE;
DROP TYPE IF EXISTS negotiation_state_enum CASCADE;
DROP TYPE IF EXISTS fiscal_event_type_enum CASCADE;
DROP TYPE IF EXISTS delivery_status_enum CASCADE;
DROP TYPE IF EXISTS delivery_channel_enum CASCADE;
DROP TYPE IF EXISTS reconciliation_status_enum CASCADE;
DROP TYPE IF EXISTS payment_source_enum CASCADE;
DROP TYPE IF EXISTS spv_action_enum CASCADE;
DROP TYPE IF EXISTS einvoice_status_enum CASCADE;
DROP TYPE IF EXISTS document_status_enum CASCADE;
DROP TYPE IF EXISTS document_type_enum CASCADE;
DROP TYPE IF EXISTS price_rule_type_enum CASCADE;
DROP TYPE IF EXISTS product_unit_enum CASCADE;
DROP TYPE IF EXISTS product_status_enum CASCADE;

COMMIT;
```

---

## 9. Checklist Deployment

### Pre-Deployment
- [ ] Backup complet bază de date
- [ ] Verificare conexiune PostgreSQL 18.1
- [ ] Verificare extensii (vector, pg_trgm, pgcrypto)
- [ ] Review migrări în staging

### Deployment
- [ ] Executare migrări în ordine
- [ ] Verificare tabele create
- [ ] Verificare enums
- [ ] Verificare funcții
- [ ] Executare seed data
- [ ] Test funcții critice

### Post-Deployment
- [ ] Verificare integritate date
- [ ] Test hybrid_product_search()
- [ ] Test FSM transitions
- [ ] Test audit hash chain
- [ ] Monitorizare performanță indexuri

---

**Document creat:** Ianuarie 2026  
**Ultima actualizare:** Ianuarie 2026  
**Versiune:** 1.0  
**Compatibil cu:** Master Spec v1.2, Drizzle v0.40.0, PostgreSQL 18.1
