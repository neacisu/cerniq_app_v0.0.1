-- Etapa 2: outreach settings, in-app notifications, lead notes, sequence columns, extra indexes
-- Source: audit remediere R2-G1, R3

CREATE TABLE IF NOT EXISTS outreach.outreach_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_hours_start SMALLINT NOT NULL DEFAULT 9 CHECK (business_hours_start >= 0 AND business_hours_start < 24),
  business_hours_end SMALLINT NOT NULL DEFAULT 18 CHECK (business_hours_end >= 0 AND business_hours_end <= 24),
  work_days JSONB NOT NULL DEFAULT '[1,2,3,4,5]'::jsonb,
  timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Bucharest',
  daily_quota_limit INTEGER NOT NULL DEFAULT 200 CHECK (daily_quota_limit > 0),
  followup_quota_limit INTEGER NOT NULL DEFAULT 500 CHECK (followup_quota_limit > 0),
  email_signature TEXT,
  wa_reply_timeout_minutes INTEGER NOT NULL DEFAULT 60 CHECK (wa_reply_timeout_minutes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outreach.outreach_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  resource_type VARCHAR(50),
  resource_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_notifications_tenant_read_created
  ON outreach.outreach_notifications(tenant_id, is_read, created_at DESC);

ALTER TABLE outreach.outreach_sequences ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Europe/Bucharest';
ALTER TABLE outreach.outreach_sequences ADD COLUMN IF NOT EXISTS stop_on_bounce BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE outreach.outreach_sequences ADD COLUMN IF NOT EXISTS fallback_channel channel_enum;

ALTER TABLE outreach.outreach_sequence_steps ADD COLUMN IF NOT EXISTS skip_if_replied BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE outreach.outreach_sequence_steps ADD COLUMN IF NOT EXISTS skip_if_opened BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE outreach.sequence_enrollments ADD COLUMN IF NOT EXISTS stopped_at TIMESTAMPTZ;

-- Extra indexes (spec R3-IDX)
CREATE INDEX IF NOT EXISTS idx_lead_journey_phone
  ON outreach.lead_journey(assigned_phone_id) WHERE assigned_phone_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comm_log_thread
  ON outreach.communication_log(thread_id) WHERE thread_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comm_log_phone_created
  ON outreach.communication_log(phone_id, created_at DESC) WHERE phone_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quota_usage_date_desc
  ON outreach.wa_quota_usage(usage_date DESC);

CREATE INDEX IF NOT EXISTS idx_enrollments_next_step
  ON outreach.sequence_enrollments(next_step_at) WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_review_queue_assigned
  ON outreach.human_review_queue(assigned_to, status) WHERE assigned_to IS NOT NULL;
