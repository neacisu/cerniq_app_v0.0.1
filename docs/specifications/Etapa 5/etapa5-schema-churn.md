# CERNIQ.APP — ETAPA 5: DATABASE SCHEMA
## Churn Detection & Win-Back Tables
### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. gold_churn_signals

```sql
CREATE TABLE gold_churn_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Client Reference
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    nurturing_state_id UUID REFERENCES gold_nurturing_state(id),
    
    -- Signal Type
    signal_type churn_signal_type_enum NOT NULL,
    signal_category VARCHAR(30) NOT NULL,
    
    -- Signal Strength
    strength DECIMAL(5,2) NOT NULL,
    confidence DECIMAL(5,2) NOT NULL,
    
    -- Detection
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    detection_method VARCHAR(50) NOT NULL,
    detection_source VARCHAR(50),
    
    -- Evidence
    evidence_source_type VARCHAR(30),
    evidence_source_id UUID,
    evidence_details JSONB,
    evidence_text TEXT,
    
    -- Trend
    is_recurring BOOLEAN DEFAULT FALSE,
    occurrence_count INTEGER DEFAULT 1,
    first_occurrence_at TIMESTAMPTZ,
    trend_direction VARCHAR(20),
    
    -- Resolution
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolution_type VARCHAR(30),
    resolution_notes TEXT,
    
    -- Correlation
    correlation_id UUID,
    related_signal_ids UUID[],
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_churn_signals_tenant_client ON gold_churn_signals(tenant_id, client_id);
CREATE INDEX idx_churn_signals_active ON gold_churn_signals(tenant_id, is_resolved, strength DESC);
CREATE INDEX idx_churn_signals_type ON gold_churn_signals(tenant_id, signal_type, detected_at DESC);
```

---

## 2. gold_churn_factors

```sql
CREATE TABLE gold_churn_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Client
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    
    -- Aggregated Churn Score
    overall_churn_score DECIMAL(5,2) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    
    -- Individual Factors
    communication_score DECIMAL(5,2),
    sentiment_score DECIMAL(5,2),
    order_frequency_score DECIMAL(5,2),
    payment_behavior_score DECIMAL(5,2),
    engagement_score DECIMAL(5,2),
    support_score DECIMAL(5,2),
    
    -- Weighted Factors
    factor_breakdown JSONB DEFAULT '{}',
    
    -- Temporal Analysis
    days_since_last_order INTEGER,
    days_since_last_contact INTEGER,
    order_frequency_change DECIMAL(5,2),
    
    -- Comparative Analysis
    compared_to_segment_avg DECIMAL(5,2),
    segment VARCHAR(50),
    
    -- Active Signals Summary
    active_signal_count INTEGER DEFAULT 0,
    strongest_signal_type churn_signal_type_enum,
    strongest_signal_strength DECIMAL(5,2),
    
    -- Prediction
    predicted_churn_date DATE,
    prediction_confidence DECIMAL(5,2),
    
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_churn_factors_unique ON gold_churn_factors(tenant_id, client_id);
CREATE INDEX idx_churn_factors_risk ON gold_churn_factors(tenant_id, risk_level, overall_churn_score DESC);
```

---

## 3. gold_sentiment_analysis

```sql
CREATE TABLE gold_sentiment_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Source
    source_type VARCHAR(30) NOT NULL,
    source_id UUID NOT NULL,
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    
    -- Content
    original_text TEXT NOT NULL,
    cleaned_text TEXT,
    language VARCHAR(10) DEFAULT 'ro',
    
    -- Sentiment Scores
    sentiment_label VARCHAR(20) NOT NULL,
    sentiment_score DECIMAL(5,4),
    confidence DECIMAL(5,4) NOT NULL,
    
    -- Emotion Detection
    emotions JSONB DEFAULT '{}',
    dominant_emotion VARCHAR(30),
    
    -- Intent Detection
    intents JSONB DEFAULT '[]',
    primary_intent VARCHAR(50),
    
    -- Topic Extraction
    topics JSONB DEFAULT '[]',
    mentioned_products JSONB DEFAULT '[]',
    mentioned_competitors JSONB DEFAULT '[]',
    
    -- Churn Signals
    churn_indicators JSONB DEFAULT '[]',
    churn_signal_strength DECIMAL(5,2),
    generated_churn_signal_id UUID REFERENCES gold_churn_signals(id),
    
    -- Model Info
    model_name VARCHAR(50) NOT NULL,
    model_version VARCHAR(20),
    processing_time_ms INTEGER,
    
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_created_at TIMESTAMPTZ
);

CREATE INDEX idx_sentiment_tenant_client ON gold_sentiment_analysis(tenant_id, client_id);
CREATE INDEX idx_sentiment_label ON gold_sentiment_analysis(tenant_id, sentiment_label, analyzed_at DESC);
CREATE INDEX idx_sentiment_negative ON gold_sentiment_analysis(client_id, analyzed_at DESC) 
    WHERE sentiment_label = 'NEGATIVE';
```

---

## 4. gold_winback_campaigns

```sql
CREATE TABLE gold_winback_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Target Client
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    nurturing_state_id UUID REFERENCES gold_nurturing_state(id),
    
    -- Campaign Info
    campaign_name VARCHAR(100) NOT NULL,
    campaign_type VARCHAR(30) NOT NULL,
    
    -- Trigger
    triggered_by VARCHAR(30) NOT NULL,
    trigger_churn_signal_id UUID REFERENCES gold_churn_signals(id),
    days_dormant INTEGER,
    
    -- Strategy
    strategy JSONB NOT NULL,
    offer_type VARCHAR(30),
    offer_value DECIMAL(15,2),
    offer_code VARCHAR(50),
    offer_valid_until DATE,
    
    -- Execution
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER NOT NULL,
    
    -- Contact Attempts
    attempts JSONB DEFAULT '[]',
    last_attempt_at TIMESTAMPTZ,
    total_attempts INTEGER DEFAULT 0,
    
    -- Results
    client_responded BOOLEAN DEFAULT FALSE,
    response_at TIMESTAMPTZ,
    response_type VARCHAR(30),
    
    -- Conversion
    converted BOOLEAN DEFAULT FALSE,
    converted_at TIMESTAMPTZ,
    conversion_order_id UUID REFERENCES gold_orders(id),
    conversion_value DECIMAL(15,2),
    
    -- Attribution
    attributed_revenue DECIMAL(15,2),
    campaign_cost DECIMAL(15,2),
    roi DECIMAL(10,2),
    
    -- HITL
    requires_hitl BOOLEAN DEFAULT FALSE,
    hitl_task_id UUID,
    approved_by UUID REFERENCES users(id),
    
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_winback_tenant_client ON gold_winback_campaigns(tenant_id, client_id);
CREATE INDEX idx_winback_status ON gold_winback_campaigns(tenant_id, status, started_at DESC);
CREATE INDEX idx_winback_conversion ON gold_winback_campaigns(converted, tenant_id) WHERE converted = TRUE;
```

---

## 5. gold_competitor_intel

```sql
CREATE TABLE gold_competitor_intel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Source
    source_type VARCHAR(30) NOT NULL,
    source_id UUID,
    client_id UUID REFERENCES gold_clients(id),
    
    -- Competitor Info
    competitor_name VARCHAR(100) NOT NULL,
    competitor_normalized VARCHAR(100),
    competitor_id UUID,
    
    -- Mention Context
    mention_context TEXT,
    mention_sentiment VARCHAR(20),
    
    -- Intelligence Type
    intel_type VARCHAR(30) NOT NULL,
    
    -- Price Intel (AGGREGATED only - compliance)
    price_intel JSONB,
    
    -- Product Intel
    product_mentioned VARCHAR(200),
    feature_mentioned VARCHAR(200),
    
    -- Extraction
    extracted_by VARCHAR(30) NOT NULL,
    extraction_confidence DECIMAL(5,2),
    
    -- Compliance
    is_aggregated BOOLEAN DEFAULT TRUE,
    compliance_reviewed BOOLEAN DEFAULT FALSE,
    compliance_approved_by UUID,
    
    mentioned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_competitor_tenant ON gold_competitor_intel(tenant_id, competitor_name);
CREATE INDEX idx_competitor_client ON gold_competitor_intel(client_id, mentioned_at DESC);

-- Compliance constraint - no individual pricing
ALTER TABLE gold_competitor_intel 
    ADD CONSTRAINT competitor_intel_aggregated 
    CHECK (intel_type != 'PRICE' OR is_aggregated = TRUE);
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
