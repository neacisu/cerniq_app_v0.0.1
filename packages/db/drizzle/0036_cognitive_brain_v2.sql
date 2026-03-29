-- ============================================================================
-- 0036_cognitive_brain_v2.sql
-- Cognitive Brain v2: node catalog, edge graph, provenance columns
-- ============================================================================

-- ENUM: cognitive_edge_kind — tip relație direcționată între neuroni
CREATE TYPE cognitive_edge_kind AS ENUM (
  'triggers',
  'depends_on',
  'reads',
  'writes',
  'mutates',
  'blocks',
  'retries'
);

--> statement-breakpoint

-- ENUM: cognitive_apply_status — starea aplicării unui config
CREATE TYPE cognitive_apply_status AS ENUM (
  'immediate',
  'pending_apply',
  'applied'
);

--> statement-breakpoint

-- 1. bronze.import_cognitive_nodes
-- Catalog live al nodurilor cognitive active per batch de import.
-- Înregistrează node_key, tipul cognitiv, swimlane-ul functional, starea curentă,
-- metrici operaționale și timestamp-ul ultimului heartbeat.
CREATE TABLE IF NOT EXISTS bronze.import_cognitive_nodes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        NOT NULL,
  batch_id       UUID        NOT NULL,
  node_key       TEXT        NOT NULL,
  cognitive_type TEXT        NOT NULL,
  swimlane       TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'active',
  metrics        JSONB       NOT NULL DEFAULT '{}',
  heartbeat_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_import_cognitive_nodes_tenant_batch_node
    UNIQUE (tenant_id, batch_id, node_key)
);

--> statement-breakpoint

-- 2. bronze.import_cognitive_edges
-- Relații direcționate între noduri cognitive, scoped per batch.
-- Permite traversarea dependency graph-ului pentru propagare pause/resume.
CREATE TABLE IF NOT EXISTS bronze.import_cognitive_edges (
  id               UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID                 NOT NULL,
  batch_id         UUID                 NOT NULL,
  source_node_key  TEXT                 NOT NULL,
  target_node_key  TEXT                 NOT NULL,
  edge_kind        cognitive_edge_kind  NOT NULL,
  created_at       TIMESTAMPTZ          NOT NULL DEFAULT now(),
  CONSTRAINT uq_import_cognitive_edges_tenant_batch_src_tgt_kind
    UNIQUE (tenant_id, batch_id, source_node_key, target_node_key, edge_kind)
);

--> statement-breakpoint

-- 3. ALTER TABLE bronze.cognitive_node_configs
-- Adaugă coloane pentru lifecycle-ul aplicării configului:
--   apply_status: starea curentă (immediate = aplicat la bootstrap, pending_apply = necesită restart worker,
--                                  applied = confirmat de fleet)
--   applied_at:   momentul aplicării
--   applied_by_worker_instance: worker instanță care a confirmat aplicarea
ALTER TABLE bronze.cognitive_node_configs
  ADD COLUMN IF NOT EXISTS apply_status             cognitive_apply_status NOT NULL DEFAULT 'immediate',
  ADD COLUMN IF NOT EXISTS applied_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS applied_by_worker_instance TEXT;

--> statement-breakpoint

-- 4. ALTER TABLE bronze.data_mutations
-- Adaugă coloane de provenance complet:
--   changed_fields: câmpurile modificate (pentru diff-uri selective)
--   trace_id:       W3C Trace Context trace ID (din BullMQ job)
--   causation_id:   causation key (correlates cu request.id din API)
--   actor_id:       user/worker care a inițiat mutația
ALTER TABLE bronze.data_mutations
  ADD COLUMN IF NOT EXISTS changed_fields  TEXT[],
  ADD COLUMN IF NOT EXISTS trace_id        TEXT,
  ADD COLUMN IF NOT EXISTS causation_id    TEXT,
  ADD COLUMN IF NOT EXISTS actor_id        TEXT;

--> statement-breakpoint

-- Indexes pentru import_cognitive_nodes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_import_cognitive_nodes_tenant_batch
  ON bronze.import_cognitive_nodes (tenant_id, batch_id);

--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_import_cognitive_nodes_node_heartbeat
  ON bronze.import_cognitive_nodes (node_key, heartbeat_at);

--> statement-breakpoint

-- Indexes pentru import_cognitive_edges
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_import_cognitive_edges_tenant_batch
  ON bronze.import_cognitive_edges (tenant_id, batch_id);

--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_import_cognitive_edges_source
  ON bronze.import_cognitive_edges (batch_id, source_node_key);

--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_import_cognitive_edges_target
  ON bronze.import_cognitive_edges (batch_id, target_node_key);

--> statement-breakpoint

-- Index pe trace_id pentru căutări de provenance în data_mutations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_mutations_trace_id
  ON bronze.data_mutations (trace_id)
  WHERE trace_id IS NOT NULL;
