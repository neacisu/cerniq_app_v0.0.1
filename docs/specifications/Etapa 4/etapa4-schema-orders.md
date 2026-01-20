# CERNIQ.APP — ETAPA 4: SCHEMA ORDERS & PAYMENTS
## Database Schema pentru Comenzi și Plăți
### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [Overview Schema Orders](#1-overview)
2. [Enums & Types](#2-enums-types)
3. [Tabel: gold_orders](#3-gold-orders)
4. [Tabel: gold_order_items](#4-gold-order-items)
5. [Tabel: gold_payments](#5-gold-payments)
6. [Tabel: gold_payment_reconciliations](#6-gold-payment-reconciliations)
7. [Tabel: gold_refunds](#7-gold-refunds)
8. [Indexes & Constraints](#8-indexes)
9. [Functions & Triggers](#9-functions)

---

## 1. Overview Schema Orders {#1-overview}

Schema pentru comenzi și plăți gestionează:
- **Comenzi**: Lifecycle complet de la draft la completed
- **Plăți**: Înregistrare plăți primite
- **Reconciliere**: Matching plăți cu facturi
- **Refund-uri**: Procesare returnări de bani

### Relații
```
gold_orders 1──N gold_order_items
gold_orders 1──N gold_payments
gold_payments 1──1 gold_payment_reconciliations
gold_orders 1──N gold_refunds
```

---

## 2. Enums & Types {#2-enums-types}

```sql
-- Order Status (20 stări)
CREATE TYPE order_status_enum AS ENUM (
    'DRAFT',
    'PENDING_PAYMENT',
    'PAYMENT_RECEIVED',
    'PAYMENT_FAILED',
    'CREDIT_CHECK',
    'CREDIT_BLOCKED',
    'CREDIT_APPROVED',
    'PENDING_APPROVAL',
    'CONTRACT_PENDING',
    'CONTRACT_SIGNED',
    'CONTRACT_EXPIRED',
    'PROCESSING',
    'READY_FOR_PICKUP',
    'PICKED_UP',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'DELIVERY_FAILED',
    'RETURN_REQUESTED',
    'RETURN_COMPLETED',
    'COMPLETED',
    'CANCELLED',
    'AUTO_CANCELLED'
);

-- Payment Method
CREATE TYPE payment_method_enum AS ENUM (
    'BANK_TRANSFER',
    'REVOLUT',
    'CARD',
    'COD',
    'CREDIT'
);

-- Payment Status
CREATE TYPE payment_status_enum AS ENUM (
    'PENDING',
    'CONFIRMED',
    'FAILED',
    'REFUNDED',
    'PARTIAL_REFUND'
);

-- Reconciliation Status
CREATE TYPE reconciliation_status_enum AS ENUM (
    'PENDING',
    'MATCHED_EXACT',
    'MATCHED_FUZZY',
    'UNMATCHED',
    'MANUAL_MATCHED',
    'DISPUTED'
);

-- Refund Status
CREATE TYPE refund_status_enum AS ENUM (
    'REQUESTED',
    'APPROVED',
    'PROCESSING',
    'COMPLETED',
    'REJECTED',
    'FAILED'
);

-- Refund Reason
CREATE TYPE refund_reason_enum AS ENUM (
    'RETURN',
    'PARTIAL_RETURN',
    'ORDER_CANCELLED',
    'OVERPAYMENT',
    'PRICE_ADJUSTMENT',
    'CUSTOMER_REQUEST',
    'QUALITY_ISSUE',
    'SHIPPING_DAMAGE'
);
```

---

## 3. Tabel: gold_orders {#3-gold-orders}

```sql
CREATE TABLE gold_orders (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Identificator
    order_number VARCHAR(50) NOT NULL,
    
    -- Referințe
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    negotiation_id UUID REFERENCES gold_negotiations(id),
    invoice_id UUID REFERENCES gold_invoices(id),
    proforma_id UUID REFERENCES gold_proformas(id),
    contract_id UUID REFERENCES gold_contracts(id),
    
    -- Valori Financiare
    subtotal DECIMAL(15,2) NOT NULL CHECK (subtotal >= 0),
    discount_amount DECIMAL(15,2) DEFAULT 0 CHECK (discount_amount >= 0),
    discount_percent DECIMAL(5,2) DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 19.00,
    vat_amount DECIMAL(15,2) NOT NULL CHECK (vat_amount >= 0),
    shipping_cost DECIMAL(15,2) DEFAULT 0 CHECK (shipping_cost >= 0),
    total_amount DECIMAL(15,2) NOT NULL CHECK (total_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'RON',
    
    -- Plăți
    amount_paid DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    amount_due DECIMAL(15,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
    payment_method payment_method_enum,
    
    -- State Machine
    status order_status_enum NOT NULL DEFAULT 'DRAFT',
    previous_status order_status_enum,
    status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status_changed_by UUID REFERENCES users(id),
    
    -- Credit
    credit_approved BOOLEAN DEFAULT FALSE,
    credit_limit_used DECIMAL(15,2) DEFAULT 0,
    credit_approval_id UUID REFERENCES hitl_approvals(id),
    payment_terms_days INTEGER DEFAULT 0 CHECK (payment_terms_days >= 0),
    due_date DATE,
    
    -- Logistică
    shipment_id UUID REFERENCES gold_shipments(id),
    delivery_address_id UUID REFERENCES gold_addresses(id),
    delivery_notes TEXT,
    requested_delivery_date DATE,
    
    -- Metadata
    source VARCHAR(50) DEFAULT 'AI_AGENT', -- AI_AGENT, MANUAL, API
    correlation_id UUID,
    notes TEXT,
    internal_notes TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT uq_order_number_tenant UNIQUE (tenant_id, order_number),
    CONSTRAINT chk_total_calculation CHECK (
        total_amount = subtotal - discount_amount + vat_amount + shipping_cost
    ),
    CONSTRAINT chk_paid_not_exceed_total CHECK (amount_paid <= total_amount)
);

-- Trigger pentru updated_at
CREATE TRIGGER trg_gold_orders_updated
    BEFORE UPDATE ON gold_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pentru status change tracking
CREATE OR REPLACE FUNCTION track_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.previous_status := OLD.status;
        NEW.status_changed_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_status_change
    BEFORE UPDATE ON gold_orders
    FOR EACH ROW
    EXECUTE FUNCTION track_order_status_change();
```

### Indexes pentru gold_orders
```sql
CREATE INDEX idx_orders_tenant_id ON gold_orders(tenant_id);
CREATE INDEX idx_orders_client_id ON gold_orders(client_id);
CREATE INDEX idx_orders_status ON gold_orders(status);
CREATE INDEX idx_orders_created_at ON gold_orders(created_at DESC);
CREATE INDEX idx_orders_due_date ON gold_orders(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_orders_invoice_id ON gold_orders(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX idx_orders_correlation_id ON gold_orders(correlation_id);

-- Partial indexes for active orders
CREATE INDEX idx_orders_active ON gold_orders(tenant_id, status)
    WHERE status NOT IN ('COMPLETED', 'CANCELLED', 'AUTO_CANCELLED');

-- Index for overdue detection
CREATE INDEX idx_orders_overdue ON gold_orders(tenant_id, due_date, amount_due)
    WHERE status NOT IN ('COMPLETED', 'CANCELLED') AND amount_due > 0;
```

---

## 4. Tabel: gold_order_items {#4-gold-order-items}

```sql
CREATE TABLE gold_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Referințe
    order_id UUID NOT NULL REFERENCES gold_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES gold_products(id),
    
    -- Produs snapshot (pentru audit)
    product_sku VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_description TEXT,
    
    -- Cantitate și Preț
    quantity DECIMAL(15,3) NOT NULL CHECK (quantity > 0),
    unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'BUC',
    unit_price DECIMAL(15,2) NOT NULL CHECK (unit_price >= 0),
    
    -- Discount per item
    discount_amount DECIMAL(15,2) DEFAULT 0 CHECK (discount_amount >= 0),
    discount_percent DECIMAL(5,2) DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
    
    -- Calcule
    line_total DECIMAL(15,2) GENERATED ALWAYS AS (
        (quantity * unit_price) - discount_amount
    ) STORED,
    
    -- VAT
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 19.00,
    vat_amount DECIMAL(15,2) GENERATED ALWAYS AS (
        ((quantity * unit_price) - discount_amount) * vat_rate / 100
    ) STORED,
    
    -- Stoc
    stock_reserved BOOLEAN DEFAULT FALSE,
    stock_reservation_id UUID,
    stock_deducted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON gold_order_items(order_id);
CREATE INDEX idx_order_items_product ON gold_order_items(product_id);
CREATE INDEX idx_order_items_tenant ON gold_order_items(tenant_id);
```

---

## 5. Tabel: gold_payments {#5-gold-payments}

```sql
CREATE TABLE gold_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Referință externă
    external_id VARCHAR(100), -- Revolut transaction ID
    external_source VARCHAR(50) NOT NULL, -- 'REVOLUT', 'MANUAL', 'COD'
    
    -- Client
    client_id UUID REFERENCES gold_clients(id),
    
    -- Valoare
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'RON',
    exchange_rate DECIMAL(10,6) DEFAULT 1.0,
    amount_ron DECIMAL(15,2) GENERATED ALWAYS AS (amount * exchange_rate) STORED,
    
    -- Detalii
    payment_method payment_method_enum NOT NULL,
    status payment_status_enum NOT NULL DEFAULT 'PENDING',
    
    -- Revolut specific
    counterparty_name VARCHAR(255),
    counterparty_account VARCHAR(100),
    description TEXT,
    reference VARCHAR(100),
    
    -- Reconciliere
    reconciliation_status reconciliation_status_enum DEFAULT 'PENDING',
    reconciled_at TIMESTAMPTZ,
    reconciled_by UUID REFERENCES users(id),
    
    -- Referință la factură (după reconciliere)
    invoice_id UUID REFERENCES gold_invoices(id),
    order_id UUID REFERENCES gold_orders(id),
    
    -- Metadata
    raw_payload JSONB, -- Original webhook payload
    correlation_id UUID,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    transaction_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT uq_external_payment UNIQUE (external_source, external_id)
);

CREATE INDEX idx_payments_tenant ON gold_payments(tenant_id);
CREATE INDEX idx_payments_client ON gold_payments(client_id);
CREATE INDEX idx_payments_status ON gold_payments(status);
CREATE INDEX idx_payments_reconciliation ON gold_payments(reconciliation_status);
CREATE INDEX idx_payments_order ON gold_payments(order_id);
CREATE INDEX idx_payments_invoice ON gold_payments(invoice_id);
CREATE INDEX idx_payments_transaction_date ON gold_payments(transaction_date DESC);
CREATE INDEX idx_payments_external ON gold_payments(external_source, external_id);

-- Index pentru reconciliere pending
CREATE INDEX idx_payments_pending_recon ON gold_payments(tenant_id, amount, transaction_date)
    WHERE reconciliation_status = 'PENDING';
```

---

## 6. Tabel: gold_payment_reconciliations {#6-gold-payment-reconciliations}

```sql
CREATE TABLE gold_payment_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Referințe
    payment_id UUID NOT NULL REFERENCES gold_payments(id),
    invoice_id UUID REFERENCES gold_invoices(id),
    order_id UUID REFERENCES gold_orders(id),
    
    -- Matching
    match_type reconciliation_status_enum NOT NULL,
    match_confidence DECIMAL(5,2), -- 0-100 for fuzzy match
    
    -- Detalii match
    matched_fields JSONB, -- Care câmpuri s-au potrivit
    match_details TEXT,
    
    -- Aprobare (pentru manual/fuzzy)
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    
    -- Discrepanțe
    amount_difference DECIMAL(15,2), -- Diferență între plată și factură
    difference_reason VARCHAR(100),
    difference_action VARCHAR(50), -- 'CREDIT_NOTE', 'REFUND', 'ACCEPT'
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_payment_reconciliation UNIQUE (payment_id)
);

CREATE INDEX idx_reconciliations_tenant ON gold_payment_reconciliations(tenant_id);
CREATE INDEX idx_reconciliations_invoice ON gold_payment_reconciliations(invoice_id);
CREATE INDEX idx_reconciliations_match_type ON gold_payment_reconciliations(match_type);
```

---

## 7. Tabel: gold_refunds {#7-gold-refunds}

```sql
CREATE TABLE gold_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Referințe
    order_id UUID REFERENCES gold_orders(id),
    payment_id UUID REFERENCES gold_payments(id),
    return_id UUID REFERENCES gold_returns(id),
    
    -- Client
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    
    -- Valoare
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'RON',
    
    -- Status
    status refund_status_enum NOT NULL DEFAULT 'REQUESTED',
    reason refund_reason_enum NOT NULL,
    reason_details TEXT,
    
    -- Procesare
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    processing_notes TEXT,
    
    -- Revolut refund
    revolut_refund_id VARCHAR(100),
    revolut_status VARCHAR(50),
    
    -- HITL
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_id UUID REFERENCES hitl_approvals(id),
    
    -- Timestamps
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refunds_tenant ON gold_refunds(tenant_id);
CREATE INDEX idx_refunds_client ON gold_refunds(client_id);
CREATE INDEX idx_refunds_order ON gold_refunds(order_id);
CREATE INDEX idx_refunds_status ON gold_refunds(status);
CREATE INDEX idx_refunds_return ON gold_refunds(return_id);
```

---

## 8. Indexes & Constraints Summary {#8-indexes}

### Performance Indexes
```sql
-- Composite indexes for common queries
CREATE INDEX idx_orders_tenant_status_date ON gold_orders(tenant_id, status, created_at DESC);
CREATE INDEX idx_orders_client_status ON gold_orders(client_id, status);
CREATE INDEX idx_payments_tenant_date_status ON gold_payments(tenant_id, transaction_date DESC, status);

-- Full-text search
CREATE INDEX idx_orders_search ON gold_orders USING gin(
    to_tsvector('romanian', coalesce(order_number, '') || ' ' || coalesce(notes, ''))
);
```

### Foreign Key Indexes
```sql
-- Ensure all FK columns have indexes (already defined above)
-- This is a checklist verification
```

---

## 9. Functions & Triggers {#9-functions}

### Function: Calculate Order Totals
```sql
CREATE OR REPLACE FUNCTION calculate_order_totals(p_order_id UUID)
RETURNS TABLE (
    subtotal DECIMAL(15,2),
    discount_total DECIMAL(15,2),
    vat_total DECIMAL(15,2),
    grand_total DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS subtotal,
        COALESCE(SUM(oi.discount_amount), 0) AS discount_total,
        COALESCE(SUM(oi.vat_amount), 0) AS vat_total,
        COALESCE(SUM(oi.line_total + oi.vat_amount), 0) AS grand_total
    FROM gold_order_items oi
    WHERE oi.order_id = p_order_id;
END;
$$ LANGUAGE plpgsql;
```

### Function: Update Order Payment Status
```sql
CREATE OR REPLACE FUNCTION update_order_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid DECIMAL(15,2);
    v_order_total DECIMAL(15,2);
BEGIN
    -- Calculate total paid for this order
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM gold_payments
    WHERE order_id = NEW.order_id AND status = 'CONFIRMED';
    
    -- Get order total
    SELECT total_amount INTO v_order_total
    FROM gold_orders WHERE id = NEW.order_id;
    
    -- Update order
    UPDATE gold_orders
    SET amount_paid = v_total_paid,
        status = CASE
            WHEN v_total_paid >= v_order_total THEN 'PAYMENT_RECEIVED'::order_status_enum
            ELSE status
        END
    WHERE id = NEW.order_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_order_on_payment
    AFTER INSERT OR UPDATE ON gold_payments
    FOR EACH ROW
    WHEN (NEW.order_id IS NOT NULL)
    EXECUTE FUNCTION update_order_payment_status();
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
