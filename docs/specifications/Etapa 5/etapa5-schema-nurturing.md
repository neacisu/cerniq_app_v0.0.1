# CERNIQ.APP — ETAPA 5: DATABASE SCHEMA
## Nurturing State & Lifecycle Tables
### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [Overview Schema Etapa 5](#1-overview)
2. [Enums & Types](#2-enums)
3. [gold_nurturing_state](#3-nurturing-state)
4. [gold_nurturing_actions](#4-nurturing-actions)
5. [gold_nps_surveys](#5-nps-surveys)
6. [gold_content_drips](#6-content-drips)
7. [Indexes & Constraints](#7-indexes)

---

## 1. Overview Schema Etapa 5 {#1-overview}

```
┌─────────────────────────────────────────────────────────────────┐
│                    ETAPA 5 - NURTURING SCHEMA                    │
│                    PostgreSQL 18.1 + PostGIS 3.5                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   NURTURING STATE                         │   │
│  │  gold_nurturing_state | gold_nurturing_actions           │   │
│  │  gold_nps_surveys | gold_content_drips                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   CHURN DETECTION                         │   │
│  │  gold_churn_signals | gold_churn_factors                 │   │
│  │  gold_sentiment_analysis | gold_winback_campaigns        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 REFERRAL & RELATIONSHIPS                  │   │
│  │  gold_referrals | gold_entity_relationships              │   │
│  │  gold_proximity_scores | gold_kol_profiles               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 CLUSTERS & AFFILIATIONS                   │   │
│  │  gold_clusters | gold_cluster_members                    │   │
│  │  gold_affiliations | gold_associations                   │   │
│  │  gold_ouai_registry | gold_cooperatives                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 FEEDBACK & ZERO-PARTY                     │   │
│  │  gold_conversation_insights | gold_competitor_intel      │   │
│  │  gold_feedback_submissions                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Enums & Types {#2-enums}

```sql
-- Nurturing Lifecycle State
CREATE TYPE nurturing_state_enum AS ENUM (
    'ONBOARDING',           -- T0 to T0+14d
    'NURTURING_ACTIVE',     -- Active nurturing phase
    'AT_RISK',              -- Churn signals detected
    'LOYAL_CLIENT',         -- 3+ orders, NPS >= 8
    'ADVOCATE',             -- KOL status, active referrer
    'CHURNED',              -- Dormant > 180 days
    'REACTIVATED'           -- Win-back successful
);

-- Churn Signal Types
CREATE TYPE churn_signal_type_enum AS ENUM (
    'COMMUNICATION_FADE',      -- Response rate drop
    'NEGATIVE_SENTIMENT',      -- AI detected negative
    'COMPETITOR_MENTION',      -- Mentioned competitor
    'SUPPORT_ESCALATION',      -- High support tickets
    'ORDER_FREQUENCY_DROP',    -- Order interval increased
    'PAYMENT_DELAY',           -- Payment patterns degraded
    'PRICE_COMPLAINT',         -- Price sensitivity signals
    'QUALITY_COMPLAINT'        -- Product quality issues
);

-- Referral Types
CREATE TYPE referral_type_enum AS ENUM (
    'EXPLICIT',              -- Client directly provides contact
    'SOFT_MENTION',          -- Mentioned neighbor in conversation
    'NEIGHBOR_STRATEGY',     -- Geographic proximity based
    'GROUP_DEAL'             -- Cluster purchase opportunity
);

-- Referral Status
CREATE TYPE referral_status_enum AS ENUM (
    'PENDING_CONSENT',       -- Waiting for referrer consent
    'AWAITING_CONSENT',      -- Asked, not yet answered
    'ACTIVE',                -- Ready for outreach
    'CONTACTED',             -- First contact made
    'CONVERTED',             -- Successfully converted
    'REJECTED',              -- Prospect rejected
    'EXPIRED'                -- Time limit exceeded
);

-- Relation Types
CREATE TYPE relation_type_enum AS ENUM (
    'NEIGHBOR',              -- Geographic proximity < 10km
    'SAME_ASSOCIATION',      -- Same OUAI/Cooperative
    'SHARED_SHAREHOLDER',    -- Common shareholders
    'RECOMMENDED_BY',        -- Referral relationship
    'SUPPLY_CHAIN',          -- B2B supply relationship
    'FAMILY_BUSINESS',       -- Family connection
    'BEHAVIORAL_CLUSTER',    -- Similar purchase patterns
    'MEMBER_OF'              -- Association membership
);

-- Cluster Types
CREATE TYPE cluster_type_enum AS ENUM (
    'GEOGRAPHIC',            -- Location-based cluster
    'BEHAVIORAL',            -- Purchase pattern cluster
    'FORMAL_ASSOCIATION',    -- Registered cooperative
    'IMPLICIT_COOPERATIVE',  -- Detected but informal
    'OUAI',                  -- Water Users Organization
    'COOPERATIVE'            -- Agricultural Cooperative
);

-- Content Types for Drip
CREATE TYPE content_type_enum AS ENUM (
    'EDUCATIONAL',           -- How-to, tips
    'PRODUCT_UPDATE',        -- New features/products
    'SEASONAL_TIP',          -- Agricultural season advice
    'SUCCESS_STORY',         -- Case studies
    'PROMOTIONAL',           -- Discounts, offers
    'NPS_SURVEY',            -- Satisfaction survey
    'REFERRAL_REQUEST'       -- Ask for referral
);

-- HITL Task Types for Etapa 5
CREATE TYPE hitl_task_type_e5_enum AS ENUM (
    'CHURN_INTERVENTION',    -- Client at risk needs call
    'NPS_FOLLOWUP',          -- Low NPS needs attention
    'REFERRAL_APPROVAL',     -- Approve referral approach
    'RECOVERY_CALL',         -- Win-back call needed
    'CLUSTER_STRATEGY',      -- Cluster penetration decision
    'CONTENT_REVIEW',        -- Review generated content
    'COMPETITOR_ALERT',      -- Competitor intel review
    'COMPLIANCE_REVIEW',     -- GDPR/Legal review
    'WINBACK_CALL',          -- Dormant client call
    'WEATHER_CAMPAIGN'       -- Weather triggered campaign
);
```

---

## 3. gold_nurturing_state {#3-nurturing-state}

```sql
CREATE TABLE gold_nurturing_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Client Reference
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    
    -- Current State
    current_state nurturing_state_enum NOT NULL DEFAULT 'ONBOARDING',
    previous_state nurturing_state_enum,
    state_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Lifecycle Timestamps
    onboarding_started_at TIMESTAMPTZ,
    onboarding_completed_at TIMESTAMPTZ,
    first_order_at TIMESTAMPTZ,
    last_order_at TIMESTAMPTZ,
    last_interaction_at TIMESTAMPTZ,
    
    -- Engagement Metrics
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    average_order_value DECIMAL(15,2) DEFAULT 0,
    order_frequency_days DECIMAL(5,1),
    
    -- NPS & Satisfaction
    nps_score INTEGER,
    last_nps_survey_at TIMESTAMPTZ,
    nps_category VARCHAR(20),
    satisfaction_trend VARCHAR(20),
    
    -- Churn Risk
    churn_risk_score DECIMAL(5,2),
    churn_risk_level VARCHAR(20),
    days_since_last_order INTEGER,
    is_at_risk BOOLEAN DEFAULT FALSE,
    at_risk_since TIMESTAMPTZ,
    
    -- Referral Potential
    referral_count INTEGER DEFAULT 0,
    successful_referrals INTEGER DEFAULT 0,
    is_advocate BOOLEAN DEFAULT FALSE,
    advocate_since TIMESTAMPTZ,
    kol_score DECIMAL(5,2),
    
    -- Communication
    preferred_channel VARCHAR(20),
    communication_frequency VARCHAR(20),
    last_content_sent_at TIMESTAMPTZ,
    content_engagement_rate DECIMAL(5,2),
    
    -- Geographic Context
    geographic_cluster_id UUID REFERENCES gold_clusters(id),
    neighbor_count INTEGER DEFAULT 0,
    
    -- Metadata
    assigned_account_manager UUID REFERENCES users(id),
    tags JSONB DEFAULT '[]',
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_nurturing_state_unique ON gold_nurturing_state(tenant_id, client_id);
CREATE INDEX idx_nurturing_state_current ON gold_nurturing_state(tenant_id, current_state);
CREATE INDEX idx_nurturing_state_churn ON gold_nurturing_state(tenant_id, churn_risk_score DESC) 
    WHERE is_at_risk = TRUE;
CREATE INDEX idx_nurturing_state_advocate ON gold_nurturing_state(tenant_id, kol_score DESC) 
    WHERE is_advocate = TRUE;
CREATE INDEX idx_nurturing_state_last_order ON gold_nurturing_state(tenant_id, last_order_at DESC);
```

---

## 4. gold_nurturing_actions {#4-nurturing-actions}

```sql
CREATE TABLE gold_nurturing_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- References
    nurturing_state_id UUID NOT NULL REFERENCES gold_nurturing_state(id),
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    
    -- Action Type
    action_type VARCHAR(50) NOT NULL,
    action_category VARCHAR(30) NOT NULL,
    
    -- Trigger
    trigger_type VARCHAR(30) NOT NULL,
    trigger_event VARCHAR(100),
    trigger_data JSONB,
    
    -- Channel
    channel VARCHAR(20) NOT NULL,
    
    -- Content
    content_template_id UUID,
    content_subject VARCHAR(255),
    content_body TEXT,
    content_personalization JSONB,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    
    -- Response
    response_received BOOLEAN DEFAULT FALSE,
    response_at TIMESTAMPTZ,
    response_content TEXT,
    response_sentiment VARCHAR(20),
    
    -- Tracking
    message_id VARCHAR(255),
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    
    -- Error Handling
    error_code VARCHAR(50),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Correlation
    correlation_id UUID,
    batch_id UUID,
    campaign_id UUID,
    
    -- Timestamps
    scheduled_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE gold_nurturing_actions_2026_01 
    PARTITION OF gold_nurturing_actions 
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE gold_nurturing_actions_2026_02 
    PARTITION OF gold_nurturing_actions 
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Indexes
CREATE INDEX idx_nurturing_actions_tenant ON gold_nurturing_actions(tenant_id, created_at DESC);
CREATE INDEX idx_nurturing_actions_client ON gold_nurturing_actions(client_id, created_at DESC);
CREATE INDEX idx_nurturing_actions_status ON gold_nurturing_actions(status, scheduled_at);
```

---

## 5. gold_nps_surveys {#5-nps-surveys}

```sql
CREATE TABLE gold_nps_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Client
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    nurturing_state_id UUID REFERENCES gold_nurturing_state(id),
    
    -- Survey Context
    survey_type VARCHAR(30) NOT NULL,
    trigger_event VARCHAR(50),
    related_order_id UUID REFERENCES gold_orders(id),
    
    -- Delivery
    sent_via VARCHAR(20) NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL,
    message_id VARCHAR(255),
    
    -- Response
    responded BOOLEAN DEFAULT FALSE,
    responded_at TIMESTAMPTZ,
    
    -- NPS Score (0-10)
    nps_rating INTEGER CHECK (nps_rating >= 0 AND nps_rating <= 10),
    nps_category VARCHAR(20),
    
    -- Qualitative Feedback
    open_feedback TEXT,
    feedback_sentiment VARCHAR(20),
    feedback_topics JSONB DEFAULT '[]',
    
    -- Follow-up
    requires_followup BOOLEAN DEFAULT FALSE,
    followup_reason VARCHAR(100),
    followup_hitl_task_id UUID,
    followed_up_at TIMESTAMPTZ,
    followup_outcome TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_nps_tenant_client ON gold_nps_surveys(tenant_id, client_id);
CREATE INDEX idx_nps_response ON gold_nps_surveys(responded, sent_at DESC);
CREATE INDEX idx_nps_followup ON gold_nps_surveys(requires_followup) WHERE requires_followup = TRUE;
CREATE INDEX idx_nps_category ON gold_nps_surveys(tenant_id, nps_category);
```

---

## 6. gold_content_drips {#6-content-drips}

```sql
CREATE TABLE gold_content_drips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Content Definition
    content_name VARCHAR(100) NOT NULL,
    content_type content_type_enum NOT NULL,
    
    -- Target Audience
    target_state nurturing_state_enum[],
    target_segments JSONB DEFAULT '[]',
    
    -- Channel Configuration
    primary_channel VARCHAR(20) NOT NULL,
    fallback_channel VARCHAR(20),
    
    -- Timing
    drip_sequence INTEGER NOT NULL,
    days_after_trigger INTEGER NOT NULL,
    preferred_time TIME,
    preferred_days INTEGER[] DEFAULT '{1,2,3,4,5}',
    
    -- Content Templates
    email_template_id UUID,
    whatsapp_template_name VARCHAR(100),
    sms_template TEXT,
    
    -- Personalization
    personalization_fields JSONB DEFAULT '[]',
    dynamic_content_rules JSONB,
    
    -- Conditions
    skip_if_conditions JSONB,
    prerequisite_content_ids UUID[],
    
    -- Tracking
    total_sent INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_converted INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_drips_tenant_type ON gold_content_drips(tenant_id, content_type);
CREATE INDEX idx_content_drips_active ON gold_content_drips(is_active, tenant_id);
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
