-- Migration 0067: observability.job_logs — universal etapa-agnostic job execution logs
-- Backfills from bronze.job_logs with id preserved for SSE cursor compatibility.

CREATE SCHEMA IF NOT EXISTS observability;

CREATE TABLE IF NOT EXISTS observability.job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  etapa TEXT NOT NULL,
  batch_id UUID,
  contact_id UUID,
  entity_type TEXT,
  entity_id UUID,
  worker_name VARCHAR(64) NOT NULL,
  queue_name TEXT,
  job_id VARCHAR(255),
  session_id UUID,
  runtime_job_key VARCHAR(255),
  parent_runtime_job_key VARCHAR(255),
  level TEXT NOT NULL DEFAULT 'info',
  step VARCHAR(128),
  message TEXT NOT NULL,
  context JSONB,
  correlation_id UUID,
  trace_id TEXT,
  span_id TEXT,
  error_fingerprint TEXT,
  duration_ms REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT observability_job_logs_level_check CHECK (level IN ('debug', 'info', 'warn', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_obs_job_logs_tenant_etapa_created
  ON observability.job_logs (tenant_id, etapa, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_obs_job_logs_correlation
  ON observability.job_logs (correlation_id);
CREATE INDEX IF NOT EXISTS idx_obs_job_logs_error_fingerprint
  ON observability.job_logs (error_fingerprint);
CREATE INDEX IF NOT EXISTS idx_obs_job_logs_worker_created
  ON observability.job_logs (worker_name, created_at);
CREATE INDEX IF NOT EXISTS idx_obs_job_logs_tenant_batch
  ON observability.job_logs (tenant_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_obs_job_logs_batch_created
  ON observability.job_logs (batch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_obs_job_logs_batch_level
  ON observability.job_logs (batch_id, level);
CREATE INDEX IF NOT EXISTS idx_obs_job_logs_batch_session_created
  ON observability.job_logs (batch_id, session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_obs_job_logs_runtime_job_key
  ON observability.job_logs (tenant_id, runtime_job_key);

COMMENT ON TABLE observability.job_logs IS 'Universal per-worker execution logs (all etape). Import pipeline (e1) backfilled from bronze.job_logs.';

-- Follow-up (ops/product): define TTL/retention, optional RLS, and GDPR deletion for PII inside context JSONB — not enforced in this migration.

INSERT INTO observability.job_logs (
  id,
  tenant_id,
  etapa,
  batch_id,
  contact_id,
  entity_type,
  entity_id,
  worker_name,
  queue_name,
  job_id,
  session_id,
  runtime_job_key,
  parent_runtime_job_key,
  level,
  step,
  message,
  context,
  correlation_id,
  trace_id,
  span_id,
  error_fingerprint,
  duration_ms,
  created_at
)
SELECT
  jl.id,
  jl.tenant_id,
  'e1',
  jl.batch_id,
  jl.contact_id,
  NULL,
  NULL,
  jl.worker_name,
  NULL,
  jl.job_id,
  jl.session_id,
  jl.runtime_job_key,
  jl.parent_runtime_job_key,
  jl.level::text,
  jl.step,
  jl.message,
  jl.context,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  jl.created_at
FROM bronze.job_logs jl
ON CONFLICT (id) DO NOTHING;
