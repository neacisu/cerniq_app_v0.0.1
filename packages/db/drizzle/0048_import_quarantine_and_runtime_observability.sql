-- Migration 0048: import quarantine, runtime observability extensions, and
-- source-identifier repair audit scaffolding.

ALTER TABLE bronze.job_logs
  ADD COLUMN IF NOT EXISTS session_id UUID,
  ADD COLUMN IF NOT EXISTS runtime_job_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS parent_runtime_job_key VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_job_logs_batch_session_created
  ON bronze.job_logs (batch_id, session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_job_logs_runtime_job_key
  ON bronze.job_logs (tenant_id, runtime_job_key);

CREATE TABLE IF NOT EXISTS bronze.import_row_quarantine (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES bronze.bronze_import_batches(id) ON DELETE CASCADE,
  session_id UUID REFERENCES bronze.import_runtime_sessions(id) ON DELETE SET NULL,
  runtime_job_key VARCHAR(255),
  source_type public.bronze_source_type NOT NULL,
  source_identifier VARCHAR(500) NOT NULL,
  sheet_name VARCHAR(255),
  worksheet_row INTEGER,
  global_row INTEGER,
  field_name VARCHAR(255),
  reason_code VARCHAR(80) NOT NULL,
  row_payload_escaped JSONB NOT NULL,
  sanitized_payload JSONB,
  violations JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_row_quarantine_batch
  ON bronze.import_row_quarantine (batch_id, created_at);

CREATE INDEX IF NOT EXISTS idx_import_row_quarantine_session
  ON bronze.import_row_quarantine (session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_import_row_quarantine_reason
  ON bronze.import_row_quarantine (reason_code, created_at);

CREATE INDEX IF NOT EXISTS idx_import_row_quarantine_source_identifier
  ON bronze.import_row_quarantine (tenant_id, source_identifier);

CREATE TABLE IF NOT EXISTS bronze.source_identifier_repair_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_run_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES bronze.bronze_import_batches(id) ON DELETE SET NULL,
  source_identifier VARCHAR(500) NOT NULL,
  canonical_bronze_id UUID REFERENCES bronze.bronze_contacts(id) ON DELETE SET NULL,
  duplicate_bronze_id UUID REFERENCES bronze.bronze_contacts(id) ON DELETE SET NULL,
  classification VARCHAR(40) NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_source_identifier_repair_run
  ON bronze.source_identifier_repair_audit (repair_run_id, created_at);

CREATE INDEX IF NOT EXISTS idx_source_identifier_repair_source
  ON bronze.source_identifier_repair_audit (tenant_id, source_identifier);

CREATE INDEX IF NOT EXISTS idx_source_identifier_repair_classification
  ON bronze.source_identifier_repair_audit (classification, created_at);

CREATE INDEX IF NOT EXISTS idx_bronze_contacts_source_identifier
  ON bronze.bronze_contacts (tenant_id, source_identifier);
