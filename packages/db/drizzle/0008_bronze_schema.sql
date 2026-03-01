CREATE SCHEMA IF NOT EXISTS bronze;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE bronze_source_type AS ENUM ('csv_import', 'webhook', 'scrape', 'manual', 'api', 'excel_import');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE bronze_processing_status AS ENUM ('pending', 'processing', 'promoted', 'rejected', 'error');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE import_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS bronze.bronze_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_type bronze_source_type NOT NULL,
  raw_payload jsonb NOT NULL,
  content_hash varchar(64) NOT NULL,
  processing_status bronze_processing_status NOT NULL DEFAULT 'pending',
  extracted_cui varchar(32),
  extracted_email varchar(320),
  extracted_phone varchar(32),
  extracted_name varchar(255),
  is_duplicate boolean NOT NULL DEFAULT false,
  duplicate_of_id uuid,
  promoted_to_silver_id uuid,
  do_not_process boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS bronze.bronze_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  filename varchar(255) NOT NULL,
  file_size_bytes integer NOT NULL,
  file_checksum varchar(64),
  total_rows integer NOT NULL DEFAULT 0,
  processed_rows integer NOT NULL DEFAULT 0,
  success_rows integer NOT NULL DEFAULT 0,
  error_rows integer NOT NULL DEFAULT 0,
  duplicate_rows integer NOT NULL DEFAULT 0,
  status import_status NOT NULL DEFAULT 'pending',
  imported_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS bronze.bronze_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  webhook_type varchar(100) NOT NULL,
  source_ip inet,
  request_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_body jsonb NOT NULL,
  signature_header text,
  signature_valid boolean NOT NULL DEFAULT false,
  processed_contact_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  processing_status bronze_processing_status NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS bronze.bronze_scrape_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  source_domain varchar(255) NOT NULL,
  scrape_type varchar(100) NOT NULL,
  raw_html text,
  extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score integer,
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  processing_status bronze_processing_status NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_contacts_tenant_status ON bronze.bronze_contacts(tenant_id, processing_status);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_bronze_contacts_hash_unique ON bronze.bronze_contacts(tenant_id, content_hash) WHERE is_duplicate = false;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_contacts_pending ON bronze.bronze_contacts(tenant_id, created_at) WHERE processing_status = 'pending';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_contacts_cui ON bronze.bronze_contacts(extracted_cui);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_contacts_email ON bronze.bronze_contacts(extracted_email);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_contacts_source ON bronze.bronze_contacts(source_type);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_contacts_payload_gin ON bronze.bronze_contacts USING gin(raw_payload);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_contacts_promoted ON bronze.bronze_contacts(promoted_to_silver_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_batches_tenant ON bronze.bronze_import_batches(tenant_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_batches_status ON bronze.bronze_import_batches(status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_webhooks_tenant ON bronze.bronze_webhooks(tenant_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_webhooks_type ON bronze.bronze_webhooks(webhook_type);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_webhooks_pending ON bronze.bronze_webhooks(created_at) WHERE processing_status = 'pending';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_scrape_tenant ON bronze.bronze_scrape_results(tenant_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_scrape_domain ON bronze.bronze_scrape_results(source_domain);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_scrape_pending ON bronze.bronze_scrape_results(created_at) WHERE processing_status = 'pending';
--> statement-breakpoint
CREATE OR REPLACE FUNCTION bronze.bronze_prevent_modification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'bronze_contacts rows are immutable and cannot be deleted';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.raw_payload IS DISTINCT FROM OLD.raw_payload THEN
    RAISE EXCEPTION 'bronze_contacts.raw_payload is immutable';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION bronze.bronze_extract_identifiers()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.extracted_email IS NULL THEN
    NEW.extracted_email := LOWER(COALESCE(NEW.raw_payload->>'email', NEW.raw_payload->>'emailAddress'));
  END IF;
  IF NEW.extracted_phone IS NULL THEN
    NEW.extracted_phone := COALESCE(NEW.raw_payload->>'phone', NEW.raw_payload->>'telefon');
  END IF;
  IF NEW.extracted_name IS NULL THEN
    NEW.extracted_name := COALESCE(
      NEW.raw_payload->>'name',
      NEW.raw_payload->>'company',
      NEW.raw_payload->>'denumire'
    );
  END IF;
  IF NEW.extracted_cui IS NULL THEN
    NEW.extracted_cui := COALESCE(NEW.raw_payload->>'cui', NEW.raw_payload->>'CUI');
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION bronze.bronze_compute_content_hash(p_payload jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(digest(coalesce(p_payload::text, ''), 'sha256'), 'hex');
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION bronze.bronze_check_duplicate(p_tenant_id uuid, p_payload jsonb)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id
  FROM bronze.bronze_contacts
  WHERE tenant_id = p_tenant_id
    AND content_hash = bronze.bronze_compute_content_hash(p_payload)
    AND is_duplicate = false
  ORDER BY created_at DESC
  LIMIT 1;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION bronze.bronze_get_stats(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'total', count(*),
    'pending', count(*) FILTER (WHERE processing_status = 'pending'),
    'processing', count(*) FILTER (WHERE processing_status = 'processing'),
    'promoted', count(*) FILTER (WHERE processing_status = 'promoted'),
    'rejected', count(*) FILTER (WHERE processing_status = 'rejected'),
    'error', count(*) FILTER (WHERE processing_status = 'error')
  )
  FROM bronze.bronze_contacts
  WHERE tenant_id = p_tenant_id;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION bronze.bronze_cleanup_old_data()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM bronze.bronze_scrape_results
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_bronze_contacts_immutable ON bronze.bronze_contacts;
--> statement-breakpoint
CREATE TRIGGER trg_bronze_contacts_immutable
BEFORE UPDATE OR DELETE ON bronze.bronze_contacts
FOR EACH ROW
EXECUTE FUNCTION bronze.bronze_prevent_modification();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_bronze_contacts_extract ON bronze.bronze_contacts;
--> statement-breakpoint
CREATE TRIGGER trg_bronze_contacts_extract
BEFORE INSERT OR UPDATE ON bronze.bronze_contacts
FOR EACH ROW
EXECUTE FUNCTION bronze.bronze_extract_identifiers();
--> statement-breakpoint
ALTER TABLE bronze.bronze_contacts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE bronze.bronze_contacts FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_bronze_contacts ON bronze.bronze_contacts;
--> statement-breakpoint
CREATE POLICY tenant_isolation_bronze_contacts
ON bronze.bronze_contacts
FOR ALL
USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE bronze.bronze_import_batches ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE bronze.bronze_import_batches FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_bronze_import_batches ON bronze.bronze_import_batches;
--> statement-breakpoint
CREATE POLICY tenant_isolation_bronze_import_batches
ON bronze.bronze_import_batches
FOR ALL
USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE bronze.bronze_webhooks ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE bronze.bronze_webhooks FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_bronze_webhooks ON bronze.bronze_webhooks;
--> statement-breakpoint
CREATE POLICY tenant_isolation_bronze_webhooks
ON bronze.bronze_webhooks
FOR ALL
USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE bronze.bronze_scrape_results ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE bronze.bronze_scrape_results FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_bronze_scrape_results ON bronze.bronze_scrape_results;
--> statement-breakpoint
CREATE POLICY tenant_isolation_bronze_scrape_results
ON bronze.bronze_scrape_results
FOR ALL
USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
