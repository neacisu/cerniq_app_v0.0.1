-- Migration 0030: Phase 5 – Architectural Improvements
-- - 5.1  import_reprocess_sessions table
-- - 5.5  Missing foreign keys on bronze & silver
-- - 5.6  Composite indexes for legacy identity lookup
-- - 5.8  VARCHAR(20) → VARCHAR(32) alignment for extracted_nr_reg_com

-- ═══════════════════════════════════════════════════════════════════════════
-- 5.8  Fix VARCHAR mismatch: extracted_nr_reg_com was VARCHAR(20) in 0016,
--      Drizzle schema defines it as VARCHAR(32)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE bronze.bronze_contacts
  ALTER COLUMN extracted_nr_reg_com TYPE varchar(32);
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- 5.5  Missing Foreign Keys
-- ═══════════════════════════════════════════════════════════════════════════

-- bronze_contacts.duplicate_of_id → self-FK
DO $$ BEGIN
  ALTER TABLE bronze.bronze_contacts
    ADD CONSTRAINT fk_bronze_contacts_duplicate_of
    FOREIGN KEY (duplicate_of_id) REFERENCES bronze.bronze_contacts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- bronze_contacts.resolved_company_id → silver.silver_companies.id
DO $$ BEGIN
  ALTER TABLE bronze.bronze_contacts
    ADD CONSTRAINT fk_bronze_contacts_resolved_company
    FOREIGN KEY (resolved_company_id) REFERENCES silver.silver_companies(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- bronze_contacts.promoted_to_silver_id → silver.silver_companies.id
DO $$ BEGIN
  ALTER TABLE bronze.bronze_contacts
    ADD CONSTRAINT fk_bronze_contacts_promoted_to_silver
    FOREIGN KEY (promoted_to_silver_id) REFERENCES silver.silver_companies(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- silver_companies.master_record_id → self-FK
DO $$ BEGIN
  ALTER TABLE silver.silver_companies
    ADD CONSTRAINT fk_silver_companies_master_record
    FOREIGN KEY (master_record_id) REFERENCES silver.silver_companies(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- silver_companies.promoted_to_gold_id → gold.gold_companies.id
DO $$ BEGIN
  ALTER TABLE silver.silver_companies
    ADD CONSTRAINT fk_silver_companies_promoted_to_gold
    FOREIGN KEY (promoted_to_gold_id) REFERENCES gold.gold_companies(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- 5.6  Composite indexes for legacy identity lookup (non-partial)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_silver_companies_tenant_cui_lookup
  ON silver.silver_companies(tenant_id, cui);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_silver_companies_tenant_nrregcom_lookup
  ON silver.silver_companies(tenant_id, nr_reg_com);
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- 5.1  import_reprocess_sessions table
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE reprocess_type AS ENUM ('identity', 'promotion', 'anaf');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE reprocess_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS bronze.import_reprocess_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  batch_id uuid NOT NULL REFERENCES bronze.bronze_import_batches(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type reprocess_type NOT NULL,
  status reprocess_status NOT NULL DEFAULT 'pending',
  phase varchar(50),
  cursor_created_at timestamptz,
  cursor_last_bronze_id uuid,
  processed_rows integer NOT NULL DEFAULT 0,
  total_rows integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  last_error text,
  last_progress_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_reprocess_sessions_batch
  ON bronze.import_reprocess_sessions(batch_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_reprocess_sessions_tenant_status
  ON bronze.import_reprocess_sessions(tenant_id, status);
--> statement-breakpoint

-- RLS for import_reprocess_sessions
ALTER TABLE bronze.import_reprocess_sessions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE bronze.import_reprocess_sessions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS tenant_isolation_import_reprocess_sessions
  ON bronze.import_reprocess_sessions;
--> statement-breakpoint

CREATE POLICY tenant_isolation_import_reprocess_sessions
  ON bronze.import_reprocess_sessions
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
