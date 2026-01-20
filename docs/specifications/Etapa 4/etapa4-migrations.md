# CERNIQ.APP — ETAPA 4: DATABASE MIGRATIONS
## Drizzle Migrations pentru Monitorizare Post-Vânzare
### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [Migration Overview](#1-overview)
2. [Migration: Create Enums](#2-enums)
3. [Migration: Orders Tables](#3-orders)
4. [Migration: Credit Tables](#4-credit)
5. [Migration: Logistics Tables](#5-logistics)
6. [Migration: Contract Tables](#6-contracts)
7. [Migration: Audit Tables](#7-audit)
8. [Migration: Indexes & Functions](#8-indexes)
9. [Rollback Procedures](#9-rollback)

---

## 1. Migration Overview {#1-overview}

```typescript
// migrations/etapa4/index.ts
export const ETAPA4_MIGRATIONS = [
  '0040_create_etapa4_enums',
  '0041_create_orders_tables',
  '0042_create_credit_tables',
  '0043_create_logistics_tables',
  '0044_create_contract_tables',
  '0045_create_audit_tables',
  '0046_create_indexes',
  '0047_create_functions',
  '0048_create_triggers',
  '0049_create_partitions',
  '0050_seed_etapa4_data'
];
```

---

## 2. Migration: Create Enums {#2-enums}

```typescript
// migrations/0040_create_etapa4_enums.ts
import { sql } from 'drizzle-orm';
import { pgEnum } from 'drizzle-orm/pg-core';

export async function up(db: DrizzleDb) {
  // Order Status Enum
  await db.execute(sql`
    CREATE TYPE order_status_enum AS ENUM (
      'DRAFT', 'PENDING_PAYMENT', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED',
      'CREDIT_CHECK', 'CREDIT_BLOCKED', 'CREDIT_APPROVED', 'PENDING_APPROVAL',
      'CONTRACT_PENDING', 'CONTRACT_SIGNED', 'CONTRACT_EXPIRED',
      'PROCESSING', 'READY_FOR_PICKUP', 'PICKED_UP', 'IN_TRANSIT',
      'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED',
      'RETURN_REQUESTED', 'RETURN_COMPLETED', 'COMPLETED',
      'CANCELLED', 'AUTO_CANCELLED'
    )
  `);

  // Payment Enums
  await db.execute(sql`
    CREATE TYPE payment_method_enum AS ENUM (
      'BANK_TRANSFER', 'REVOLUT', 'CARD', 'COD', 'CREDIT'
    )
  `);

  await db.execute(sql`
    CREATE TYPE payment_status_enum AS ENUM (
      'PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED', 'PARTIAL_REFUND'
    )
  `);

  await db.execute(sql`
    CREATE TYPE reconciliation_status_enum AS ENUM (
      'PENDING', 'MATCHED_EXACT', 'MATCHED_FUZZY', 'UNMATCHED', 'MANUAL_MATCHED', 'DISPUTED'
    )
  `);

  // Credit Enums
  await db.execute(sql`
    CREATE TYPE risk_tier_enum AS ENUM (
      'BLOCKED', 'LOW', 'MEDIUM', 'HIGH', 'PREMIUM'
    )
  `);

  await db.execute(sql`
    CREATE TYPE credit_check_result_enum AS ENUM (
      'APPROVED', 'INSUFFICIENT_CREDIT', 'BLOCKED_CLIENT', 'PENDING_APPROVAL', 'SCORE_EXPIRED', 'ERROR'
    )
  `);

  await db.execute(sql`
    CREATE TYPE reservation_status_enum AS ENUM (
      'ACTIVE', 'RELEASED', 'CONVERTED', 'EXPIRED', 'CANCELLED'
    )
  `);

  // Logistics Enums
  await db.execute(sql`
    CREATE TYPE shipment_status_enum AS ENUM (
      'CREATED', 'PENDING_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'IN_WAREHOUSE',
      'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNED_TO_SENDER', 'CANCELLED'
    )
  `);

  await db.execute(sql`
    CREATE TYPE delivery_type_enum AS ENUM (
      'STANDARD', 'EXPRESS', 'SAME_DAY', 'LOCKER', 'PICKUP_POINT'
    )
  `);

  await db.execute(sql`
    CREATE TYPE return_status_enum AS ENUM (
      'REQUESTED', 'APPROVED', 'AWB_GENERATED', 'PICKED_UP', 'IN_TRANSIT',
      'RECEIVED', 'INSPECTED', 'REFUND_APPROVED', 'REFUND_REJECTED',
      'REFUND_PROCESSED', 'COMPLETED', 'CANCELLED', 'DISPUTE'
    )
  `);

  // Contract Enums
  await db.execute(sql`
    CREATE TYPE contract_status_enum AS ENUM (
      'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SENT_FOR_SIGNATURE',
      'PARTIALLY_SIGNED', 'SIGNED', 'EXPIRED', 'CANCELLED', 'REJECTED'
    )
  `);

  await db.execute(sql`
    CREATE TYPE contract_type_enum AS ENUM (
      'STANDARD', 'CREDIT_SALE', 'PREPAYMENT', 'FRAMEWORK', 'ADDENDUM'
    )
  `);

  await db.execute(sql`
    CREATE TYPE signature_status_enum AS ENUM (
      'PENDING', 'VIEWED', 'SIGNED', 'DECLINED', 'EXPIRED'
    )
  `);

  // Refund Enums
  await db.execute(sql`
    CREATE TYPE refund_status_enum AS ENUM (
      'REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED'
    )
  `);

  await db.execute(sql`
    CREATE TYPE refund_reason_enum AS ENUM (
      'RETURN', 'PARTIAL_RETURN', 'ORDER_CANCELLED', 'OVERPAYMENT',
      'PRICE_ADJUSTMENT', 'CUSTOMER_REQUEST', 'QUALITY_ISSUE', 'SHIPPING_DAMAGE'
    )
  `);

  // Audit Enums
  await db.execute(sql`
    CREATE TYPE actor_type_enum AS ENUM (
      'SYSTEM', 'USER', 'WEBHOOK', 'CRON', 'API', 'HITL'
    )
  `);
}

export async function down(db: DrizzleDb) {
  const enums = [
    'order_status_enum', 'payment_method_enum', 'payment_status_enum',
    'reconciliation_status_enum', 'risk_tier_enum', 'credit_check_result_enum',
    'reservation_status_enum', 'shipment_status_enum', 'delivery_type_enum',
    'return_status_enum', 'contract_status_enum', 'contract_type_enum',
    'signature_status_enum', 'refund_status_enum', 'refund_reason_enum',
    'actor_type_enum'
  ];
  
  for (const enumName of enums) {
    await db.execute(sql.raw(`DROP TYPE IF EXISTS ${enumName} CASCADE`));
  }
}
```

---

## 3. Migration: Orders Tables {#3-orders}

```typescript
// migrations/0041_create_orders_tables.ts
import { sql } from 'drizzle-orm';

export async function up(db: DrizzleDb) {
  // gold_orders
  await db.execute(sql`
    CREATE TABLE gold_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      order_number VARCHAR(50) NOT NULL,
      
      client_id UUID NOT NULL REFERENCES gold_clients(id),
      negotiation_id UUID REFERENCES gold_negotiations(id),
      invoice_id UUID,
      proforma_id UUID,
      contract_id UUID,
      
      subtotal DECIMAL(15,2) NOT NULL CHECK (subtotal >= 0),
      discount_amount DECIMAL(15,2) DEFAULT 0,
      discount_percent DECIMAL(5,2) DEFAULT 0,
      vat_rate DECIMAL(5,2) NOT NULL DEFAULT 19.00,
      vat_amount DECIMAL(15,2) NOT NULL,
      shipping_cost DECIMAL(15,2) DEFAULT 0,
      total_amount DECIMAL(15,2) NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'RON',
      
      amount_paid DECIMAL(15,2) NOT NULL DEFAULT 0,
      amount_due DECIMAL(15,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
      payment_method payment_method_enum,
      
      status order_status_enum NOT NULL DEFAULT 'DRAFT',
      previous_status order_status_enum,
      status_changed_at TIMESTAMPTZ DEFAULT NOW(),
      status_changed_by UUID,
      
      credit_approved BOOLEAN DEFAULT FALSE,
      credit_limit_used DECIMAL(15,2) DEFAULT 0,
      credit_approval_id UUID,
      payment_terms_days INTEGER DEFAULT 0,
      due_date DATE,
      
      shipment_id UUID,
      delivery_address_id UUID,
      delivery_notes TEXT,
      requested_delivery_date DATE,
      
      source VARCHAR(50) DEFAULT 'AI_AGENT',
      correlation_id UUID,
      notes TEXT,
      internal_notes TEXT,
      tags TEXT[],
      metadata JSONB DEFAULT '{}',
      
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      
      CONSTRAINT uq_order_number_tenant UNIQUE (tenant_id, order_number)
    )
  `);

  // gold_order_items
  await db.execute(sql`
    CREATE TABLE gold_order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      order_id UUID NOT NULL REFERENCES gold_orders(id) ON DELETE CASCADE,
      product_id UUID NOT NULL,
      
      product_sku VARCHAR(50) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      product_description TEXT,
      
      quantity DECIMAL(15,3) NOT NULL CHECK (quantity > 0),
      unit_of_measure VARCHAR(20) DEFAULT 'BUC',
      unit_price DECIMAL(15,2) NOT NULL,
      
      discount_amount DECIMAL(15,2) DEFAULT 0,
      discount_percent DECIMAL(5,2) DEFAULT 0,
      line_total DECIMAL(15,2) GENERATED ALWAYS AS ((quantity * unit_price) - discount_amount) STORED,
      
      vat_rate DECIMAL(5,2) NOT NULL DEFAULT 19.00,
      vat_amount DECIMAL(15,2) GENERATED ALWAYS AS (((quantity * unit_price) - discount_amount) * vat_rate / 100) STORED,
      
      stock_reserved BOOLEAN DEFAULT FALSE,
      stock_reservation_id UUID,
      stock_deducted BOOLEAN DEFAULT FALSE,
      
      notes TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // gold_payments
  await db.execute(sql`
    CREATE TABLE gold_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      
      external_id VARCHAR(100),
      external_source VARCHAR(50) NOT NULL,
      
      client_id UUID REFERENCES gold_clients(id),
      
      amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
      currency VARCHAR(3) NOT NULL DEFAULT 'RON',
      exchange_rate DECIMAL(10,6) DEFAULT 1.0,
      amount_ron DECIMAL(15,2) GENERATED ALWAYS AS (amount * exchange_rate) STORED,
      
      payment_method payment_method_enum NOT NULL,
      status payment_status_enum NOT NULL DEFAULT 'PENDING',
      
      counterparty_name VARCHAR(255),
      counterparty_account VARCHAR(100),
      description TEXT,
      reference VARCHAR(100),
      
      reconciliation_status reconciliation_status_enum DEFAULT 'PENDING',
      reconciled_at TIMESTAMPTZ,
      reconciled_by UUID,
      
      invoice_id UUID,
      order_id UUID REFERENCES gold_orders(id),
      
      raw_payload JSONB,
      correlation_id UUID,
      metadata JSONB DEFAULT '{}',
      
      transaction_date TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      CONSTRAINT uq_external_payment UNIQUE (external_source, external_id)
    )
  `);

  // gold_refunds
  await db.execute(sql`
    CREATE TABLE gold_refunds (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      
      order_id UUID REFERENCES gold_orders(id),
      payment_id UUID REFERENCES gold_payments(id),
      return_id UUID,
      client_id UUID NOT NULL REFERENCES gold_clients(id),
      
      amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
      currency VARCHAR(3) NOT NULL DEFAULT 'RON',
      
      status refund_status_enum NOT NULL DEFAULT 'REQUESTED',
      reason refund_reason_enum NOT NULL,
      reason_details TEXT,
      
      processed_by UUID,
      processed_at TIMESTAMPTZ,
      processing_notes TEXT,
      
      revolut_refund_id VARCHAR(100),
      revolut_status VARCHAR(50),
      
      requires_approval BOOLEAN DEFAULT FALSE,
      approval_id UUID,
      
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Indexes
  await db.execute(sql`CREATE INDEX idx_orders_tenant ON gold_orders(tenant_id)`);
  await db.execute(sql`CREATE INDEX idx_orders_client ON gold_orders(client_id)`);
  await db.execute(sql`CREATE INDEX idx_orders_status ON gold_orders(status)`);
  await db.execute(sql`CREATE INDEX idx_orders_created ON gold_orders(created_at DESC)`);
  await db.execute(sql`CREATE INDEX idx_order_items_order ON gold_order_items(order_id)`);
  await db.execute(sql`CREATE INDEX idx_payments_tenant ON gold_payments(tenant_id)`);
  await db.execute(sql`CREATE INDEX idx_payments_status ON gold_payments(status)`);
  await db.execute(sql`CREATE INDEX idx_refunds_tenant ON gold_refunds(tenant_id)`);
}

export async function down(db: DrizzleDb) {
  await db.execute(sql`DROP TABLE IF EXISTS gold_refunds CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS gold_payments CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS gold_order_items CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS gold_orders CASCADE`);
}
```

---

## 4. Migration: Credit Tables {#4-credit}

```typescript
// migrations/0042_create_credit_tables.ts
import { sql } from 'drizzle-orm';

export async function up(db: DrizzleDb) {
  // gold_credit_profiles
  await db.execute(sql`
    CREATE TABLE gold_credit_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      client_id UUID NOT NULL REFERENCES gold_clients(id),
      cui VARCHAR(20),
      
      credit_score INTEGER CHECK (credit_score BETWEEN 0 AND 100),
      risk_tier risk_tier_enum NOT NULL DEFAULT 'MEDIUM',
      score_components JSONB DEFAULT '{}',
      
      credit_limit DECIMAL(15,2) NOT NULL DEFAULT 0,
      credit_limit_currency VARCHAR(3) DEFAULT 'EUR',
      credit_used DECIMAL(15,2) NOT NULL DEFAULT 0,
      credit_reserved DECIMAL(15,2) NOT NULL DEFAULT 0,
      credit_available DECIMAL(15,2) GENERATED ALWAYS AS (credit_limit - credit_used - credit_reserved) STORED,
      
      default_payment_terms INTEGER DEFAULT 30,
      max_payment_terms INTEGER DEFAULT 60,
      
      is_blocked BOOLEAN DEFAULT FALSE,
      blocked_reason TEXT,
      blocked_at TIMESTAMPTZ,
      blocked_by UUID,
      
      last_scored_at TIMESTAMPTZ,
      next_review_at TIMESTAMPTZ,
      score_source VARCHAR(50),
      auto_refresh_enabled BOOLEAN DEFAULT TRUE,
      
      total_orders INTEGER DEFAULT 0,
      total_revenue DECIMAL(15,2) DEFAULT 0,
      avg_payment_days DECIMAL(5,1),
      late_payments_count INTEGER DEFAULT 0,
      on_time_payment_rate DECIMAL(5,2),
      
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      CONSTRAINT uq_credit_profile_client UNIQUE (tenant_id, client_id)
    )
  `);

  // gold_credit_reservations
  await db.execute(sql`
    CREATE TABLE gold_credit_reservations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      credit_profile_id UUID NOT NULL REFERENCES gold_credit_profiles(id),
      order_id UUID NOT NULL REFERENCES gold_orders(id),
      
      amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
      currency VARCHAR(3) DEFAULT 'RON',
      status reservation_status_enum NOT NULL DEFAULT 'ACTIVE',
      
      expires_at TIMESTAMPTZ NOT NULL,
      grace_period_until TIMESTAMPTZ,
      
      resolved_at TIMESTAMPTZ,
      resolved_by UUID,
      resolution_notes TEXT,
      
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      CONSTRAINT uq_credit_reservation_order UNIQUE (order_id)
    )
  `);

  // gold_termene_data (Cache Termene.ro)
  await db.execute(sql`
    CREATE TABLE gold_termene_data (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      cui VARCHAR(20) NOT NULL,
      company_name VARCHAR(255),
      
      anaf_status VARCHAR(50),
      anaf_tva_status VARCHAR(50),
      anaf_inactive BOOLEAN,
      
      financial_year INTEGER,
      revenue DECIMAL(15,2),
      profit DECIMAL(15,2),
      employees INTEGER,
      
      bpi_status VARCHAR(50),
      litigation_count INTEGER DEFAULT 0,
      
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      raw_response JSONB,
      
      CONSTRAINT uq_termene_cui_tenant UNIQUE (tenant_id, cui)
    )
  `);

  // Indexes
  await db.execute(sql`CREATE INDEX idx_credit_profiles_tenant ON gold_credit_profiles(tenant_id)`);
  await db.execute(sql`CREATE INDEX idx_credit_profiles_client ON gold_credit_profiles(client_id)`);
  await db.execute(sql`CREATE INDEX idx_credit_profiles_risk ON gold_credit_profiles(risk_tier)`);
  await db.execute(sql`CREATE INDEX idx_reservations_profile ON gold_credit_reservations(credit_profile_id)`);
  await db.execute(sql`CREATE INDEX idx_termene_cui ON gold_termene_data(cui)`);
}

export async function down(db: DrizzleDb) {
  await db.execute(sql`DROP TABLE IF EXISTS gold_termene_data CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS gold_credit_reservations CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS gold_credit_profiles CASCADE`);
}
```

---

## 5. Migration: Logistics Tables {#5-logistics}

```typescript
// migrations/0043_create_logistics_tables.ts
import { sql } from 'drizzle-orm';

export async function up(db: DrizzleDb) {
  // gold_addresses
  await db.execute(sql`
    CREATE TABLE gold_addresses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      client_id UUID REFERENCES gold_clients(id),
      is_warehouse BOOLEAN DEFAULT FALSE,
      address_type VARCHAR(50) DEFAULT 'DELIVERY',
      is_default BOOLEAN DEFAULT FALSE,
      
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
      
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      
      sameday_city_id INTEGER,
      sameday_county_id INTEGER,
      
      is_validated BOOLEAN DEFAULT FALSE,
      delivery_instructions TEXT,
      metadata JSONB DEFAULT '{}',
      
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // gold_shipments
  await db.execute(sql`
    CREATE TABLE gold_shipments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      
      awb_number VARCHAR(50),
      carrier VARCHAR(50) NOT NULL DEFAULT 'SAMEDAY',
      carrier_service VARCHAR(50),
      
      order_id UUID NOT NULL REFERENCES gold_orders(id),
      invoice_id UUID,
      
      status shipment_status_enum NOT NULL DEFAULT 'CREATED',
      previous_status shipment_status_enum,
      status_changed_at TIMESTAMPTZ DEFAULT NOW(),
      
      delivery_type delivery_type_enum NOT NULL DEFAULT 'STANDARD',
      origin_address_id UUID REFERENCES gold_addresses(id),
      destination_address_id UUID NOT NULL REFERENCES gold_addresses(id),
      
      package_count INTEGER NOT NULL DEFAULT 1,
      total_weight_kg DECIMAL(10,2),
      dimensions_cm JSONB,
      
      cod_type VARCHAR(20) DEFAULT 'NONE',
      cod_amount DECIMAL(15,2) DEFAULT 0,
      cod_collected BOOLEAN DEFAULT FALSE,
      cod_collected_at TIMESTAMPTZ,
      
      shipping_cost DECIMAL(15,2),
      insurance_cost DECIMAL(15,2) DEFAULT 0,
      
      estimated_delivery_date DATE,
      actual_delivery_date DATE,
      pickup_scheduled_at TIMESTAMPTZ,
      picked_up_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      
      recipient_name VARCHAR(255),
      recipient_phone VARCHAR(20),
      delivery_notes TEXT,
      
      sameday_parcel_id VARCHAR(100),
      tracking_url TEXT,
      label_pdf_url TEXT,
      
      pod_signature_url TEXT,
      pod_photo_url TEXT,
      
      raw_carrier_response JSONB,
      correlation_id UUID,
      metadata JSONB DEFAULT '{}',
      
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      CONSTRAINT uq_awb_carrier UNIQUE (carrier, awb_number)
    )
  `);

  // gold_returns
  await db.execute(sql`
    CREATE TABLE gold_returns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      return_number VARCHAR(50) NOT NULL,
      
      order_id UUID NOT NULL REFERENCES gold_orders(id),
      original_shipment_id UUID REFERENCES gold_shipments(id),
      return_shipment_id UUID REFERENCES gold_shipments(id),
      refund_id UUID REFERENCES gold_refunds(id),
      client_id UUID NOT NULL REFERENCES gold_clients(id),
      
      status return_status_enum NOT NULL DEFAULT 'REQUESTED',
      previous_status return_status_enum,
      status_changed_at TIMESTAMPTZ DEFAULT NOW(),
      
      reason VARCHAR(50) NOT NULL,
      reason_details TEXT,
      customer_notes TEXT,
      items JSONB NOT NULL,
      
      items_value DECIMAL(15,2) NOT NULL,
      refund_amount DECIMAL(15,2),
      restocking_fee DECIMAL(15,2) DEFAULT 0,
      
      is_eligible BOOLEAN,
      eligibility_reason TEXT,
      days_since_delivery INTEGER,
      
      inspection_result VARCHAR(50),
      inspection_notes TEXT,
      inspection_photos JSONB,
      inspected_at TIMESTAMPTZ,
      inspected_by UUID,
      
      requires_approval BOOLEAN DEFAULT FALSE,
      approval_id UUID,
      
      return_awb VARCHAR(50),
      return_label_url TEXT,
      
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      approved_at TIMESTAMPTZ,
      received_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      CONSTRAINT uq_return_number_tenant UNIQUE (tenant_id, return_number)
    )
  `);

  // Indexes
  await db.execute(sql`CREATE INDEX idx_addresses_tenant ON gold_addresses(tenant_id)`);
  await db.execute(sql`CREATE INDEX idx_addresses_client ON gold_addresses(client_id)`);
  await db.execute(sql`CREATE INDEX idx_shipments_tenant ON gold_shipments(tenant_id)`);
  await db.execute(sql`CREATE INDEX idx_shipments_order ON gold_shipments(order_id)`);
  await db.execute(sql`CREATE INDEX idx_shipments_awb ON gold_shipments(awb_number)`);
  await db.execute(sql`CREATE INDEX idx_shipments_status ON gold_shipments(status)`);
  await db.execute(sql`CREATE INDEX idx_returns_tenant ON gold_returns(tenant_id)`);
  await db.execute(sql`CREATE INDEX idx_returns_order ON gold_returns(order_id)`);
}

export async function down(db: DrizzleDb) {
  await db.execute(sql`DROP TABLE IF EXISTS gold_returns CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS gold_shipments CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS gold_addresses CASCADE`);
}
```

---

## 6. Migration: Contract Tables {#6-contracts}

```typescript
// migrations/0044_create_contract_tables.ts
import { sql } from 'drizzle-orm';

export async function up(db: DrizzleDb) {
  // gold_contract_templates
  await db.execute(sql`
    CREATE TABLE gold_contract_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      contract_type contract_type_enum NOT NULL,
      
      template_docx_url TEXT NOT NULL,
      required_variables TEXT[] DEFAULT '{}',
      optional_variables TEXT[] DEFAULT '{}',
      
      is_active BOOLEAN DEFAULT TRUE,
      is_default BOOLEAN DEFAULT FALSE,
      
      created_by UUID,
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      CONSTRAINT uq_template_code_version UNIQUE (tenant_id, code, version)
    )
  `);

  // gold_contracts
  await db.execute(sql`
    CREATE TABLE gold_contracts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      contract_number VARCHAR(50) NOT NULL,
      contract_type contract_type_enum NOT NULL DEFAULT 'STANDARD',
      
      order_id UUID REFERENCES gold_orders(id),
      client_id UUID NOT NULL REFERENCES gold_clients(id),
      template_id UUID REFERENCES gold_contract_templates(id),
      
      status contract_status_enum NOT NULL DEFAULT 'DRAFT',
      previous_status contract_status_enum,
      status_changed_at TIMESTAMPTZ DEFAULT NOW(),
      
      title VARCHAR(255) NOT NULL,
      description TEXT,
      
      effective_date DATE,
      expiry_date DATE,
      valid_for_days INTEGER DEFAULT 30,
      
      docx_url TEXT,
      pdf_url TEXT,
      signed_pdf_url TEXT,
      generated_at TIMESTAMPTZ,
      
      clauses_used JSONB NOT NULL DEFAULT '[]',
      template_variables JSONB DEFAULT '{}',
      
      risk_tier risk_tier_enum,
      requires_legal_review BOOLEAN DEFAULT FALSE,
      legal_review_id UUID,
      
      docusign_envelope_id VARCHAR(100),
      docusign_status VARCHAR(50),
      
      correlation_id UUID,
      metadata JSONB DEFAULT '{}',
      
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ,
      signed_at TIMESTAMPTZ,
      
      CONSTRAINT uq_contract_number_tenant UNIQUE (tenant_id, contract_number)
    )
  `);

  // gold_contract_signatures
  await db.execute(sql`
    CREATE TABLE gold_contract_signatures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      contract_id UUID NOT NULL REFERENCES gold_contracts(id),
      
      signer_role VARCHAR(50) NOT NULL,
      signer_name VARCHAR(255) NOT NULL,
      signer_email VARCHAR(255) NOT NULL,
      signer_phone VARCHAR(20),
      signer_company VARCHAR(255),
      
      client_id UUID REFERENCES gold_clients(id),
      user_id UUID,
      
      status signature_status_enum NOT NULL DEFAULT 'PENDING',
      
      docusign_recipient_id VARCHAR(100),
      
      signed_at TIMESTAMPTZ,
      ip_address INET,
      signature_image_url TEXT,
      
      sent_at TIMESTAMPTZ,
      viewed_at TIMESTAMPTZ,
      declined_at TIMESTAMPTZ,
      decline_reason TEXT,
      
      reminder_count INTEGER DEFAULT 0,
      last_reminder_at TIMESTAMPTZ,
      
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Update gold_orders FK
  await db.execute(sql`
    ALTER TABLE gold_orders 
    ADD CONSTRAINT fk_orders_contract 
    FOREIGN KEY (contract_id) REFERENCES gold_contracts(id)
  `);

  // Indexes
  await db.execute(sql`CREATE INDEX idx_templates_tenant ON gold_contract_templates(tenant_id)`);
  await db.execute(sql`CREATE INDEX idx_contracts_tenant ON gold_contracts(tenant_id)`);
  await db.execute(sql`CREATE INDEX idx_contracts_client ON gold_contracts(client_id)`);
  await db.execute(sql`CREATE INDEX idx_contracts_order ON gold_contracts(order_id)`);
  await db.execute(sql`CREATE INDEX idx_contracts_status ON gold_contracts(status)`);
  await db.execute(sql`CREATE INDEX idx_signatures_contract ON gold_contract_signatures(contract_id)`);
}

export async function down(db: DrizzleDb) {
  await db.execute(sql`ALTER TABLE gold_orders DROP CONSTRAINT IF EXISTS fk_orders_contract`);
  await db.execute(sql`DROP TABLE IF EXISTS gold_contract_signatures CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS gold_contracts CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS gold_contract_templates CASCADE`);
}
```

---

## 7. Migration: Audit Tables {#7-audit}

```typescript
// migrations/0045_create_audit_tables.ts
import { sql } from 'drizzle-orm';

export async function up(db: DrizzleDb) {
  // gold_audit_logs_etapa4 (partitioned)
  await db.execute(sql`
    CREATE TABLE gold_audit_logs_etapa4 (
      id UUID DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      prev_hash VARCHAR(64),
      
      event_type VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id UUID NOT NULL,
      
      actor_type actor_type_enum NOT NULL,
      actor_id VARCHAR(255),
      action VARCHAR(100) NOT NULL,
      
      old_values JSONB DEFAULT '{}',
      new_values JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      
      correlation_id UUID,
      source_system VARCHAR(50),
      ip_address INET,
      user_agent TEXT,
      
      success BOOLEAN DEFAULT TRUE,
      error_message TEXT,
      
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      PRIMARY KEY (id, created_at)
    ) PARTITION BY RANGE (created_at)
  `);

  // Create partitions
  await db.execute(sql`
    CREATE TABLE gold_audit_logs_etapa4_2026_01 PARTITION OF gold_audit_logs_etapa4
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01')
  `);
  await db.execute(sql`
    CREATE TABLE gold_audit_logs_etapa4_2026_02 PARTITION OF gold_audit_logs_etapa4
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01')
  `);
  await db.execute(sql`
    CREATE TABLE gold_audit_logs_etapa4_2026_03 PARTITION OF gold_audit_logs_etapa4
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01')
  `);

  // Indexes
  await db.execute(sql`CREATE INDEX idx_audit_tenant ON gold_audit_logs_etapa4(tenant_id)`);
  await db.execute(sql`CREATE INDEX idx_audit_entity ON gold_audit_logs_etapa4(entity_type, entity_id)`);
  await db.execute(sql`CREATE INDEX idx_audit_correlation ON gold_audit_logs_etapa4(correlation_id)`);
  await db.execute(sql`CREATE INDEX idx_audit_created ON gold_audit_logs_etapa4(created_at DESC)`);
}

export async function down(db: DrizzleDb) {
  await db.execute(sql`DROP TABLE IF EXISTS gold_audit_logs_etapa4 CASCADE`);
}
```

---

## 9. Rollback Procedures {#9-rollback}

```typescript
// rollback/etapa4-rollback.ts

export async function rollbackEtapa4(db: DrizzleDb) {
  console.log('Starting Etapa 4 rollback...');
  
  // Rollback in reverse order
  const migrations = [
    '0050_seed_etapa4_data',
    '0049_create_partitions',
    '0048_create_triggers',
    '0047_create_functions',
    '0046_create_indexes',
    '0045_create_audit_tables',
    '0044_create_contract_tables',
    '0043_create_logistics_tables',
    '0042_create_credit_tables',
    '0041_create_orders_tables',
    '0040_create_etapa4_enums'
  ];
  
  for (const migration of migrations) {
    console.log(`Rolling back ${migration}...`);
    const mod = await import(`../migrations/${migration}`);
    await mod.down(db);
  }
  
  console.log('Etapa 4 rollback complete');
}
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
