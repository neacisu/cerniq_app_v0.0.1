-- Izolare tenant pentru outreach.wa_quota_usage (plan R1-A13).

ALTER TABLE outreach.wa_quota_usage
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

UPDATE outreach.wa_quota_usage q
SET tenant_id = p.tenant_id
FROM outreach.wa_phone_numbers p
WHERE q.phone_id = p.id AND q.tenant_id IS NULL;

DELETE FROM outreach.wa_quota_usage WHERE tenant_id IS NULL;

ALTER TABLE outreach.wa_quota_usage
  ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wa_quota_usage_tenant_date
  ON outreach.wa_quota_usage (tenant_id, usage_date DESC);
