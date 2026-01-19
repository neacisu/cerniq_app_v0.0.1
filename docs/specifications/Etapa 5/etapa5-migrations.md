# CERNIQ.APP — ETAPA 5: MIGRATIONS
## Database Migrations pentru Nurturing Agentic
### Versiunea 1.0 | 19 Ianuarie 2026

---

## Migration 001: Create Etapa 5 Enums

```sql
-- migrations/20260119_001_create_e5_enums.sql
-- Nurturing state enum
CREATE TYPE nurturing_state_enum AS ENUM (
    'ONBOARDING',
    'NURTURING_ACTIVE',
    'AT_RISK',
    'LOYAL_CLIENT',
    'ADVOCATE',
    'CHURNED',
    'REACTIVATED'
);

-- Churn signal types
CREATE TYPE churn_signal_type_enum AS ENUM (
    'COMMUNICATION_FADE',
    'NEGATIVE_SENTIMENT',
    'COMPETITOR_MENTION',
    'SUPPORT_ESCALATION',
    'ORDER_FREQUENCY_DROP',
    'PAYMENT_DELAY',
    'PRICE_COMPLAINT',
    'QUALITY_COMPLAINT'
);

-- Referral types
CREATE TYPE referral_type_enum AS ENUM (
    'EXPLICIT',
    'SOFT_MENTION',
    'NEIGHBOR_STRATEGY',
    'GROUP_DEAL'
);

-- Referral status
CREATE TYPE referral_status_enum AS ENUM (
    'PENDING_CONSENT',
    'AWAITING_CONSENT',
    'ACTIVE',
    'CONTACTED',
    'CONVERTED',
    'REJECTED',
    'EXPIRED'
);

-- Relation types
CREATE TYPE relation_type_enum AS ENUM (
    'NEIGHBOR',
    'SAME_ASSOCIATION',
    'SHARED_SHAREHOLDER',
    'RECOMMENDED_BY',
    'SUPPLY_CHAIN',
    'FAMILY_BUSINESS',
    'BEHAVIORAL_CLUSTER',
    'MEMBER_OF'
);

-- Cluster types
CREATE TYPE cluster_type_enum AS ENUM (
    'GEOGRAPHIC',
    'BEHAVIORAL',
    'FORMAL_ASSOCIATION',
    'IMPLICIT_COOPERATIVE',
    'OUAI',
    'COOPERATIVE'
);

-- Content types
CREATE TYPE content_type_enum AS ENUM (
    'EDUCATIONAL',
    'PRODUCT_UPDATE',
    'SEASONAL_TIP',
    'SUCCESS_STORY',
    'PROMOTIONAL',
    'NPS_SURVEY',
    'REFERRAL_REQUEST'
);
```

---

## Migration 002: Create Nurturing Core Tables

```sql
-- migrations/20260119_002_create_nurturing_tables.sql

-- Main nurturing state table
CREATE TABLE gold_nurturing_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    
    current_state nurturing_state_enum NOT NULL DEFAULT 'ONBOARDING',
    previous_state nurturing_state_enum,
    state_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    onboarding_started_at TIMESTAMPTZ,
    onboarding_completed_at TIMESTAMPTZ,
    first_order_at TIMESTAMPTZ,
    last_order_at TIMESTAMPTZ,
    last_interaction_at TIMESTAMPTZ,
    
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    average_order_value DECIMAL(15,2) DEFAULT 0,
    order_frequency_days DECIMAL(5,1),
    
    nps_score INTEGER,
    last_nps_survey_at TIMESTAMPTZ,
    nps_category VARCHAR(20),
    satisfaction_trend VARCHAR(20),
    
    churn_risk_score DECIMAL(5,2),
    churn_risk_level VARCHAR(20),
    days_since_last_order INTEGER,
    is_at_risk BOOLEAN DEFAULT FALSE,
    at_risk_since TIMESTAMPTZ,
    
    referral_count INTEGER DEFAULT 0,
    successful_referrals INTEGER DEFAULT 0,
    is_advocate BOOLEAN DEFAULT FALSE,
    advocate_since TIMESTAMPTZ,
    kol_score DECIMAL(5,2),
    
    preferred_channel VARCHAR(20),
    communication_frequency VARCHAR(20),
    last_content_sent_at TIMESTAMPTZ,
    content_engagement_rate DECIMAL(5,2),
    
    geographic_cluster_id UUID,
    neighbor_count INTEGER DEFAULT 0,
    
    assigned_account_manager UUID REFERENCES users(id),
    tags JSONB DEFAULT '[]',
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_nurturing_state_unique ON gold_nurturing_state(tenant_id, client_id);
CREATE INDEX idx_nurturing_state_current ON gold_nurturing_state(tenant_id, current_state);
CREATE INDEX idx_nurturing_state_churn ON gold_nurturing_state(tenant_id, churn_risk_score DESC) WHERE is_at_risk = TRUE;
CREATE INDEX idx_nurturing_state_advocate ON gold_nurturing_state(tenant_id, kol_score DESC) WHERE is_advocate = TRUE;

-- Actions audit table
CREATE TABLE gold_nurturing_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    nurturing_state_id UUID NOT NULL REFERENCES gold_nurturing_state(id),
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    
    action_type VARCHAR(50) NOT NULL,
    action_category VARCHAR(30) NOT NULL,
    trigger_type VARCHAR(30) NOT NULL,
    trigger_event VARCHAR(100),
    trigger_data JSONB,
    
    channel VARCHAR(20) NOT NULL,
    content_template_id UUID,
    content_subject VARCHAR(255),
    content_body TEXT,
    content_personalization JSONB,
    
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    response_received BOOLEAN DEFAULT FALSE,
    response_at TIMESTAMPTZ,
    response_content TEXT,
    response_sentiment VARCHAR(20),
    
    message_id VARCHAR(255),
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    
    error_code VARCHAR(50),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    correlation_id UUID,
    batch_id UUID,
    campaign_id UUID,
    
    scheduled_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nurturing_actions_tenant ON gold_nurturing_actions(tenant_id, created_at DESC);
CREATE INDEX idx_nurturing_actions_client ON gold_nurturing_actions(client_id, created_at DESC);
CREATE INDEX idx_nurturing_actions_status ON gold_nurturing_actions(status, scheduled_at);
```

---

## Migration 003: Create Churn Tables

```sql
-- migrations/20260119_003_create_churn_tables.sql

CREATE TABLE gold_churn_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    nurturing_state_id UUID REFERENCES gold_nurturing_state(id),
    
    signal_type churn_signal_type_enum NOT NULL,
    signal_category VARCHAR(30) NOT NULL,
    strength DECIMAL(5,2) NOT NULL,
    confidence DECIMAL(5,2) NOT NULL,
    
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    detection_method VARCHAR(50) NOT NULL,
    detection_source VARCHAR(50),
    
    evidence_source_type VARCHAR(30),
    evidence_source_id UUID,
    evidence_details JSONB,
    evidence_text TEXT,
    
    is_recurring BOOLEAN DEFAULT FALSE,
    occurrence_count INTEGER DEFAULT 1,
    first_occurrence_at TIMESTAMPTZ,
    trend_direction VARCHAR(20),
    
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolution_type VARCHAR(30),
    resolution_notes TEXT,
    
    correlation_id UUID,
    related_signal_ids UUID[],
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_churn_signals_client ON gold_churn_signals(tenant_id, client_id);
CREATE INDEX idx_churn_signals_active ON gold_churn_signals(tenant_id, is_resolved, strength DESC);
CREATE INDEX idx_churn_signals_detection ON gold_churn_signals(detected_at DESC);

CREATE TABLE gold_churn_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    
    overall_churn_score DECIMAL(5,2) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    
    communication_score DECIMAL(5,2),
    sentiment_score DECIMAL(5,2),
    order_frequency_score DECIMAL(5,2),
    payment_behavior_score DECIMAL(5,2),
    engagement_score DECIMAL(5,2),
    support_score DECIMAL(5,2),
    
    factor_breakdown JSONB DEFAULT '{}',
    
    days_since_last_order INTEGER,
    days_since_last_contact INTEGER,
    order_frequency_change DECIMAL(5,2),
    
    compared_to_segment_avg DECIMAL(5,2),
    segment VARCHAR(50),
    
    active_signal_count INTEGER DEFAULT 0,
    strongest_signal_type churn_signal_type_enum,
    strongest_signal_strength DECIMAL(5,2),
    
    predicted_churn_date DATE,
    prediction_confidence DECIMAL(5,2),
    
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_churn_factors_unique ON gold_churn_factors(tenant_id, client_id);
CREATE INDEX idx_churn_factors_risk ON gold_churn_factors(tenant_id, risk_level, overall_churn_score DESC);

CREATE TABLE gold_sentiment_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    source_type VARCHAR(30) NOT NULL,
    source_id UUID NOT NULL,
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    
    original_text TEXT NOT NULL,
    cleaned_text TEXT,
    language VARCHAR(10) DEFAULT 'ro',
    
    sentiment_label VARCHAR(20) NOT NULL,
    sentiment_score DECIMAL(5,4),
    confidence DECIMAL(5,4) NOT NULL,
    
    emotions JSONB DEFAULT '{}',
    dominant_emotion VARCHAR(30),
    
    intents JSONB DEFAULT '[]',
    primary_intent VARCHAR(50),
    
    topics JSONB DEFAULT '[]',
    mentioned_products JSONB DEFAULT '[]',
    mentioned_competitors JSONB DEFAULT '[]',
    
    churn_indicators JSONB DEFAULT '[]',
    churn_signal_strength DECIMAL(5,2),
    generated_churn_signal_id UUID REFERENCES gold_churn_signals(id),
    
    model_name VARCHAR(50) NOT NULL,
    model_version VARCHAR(20),
    processing_time_ms INTEGER,
    
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_created_at TIMESTAMPTZ
);

CREATE INDEX idx_sentiment_client ON gold_sentiment_analysis(tenant_id, client_id);
CREATE INDEX idx_sentiment_negative ON gold_sentiment_analysis(client_id, analyzed_at DESC) WHERE sentiment_label = 'NEGATIVE';
```

---

## Migration 004: Create Referral Tables

```sql
-- migrations/20260119_004_create_referral_tables.sql

CREATE TABLE gold_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    referrer_client_id UUID NOT NULL REFERENCES gold_clients(id),
    referrer_name VARCHAR(200),
    
    referred_prospect_id UUID REFERENCES gold_contacts(id),
    referred_contact_name VARCHAR(200),
    referred_contact_phone VARCHAR(30),
    referred_contact_email VARCHAR(255),
    referred_company_name VARCHAR(200),
    referred_company_cui VARCHAR(20),
    
    referral_type referral_type_enum NOT NULL,
    referral_source VARCHAR(50) NOT NULL,
    
    consent_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REQUEST',
    consent_given BOOLEAN DEFAULT FALSE,
    consent_given_at TIMESTAMPTZ,
    consent_proof_type VARCHAR(30),
    consent_proof_message_id UUID,
    consent_asked_at TIMESTAMPTZ,
    consent_reminder_count INTEGER DEFAULT 0,
    
    context_message TEXT,
    relationship_description TEXT,
    relationship_type relation_type_enum,
    
    distance_from_referrer_km DECIMAL(10,2),
    same_cluster BOOLEAN DEFAULT FALSE,
    cluster_id UUID,
    
    approach_script TEXT,
    approach_channel VARCHAR(20),
    approach_timing VARCHAR(50),
    
    status referral_status_enum NOT NULL DEFAULT 'PENDING_CONSENT',
    
    contact_attempts INTEGER DEFAULT 0,
    first_contact_at TIMESTAMPTZ,
    last_contact_at TIMESTAMPTZ,
    contact_history JSONB DEFAULT '[]',
    
    converted BOOLEAN DEFAULT FALSE,
    converted_at TIMESTAMPTZ,
    converted_order_id UUID REFERENCES gold_orders(id),
    converted_order_value DECIMAL(15,2),
    
    reward_type VARCHAR(30),
    reward_value DECIMAL(15,2),
    reward_currency VARCHAR(3) DEFAULT 'RON',
    reward_status VARCHAR(20),
    reward_paid_at TIMESTAMPTZ,
    
    referrer_last_asked_at TIMESTAMPTZ,
    expiry_reason VARCHAR(50),
    
    correlation_id UUID,
    campaign_id UUID,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referrals_tenant ON gold_referrals(tenant_id, created_at DESC);
CREATE INDEX idx_referrals_referrer ON gold_referrals(referrer_client_id, status);
CREATE INDEX idx_referrals_status ON gold_referrals(tenant_id, status, created_at DESC);
CREATE INDEX idx_referrals_converted ON gold_referrals(converted, tenant_id) WHERE converted = TRUE;

CREATE TABLE gold_entity_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    source_entity_type VARCHAR(30) NOT NULL,
    source_entity_id UUID NOT NULL,
    target_entity_type VARCHAR(30) NOT NULL,
    target_entity_id UUID NOT NULL,
    
    relation_type relation_type_enum NOT NULL,
    relation_subtype VARCHAR(50),
    
    strength DECIMAL(5,2) NOT NULL,
    confidence_score DECIMAL(5,2) NOT NULL,
    bidirectional BOOLEAN DEFAULT TRUE,
    
    evidence_source VARCHAR(50) NOT NULL,
    evidence_source_id UUID,
    evidence_details JSONB,
    evidence_text TEXT,
    
    distance_meters DECIMAL(15,2),
    location_source_a GEOGRAPHY(POINT, 4326),
    location_source_b GEOGRAPHY(POINT, 4326),
    
    valid_from DATE,
    valid_until DATE,
    last_verified_at TIMESTAMPTZ,
    verification_count INTEGER DEFAULT 1,
    
    is_active BOOLEAN DEFAULT TRUE,
    deactivated_at TIMESTAMPTZ,
    deactivation_reason VARCHAR(100),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_relationships_source ON gold_entity_relationships(source_entity_id, relation_type);
CREATE INDEX idx_relationships_target ON gold_entity_relationships(target_entity_id, relation_type);
CREATE INDEX idx_relationships_geo_a ON gold_entity_relationships USING GIST (location_source_a);
CREATE INDEX idx_relationships_geo_b ON gold_entity_relationships USING GIST (location_source_b);

CREATE UNIQUE INDEX idx_relationships_unique 
    ON gold_entity_relationships(tenant_id, source_entity_id, target_entity_id, relation_type)
    WHERE is_active = TRUE;
```

---

## Migration 005-007: Clusters, Associations, KOL, Win-Back

```sql
-- See etapa5-schema-clusters.md for full schema
-- migrations/20260119_005_create_cluster_tables.sql
-- migrations/20260119_006_create_association_tables.sql  
-- migrations/20260119_007_create_winback_tables.sql
```

---

## Migration 008: Create HITL Tables

```sql
-- migrations/20260119_008_create_hitl_e5_tables.sql

CREATE TABLE gold_hitl_tasks_e5 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    task_type VARCHAR(50) NOT NULL,
    task_number SERIAL,
    
    priority VARCHAR(20) NOT NULL,
    sla_deadline TIMESTAMPTZ NOT NULL,
    sla_warning_at TIMESTAMPTZ,
    sla_status VARCHAR(20) DEFAULT 'OK',
    
    client_id UUID REFERENCES gold_clients(id),
    entity_type VARCHAR(30),
    entity_id UUID,
    
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ,
    assignment_method VARCHAR(30),
    
    context JSONB NOT NULL,
    
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    resolution VARCHAR(50),
    resolution_notes TEXT,
    action_taken TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    
    followup_scheduled BOOLEAN DEFAULT FALSE,
    followup_at TIMESTAMPTZ,
    followup_task_id UUID REFERENCES gold_hitl_tasks_e5(id),
    
    escalation_level INTEGER DEFAULT 0,
    escalated_at TIMESTAMPTZ,
    escalated_to UUID REFERENCES users(id),
    escalation_reason TEXT,
    
    correlation_id UUID,
    source_worker VARCHAR(100),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hitl_e5_tenant_status ON gold_hitl_tasks_e5(tenant_id, status, priority);
CREATE INDEX idx_hitl_e5_assigned ON gold_hitl_tasks_e5(assigned_to, status);
CREATE INDEX idx_hitl_e5_sla ON gold_hitl_tasks_e5(sla_deadline) WHERE status = 'PENDING';
```

---

## Rollback Scripts

```sql
-- rollback/20260119_rollback_all_e5.sql

DROP TABLE IF EXISTS gold_hitl_tasks_e5;
DROP TABLE IF EXISTS gold_winback_campaigns;
DROP TABLE IF EXISTS gold_competitor_intel;
DROP TABLE IF EXISTS gold_content_drips;
DROP TABLE IF EXISTS gold_nps_surveys;
DROP TABLE IF EXISTS gold_kol_profiles;
DROP TABLE IF EXISTS gold_affiliations;
DROP TABLE IF EXISTS gold_cooperatives;
DROP TABLE IF EXISTS gold_ouai_registry;
DROP TABLE IF EXISTS gold_associations;
DROP TABLE IF EXISTS gold_cluster_members;
DROP TABLE IF EXISTS gold_clusters;
DROP TABLE IF EXISTS gold_proximity_scores;
DROP TABLE IF EXISTS gold_entity_relationships;
DROP TABLE IF EXISTS gold_referrals;
DROP TABLE IF EXISTS gold_sentiment_analysis;
DROP TABLE IF EXISTS gold_churn_factors;
DROP TABLE IF EXISTS gold_churn_signals;
DROP TABLE IF EXISTS gold_nurturing_actions;
DROP TABLE IF EXISTS gold_nurturing_state;

DROP TYPE IF EXISTS content_type_enum;
DROP TYPE IF EXISTS cluster_type_enum;
DROP TYPE IF EXISTS relation_type_enum;
DROP TYPE IF EXISTS referral_status_enum;
DROP TYPE IF EXISTS referral_type_enum;
DROP TYPE IF EXISTS churn_signal_type_enum;
DROP TYPE IF EXISTS nurturing_state_enum;
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
