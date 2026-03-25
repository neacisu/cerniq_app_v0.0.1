-- Migration 0033: Cognitive Brain Control Plane
-- Tables for real-time neuron state tracking, edges, events, data mutations, and config

-- Enum types for cognitive brain
DO $$ BEGIN
  CREATE TYPE bronze.edge_kind AS ENUM ('triggers', 'depends_on', 'reads', 'writes', 'mutates', 'blocks', 'retries');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE bronze.mutation_operation AS ENUM ('insert', 'update', 'merge', 'soft_delete', 'restore', 'noop');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE bronze.config_apply_status AS ENUM ('immediate', 'pending_apply', 'applied');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Cognitive Nodes: live catalog of active nodes per batch
CREATE TABLE IF NOT EXISTS bronze.import_cognitive_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  root_batch_id UUID,
  node_key TEXT NOT NULL,
  cognitive_type TEXT NOT NULL,
  swimlane TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  metrics JSONB DEFAULT '{}'::jsonb,
  heartbeat_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cognitive_nodes_batch
  ON bronze.import_cognitive_nodes (root_batch_id, node_key);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cognitive_nodes_tenant
  ON bronze.import_cognitive_nodes (tenant_id, created_at);

-- Cognitive Edges: directed relationships between nodes
CREATE TABLE IF NOT EXISTS bronze.import_cognitive_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  root_batch_id UUID,
  source_node_key TEXT NOT NULL,
  target_node_key TEXT NOT NULL,
  edge_kind bronze.edge_kind NOT NULL DEFAULT 'triggers',
  weight REAL DEFAULT 1.0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cognitive_edges_batch
  ON bronze.import_cognitive_edges (root_batch_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cognitive_edges_source
  ON bronze.import_cognitive_edges (source_node_key);

-- Cognitive Events: monotonic stream for SSE replay
CREATE TABLE IF NOT EXISTS bronze.import_cognitive_events (
  event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id UUID NOT NULL,
  root_batch_id UUID,
  node_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  trace_id TEXT,
  span_id TEXT,
  correlation_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cognitive_events_batch_replay
  ON bronze.import_cognitive_events (root_batch_id, event_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cognitive_events_node
  ON bronze.import_cognitive_events (node_key, created_at);

-- Data Mutations: provenance tracking for all DB changes
CREATE TABLE IF NOT EXISTS bronze.import_data_mutations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  root_batch_id UUID,
  source_node_key TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_entity_id TEXT,
  operation bronze.mutation_operation NOT NULL DEFAULT 'update',
  changed_fields TEXT[],
  before_snapshot JSONB,
  after_snapshot JSONB,
  trace_id TEXT,
  causation_id TEXT,
  actor_id TEXT,
  correlation_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_mutations_batch
  ON bronze.import_data_mutations (root_batch_id, source_node_key);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_mutations_entity
  ON bronze.import_data_mutations (target_table, target_entity_id);

-- Node Configs: per-node per-batch configuration overrides
CREATE TABLE IF NOT EXISTS bronze.import_node_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  root_batch_id UUID,
  node_key TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  apply_status bronze.config_apply_status NOT NULL DEFAULT 'immediate',
  applied_at TIMESTAMPTZ,
  applied_by_worker_instance TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_node_config_per_batch UNIQUE (root_batch_id, node_key)
);
