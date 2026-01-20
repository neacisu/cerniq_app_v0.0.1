# CERNIQ.APP — ETAPA 5: DATABASE SCHEMA
## KOL, Win-Back, Feedback & Content
### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. gold_kol_profiles

```sql
CREATE TABLE gold_kol_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Client Link
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    
    -- KOL Status
    is_kol BOOLEAN DEFAULT FALSE,
    kol_tier kol_tier_enum,                  -- ELITE, ESTABLISHED, EMERGING
    kol_since TIMESTAMPTZ,
    
    -- Scores
    overall_kol_score DECIMAL(5,2),
    network_centrality DECIMAL(5,2),         -- Betweenness centrality
    influence_reach INTEGER DEFAULT 0,       -- Influenced clients count
    influence_strength DECIMAL(5,2),         -- Avg influence per connection
    
    -- Graph Metrics
    degree_centrality DECIMAL(5,4),
    betweenness_centrality DECIMAL(5,4),
    eigenvector_centrality DECIMAL(5,4),
    pagerank_score DECIMAL(5,4),
    direct_connections INTEGER DEFAULT 0,
    
    -- Referral Performance
    total_referrals INTEGER DEFAULT 0,
    successful_referrals INTEGER DEFAULT 0,
    referral_conversion_rate DECIMAL(5,2),
    total_influenced_revenue DECIMAL(15,2) DEFAULT 0,
    
    -- Community Position
    primary_cluster_id UUID REFERENCES gold_clusters(id),
    clusters_influenced INTEGER DEFAULT 0,
    is_cluster_kol BOOLEAN DEFAULT FALSE,
    
    -- Engagement
    engagement_frequency VARCHAR(20),        -- DAILY, WEEKLY, MONTHLY
    avg_response_time_hours INTEGER,
    content_shares INTEGER DEFAULT 0,
    
    -- Recognition
    recognition_level VARCHAR(30),           -- BRONZE, SILVER, GOLD, PLATINUM
    badges JSONB DEFAULT '[]',
    last_recognition_at TIMESTAMPTZ,
    
    -- Analysis
    last_calculated_at TIMESTAMPTZ,
    next_evaluation_at TIMESTAMPTZ,
    evaluation_frequency_days INTEGER DEFAULT 30,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_kol_client UNIQUE(tenant_id, client_id)
);

-- Indexes
CREATE INDEX idx_kol_tenant ON gold_kol_profiles(tenant_id, is_kol);
CREATE INDEX idx_kol_tier ON gold_kol_profiles(kol_tier) WHERE is_kol = TRUE;
CREATE INDEX idx_kol_score ON gold_kol_profiles(overall_kol_score DESC) WHERE is_kol = TRUE;
CREATE INDEX idx_kol_cluster ON gold_kol_profiles(primary_cluster_id);
```

---

## 2. gold_winback_campaigns

```sql
CREATE TABLE gold_winback_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Target Client
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    nurturing_state_id UUID REFERENCES gold_nurturing_state(id),
    
    -- Campaign Identity
    campaign_name VARCHAR(200) NOT NULL,
    campaign_code VARCHAR(50),
    campaign_type winback_campaign_type_enum NOT NULL, -- DISCOUNT, PERSONAL_CALL, PRODUCT_UPDATE
    
    -- Trigger
    triggered_by VARCHAR(50) NOT NULL,       -- CHURN_DETECTED, DORMANCY, MANUAL
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    days_dormant INTEGER,
    last_order_date DATE,
    last_order_value DECIMAL(15,2),
    
    -- Client Context
    historical_revenue DECIMAL(15,2),
    historical_orders INTEGER,
    churn_risk_score_at_trigger DECIMAL(5,2),
    top_churn_signals JSONB DEFAULT '[]',
    
    -- Strategy
    strategy JSONB NOT NULL,                 -- {steps: [{day, action, channel}]}
    total_steps INTEGER NOT NULL,
    current_step INTEGER DEFAULT 0,
    
    -- Offer
    offer_type VARCHAR(50),                  -- DISCOUNT, CREDIT, GIFT, FREE_SHIPPING
    offer_value DECIMAL(10,2),
    offer_description TEXT,
    offer_valid_until DATE,
    offer_code VARCHAR(50),
    offer_redeemed BOOLEAN DEFAULT FALSE,
    offer_redeemed_at TIMESTAMPTZ,
    
    -- Personalization
    personalized_message TEXT,
    ai_generated_message BOOLEAN DEFAULT FALSE,
    message_tone VARCHAR(30),                -- FORMAL, FRIENDLY, URGENT
    
    -- Execution
    status winback_status_enum DEFAULT 'PENDING',  -- PENDING, ACTIVE, PAUSED, COMPLETED, CANCELLED
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    -- Results
    response_received BOOLEAN DEFAULT FALSE,
    response_type VARCHAR(30),               -- POSITIVE, NEGATIVE, NO_RESPONSE
    response_at TIMESTAMPTZ,
    
    converted BOOLEAN DEFAULT FALSE,
    conversion_order_id UUID REFERENCES gold_orders(id),
    conversion_at TIMESTAMPTZ,
    conversion_value DECIMAL(15,2),
    
    -- HITL
    requires_hitl BOOLEAN DEFAULT FALSE,
    hitl_task_id UUID,
    hitl_approved_at TIMESTAMPTZ,
    hitl_approved_by UUID REFERENCES users(id),
    
    -- Assignment
    assigned_to UUID REFERENCES users(id),
    
    -- Metrics
    emails_sent INTEGER DEFAULT 0,
    whatsapp_sent INTEGER DEFAULT 0,
    calls_made INTEGER DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_winback_tenant ON gold_winback_campaigns(tenant_id, status);
CREATE INDEX idx_winback_client ON gold_winback_campaigns(client_id);
CREATE INDEX idx_winback_status ON gold_winback_campaigns(status, tenant_id);
CREATE INDEX idx_winback_assigned ON gold_winback_campaigns(assigned_to, status);
CREATE INDEX idx_winback_hitl ON gold_winback_campaigns(requires_hitl, status) WHERE requires_hitl = TRUE;
```

---

## 3. gold_winback_steps

```sql
CREATE TABLE gold_winback_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Campaign
    campaign_id UUID NOT NULL REFERENCES gold_winback_campaigns(id) ON DELETE CASCADE,
    
    -- Step Definition
    step_index INTEGER NOT NULL,
    step_action VARCHAR(50) NOT NULL,        -- INITIAL_EMAIL, WHATSAPP_FOLLOWUP, OFFER_EMAIL, PHONE_CALL, FINAL_EMAIL
    step_channel VARCHAR(30) NOT NULL,       -- EMAIL, WHATSAPP, PHONE, SMS
    scheduled_day INTEGER NOT NULL,          -- Days after campaign start
    
    -- Execution
    status step_status_enum DEFAULT 'PENDING', -- PENDING, SCHEDULED, EXECUTING, COMPLETED, SKIPPED, FAILED
    scheduled_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    
    -- Content
    template_id UUID,
    content_sent TEXT,
    personalization_data JSONB,
    
    -- Result
    delivery_status VARCHAR(30),             -- SENT, DELIVERED, FAILED, BOUNCED
    opened BOOLEAN,
    opened_at TIMESTAMPTZ,
    clicked BOOLEAN,
    clicked_at TIMESTAMPTZ,
    replied BOOLEAN,
    replied_at TIMESTAMPTZ,
    reply_content TEXT,
    
    -- For Phone Calls
    call_duration_seconds INTEGER,
    call_outcome VARCHAR(50),                -- ANSWERED, VOICEMAIL, NO_ANSWER, BUSY
    call_notes TEXT,
    
    -- Error
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_campaign_step UNIQUE(campaign_id, step_index)
);

-- Indexes
CREATE INDEX idx_winback_steps_campaign ON gold_winback_steps(campaign_id, step_index);
CREATE INDEX idx_winback_steps_status ON gold_winback_steps(status, scheduled_at);
```

---

## 4. gold_nps_surveys

```sql
CREATE TABLE gold_nps_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Client
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    nurturing_state_id UUID REFERENCES gold_nurturing_state(id),
    
    -- Survey Context
    survey_type nps_survey_type_enum NOT NULL,  -- POST_ORDER, PERIODIC, POST_SUPPORT, ONBOARDING
    related_order_id UUID REFERENCES gold_orders(id),
    related_support_ticket_id UUID,
    
    -- Delivery
    sent_via VARCHAR(30) NOT NULL,           -- EMAIL, WHATSAPP, SMS, IN_APP
    sent_at TIMESTAMPTZ,
    template_id UUID,
    
    -- Response
    responded BOOLEAN DEFAULT FALSE,
    responded_at TIMESTAMPTZ,
    response_time_hours DECIMAL(10,2),
    
    -- NPS Score
    nps_score INTEGER,                       -- 0-10
    nps_category VARCHAR(20),                -- DETRACTOR (0-6), PASSIVE (7-8), PROMOTER (9-10)
    
    -- Additional Questions
    satisfaction_score INTEGER,              -- 1-5
    would_recommend BOOLEAN,
    ease_of_use_score INTEGER,               -- 1-5
    
    -- Qualitative Feedback
    feedback_text TEXT,
    feedback_topics JSONB DEFAULT '[]',
    feedback_sentiment VARCHAR(20),
    
    -- AI Analysis
    ai_analyzed BOOLEAN DEFAULT FALSE,
    ai_analysis JSONB,
    ai_suggested_actions JSONB DEFAULT '[]',
    churn_risk_indicator BOOLEAN DEFAULT FALSE,
    
    -- Follow-up
    requires_followup BOOLEAN DEFAULT FALSE,
    followup_type VARCHAR(30),
    followup_assigned_to UUID REFERENCES users(id),
    followup_completed BOOLEAN DEFAULT FALSE,
    followup_completed_at TIMESTAMPTZ,
    followup_notes TEXT,
    
    -- Expiry
    expires_at TIMESTAMPTZ,
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_nps_tenant ON gold_nps_surveys(tenant_id);
CREATE INDEX idx_nps_client ON gold_nps_surveys(client_id);
CREATE INDEX idx_nps_responded ON gold_nps_surveys(responded, tenant_id);
CREATE INDEX idx_nps_score ON gold_nps_surveys(nps_score, tenant_id) WHERE nps_score IS NOT NULL;
CREATE INDEX idx_nps_followup ON gold_nps_surveys(requires_followup, followup_completed) WHERE requires_followup = TRUE;
```

---

## 5. gold_content_drips

```sql
CREATE TABLE gold_content_drips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Definition
    drip_name VARCHAR(200) NOT NULL,
    drip_code VARCHAR(50),
    description TEXT,
    
    -- Targeting
    target_state nurturing_state_enum[],
    target_segments JSONB DEFAULT '[]',
    exclude_segments JSONB DEFAULT '[]',
    
    -- Trigger
    trigger_type VARCHAR(50) NOT NULL,       -- STATE_CHANGE, DAYS_AFTER, SEASONAL, MANUAL
    trigger_event VARCHAR(100),
    days_after_trigger INTEGER,
    
    -- Content
    content_type VARCHAR(50) NOT NULL,       -- EDUCATIONAL, PROMOTIONAL, SEASONAL, PRODUCT_TIP
    content_template_id UUID,
    subject_line VARCHAR(200),
    preview_text VARCHAR(300),
    content_body TEXT,
    
    -- Delivery
    channel VARCHAR(30) NOT NULL,            -- EMAIL, WHATSAPP, SMS
    send_time_preference VARCHAR(30),        -- MORNING, AFTERNOON, EVENING
    respect_quiet_hours BOOLEAN DEFAULT TRUE,
    
    -- Personalization
    uses_ai_personalization BOOLEAN DEFAULT FALSE,
    personalization_fields JSONB DEFAULT '[]',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Statistics
    total_sent INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_unsubscribed INTEGER DEFAULT 0,
    open_rate DECIMAL(5,2),
    click_rate DECIMAL(5,2),
    
    -- Schedule
    start_date DATE,
    end_date DATE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_drips_tenant ON gold_content_drips(tenant_id, is_active);
CREATE INDEX idx_drips_trigger ON gold_content_drips(trigger_type, is_active);
```

---

## 6. gold_content_deliveries

```sql
CREATE TABLE gold_content_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Content
    drip_id UUID NOT NULL REFERENCES gold_content_drips(id),
    
    -- Recipient
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    nurturing_state_id UUID REFERENCES gold_nurturing_state(id),
    
    -- Delivery
    channel VARCHAR(30) NOT NULL,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    
    -- Personalization
    personalized_content JSONB,
    final_subject VARCHAR(300),
    final_body TEXT,
    
    -- Status
    status delivery_status_enum DEFAULT 'PENDING',  -- PENDING, SENT, DELIVERED, FAILED, BOUNCED
    
    -- Engagement
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    click_url TEXT,
    unsubscribed_at TIMESTAMPTZ,
    
    -- Error
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- External IDs
    external_message_id VARCHAR(200),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_deliveries_drip ON gold_content_deliveries(drip_id);
CREATE INDEX idx_deliveries_client ON gold_content_deliveries(client_id);
CREATE INDEX idx_deliveries_status ON gold_content_deliveries(status, scheduled_at);
```

---

## 7. gold_competitor_intel

```sql
CREATE TABLE gold_competitor_intel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Source
    source_type VARCHAR(30) NOT NULL,        -- CONVERSATION, NPS_FEEDBACK, SUPPORT_TICKET
    source_id UUID NOT NULL,
    source_client_id UUID REFERENCES gold_clients(id),
    
    -- Competitor
    competitor_name VARCHAR(200) NOT NULL,
    competitor_name_normalized VARCHAR(200),
    competitor_identified_by VARCHAR(30),    -- AI, MANUAL, KEYWORD
    
    -- Intel Type
    intel_type VARCHAR(50) NOT NULL,         -- PRICING, PRODUCT, SERVICE, PROMOTION
    intel_category VARCHAR(50),
    
    -- Content (sanitized for competition law)
    raw_mention TEXT,                        -- Original mention
    sanitized_summary TEXT,                  -- Cleaned summary
    is_price_related BOOLEAN DEFAULT FALSE,
    
    -- Price Intel (AGGREGATED ONLY - Competition Law compliant)
    price_comparison VARCHAR(20),            -- HIGHER, LOWER, SIMILAR
    price_difference_range VARCHAR(30),      -- e.g., "10-20% LOWER"
    -- NOTE: We do NOT store specific competitor prices
    
    -- Context
    sentiment_toward_competitor VARCHAR(20), -- POSITIVE, NEUTRAL, NEGATIVE
    switching_intent BOOLEAN DEFAULT FALSE,
    
    -- Verification
    requires_review BOOLEAN DEFAULT TRUE,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    is_valid BOOLEAN,
    
    -- Competition Law Compliance
    compliance_checked BOOLEAN DEFAULT FALSE,
    compliance_checked_at TIMESTAMPTZ,
    compliance_notes TEXT,
    
    -- Timestamps
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_competitor_tenant ON gold_competitor_intel(tenant_id);
CREATE INDEX idx_competitor_name ON gold_competitor_intel(competitor_name_normalized);
CREATE INDEX idx_competitor_type ON gold_competitor_intel(intel_type);
CREATE INDEX idx_competitor_review ON gold_competitor_intel(requires_review, reviewed_at) WHERE requires_review = TRUE;
```

---

## 8. gold_weather_alerts

```sql
CREATE TABLE gold_weather_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Alert Source
    source VARCHAR(30) NOT NULL,             -- ANM, CUSTOM
    source_alert_id VARCHAR(100),
    
    -- Alert Details
    alert_type VARCHAR(50) NOT NULL,         -- FROST, HAIL, DROUGHT, FLOOD, HEAT
    severity VARCHAR(20) NOT NULL,           -- GREEN, YELLOW, ORANGE, RED
    
    -- Temporal
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    
    -- Geographic
    affected_counties VARCHAR(50)[] NOT NULL,
    affected_localities VARCHAR(100)[],
    coverage_polygon GEOGRAPHY(POLYGON, 4326),
    
    -- Description
    title VARCHAR(300),
    description TEXT,
    recommendations TEXT,
    
    -- Campaign Trigger
    campaign_triggered BOOLEAN DEFAULT FALSE,
    campaign_triggered_at TIMESTAMPTZ,
    affected_clients_count INTEGER,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_weather_active ON gold_weather_alerts(is_active, valid_until);
CREATE INDEX idx_weather_counties ON gold_weather_alerts USING GIN (affected_counties);
CREATE INDEX idx_weather_severity ON gold_weather_alerts(severity, is_active);
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
