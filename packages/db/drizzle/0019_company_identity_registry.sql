DO $$ BEGIN
  CREATE TYPE bronze_identity_status AS ENUM (
    'unresolved',
    'resolved',
    'duplicate_source',
    'identity_conflict',
    'insufficient_identifiers'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE silver_identity_status AS ENUM (
    'resolved',
    'partial',
    'identity_conflict'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE company_identity_key_type AS ENUM ('cui', 'nr_reg_com');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE company_identity_source_authority AS ENUM ('import', 'anaf', 'onrc', 'manual', 'migration');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE approval_type ADD VALUE IF NOT EXISTS 'identity_conflict';
--> statement-breakpoint
ALTER TABLE bronze.bronze_contacts
  ADD COLUMN IF NOT EXISTS source_payload_hash varchar(64);
--> statement-breakpoint
ALTER TABLE bronze.bronze_contacts
  ADD COLUMN IF NOT EXISTS extracted_cui_raw varchar(64);
--> statement-breakpoint
ALTER TABLE bronze.bronze_contacts
  ADD COLUMN IF NOT EXISTS extracted_nr_reg_com_raw varchar(32);
--> statement-breakpoint
ALTER TABLE bronze.bronze_contacts
  ADD COLUMN IF NOT EXISTS identity_status bronze_identity_status NOT NULL DEFAULT 'unresolved';
--> statement-breakpoint
ALTER TABLE bronze.bronze_contacts
  ADD COLUMN IF NOT EXISTS resolved_company_id uuid;
--> statement-breakpoint
ALTER TABLE bronze.bronze_contacts
  ADD COLUMN IF NOT EXISTS identity_resolution_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint
UPDATE bronze.bronze_contacts
SET source_payload_hash = content_hash
WHERE source_payload_hash IS NULL;
--> statement-breakpoint
ALTER TABLE bronze.bronze_contacts
  ALTER COLUMN source_payload_hash SET NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS bronze.idx_bronze_contacts_hash_unique;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_contacts_source_payload_hash
  ON bronze.bronze_contacts(tenant_id, source_payload_hash);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_contacts_identity_status
  ON bronze.bronze_contacts(tenant_id, identity_status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_contacts_resolved_company
  ON bronze.bronze_contacts(resolved_company_id)
  WHERE resolved_company_id IS NOT NULL;
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS nr_reg_com_original varchar(32);
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS identity_status silver_identity_status NOT NULL DEFAULT 'partial';
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS identity_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_companies_identity_status
  ON silver.silver_companies(tenant_id, identity_status);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS silver.company_identity_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES silver.silver_companies(id) ON DELETE CASCADE,
  key_type company_identity_key_type NOT NULL,
  key_value_canonical varchar(64) NOT NULL,
  key_value_original varchar(64),
  source_authority company_identity_source_authority NOT NULL DEFAULT 'import',
  is_authoritative boolean NOT NULL DEFAULT false,
  source_bronze_id uuid REFERENCES bronze.bronze_contacts(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_identity_keys_unique_active
  ON silver.company_identity_keys(tenant_id, key_type, key_value_canonical)
  WHERE revoked_at IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_company_identity_keys_company
  ON silver.company_identity_keys(company_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_company_identity_keys_lookup
  ON silver.company_identity_keys(tenant_id, key_type, key_value_canonical);
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_company_identity_keys_timestamp ON silver.company_identity_keys;
--> statement-breakpoint
CREATE TRIGGER trg_company_identity_keys_timestamp
BEFORE UPDATE ON silver.company_identity_keys
FOR EACH ROW
EXECUTE FUNCTION silver.silver_update_timestamp();
--> statement-breakpoint
ALTER TABLE silver.company_identity_keys ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE silver.company_identity_keys FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_company_identity_keys ON silver.company_identity_keys;
--> statement-breakpoint
CREATE POLICY tenant_isolation_company_identity_keys
ON silver.company_identity_keys
FOR ALL
USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
