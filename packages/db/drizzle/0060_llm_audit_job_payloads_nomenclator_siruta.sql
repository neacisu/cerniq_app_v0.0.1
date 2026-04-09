-- FAZA 15 (Plan §XV): audit_llm_calls, job_payloads, nomenclator_siruta.
-- NOTĂ: gold_organizations / gold_affiliations (plan) sunt deja modelate ca gold.gold_associations + gold.gold_affiliations (0052, gold-e5-*).
-- RLS: audit_llm_calls, job_payloads — același pattern ca audit.approval_audit_log (app.tenant_id).
-- nomenclator_siruta: date naționale de referință, fără tenant_id, fără RLS.
--
-- RLS tenant: un singur punct pentru `current_setting('app.tenant_id', true)::uuid`
-- (politici și Sonar plsql:S1192). Reutilizat în migrații ulterioare (ex. 0062).

CREATE OR REPLACE FUNCTION public.cerniq_app_session_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $fn$
  SELECT current_setting('app.tenant_id', true)::uuid;
$fn$;
--> statement-breakpoint
COMMENT ON FUNCTION public.cerniq_app_session_tenant_id() IS
  'UUID tenant din sesiunea PostgreSQL (SET app.tenant_id); folosit în politici RLS.';
--> statement-breakpoint
CREATE TYPE siruta_locality_type_enum AS ENUM (
  'JUDET',
  'MUNICIPIU',
  'ORAS',
  'COMUNA',
  'SAT'
);
--> statement-breakpoint
CREATE TYPE siruta_mediul_enum AS ENUM ('U', 'R');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS audit.audit_llm_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  worker_queue varchar(256) NOT NULL,
  model_used varchar(256) NOT NULL,
  is_selfhosted boolean NOT NULL DEFAULT false,
  provider varchar(64) NOT NULL,
  fallback_reason text,
  prompt_hash varchar(64) NOT NULL,
  tokens_input integer NOT NULL DEFAULT 0,
  tokens_output integer NOT NULL DEFAULT 0,
  latency_ms integer NOT NULL,
  cost_usd numeric(10, 6) NOT NULL DEFAULT 0,
  guardrail_passed boolean NOT NULL DEFAULT true,
  llmguard_scores jsonb,
  guardrail_violations jsonb,
  regeneration_attempt integer NOT NULL DEFAULT 0,
  all_responses jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_audit_llm_calls_tenant_created
  ON audit.audit_llm_calls (tenant_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_audit_llm_calls_tenant_model_created
  ON audit.audit_llm_calls (tenant_id, model_used, created_at DESC);
--> statement-breakpoint
ALTER TABLE audit.audit_llm_calls ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE audit.audit_llm_calls FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_audit_audit_llm_calls ON audit.audit_llm_calls;
--> statement-breakpoint
CREATE POLICY tenant_isolation_audit_audit_llm_calls ON audit.audit_llm_calls FOR SELECT USING (tenant_id = public.cerniq_app_session_tenant_id());
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_insert_audit_audit_llm_calls ON audit.audit_llm_calls;
--> statement-breakpoint
CREATE POLICY tenant_insert_audit_audit_llm_calls ON audit.audit_llm_calls FOR INSERT WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_update_audit_audit_llm_calls ON audit.audit_llm_calls;
--> statement-breakpoint
CREATE POLICY tenant_update_audit_audit_llm_calls ON audit.audit_llm_calls FOR UPDATE USING (tenant_id = public.cerniq_app_session_tenant_id()) WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_delete_audit_audit_llm_calls ON audit.audit_llm_calls;
--> statement-breakpoint
CREATE POLICY tenant_delete_audit_audit_llm_calls ON audit.audit_llm_calls FOR DELETE USING (tenant_id = public.cerniq_app_session_tenant_id());
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.job_payloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_job_payloads_tenant_created ON public.job_payloads (tenant_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_job_payloads_expires_at ON public.job_payloads (expires_at);
--> statement-breakpoint
ALTER TABLE public.job_payloads ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.job_payloads FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_public_job_payloads ON public.job_payloads;
--> statement-breakpoint
CREATE POLICY tenant_isolation_public_job_payloads ON public.job_payloads FOR SELECT USING (tenant_id = public.cerniq_app_session_tenant_id());
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_insert_public_job_payloads ON public.job_payloads;
--> statement-breakpoint
CREATE POLICY tenant_insert_public_job_payloads ON public.job_payloads FOR INSERT WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_update_public_job_payloads ON public.job_payloads;
--> statement-breakpoint
CREATE POLICY tenant_update_public_job_payloads ON public.job_payloads FOR UPDATE USING (tenant_id = public.cerniq_app_session_tenant_id()) WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_delete_public_job_payloads ON public.job_payloads;
--> statement-breakpoint
CREATE POLICY tenant_delete_public_job_payloads ON public.job_payloads FOR DELETE USING (tenant_id = public.cerniq_app_session_tenant_id());
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.nomenclator_siruta (
  cod_siruta integer PRIMARY KEY,
  denumire text NOT NULL,
  tip siruta_locality_type_enum NOT NULL,
  judet varchar(64),
  mediu siruta_mediul_enum NOT NULL,
  cod_judet smallint
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_nomenclator_siruta_judet ON public.nomenclator_siruta (cod_judet);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_nomenclator_siruta_denumire ON public.nomenclator_siruta (denumire);
