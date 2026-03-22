-- Migration 0031: bronze.job_logs — per-worker/per-job granular log table
-- Stores detailed execution logs for every step in the import pipeline.
-- Used by the PipelineLiveMonitor UI and the SSE /imports/:id/logs/stream endpoint.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'job_log_level' AND n.nspname = 'bronze'
  ) THEN
    CREATE TYPE bronze.job_log_level AS ENUM ('debug', 'info', 'warn', 'error');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS bronze.job_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  batch_id      UUID        NOT NULL,   -- references bronze_import_batches(id) — kept loose for performance
  contact_id    UUID,                   -- optional: specific bronze contact row
  worker_name   VARCHAR(64) NOT NULL,   -- e.g. 'A1:csv-parser', 'B5:anaf-bronze-enricher'
  job_id        VARCHAR(255),           -- BullMQ job id
  level         bronze.job_log_level NOT NULL DEFAULT 'info',
  step          VARCHAR(128),           -- sub-step label, e.g. 'file_hash_check', 'anaf_request'
  message       TEXT        NOT NULL,
  context       JSONB,                  -- arbitrary structured data (row counts, CUI, error details, etc.)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for the most common query patterns
CREATE INDEX IF NOT EXISTS idx_job_logs_batch_created
  ON bronze.job_logs (batch_id, created_at);

CREATE INDEX IF NOT EXISTS idx_job_logs_batch_level
  ON bronze.job_logs (batch_id, level);

CREATE INDEX IF NOT EXISTS idx_job_logs_tenant_batch
  ON bronze.job_logs (tenant_id, batch_id);

-- Partial index for errors only (fast error-only queries)
CREATE INDEX IF NOT EXISTS idx_job_logs_errors
  ON bronze.job_logs (batch_id, created_at)
  WHERE level = 'error';

-- TTL: auto-delete logs older than 30 days to prevent table bloat.
-- Enforced by the maintenance:import-file-cleanup worker.
COMMENT ON TABLE bronze.job_logs IS 'Granular per-worker execution logs for the import pipeline. Retained for 30 days.';
