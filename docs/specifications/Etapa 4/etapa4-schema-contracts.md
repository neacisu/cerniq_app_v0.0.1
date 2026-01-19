# CERNIQ.APP — ETAPA 4: SCHEMA DYNAMIC CONTRACTS
## Database Schema pentru Contracte Dinamice
### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [Overview Schema Contracts](#1-overview)
2. [Enums & Types](#2-enums)
3. [Tabel: gold_contracts](#3-contracts)
4. [Tabel: gold_contract_templates](#4-templates)
5. [Tabel: gold_contract_clauses](#5-clauses)
6. [Tabel: gold_contract_signatures](#6-signatures)
7. [Functions & Views](#7-functions)

---

## 1. Overview Schema Contracts {#1-overview}

Schema pentru contracte dinamice gestionează:
- **Contracts**: Contracte generate pentru comenzi
- **Templates**: Șabloane de contract per tip risc
- **Clauses**: Clauze disponibile pentru asamblare
- **Signatures**: Semnături digitale (DocuSign)

---

## 2. Enums & Types {#2-enums}

```sql
-- Contract Status
CREATE TYPE contract_status_enum AS ENUM (
    'DRAFT',
    'PENDING_REVIEW',
    'APPROVED',
    'SENT_FOR_SIGNATURE',
    'PARTIALLY_SIGNED',
    'SIGNED',
    'EXPIRED',
    'CANCELLED',
    'REJECTED'
);

-- Contract Type
CREATE TYPE contract_type_enum AS ENUM (
    'STANDARD',
    'CREDIT_SALE',
    'PREPAYMENT',
    'FRAMEWORK',
    'ADDENDUM'
);

-- Signature Status
CREATE TYPE signature_status_enum AS ENUM (
    'PENDING',
    'VIEWED',
    'SIGNED',
    'DECLINED',
    'EXPIRED'
);

-- Clause Category
CREATE TYPE clause_category_enum AS ENUM (
    'PAYMENT_TERMS',
    'DELIVERY',
    'WARRANTY',
    'PENALTY',
    'CONFIDENTIALITY',
    'FORCE_MAJEURE',
    'JURISDICTION',
    'TERMINATION',
    'LIABILITY'
);
```

---

## 3. Tabel: gold_contracts {#3-contracts}

```sql
CREATE TABLE gold_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Contract Number
    contract_number VARCHAR(50) NOT NULL,
    contract_type contract_type_enum NOT NULL DEFAULT 'STANDARD',
    
    -- References
    order_id UUID REFERENCES gold_orders(id),
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    template_id UUID REFERENCES gold_contract_templates(id),
    parent_contract_id UUID REFERENCES gold_contracts(id), -- For addendums
    
    -- Status
    status contract_status_enum NOT NULL DEFAULT 'DRAFT',
    previous_status contract_status_enum,
    status_changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contract Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Validity
    effective_date DATE,
    expiry_date DATE,
    valid_for_days INTEGER DEFAULT 30,
    
    -- Generated Files
    docx_url TEXT,
    pdf_url TEXT,
    signed_pdf_url TEXT,
    generated_at TIMESTAMPTZ,
    
    -- Clauses Used
    clauses_used JSONB NOT NULL DEFAULT '[]', -- Array of clause IDs and versions
    custom_clauses TEXT[], -- Any custom clauses added
    
    -- Risk Assessment
    risk_tier risk_tier_enum,
    risk_score INTEGER,
    
    -- Variables Used
    template_variables JSONB DEFAULT '{}',
    
    -- HITL (pentru contracte atipice)
    requires_legal_review BOOLEAN DEFAULT FALSE,
    legal_review_id UUID REFERENCES hitl_approvals(id),
    legal_notes TEXT,
    
    -- DocuSign
    docusign_envelope_id VARCHAR(100),
    docusign_status VARCHAR(50),
    
    -- Metadata
    correlation_id UUID,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    signed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT uq_contract_number_tenant UNIQUE (tenant_id, contract_number)
);

-- Indexes
CREATE INDEX idx_contracts_tenant ON gold_contracts(tenant_id);
CREATE INDEX idx_contracts_client ON gold_contracts(client_id);
CREATE INDEX idx_contracts_order ON gold_contracts(order_id);
CREATE INDEX idx_contracts_status ON gold_contracts(status);
CREATE INDEX idx_contracts_docusign ON gold_contracts(docusign_envelope_id);
CREATE INDEX idx_contracts_expiry ON gold_contracts(expiry_date)
    WHERE status NOT IN ('SIGNED', 'CANCELLED', 'EXPIRED');
```

---

## 4. Tabel: gold_contract_templates {#4-templates}

```sql
CREATE TABLE gold_contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Template Info
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL, -- Unique identifier like 'STD_CREDIT_V2'
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Type & Applicability
    contract_type contract_type_enum NOT NULL,
    applicable_risk_tiers risk_tier_enum[] DEFAULT ARRAY['MEDIUM', 'HIGH', 'PREMIUM']::risk_tier_enum[],
    
    -- Template Content
    template_docx_url TEXT NOT NULL,
    template_preview_url TEXT,
    
    -- Variables
    required_variables TEXT[] NOT NULL DEFAULT '{}',
    optional_variables TEXT[] DEFAULT '{}',
    variable_definitions JSONB DEFAULT '{}', -- {var_name: {type, description, default}}
    
    -- Default Clauses
    default_clauses UUID[] DEFAULT '{}', -- Array of clause IDs
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE, -- Default for contract type
    
    -- Audit
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT uq_template_code_version UNIQUE (tenant_id, code, version)
);

-- Indexes
CREATE INDEX idx_templates_tenant ON gold_contract_templates(tenant_id);
CREATE INDEX idx_templates_type ON gold_contract_templates(contract_type);
CREATE INDEX idx_templates_active ON gold_contract_templates(tenant_id)
    WHERE is_active = TRUE;
```

---

## 5. Tabel: gold_contract_clauses {#5-clauses}

```sql
CREATE TABLE gold_contract_clauses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Clause Info
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    category clause_category_enum NOT NULL,
    
    -- Content
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL, -- Can contain Jinja2 variables
    
    -- Risk Association
    risk_level VARCHAR(20) DEFAULT 'STANDARD', -- STANDARD, ELEVATED, HIGH
    applicable_risk_tiers risk_tier_enum[],
    
    -- Dependencies
    requires_clauses UUID[] DEFAULT '{}', -- Must include these if this one is used
    conflicts_with UUID[] DEFAULT '{}', -- Cannot be used together
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_mandatory BOOLEAN DEFAULT FALSE,
    
    -- Legal Review
    legal_approved BOOLEAN DEFAULT FALSE,
    legal_approved_by UUID REFERENCES users(id),
    legal_approved_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT uq_clause_code_version UNIQUE (tenant_id, code, version)
);

-- Indexes
CREATE INDEX idx_clauses_tenant ON gold_contract_clauses(tenant_id);
CREATE INDEX idx_clauses_category ON gold_contract_clauses(category);
CREATE INDEX idx_clauses_active ON gold_contract_clauses(tenant_id)
    WHERE is_active = TRUE;
```

---

## 6. Tabel: gold_contract_signatures {#6-signatures}

```sql
CREATE TABLE gold_contract_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- References
    contract_id UUID NOT NULL REFERENCES gold_contracts(id),
    
    -- Signer Info
    signer_role VARCHAR(50) NOT NULL, -- 'CLIENT', 'SELLER', 'WITNESS'
    signer_name VARCHAR(255) NOT NULL,
    signer_email VARCHAR(255) NOT NULL,
    signer_phone VARCHAR(20),
    signer_company VARCHAR(255),
    signer_title VARCHAR(100),
    
    -- Client Reference (if applicable)
    client_id UUID REFERENCES gold_clients(id),
    user_id UUID REFERENCES users(id),
    
    -- Status
    status signature_status_enum NOT NULL DEFAULT 'PENDING',
    
    -- DocuSign Specific
    docusign_recipient_id VARCHAR(100),
    docusign_recipient_status VARCHAR(50),
    
    -- Signature Details
    signed_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    signature_image_url TEXT,
    
    -- Dates
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    decline_reason TEXT,
    
    -- Reminders
    reminder_count INTEGER DEFAULT 0,
    last_reminder_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_signatures_contract ON gold_contract_signatures(contract_id);
CREATE INDEX idx_signatures_status ON gold_contract_signatures(status);
CREATE INDEX idx_signatures_email ON gold_contract_signatures(signer_email);
CREATE INDEX idx_signatures_pending ON gold_contract_signatures(contract_id)
    WHERE status = 'PENDING';
```

---

## 7. Functions & Views {#7-functions}

```sql
-- Function: Select Clauses Based on Risk
CREATE OR REPLACE FUNCTION select_clauses_for_risk(
    p_tenant_id UUID,
    p_risk_tier risk_tier_enum
) RETURNS TABLE (
    clause_id UUID,
    clause_code VARCHAR(50),
    clause_title VARCHAR(255),
    is_mandatory BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.code,
        c.title,
        c.is_mandatory
    FROM gold_contract_clauses c
    WHERE c.tenant_id = p_tenant_id
    AND c.is_active = TRUE
    AND (c.applicable_risk_tiers IS NULL OR p_risk_tier = ANY(c.applicable_risk_tiers))
    AND (
        c.is_mandatory = TRUE
        OR c.risk_level = 'STANDARD'
        OR (c.risk_level = 'ELEVATED' AND p_risk_tier IN ('LOW', 'MEDIUM'))
        OR (c.risk_level = 'HIGH' AND p_risk_tier IN ('BLOCKED', 'LOW'))
    )
    ORDER BY c.category, c.is_mandatory DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Check Contract Expiry
CREATE OR REPLACE FUNCTION check_contract_expiry()
RETURNS INTEGER AS $$
DECLARE
    v_expired_count INTEGER;
BEGIN
    UPDATE gold_contracts
    SET status = 'EXPIRED',
        previous_status = status,
        status_changed_at = NOW()
    WHERE status IN ('SENT_FOR_SIGNATURE', 'PARTIALLY_SIGNED')
    AND expiry_date < CURRENT_DATE;
    
    GET DIAGNOSTICS v_expired_count = ROW_COUNT;
    RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

-- View: Pending Signatures
CREATE OR REPLACE VIEW vw_pending_contract_signatures AS
SELECT 
    c.id AS contract_id,
    c.contract_number,
    c.title,
    c.client_id,
    cl.company_name AS client_name,
    s.signer_name,
    s.signer_email,
    s.signer_role,
    s.status AS signature_status,
    s.sent_at,
    s.reminder_count,
    c.expiry_date,
    CURRENT_DATE - s.sent_at::DATE AS days_waiting
FROM gold_contracts c
JOIN gold_contract_signatures s ON s.contract_id = c.id
JOIN gold_clients cl ON cl.id = c.client_id
WHERE c.status IN ('SENT_FOR_SIGNATURE', 'PARTIALLY_SIGNED')
AND s.status = 'PENDING';

-- Trigger: Update Contract Status on Signature
CREATE OR REPLACE FUNCTION update_contract_on_signature()
RETURNS TRIGGER AS $$
DECLARE
    v_total_signatures INTEGER;
    v_signed_count INTEGER;
BEGIN
    IF NEW.status = 'SIGNED' THEN
        SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'SIGNED')
        INTO v_total_signatures, v_signed_count
        FROM gold_contract_signatures
        WHERE contract_id = NEW.contract_id;
        
        IF v_signed_count = v_total_signatures THEN
            UPDATE gold_contracts
            SET status = 'SIGNED',
                signed_at = NOW()
            WHERE id = NEW.contract_id;
        ELSE
            UPDATE gold_contracts
            SET status = 'PARTIALLY_SIGNED'
            WHERE id = NEW.contract_id AND status = 'SENT_FOR_SIGNATURE';
        END IF;
    ELSIF NEW.status = 'DECLINED' THEN
        UPDATE gold_contracts
        SET status = 'REJECTED'
        WHERE id = NEW.contract_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_signature_update_contract
    AFTER UPDATE ON gold_contract_signatures
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_contract_on_signature();
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
