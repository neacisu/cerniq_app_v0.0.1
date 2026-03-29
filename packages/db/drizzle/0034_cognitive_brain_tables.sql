-- ============================================================================
-- 0034_cognitive_brain_tables.sql
-- Bronze-layer tables for the Cognitive Brain subsystem
-- ============================================================================

-- 1. bronze.cognitive_events
CREATE TABLE IF NOT EXISTS bronze.cognitive_events (
  id            BIGSERIAL       PRIMARY KEY,
  tenant_id     UUID            NOT NULL,
  node_key      TEXT            NOT NULL,
  event_type    TEXT            NOT NULL,
  trace_id      TEXT,
  span_id       TEXT,
  correlation_id UUID,
  payload       JSONB           NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

--> statement-breakpoint

-- 2. bronze.data_mutations
CREATE TABLE IF NOT EXISTS bronze.data_mutations (
  id              BIGSERIAL     PRIMARY KEY,
  tenant_id       UUID          NOT NULL,
  batch_id        UUID          NOT NULL,
  node_key        TEXT          NOT NULL,
  entity_type     TEXT          NOT NULL,
  entity_id       UUID          NOT NULL,
  mutation_intent TEXT          NOT NULL,
  before_data     JSONB,
  after_data      JSONB,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

--> statement-breakpoint

-- 3. bronze.cognitive_node_configs
CREATE TABLE IF NOT EXISTS bronze.cognitive_node_configs (
  id                SERIAL        PRIMARY KEY,
  tenant_id         UUID          NOT NULL,
  node_key          TEXT          NOT NULL,
  concurrency       INTEGER       NOT NULL DEFAULT 1,
  rate_limit_max    INTEGER,
  rate_limit_duration INTEGER,
  paused            BOOLEAN       NOT NULL DEFAULT false,
  config_overrides  JSONB         NOT NULL DEFAULT '{}',
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT uq_cognitive_node_configs_tenant_node UNIQUE (tenant_id, node_key)
);

--> statement-breakpoint

-- Indexes for cognitive_events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cognitive_events_tenant_created
  ON bronze.cognitive_events (tenant_id, created_at);

--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cognitive_events_node_created
  ON bronze.cognitive_events (node_key, created_at);

--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cognitive_events_correlation
  ON bronze.cognitive_events (correlation_id);

--> statement-breakpoint

-- Indexes for data_mutations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_mutations_tenant_batch
  ON bronze.data_mutations (tenant_id, batch_id);

--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_mutations_entity
  ON bronze.data_mutations (entity_id, entity_type);

--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_mutations_node
  ON bronze.data_mutations (node_key);
