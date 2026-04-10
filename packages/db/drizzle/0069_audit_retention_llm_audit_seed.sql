-- Seed: politică retenție LLM_AUDIT (180 zile) pentru toți tenant-ii existenți.
-- Conform plan Faza 23 / EU AI Act — trasabilitate audit_llm_calls (Art. 12).
-- Idempotent: ON CONFLICT DO NOTHING.

INSERT INTO integration.audit_retention_policies (tenant_id, data_type, retention_days, auto_delete)
SELECT id, 'LLM_AUDIT', 180, false
FROM public.tenants
ON CONFLICT ON CONSTRAINT uq_audit_retention_tenant_datatype DO NOTHING;
