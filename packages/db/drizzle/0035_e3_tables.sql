-- ============================================================================
-- 0035_e3_tables.sql — Faza 7a (E3): produse, negocieri, stoc, AI, fiscal, FSM
-- Toate indexurile explicite: CREATE INDEX CONCURRENTLY (zero-downtime).
-- ============================================================================

CREATE TABLE IF NOT EXISTS gold.gold_product_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT,
  parent_id   UUID REFERENCES gold.gold_product_categories(id) ON DELETE SET NULL,
  sort_order  INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.gold_products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  sku            TEXT,
  description    TEXT,
  category_id    UUID REFERENCES gold.gold_product_categories(id) ON DELETE SET NULL,
  unit_price     NUMERIC(12,2),
  currency       TEXT NOT NULL DEFAULT 'RON',
  search_vector  TSVECTOR,
  name_trigram   TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_gold_products_tenant_sku UNIQUE (tenant_id, sku)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.gold_product_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES gold.gold_products(id) ON DELETE CASCADE,
  embedding   halfvec(3072) NOT NULL,
  model       TEXT NOT NULL DEFAULT 'qwen3-embedding-8b',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.gold_product_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES gold.gold_products(id) ON DELETE CASCADE,
  chunk_text  TEXT,
  chunk_index INTEGER,
  embedding   halfvec(3072),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.price_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES gold.gold_products(id) ON DELETE CASCADE,
  rule_type        TEXT,
  min_quantity     INTEGER,
  discount_pct     NUMERIC(5,2),
  min_margin_pct   NUMERIC(5,2) NOT NULL DEFAULT 8.0,
  valid_from       TIMESTAMPTZ,
  valid_until      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.gold_negotiations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id             UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  assigned_user_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  current_state       TEXT NOT NULL DEFAULT 'DISCOVERY',
  engagement_score    NUMERIC(5,2),
  close_probability   NUMERIC(5,2),
  total_value         NUMERIC(14,2),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_gold_negotiations_state CHECK (
    current_state IN (
      'DISCOVERY','PROPOSAL','NEGOTIATION','CLOSING','PROFORMA_SENT','INVOICED','PAID','DEAD'
    )
  )
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.negotiation_state_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  negotiation_id   UUID NOT NULL REFERENCES gold.gold_negotiations(id) ON DELETE CASCADE,
  from_state       TEXT,
  to_state         TEXT,
  changed_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.negotiation_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  negotiation_id   UUID NOT NULL REFERENCES gold.gold_negotiations(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES gold.gold_products(id) ON DELETE RESTRICT,
  quantity         INTEGER,
  unit_price       NUMERIC(12,2),
  discount_pct     NUMERIC(5,2),
  line_total       NUMERIC(14,2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.stock_inventory (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES gold.gold_products(id) ON DELETE CASCADE,
  sku                 TEXT,
  total_quantity      INTEGER NOT NULL DEFAULT 0,
  reserved_quantity   INTEGER NOT NULL DEFAULT 0,
  warehouse_location  TEXT,
  last_sync_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.stock_reservations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  inventory_id        UUID NOT NULL REFERENCES gold.stock_inventory(id) ON DELETE CASCADE,
  negotiation_id      UUID NOT NULL REFERENCES gold.gold_negotiations(id) ON DELETE CASCADE,
  quantity            INTEGER,
  reservation_state   TEXT,
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.ai_conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id          UUID REFERENCES gold.gold_companies(id) ON DELETE SET NULL,
  negotiation_id   UUID REFERENCES gold.gold_negotiations(id) ON DELETE SET NULL,
  session_id       TEXT,
  model_used       TEXT,
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  total_tokens     INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.ai_conversation_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id  UUID NOT NULL REFERENCES gold.ai_conversations(id) ON DELETE CASCADE,
  role             TEXT NOT NULL,
  content          TEXT,
  tokens           INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_ai_conversation_messages_role CHECK (role IN ('system','user','assistant','tool'))
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.ai_tool_calls (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id  UUID NOT NULL REFERENCES gold.ai_conversations(id) ON DELETE CASCADE,
  message_id       UUID REFERENCES gold.ai_conversation_messages(id) ON DELETE SET NULL,
  tool_name        TEXT,
  input            JSONB,
  output           JSONB,
  duration_ms      INTEGER,
  success          BOOLEAN,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.guardrail_violations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  node_key         TEXT,
  violation_type   TEXT,
  severity         TEXT NOT NULL,
  details          JSONB,
  resolution       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_guardrail_violations_severity CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL'))
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.oblio_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_type   TEXT NOT NULL,
  series          TEXT,
  number          INTEGER,
  oblio_id        TEXT,
  status          TEXT,
  subtotal        NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat             NUMERIC(14,2) NOT NULL DEFAULT 0,
  total           NUMERIC(14,2) NOT NULL DEFAULT 0,
  issued_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_oblio_documents_type CHECK (document_type IN ('PROFORMA','INVOICE','CREDIT_NOTE')),
  CONSTRAINT chk_oblio_documents_total CHECK (total = subtotal + vat),
  CONSTRAINT uq_oblio_documents_tenant_type_series_num UNIQUE (tenant_id, document_type, series, number)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.einvoice_submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  oblio_document_id   UUID NOT NULL REFERENCES gold.oblio_documents(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'PENDING',
  index_spv           TEXT,
  deadline_at         TIMESTAMPTZ,
  submitted_at        TIMESTAMPTZ,
  validated_at        TIMESTAMPTZ,
  error_message       TEXT,
  retry_count         INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_einvoice_submissions_status CHECK (
    status IN ('PENDING','SENDING','SENT','PROCESSING','VALIDATED','REJECTED','ERROR')
  )
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.fiscal_audit_trail (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type  TEXT,
  entity_id    UUID,
  action       TEXT,
  actor_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  prev_hash    TEXT,
  hash         TEXT,
  data         JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.fsm_valid_transitions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fsm_type       TEXT NOT NULL,
  from_state     TEXT NOT NULL,
  to_state       TEXT NOT NULL,
  requires_role  TEXT,
  CONSTRAINT uq_fsm_valid_transitions UNIQUE (fsm_type, from_state, to_state)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS gold.fsm_state_allowed_tools (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fsm_type    TEXT NOT NULL,
  state       TEXT NOT NULL,
  tool_name   TEXT NOT NULL,
  CONSTRAINT uq_fsm_state_allowed_tools UNIQUE (fsm_type, state, tool_name)
);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_product_categories_tenant
  ON gold.gold_product_categories (tenant_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_product_categories_parent
  ON gold.gold_product_categories (parent_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_products_tenant
  ON gold.gold_products (tenant_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_products_tenant_active
  ON gold.gold_products (tenant_id, is_active);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_products_category
  ON gold.gold_products (category_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_products_search_vector
  ON gold.gold_products USING gin (search_vector);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_products_name_trgm
  ON gold.gold_products USING gin (name_trigram gin_trgm_ops);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_product_embeddings_tenant
  ON gold.gold_product_embeddings (tenant_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_product_embeddings_product
  ON gold.gold_product_embeddings (product_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_product_embeddings_embedding
  ON gold.gold_product_embeddings
  USING hnsw (embedding halfvec_cosine_ops);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_product_chunks_tenant
  ON gold.gold_product_chunks (tenant_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_product_chunks_product
  ON gold.gold_product_chunks (product_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_rules_tenant_product
  ON gold.price_rules (tenant_id, product_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_negotiations_tenant
  ON gold.gold_negotiations (tenant_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_negotiations_lead
  ON gold.gold_negotiations (lead_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_negotiations_assigned
  ON gold.gold_negotiations (assigned_user_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_negotiation_state_history_negotiation
  ON gold.negotiation_state_history (negotiation_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_negotiation_state_history_tenant
  ON gold.negotiation_state_history (tenant_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_negotiation_items_negotiation
  ON gold.negotiation_items (negotiation_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_negotiation_items_product
  ON gold.negotiation_items (product_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_inventory_tenant_product
  ON gold.stock_inventory (tenant_id, product_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_reservations_inventory
  ON gold.stock_reservations (inventory_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_reservations_negotiation
  ON gold.stock_reservations (negotiation_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_conversations_tenant
  ON gold.ai_conversations (tenant_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_conversations_lead
  ON gold.ai_conversations (lead_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_conversations_negotiation
  ON gold.ai_conversations (negotiation_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_conversation_messages_conversation
  ON gold.ai_conversation_messages (conversation_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_tool_calls_conversation
  ON gold.ai_tool_calls (conversation_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_tool_calls_message
  ON gold.ai_tool_calls (message_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guardrail_violations_tenant_created
  ON gold.guardrail_violations (tenant_id, created_at);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_oblio_documents_tenant
  ON gold.oblio_documents (tenant_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_einvoice_submissions_document
  ON gold.einvoice_submissions (oblio_document_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_einvoice_submissions_tenant_status
  ON gold.einvoice_submissions (tenant_id, status);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fiscal_audit_trail_tenant_entity
  ON gold.fiscal_audit_trail (tenant_id, entity_type, entity_id);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fsm_valid_transitions_fsm
  ON gold.fsm_valid_transitions (fsm_type);
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fsm_state_allowed_tools_fsm_state
  ON gold.fsm_state_allowed_tools (fsm_type, state);
