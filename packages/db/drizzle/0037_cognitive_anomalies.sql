-- ============================================================================
-- 0037_cognitive_anomalies.sql
-- Anomaly detection layer: catalog de anomalii detectate de Cognitive Brain
-- ============================================================================

-- ENUM: anomaly_rule_kind — regulile de detectare anomalii
-- Fiecare valoare reprezintă o clasă distinctă de abatere comportamentală a unui nod:
--   stale_heartbeat            — heartbeat absent > SLA prag
--   counter_drift              — counter cresce > limita admisă (posibil loop)
--   orphan_job                 — job fără parent context înregistrat
--   missing_parent_context     — batch_id / root_batch_id lipsă din job data
--   retry_exhausted            — job atins max retry attempts fără succes
--   mutation_without_provenance — data_mutation fără trace_id sau causation_id
--   queue_backpressure         — depth coadă > threshold configurat
--   config_pending_apply       — config cu apply_status='pending_apply' > timeout
CREATE TYPE anomaly_rule_kind AS ENUM (
  'stale_heartbeat',
  'counter_drift',
  'orphan_job',
  'missing_parent_context',
  'retry_exhausted',
  'mutation_without_provenance',
  'queue_backpressure',
  'config_pending_apply'
);

--> statement-breakpoint

-- bronze.import_node_anomalies
-- Catalog de anomalii detectate per nod, per batch.
-- Detectate de cognitive helpers (resolveNodeConfig, propagatePause) și Prometheus alerting.
-- Stocate pentru audit trail și HITL escalation.
CREATE TABLE IF NOT EXISTS bronze.import_node_anomalies (
  id           BIGSERIAL          PRIMARY KEY,
  tenant_id    UUID               NOT NULL,
  batch_id     UUID               NOT NULL,
  node_key     TEXT               NOT NULL,
  rule_kind    anomaly_rule_kind  NOT NULL,
  detected_at  TIMESTAMPTZ        NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ,
  payload      JSONB              NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ        NOT NULL DEFAULT now()
);

--> statement-breakpoint

-- Index principal: căutare per tenant + batch (mai des interogat)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_import_node_anomalies_tenant_batch
  ON bronze.import_node_anomalies (tenant_id, batch_id, detected_at);

--> statement-breakpoint

-- Index pentru căutare anomalii active (nerezolvate) per nod
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_import_node_anomalies_node_unresolved
  ON bronze.import_node_anomalies (node_key, rule_kind)
  WHERE resolved_at IS NULL;
