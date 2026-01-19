# CERNIQ.APP — ETAPA 4: SCHEMA CREDIT SCORING & LIMITS
## Database Schema pentru Credit Scoring și Limite de Credit
### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [Overview Schema Credit](#1-overview)
2. [Enums & Types](#2-enums-types)
3. [Tabel: gold_credit_profiles](#3-gold-credit-profiles)
4. [Tabel: gold_credit_scores_history](#4-gold-credit-scores-history)
5. [Tabel: gold_credit_reservations](#5-gold-credit-reservations)
6. [Tabel: gold_credit_adjustments](#6-gold-credit-adjustments)
7. [Tabel: gold_termene_data](#7-gold-termene-data)
8. [Functions & Triggers](#8-functions)
9. [Views](#9-views)

---

## 1. Overview Schema Credit {#1-overview}

Schema pentru credit scoring gestionează:
- **Credit Profiles**: Profil credit per client cu score și limite
- **Score History**: Istoric evoluție credit score
- **Reservations**: Blocări temporare credit pentru comenzi
- **Adjustments**: Ajustări manuale limite credit
- **Termene Data**: Date raw de la Termene.ro

### Credit Score Tiers
```
0-29:   BLOCKED     (No credit)
30-49:  LOW         (Max 5,000 EUR)
50-69:  MEDIUM      (Max 20,000 EUR)
70-89:  HIGH        (Max 50,000 EUR)
90-100: PREMIUM     (Custom limit, requires approval)
```

---

## 2. Enums & Types {#2-enums-types}

```sql
-- Risk Tier
CREATE TYPE risk_tier_enum AS ENUM (
    'BLOCKED',
    'LOW',
    'MEDIUM',
    'HIGH',
    'PREMIUM'
);

-- Credit Score Source
CREATE TYPE credit_score_source_enum AS ENUM (
    'TERMENE_RO',
    'ANAF_DIRECT',
    'MANUAL_OVERRIDE',
    'INITIAL_DEFAULT',
    'PAYMENT_HISTORY'
);

-- Credit Reservation Status
CREATE TYPE credit_reservation_status_enum AS ENUM (
    'ACTIVE',
    'RELEASED',
    'EXPIRED',
    'CONVERTED'  -- Converted to actual usage
);

-- Credit Adjustment Type
CREATE TYPE credit_adjustment_type_enum AS ENUM (
    'LIMIT_INCREASE',
    'LIMIT_DECREASE',
    'MANUAL_BLOCK',
    'MANUAL_UNBLOCK',
    'SCORE_OVERRIDE',
    'TIER_CHANGE'
);

-- ANAF Fiscal Status
CREATE TYPE anaf_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'CANCELLED',
    'UNKNOWN'
);

-- BPI Status (Insolvență)
CREATE TYPE bpi_status_enum AS ENUM (
    'CLEAR',
    'INSOLVENCY_PROCEEDINGS',
    'BANKRUPTCY',
    'DISSOLUTION',
    'STRIKE_OFF'
);
```

---

## 3. Tabel: gold_credit_profiles {#3-gold-credit-profiles}

```sql
CREATE TABLE gold_credit_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Client Reference
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    cui VARCHAR(20) NOT NULL,  -- For quick lookup
    
    -- Credit Score (0-100)
    credit_score INTEGER NOT NULL DEFAULT 50 CHECK (credit_score BETWEEN 0 AND 100),
    risk_tier risk_tier_enum NOT NULL DEFAULT 'MEDIUM',
    
    -- Credit Limits
    credit_limit DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
    credit_used DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (credit_used >= 0),
    credit_reserved DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (credit_reserved >= 0),
    credit_available DECIMAL(15,2) GENERATED ALWAYS AS (
        credit_limit - credit_used - credit_reserved
    ) STORED,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    
    -- Scoring Components (0-100 each)
    score_anaf_status INTEGER DEFAULT 50,
    score_financial_health INTEGER DEFAULT 50,
    score_payment_history INTEGER DEFAULT 50,
    score_bpi_status INTEGER DEFAULT 50,
    score_litigation_risk INTEGER DEFAULT 50,
    
    -- Data Sources Status
    last_anaf_check TIMESTAMPTZ,
    last_termene_check TIMESTAMPTZ,
    last_bpi_check TIMESTAMPTZ,
    last_payment_analysis TIMESTAMPTZ,
    
    -- ANAF Data Snapshot
    anaf_status anaf_status_enum DEFAULT 'UNKNOWN',
    anaf_tva_registered BOOLEAN,
    anaf_tva_split BOOLEAN DEFAULT FALSE,
    
    -- BPI Data Snapshot
    bpi_status bpi_status_enum DEFAULT 'CLEAR',
    bpi_last_check_date DATE,
    
    -- Financial Data Snapshot
    cifra_afaceri DECIMAL(15,2),
    profit_net DECIMAL(15,2),
    datorii_totale DECIMAL(15,2),
    financial_year INTEGER,
    
    -- Payment History with Us
    total_orders INTEGER DEFAULT 0,
    total_paid DECIMAL(15,2) DEFAULT 0,
    total_overdue_ever DECIMAL(15,2) DEFAULT 0,
    avg_payment_delay_days DECIMAL(5,2) DEFAULT 0,
    current_overdue DECIMAL(15,2) DEFAULT 0,
    
    -- Flags
    is_blocked BOOLEAN DEFAULT FALSE,
    block_reason VARCHAR(255),
    blocked_at TIMESTAMPTZ,
    blocked_by UUID REFERENCES users(id),
    
    requires_prepayment BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,
    
    -- Auto-calculation Settings
    auto_update_enabled BOOLEAN DEFAULT TRUE,
    next_scheduled_update TIMESTAMPTZ,
    update_frequency_days INTEGER DEFAULT 7,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_scored_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT uq_credit_profile_client UNIQUE (tenant_id, client_id),
    CONSTRAINT uq_credit_profile_cui UNIQUE (tenant_id, cui),
    CONSTRAINT chk_credit_usage CHECK (credit_used + credit_reserved <= credit_limit + 0.01)
);

-- Indexes
CREATE INDEX idx_credit_profiles_tenant ON gold_credit_profiles(tenant_id);
CREATE INDEX idx_credit_profiles_client ON gold_credit_profiles(client_id);
CREATE INDEX idx_credit_profiles_cui ON gold_credit_profiles(cui);
CREATE INDEX idx_credit_profiles_risk_tier ON gold_credit_profiles(risk_tier);
CREATE INDEX idx_credit_profiles_score ON gold_credit_profiles(credit_score);
CREATE INDEX idx_credit_profiles_next_update ON gold_credit_profiles(next_scheduled_update)
    WHERE auto_update_enabled = TRUE;
CREATE INDEX idx_credit_profiles_blocked ON gold_credit_profiles(tenant_id)
    WHERE is_blocked = TRUE;

-- Trigger pentru updated_at
CREATE TRIGGER trg_credit_profiles_updated
    BEFORE UPDATE ON gold_credit_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 4. Tabel: gold_credit_scores_history {#4-gold-credit-scores-history}

```sql
CREATE TABLE gold_credit_scores_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Reference
    credit_profile_id UUID NOT NULL REFERENCES gold_credit_profiles(id),
    
    -- Score Snapshot
    credit_score INTEGER NOT NULL,
    previous_score INTEGER,
    score_change INTEGER GENERATED ALWAYS AS (credit_score - COALESCE(previous_score, credit_score)) STORED,
    
    risk_tier risk_tier_enum NOT NULL,
    previous_tier risk_tier_enum,
    
    -- Component Scores
    score_components JSONB NOT NULL DEFAULT '{}',
    -- Example: {"anaf": 80, "financial": 65, "payment": 90, "bpi": 100, "litigation": 85}
    
    -- Source
    source credit_score_source_enum NOT NULL,
    source_details JSONB,
    
    -- Limit Changes
    credit_limit_before DECIMAL(15,2),
    credit_limit_after DECIMAL(15,2),
    
    -- Correlation
    correlation_id UUID,
    triggered_by VARCHAR(100), -- 'CRON', 'MANUAL', 'ORDER_PLACED', 'PAYMENT_RECEIVED'
    
    -- Timestamps
    scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (scored_at);

-- Create partitions for 2026
CREATE TABLE gold_credit_scores_history_2026_q1 PARTITION OF gold_credit_scores_history
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE gold_credit_scores_history_2026_q2 PARTITION OF gold_credit_scores_history
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE gold_credit_scores_history_2026_q3 PARTITION OF gold_credit_scores_history
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE gold_credit_scores_history_2026_q4 PARTITION OF gold_credit_scores_history
    FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

-- Indexes
CREATE INDEX idx_credit_history_profile ON gold_credit_scores_history(credit_profile_id);
CREATE INDEX idx_credit_history_scored_at ON gold_credit_scores_history(scored_at DESC);
CREATE INDEX idx_credit_history_tenant ON gold_credit_scores_history(tenant_id);
```

---

## 5. Tabel: gold_credit_reservations {#5-gold-credit-reservations}

```sql
CREATE TABLE gold_credit_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- References
    credit_profile_id UUID NOT NULL REFERENCES gold_credit_profiles(id),
    order_id UUID NOT NULL REFERENCES gold_orders(id),
    
    -- Amount
    reserved_amount DECIMAL(15,2) NOT NULL CHECK (reserved_amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    
    -- Status
    status credit_reservation_status_enum NOT NULL DEFAULT 'ACTIVE',
    
    -- Expiry
    expires_at TIMESTAMPTZ NOT NULL,
    grace_period_until TIMESTAMPTZ,
    
    -- Resolution
    released_at TIMESTAMPTZ,
    released_reason VARCHAR(100),
    converted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT uq_reservation_order UNIQUE (order_id)
);

-- Indexes
CREATE INDEX idx_reservations_profile ON gold_credit_reservations(credit_profile_id);
CREATE INDEX idx_reservations_status ON gold_credit_reservations(status);
CREATE INDEX idx_reservations_expires ON gold_credit_reservations(expires_at)
    WHERE status = 'ACTIVE';
CREATE INDEX idx_reservations_tenant ON gold_credit_reservations(tenant_id);

-- Trigger pentru auto-update credit_reserved în profile
CREATE OR REPLACE FUNCTION update_credit_reserved()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE gold_credit_profiles
    SET credit_reserved = (
        SELECT COALESCE(SUM(reserved_amount), 0)
        FROM gold_credit_reservations
        WHERE credit_profile_id = COALESCE(NEW.credit_profile_id, OLD.credit_profile_id)
          AND status = 'ACTIVE'
    )
    WHERE id = COALESCE(NEW.credit_profile_id, OLD.credit_profile_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_credit_reserved
    AFTER INSERT OR UPDATE OR DELETE ON gold_credit_reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_credit_reserved();
```

---

## 6. Tabel: gold_credit_adjustments {#6-gold-credit-adjustments}

```sql
CREATE TABLE gold_credit_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Reference
    credit_profile_id UUID NOT NULL REFERENCES gold_credit_profiles(id),
    
    -- Adjustment Type
    adjustment_type credit_adjustment_type_enum NOT NULL,
    
    -- Values
    previous_value DECIMAL(15,2),
    new_value DECIMAL(15,2),
    adjustment_amount DECIMAL(15,2),
    
    -- For score adjustments
    previous_score INTEGER,
    new_score INTEGER,
    previous_tier risk_tier_enum,
    new_tier risk_tier_enum,
    
    -- Reason & Approval
    reason TEXT NOT NULL,
    supporting_documents JSONB, -- Links to uploaded docs
    
    -- HITL
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_id UUID REFERENCES hitl_approvals(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    -- Actor
    requested_by UUID NOT NULL REFERENCES users(id),
    
    -- Timestamps
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_until TIMESTAMPTZ, -- NULL = permanent
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_adjustments_profile ON gold_credit_adjustments(credit_profile_id);
CREATE INDEX idx_adjustments_type ON gold_credit_adjustments(adjustment_type);
CREATE INDEX idx_adjustments_tenant ON gold_credit_adjustments(tenant_id);
CREATE INDEX idx_adjustments_effective ON gold_credit_adjustments(effective_from, effective_until);
```

---

## 7. Tabel: gold_termene_data {#7-gold-termene-data}

```sql
CREATE TABLE gold_termene_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Reference
    credit_profile_id UUID REFERENCES gold_credit_profiles(id),
    cui VARCHAR(20) NOT NULL,
    
    -- Data Type
    data_type VARCHAR(50) NOT NULL, -- 'ANAF', 'BILANT', 'BPI', 'LITIGII'
    
    -- Raw Data
    raw_response JSONB NOT NULL,
    
    -- Parsed Data
    parsed_data JSONB,
    
    -- Status
    fetch_status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, PARTIAL, FAILED
    error_message TEXT,
    
    -- API Metadata
    api_endpoint VARCHAR(255),
    api_response_time_ms INTEGER,
    api_request_id VARCHAR(100),
    
    -- Timestamps
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_termene_cui ON gold_termene_data(cui);
CREATE INDEX idx_termene_profile ON gold_termene_data(credit_profile_id);
CREATE INDEX idx_termene_type ON gold_termene_data(data_type);
CREATE INDEX idx_termene_fetched ON gold_termene_data(fetched_at DESC);

-- Cleanup old data (keep 90 days)
CREATE INDEX idx_termene_cleanup ON gold_termene_data(created_at)
    WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## 8. Functions & Triggers {#8-functions}

### Function: Calculate Credit Score
```sql
CREATE OR REPLACE FUNCTION calculate_credit_score(
    p_anaf_status INTEGER,
    p_financial_health INTEGER,
    p_payment_history INTEGER,
    p_bpi_status INTEGER,
    p_litigation_risk INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_score DECIMAL(5,2);
BEGIN
    -- Weighted average based on ADR-E4-003
    v_score := (
        p_anaf_status * 0.15 +
        p_financial_health * 0.30 +
        p_payment_history * 0.25 +
        p_bpi_status * 0.20 +
        p_litigation_risk * 0.10
    );
    
    RETURN ROUND(v_score)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Function: Determine Risk Tier
```sql
CREATE OR REPLACE FUNCTION determine_risk_tier(p_score INTEGER)
RETURNS risk_tier_enum AS $$
BEGIN
    RETURN CASE
        WHEN p_score < 30 THEN 'BLOCKED'::risk_tier_enum
        WHEN p_score < 50 THEN 'LOW'::risk_tier_enum
        WHEN p_score < 70 THEN 'MEDIUM'::risk_tier_enum
        WHEN p_score < 90 THEN 'HIGH'::risk_tier_enum
        ELSE 'PREMIUM'::risk_tier_enum
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Function: Get Default Credit Limit
```sql
CREATE OR REPLACE FUNCTION get_default_credit_limit(p_tier risk_tier_enum)
RETURNS DECIMAL(15,2) AS $$
BEGIN
    RETURN CASE p_tier
        WHEN 'BLOCKED' THEN 0
        WHEN 'LOW' THEN 5000
        WHEN 'MEDIUM' THEN 20000
        WHEN 'HIGH' THEN 50000
        WHEN 'PREMIUM' THEN 100000  -- Default, can be customized
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Function: Check Credit Availability
```sql
CREATE OR REPLACE FUNCTION check_credit_availability(
    p_client_id UUID,
    p_amount DECIMAL(15,2),
    p_tenant_id UUID
) RETURNS TABLE (
    is_available BOOLEAN,
    available_credit DECIMAL(15,2),
    requires_approval BOOLEAN,
    reason VARCHAR(255)
) AS $$
DECLARE
    v_profile gold_credit_profiles%ROWTYPE;
BEGIN
    SELECT * INTO v_profile
    FROM gold_credit_profiles
    WHERE client_id = p_client_id AND tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0::DECIMAL(15,2), TRUE, 'No credit profile found'::VARCHAR(255);
        RETURN;
    END IF;
    
    IF v_profile.is_blocked THEN
        RETURN QUERY SELECT FALSE, 0::DECIMAL(15,2), TRUE, ('Account blocked: ' || v_profile.block_reason)::VARCHAR(255);
        RETURN;
    END IF;
    
    IF v_profile.credit_available >= p_amount THEN
        RETURN QUERY SELECT TRUE, v_profile.credit_available, FALSE, 'Credit available'::VARCHAR(255);
    ELSIF v_profile.credit_available > 0 THEN
        RETURN QUERY SELECT FALSE, v_profile.credit_available, TRUE, 'Partial credit available, approval needed'::VARCHAR(255);
    ELSE
        RETURN QUERY SELECT FALSE, 0::DECIMAL(15,2), TRUE, 'No credit available'::VARCHAR(255);
    END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## 9. Views {#9-views}

### View: Credit Overview
```sql
CREATE VIEW v_credit_overview AS
SELECT
    cp.tenant_id,
    cp.client_id,
    gc.company_name,
    cp.cui,
    cp.credit_score,
    cp.risk_tier,
    cp.credit_limit,
    cp.credit_used,
    cp.credit_reserved,
    cp.credit_available,
    cp.is_blocked,
    cp.last_scored_at,
    cp.next_scheduled_update,
    -- Aggregated stats
    cp.total_orders,
    cp.total_paid,
    cp.current_overdue,
    cp.avg_payment_delay_days,
    -- ANAF status
    cp.anaf_status,
    cp.bpi_status
FROM gold_credit_profiles cp
JOIN gold_clients gc ON cp.client_id = gc.id;
```

### View: Credit At Risk
```sql
CREATE VIEW v_credit_at_risk AS
SELECT
    cp.*,
    gc.company_name,
    gc.contact_email
FROM gold_credit_profiles cp
JOIN gold_clients gc ON cp.client_id = gc.id
WHERE cp.current_overdue > 0
   OR cp.risk_tier IN ('BLOCKED', 'LOW')
   OR cp.bpi_status != 'CLEAR'
ORDER BY cp.current_overdue DESC, cp.credit_score ASC;
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
