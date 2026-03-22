-- Migration 0032: import runtime control plane for Contact Imports

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'import_runtime_session_kind' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.import_runtime_session_kind AS ENUM (
      'ingest',
      'retry',
      'anaf',
      'reprocess',
      'recovery',
      'delete'
    );
  END IF;
END $$;

-- NOTE(plsql:S1192): The sentinel value 'queued' intentionally appears three times in this file:
--   1. In the ENUM type definition (canonical declaration).
--   2. As DEFAULT for import_runtime_sessions.status.
--   3. As DEFAULT for import_runtime_jobs.state.
-- PostgreSQL DDL grammar does not support named constants in ENUM definitions or column
-- DEFAULT clauses; extracting to a function would add schema pollution and per-INSERT overhead
-- with no semantic benefit.  Suppressed at each site via -- NOSONAR(plsql:S1192).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'import_runtime_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.import_runtime_status AS ENUM (
      'queued', -- NOSONAR(plsql:S1192): canonical ENUM declaration — DDL cannot reference named constants
      'running',
      'paused',
      'recovering',
      'completed',
      'failed',
      'stale',
      'terminal_error_skipped',
      'cancelled',
      'deleted'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS bronze.import_runtime_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES bronze.bronze_import_batches(id) ON DELETE CASCADE,
  kind public.import_runtime_session_kind NOT NULL,
  status public.import_runtime_status NOT NULL DEFAULT 'queued', -- NOSONAR(plsql:S1192): DDL DEFAULT must repeat the literal; see suppression note above
  correlation_id VARCHAR(255),
  label VARCHAR(255),
  last_heartbeat_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  silver_contacts_initial INTEGER NOT NULL DEFAULT 0,
  silver_contacts_promoted_during_session INTEGER NOT NULL DEFAULT 0,
  silver_contacts_current INTEGER NOT NULL DEFAULT 0,
  external_delta INTEGER NOT NULL DEFAULT 0,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_runtime_sessions_batch
  ON bronze.import_runtime_sessions (batch_id, created_at);

CREATE INDEX IF NOT EXISTS idx_import_runtime_sessions_tenant_status
  ON bronze.import_runtime_sessions (tenant_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_import_runtime_sessions_batch_status
  ON bronze.import_runtime_sessions (batch_id, status);

CREATE TABLE IF NOT EXISTS bronze.import_runtime_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES bronze.bronze_import_batches(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES bronze.import_runtime_sessions(id) ON DELETE CASCADE,
  runtime_job_key VARCHAR(255) NOT NULL,
  parent_runtime_job_key VARCHAR(255),
  queue_name VARCHAR(80) NOT NULL,
  job_name VARCHAR(120) NOT NULL,
  worker_name VARCHAR(120) NOT NULL,
  stage_key VARCHAR(80),
  bull_job_id VARCHAR(255),
  entity_type VARCHAR(80),
  entity_id VARCHAR(255),
  contact_id UUID,
  state public.import_runtime_status NOT NULL DEFAULT 'queued', -- NOSONAR(plsql:S1192): DDL DEFAULT must repeat the literal; see suppression note above
  heartbeat_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  attempts_used INTEGER NOT NULL DEFAULT 0,
  max_recovery_attempts INTEGER NOT NULL DEFAULT 3,
  checkpoint_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  resume_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_runtime_jobs_batch
  ON bronze.import_runtime_jobs (batch_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_import_runtime_jobs_session_worker
  ON bronze.import_runtime_jobs (session_id, worker_name, updated_at);

CREATE INDEX IF NOT EXISTS idx_import_runtime_jobs_batch_parent
  ON bronze.import_runtime_jobs (batch_id, parent_runtime_job_key);

CREATE INDEX IF NOT EXISTS idx_import_runtime_jobs_tenant_state
  ON bronze.import_runtime_jobs (tenant_id, state, updated_at);

CREATE INDEX IF NOT EXISTS idx_import_runtime_jobs_runtime_key
  ON bronze.import_runtime_jobs (tenant_id, runtime_job_key);

CREATE UNIQUE INDEX IF NOT EXISTS idx_import_runtime_jobs_unique_runtime_key
  ON bronze.import_runtime_jobs (tenant_id, runtime_job_key);

CREATE TABLE IF NOT EXISTS bronze.import_runtime_worker_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES bronze.bronze_import_batches(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES bronze.import_runtime_sessions(id) ON DELETE CASCADE,
  worker_name VARCHAR(120) NOT NULL,
  queue_name VARCHAR(80) NOT NULL,
  stage_key VARCHAR(80),
  total_jobs INTEGER NOT NULL DEFAULT 0,
  queued_jobs INTEGER NOT NULL DEFAULT 0,
  running_jobs INTEGER NOT NULL DEFAULT 0,
  paused_jobs INTEGER NOT NULL DEFAULT 0,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  failed_jobs INTEGER NOT NULL DEFAULT 0,
  skipped_jobs INTEGER NOT NULL DEFAULT 0,
  warning_jobs INTEGER NOT NULL DEFAULT 0,
  total_units INTEGER NOT NULL DEFAULT 0,
  processed_units INTEGER NOT NULL DEFAULT 0,
  success_units INTEGER NOT NULL DEFAULT 0,
  failed_units INTEGER NOT NULL DEFAULT 0,
  skipped_units INTEGER NOT NULL DEFAULT 0,
  inserted_units INTEGER NOT NULL DEFAULT 0,
  updated_units INTEGER NOT NULL DEFAULT 0,
  last_heartbeat_at TIMESTAMPTZ,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_runtime_worker_counters_batch
  ON bronze.import_runtime_worker_counters (batch_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_import_runtime_worker_counters_session
  ON bronze.import_runtime_worker_counters (session_id, worker_name);

CREATE INDEX IF NOT EXISTS idx_import_runtime_worker_counters_tenant
  ON bronze.import_runtime_worker_counters (tenant_id, worker_name, updated_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_import_runtime_worker_counters_unique_session_worker
  ON bronze.import_runtime_worker_counters (session_id, worker_name);
