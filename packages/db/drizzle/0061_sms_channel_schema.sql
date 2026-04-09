-- FAZA 15: SMS — canal în channel_enum + tabele outreach.sms_*.
-- Coloane provider/status/source ca varchar + CHECK (aliniat la Drizzle).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'channel_enum'
      AND e.enumlabel = 'SMS'
  ) THEN
    ALTER TYPE channel_enum ADD VALUE 'SMS';
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS outreach.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES gold.gold_companies (id) ON DELETE CASCADE,
  journey_id uuid NOT NULL REFERENCES outreach.lead_journey (id) ON DELETE CASCADE,
  phone_number varchar(32) NOT NULL,
  provider varchar(16) NOT NULL,
  provider_message_id varchar(255),
  direction message_direction_enum NOT NULL,
  content text NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'QUEUED',
  cost_usd numeric(10, 6) NOT NULL DEFAULT 0,
  segments integer NOT NULL DEFAULT 1,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_sms_messages_provider CHECK (provider IN ('TWILIO', 'VONAGE', 'AWS_SNS')),
  CONSTRAINT chk_sms_messages_status CHECK (
    status IN ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'REJECTED', 'OPTED_OUT')
  )
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_sms_messages_tenant_created ON outreach.sms_messages (tenant_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_sms_messages_journey ON outreach.sms_messages (journey_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_sms_messages_provider_msg ON outreach.sms_messages (provider, provider_message_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS outreach.sms_opt_outs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  phone_number varchar(32) NOT NULL,
  source varchar(16) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  CONSTRAINT uq_sms_opt_outs_tenant_phone UNIQUE (tenant_id, phone_number),
  CONSTRAINT chk_sms_opt_outs_source CHECK (source IN ('REPLY_STOP', 'MANUAL', 'API'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_sms_opt_outs_tenant ON outreach.sms_opt_outs (tenant_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS outreach.sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  name varchar(128) NOT NULL,
  body_template text NOT NULL,
  variables jsonb NOT NULL DEFAULT '{}',
  max_segments integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_sms_templates_tenant_name UNIQUE (tenant_id, name),
  CONSTRAINT chk_sms_templates_max_segments CHECK (max_segments >= 1 AND max_segments <= 10)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_sms_templates_tenant_active ON outreach.sms_templates (tenant_id, is_active);
