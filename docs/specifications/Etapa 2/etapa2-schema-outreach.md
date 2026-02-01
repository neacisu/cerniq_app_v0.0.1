# CERNIQ.APP — ETAPA 2: DATABASE SCHEMA
## Cold Outreach Multi-Canal - Database Design
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. OVERVIEW

## 1.1 Table Categories

| Category | Tables | Purpose |
|----------|--------|---------|
| **Lead Journey** | gold_lead_journey | State machine pentru leads |
| **Communication** | gold_communication_log | Audit toate mesajele |
| **WhatsApp** | wa_phone_numbers, wa_quota_usage | Phone management |
| **Sequences** | outreach_sequences, sequence_steps | Follow-up automation |
| **Templates** | outreach_templates | Message templates |
| **Review Queue** | human_review_queue | HITL items |

---

# 2. ENUMS

```sql
-- Current state (FSM)
CREATE TYPE current_state_enum AS ENUM (
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
```

---

# 3. LEAD JOURNEY TABLE

```sql
-- Gold layer extension for outreach
CREATE TABLE gold_lead_journey (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES gold_companies(id) ON DELETE CASCADE,
  
  -- WhatsApp Assignment (STICKY)
  assigned_phone_id UUID REFERENCES wa_phone_numbers(id),
  assigned_at TIMESTAMPTZ,
  
  -- State Machine
  current_state current_state_enum NOT NULL DEFAULT 'COLD',
  previous_state current_state_enum,
  state_changed_at TIMESTAMPTZ DEFAULT NOW(),
  state_change_reason TEXT,
  
  -- Quota Tracking
  quota_consumption_date DATE,
  is_new_contact BOOLEAN DEFAULT TRUE,
  first_contact_channel channel_enum,
  
  -- Channel Preferences
  last_channel_used channel_enum,
  preferred_channel channel_enum,
  email_opted_out BOOLEAN DEFAULT FALSE,
  whatsapp_opted_out BOOLEAN DEFAULT FALSE,
  
  -- Sequence State
  current_sequence_id UUID REFERENCES outreach_sequences(id),
  sequence_step INT DEFAULT 0,
  sequence_started_at TIMESTAMPTZ,
  sequence_paused BOOLEAN DEFAULT FALSE,
  next_action_at TIMESTAMPTZ,
  
  -- Scoring
  sentiment_score INT DEFAULT 0 CHECK (sentiment_score BETWEEN -100 AND 100),
  engagement_score INT DEFAULT 0 CHECK (engagement_score BETWEEN 0 AND 100),
  reply_count INT DEFAULT 0,
  open_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  
  -- Human Intervention
  requires_human_review BOOLEAN DEFAULT FALSE,
  human_review_reason review_reason_enum,
  human_review_priority review_priority_enum,
  is_human_controlled BOOLEAN DEFAULT FALSE,
  assigned_to_user UUID REFERENCES users(id),
  
  -- Timestamps
  first_contact_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  last_reply_at TIMESTAMPTZ,
  last_open_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  
  -- Metadata
  tags JSONB DEFAULT '[]',
  custom_fields JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_lead_journey UNIQUE (tenant_id, lead_id)
);

-- Indexes
CREATE INDEX idx_lead_journey_tenant_state 
  ON gold_lead_journey(tenant_id, current_state);
CREATE INDEX idx_lead_journey_phone 
  ON gold_lead_journey(assigned_phone_id) WHERE assigned_phone_id IS NOT NULL;
CREATE INDEX idx_lead_journey_next_action 
  ON gold_lead_journey(next_action_at) WHERE next_action_at IS NOT NULL;
CREATE INDEX idx_lead_journey_review 
  ON gold_lead_journey(tenant_id, requires_human_review) 
  WHERE requires_human_review = TRUE;
CREATE INDEX idx_lead_journey_sequence 
  ON gold_lead_journey(current_sequence_id, sequence_step) 
  WHERE current_sequence_id IS NOT NULL;

-- Comments
COMMENT ON TABLE gold_lead_journey IS 'Outreach state machine for each lead';
COMMENT ON COLUMN gold_lead_journey.is_new_contact IS 'TRUE until first message sent (quota cost=1)';
COMMENT ON COLUMN gold_lead_journey.sentiment_score IS '-100 (very negative) to +100 (very positive)';
```

---

# 4. COMMUNICATION LOG TABLE

```sql
CREATE TABLE gold_communication_log (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_journey_id UUID NOT NULL REFERENCES gold_lead_journey(id) ON DELETE CASCADE,
  
  -- Message Identity
  external_message_id VARCHAR(255), -- TimelinesAI/Instantly message ID
  thread_id VARCHAR(255), -- Conversation thread ID
  
  -- Channel
  channel channel_enum NOT NULL,
  direction message_direction_enum NOT NULL,
  
  -- Content
  template_id UUID REFERENCES outreach_templates(id),
  content TEXT NOT NULL,
  content_rendered TEXT, -- After spintax processing
  subject VARCHAR(255), -- For emails
  
  -- Status
  status message_status_enum NOT NULL DEFAULT 'QUEUED',
  status_updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Delivery Tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  bounce_reason TEXT,
  
  -- Email Specific
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  click_url TEXT,
  unsubscribed_at TIMESTAMPTZ,
  
  -- Phone Context
  phone_id UUID REFERENCES wa_phone_numbers(id),
  phone_number VARCHAR(20), -- The actual number used
  
  -- Sequence Context
  sequence_id UUID REFERENCES outreach_sequences(id),
  sequence_step INT,
  
  -- AI Analysis
  sentiment_score INT,
  sentiment_analyzed_at TIMESTAMPTZ,
  intent_classification VARCHAR(50),
  
  -- Cost Tracking
  quota_cost INT DEFAULT 0, -- 1 for new, 0 for follow-up
  
  -- Raw Data
  raw_request JSONB,
  raw_response JSONB,
  webhook_payload JSONB,
  
  -- Error Handling
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_comm_log_journey 
  ON gold_communication_log(lead_journey_id, created_at DESC);
CREATE INDEX idx_comm_log_external_id 
  ON gold_communication_log(external_message_id) WHERE external_message_id IS NOT NULL;
CREATE INDEX idx_comm_log_thread 
  ON gold_communication_log(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_comm_log_status 
  ON gold_communication_log(status, created_at DESC);
CREATE INDEX idx_comm_log_phone 
  ON gold_communication_log(phone_id, created_at DESC) WHERE phone_id IS NOT NULL;

-- Partitioning by month (for large volumes)
-- CREATE TABLE gold_communication_log_y2026m01 
--   PARTITION OF gold_communication_log
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

COMMENT ON TABLE gold_communication_log IS 'Complete audit trail of all outreach communications';
```

---

# 5. WHATSAPP PHONE MANAGEMENT

```sql
-- WhatsApp phone numbers pool
CREATE TABLE wa_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Phone Identity
  phone_number VARCHAR(20) NOT NULL,
  phone_label VARCHAR(50), -- "Phone 01", "Phone 02", etc.
  
  -- TimelinesAI Integration
  timelinesai_phone_id VARCHAR(100) NOT NULL,
  timelinesai_account_id VARCHAR(100),
  
  -- Status
  status phone_status_enum NOT NULL DEFAULT 'ACTIVE',
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  status_reason TEXT,
  
  -- Health Metrics
  last_health_check_at TIMESTAMPTZ,
  last_message_sent_at TIMESTAMPTZ,
  last_message_received_at TIMESTAMPTZ,
  is_online BOOLEAN DEFAULT TRUE,
  
  -- Quota (soft tracking, hard enforced in Redis)
  daily_quota_limit INT DEFAULT 200,
  
  -- Statistics
  total_messages_sent INT DEFAULT 0,
  total_leads_assigned INT DEFAULT 0,
  total_conversations INT DEFAULT 0,
  
  -- Configuration
  is_enabled BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 1, -- For load balancing
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_phone_number UNIQUE (tenant_id, phone_number),
  CONSTRAINT unique_timelinesai_id UNIQUE (timelinesai_phone_id)
);

-- Daily quota tracking (Redis is primary, this is backup/audit)
CREATE TABLE wa_quota_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_id UUID NOT NULL REFERENCES wa_phone_numbers(id) ON DELETE CASCADE,
  
  -- Date
  usage_date DATE NOT NULL,
  
  -- Quota
  new_contacts_sent INT DEFAULT 0,
  followups_sent INT DEFAULT 0,
  total_sent INT DEFAULT 0,
  
  -- Limits
  quota_limit INT DEFAULT 200,
  quota_remaining INT DEFAULT 200,
  
  -- Timestamps
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_phone_date UNIQUE (phone_id, usage_date)
);

-- Indexes
CREATE INDEX idx_phone_numbers_tenant_status 
  ON wa_phone_numbers(tenant_id, status);
CREATE INDEX idx_quota_usage_date 
  ON wa_quota_usage(usage_date DESC);
CREATE INDEX idx_quota_usage_phone_date 
  ON wa_quota_usage(phone_id, usage_date DESC);
```

---

# 6. SEQUENCE MANAGEMENT

```sql
-- Outreach sequences (campaign templates)
CREATE TABLE outreach_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Identity
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  
  -- Channel Settings
  primary_channel channel_enum NOT NULL DEFAULT 'WHATSAPP',
  fallback_channel channel_enum,
  
  -- Timing
  respect_business_hours BOOLEAN DEFAULT TRUE,
  timezone VARCHAR(50) DEFAULT 'Europe/Bucharest',
  
  -- Exit Conditions
  stop_on_reply BOOLEAN DEFAULT TRUE,
  stop_on_bounce BOOLEAN DEFAULT TRUE,
  max_attempts INT DEFAULT 5,
  
  -- Statistics
  total_leads_enrolled INT DEFAULT 0,
  total_completions INT DEFAULT 0,
  total_conversions INT DEFAULT 0,
  avg_response_rate NUMERIC(5,2),
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Sequence steps
CREATE TABLE outreach_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES outreach_sequences(id) ON DELETE CASCADE,
  
  -- Step Order
  step_number INT NOT NULL,
  
  -- Timing
  delay_hours INT NOT NULL DEFAULT 24,
  delay_minutes INT DEFAULT 0,
  
  -- Channel
  channel channel_enum NOT NULL,
  
  -- Content
  template_id UUID NOT NULL REFERENCES outreach_templates(id),
  
  -- Conditions
  skip_if_replied BOOLEAN DEFAULT TRUE,
  skip_if_opened BOOLEAN DEFAULT FALSE,
  
  -- A/B Testing
  is_ab_test BOOLEAN DEFAULT FALSE,
  ab_variant CHAR(1), -- 'A' or 'B'
  ab_percentage INT DEFAULT 50,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_sequence_step UNIQUE (sequence_id, step_number)
);

-- Active sequence enrollments
CREATE TABLE sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- References
  lead_journey_id UUID NOT NULL REFERENCES gold_lead_journey(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES outreach_sequences(id),
  
  -- Progress
  current_step INT DEFAULT 0,
  total_steps INT NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, COMPLETED, STOPPED
  
  -- Timing
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  next_step_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  stop_reason TEXT,
  
  -- Statistics
  messages_sent INT DEFAULT 0,
  opens INT DEFAULT 0,
  clicks INT DEFAULT 0,
  replies INT DEFAULT 0,
  
  CONSTRAINT unique_enrollment UNIQUE (lead_journey_id, sequence_id)
);

-- Indexes
CREATE INDEX idx_sequences_tenant 
  ON outreach_sequences(tenant_id, is_active);
CREATE INDEX idx_sequence_steps_sequence 
  ON outreach_sequence_steps(sequence_id, step_number);
CREATE INDEX idx_enrollments_next_step 
  ON sequence_enrollments(next_step_at) WHERE status = 'ACTIVE';
```

---

# 7. TEMPLATES

```sql
CREATE TABLE outreach_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Identity
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Channel
  channel channel_enum NOT NULL,
  
  -- Content
  subject VARCHAR(255), -- For emails
  content TEXT NOT NULL, -- Supports spintax
  
  -- Personalization
  variables JSONB DEFAULT '[]', -- [{name: 'firstName', required: true}]
  
  -- Media (WhatsApp)
  has_media BOOLEAN DEFAULT FALSE,
  media_type VARCHAR(20), -- image, document, video
  media_url TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_approved BOOLEAN DEFAULT TRUE,
  
  -- Statistics
  times_used INT DEFAULT 0,
  avg_open_rate NUMERIC(5,2),
  avg_reply_rate NUMERIC(5,2),
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Template versions for A/B testing
CREATE TABLE template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES outreach_templates(id) ON DELETE CASCADE,
  
  -- Version
  version_number INT NOT NULL,
  version_label VARCHAR(50),
  
  -- Content
  subject VARCHAR(255),
  content TEXT NOT NULL,
  
  -- Statistics
  times_used INT DEFAULT 0,
  opens INT DEFAULT 0,
  replies INT DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_template_version UNIQUE (template_id, version_number)
);

CREATE INDEX idx_templates_tenant_channel 
  ON outreach_templates(tenant_id, channel, is_active);
```

---

# 8. HUMAN REVIEW QUEUE

```sql
CREATE TABLE human_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- References
  lead_journey_id UUID NOT NULL REFERENCES gold_lead_journey(id),
  communication_id UUID REFERENCES gold_communication_log(id),
  
  -- Review Details
  reason review_reason_enum NOT NULL,
  priority review_priority_enum NOT NULL DEFAULT 'MEDIUM',
  
  -- Context
  trigger_content TEXT, -- The message that triggered review
  ai_analysis JSONB, -- Sentiment, intent, etc.
  suggested_response TEXT,
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, ASSIGNED, RESOLVED, ESCALATED
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolution_action VARCHAR(50), -- RESPONDED, IGNORED, ESCALATED, HUMAN_TAKEOVER
  resolution_notes TEXT,
  
  -- SLA
  sla_due_at TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT FALSE,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_review_queue_tenant_status 
  ON human_review_queue(tenant_id, status, priority DESC);
CREATE INDEX idx_review_queue_assigned 
  ON human_review_queue(assigned_to, status) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_review_queue_sla 
  ON human_review_queue(sla_due_at) WHERE status = 'PENDING';
```

---

# 9. DAILY STATISTICS

```sql
CREATE TABLE outreach_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Date
  stat_date DATE NOT NULL,
  
  -- WhatsApp Stats
  wa_new_contacts_sent INT DEFAULT 0,
  wa_followups_sent INT DEFAULT 0,
  wa_replies_received INT DEFAULT 0,
  wa_quota_used INT DEFAULT 0,
  wa_quota_remaining INT DEFAULT 0,
  
  -- Email Cold Stats
  email_cold_sent INT DEFAULT 0,
  email_cold_opens INT DEFAULT 0,
  email_cold_clicks INT DEFAULT 0,
  email_cold_replies INT DEFAULT 0,
  email_cold_bounces INT DEFAULT 0,
  email_cold_bounce_rate NUMERIC(5,4),
  
  -- Email Warm Stats
  email_warm_sent INT DEFAULT 0,
  email_warm_opens INT DEFAULT 0,
  
  -- Conversions
  leads_contacted INT DEFAULT 0,
  leads_replied INT DEFAULT 0,
  leads_converted INT DEFAULT 0,
  
  -- Human Review
  reviews_created INT DEFAULT 0,
  reviews_resolved INT DEFAULT 0,
  avg_review_time_minutes INT,
  
  -- Sentiment
  avg_sentiment_score NUMERIC(5,2),
  positive_replies INT DEFAULT 0,
  negative_replies INT DEFAULT 0,
  neutral_replies INT DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_daily_stats UNIQUE (tenant_id, stat_date)
);

CREATE INDEX idx_outreach_stats_date 
  ON outreach_daily_stats(tenant_id, stat_date DESC);
```

---

# 10. ROW LEVEL SECURITY

```sql
-- Enable RLS
ALTER TABLE gold_lead_journey ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_communication_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_quota_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_daily_stats ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY tenant_isolation_lead_journey ON gold_lead_journey
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_comm_log ON gold_communication_log
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_phones ON wa_phone_numbers
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Repeat for all tables...
```

---

**Document generat:** 15 Ianuarie 2026
**Total Tables:** 11
**Conformitate:** Master Spec v1.2
