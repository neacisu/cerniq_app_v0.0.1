-- Cognitive Brain Control Plane — Faza 1
-- Tables for cognitive node tracking, events, mutations, configs, anomalies

CREATE TABLE IF NOT EXISTS bronze.import_cognitive_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  root_batch_id UUID,
  node_key TEXT NOT NULL,
  cognitive_type TEXT NOT NULL,
  swimlane TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'IDLE',
  metrics JSONB DEFAULT '{}'::jsonb,
  heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cognitive_nodes_tenant_batch
  ON bronze.import_cognitive_nodes (tenant_id, root_batch_id);
--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cognitive_nodes_node_key
  ON bronze.import_cognitive_nodes (node_key);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS bronze.import_cognitive_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  root_batch_id UUID,
  source_node_key TEXT NOT NULL,
  target_node_key TEXT NOT NULL,
  edge_kind TEXT NOT NULL DEFAULT 'triggers',
  weight REAL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cognitive_edges_source
  ON bronze.import_cognitive_edges (source_node_key);
--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cognitive_edges_target
  ON bronze.import_cognitive_edges (target_node_key);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS bronze.import_cognitive_events (
  event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id UUID NOT NULL,
  root_batch_id UUID,
  node_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  trace_id TEXT,
  correlation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cognitive_events_batch_id
  ON bronze.import_cognitive_events (root_batch_id, event_id);
--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cognitive_events_node
  ON bronze.import_cognitive_events (node_key, created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS bronze.import_data_mutations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  root_batch_id UUID,
  source_node_key TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_entity_id UUID,
  operation TEXT NOT NULL DEFAULT 'update',
  changed_fields TEXT[],
  before_snapshot JSONB,
  after_snapshot JSONB,
  trace_id TEXT,
  causation_id TEXT,
  actor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_mutations_batch
  ON bronze.import_data_mutations (root_batch_id, created_at);
--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_mutations_entity
  ON bronze.import_data_mutations (target_table, target_entity_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS bronze.import_node_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  root_batch_id UUID,
  node_key TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  apply_status TEXT NOT NULL DEFAULT 'immediate',
  applied_at TIMESTAMPTZ,
  applied_by_worker_instance TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_node_configs_unique
  ON bronze.import_node_configs (tenant_id, root_batch_id, node_key);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS bronze.import_node_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  root_batch_id UUID,
  node_key TEXT NOT NULL,
  anomaly_rule_kind TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  details JSONB DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_node_anomalies_node
  ON bronze.import_node_anomalies (node_key, created_at);
--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_node_anomalies_unresolved
  ON bronze.import_node_anomalies (tenant_id, resolved_at) WHERE resolved_at IS NULL;
