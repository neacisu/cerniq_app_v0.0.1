-- FAZA 15 (Plan §XXI): integrări — config, credențiale criptate, health events, politici retenție.
-- Schema nouă `integration`. Credențiale: doar ciphertext (OpenBao Transit); niciodată plain text.
-- RLS: `public.cerniq_app_session_tenant_id()` definită în 0060_llm_audit_job_payloads_nomenclator_siruta.sql (migrațiile rulează în ordine).

CREATE SCHEMA IF NOT EXISTS integration;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS integration.integration_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  provider varchar(32) NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  rate_limit_override jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_integration_configs_tenant_provider UNIQUE (tenant_id, provider),
  CONSTRAINT chk_integration_configs_provider CHECK (
    provider IN (
      'anaf',
      'termene',
      'onrc',
      'hunter',
      'zerobounce',
      'timelinesai',
      'instantly',
      'oblio',
      'sameday',
      'docusign'
    )
  )
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_integration_configs_tenant_active ON integration.integration_configs (tenant_id, active);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS integration.integration_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  integration_config_id uuid REFERENCES integration.integration_configs (id) ON DELETE SET NULL,
  credential_type varchar(24) NOT NULL,
  encrypted_value text NOT NULL,
  expires_at timestamptz,
  last_rotated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_integration_credentials_type CHECK (
    credential_type IN ('API_KEY', 'OAUTH_TOKEN', 'BEARER', 'BASIC_AUTH')
  )
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_integration_credentials_tenant ON integration.integration_credentials (tenant_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_integration_credentials_config ON integration.integration_credentials (integration_config_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS integration.integration_health_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider varchar(32) NOT NULL,
  status varchar(16) NOT NULL,
  latency_ms integer,
  error_message text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb,
  CONSTRAINT chk_integration_health_status CHECK (status IN ('HEALTHY', 'DEGRADED', 'DOWN'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_integration_health_provider_checked ON integration.integration_health_events (provider, checked_at DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS integration.audit_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  data_type varchar(64) NOT NULL,
  retention_days integer NOT NULL,
  anonymize_after_days integer,
  auto_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_audit_retention_tenant_datatype UNIQUE (tenant_id, data_type)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_audit_retention_tenant ON integration.audit_retention_policies (tenant_id);
--> statement-breakpoint
ALTER TABLE integration.integration_configs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE integration.integration_configs FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_integration_configs ON integration.integration_configs;
--> statement-breakpoint
CREATE POLICY tenant_isolation_integration_configs ON integration.integration_configs FOR SELECT USING (tenant_id = public.cerniq_app_session_tenant_id());
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_insert_integration_configs ON integration.integration_configs;
--> statement-breakpoint
CREATE POLICY tenant_insert_integration_configs ON integration.integration_configs FOR INSERT WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_update_integration_configs ON integration.integration_configs;
--> statement-breakpoint
CREATE POLICY tenant_update_integration_configs ON integration.integration_configs FOR UPDATE USING (tenant_id = public.cerniq_app_session_tenant_id()) WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_delete_integration_configs ON integration.integration_configs;
--> statement-breakpoint
CREATE POLICY tenant_delete_integration_configs ON integration.integration_configs FOR DELETE USING (tenant_id = public.cerniq_app_session_tenant_id());
--> statement-breakpoint
ALTER TABLE integration.integration_credentials ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE integration.integration_credentials FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_integration_credentials ON integration.integration_credentials;
--> statement-breakpoint
CREATE POLICY tenant_isolation_integration_credentials ON integration.integration_credentials FOR SELECT USING (tenant_id = public.cerniq_app_session_tenant_id());
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_insert_integration_credentials ON integration.integration_credentials;
--> statement-breakpoint
CREATE POLICY tenant_insert_integration_credentials ON integration.integration_credentials FOR INSERT WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_update_integration_credentials ON integration.integration_credentials;
--> statement-breakpoint
CREATE POLICY tenant_update_integration_credentials ON integration.integration_credentials FOR UPDATE USING (tenant_id = public.cerniq_app_session_tenant_id()) WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_delete_integration_credentials ON integration.integration_credentials;
--> statement-breakpoint
CREATE POLICY tenant_delete_integration_credentials ON integration.integration_credentials FOR DELETE USING (tenant_id = public.cerniq_app_session_tenant_id());
--> statement-breakpoint
ALTER TABLE integration.audit_retention_policies ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE integration.audit_retention_policies FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_audit_retention_policies ON integration.audit_retention_policies;
--> statement-breakpoint
CREATE POLICY tenant_isolation_audit_retention_policies ON integration.audit_retention_policies FOR SELECT USING (tenant_id = public.cerniq_app_session_tenant_id());
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_insert_audit_retention_policies ON integration.audit_retention_policies;
--> statement-breakpoint
CREATE POLICY tenant_insert_audit_retention_policies ON integration.audit_retention_policies FOR INSERT WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_update_audit_retention_policies ON integration.audit_retention_policies;
--> statement-breakpoint
CREATE POLICY tenant_update_audit_retention_policies ON integration.audit_retention_policies FOR UPDATE USING (tenant_id = public.cerniq_app_session_tenant_id()) WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_delete_audit_retention_policies ON integration.audit_retention_policies;
--> statement-breakpoint
CREATE POLICY tenant_delete_audit_retention_policies ON integration.audit_retention_policies FOR DELETE USING (tenant_id = public.cerniq_app_session_tenant_id());
