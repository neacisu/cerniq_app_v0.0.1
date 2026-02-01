# CERNIQ.APP — ETAPA 2: DATABASE MIGRATIONS
## Cold Outreach Multi-Canal - Migration Scripts
### Versiunea 1.0 | 01 Februarie 2026

---

# 1. MIGRATION OVERVIEW

## 1.1 Migration Strategy

- **Tool:** Drizzle ORM Migrations
- **Naming:** `02XX_description.sql` (Etapa 2)
- **Approach:** Forward-only migrations
- **Rollback:** Separate rollback scripts incluse
- **Dependencies:** Etapa 1 migrations (0100-0115) TREBUIE executate first

## 1.2 Migration Order for Etapa 2

```
0200_create_e2_enums.sql
0201_create_gold_lead_journey.sql
0202_create_gold_communication_log.sql
0203_create_wa_phone_numbers.sql
0204_create_wa_quota_usage.sql
0205_create_outreach_sequences.sql
0206_create_outreach_sequence_steps.sql
0207_create_sequence_enrollments.sql
0208_create_outreach_templates.sql
0209_create_template_versions.sql
0210_create_human_review_queue.sql
0211_create_outreach_daily_stats.sql
0212_add_e2_indexes.sql
0213_add_e2_functions.sql
0214_add_e2_triggers.sql
0215_seed_e2_data.sql
```

---

# 2. ENUM MIGRATIONS

## 2.1 Etapa 2 Enums (0200)

```sql
-- migrations/0200_create_e2_enums.sql
-- Etapa 2: Cold Outreach Enums

-- Engagement stages (Lead State Machine)
CREATE TYPE engagement_stage_enum AS ENUM (
  'COLD',              -- Nu a fost contactat încă
  'CONTACTED_WA',      -- Contactat pe WhatsApp, fără răspuns
  'CONTACTED_EMAIL',   -- Contactat pe Email, fără răspuns
  'WARM_REPLY',        -- A răspuns (pozitiv sau neutru)
  'NEGOTIATION',       -- În negociere activă
  'CONVERTED',         -- Convertit în client
  'DEAD',              -- Nu mai răspunde / dezinteresat
  'PAUSED'             -- Pauză temporară
);

-- Communication channels
CREATE TYPE channel_enum AS ENUM (
  'WHATSAPP',
  'EMAIL_COLD',
  'EMAIL_WARM',
  'PHONE',
  'MANUAL'
);

-- Message direction
CREATE TYPE message_direction_enum AS ENUM (
  'OUTBOUND',
  'INBOUND'
);

-- Message status
CREATE TYPE message_status_enum AS ENUM (
  'QUEUED',
  'SENT',
  'DELIVERED',
  'READ',
  'REPLIED',
  'BOUNCED',
  'FAILED',
  'OPENED',
  'CLICKED'
);

-- Phone status
CREATE TYPE phone_status_enum AS ENUM (
  'ACTIVE',
  'PAUSED',
  'OFFLINE',
  'BANNED',
  'RECONNECTING'
);

-- Review priority
CREATE TYPE review_priority_enum AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
);

-- Review reason
CREATE TYPE review_reason_enum AS ENUM (
  'NEGATIVE_SENTIMENT',
  'KEYWORD_TRIGGER',
  'BOUNCE_DETECTED',
  'COMPLAINT',
  'MANUAL_FLAG',
  'AI_UNCERTAIN'
);

-- Sequence status
CREATE TYPE sequence_status_enum AS ENUM (
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'ARCHIVED'
);

-- Template status
CREATE TYPE template_status_enum AS ENUM (
  'DRAFT',
  'ACTIVE',
  'ARCHIVED'
);

-- Template type
CREATE TYPE template_type_enum AS ENUM (
  'INITIAL',
  'FOLLOWUP',
  'RESPONSE',
  'CLOSING'
);

-- Rollback
-- DROP TYPE IF EXISTS engagement_stage_enum CASCADE;
-- DROP TYPE IF EXISTS channel_enum CASCADE;
-- DROP TYPE IF EXISTS message_direction_enum CASCADE;
-- DROP TYPE IF EXISTS message_status_enum CASCADE;
-- DROP TYPE IF EXISTS phone_status_enum CASCADE;
-- DROP TYPE IF EXISTS review_priority_enum CASCADE;
-- DROP TYPE IF EXISTS review_reason_enum CASCADE;
-- DROP TYPE IF EXISTS sequence_status_enum CASCADE;
-- DROP TYPE IF EXISTS template_status_enum CASCADE;
-- DROP TYPE IF EXISTS template_type_enum CASCADE;
```

---

# 3. LEAD JOURNEY MIGRATION

## 3.1 Gold Lead Journey (0201)

```sql
-- migrations/0201_create_gold_lead_journey.sql
-- Tracks outreach state for each gold company

CREATE TABLE gold_lead_journey (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Link to Gold Company (from Etapa 1)
  gold_company_id UUID NOT NULL REFERENCES gold_companies(id),
  
  -- Current State
  current_stage engagement_stage_enum NOT NULL DEFAULT 'COLD',
  previous_stage engagement_stage_enum,
  stage_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stage_change_reason TEXT,
  
  -- Contact Preferences
  preferred_channel channel_enum,
  timezone VARCHAR(50) DEFAULT 'Europe/Bucharest',
  best_contact_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00"}',
  
  -- Outreach Statistics
  total_messages_sent INTEGER DEFAULT 0,
  total_messages_received INTEGER DEFAULT 0,
  whatsapp_messages_sent INTEGER DEFAULT 0,
  email_messages_sent INTEGER DEFAULT 0,
  phone_calls INTEGER DEFAULT 0,
  
  -- Response Metrics
  first_response_at TIMESTAMPTZ,
  last_response_at TIMESTAMPTZ,
  avg_response_time_hours DECIMAL(10,2),
  response_rate DECIMAL(5,2),
  
  -- Engagement Score
  engagement_score INTEGER DEFAULT 0,  -- 0-100
  sentiment_score INTEGER,             -- -100 to +100
  
  -- Sequence Info
  current_sequence_id UUID,
  current_sequence_step INTEGER,
  sequence_started_at TIMESTAMPTZ,
  
  -- Assigned Agent
  assigned_to UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ,
  
  -- Tags & Notes
  tags JSONB DEFAULT '[]',
  internal_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_tenant_company UNIQUE(tenant_id, gold_company_id)
);

-- Comments
COMMENT ON TABLE gold_lead_journey IS 'Outreach state machine for gold companies';
COMMENT ON COLUMN gold_lead_journey.engagement_score IS 'Calculated engagement 0-100 based on interactions';
COMMENT ON COLUMN gold_lead_journey.sentiment_score IS 'AI-calculated sentiment from -100 (negative) to +100 (positive)';

-- Rollback
-- DROP TABLE IF EXISTS gold_lead_journey CASCADE;
```

---

# 4. COMMUNICATION LOG MIGRATION

## 4.1 Gold Communication Log (0202)

```sql
-- migrations/0202_create_gold_communication_log.sql
-- Audit trail for all outreach communications

CREATE TABLE gold_communication_log (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- References
  lead_journey_id UUID NOT NULL REFERENCES gold_lead_journey(id),
  gold_company_id UUID NOT NULL REFERENCES gold_companies(id),
  
  -- Message Identity
  external_message_id VARCHAR(255),       -- ID from provider
  channel channel_enum NOT NULL,
  direction message_direction_enum NOT NULL,
  
  -- Content
  subject VARCHAR(500),                   -- For emails
  message_body TEXT,
  message_preview VARCHAR(255),           -- First 255 chars
  template_id UUID,                       -- If used template
  template_version_id UUID,
  
  -- Sender/Recipient
  from_identifier VARCHAR(100),           -- Phone/Email
  to_identifier VARCHAR(100),             -- Phone/Email
  
  -- WhatsApp Specific
  wa_phone_id UUID,                       -- Reference to wa_phone_numbers
  wa_message_type VARCHAR(50),            -- text, image, document, template
  wa_media_url TEXT,
  
  -- Email Specific
  email_campaign_id VARCHAR(100),         -- Instantly campaign ID
  email_open_count INTEGER DEFAULT 0,
  email_click_count INTEGER DEFAULT 0,
  email_links_clicked JSONB DEFAULT '[]',
  
  -- Status
  status message_status_enum NOT NULL DEFAULT 'QUEUED',
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  
  -- AI Analysis
  sentiment_score INTEGER,
  sentiment_analysis JSONB,
  intent_detected VARCHAR(100),
  keywords_extracted JSONB DEFAULT '[]',
  ai_suggested_response TEXT,
  requires_human_review BOOLEAN DEFAULT FALSE,
  
  -- Sequence Context
  sequence_id UUID,
  sequence_step_id UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE gold_communication_log IS 'Immutable audit log of all outreach communications';
COMMENT ON COLUMN gold_communication_log.sentiment_score IS 'AI-analyzed sentiment -100 to +100';

-- Rollback
-- DROP TABLE IF EXISTS gold_communication_log CASCADE;
```

---

# 5. WHATSAPP PHONE MANAGEMENT

## 5.1 WhatsApp Phone Numbers (0203)

```sql
-- migrations/0203_create_wa_phone_numbers.sql
-- Track 20 WhatsApp phone numbers and their status

CREATE TABLE wa_phone_numbers (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Phone Identity
  phone_number VARCHAR(20) NOT NULL,          -- Format: +40XXXXXXXXX
  display_name VARCHAR(100),
  account_id VARCHAR(100) NOT NULL,           -- TimelinesAI account ID
  
  -- Capacity
  daily_new_contact_limit INTEGER NOT NULL DEFAULT 200,
  current_new_contacts_today INTEGER DEFAULT 0,
  followup_limit INTEGER DEFAULT 500,         -- Per day
  current_followups_today INTEGER DEFAULT 0,
  
  -- Status
  status phone_status_enum NOT NULL DEFAULT 'ACTIVE',
  last_status_change TIMESTAMPTZ,
  last_error TEXT,
  
  -- Health Metrics
  messages_sent_24h INTEGER DEFAULT 0,
  messages_failed_24h INTEGER DEFAULT 0,
  bounce_rate_24h DECIMAL(5,2) DEFAULT 0,
  avg_response_rate DECIMAL(5,2),
  
  -- Connection Status
  is_connected BOOLEAN DEFAULT TRUE,
  last_heartbeat_at TIMESTAMPTZ,
  qr_code_required BOOLEAN DEFAULT FALSE,
  
  -- Assignment
  priority INTEGER DEFAULT 1,                  -- For load balancing
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_phone_number UNIQUE(phone_number)
);

-- Comments
COMMENT ON TABLE wa_phone_numbers IS 'WhatsApp phone pool for outreach (20 phones)';
COMMENT ON COLUMN wa_phone_numbers.daily_new_contact_limit IS 'Max 200 new contacts/day to avoid bans';

-- Rollback
-- DROP TABLE IF EXISTS wa_phone_numbers CASCADE;
```

## 5.2 WhatsApp Quota Usage (0204)

```sql
-- migrations/0204_create_wa_quota_usage.sql
-- Daily quota tracking per phone

CREATE TABLE wa_quota_usage (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Reference
  phone_id UUID NOT NULL REFERENCES wa_phone_numbers(id),
  usage_date DATE NOT NULL,
  
  -- Quotas
  new_contacts_used INTEGER DEFAULT 0,
  new_contacts_limit INTEGER NOT NULL DEFAULT 200,
  followups_used INTEGER DEFAULT 0,
  followups_limit INTEGER NOT NULL DEFAULT 500,
  
  -- Messages Breakdown
  messages_sent INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_read INTEGER DEFAULT 0,
  messages_replied INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  
  -- Timing
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  
  -- Reset Info
  quota_reset_at TIMESTAMPTZ,                 -- Next day 00:00 Bucharest
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_phone_date UNIQUE(phone_id, usage_date)
);

-- Comments
COMMENT ON TABLE wa_quota_usage IS 'Daily quota tracking per WhatsApp phone';

-- Rollback
-- DROP TABLE IF EXISTS wa_quota_usage CASCADE;
```

---

# 6. SEQUENCE MANAGEMENT

## 6.1 Outreach Sequences (0205)

```sql
-- migrations/0205_create_outreach_sequences.sql
-- Automated follow-up sequences

CREATE TABLE outreach_sequences (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Identity
  name VARCHAR(200) NOT NULL,
  description TEXT,
  code VARCHAR(50),
  
  -- Configuration
  channel channel_enum NOT NULL,
  start_stage engagement_stage_enum NOT NULL DEFAULT 'COLD',
  target_stage engagement_stage_enum NOT NULL DEFAULT 'WARM_REPLY',
  
  -- Settings
  max_steps INTEGER DEFAULT 5,
  total_duration_days INTEGER DEFAULT 14,
  respect_business_hours BOOLEAN DEFAULT TRUE,
  weekend_sending BOOLEAN DEFAULT FALSE,
  
  -- A/B Testing
  is_ab_test BOOLEAN DEFAULT FALSE,
  ab_variant VARCHAR(1),                     -- 'A' or 'B'
  ab_parent_id UUID REFERENCES outreach_sequences(id),
  
  -- Status
  status sequence_status_enum NOT NULL DEFAULT 'DRAFT',
  
  -- Stats
  total_enrolled INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  total_converted INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Comments
COMMENT ON TABLE outreach_sequences IS 'Automated multi-step outreach sequences';

-- Rollback
-- DROP TABLE IF EXISTS outreach_sequences CASCADE;
```

## 6.2 Sequence Steps (0206)

```sql
-- migrations/0206_create_outreach_sequence_steps.sql
-- Individual steps within a sequence

CREATE TABLE outreach_sequence_steps (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Reference
  sequence_id UUID NOT NULL REFERENCES outreach_sequences(id) ON DELETE CASCADE,
  
  -- Step Definition
  step_number INTEGER NOT NULL,
  step_name VARCHAR(100),
  
  -- Timing
  delay_days INTEGER NOT NULL DEFAULT 1,
  delay_hours INTEGER DEFAULT 0,
  preferred_send_time TIME,                  -- NULL = anytime in business hours
  
  -- Content
  template_id UUID REFERENCES outreach_templates(id),
  subject_override VARCHAR(500),
  message_override TEXT,
  
  -- Conditions
  skip_if_replied BOOLEAN DEFAULT TRUE,
  skip_if_opened BOOLEAN DEFAULT FALSE,
  condition_expression JSONB,                 -- Advanced conditions
  
  -- Actions
  on_reply_action VARCHAR(50),               -- 'COMPLETE', 'HUMAN_REVIEW', 'NEXT_STEP'
  on_no_reply_action VARCHAR(50) DEFAULT 'NEXT_STEP',
  
  -- Stats
  total_sent INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0,
  reply_rate DECIMAL(5,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_sequence_step UNIQUE(sequence_id, step_number)
);

-- Comments
COMMENT ON TABLE outreach_sequence_steps IS 'Individual steps in outreach sequences';

-- Rollback
-- DROP TABLE IF EXISTS outreach_sequence_steps CASCADE;
```

## 6.3 Sequence Enrollments (0207)

```sql
-- migrations/0207_create_sequence_enrollments.sql
-- Track leads enrolled in sequences

CREATE TABLE sequence_enrollments (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- References
  sequence_id UUID NOT NULL REFERENCES outreach_sequences(id),
  lead_journey_id UUID NOT NULL REFERENCES gold_lead_journey(id),
  
  -- Progress
  current_step INTEGER DEFAULT 1,
  next_step_scheduled_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, PAUSED, COMPLETED, STOPPED
  completed_at TIMESTAMPTZ,
  stopped_reason TEXT,
  
  -- Metrics
  messages_sent INTEGER DEFAULT 0,
  messages_replied INTEGER DEFAULT 0,
  
  -- Timestamps
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_lead_sequence UNIQUE(lead_journey_id, sequence_id)
);

-- Comments
COMMENT ON TABLE sequence_enrollments IS 'Active sequence enrollments for leads';

-- Rollback
-- DROP TABLE IF EXISTS sequence_enrollments CASCADE;
```

---

# 7. TEMPLATE MANAGEMENT

## 7.1 Outreach Templates (0208)

```sql
-- migrations/0208_create_outreach_templates.sql
-- Reusable message templates

CREATE TABLE outreach_templates (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Identity
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  
  -- Type & Channel
  template_type template_type_enum NOT NULL DEFAULT 'INITIAL',
  channel channel_enum NOT NULL,
  
  -- Content
  subject VARCHAR(500),                       -- For emails
  message_body TEXT NOT NULL,
  
  -- Personalization
  variables JSONB DEFAULT '[]',               -- Available merge fields
  -- Example: ["{{company_name}}", "{{contact_name}}", "{{product_interest}}"]
  
  -- Settings
  status template_status_enum NOT NULL DEFAULT 'DRAFT',
  is_default BOOLEAN DEFAULT FALSE,
  language VARCHAR(5) DEFAULT 'ro',
  
  -- A/B Testing
  is_ab_test BOOLEAN DEFAULT FALSE,
  ab_variant VARCHAR(1),
  ab_parent_id UUID REFERENCES outreach_templates(id),
  
  -- Stats
  total_sent INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  reply_rate DECIMAL(5,2),
  open_rate DECIMAL(5,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Comments
COMMENT ON TABLE outreach_templates IS 'Reusable message templates with merge fields';

-- Rollback
-- DROP TABLE IF EXISTS outreach_templates CASCADE;
```

## 7.2 Template Versions (0209)

```sql
-- migrations/0209_create_template_versions.sql
-- Version history for templates

CREATE TABLE template_versions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Reference
  template_id UUID NOT NULL REFERENCES outreach_templates(id) ON DELETE CASCADE,
  
  -- Version
  version_number INTEGER NOT NULL,
  
  -- Content Snapshot
  subject VARCHAR(500),
  message_body TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  
  -- Metadata
  change_notes TEXT,
  
  -- Stats (for this version)
  total_sent INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0,
  reply_rate DECIMAL(5,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  CONSTRAINT unique_template_version UNIQUE(template_id, version_number)
);

-- Comments
COMMENT ON TABLE template_versions IS 'Immutable version history for templates';

-- Rollback
-- DROP TABLE IF EXISTS template_versions CASCADE;
```

---

# 8. HUMAN REVIEW QUEUE

## 8.1 Human Review Queue (0210)

```sql
-- migrations/0210_create_human_review_queue.sql
-- HITL queue for outreach items

CREATE TABLE human_review_queue (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- References
  lead_journey_id UUID NOT NULL REFERENCES gold_lead_journey(id),
  communication_log_id UUID REFERENCES gold_communication_log(id),
  
  -- Review Context
  review_reason review_reason_enum NOT NULL,
  priority review_priority_enum NOT NULL DEFAULT 'MEDIUM',
  
  -- AI Context
  ai_analysis JSONB,
  ai_suggested_action VARCHAR(100),
  ai_suggested_response TEXT,
  ai_confidence DECIMAL(5,2),                 -- 0-100%
  
  -- Content
  message_content TEXT,
  context_messages JSONB DEFAULT '[]',        -- Previous conversation
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, IN_PROGRESS, RESOLVED
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolution_action VARCHAR(100),             -- APPROVE, REJECT, MODIFY, ESCALATE
  resolution_notes TEXT,
  modified_response TEXT,
  
  -- SLA
  sla_deadline TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT FALSE,
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE human_review_queue IS 'HITL queue for outreach requiring human review';

-- Rollback
-- DROP TABLE IF EXISTS human_review_queue CASCADE;
```

---

# 9. DAILY STATS

## 9.1 Outreach Daily Stats (0211)

```sql
-- migrations/0211_create_outreach_daily_stats.sql
-- Aggregated daily statistics

CREATE TABLE outreach_daily_stats (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Date
  stats_date DATE NOT NULL,
  
  -- WhatsApp Stats
  wa_new_contacts INTEGER DEFAULT 0,
  wa_followups INTEGER DEFAULT 0,
  wa_messages_sent INTEGER DEFAULT 0,
  wa_messages_delivered INTEGER DEFAULT 0,
  wa_messages_read INTEGER DEFAULT 0,
  wa_messages_replied INTEGER DEFAULT 0,
  wa_messages_failed INTEGER DEFAULT 0,
  wa_bounce_rate DECIMAL(5,2),
  
  -- Email Cold Stats
  email_cold_sent INTEGER DEFAULT 0,
  email_cold_delivered INTEGER DEFAULT 0,
  email_cold_opened INTEGER DEFAULT 0,
  email_cold_clicked INTEGER DEFAULT 0,
  email_cold_replied INTEGER DEFAULT 0,
  email_cold_bounced INTEGER DEFAULT 0,
  email_cold_open_rate DECIMAL(5,2),
  
  -- Email Warm Stats
  email_warm_sent INTEGER DEFAULT 0,
  email_warm_delivered INTEGER DEFAULT 0,
  email_warm_opened INTEGER DEFAULT 0,
  email_warm_replied INTEGER DEFAULT 0,
  
  -- Lead Progression
  leads_contacted INTEGER DEFAULT 0,
  leads_replied INTEGER DEFAULT 0,
  leads_converted_to_warm INTEGER DEFAULT 0,
  leads_converted_to_negotiation INTEGER DEFAULT 0,
  leads_marked_dead INTEGER DEFAULT 0,
  
  -- HITL Stats
  reviews_created INTEGER DEFAULT 0,
  reviews_resolved INTEGER DEFAULT 0,
  reviews_sla_breached INTEGER DEFAULT 0,
  
  -- Performance
  avg_response_time_minutes DECIMAL(10,2),
  sentiment_avg DECIMAL(5,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_tenant_date UNIQUE(tenant_id, stats_date)
);

-- Comments
COMMENT ON TABLE outreach_daily_stats IS 'Aggregated daily outreach statistics';

-- Rollback
-- DROP TABLE IF EXISTS outreach_daily_stats CASCADE;
```

---

# 10. INDEXES

## 10.1 All Indexes (0212)

```sql
-- migrations/0212_add_e2_indexes.sql
-- Performance indexes for Etapa 2 tables

-- Lead Journey Indexes
CREATE INDEX idx_lead_journey_tenant ON gold_lead_journey(tenant_id);
CREATE INDEX idx_lead_journey_stage ON gold_lead_journey(tenant_id, current_stage);
CREATE INDEX idx_lead_journey_company ON gold_lead_journey(gold_company_id);
CREATE INDEX idx_lead_journey_assigned ON gold_lead_journey(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_lead_journey_sequence ON gold_lead_journey(current_sequence_id) WHERE current_sequence_id IS NOT NULL;

-- Communication Log Indexes
CREATE INDEX idx_comm_log_tenant ON gold_communication_log(tenant_id);
CREATE INDEX idx_comm_log_journey ON gold_communication_log(lead_journey_id);
CREATE INDEX idx_comm_log_company ON gold_communication_log(gold_company_id);
CREATE INDEX idx_comm_log_channel ON gold_communication_log(channel, created_at DESC);
CREATE INDEX idx_comm_log_status ON gold_communication_log(status);
CREATE INDEX idx_comm_log_external ON gold_communication_log(external_message_id) WHERE external_message_id IS NOT NULL;
CREATE INDEX idx_comm_log_sentiment ON gold_communication_log(sentiment_score) WHERE sentiment_score IS NOT NULL;
CREATE INDEX idx_comm_log_review ON gold_communication_log(requires_human_review) WHERE requires_human_review = TRUE;

-- WhatsApp Phone Indexes
CREATE INDEX idx_wa_phone_tenant ON wa_phone_numbers(tenant_id);
CREATE INDEX idx_wa_phone_status ON wa_phone_numbers(status, priority);
CREATE INDEX idx_wa_phone_active ON wa_phone_numbers(tenant_id, status) WHERE status = 'ACTIVE';

-- Quota Usage Indexes
CREATE INDEX idx_quota_phone_date ON wa_quota_usage(phone_id, usage_date);
CREATE INDEX idx_quota_date ON wa_quota_usage(usage_date);

-- Sequence Indexes
CREATE INDEX idx_sequence_tenant ON outreach_sequences(tenant_id, status);
CREATE INDEX idx_sequence_channel ON outreach_sequences(channel);

-- Sequence Step Indexes
CREATE INDEX idx_step_sequence ON outreach_sequence_steps(sequence_id, step_number);

-- Enrollment Indexes
CREATE INDEX idx_enrollment_sequence ON sequence_enrollments(sequence_id);
CREATE INDEX idx_enrollment_lead ON sequence_enrollments(lead_journey_id);
CREATE INDEX idx_enrollment_active ON sequence_enrollments(status, next_step_scheduled_at) WHERE status = 'ACTIVE';

-- Template Indexes
CREATE INDEX idx_template_tenant ON outreach_templates(tenant_id, status);
CREATE INDEX idx_template_channel ON outreach_templates(channel, template_type);

-- Human Review Indexes
CREATE INDEX idx_review_tenant ON human_review_queue(tenant_id);
CREATE INDEX idx_review_status ON human_review_queue(status, priority DESC);
CREATE INDEX idx_review_pending ON human_review_queue(tenant_id, status, sla_deadline) WHERE status = 'PENDING';
CREATE INDEX idx_review_assigned ON human_review_queue(assigned_to, status) WHERE assigned_to IS NOT NULL;

-- Daily Stats Indexes
CREATE INDEX idx_stats_tenant_date ON outreach_daily_stats(tenant_id, stats_date DESC);

-- Rollback
-- DROP INDEX IF EXISTS idx_lead_journey_tenant;
-- ... (toate indexurile)
```

---

# 11. FUNCTIONS

## 11.1 Helper Functions (0213)

```sql
-- migrations/0213_add_e2_functions.sql
-- Helper functions for Etapa 2

-- Function: Check WhatsApp quota availability
CREATE OR REPLACE FUNCTION check_wa_quota_available(
  p_phone_id UUID,
  p_is_new_contact BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
  v_new_used INTEGER;
  v_new_limit INTEGER;
  v_followup_used INTEGER;
  v_followup_limit INTEGER;
BEGIN
  SELECT 
    COALESCE(new_contacts_used, 0),
    COALESCE(new_contacts_limit, 200),
    COALESCE(followups_used, 0),
    COALESCE(followups_limit, 500)
  INTO v_new_used, v_new_limit, v_followup_used, v_followup_limit
  FROM wa_quota_usage
  WHERE phone_id = p_phone_id
    AND usage_date = CURRENT_DATE;
  
  IF NOT FOUND THEN
    RETURN TRUE;  -- No usage yet today
  END IF;
  
  IF p_is_new_contact THEN
    RETURN v_new_used < v_new_limit;
  ELSE
    RETURN v_followup_used < v_followup_limit;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment quota usage atomically
CREATE OR REPLACE FUNCTION increment_wa_quota(
  p_phone_id UUID,
  p_tenant_id UUID,
  p_is_new_contact BOOLEAN
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO wa_quota_usage (phone_id, tenant_id, usage_date, new_contacts_used, followups_used)
  VALUES (p_phone_id, p_tenant_id, CURRENT_DATE, 
          CASE WHEN p_is_new_contact THEN 1 ELSE 0 END,
          CASE WHEN p_is_new_contact THEN 0 ELSE 1 END)
  ON CONFLICT (phone_id, usage_date)
  DO UPDATE SET
    new_contacts_used = wa_quota_usage.new_contacts_used + 
      CASE WHEN p_is_new_contact THEN 1 ELSE 0 END,
    followups_used = wa_quota_usage.followups_used + 
      CASE WHEN p_is_new_contact THEN 0 ELSE 1 END,
    updated_at = NOW();
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  p_messages_sent INTEGER,
  p_messages_received INTEGER,
  p_avg_response_time_hours DECIMAL,
  p_sentiment_score INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_response_rate DECIMAL;
  v_response_time_score DECIMAL;
  v_sentiment_normalized DECIMAL;
  v_score INTEGER;
BEGIN
  -- Response rate (40% weight)
  IF p_messages_sent > 0 THEN
    v_response_rate := (p_messages_received::DECIMAL / p_messages_sent) * 40;
  ELSE
    v_response_rate := 0;
  END IF;
  
  -- Response time (30% weight) - faster = better
  IF p_avg_response_time_hours IS NOT NULL THEN
    v_response_time_score := GREATEST(0, 30 - (p_avg_response_time_hours / 24 * 30));
  ELSE
    v_response_time_score := 0;
  END IF;
  
  -- Sentiment (30% weight)
  IF p_sentiment_score IS NOT NULL THEN
    v_sentiment_normalized := ((p_sentiment_score + 100) / 200.0) * 30;
  ELSE
    v_sentiment_normalized := 15;  -- Neutral default
  END IF;
  
  v_score := LEAST(100, GREATEST(0, 
    ROUND(v_response_rate + v_response_time_score + v_sentiment_normalized)
  ));
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function: Get next available WhatsApp phone
CREATE OR REPLACE FUNCTION get_next_available_wa_phone(
  p_tenant_id UUID,
  p_is_new_contact BOOLEAN
) RETURNS UUID AS $$
DECLARE
  v_phone_id UUID;
BEGIN
  SELECT p.id INTO v_phone_id
  FROM wa_phone_numbers p
  LEFT JOIN wa_quota_usage q ON q.phone_id = p.id AND q.usage_date = CURRENT_DATE
  WHERE p.tenant_id = p_tenant_id
    AND p.status = 'ACTIVE'
    AND (
      CASE WHEN p_is_new_contact 
        THEN COALESCE(q.new_contacts_used, 0) < COALESCE(q.new_contacts_limit, 200)
        ELSE COALESCE(q.followups_used, 0) < COALESCE(q.followups_limit, 500)
      END
    )
  ORDER BY 
    COALESCE(q.new_contacts_used, 0) ASC,  -- Least used first
    p.priority ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  RETURN v_phone_id;
END;
$$ LANGUAGE plpgsql;

-- Rollback
-- DROP FUNCTION IF EXISTS check_wa_quota_available(UUID, BOOLEAN);
-- DROP FUNCTION IF EXISTS increment_wa_quota(UUID, UUID, BOOLEAN);
-- DROP FUNCTION IF EXISTS calculate_engagement_score(INTEGER, INTEGER, DECIMAL, INTEGER);
-- DROP FUNCTION IF EXISTS get_next_available_wa_phone(UUID, BOOLEAN);
```

---

# 12. TRIGGERS

## 12.1 Automated Triggers (0214)

```sql
-- migrations/0214_add_e2_triggers.sql
-- Triggers for Etapa 2 automation

-- Trigger: Update lead_journey engagement score after communication
CREATE OR REPLACE FUNCTION update_lead_engagement_after_comm()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE gold_lead_journey
  SET 
    total_messages_sent = total_messages_sent + 
      CASE WHEN NEW.direction = 'OUTBOUND' THEN 1 ELSE 0 END,
    total_messages_received = total_messages_received + 
      CASE WHEN NEW.direction = 'INBOUND' THEN 1 ELSE 0 END,
    last_response_at = CASE 
      WHEN NEW.direction = 'INBOUND' THEN NEW.created_at 
      ELSE last_response_at 
    END,
    sentiment_score = COALESCE(NEW.sentiment_score, sentiment_score),
    updated_at = NOW()
  WHERE id = NEW.lead_journey_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_lead_engagement
AFTER INSERT ON gold_communication_log
FOR EACH ROW
EXECUTE FUNCTION update_lead_engagement_after_comm();

-- Trigger: Auto-update phone stats after quota change
CREATE OR REPLACE FUNCTION update_phone_stats_from_quota()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wa_phone_numbers
  SET 
    current_new_contacts_today = NEW.new_contacts_used,
    current_followups_today = NEW.followups_used,
    updated_at = NOW()
  WHERE id = NEW.phone_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_phone_stats
AFTER INSERT OR UPDATE ON wa_quota_usage
FOR EACH ROW
EXECUTE FUNCTION update_phone_stats_from_quota();

-- Trigger: Auto-create review item for negative sentiment
CREATE OR REPLACE FUNCTION auto_create_review_for_negative()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direction = 'INBOUND' 
     AND NEW.sentiment_score IS NOT NULL 
     AND NEW.sentiment_score < -30 
  THEN
    INSERT INTO human_review_queue (
      tenant_id,
      lead_journey_id,
      communication_log_id,
      review_reason,
      priority,
      ai_analysis,
      ai_suggested_response,
      ai_confidence,
      message_content,
      status,
      sla_deadline
    ) VALUES (
      NEW.tenant_id,
      NEW.lead_journey_id,
      NEW.id,
      'NEGATIVE_SENTIMENT',
      CASE 
        WHEN NEW.sentiment_score < -70 THEN 'URGENT'
        WHEN NEW.sentiment_score < -50 THEN 'HIGH'
        ELSE 'MEDIUM'
      END,
      NEW.sentiment_analysis,
      NEW.ai_suggested_response,
      80,  -- Default confidence
      NEW.message_body,
      'PENDING',
      CASE 
        WHEN NEW.sentiment_score < -70 THEN NOW() + INTERVAL '1 hour'
        WHEN NEW.sentiment_score < -50 THEN NOW() + INTERVAL '4 hours'
        ELSE NOW() + INTERVAL '24 hours'
      END
    );
    
    UPDATE gold_communication_log
    SET requires_human_review = TRUE
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_review_negative
AFTER INSERT ON gold_communication_log
FOR EACH ROW
WHEN (NEW.direction = 'INBOUND')
EXECUTE FUNCTION auto_create_review_for_negative();

-- Trigger: Track stage changes in lead journey
CREATE OR REPLACE FUNCTION track_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    NEW.previous_stage := OLD.current_stage;
    NEW.stage_changed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_track_stage_change
BEFORE UPDATE ON gold_lead_journey
FOR EACH ROW
EXECUTE FUNCTION track_stage_change();

-- Rollback
-- DROP TRIGGER IF EXISTS trg_update_lead_engagement ON gold_communication_log;
-- DROP TRIGGER IF EXISTS trg_update_phone_stats ON wa_quota_usage;
-- DROP TRIGGER IF EXISTS trg_auto_review_negative ON gold_communication_log;
-- DROP TRIGGER IF EXISTS trg_track_stage_change ON gold_lead_journey;
-- DROP FUNCTION IF EXISTS update_lead_engagement_after_comm();
-- DROP FUNCTION IF EXISTS update_phone_stats_from_quota();
-- DROP FUNCTION IF EXISTS auto_create_review_for_negative();
-- DROP FUNCTION IF EXISTS track_stage_change();
```

---

# 13. SEED DATA

## 13.1 Initial Seed Data (0215)

```sql
-- migrations/0215_seed_e2_data.sql
-- Initial seed data for Etapa 2

-- NOTE: Replace {tenant_id} with actual tenant UUID

-- Seed: Default WhatsApp phones (20 phones)
INSERT INTO wa_phone_numbers (tenant_id, phone_number, display_name, account_id, priority)
VALUES 
  ('{tenant_id}', '+40700000001', 'Cerniq Sales 1', 'timelines_acc_1', 1),
  ('{tenant_id}', '+40700000002', 'Cerniq Sales 2', 'timelines_acc_2', 2),
  ('{tenant_id}', '+40700000003', 'Cerniq Sales 3', 'timelines_acc_3', 3),
  ('{tenant_id}', '+40700000004', 'Cerniq Sales 4', 'timelines_acc_4', 4),
  ('{tenant_id}', '+40700000005', 'Cerniq Sales 5', 'timelines_acc_5', 5),
  ('{tenant_id}', '+40700000006', 'Cerniq Sales 6', 'timelines_acc_6', 6),
  ('{tenant_id}', '+40700000007', 'Cerniq Sales 7', 'timelines_acc_7', 7),
  ('{tenant_id}', '+40700000008', 'Cerniq Sales 8', 'timelines_acc_8', 8),
  ('{tenant_id}', '+40700000009', 'Cerniq Sales 9', 'timelines_acc_9', 9),
  ('{tenant_id}', '+40700000010', 'Cerniq Sales 10', 'timelines_acc_10', 10),
  ('{tenant_id}', '+40700000011', 'Cerniq Sales 11', 'timelines_acc_11', 11),
  ('{tenant_id}', '+40700000012', 'Cerniq Sales 12', 'timelines_acc_12', 12),
  ('{tenant_id}', '+40700000013', 'Cerniq Sales 13', 'timelines_acc_13', 13),
  ('{tenant_id}', '+40700000014', 'Cerniq Sales 14', 'timelines_acc_14', 14),
  ('{tenant_id}', '+40700000015', 'Cerniq Sales 15', 'timelines_acc_15', 15),
  ('{tenant_id}', '+40700000016', 'Cerniq Sales 16', 'timelines_acc_16', 16),
  ('{tenant_id}', '+40700000017', 'Cerniq Sales 17', 'timelines_acc_17', 17),
  ('{tenant_id}', '+40700000018', 'Cerniq Sales 18', 'timelines_acc_18', 18),
  ('{tenant_id}', '+40700000019', 'Cerniq Sales 19', 'timelines_acc_19', 19),
  ('{tenant_id}', '+40700000020', 'Cerniq Sales 20', 'timelines_acc_20', 20);

-- Seed: Default outreach templates
INSERT INTO outreach_templates (tenant_id, name, code, template_type, channel, subject, message_body, status, is_default, variables)
VALUES 
  ('{tenant_id}', 'WhatsApp Initial - Agriculture', 'WA_INIT_AGRI', 'INITIAL', 'WHATSAPP', NULL,
   'Bună ziua! Sunt {{agent_name}} de la Cerniq. Am observat că activați în domeniul agricol în {{county}}. Ați fi interesat să discutăm despre soluțiile noastre pentru ferme? 🌾',
   'ACTIVE', TRUE, '["{{agent_name}}", "{{county}}", "{{company_name}}"]'),
  
  ('{tenant_id}', 'WhatsApp Follow-up 1', 'WA_FU1', 'FOLLOWUP', 'WHATSAPP', NULL,
   'Bună ziua! Revin cu un mesaj scurt. Ați avut ocazia să vă gândiți la propunerea noastră? Sunt disponibil pentru orice întrebări. 🙂',
   'ACTIVE', FALSE, '["{{contact_name}}"]'),
  
  ('{tenant_id}', 'Email Cold Initial', 'EMAIL_COLD_INIT', 'INITIAL', 'EMAIL_COLD',
   'Soluții agricole pentru {{company_name}}',
   'Stimate/ă {{contact_name}},\n\nMă numesc {{agent_name}} și reprezint Cerniq, furnizor de soluții agricole.\n\nAm observat că {{company_name}} activează în {{industry}} și am dori să vă prezentăm oferta noastră.\n\nPutem programa o discuție de 15 minute săptămâna viitoare?\n\nCu stimă,\n{{agent_name}}\nCerniq',
   'ACTIVE', TRUE, '["{{contact_name}}", "{{company_name}}", "{{agent_name}}", "{{industry}}"]');

-- Seed: Default sequence
INSERT INTO outreach_sequences (tenant_id, name, code, channel, max_steps, total_duration_days, status)
VALUES 
  ('{tenant_id}', 'WhatsApp Standard 5-Step', 'WA_STD_5', 'WHATSAPP', 5, 14, 'ACTIVE');

-- Rollback
-- DELETE FROM outreach_templates WHERE tenant_id = '{tenant_id}';
-- DELETE FROM wa_phone_numbers WHERE tenant_id = '{tenant_id}';
-- DELETE FROM outreach_sequences WHERE tenant_id = '{tenant_id}';
```

---

# 14. MIGRATION EXECUTION

## 14.1 Execution Order

```bash
#!/bin/bash
# scripts/migrate-etapa2.sh

set -e

echo "Starting Etapa 2 migrations..."

# Ensure Etapa 1 is complete
psql $DATABASE_URL -c "SELECT COUNT(*) FROM gold_companies;" > /dev/null 2>&1 || {
  echo "ERROR: Etapa 1 tables not found. Run Etapa 1 migrations first."
  exit 1
}

# Run migrations in order
for migration in migrations/020*.sql; do
  echo "Running: $migration"
  psql $DATABASE_URL -f "$migration"
done

echo "Etapa 2 migrations completed successfully!"
```

## 14.2 Rollback Procedure

```bash
#!/bin/bash
# scripts/rollback-etapa2.sh

set -e

echo "WARNING: This will remove all Etapa 2 data!"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Rollback cancelled."
  exit 0
fi

# Rollback in reverse order
psql $DATABASE_URL << 'EOF'
-- Disable triggers first
DROP TRIGGER IF EXISTS trg_update_lead_engagement ON gold_communication_log;
DROP TRIGGER IF EXISTS trg_update_phone_stats ON wa_quota_usage;
DROP TRIGGER IF EXISTS trg_auto_review_negative ON gold_communication_log;
DROP TRIGGER IF EXISTS trg_track_stage_change ON gold_lead_journey;

-- Drop functions
DROP FUNCTION IF EXISTS update_lead_engagement_after_comm();
DROP FUNCTION IF EXISTS update_phone_stats_from_quota();
DROP FUNCTION IF EXISTS auto_create_review_for_negative();
DROP FUNCTION IF EXISTS track_stage_change();
DROP FUNCTION IF EXISTS check_wa_quota_available(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS increment_wa_quota(UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS calculate_engagement_score(INTEGER, INTEGER, DECIMAL, INTEGER);
DROP FUNCTION IF EXISTS get_next_available_wa_phone(UUID, BOOLEAN);

-- Drop tables (in dependency order)
DROP TABLE IF EXISTS outreach_daily_stats CASCADE;
DROP TABLE IF EXISTS human_review_queue CASCADE;
DROP TABLE IF EXISTS template_versions CASCADE;
DROP TABLE IF EXISTS outreach_templates CASCADE;
DROP TABLE IF EXISTS sequence_enrollments CASCADE;
DROP TABLE IF EXISTS outreach_sequence_steps CASCADE;
DROP TABLE IF EXISTS outreach_sequences CASCADE;
DROP TABLE IF EXISTS wa_quota_usage CASCADE;
DROP TABLE IF EXISTS wa_phone_numbers CASCADE;
DROP TABLE IF EXISTS gold_communication_log CASCADE;
DROP TABLE IF EXISTS gold_lead_journey CASCADE;

-- Drop enums
DROP TYPE IF EXISTS template_type_enum CASCADE;
DROP TYPE IF EXISTS template_status_enum CASCADE;
DROP TYPE IF EXISTS sequence_status_enum CASCADE;
DROP TYPE IF EXISTS review_reason_enum CASCADE;
DROP TYPE IF EXISTS review_priority_enum CASCADE;
DROP TYPE IF EXISTS phone_status_enum CASCADE;
DROP TYPE IF EXISTS message_status_enum CASCADE;
DROP TYPE IF EXISTS message_direction_enum CASCADE;
DROP TYPE IF EXISTS channel_enum CASCADE;
DROP TYPE IF EXISTS engagement_stage_enum CASCADE;

EOF

echo "Etapa 2 rollback completed."
```

---

**Document generat:** 01 Februarie 2026  
**Migration files:** 16 (0200-0215)  
**Tables created:** 11  
**Functions created:** 4  
**Triggers created:** 4  
**Status:** COMPLET ✅
