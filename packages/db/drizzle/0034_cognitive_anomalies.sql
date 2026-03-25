-- Migration 0034: Cognitive Brain Anomalies
-- Anomaly detection rules and records per node

DO $$ BEGIN
  CREATE TYPE bronze.anomaly_rule_kind AS ENUM (
    'stale_heartbeat',
    'counter_drift',
    'orphan_job',
    'missing_parent_context',
    'retry_exhausted',
    'mutation_without_provenance',
    'queue_backpressure',
    'config_pending_apply'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS bronze.import_node_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  root_batch_id UUID,
  node_key TEXT NOT NULL,
  anomaly_kind bronze.anomaly_rule_kind NOT NULL,
  severity TEXT NOT NULL DEFAULT 'WARNING',
  details JSONB DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_node_anomalies_batch
  ON bronze.import_node_anomalies (root_batch_id, node_key);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_node_anomalies_unresolved
  ON bronze.import_node_anomalies (tenant_id, created_at) WHERE resolved_at IS NULL;
