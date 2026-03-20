-- Webhook event archive (compliance / ADR-0061)
-- hitl_audit_log is scoped to human_review_queue(review_id); generic webhook payloads belong here.
CREATE TABLE IF NOT EXISTS outreach.webhook_event_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_id VARCHAR(255) NOT NULL,
  source VARCHAR(30) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL,
  payload JSONB,
  raw_event JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_webhook_event_archive_tenant_event_id UNIQUE (tenant_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_archive_tenant_created
  ON outreach.webhook_event_archive(tenant_id, created_at DESC);
