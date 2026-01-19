# CERNIQ.APP — ETAPA 3: DATABASE SCHEMA - NEGOTIATIONS & STATE MACHINE
## Gold Layer pentru Negotiation FSM și AI Conversations
### Versiunea 1.0 | 18 Ianuarie 2026

---

**DOCUMENT STATUS:** NORMATIV — Subordonat Master Spec v1.2  
**SCOPE:** Schema completă pentru negocieri, FSM, conversații AI și stock reservations  
**DATABASE:** PostgreSQL 18.1  
**ORM:** Drizzle ORM

---

# CUPRINS

1. [Overview Schema Negotiations](#1-overview-schema-negotiations)
2. [Tabel gold_negotiations](#2-tabel-gold_negotiations)
3. [Tabel negotiation_state_history](#3-tabel-negotiation_state_history)
4. [Tabel negotiation_items](#4-tabel-negotiation_items)
5. [Tabel stock_inventory](#5-tabel-stock_inventory)
6. [Tabel stock_reservations](#6-tabel-stock_reservations)
7. [Tabel ai_conversations](#7-tabel-ai_conversations)
8. [Tabel ai_conversation_messages](#8-tabel-ai_conversation_messages)
9. [Tabel ai_tool_calls](#9-tabel-ai_tool_calls)
10. [Tabel guardrail_violations](#10-tabel-guardrail_violations)
11. [FSM Trigger Functions](#11-fsm-trigger-functions)
12. [Drizzle Schema](#12-drizzle-schema)

---

# 1. Overview Schema Negotiations

## 1.1 Diagrama Relații

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEGOTIATION SCHEMA - GOLD LAYER                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐         ┌──────────────────┐                         │
│  │ gold_lead_journey │◄────────│ gold_negotiations│                         │
│  │ (from Etapa 2)    │   1:1   │                  │                         │
│  └──────────────────┘         │  - state FSM     │                         │
│                               │  - assigned_phone│                         │
│                               │  - total_value   │                         │
│                               └────────┬─────────┘                         │
│                                        │                                    │
│              ┌─────────────────────────┼─────────────────────────┐         │
│              │                         │                         │          │
│              ▼                         ▼                         ▼          │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐       │
│  │negotiation_state │   │ negotiation_     │   │ ai_conversations │       │
│  │_history          │   │ items            │   │                  │       │
│  │                  │   │                  │   │  - messages      │       │
│  │ - from_state     │   │ - product_id     │   │  - tool_calls    │       │
│  │ - to_state       │   │ - quantity       │   │  - guardrail_log │       │
│  │ - reason         │   │ - unit_price     │   │                  │       │
│  └──────────────────┘   │ - discount       │   └──────────────────┘       │
│                         └────────┬─────────┘                               │
│                                  │                                          │
│                                  ▼                                          │
│                    ┌──────────────────────┐                                │
│                    │  stock_reservations  │                                │
│                    │                      │                                │
│                    │  - TTL based         │                                │
│                    │  - Auto-cleanup      │                                │
│                    └──────────────────────┘                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 1.2 State Machine Diagram

```
                        ┌─────────────────┐
                        │                 │
                        ▼                 │
┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│ DISCOVERY │───►│ PROPOSAL  │───►│NEGOTIATION│───►│  CLOSING  │
└─────┬─────┘    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
      │                │                │                │
      │                │                │                ▼
      │                │                │         ┌───────────┐
      │                │                │         │ PROFORMA_ │
      │                │                │         │   SENT    │
      │                │                │         └─────┬─────┘
      │                │                │               │
      │                │                │               ▼
      │                │                │         ┌───────────┐
      │                │                │         │ INVOICED  │
      │                │                │         └─────┬─────┘
      │                │                │               │
      │                │                │               ▼
      │                │                │         ┌───────────┐
      │                │                │         │   PAID    │
      │                │                │         └───────────┘
      │                │                │
      └────────────────┴────────────────┴──────────► DEAD
```

---

# 2. Tabel gold_negotiations

## 2.1 SQL Schema

```sql
-- Enum pentru stări negociere
CREATE TYPE negotiation_state_enum AS ENUM (
    'DISCOVERY',
    'PROPOSAL',
    'NEGOTIATION',
    'CLOSING',
    'PROFORMA_SENT',
    'INVOICED',
    'PAID',
    'DEAD'
);

-- Enum pentru prioritate
CREATE TYPE negotiation_priority_enum AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);

-- Tabel principal negocieri
CREATE TABLE gold_negotiations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Link to lead
    lead_id UUID NOT NULL REFERENCES gold_companies(id),
    journey_id UUID REFERENCES gold_lead_journey(id),
    
    -- State Machine
    current_state negotiation_state_enum NOT NULL DEFAULT 'DISCOVERY',
    previous_state negotiation_state_enum,
    state_changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Assignment (sticky session)
    assigned_phone_id UUID REFERENCES wa_phone_numbers(id),
    assigned_user_id UUID REFERENCES users(id),
    
    -- Client info (cached for quick access)
    client_name VARCHAR(255),
    client_cif VARCHAR(20),
    client_email VARCHAR(255),
    client_phone VARCHAR(20),
    
    -- Value tracking
    total_value DECIMAL(14,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'RON',
    estimated_margin_percent DECIMAL(5,2),
    
    -- Discount tracking
    max_discount_offered DECIMAL(5,2) DEFAULT 0,
    discount_approved_by UUID REFERENCES users(id),
    discount_approval_at TIMESTAMPTZ,
    
    -- AI Agent
    ai_enabled BOOLEAN DEFAULT TRUE,
    ai_confidence_score DECIMAL(5,2),
    ai_handoff_reason TEXT,
    
    -- MCP Session
    mcp_session_id VARCHAR(100),
    mcp_session_expires_at TIMESTAMPTZ,
    
    -- Documents
    proforma_ref VARCHAR(50),
    proforma_sent_at TIMESTAMPTZ,
    proforma_expires_at TIMESTAMPTZ,
    invoice_ref VARCHAR(50),
    invoice_issued_at TIMESTAMPTZ,
    
    -- Timing
    first_contact_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    expected_close_date DATE,
    
    -- Scoring
    engagement_score INTEGER DEFAULT 0,
    sentiment_score INTEGER DEFAULT 0,
    close_probability DECIMAL(5,2),
    
    -- Priority
    priority negotiation_priority_enum DEFAULT 'MEDIUM',
    
    -- Human intervention
    requires_human_review BOOLEAN DEFAULT FALSE,
    human_review_reason TEXT,
    is_human_controlled BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT unique_active_negotiation UNIQUE(tenant_id, lead_id)
        WHERE current_state NOT IN ('PAID', 'DEAD'),
    CONSTRAINT valid_state_transition CHECK (
        (current_state != 'PAID' AND current_state != 'DEAD') OR 
        previous_state IS NOT NULL
    )
);

-- Comentarii
COMMENT ON TABLE gold_negotiations IS 'Negocieri active - fiecare lead poate avea o singură negociere activă';
COMMENT ON COLUMN gold_negotiations.current_state IS 'Starea curentă în FSM - determină acțiunile permise';
COMMENT ON COLUMN gold_negotiations.mcp_session_id IS 'Sesiune MCP pentru context AI - expire după 30 min inactivitate';

-- Indexes
CREATE INDEX idx_negotiations_tenant ON gold_negotiations(tenant_id);
CREATE INDEX idx_negotiations_lead ON gold_negotiations(lead_id);
CREATE INDEX idx_negotiations_state ON gold_negotiations(tenant_id, current_state);
CREATE INDEX idx_negotiations_phone ON gold_negotiations(assigned_phone_id);
CREATE INDEX idx_negotiations_user ON gold_negotiations(assigned_user_id);
CREATE INDEX idx_negotiations_priority ON gold_negotiations(tenant_id, priority, current_state);
CREATE INDEX idx_negotiations_proforma ON gold_negotiations(proforma_ref) WHERE proforma_ref IS NOT NULL;
CREATE INDEX idx_negotiations_invoice ON gold_negotiations(invoice_ref) WHERE invoice_ref IS NOT NULL;
CREATE INDEX idx_negotiations_activity ON gold_negotiations(last_activity_at DESC);
```

---

# 3. Tabel negotiation_state_history

## 3.1 SQL Schema

```sql
-- Audit trail pentru tranzițiile de stare
CREATE TABLE negotiation_state_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negotiation_id UUID NOT NULL REFERENCES gold_negotiations(id) ON DELETE CASCADE,
    
    -- Transition
    from_state negotiation_state_enum NOT NULL,
    to_state negotiation_state_enum NOT NULL,
    
    -- Reason
    transition_reason TEXT,
    transition_trigger VARCHAR(50), -- 'ai_decision', 'user_action', 'timeout', 'webhook'
    
    -- Actor
    triggered_by_type VARCHAR(20) NOT NULL, -- 'ai_agent', 'user', 'system'
    triggered_by_id UUID,
    
    -- Context
    context_snapshot JSONB, -- Snapshot of relevant data at transition
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pentru timeline
CREATE INDEX idx_state_history_negotiation ON negotiation_state_history(negotiation_id, created_at DESC);
CREATE INDEX idx_state_history_state ON negotiation_state_history(to_state, created_at DESC);

COMMENT ON TABLE negotiation_state_history IS 'Audit trail pentru toate tranzițiile FSM - append-only';
```

---

# 4. Tabel negotiation_items

## 4.1 SQL Schema

```sql
-- Produse în negociere
CREATE TABLE negotiation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negotiation_id UUID NOT NULL REFERENCES gold_negotiations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES gold_products(id),
    
    -- Quantity
    quantity DECIMAL(12,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'buc',
    
    -- Pricing
    list_price DECIMAL(12,2) NOT NULL, -- Prețul din catalog la momentul adăugării
    unit_price DECIMAL(12,2) NOT NULL, -- Prețul oferit (după discount)
    discount_percent DECIMAL(5,2) DEFAULT 0,
    
    -- Totals
    line_total DECIMAL(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    vat_percent DECIMAL(5,2) DEFAULT 19.00,
    line_vat DECIMAL(14,2) GENERATED ALWAYS AS (quantity * unit_price * vat_percent / 100) STORED,
    
    -- Status
    status VARCHAR(20) DEFAULT 'proposed', -- proposed, confirmed, removed
    
    -- Stock reservation
    reservation_id UUID REFERENCES stock_reservations(id),
    
    -- Notes
    notes TEXT,
    
    -- Audit
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    added_by_type VARCHAR(20) NOT NULL, -- 'ai_agent', 'user'
    added_by_id UUID,
    
    -- Constraints
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT valid_discount CHECK (discount_percent >= 0 AND discount_percent <= 100)
);

CREATE INDEX idx_items_negotiation ON negotiation_items(negotiation_id);
CREATE INDEX idx_items_product ON negotiation_items(product_id);
CREATE INDEX idx_items_reservation ON negotiation_items(reservation_id) WHERE reservation_id IS NOT NULL;

-- Trigger pentru update total on negotiation
CREATE OR REPLACE FUNCTION update_negotiation_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE gold_negotiations
    SET 
        total_value = (
            SELECT COALESCE(SUM(line_total + line_vat), 0)
            FROM negotiation_items
            WHERE negotiation_id = COALESCE(NEW.negotiation_id, OLD.negotiation_id)
            AND status != 'removed'
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.negotiation_id, OLD.negotiation_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_negotiation_total
AFTER INSERT OR UPDATE OR DELETE ON negotiation_items
FOR EACH ROW EXECUTE FUNCTION update_negotiation_total();
```

---

# 5. Tabel stock_inventory

## 5.1 SQL Schema

```sql
-- Stoc inventar realtime
CREATE TABLE stock_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES gold_products(id) ON DELETE CASCADE,
    
    -- Location (pentru multi-warehouse)
    warehouse_id UUID, -- NULL = default warehouse
    warehouse_name VARCHAR(100),
    
    -- Quantities
    total_quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
    available_quantity DECIMAL(12,2) GENERATED ALWAYS AS (total_quantity - reserved_quantity) STORED,
    
    -- Thresholds
    low_stock_threshold INTEGER DEFAULT 10,
    reorder_point INTEGER DEFAULT 20,
    reorder_quantity INTEGER DEFAULT 100,
    
    -- Incoming
    incoming_quantity DECIMAL(12,2) DEFAULT 0,
    next_restock_date DATE,
    
    -- Cost
    average_cost DECIMAL(12,2),
    last_purchase_cost DECIMAL(12,2),
    
    -- Tracking
    last_counted_at TIMESTAMPTZ,
    last_movement_at TIMESTAMPTZ,
    
    -- Sync
    source_system VARCHAR(50), -- 'erp', 'shopify', 'manual'
    source_synced_at TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_product_warehouse UNIQUE(tenant_id, product_id, warehouse_id),
    CONSTRAINT non_negative_stock CHECK (total_quantity >= 0),
    CONSTRAINT reserved_not_exceed CHECK (reserved_quantity <= total_quantity)
);

CREATE INDEX idx_inventory_tenant ON stock_inventory(tenant_id);
CREATE INDEX idx_inventory_product ON stock_inventory(product_id);
CREATE INDEX idx_inventory_low_stock ON stock_inventory(tenant_id, available_quantity) 
    WHERE available_quantity <= low_stock_threshold;

COMMENT ON TABLE stock_inventory IS 'Stoc realtime - sursa de adevăr pentru disponibilitate';
COMMENT ON COLUMN stock_inventory.available_quantity IS 'Stoc disponibil = total - rezervat (generated)';
```

---

# 6. Tabel stock_reservations

## 6.1 SQL Schema

```sql
-- Enum pentru status rezervare
CREATE TYPE reservation_status_enum AS ENUM (
    'ACTIVE',
    'CONVERTED',  -- Convertit în comandă
    'EXPIRED',
    'CANCELLED'
);

-- Rezervări temporare de stoc
CREATE TABLE stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Product
    product_id UUID NOT NULL REFERENCES gold_products(id),
    inventory_id UUID NOT NULL REFERENCES stock_inventory(id),
    
    -- Quantity
    quantity DECIMAL(12,2) NOT NULL,
    
    -- Context
    negotiation_id UUID REFERENCES gold_negotiations(id),
    negotiation_state negotiation_state_enum,
    
    -- TTL
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Status
    status reservation_status_enum DEFAULT 'ACTIVE',
    
    -- Outcome
    converted_to_order_id UUID,
    cancelled_reason TEXT,
    
    -- Constraints
    CONSTRAINT positive_reservation CHECK (quantity > 0)
);

CREATE INDEX idx_reservations_product ON stock_reservations(product_id);
CREATE INDEX idx_reservations_negotiation ON stock_reservations(negotiation_id);
CREATE INDEX idx_reservations_expires ON stock_reservations(expires_at) WHERE status = 'ACTIVE';
CREATE INDEX idx_reservations_active ON stock_reservations(tenant_id, status) WHERE status = 'ACTIVE';

-- Function pentru TTL based on negotiation state
CREATE OR REPLACE FUNCTION get_reservation_ttl(state negotiation_state_enum)
RETURNS INTERVAL AS $$
BEGIN
    RETURN CASE state
        WHEN 'PROPOSAL' THEN INTERVAL '30 minutes'
        WHEN 'NEGOTIATION' THEN INTERVAL '2 hours'
        WHEN 'CLOSING' THEN INTERVAL '24 hours'
        WHEN 'PROFORMA_SENT' THEN INTERVAL '7 days'
        ELSE INTERVAL '30 minutes'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger pentru update inventory on reservation
CREATE OR REPLACE FUNCTION update_inventory_on_reservation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE stock_inventory
        SET reserved_quantity = reserved_quantity + NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.inventory_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
        IF NEW.status IN ('EXPIRED', 'CANCELLED') THEN
            UPDATE stock_inventory
            SET reserved_quantity = reserved_quantity - OLD.quantity,
                updated_at = NOW()
            WHERE id = OLD.inventory_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.status = 'ACTIVE' THEN
            UPDATE stock_inventory
            SET reserved_quantity = reserved_quantity - OLD.quantity,
                updated_at = NOW()
            WHERE id = OLD.inventory_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_reservation
AFTER INSERT OR UPDATE OR DELETE ON stock_reservations
FOR EACH ROW EXECUTE FUNCTION update_inventory_on_reservation();
```

---

# 7. Tabel ai_conversations

## 7.1 SQL Schema

```sql
-- Conversații AI cu clienții
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Links
    negotiation_id UUID REFERENCES gold_negotiations(id),
    lead_id UUID NOT NULL REFERENCES gold_companies(id),
    
    -- Channel
    channel VARCHAR(20) NOT NULL, -- 'whatsapp', 'email'
    channel_thread_id VARCHAR(100), -- TimelinesAI conversation_id sau email thread
    
    -- Stats
    message_count INTEGER DEFAULT 0,
    user_message_count INTEGER DEFAULT 0,
    assistant_message_count INTEGER DEFAULT 0,
    tool_call_count INTEGER DEFAULT 0,
    
    -- Tokens
    total_tokens_used INTEGER DEFAULT 0,
    total_prompt_tokens INTEGER DEFAULT 0,
    total_completion_tokens INTEGER DEFAULT 0,
    estimated_cost_usd DECIMAL(10,6) DEFAULT 0,
    
    -- MCP
    mcp_session_id VARCHAR(100),
    mcp_session_created_at TIMESTAMPTZ,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, paused, completed, handed_off
    
    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    
    -- Handoff
    handed_off_at TIMESTAMPTZ,
    handed_off_to UUID REFERENCES users(id),
    handoff_reason TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_tenant ON ai_conversations(tenant_id);
CREATE INDEX idx_conversations_negotiation ON ai_conversations(negotiation_id);
CREATE INDEX idx_conversations_lead ON ai_conversations(lead_id);
CREATE INDEX idx_conversations_channel ON ai_conversations(channel, channel_thread_id);
CREATE INDEX idx_conversations_status ON ai_conversations(tenant_id, status);
CREATE INDEX idx_conversations_last_message ON ai_conversations(last_message_at DESC);
```

---

# 8. Tabel ai_conversation_messages

## 8.1 SQL Schema

```sql
-- Mesaje individuale în conversații
CREATE TABLE ai_conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    
    -- Role (OpenAI convention)
    role VARCHAR(20) NOT NULL, -- 'system', 'user', 'assistant', 'tool'
    
    -- Content
    content TEXT NOT NULL,
    
    -- Tool calls (pentru assistant messages)
    tool_calls JSONB, -- [{id, type, function: {name, arguments}}]
    
    -- Tool response (pentru tool messages)
    tool_call_id VARCHAR(100),
    tool_name VARCHAR(100),
    
    -- AI metadata
    model_used VARCHAR(50),
    tokens_used INTEGER,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    latency_ms INTEGER,
    
    -- Guardrail results
    guardrail_checks JSONB,
    guardrail_passed BOOLEAN DEFAULT TRUE,
    regeneration_attempt INTEGER DEFAULT 0,
    
    -- External reference
    external_message_id VARCHAR(100), -- TimelinesAI message_id
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON ai_conversation_messages(conversation_id, created_at);
CREATE INDEX idx_messages_role ON ai_conversation_messages(conversation_id, role);
CREATE INDEX idx_messages_external ON ai_conversation_messages(external_message_id) 
    WHERE external_message_id IS NOT NULL;

-- Trigger pentru update conversation stats
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ai_conversations
    SET 
        message_count = message_count + 1,
        user_message_count = user_message_count + CASE WHEN NEW.role = 'user' THEN 1 ELSE 0 END,
        assistant_message_count = assistant_message_count + CASE WHEN NEW.role = 'assistant' THEN 1 ELSE 0 END,
        total_tokens_used = total_tokens_used + COALESCE(NEW.tokens_used, 0),
        last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_conversation_stats
AFTER INSERT ON ai_conversation_messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_stats();
```

---

# 9. Tabel ai_tool_calls

## 9.1 SQL Schema

```sql
-- Log pentru toate tool calls
CREATE TABLE ai_tool_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES ai_conversation_messages(id),
    negotiation_id UUID REFERENCES gold_negotiations(id),
    
    -- Tool info
    tool_name VARCHAR(100) NOT NULL,
    tool_input JSONB NOT NULL,
    tool_output JSONB,
    
    -- Execution
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, success, error, timeout
    error_message TEXT,
    error_code VARCHAR(50),
    
    -- Guardrail results (pentru tools care au guardrails)
    guardrail_results JSONB,
    guardrail_passed BOOLEAN,
    
    -- Retry info
    retry_count INTEGER DEFAULT 0,
    retry_of_id UUID REFERENCES ai_tool_calls(id),
    
    -- Cost tracking
    tokens_used INTEGER,
    estimated_cost_usd DECIMAL(10,6),
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tool_calls_conversation ON ai_tool_calls(conversation_id);
CREATE INDEX idx_tool_calls_negotiation ON ai_tool_calls(negotiation_id);
CREATE INDEX idx_tool_calls_tool ON ai_tool_calls(tool_name, created_at DESC);
CREATE INDEX idx_tool_calls_status ON ai_tool_calls(status) WHERE status != 'success';

-- Trigger pentru update conversation tool count
CREATE OR REPLACE FUNCTION update_conversation_tool_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ai_conversations
    SET tool_call_count = tool_call_count + 1,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tool_call_count
AFTER INSERT ON ai_tool_calls
FOR EACH ROW EXECUTE FUNCTION update_conversation_tool_count();
```

---

# 10. Tabel guardrail_violations

## 10.1 SQL Schema

```sql
-- Enum pentru tipuri de violări
CREATE TYPE guardrail_type_enum AS ENUM (
    'PRICE_BELOW_MINIMUM',
    'STOCK_UNAVAILABLE',
    'DISCOUNT_EXCEEDED',
    'SKU_NOT_FOUND',
    'FISCAL_DATA_INVALID',
    'COMPETITOR_MENTIONED',
    'HALLUCINATION_DETECTED',
    'STATE_VIOLATION'
);

-- Log pentru violări guardrail
CREATE TABLE guardrail_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Context
    conversation_id UUID REFERENCES ai_conversations(id),
    negotiation_id UUID REFERENCES gold_negotiations(id),
    message_id UUID REFERENCES ai_conversation_messages(id),
    tool_call_id UUID REFERENCES ai_tool_calls(id),
    
    -- Violation details
    guardrail_type guardrail_type_enum NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    
    -- Details
    ai_content TEXT, -- What AI tried to say/do
    violation_details JSONB NOT NULL, -- Specific details of violation
    correction_applied TEXT, -- What was the correction
    
    -- Resolution
    was_auto_corrected BOOLEAN DEFAULT FALSE,
    was_regenerated BOOLEAN DEFAULT FALSE,
    regeneration_attempt INTEGER,
    final_resolution VARCHAR(20), -- 'corrected', 'regenerated', 'blocked', 'escalated'
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_violations_tenant ON guardrail_violations(tenant_id);
CREATE INDEX idx_violations_type ON guardrail_violations(guardrail_type, created_at DESC);
CREATE INDEX idx_violations_conversation ON guardrail_violations(conversation_id);
CREATE INDEX idx_violations_severity ON guardrail_violations(severity, created_at DESC);

COMMENT ON TABLE guardrail_violations IS 'Audit trail pentru toate violările de guardrail - esențial pentru îmbunătățirea AI';
```

---

# 11. FSM Trigger Functions

## 11.1 State Transition Validation

```sql
-- Valid transitions definition
CREATE TABLE fsm_valid_transitions (
    from_state negotiation_state_enum NOT NULL,
    to_state negotiation_state_enum NOT NULL,
    requires_condition VARCHAR(100), -- Optional condition name
    PRIMARY KEY (from_state, to_state)
);

-- Populate valid transitions
INSERT INTO fsm_valid_transitions (from_state, to_state, requires_condition) VALUES
('DISCOVERY', 'PROPOSAL', NULL),
('DISCOVERY', 'DEAD', NULL),
('PROPOSAL', 'NEGOTIATION', 'product_confirmed'),
('PROPOSAL', 'DISCOVERY', NULL),
('PROPOSAL', 'DEAD', NULL),
('NEGOTIATION', 'CLOSING', 'agreement_reached'),
('NEGOTIATION', 'PROPOSAL', NULL),
('NEGOTIATION', 'DEAD', NULL),
('CLOSING', 'PROFORMA_SENT', 'proforma_created'),
('CLOSING', 'NEGOTIATION', NULL),
('CLOSING', 'DEAD', NULL),
('PROFORMA_SENT', 'INVOICED', 'proforma_accepted'),
('PROFORMA_SENT', 'NEGOTIATION', 'proforma_rejected'),
('PROFORMA_SENT', 'DEAD', 'proforma_expired'),
('INVOICED', 'PAID', 'payment_confirmed'),
('INVOICED', 'DEAD', 'payment_failed'),
('DEAD', 'DISCOVERY', 'resurrection'); -- Can be resurrected

-- Trigger function pentru validare tranziții
CREATE OR REPLACE FUNCTION validate_state_transition()
RETURNS TRIGGER AS $$
DECLARE
    is_valid BOOLEAN;
    old_state negotiation_state_enum;
    new_state negotiation_state_enum;
BEGIN
    old_state := OLD.current_state;
    new_state := NEW.current_state;
    
    -- Skip if state unchanged
    IF old_state = new_state THEN
        RETURN NEW;
    END IF;
    
    -- Check if transition is valid
    SELECT EXISTS (
        SELECT 1 FROM fsm_valid_transitions
        WHERE from_state = old_state AND to_state = new_state
    ) INTO is_valid;
    
    IF NOT is_valid THEN
        RAISE EXCEPTION 'Invalid state transition from % to %', old_state, new_state;
    END IF;
    
    -- Update transition metadata
    NEW.previous_state := old_state;
    NEW.state_changed_at := NOW();
    NEW.updated_at := NOW();
    
    -- Log transition
    INSERT INTO negotiation_state_history (
        negotiation_id, from_state, to_state, 
        transition_trigger, triggered_by_type
    ) VALUES (
        NEW.id, old_state, new_state,
        current_setting('app.transition_trigger', true),
        COALESCE(current_setting('app.actor_type', true), 'system')
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_state_transition
BEFORE UPDATE OF current_state ON gold_negotiations
FOR EACH ROW EXECUTE FUNCTION validate_state_transition();
```

## 11.2 Allowed Tools Check

```sql
-- Tools permise per state
CREATE TABLE fsm_state_allowed_tools (
    state negotiation_state_enum NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (state, tool_name)
);

INSERT INTO fsm_state_allowed_tools (state, tool_name) VALUES
('DISCOVERY', 'search_products'),
('DISCOVERY', 'get_catalog'),
('PROPOSAL', 'get_product_details'),
('PROPOSAL', 'check_realtime_stock'),
('NEGOTIATION', 'calculate_discount'),
('NEGOTIATION', 'check_realtime_stock'),
('NEGOTIATION', 'get_product_details'),
('CLOSING', 'validate_client_data'),
('CLOSING', 'create_proforma'),
('PROFORMA_SENT', 'track_proforma_status'),
('PROFORMA_SENT', 'resend_proforma'),
('INVOICED', 'convert_to_invoice'),
('INVOICED', 'send_einvoice'),
('INVOICED', 'track_payment');

-- Function pentru verificare tool permis
CREATE OR REPLACE FUNCTION is_tool_allowed(
    p_negotiation_id UUID,
    p_tool_name VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
    current_state negotiation_state_enum;
BEGIN
    SELECT gn.current_state INTO current_state
    FROM gold_negotiations gn
    WHERE gn.id = p_negotiation_id;
    
    RETURN EXISTS (
        SELECT 1 FROM fsm_state_allowed_tools
        WHERE state = current_state AND tool_name = p_tool_name
    );
END;
$$ LANGUAGE plpgsql STABLE;
```

---

# 12. Drizzle Schema

```typescript
// packages/db/src/schema/negotiations.ts
import { 
  pgTable, uuid, varchar, text, boolean, integer, 
  decimal, timestamp, jsonb, uniqueIndex, index,
  check
} from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants, users } from './core';
import { goldCompanies, goldLeadJourney, waPhoneNumbers } from './outreach';
import { goldProducts } from './products';

// Enums
export const negotiationStateEnum = pgEnum('negotiation_state_enum', [
  'DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'CLOSING', 
  'PROFORMA_SENT', 'INVOICED', 'PAID', 'DEAD'
]);

export const negotiationPriorityEnum = pgEnum('negotiation_priority_enum', [
  'LOW', 'MEDIUM', 'HIGH', 'URGENT'
]);

export const reservationStatusEnum = pgEnum('reservation_status_enum', [
  'ACTIVE', 'CONVERTED', 'EXPIRED', 'CANCELLED'
]);

export const guardrailTypeEnum = pgEnum('guardrail_type_enum', [
  'PRICE_BELOW_MINIMUM', 'STOCK_UNAVAILABLE', 'DISCOUNT_EXCEEDED',
  'SKU_NOT_FOUND', 'FISCAL_DATA_INVALID', 'COMPETITOR_MENTIONED',
  'HALLUCINATION_DETECTED', 'STATE_VIOLATION'
]);

// Negotiations
export const goldNegotiations = pgTable('gold_negotiations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  leadId: uuid('lead_id').notNull().references(() => goldCompanies.id),
  journeyId: uuid('journey_id').references(() => goldLeadJourney.id),
  
  currentState: negotiationStateEnum('current_state').notNull().default('DISCOVERY'),
  previousState: negotiationStateEnum('previous_state'),
  stateChangedAt: timestamp('state_changed_at', { withTimezone: true }).defaultNow(),
  
  assignedPhoneId: uuid('assigned_phone_id').references(() => waPhoneNumbers.id),
  assignedUserId: uuid('assigned_user_id').references(() => users.id),
  
  clientName: varchar('client_name', { length: 255 }),
  clientCif: varchar('client_cif', { length: 20 }),
  clientEmail: varchar('client_email', { length: 255 }),
  clientPhone: varchar('client_phone', { length: 20 }),
  
  totalValue: decimal('total_value', { precision: 14, scale: 2 }).default('0'),
  currency: varchar('currency', { length: 3 }).default('RON'),
  
  aiEnabled: boolean('ai_enabled').default(true),
  mcpSessionId: varchar('mcp_session_id', { length: 100 }),
  
  proformaRef: varchar('proforma_ref', { length: 50 }),
  proformaSentAt: timestamp('proforma_sent_at', { withTimezone: true }),
  invoiceRef: varchar('invoice_ref', { length: 50 }),
  invoiceIssuedAt: timestamp('invoice_issued_at', { withTimezone: true }),
  
  priority: negotiationPriorityEnum('priority').default('MEDIUM'),
  requiresHumanReview: boolean('requires_human_review').default(false),
  isHumanControlled: boolean('is_human_controlled').default(false),
  
  tags: text('tags').array().default(sql`'{}'::text[]`),
  notes: text('notes'),
  customFields: jsonb('custom_fields').default({}),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  tenantIdx: index('idx_negotiations_tenant').on(table.tenantId),
  leadIdx: index('idx_negotiations_lead').on(table.leadId),
  stateIdx: index('idx_negotiations_state').on(table.tenantId, table.currentState),
}));

// Export types
export type GoldNegotiation = typeof goldNegotiations.$inferSelect;
export type NewGoldNegotiation = typeof goldNegotiations.$inferInsert;
```

---

**Document generat:** 18 Ianuarie 2026  
**Total Tabele:** 10  
**FSM States:** 8  
**Valid Transitions:** 17  
**Conformitate:** Master Spec v1.2
