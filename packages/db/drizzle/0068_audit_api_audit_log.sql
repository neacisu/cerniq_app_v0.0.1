-- Jurnal audit HTTP pentru mutații (POST/PUT/PATCH/DELETE), separat de approval_audit_log.
-- Fără RLS în această migrare (scriere doar din API trusă; paritate cu observability.job_logs).

CREATE TABLE IF NOT EXISTS audit.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants (id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users (id) ON DELETE SET NULL,
  correlation_id UUID,
  trace_id TEXT,
  span_id TEXT,
  method VARCHAR(16) NOT NULL,
  route_pattern TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  ip_hash VARCHAR(64),
  user_agent TEXT,
  request_body_hash VARCHAR(64),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  event_hash VARCHAR(64) NOT NULL,
  previous_hash VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_created
  ON audit.audit_log (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_created
  ON audit.audit_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_correlation
  ON audit.audit_log (correlation_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_created  ON audit.audit_log (created_at DESC);

COMMENT ON TABLE audit.audit_log IS 'Audit trail for mutating HTTP API requests (route template, status, optional body hash).';

-- Jurnal erori persistate (opțional pentru agregări); inserări ulterioare din aplicație.
CREATE TABLE IF NOT EXISTS observability.error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants (id) ON DELETE CASCADE,
  fingerprint TEXT,
  message TEXT NOT NULL,
  error_type TEXT,
  context JSONB,
  trace_id TEXT,
  span_id TEXT,
  correlation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obs_error_log_tenant_created
  ON observability.error_log (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_obs_error_log_fingerprint
  ON observability.error_log (fingerprint);

-- Alias citire: sursa unică de adevăr pentru job logs noi (coloane explicite — fără SELECT *).
CREATE OR REPLACE VIEW bronze.job_logs_v AS
SELECT
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
FROM observability.job_logs;
