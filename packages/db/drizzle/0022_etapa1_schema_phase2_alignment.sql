ALTER TABLE bronze.bronze_contacts
ADD COLUMN IF NOT EXISTS source_identifier varchar(500);
--> statement-breakpoint
UPDATE bronze.bronze_contacts
SET source_identifier = COALESCE(
  NULLIF(metadata->>'sourceIdentifier', ''),
  NULLIF(metadata->>'storedPath', ''),
  NULLIF(metadata->>'sourceUrl', ''),
  NULLIF(metadata->>'filename', ''),
  CASE source_type
    WHEN 'csv_import' THEN 'csv_import:' || id::text
    WHEN 'excel_import' THEN 'excel_import:' || id::text
    WHEN 'webhook' THEN 'webhook:' || id::text
    WHEN 'scrape' THEN 'scrape:' || id::text
    WHEN 'manual' THEN 'manual:' || id::text
    WHEN 'api' THEN 'api:' || id::text
    ELSE 'unknown:' || id::text
  END,
  'unknown:' || id::text
)
WHERE source_identifier IS NULL;
--> statement-breakpoint
ALTER TABLE bronze.bronze_contacts
ALTER COLUMN source_identifier SET NOT NULL;
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

  IF TG_OP = 'UPDATE' AND NEW.source_identifier IS DISTINCT FROM OLD.source_identifier THEN
    RAISE EXCEPTION 'bronze_contacts.source_identifier is immutable';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.user_consent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_identifier text NOT NULL,
  consent_version integer NOT NULL DEFAULT 1,
  consent_categories jsonb NOT NULL,
  banner_version varchar(50) NOT NULL,
  consent_given_at timestamptz NOT NULL DEFAULT now(),
  consent_expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 months'),
  consent_withdrawn_at timestamptz,
  consent_ip_hash text NOT NULL,
  user_agent text,
  consent_method varchar(30) NOT NULL DEFAULT 'banner',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_categories CHECK (
    consent_categories ? 'necessary' AND
    (consent_categories->>'necessary')::boolean = true
  )
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_consent_user
  ON public.user_consent_logs(user_id)
  WHERE user_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_consent_identifier
  ON public.user_consent_logs(user_identifier);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_consent_tenant
  ON public.user_consent_logs(tenant_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_consent_expires
  ON public.user_consent_logs(consent_expires_at);
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_consent_logs_updated_at ON public.user_consent_logs;
--> statement-breakpoint
CREATE TRIGGER user_consent_logs_updated_at
  BEFORE UPDATE ON public.user_consent_logs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
--> statement-breakpoint
ALTER TABLE public.user_consent_logs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.user_consent_logs FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_user_consent_logs ON public.user_consent_logs;
--> statement-breakpoint
CREATE POLICY tenant_isolation_user_consent_logs
ON public.user_consent_logs
FOR ALL
USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE silver.silver_companies
ALTER COLUMN location_geography TYPE geography(POINT, 4326)
USING location_geography::geography;
--> statement-breakpoint
ALTER TABLE silver.silver_company_locations
ALTER COLUMN location_geography TYPE geography(POINT, 4326)
USING location_geography::geography;
--> statement-breakpoint
ALTER TABLE gold.gold_companies
ALTER COLUMN location_geography TYPE geography(POINT, 4326)
USING location_geography::geography;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION silver.silver_compute_geography()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.location_geography := CASE
    WHEN NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL
    THEN ST_SetSRID(ST_MakePoint(NEW.longitude::double precision, NEW.latitude::double precision), 4326)::geography
    ELSE NULL
  END;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION gold.gold_compute_geography()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.location_geography := CASE
    WHEN NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL
    THEN ST_SetSRID(ST_MakePoint(NEW.longitude::double precision, NEW.latitude::double precision), 4326)::geography
    ELSE NULL
  END;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_gold_companies_geo ON gold.gold_companies;
--> statement-breakpoint
CREATE TRIGGER trg_gold_companies_geo
BEFORE INSERT OR UPDATE OF latitude, longitude ON gold.gold_companies
FOR EACH ROW
EXECUTE FUNCTION gold.gold_compute_geography();
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_companies_location_geography
  ON silver.silver_companies USING gist (location_geography);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_company_locations_location_geography
  ON silver.silver_company_locations USING gist (location_geography);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gold_companies_location_geography
  ON gold.gold_companies USING gist (location_geography);
--> statement-breakpoint
DROP INDEX IF EXISTS idx_silver_companies_denumire_trgm;
--> statement-breakpoint
ALTER TABLE silver.silver_companies
DROP COLUMN IF EXISTS denumire_normalizata;
--> statement-breakpoint
ALTER TABLE silver.silver_companies
ADD COLUMN denumire_normalizata varchar(255)
GENERATED ALWAYS AS (UPPER(TRIM(REGEXP_REPLACE(COALESCE(denumire, ''), '\s+', ' ', 'g')))) STORED;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_companies_denumire_trgm
  ON silver.silver_companies
  USING gin (denumire_normalizata gin_trgm_ops);
--> statement-breakpoint
ALTER TABLE gold.gold_companies
DROP COLUMN IF EXISTS is_agricultural;
--> statement-breakpoint
ALTER TABLE gold.gold_companies
ADD COLUMN is_agricultural boolean
GENERATED ALWAYS AS (
  cod_caen_principal LIKE '01%' OR
  cod_caen_principal LIKE '02%' OR
  cod_caen_principal LIKE '03%'
) STORED;
--> statement-breakpoint
ALTER TABLE gold.gold_companies
DROP CONSTRAINT IF EXISTS chk_gold_coords_romania;
--> statement-breakpoint
ALTER TABLE gold.gold_companies
ADD CONSTRAINT chk_gold_coords_romania CHECK (
  (latitude IS NULL AND longitude IS NULL) OR
  (latitude BETWEEN 43.5 AND 48.5 AND longitude BETWEEN 20 AND 30)
);
