CREATE SCHEMA IF NOT EXISTS gold;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE risk_category AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE contact_role AS ENUM ('ADMINISTRATOR', 'ACTIONAR', 'CONTACT', 'ASOCIAT', 'REPREZENTANT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE error_severity AS ENUM ('warning', 'error', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS gold.gold_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  silver_id uuid NOT NULL REFERENCES silver.silver_companies(id) ON DELETE RESTRICT,
  bronze_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  cui varchar(32),
  cui_ro varchar(34) GENERATED ALWAYS AS (CASE WHEN cui IS NOT NULL THEN 'RO' || cui ELSE NULL END) STORED,
  denumire varchar(255),
  status_firma varchar(30),
  categorie_dimensiune varchar(30),
  cod_caen_principal varchar(8),
  adresa text,
  judet_cod varchar(10),
  latitude numeric(10,7),
  longitude numeric(10,7),
  location_geography text,
  cifra_afaceri numeric(18,2),
  profit_net numeric(18,2),
  numar_angajati integer,
  fit_score numeric(5,2),
  engagement_score numeric(5,2),
  intent_score numeric(5,2),
  lead_score numeric(5,2),
  current_state varchar(30) NOT NULL DEFAULT 'COLD',
  previous_state varchar(30),
  state_changed_at timestamptz NOT NULL DEFAULT now(),
  state_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  do_not_contact boolean NOT NULL DEFAULT false,
  customer_status varchar(30) DEFAULT 'PROSPECT',
  ai_embedding jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_gold_state CHECK (
    current_state IN (
      'COLD','CONTACTED_WA','CONTACTED_EMAIL','CONTACTED_PHONE','WARM_REPLY',
      'ENGAGED','NEGOTIATION','PROPOSAL','CLOSING','CONVERTED',
      'ONBOARDING','NURTURING_ACTIVE','AT_RISK','LOYAL_ADVOCATE',
      'CHURNED','DEAD','DO_NOT_CONTACT'
    )
  ),
  CONSTRAINT chk_gold_lead_score CHECK (lead_score IS NULL OR (lead_score BETWEEN 0 AND 100))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS gold.gold_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  role contact_role DEFAULT 'CONTACT',
  prenume varchar(120),
  nume varchar(120),
  nume_complet varchar(255) GENERATED ALWAYS AS (TRIM(COALESCE(prenume, '') || ' ' || COALESCE(nume, ''))) STORED,
  email varchar(320),
  email_verified boolean NOT NULL DEFAULT false,
  telefon varchar(32),
  telefon_verified boolean NOT NULL DEFAULT false,
  whatsapp_number varchar(32),
  consent_given boolean NOT NULL DEFAULT false,
  preferred_channel varchar(30),
  preferred_time varchar(30),
  total_messages_sent integer NOT NULL DEFAULT 0,
  total_responses integer NOT NULL DEFAULT 0,
  response_rate numeric(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_messages_sent > 0 THEN (total_responses::numeric / total_messages_sent::numeric) * 100 ELSE 0 END
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS gold.gold_lead_journey (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  event_type varchar(80) NOT NULL,
  from_state varchar(30),
  to_state varchar(30),
  channel varchar(30),
  subject varchar(255),
  content_preview text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  performed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  correlation_id varchar(100),
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS gold.daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stat_date date NOT NULL,
  pipeline_stage varchar(10) NOT NULL DEFAULT 'E1',
  bronze_total integer NOT NULL DEFAULT 0,
  silver_total integer NOT NULL DEFAULT 0,
  gold_total integer NOT NULL DEFAULT 0,
  avg_quality_score numeric(5,2),
  avg_lead_score numeric(5,2),
  hitl_pending integer NOT NULL DEFAULT 0,
  hitl_completed integer NOT NULL DEFAULT 0,
  enrichment_jobs_completed integer NOT NULL DEFAULT 0,
  enrichment_jobs_failed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_daily_stats UNIQUE (tenant_id, stat_date, pipeline_stage)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS gold.pipeline_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pipeline_stage varchar(10) NOT NULL,
  worker_name varchar(100) NOT NULL,
  job_id varchar(100),
  entity_type varchar(50),
  entity_id uuid,
  error_type varchar(50) NOT NULL,
  error_message text NOT NULL,
  error_stack text,
  severity error_severity NOT NULL DEFAULT 'error',
  recovery_action varchar(50),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_gold_companies_cui_tenant ON gold.gold_companies(tenant_id, cui);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gold_companies_lead_score ON gold.gold_companies(lead_score);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gold_companies_state ON gold.gold_companies(current_state);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gold_contacts_company ON gold.gold_contacts(company_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gold_journey_company ON gold.gold_lead_journey(company_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_pipeline_errors_stage ON gold.pipeline_errors(pipeline_stage, severity);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION gold.gold_log_state_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.current_state IS DISTINCT FROM OLD.current_state THEN
    NEW.previous_state := OLD.current_state;
    NEW.state_changed_at := now();
    NEW.state_history := COALESCE(OLD.state_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'from', OLD.current_state,
        'to', NEW.current_state,
        'at', now()
      )
    );
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION gold.gold_compute_lead_score()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.fit_score IS NOT NULL
    AND NEW.engagement_score IS NOT NULL
    AND NEW.intent_score IS NOT NULL THEN
    NEW.lead_score := (NEW.fit_score * 0.40) + (NEW.engagement_score * 0.35) + (NEW.intent_score * 0.25);
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_gold_companies_state_transition ON gold.gold_companies;
--> statement-breakpoint
CREATE TRIGGER trg_gold_companies_state_transition
BEFORE UPDATE OF current_state ON gold.gold_companies
FOR EACH ROW
EXECUTE FUNCTION gold.gold_log_state_transition();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_gold_companies_lead_score ON gold.gold_companies;
--> statement-breakpoint
CREATE TRIGGER trg_gold_companies_lead_score
BEFORE INSERT OR UPDATE OF fit_score, engagement_score, intent_score ON gold.gold_companies
FOR EACH ROW
EXECUTE FUNCTION gold.gold_compute_lead_score();
--> statement-breakpoint
ALTER TABLE gold.gold_companies ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE gold.gold_contacts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE gold.gold_lead_journey ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE gold.daily_stats ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE gold.pipeline_errors ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE gold.gold_companies FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE gold.gold_contacts FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE gold.gold_lead_journey FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE gold.daily_stats FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE gold.pipeline_errors FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_gold_companies ON gold.gold_companies;
--> statement-breakpoint
CREATE POLICY tenant_isolation_gold_companies
ON gold.gold_companies
FOR ALL
USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_gold_contacts ON gold.gold_contacts;
--> statement-breakpoint
CREATE POLICY tenant_isolation_gold_contacts
ON gold.gold_contacts
FOR ALL
USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_gold_lead_journey ON gold.gold_lead_journey;
--> statement-breakpoint
CREATE POLICY tenant_isolation_gold_lead_journey
ON gold.gold_lead_journey
FOR ALL
USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_daily_stats ON gold.daily_stats;
--> statement-breakpoint
CREATE POLICY tenant_isolation_daily_stats
ON gold.daily_stats
FOR ALL
USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_pipeline_errors ON gold.pipeline_errors;
--> statement-breakpoint
CREATE POLICY tenant_isolation_pipeline_errors
ON gold.pipeline_errors
FOR ALL
USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
