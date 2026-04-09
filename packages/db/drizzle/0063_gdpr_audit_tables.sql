-- GDPR: jurnale audit pentru consimțământ cookie (web) și drept la ștergere (Art. 17)
-- Schema audit — RLS folosind public.cerniq_app_session_tenant_id() (0060), fără duplicare literal app.tenant_id.

CREATE TABLE IF NOT EXISTS audit.gdpr_consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants (id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users (id) ON DELETE SET NULL,
  consent_categories JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_timestamp TIMESTAMPTZ,
  ip_hash VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gdpr_consent_log_tenant ON audit.gdpr_consent_log (tenant_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_gdpr_consent_log_recorded ON audit.gdpr_consent_log (recorded_at DESC);

ALTER TABLE audit.gdpr_consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.gdpr_consent_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_audit_gdpr_consent_log ON audit.gdpr_consent_log;
CREATE POLICY tenant_isolation_audit_gdpr_consent_log ON audit.gdpr_consent_log
  FOR SELECT USING (
    tenant_id IS NULL OR tenant_id = public.cerniq_app_session_tenant_id()
  );

DROP POLICY IF EXISTS tenant_insert_audit_gdpr_consent_log ON audit.gdpr_consent_log;
CREATE POLICY tenant_insert_audit_gdpr_consent_log ON audit.gdpr_consent_log
  FOR INSERT WITH CHECK (
    tenant_id IS NULL OR tenant_id = public.cerniq_app_session_tenant_id()
  );

DROP POLICY IF EXISTS tenant_update_audit_gdpr_consent_log ON audit.gdpr_consent_log;
CREATE POLICY tenant_update_audit_gdpr_consent_log ON audit.gdpr_consent_log
  FOR UPDATE USING (tenant_id = public.cerniq_app_session_tenant_id())
  WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());

DROP POLICY IF EXISTS tenant_delete_audit_gdpr_consent_log ON audit.gdpr_consent_log;
CREATE POLICY tenant_delete_audit_gdpr_consent_log ON audit.gdpr_consent_log
  FOR DELETE USING (tenant_id = public.cerniq_app_session_tenant_id());

CREATE TABLE IF NOT EXISTS audit.gdpr_erasure_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  subject_type VARCHAR(20) NOT NULL,
  subject_id UUID NOT NULL,
  requested_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  affected_tables JSONB NOT NULL DEFAULT '[]'::jsonb,
  rows_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_gdpr_erasure_subject_type CHECK (subject_type IN ('company', 'contact'))
);

CREATE INDEX IF NOT EXISTS idx_gdpr_erasure_log_tenant ON audit.gdpr_erasure_log (tenant_id, created_at DESC);

ALTER TABLE audit.gdpr_erasure_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.gdpr_erasure_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_audit_gdpr_erasure_log ON audit.gdpr_erasure_log;
CREATE POLICY tenant_isolation_audit_gdpr_erasure_log ON audit.gdpr_erasure_log
  FOR SELECT USING (tenant_id = public.cerniq_app_session_tenant_id());

DROP POLICY IF EXISTS tenant_insert_audit_gdpr_erasure_log ON audit.gdpr_erasure_log;
CREATE POLICY tenant_insert_audit_gdpr_erasure_log ON audit.gdpr_erasure_log
  FOR INSERT WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());

DROP POLICY IF EXISTS tenant_update_audit_gdpr_erasure_log ON audit.gdpr_erasure_log;
CREATE POLICY tenant_update_audit_gdpr_erasure_log ON audit.gdpr_erasure_log
  FOR UPDATE USING (tenant_id = public.cerniq_app_session_tenant_id())
  WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());

DROP POLICY IF EXISTS tenant_delete_audit_gdpr_erasure_log ON audit.gdpr_erasure_log;
CREATE POLICY tenant_delete_audit_gdpr_erasure_log ON audit.gdpr_erasure_log
  FOR DELETE USING (tenant_id = public.cerniq_app_session_tenant_id());
