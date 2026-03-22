-- migrations/0025_create_outreach_schema.sql
-- Etapa 2: All Outreach tables in dedicated `outreach` schema
-- Source: etapa2-schema-outreach.md, etapa2-migrations.md, etapa2-hitl-system.md
-- NOTE: phone_status_enum uses RECONNECTING (not QUARANTINE) - canonical per etapa2-migrations.md

-- Create dedicated outreach schema
CREATE SCHEMA IF NOT EXISTS outreach;

-- ============================================================
-- ENUMS (Etapa 2 — from 0024_create_e2_enums.sql)
-- ============================================================

-- Lead State Machine states (ADR-0062)
DO $$ BEGIN
  CREATE TYPE current_state_enum AS ENUM (
    'COLD', 'CONTACTED_WA', 'CONTACTED_EMAIL', 'WARM_REPLY',
    'NEGOTIATION', 'CONVERTED', 'DEAD', 'PAUSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE channel_enum AS ENUM (
    'WHATSAPP', 'EMAIL_COLD', 'EMAIL_WARM', 'PHONE', 'MANUAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE message_direction_enum AS ENUM ('OUTBOUND', 'INBOUND');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE message_status_enum AS ENUM (
    'QUEUED', 'SENT', 'DELIVERED', 'READ', 'REPLIED',
    'BOUNCED', 'FAILED', 'OPENED', 'CLICKED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RECONNECTING is canonical (source: etapa2-migrations.md sec 2.1)
DO $$ BEGIN
  CREATE TYPE phone_status_enum AS ENUM (
    'ACTIVE', 'PAUSED', 'OFFLINE', 'BANNED', 'RECONNECTING'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE review_priority_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE review_reason_enum AS ENUM (
    'NEGATIVE_SENTIMENT', 'KEYWORD_TRIGGER', 'BOUNCE_DETECTED',
    'COMPLAINT', 'MANUAL_FLAG', 'AI_UNCERTAIN'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sequence_status_enum AS ENUM (
    'DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE template_status_enum AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE template_type_enum AS ENUM (
    'INITIAL', 'FOLLOWUP', 'RESPONSE', 'CLOSING'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABLE: outreach.wa_phone_numbers
-- Must be created before lead_journey (FK dependency)
-- Source: etapa2-schema-outreach.md sec. 5
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach.wa_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  display_name VARCHAR(100),
  timelinesai_account_id VARCHAR(100) NOT NULL,
  daily_new_contact_limit INTEGER NOT NULL DEFAULT 200,
  current_new_contacts_today INTEGER NOT NULL DEFAULT 0,
  followup_limit INTEGER NOT NULL DEFAULT 500,
  current_followups_today INTEGER NOT NULL DEFAULT 0,
  status phone_status_enum NOT NULL DEFAULT 'ACTIVE',
  last_status_change TIMESTAMPTZ,
  last_error TEXT,
  messages_sent_24h INTEGER NOT NULL DEFAULT 0,
  messages_failed_24h INTEGER NOT NULL DEFAULT 0,
  bounce_rate_24h INTEGER NOT NULL DEFAULT 0,
  avg_response_rate INTEGER,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_connected BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 1,
  reputation_score INTEGER NOT NULL DEFAULT 100,
  last_health_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_phone_number_tenant UNIQUE (tenant_id, phone_number),
  CONSTRAINT uq_timelinesai_account UNIQUE (timelinesai_account_id)
);

CREATE INDEX IF NOT EXISTS idx_wa_phones_tenant_enabled ON outreach.wa_phone_numbers(tenant_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_wa_phones_status ON outreach.wa_phone_numbers(status, is_enabled);

-- ============================================================
-- TABLE: outreach.outreach_sequences
-- Must be created before lead_journey (FK dependency)
-- Source: etapa2-schema-outreach.md sec. 6
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach.outreach_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  primary_channel channel_enum NOT NULL,
  stop_on_reply BOOLEAN NOT NULL DEFAULT TRUE,
  respect_business_hours BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  total_enrolled INTEGER NOT NULL DEFAULT 0,
  total_completions INTEGER NOT NULL DEFAULT 0,
  total_conversions INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sequences_tenant_active ON outreach.outreach_sequences(tenant_id, is_active);

-- ============================================================
-- TABLE: outreach.outreach_templates
-- Must be created before communication_log (FK dependency)
-- Source: etapa2-schema-outreach.md sec. 8
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach.outreach_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  channel channel_enum NOT NULL,
  template_type template_type_enum NOT NULL DEFAULT 'INITIAL',
  status template_status_enum NOT NULL DEFAULT 'DRAFT',
  subject VARCHAR(255),
  body_template TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]',
  has_media BOOLEAN NOT NULL DEFAULT FALSE,
  media_type VARCHAR(50),
  media_url TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_tenant_channel ON outreach.outreach_templates(tenant_id, channel, status);
CREATE INDEX IF NOT EXISTS idx_templates_type ON outreach.outreach_templates(tenant_id, template_type);

-- ============================================================
-- TABLE: outreach.lead_journey (state machine — one row per lead)
-- Source: etapa2-schema-outreach.md sec. 3
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach.lead_journey (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES gold.gold_companies(id) ON DELETE CASCADE,
  assigned_phone_id UUID REFERENCES outreach.wa_phone_numbers(id),
  assigned_at TIMESTAMPTZ,
  current_state current_state_enum NOT NULL DEFAULT 'COLD',
  previous_state current_state_enum,
  state_changed_at TIMESTAMPTZ DEFAULT NOW(),
  state_change_reason TEXT,
  quota_consumption_date DATE,
  is_new_contact BOOLEAN NOT NULL DEFAULT TRUE,
  first_contact_channel channel_enum,
  last_channel_used channel_enum,
  preferred_channel channel_enum,
  email_opted_out BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_opted_out BOOLEAN NOT NULL DEFAULT FALSE,
  current_sequence_id UUID REFERENCES outreach.outreach_sequences(id),
  sequence_step INTEGER DEFAULT 0,
  sequence_started_at TIMESTAMPTZ,
  sequence_paused BOOLEAN NOT NULL DEFAULT FALSE,
  next_action_at TIMESTAMPTZ,
  sentiment_score INTEGER NOT NULL DEFAULT 0 CHECK (sentiment_score BETWEEN -100 AND 100),
  engagement_score INTEGER NOT NULL DEFAULT 0 CHECK (engagement_score BETWEEN 0 AND 100),
  reply_count INTEGER NOT NULL DEFAULT 0,
  open_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  requires_human_review BOOLEAN NOT NULL DEFAULT FALSE,
  human_review_reason review_reason_enum,
  human_review_priority review_priority_enum,
  is_human_controlled BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_to_user UUID REFERENCES public.users(id) ON DELETE SET NULL,
  first_contact_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  last_reply_at TIMESTAMPTZ,
  last_open_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  tags JSONB NOT NULL DEFAULT '[]',
  custom_fields JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_lead_journey UNIQUE (tenant_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_journey_tenant_state ON outreach.lead_journey(tenant_id, current_state);
CREATE INDEX IF NOT EXISTS idx_lead_journey_next_action ON outreach.lead_journey(next_action_at) WHERE next_action_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_journey_review ON outreach.lead_journey(tenant_id, requires_human_review) WHERE requires_human_review = TRUE;
CREATE INDEX IF NOT EXISTS idx_lead_journey_sequence ON outreach.lead_journey(current_sequence_id, sequence_step) WHERE current_sequence_id IS NOT NULL;

-- ============================================================
-- TABLE: outreach.communication_log (immutable audit of messages)
-- Source: etapa2-schema-outreach.md sec. 4
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach.communication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_journey_id UUID NOT NULL REFERENCES outreach.lead_journey(id) ON DELETE CASCADE,
  external_message_id VARCHAR(255),
  thread_id VARCHAR(255),
  channel channel_enum NOT NULL,
  direction message_direction_enum NOT NULL,
  template_id UUID REFERENCES outreach.outreach_templates(id),
  content TEXT NOT NULL,
  content_rendered TEXT,
  content_preview VARCHAR(500),
  subject VARCHAR(255),
  status message_status_enum NOT NULL DEFAULT 'QUEUED',
  status_updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  bounce_reason TEXT,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  click_url TEXT,
  unsubscribed_at TIMESTAMPTZ,
  phone_id UUID REFERENCES outreach.wa_phone_numbers(id),
  phone_number VARCHAR(20),
  sequence_id UUID REFERENCES outreach.outreach_sequences(id),
  sequence_step INTEGER,
  sentiment_score INTEGER,
  sentiment_analyzed_at TIMESTAMPTZ,
  intent_classification VARCHAR(50),
  quota_cost SMALLINT NOT NULL DEFAULT 0 CHECK (quota_cost IN (0, 1)),
  raw_request JSONB,
  raw_response JSONB,
  webhook_payload JSONB,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_comm_log_journey ON outreach.communication_log(lead_journey_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_log_external_id ON outreach.communication_log(external_message_id) WHERE external_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comm_log_tenant_channel ON outreach.communication_log(tenant_id, channel);
CREATE INDEX IF NOT EXISTS idx_comm_log_status ON outreach.communication_log(status, created_at);

-- ============================================================
-- TABLE: outreach.wa_quota_usage (daily quotas per phone)
-- Source: etapa2-schema-outreach.md sec. 5
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach.wa_quota_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID NOT NULL REFERENCES outreach.wa_phone_numbers(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  new_contacts INTEGER NOT NULL DEFAULT 0,
  follow_ups INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_quota_phone_date UNIQUE (phone_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_quota_phone_date ON outreach.wa_quota_usage(phone_id, usage_date);

-- ============================================================
-- TABLE: outreach.outreach_sequence_steps
-- Source: etapa2-schema-outreach.md sec. 6
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach.outreach_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES outreach.outreach_sequences(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  channel channel_enum NOT NULL,
  template_id UUID REFERENCES outreach.outreach_templates(id),
  delay_hours INTEGER NOT NULL DEFAULT 24,
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sequence_step UNIQUE (sequence_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_sequence_steps ON outreach.outreach_sequence_steps(sequence_id, step_number);

-- ============================================================
-- TABLE: outreach.sequence_enrollments
-- Source: etapa2-schema-outreach.md sec. 7
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach.sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES outreach.outreach_sequences(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES outreach.lead_journey(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status sequence_status_enum NOT NULL DEFAULT 'ACTIVE',
  current_step INTEGER NOT NULL DEFAULT 0,
  last_step_executed_at TIMESTAMPTZ,
  next_step_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  stopped_reason VARCHAR(100),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_enrollment_journey_sequence UNIQUE (journey_id, sequence_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_status ON outreach.sequence_enrollments(status, next_step_at);
CREATE INDEX IF NOT EXISTS idx_enrollments_journey ON outreach.sequence_enrollments(journey_id);

-- ============================================================
-- TABLE: outreach.template_versions
-- Source: etapa2-schema-outreach.md sec. 8
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach.template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES outreach.outreach_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  body_template TEXT NOT NULL,
  subject VARCHAR(255),
  change_reason TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_template_version UNIQUE (template_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_template_versions ON outreach.template_versions(template_id, version_number);

-- ============================================================
-- TABLE: outreach.human_review_queue
-- Source: etapa2-schema-outreach.md sec. 9, etapa2-hitl-system.md sec. 2
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach.human_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES outreach.lead_journey(id) ON DELETE CASCADE,
  communication_log_id UUID REFERENCES outreach.communication_log(id),
  priority review_priority_enum NOT NULL DEFAULT 'MEDIUM',
  reason review_reason_enum NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  trigger_content TEXT,
  ai_suggested_response TEXT,
  sla_due_at TIMESTAMPTZ NOT NULL,
  sla_breached BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolution_action VARCHAR(30),
  resolution_notes TEXT,
  edited_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_queue_tenant_status ON outreach.human_review_queue(tenant_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_review_queue_sla ON outreach.human_review_queue(sla_due_at, status);
CREATE INDEX IF NOT EXISTS idx_review_queue_journey ON outreach.human_review_queue(journey_id);

-- ============================================================
-- TABLE: outreach.hitl_audit_log
-- Source: etapa2-hitl-system.md sec. 2.2
-- Events: CREATED, ASSIGNED, VIEWED, EDITED, RESOLVED, ESCALATED, SLA_BREACH
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach.hitl_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES outreach.human_review_queue(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type VARCHAR(30) NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hitl_audit_review ON outreach.hitl_audit_log(review_id, created_at);
CREATE INDEX IF NOT EXISTS idx_hitl_audit_tenant ON outreach.hitl_audit_log(tenant_id, created_at);

-- ============================================================
-- TABLE: outreach.outreach_daily_stats
-- Source: etapa2-schema-outreach.md sec. 9
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach.outreach_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  messages_received INTEGER NOT NULL DEFAULT 0,
  new_contacts INTEGER NOT NULL DEFAULT 0,
  replies INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  bounce_count INTEGER NOT NULL DEFAULT 0,
  quota_usage_avg INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_daily_stats_tenant_date UNIQUE (tenant_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_tenant_date ON outreach.outreach_daily_stats(tenant_id, stat_date);

-- Grant usage to application role (if exists)
-- GRANT USAGE ON SCHEMA outreach TO app_user;
-- GRANT ALL ON ALL TABLES IN SCHEMA outreach TO app_user;
