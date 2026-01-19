# CERNIQ.APP — ETAPA 4: SCHEMA LOGISTICS & SHIPMENTS
## Database Schema pentru Logistică și Livrări
### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [Overview Schema Logistics](#1-overview)
2. [Enums & Types](#2-enums)
3. [Tabel: gold_shipments](#3-shipments)
4. [Tabel: gold_shipment_tracking](#4-tracking)
5. [Tabel: gold_returns](#5-returns)
6. [Tabel: gold_addresses](#6-addresses)
7. [Tabel: gold_cod_collections](#7-cod)
8. [Functions & Triggers](#8-functions)

---

## 1. Overview Schema Logistics {#1-overview}

Schema pentru logistică gestionează:
- **Shipments**: AWB-uri și informații expediere
- **Tracking**: Istoric status livrare
- **Returns**: RMA și retururi
- **COD**: Încasări ramburs la livrare
- **Addresses**: Adrese livrare

---

## 2. Enums & Types {#2-enums}

```sql
-- Shipment Status (Sameday compatible)
CREATE TYPE shipment_status_enum AS ENUM (
    'CREATED',
    'PENDING_PICKUP',
    'PICKED_UP',
    'IN_TRANSIT',
    'IN_WAREHOUSE',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'DELIVERY_FAILED',
    'RETURNED_TO_SENDER',
    'CANCELLED'
);

-- Delivery Type
CREATE TYPE delivery_type_enum AS ENUM (
    'STANDARD',
    'EXPRESS',
    'SAME_DAY',
    'LOCKER',
    'PICKUP_POINT'
);

-- Payment at Delivery
CREATE TYPE cod_type_enum AS ENUM (
    'NONE',
    'CASH',
    'CARD',
    'CASH_OR_CARD'
);

-- Return Status
CREATE TYPE return_status_enum AS ENUM (
    'REQUESTED',
    'APPROVED',
    'AWB_GENERATED',
    'PICKED_UP',
    'IN_TRANSIT',
    'RECEIVED',
    'INSPECTED',
    'REFUND_APPROVED',
    'REFUND_REJECTED',
    'REFUND_PROCESSED',
    'COMPLETED',
    'CANCELLED',
    'DISPUTE'
);

-- Return Reason
CREATE TYPE return_reason_enum AS ENUM (
    'CUSTOMER_CHANGED_MIND',
    'WRONG_PRODUCT',
    'DAMAGED_IN_TRANSIT',
    'DEFECTIVE',
    'QUALITY_ISSUE',
    'NOT_AS_DESCRIBED',
    'LATE_DELIVERY',
    'OTHER'
);
```

---

## 3. Tabel: gold_shipments {#3-shipments}

```sql
CREATE TABLE gold_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- AWB Info
    awb_number VARCHAR(50),
    carrier VARCHAR(50) NOT NULL DEFAULT 'SAMEDAY',
    carrier_service VARCHAR(50),
    
    -- References
    order_id UUID NOT NULL REFERENCES gold_orders(id),
    invoice_id UUID REFERENCES gold_invoices(id),
    
    -- Status
    status shipment_status_enum NOT NULL DEFAULT 'CREATED',
    previous_status shipment_status_enum,
    status_changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Delivery Details
    delivery_type delivery_type_enum NOT NULL DEFAULT 'STANDARD',
    origin_address_id UUID REFERENCES gold_addresses(id),
    destination_address_id UUID NOT NULL REFERENCES gold_addresses(id),
    
    -- Package Info
    package_count INTEGER NOT NULL DEFAULT 1,
    total_weight_kg DECIMAL(10,2),
    dimensions_cm JSONB, -- {length, width, height}
    
    -- COD (Cash on Delivery)
    cod_type cod_type_enum DEFAULT 'NONE',
    cod_amount DECIMAL(15,2) DEFAULT 0,
    cod_currency VARCHAR(3) DEFAULT 'RON',
    cod_collected BOOLEAN DEFAULT FALSE,
    cod_collected_at TIMESTAMPTZ,
    
    -- Costs
    shipping_cost DECIMAL(15,2),
    insurance_cost DECIMAL(15,2) DEFAULT 0,
    total_shipping_cost DECIMAL(15,2) GENERATED ALWAYS AS (
        COALESCE(shipping_cost, 0) + COALESCE(insurance_cost, 0)
    ) STORED,
    
    -- Dates
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    pickup_scheduled_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Recipient
    recipient_name VARCHAR(255),
    recipient_phone VARCHAR(20),
    recipient_email VARCHAR(255),
    delivery_notes TEXT,
    
    -- Sameday Specific
    sameday_parcel_id VARCHAR(100),
    sameday_pickup_point_id VARCHAR(50),
    sameday_locker_id VARCHAR(50),
    tracking_url TEXT,
    label_pdf_url TEXT,
    
    -- Proof of Delivery
    pod_signature_url TEXT,
    pod_photo_url TEXT,
    pod_recipient_name VARCHAR(255),
    
    -- Metadata
    raw_carrier_response JSONB,
    correlation_id UUID,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT uq_awb_carrier UNIQUE (carrier, awb_number)
);

-- Indexes
CREATE INDEX idx_shipments_tenant ON gold_shipments(tenant_id);
CREATE INDEX idx_shipments_order ON gold_shipments(order_id);
CREATE INDEX idx_shipments_awb ON gold_shipments(awb_number);
CREATE INDEX idx_shipments_status ON gold_shipments(status);
CREATE INDEX idx_shipments_created ON gold_shipments(created_at DESC);

-- Partial indexes
CREATE INDEX idx_shipments_active ON gold_shipments(tenant_id, status)
    WHERE status NOT IN ('DELIVERED', 'RETURNED_TO_SENDER', 'CANCELLED');
CREATE INDEX idx_shipments_cod_pending ON gold_shipments(tenant_id)
    WHERE cod_type != 'NONE' AND cod_collected = FALSE AND status = 'DELIVERED';
```

---

## 4. Tabel: gold_shipment_tracking {#4-tracking}

```sql
CREATE TABLE gold_shipment_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Reference
    shipment_id UUID NOT NULL REFERENCES gold_shipments(id),
    
    -- Status Info
    status shipment_status_enum NOT NULL,
    status_code VARCHAR(50), -- Carrier-specific code
    status_message TEXT,
    
    -- Location
    location_name VARCHAR(255),
    location_code VARCHAR(50),
    location_city VARCHAR(100),
    location_country VARCHAR(2) DEFAULT 'RO',
    
    -- Timestamp from carrier
    event_timestamp TIMESTAMPTZ NOT NULL,
    
    -- Raw Data
    raw_event JSONB,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (event_timestamp);

-- Create monthly partitions
CREATE TABLE gold_shipment_tracking_2026_01 PARTITION OF gold_shipment_tracking
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE gold_shipment_tracking_2026_02 PARTITION OF gold_shipment_tracking
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Indexes
CREATE INDEX idx_tracking_shipment ON gold_shipment_tracking(shipment_id);
CREATE INDEX idx_tracking_timestamp ON gold_shipment_tracking(event_timestamp DESC);
```

---

## 5. Tabel: gold_returns {#5-returns}

```sql
CREATE TABLE gold_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Return Number
    return_number VARCHAR(50) NOT NULL,
    
    -- References
    order_id UUID NOT NULL REFERENCES gold_orders(id),
    original_shipment_id UUID REFERENCES gold_shipments(id),
    return_shipment_id UUID REFERENCES gold_shipments(id),
    refund_id UUID REFERENCES gold_refunds(id),
    
    -- Client
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    
    -- Status
    status return_status_enum NOT NULL DEFAULT 'REQUESTED',
    previous_status return_status_enum,
    status_changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Reason
    reason return_reason_enum NOT NULL,
    reason_details TEXT,
    customer_notes TEXT,
    
    -- Items
    items JSONB NOT NULL, -- Array of {order_item_id, quantity, reason}
    
    -- Valoare
    items_value DECIMAL(15,2) NOT NULL,
    refund_amount DECIMAL(15,2),
    restocking_fee DECIMAL(15,2) DEFAULT 0,
    
    -- Eligibility
    is_eligible BOOLEAN,
    eligibility_reason TEXT,
    days_since_delivery INTEGER,
    
    -- Inspection
    inspection_result VARCHAR(50), -- 'APPROVED', 'PARTIAL', 'REJECTED'
    inspection_notes TEXT,
    inspection_photos JSONB, -- Array of URLs
    inspected_at TIMESTAMPTZ,
    inspected_by UUID REFERENCES users(id),
    
    -- HITL
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_id UUID REFERENCES hitl_approvals(id),
    
    -- Return AWB
    return_awb VARCHAR(50),
    return_label_url TEXT,
    
    -- Timestamps
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT uq_return_number_tenant UNIQUE (tenant_id, return_number)
);

-- Indexes
CREATE INDEX idx_returns_tenant ON gold_returns(tenant_id);
CREATE INDEX idx_returns_order ON gold_returns(order_id);
CREATE INDEX idx_returns_client ON gold_returns(client_id);
CREATE INDEX idx_returns_status ON gold_returns(status);
CREATE INDEX idx_returns_created ON gold_returns(created_at DESC);
```

---

## 6. Tabel: gold_addresses {#6-addresses}

```sql
CREATE TABLE gold_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Owner (poate fi client sau tenant warehouse)
    client_id UUID REFERENCES gold_clients(id),
    is_warehouse BOOLEAN DEFAULT FALSE,
    
    -- Address Type
    address_type VARCHAR(50) DEFAULT 'DELIVERY', -- DELIVERY, BILLING, WAREHOUSE
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Address Details
    contact_name VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    
    company_name VARCHAR(255),
    street_address VARCHAR(500) NOT NULL,
    street_number VARCHAR(20),
    building VARCHAR(50),
    floor VARCHAR(20),
    apartment VARCHAR(20),
    
    city VARCHAR(100) NOT NULL,
    county VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10),
    country VARCHAR(2) NOT NULL DEFAULT 'RO',
    
    -- Geocoding
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    geocoded_at TIMESTAMPTZ,
    
    -- Sameday Specific
    sameday_city_id INTEGER,
    sameday_county_id INTEGER,
    nearest_pickup_point_id VARCHAR(50),
    nearest_locker_id VARCHAR(50),
    
    -- Validation
    is_validated BOOLEAN DEFAULT FALSE,
    validation_notes TEXT,
    
    -- Metadata
    delivery_instructions TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_addresses_tenant ON gold_addresses(tenant_id);
CREATE INDEX idx_addresses_client ON gold_addresses(client_id);
CREATE INDEX idx_addresses_type ON gold_addresses(address_type);
CREATE INDEX idx_addresses_city ON gold_addresses(city, county);
CREATE INDEX idx_addresses_geo ON gold_addresses USING gist (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

---

## 7. Tabel: gold_cod_collections {#7-cod}

```sql
CREATE TABLE gold_cod_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- References
    shipment_id UUID NOT NULL REFERENCES gold_shipments(id),
    order_id UUID NOT NULL REFERENCES gold_orders(id),
    
    -- Amount
    expected_amount DECIMAL(15,2) NOT NULL,
    collected_amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'RON',
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, COLLECTED, FAILED, TRANSFERRED
    
    -- Collection Details
    collected_at TIMESTAMPTZ,
    collection_method VARCHAR(20), -- CASH, CARD
    courier_name VARCHAR(255),
    
    -- Transfer to Bank
    transferred_at TIMESTAMPTZ,
    transfer_reference VARCHAR(100),
    transfer_batch_id VARCHAR(100),
    
    -- Discrepancy
    has_discrepancy BOOLEAN DEFAULT FALSE,
    discrepancy_amount DECIMAL(15,2),
    discrepancy_resolved BOOLEAN DEFAULT FALSE,
    discrepancy_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT uq_cod_shipment UNIQUE (shipment_id)
);

-- Indexes
CREATE INDEX idx_cod_tenant ON gold_cod_collections(tenant_id);
CREATE INDEX idx_cod_status ON gold_cod_collections(status);
CREATE INDEX idx_cod_order ON gold_cod_collections(order_id);
```

---

## 8. Functions & Triggers {#8-functions}

```sql
-- Function: Update shipment status from tracking
CREATE OR REPLACE FUNCTION update_shipment_from_tracking()
RETURNS TRIGGER AS $$
BEGIN
    -- Update shipment status
    UPDATE gold_shipments
    SET 
        status = NEW.status,
        previous_status = status,
        status_changed_at = NEW.event_timestamp,
        delivered_at = CASE WHEN NEW.status = 'DELIVERED' THEN NEW.event_timestamp ELSE delivered_at END,
        picked_up_at = CASE WHEN NEW.status = 'PICKED_UP' THEN NEW.event_timestamp ELSE picked_up_at END,
        actual_delivery_date = CASE WHEN NEW.status = 'DELIVERED' THEN NEW.event_timestamp::DATE ELSE actual_delivery_date END
    WHERE id = NEW.shipment_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tracking_update_shipment
    AFTER INSERT ON gold_shipment_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_shipment_from_tracking();

-- Function: Check return eligibility
CREATE OR REPLACE FUNCTION check_return_eligibility(
    p_order_id UUID,
    p_days_since_delivery INTEGER DEFAULT NULL
) RETURNS TABLE (
    is_eligible BOOLEAN,
    reason TEXT,
    days_remaining INTEGER
) AS $$
DECLARE
    v_delivery_date DATE;
    v_days_since INTEGER;
    v_max_return_days INTEGER := 14;
BEGIN
    -- Get delivery date
    SELECT s.actual_delivery_date
    INTO v_delivery_date
    FROM gold_orders o
    JOIN gold_shipments s ON s.order_id = o.id
    WHERE o.id = p_order_id AND s.status = 'DELIVERED';
    
    IF v_delivery_date IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Order not yet delivered', 0;
        RETURN;
    END IF;
    
    v_days_since := COALESCE(p_days_since_delivery, CURRENT_DATE - v_delivery_date);
    
    IF v_days_since > v_max_return_days THEN
        RETURN QUERY SELECT FALSE, 'Return period expired', 0;
    ELSE
        RETURN QUERY SELECT TRUE, 'Eligible for return', v_max_return_days - v_days_since;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
