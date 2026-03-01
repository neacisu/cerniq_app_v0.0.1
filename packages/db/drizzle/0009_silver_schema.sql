CREATE SCHEMA IF NOT EXISTS silver;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE enrichment_status AS ENUM ('pending', 'in_progress', 'complete', 'partial', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE promotion_status AS ENUM ('eligible', 'review_required', 'blocked', 'promoted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE company_status AS ENUM ('ACTIVA', 'INACTIVA', 'DIZOLVARE', 'RADIATA', 'INSOLVENTA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE forma_juridica AS ENUM ('SRL', 'SA', 'PFA', 'II', 'IF', 'SNC', 'SCS', 'ONG', 'COOP', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE dedup_status AS ENUM ('pending', 'auto_merged', 'hitl_pending', 'merged', 'rejected', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE location_type AS ENUM ('SEDIU_SOCIAL', 'PUNCT_LUCRU', 'SUCURSALA', 'DEPOZIT', 'FERMA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS silver.silver_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_bronze_id uuid REFERENCES bronze.bronze_contacts(id) ON DELETE SET NULL,
  cui varchar(32),
  cui_ro varchar(34) GENERATED ALWAYS AS (CASE WHEN cui IS NOT NULL THEN 'RO' || cui ELSE NULL END) STORED,
  denumire varchar(255),
  denumire_normalizata varchar(255) GENERATED ALWAYS AS (UPPER(TRIM(COALESCE(denumire, '')))) STORED,
  status_firma company_status,
  forma_juridica forma_juridica,
  cod_caen_principal varchar(8),
  coduri_caen_secundare jsonb NOT NULL DEFAULT '[]'::jsonb,
  email varchar(320),
  telefon varchar(32),
  website varchar(255),
  adresa text,
  judet varchar(100),
  localitate varchar(100),
  latitude numeric(10,7),
  longitude numeric(10,7),
  location_geography text,
  cifra_afaceri numeric(18,2),
  profit_net numeric(18,2),
  numar_angajati integer,
  risk_category varchar(16),
  enrichment_status enrichment_status NOT NULL DEFAULT 'pending',
  promotion_status promotion_status NOT NULL DEFAULT 'blocked',
  dedup_status dedup_status NOT NULL DEFAULT 'pending',
  completeness_score numeric(5,2),
  accuracy_score numeric(5,2),
  freshness_score numeric(5,2),
  total_quality_score numeric(5,2),
  last_enriched_at timestamptz,
  promoted_at timestamptz,
  promoted_to_gold_id uuid,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS silver.silver_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES silver.silver_companies(id) ON DELETE CASCADE,
  prenume varchar(120),
  nume varchar(120),
  nume_complet varchar(255) GENERATED ALWAYS AS (TRIM(COALESCE(prenume, '') || ' ' || COALESCE(nume, ''))) STORED,
  email varchar(320),
  email_normalized varchar(320) GENERATED ALWAYS AS (LOWER(TRIM(COALESCE(email, '')))) STORED,
  email_verified boolean NOT NULL DEFAULT false,
  telefon varchar(32),
  telefon_e164 varchar(32),
  whatsapp_number varchar(32),
  functie varchar(120),
  seniority varchar(50),
  is_decision_maker boolean NOT NULL DEFAULT false,
  linkedin_url varchar(500),
  legal_basis varchar(50),
  enrichment_status enrichment_status NOT NULL DEFAULT 'pending',
  is_primary boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS silver.silver_enrichment_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type varchar(32) NOT NULL,
  entity_id uuid NOT NULL,
  source varchar(50) NOT NULL,
  operation varchar(100) NOT NULL,
  request_payload jsonb,
  response_payload jsonb,
  fields_updated jsonb NOT NULL DEFAULT '[]'::jsonb,
  previous_values jsonb,
  new_values jsonb,
  correlation_id varchar(100),
  job_id varchar(100),
  duration_ms integer,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS silver.silver_dedup_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_a_id uuid NOT NULL REFERENCES silver.silver_companies(id) ON DELETE CASCADE,
  company_b_id uuid NOT NULL REFERENCES silver.silver_companies(id) ON DELETE CASCADE,
  name_similarity numeric(5,4),
  address_similarity numeric(5,4),
  cui_match boolean NOT NULL DEFAULT false,
  phone_match boolean NOT NULL DEFAULT false,
  overall_confidence numeric(5,4) NOT NULL,
  status dedup_status NOT NULL DEFAULT 'pending',
  master_company_id uuid REFERENCES silver.silver_companies(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS silver.silver_company_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES silver.silver_companies(id) ON DELETE CASCADE,
  tip_locatie location_type NOT NULL DEFAULT 'SEDIU_SOCIAL',
  adresa text NOT NULL,
  localitate varchar(100),
  judet varchar(100),
  latitude numeric(10,7),
  longitude numeric(10,7),
  location_geography text,
  suprafata_ha numeric(12,2),
  culturi jsonb NOT NULL DEFAULT '[]'::jsonb,
  source varchar(50),
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_silver_companies_cui_tenant ON silver.silver_companies(tenant_id, cui) WHERE cui IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_companies_enrichment ON silver.silver_companies(tenant_id, enrichment_status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_companies_promotion ON silver.silver_companies(tenant_id, promotion_status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_companies_status ON silver.silver_companies(status_firma);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_companies_caen ON silver.silver_companies(cod_caen_principal);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_companies_quality ON silver.silver_companies(total_quality_score);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_contacts_company ON silver.silver_contacts(company_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_silver_contacts_email_tenant ON silver.silver_contacts(tenant_id, email_normalized) WHERE email_normalized <> '';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_contacts_phone ON silver.silver_contacts(telefon_e164);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_contacts_primary ON silver.silver_contacts(company_id, is_primary);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_enrich_log_entity ON silver.silver_enrichment_log(tenant_id, entity_type, entity_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_enrich_log_source ON silver.silver_enrichment_log(source);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_enrich_log_correlation ON silver.silver_enrichment_log(correlation_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_enrich_log_job ON silver.silver_enrichment_log(job_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_silver_dedup_pair ON silver.silver_dedup_candidates(tenant_id, company_a_id, company_b_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_dedup_pending ON silver.silver_dedup_candidates(tenant_id, created_at) WHERE status = 'pending';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_locations_company ON silver.silver_company_locations(company_id);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION silver.silver_update_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION silver.silver_compute_geography()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.location_geography := CASE
    WHEN NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL
    THEN format('POINT(%s %s)', NEW.longitude, NEW.latitude)
    ELSE NULL
  END;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION silver.silver_compute_quality_score()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.completeness_score IS NOT NULL
    AND NEW.accuracy_score IS NOT NULL
    AND NEW.freshness_score IS NOT NULL THEN
    NEW.total_quality_score := (NEW.completeness_score * 0.40) + (NEW.accuracy_score * 0.35) + (NEW.freshness_score * 0.25);
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_silver_companies_timestamp ON silver.silver_companies;
--> statement-breakpoint
CREATE TRIGGER trg_silver_companies_timestamp
BEFORE UPDATE ON silver.silver_companies
FOR EACH ROW
EXECUTE FUNCTION silver.silver_update_timestamp();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_silver_companies_geo ON silver.silver_companies;
--> statement-breakpoint
CREATE TRIGGER trg_silver_companies_geo
BEFORE INSERT OR UPDATE OF latitude, longitude ON silver.silver_companies
FOR EACH ROW
EXECUTE FUNCTION silver.silver_compute_geography();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_silver_companies_quality ON silver.silver_companies;
--> statement-breakpoint
CREATE TRIGGER trg_silver_companies_quality
BEFORE INSERT OR UPDATE OF completeness_score, accuracy_score, freshness_score ON silver.silver_companies
FOR EACH ROW
EXECUTE FUNCTION silver.silver_compute_quality_score();
--> statement-breakpoint
ALTER TABLE silver.silver_companies ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE silver.silver_contacts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE silver.silver_enrichment_log ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE silver.silver_dedup_candidates ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE silver.silver_company_locations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE silver.silver_companies FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE silver.silver_contacts FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE silver.silver_enrichment_log FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE silver.silver_dedup_candidates FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE silver.silver_company_locations FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_silver_companies ON silver.silver_companies;
--> statement-breakpoint
CREATE POLICY tenant_isolation_silver_companies
ON silver.silver_companies
FOR ALL
USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_silver_contacts ON silver.silver_contacts;
--> statement-breakpoint
CREATE POLICY tenant_isolation_silver_contacts
ON silver.silver_contacts
FOR ALL
USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_silver_enrichment_log ON silver.silver_enrichment_log;
--> statement-breakpoint
CREATE POLICY tenant_isolation_silver_enrichment_log
ON silver.silver_enrichment_log
FOR ALL
USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_silver_dedup_candidates ON silver.silver_dedup_candidates;
--> statement-breakpoint
CREATE POLICY tenant_isolation_silver_dedup_candidates
ON silver.silver_dedup_candidates
FOR ALL
USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_silver_company_locations ON silver.silver_company_locations;
--> statement-breakpoint
CREATE POLICY tenant_isolation_silver_company_locations
ON silver.silver_company_locations
FOR ALL
USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
