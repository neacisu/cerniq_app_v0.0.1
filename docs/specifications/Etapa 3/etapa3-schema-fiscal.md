# Schema Bază de Date: Fiscal & Documente (Etapa 3)
## Cerniq.app - Oblio.eu & e-Factura SPV Integration

**Versiune:** 1.0  
**Data:** Ianuarie 2026  
**Autor:** Cerniq Development Team  
**Bază de Date:** PostgreSQL 18.1  
**ORM:** Drizzle v0.40.0  

---

## Cuprins

1. [Viziune Generală](#1-viziune-generală)
2. [Tabele Principale](#2-tabele-principale)
   - [oblio_documents](#21-oblio_documents)
   - [oblio_series](#22-oblio_series)
   - [einvoice_submissions](#23-einvoice_submissions)
   - [fiscal_audit_trail](#24-fiscal_audit_trail)
   - [payment_reconciliation](#25-payment_reconciliation)
3. [Tabele Suport](#3-tabele-suport)
   - [oblio_clients](#31-oblio_clients)
   - [oblio_api_logs](#32-oblio_api_logs)
   - [document_delivery](#33-document_delivery)
4. [Funcții SQL](#4-funcții-sql)
5. [Triggere](#5-triggere)
6. [Indexuri](#6-indexuri)
7. [Drizzle Schema TypeScript](#7-drizzle-schema-typescript)
8. [Diagrame Relații](#8-diagrame-relații)

---

## 1. Viziune Generală

### 1.1 Obiective Schema Fiscal

Schema fiscal gestionează întregul ciclu de viață al documentelor fiscale:

1. **Proforma (Ofertă)** - Document pre-fiscal, nu afectează TVA
2. **Factură Fiscală** - Document obligatoriu, afectează TVA și contabilitate
3. **e-Factura SPV** - Transmitere obligatorie în 5 zile calendaristice
4. **Aviz de Însoțire** - Document pentru transport/livrare
5. **Stornare** - Anulare factură prin document invers

### 1.2 Integrări Externe

| Provider | Endpoint | Funcționalitate | Rate Limit |
|----------|----------|-----------------|------------|
| **Oblio.eu** | `https://www.oblio.eu/api/` | Emitere documente | 60 req/min |
| **ANAF SPV** | via Oblio | e-Factura | N/A |
| **Revolut** | Webhooks | Reconciliere plăți | N/A |

### 1.3 Reguli de Business Critice

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    REGULI FISCALE OBLIGATORII                           │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. e-Factura: Max 5 zile calendaristice de la emitere                   │
│ 2. Proforma NU se poate șterge dacă a fost trimisă clientului           │
│ 3. Factura NU se poate șterge, doar storna                              │
│ 4. TVA: 19% standard, 9% redus, 5% super-redus, 0% scutit              │
│ 5. Serie document: Unică per tip și an fiscal                           │
│ 6. Audit trail: Toate operațiunile sunt logate imutabil                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tabele Principale

### 2.1 oblio_documents

**Scop:** Stochează toate documentele fiscale emise prin Oblio API.

```sql
-- Enum pentru tipuri de documente
CREATE TYPE document_type_enum AS ENUM (
  'PROFORMA',
  'INVOICE',
  'NOTICE',      -- Aviz de însoțire
  'RECEIPT',     -- Chitanță
  'STORNO'       -- Stornare
);

-- Enum pentru status document
CREATE TYPE document_status_enum AS ENUM (
  'DRAFT',           -- Creat local, netrimis la Oblio
  'CREATED',         -- Creat în Oblio
  'SENT_TO_CLIENT',  -- Trimis pe email/WhatsApp
  'CONVERTED',       -- Proforma convertită în factură
  'CANCELLED',       -- Anulat
  'STORNO'           -- Stornat
);

-- Enum pentru status e-Factura
CREATE TYPE einvoice_status_enum AS ENUM (
  'NOT_APPLICABLE',  -- Nu necesită e-Factura (Proforma, Aviz)
  'PENDING',         -- Așteaptă trimitere
  'SENDING',         -- În curs de trimitere
  'SENT',            -- Trimis la SPV
  'PROCESSING',      -- SPV procesează
  'VALIDATED',       -- Validat de ANAF
  'REJECTED',        -- Respins de ANAF
  'ERROR'            -- Eroare tehnică
);

CREATE TABLE oblio_documents (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Document Identification
  document_type document_type_enum NOT NULL,
  series_name VARCHAR(20) NOT NULL,
  number VARCHAR(20) NOT NULL,
  
  -- Relations
  negotiation_id UUID REFERENCES gold_negotiations(id),
  lead_id UUID REFERENCES gold_leads(id),
  original_document_id UUID REFERENCES oblio_documents(id), -- Pentru stornare
  reference_document_id UUID REFERENCES oblio_documents(id), -- Proforma → Invoice
  
  -- Issuer (Compania noastră)
  issuer_cif VARCHAR(15) NOT NULL,
  issuer_name VARCHAR(255) NOT NULL,
  
  -- Client
  client_id UUID REFERENCES oblio_clients(id),
  client_cif VARCHAR(15) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_address TEXT,
  client_email VARCHAR(255),
  
  -- Amounts
  subtotal DECIMAL(15,2) NOT NULL,
  vat_amount DECIMAL(15,2) NOT NULL,
  total DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'RON',
  exchange_rate DECIMAL(10,6) DEFAULT 1.0,
  
  -- Dates
  issue_date DATE NOT NULL,
  due_date DATE,
  delivery_date DATE, -- Data livrării (pentru aviz)
  
  -- Status
  status document_status_enum NOT NULL DEFAULT 'DRAFT',
  einvoice_status einvoice_status_enum NOT NULL DEFAULT 'NOT_APPLICABLE',
  
  -- Oblio Response Data
  oblio_id VARCHAR(50), -- ID intern Oblio
  pdf_link TEXT,
  pdf_stored_path TEXT, -- Path în S3/local storage
  
  -- e-Factura Data
  einvoice_id VARCHAR(50), -- ID din SPV
  einvoice_index VARCHAR(100),
  einvoice_sent_at TIMESTAMPTZ,
  einvoice_validated_at TIMESTAMPTZ,
  einvoice_error_message TEXT,
  einvoice_xml_path TEXT, -- Path la XML-ul transmis
  
  -- Metadata
  products JSONB NOT NULL DEFAULT '[]', -- Array cu produsele
  mentions TEXT, -- Observații pe factură
  internal_note TEXT, -- Note interne (nu apar pe document)
  
  -- Flags
  affects_stock BOOLEAN NOT NULL DEFAULT FALSE,
  stock_deducted BOOLEAN NOT NULL DEFAULT FALSE,
  payment_collected BOOLEAN NOT NULL DEFAULT FALSE,
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_sent BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Oblio Raw Response (pentru debugging)
  oblio_request JSONB,
  oblio_response JSONB,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT unique_document_series_number UNIQUE (tenant_id, document_type, series_name, number),
  CONSTRAINT valid_amounts CHECK (total = subtotal + vat_amount),
  CONSTRAINT storno_requires_original CHECK (
    (document_type = 'STORNO' AND original_document_id IS NOT NULL)
    OR document_type != 'STORNO'
  )
);

COMMENT ON TABLE oblio_documents IS 'Documente fiscale emise prin Oblio API';
COMMENT ON COLUMN oblio_documents.series_name IS 'Seria documentului (ex: FCT, PRO, AVZ)';
COMMENT ON COLUMN oblio_documents.reference_document_id IS 'Referință la proforma pentru conversie în factură';
COMMENT ON COLUMN oblio_documents.einvoice_index IS 'Index-ul e-Factura returnat de SPV';
```


### 2.2 oblio_series

**Scop:** Gestionează seriile de documente per tip și an fiscal.

```sql
CREATE TABLE oblio_series (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Series Configuration
  document_type document_type_enum NOT NULL,
  series_name VARCHAR(20) NOT NULL,
  fiscal_year INTEGER NOT NULL,
  
  -- Numbering
  current_number INTEGER NOT NULL DEFAULT 0,
  prefix VARCHAR(10), -- Opțional prefix (ex: "A" pentru A001)
  padding INTEGER NOT NULL DEFAULT 4, -- Număr de cifre (0001, 00001)
  
  -- Oblio Sync
  oblio_series_name VARCHAR(50), -- Numele seriei în Oblio
  is_synced_with_oblio BOOLEAN NOT NULL DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE, -- Serie implicită pentru tip
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_series_per_type_year UNIQUE (tenant_id, document_type, series_name, fiscal_year),
  CONSTRAINT valid_padding CHECK (padding BETWEEN 1 AND 10),
  CONSTRAINT valid_fiscal_year CHECK (fiscal_year BETWEEN 2020 AND 2100)
);

-- Index pentru lookup rapid
CREATE INDEX idx_oblio_series_lookup ON oblio_series(tenant_id, document_type, is_active, is_default);

-- Funcție pentru generare următorul număr
CREATE OR REPLACE FUNCTION get_next_document_number(
  p_tenant_id UUID,
  p_document_type document_type_enum,
  p_series_name VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  series_name VARCHAR,
  full_number VARCHAR,
  numeric_value INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_series RECORD;
  v_next_num INTEGER;
  v_formatted VARCHAR;
BEGIN
  -- Găsește seria (specifică sau default)
  SELECT * INTO v_series
  FROM oblio_series
  WHERE tenant_id = p_tenant_id
    AND document_type = p_document_type
    AND is_active = TRUE
    AND (p_series_name IS NULL AND is_default = TRUE OR series_name = p_series_name)
    AND fiscal_year = EXTRACT(YEAR FROM CURRENT_DATE)
  LIMIT 1
  FOR UPDATE; -- Lock pentru concurență
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nu există serie activă pentru % / %', p_document_type, COALESCE(p_series_name, 'default');
  END IF;
  
  -- Incrementează numărul
  v_next_num := v_series.current_number + 1;
  
  UPDATE oblio_series
  SET current_number = v_next_num,
      updated_at = NOW()
  WHERE id = v_series.id;
  
  -- Formatează numărul
  v_formatted := COALESCE(v_series.prefix, '') || 
                 LPAD(v_next_num::TEXT, v_series.padding, '0');
  
  RETURN QUERY SELECT
    v_series.series_name,
    v_formatted,
    v_next_num;
END;
$$;

COMMENT ON TABLE oblio_series IS 'Configurare serii documente fiscale per tip și an';
COMMENT ON FUNCTION get_next_document_number IS 'Generează atomic următorul număr de document';
```

### 2.3 einvoice_submissions

**Scop:** Tracking detaliat al trimiterilor e-Factura către ANAF SPV.

```sql
-- Enum pentru acțiuni SPV
CREATE TYPE spv_action_enum AS ENUM (
  'UPLOAD',       -- Upload factură nouă
  'CHECK_STATUS', -- Verificare status
  'DOWNLOAD_XML', -- Download XML validat
  'STORNO'        -- Anulare
);

CREATE TABLE einvoice_submissions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Relations
  document_id UUID NOT NULL REFERENCES oblio_documents(id),
  negotiation_id UUID REFERENCES gold_negotiations(id),
  
  -- Submission Details
  action spv_action_enum NOT NULL,
  submission_attempt INTEGER NOT NULL DEFAULT 1,
  
  -- Timing
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deadline_at TIMESTAMPTZ NOT NULL, -- Deadline 5 zile
  days_remaining INTEGER GENERATED ALWAYS AS (
    EXTRACT(DAY FROM deadline_at - CURRENT_TIMESTAMP)
  ) STORED,
  
  -- SPV Response
  spv_index VARCHAR(100), -- Index-ul returnat de SPV
  spv_upload_id VARCHAR(100), -- ID-ul uploadului
  spv_status VARCHAR(50),
  spv_message TEXT,
  spv_errors JSONB,
  
  -- XML Data
  xml_content TEXT, -- XML-ul trimis (optional, poate fi mare)
  xml_hash VARCHAR(64), -- SHA256 pentru verificare
  response_xml TEXT, -- XML-ul de răspuns
  
  -- Processing
  processed_at TIMESTAMPTZ,
  processing_duration_ms INTEGER,
  
  -- Status Final
  is_successful BOOLEAN,
  final_status einvoice_status_enum,
  error_category VARCHAR(50), -- VALIDATION, NETWORK, SPV_ERROR, etc.
  
  -- Retry Logic
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  triggered_by VARCHAR(50), -- CRON, MANUAL, WORKER, API
  
  -- Constraints
  CONSTRAINT valid_retry CHECK (retry_count <= max_retries)
);

-- Index pentru monitoring deadline-uri
CREATE INDEX idx_einvoice_pending ON einvoice_submissions(tenant_id, deadline_at)
  WHERE is_successful IS NULL OR is_successful = FALSE;

-- Index pentru status checks
CREATE INDEX idx_einvoice_status_check ON einvoice_submissions(spv_index)
  WHERE spv_index IS NOT NULL AND final_status = 'PROCESSING';

COMMENT ON TABLE einvoice_submissions IS 'Log detaliat trimiteri e-Factura SPV';
COMMENT ON COLUMN einvoice_submissions.days_remaining IS 'Zile rămase până la deadline (negativ = depășit)';
```

### 2.4 fiscal_audit_trail

**Scop:** Audit trail imutabil cu hash chain pentru conformitate fiscală.

```sql
-- Enum pentru tipuri de evenimente fiscale
CREATE TYPE fiscal_event_type_enum AS ENUM (
  'DOCUMENT_CREATED',
  'DOCUMENT_SENT',
  'DOCUMENT_CONVERTED',
  'DOCUMENT_CANCELLED',
  'DOCUMENT_STORNO',
  'EINVOICE_SUBMITTED',
  'EINVOICE_VALIDATED',
  'EINVOICE_REJECTED',
  'PAYMENT_RECEIVED',
  'PAYMENT_RECONCILED',
  'STOCK_DEDUCTED',
  'SERIES_NUMBER_GENERATED',
  'PRICE_OVERRIDE',
  'DISCOUNT_APPLIED',
  'MANUAL_CORRECTION'
);

CREATE TABLE fiscal_audit_trail (
  -- Identity (SERIAL pentru ordine strictă)
  id BIGSERIAL PRIMARY KEY,
  uuid UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Event Details
  event_type fiscal_event_type_enum NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Related Entities
  document_id UUID REFERENCES oblio_documents(id),
  negotiation_id UUID REFERENCES gold_negotiations(id),
  einvoice_submission_id UUID REFERENCES einvoice_submissions(id),
  
  -- Actor
  actor_type VARCHAR(20) NOT NULL, -- USER, SYSTEM, WORKER, API
  actor_id UUID,
  actor_name VARCHAR(255),
  actor_ip INET,
  
  -- Event Data
  event_data JSONB NOT NULL,
  
  -- Hash Chain (tamper-evident)
  previous_hash VARCHAR(64), -- SHA256 al înregistrării anterioare
  current_hash VARCHAR(64) NOT NULL, -- SHA256(event_data + previous_hash + timestamp)
  
  -- Verification
  is_verified BOOLEAN, -- NULL = not checked, TRUE = valid chain, FALSE = broken
  verified_at TIMESTAMPTZ,
  
  -- Metadata
  source_system VARCHAR(50) NOT NULL DEFAULT 'CERNIQ',
  correlation_id UUID, -- Pentru tracing cross-system
  
  -- No updates allowed - insert only
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pentru verificare lanț
CREATE INDEX idx_fiscal_audit_chain ON fiscal_audit_trail(tenant_id, id DESC);

-- Index pentru căutare pe document
CREATE INDEX idx_fiscal_audit_document ON fiscal_audit_trail(document_id) 
  WHERE document_id IS NOT NULL;

-- Trigger pentru calculare hash
CREATE OR REPLACE FUNCTION calculate_audit_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_previous_hash VARCHAR(64);
  v_hash_input TEXT;
BEGIN
  -- Găsește hash-ul anterior pentru tenant
  SELECT current_hash INTO v_previous_hash
  FROM fiscal_audit_trail
  WHERE tenant_id = NEW.tenant_id
  ORDER BY id DESC
  LIMIT 1;
  
  NEW.previous_hash := v_previous_hash;
  
  -- Construiește input pentru hash
  v_hash_input := COALESCE(v_previous_hash, 'GENESIS') || 
                  NEW.event_timestamp::TEXT ||
                  NEW.event_type::TEXT ||
                  NEW.event_data::TEXT;
  
  -- Calculează SHA256
  NEW.current_hash := encode(sha256(v_hash_input::bytea), 'hex');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calculate_audit_hash
  BEFORE INSERT ON fiscal_audit_trail
  FOR EACH ROW
  EXECUTE FUNCTION calculate_audit_hash();

-- Funcție pentru verificare integritate lanț
CREATE OR REPLACE FUNCTION verify_audit_chain(
  p_tenant_id UUID,
  p_from_id BIGINT DEFAULT NULL,
  p_to_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
  total_records INTEGER,
  valid_records INTEGER,
  broken_at_id BIGINT,
  is_chain_valid BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_record RECORD;
  v_previous_hash VARCHAR(64) := 'GENESIS';
  v_expected_hash VARCHAR(64);
  v_total INTEGER := 0;
  v_valid INTEGER := 0;
  v_broken_id BIGINT := NULL;
  v_hash_input TEXT;
BEGIN
  FOR v_record IN
    SELECT * FROM fiscal_audit_trail
    WHERE tenant_id = p_tenant_id
      AND (p_from_id IS NULL OR id >= p_from_id)
      AND (p_to_id IS NULL OR id <= p_to_id)
    ORDER BY id ASC
  LOOP
    v_total := v_total + 1;
    
    -- Recalculează hash-ul așteptat
    v_hash_input := COALESCE(v_previous_hash, 'GENESIS') || 
                    v_record.event_timestamp::TEXT ||
                    v_record.event_type::TEXT ||
                    v_record.event_data::TEXT;
    v_expected_hash := encode(sha256(v_hash_input::bytea), 'hex');
    
    -- Verifică
    IF v_record.current_hash = v_expected_hash AND 
       (v_record.previous_hash = v_previous_hash OR 
        (v_record.previous_hash IS NULL AND v_previous_hash = 'GENESIS')) THEN
      v_valid := v_valid + 1;
    ELSIF v_broken_id IS NULL THEN
      v_broken_id := v_record.id;
    END IF;
    
    v_previous_hash := v_record.current_hash;
  END LOOP;
  
  RETURN QUERY SELECT
    v_total,
    v_valid,
    v_broken_id,
    (v_total = v_valid);
END;
$$;

COMMENT ON TABLE fiscal_audit_trail IS 'Audit trail imutabil cu hash chain pentru conformitate fiscală';
COMMENT ON FUNCTION verify_audit_chain IS 'Verifică integritatea lanțului de hash-uri pentru un tenant';
```

### 2.5 payment_reconciliation

**Scop:** Reconciliere automată plăți bancare cu facturi.

```sql
-- Enum pentru sursa plății
CREATE TYPE payment_source_enum AS ENUM (
  'BANK_TRANSFER',
  'REVOLUT',
  'CARD',
  'CASH',
  'MANUAL'
);

-- Enum pentru status reconciliere
CREATE TYPE reconciliation_status_enum AS ENUM (
  'PENDING',      -- Plată primită, nereconciliată
  'MATCHED',      -- Asociată automat cu factură
  'PARTIAL',      -- Plată parțială
  'MANUAL',       -- Reconciliere manuală necesară
  'RECONCILED',   -- Finalizată
  'DISPUTED'      -- În dispută
);

CREATE TABLE payment_reconciliation (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Payment Details
  payment_source payment_source_enum NOT NULL,
  external_payment_id VARCHAR(100), -- ID din sistemul bancar/Revolut
  transaction_reference VARCHAR(100), -- Referința tranzacției
  
  -- Amounts
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'RON',
  exchange_rate DECIMAL(10,6) DEFAULT 1.0,
  amount_ron DECIMAL(15,2) GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  
  -- Payer Info
  payer_name VARCHAR(255),
  payer_account VARCHAR(50), -- IBAN
  payer_cif VARCHAR(15),
  
  -- Matching
  status reconciliation_status_enum NOT NULL DEFAULT 'PENDING',
  document_id UUID REFERENCES oblio_documents(id),
  negotiation_id UUID REFERENCES gold_negotiations(id),
  
  -- Auto-matching confidence
  match_confidence DECIMAL(3,2), -- 0.00 - 1.00
  match_method VARCHAR(50), -- CIF_EXACT, AMOUNT_EXACT, REFERENCE_PARTIAL, etc.
  match_details JSONB,
  
  -- Partial Payment Support
  is_partial BOOLEAN NOT NULL DEFAULT FALSE,
  partial_sequence INTEGER, -- 1, 2, 3... pentru plăți în tranșe
  total_paid_for_document DECIMAL(15,2), -- Suma totală plătită până acum
  remaining_amount DECIMAL(15,2), -- Ce mai e de plătit
  
  -- Dates
  payment_date DATE NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  reconciled_at TIMESTAMPTZ,
  
  -- Manual Reconciliation
  reconciled_by UUID REFERENCES users(id),
  reconciliation_note TEXT,
  
  -- Bank Statement Data
  bank_statement_text TEXT, -- Textul din extras de cont
  bank_raw_data JSONB, -- Date raw de la bancă/Revolut
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_amount CHECK (amount > 0),
  CONSTRAINT valid_confidence CHECK (match_confidence IS NULL OR match_confidence BETWEEN 0 AND 1)
);

-- Index pentru matching automat pe CIF
CREATE INDEX idx_payment_match_cif ON payment_reconciliation(tenant_id, payer_cif, status)
  WHERE status = 'PENDING';

-- Index pentru referință tranzacție
CREATE INDEX idx_payment_reference ON payment_reconciliation(tenant_id, transaction_reference);

-- Funcție pentru auto-matching
CREATE OR REPLACE FUNCTION auto_match_payment(p_payment_id UUID)
RETURNS TABLE (
  matched BOOLEAN,
  document_id UUID,
  confidence DECIMAL,
  match_method VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment RECORD;
  v_match RECORD;
BEGIN
  SELECT * INTO v_payment FROM payment_reconciliation WHERE id = p_payment_id;
  
  IF v_payment.status != 'PENDING' THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 0.0::DECIMAL, 'ALREADY_PROCESSED'::VARCHAR;
    RETURN;
  END IF;
  
  -- Strategie 1: CIF exact + Amount exact
  SELECT d.id, 1.0::DECIMAL as conf, 'CIF_AMOUNT_EXACT'::VARCHAR as method
  INTO v_match
  FROM oblio_documents d
  WHERE d.tenant_id = v_payment.tenant_id
    AND d.client_cif = v_payment.payer_cif
    AND d.total = v_payment.amount_ron
    AND d.document_type = 'INVOICE'
    AND d.payment_collected = FALSE
    AND d.status NOT IN ('CANCELLED', 'STORNO')
  ORDER BY d.issue_date DESC
  LIMIT 1;
  
  IF FOUND THEN
    UPDATE payment_reconciliation
    SET status = 'MATCHED',
        document_id = v_match.id,
        match_confidence = v_match.conf,
        match_method = v_match.method,
        reconciled_at = NOW()
    WHERE id = p_payment_id;
    
    UPDATE oblio_documents
    SET payment_collected = TRUE,
        updated_at = NOW()
    WHERE id = v_match.id;
    
    RETURN QUERY SELECT TRUE, v_match.id, v_match.conf, v_match.method;
    RETURN;
  END IF;
  
  -- Strategie 2: CIF exact + Amount diferit (plată parțială sau suprapayment)
  SELECT d.id, 0.8::DECIMAL as conf, 'CIF_EXACT_AMOUNT_DIFF'::VARCHAR as method
  INTO v_match
  FROM oblio_documents d
  WHERE d.tenant_id = v_payment.tenant_id
    AND d.client_cif = v_payment.payer_cif
    AND d.document_type = 'INVOICE'
    AND d.payment_collected = FALSE
    AND d.status NOT IN ('CANCELLED', 'STORNO')
  ORDER BY ABS(d.total - v_payment.amount_ron), d.issue_date DESC
  LIMIT 1;
  
  IF FOUND THEN
    UPDATE payment_reconciliation
    SET status = 'MANUAL', -- Necesită verificare
        document_id = v_match.id,
        match_confidence = v_match.conf,
        match_method = v_match.method,
        match_details = jsonb_build_object(
          'expected_amount', (SELECT total FROM oblio_documents WHERE id = v_match.id),
          'received_amount', v_payment.amount_ron,
          'difference', v_payment.amount_ron - (SELECT total FROM oblio_documents WHERE id = v_match.id)
        )
    WHERE id = p_payment_id;
    
    RETURN QUERY SELECT TRUE, v_match.id, v_match.conf, v_match.method;
    RETURN;
  END IF;
  
  -- Nu s-a găsit match
  RETURN QUERY SELECT FALSE, NULL::UUID, 0.0::DECIMAL, 'NO_MATCH'::VARCHAR;
END;
$$;

COMMENT ON TABLE payment_reconciliation IS 'Reconciliere plăți bancare cu facturi';
COMMENT ON FUNCTION auto_match_payment IS 'Încearcă matching automat bazat pe CIF și sumă';
```

---

## 3. Tabele Suport

### 3.1 oblio_clients

**Scop:** Cache local pentru clienți Oblio (reduce API calls).

```sql
CREATE TABLE oblio_clients (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Oblio Identification
  oblio_cif VARCHAR(15) NOT NULL, -- CIF-ul în Oblio
  
  -- Client Data
  name VARCHAR(255) NOT NULL,
  cif VARCHAR(15) NOT NULL,
  registration_number VARCHAR(20), -- J40/123/2020
  address TEXT,
  city VARCHAR(100),
  county VARCHAR(50),
  country VARCHAR(2) NOT NULL DEFAULT 'RO',
  email VARCHAR(255),
  phone VARCHAR(20),
  bank_account VARCHAR(30), -- IBAN
  bank_name VARCHAR(100),
  
  -- Contact Person
  contact_name VARCHAR(255),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  
  -- Business Settings
  default_vat_percent DECIMAL(4,2) NOT NULL DEFAULT 19.00,
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  credit_limit DECIMAL(15,2),
  
  -- Oblio Sync
  is_synced_with_oblio BOOLEAN NOT NULL DEFAULT FALSE,
  oblio_client_id VARCHAR(50), -- ID-ul clientului în Oblio
  last_synced_at TIMESTAMPTZ,
  
  -- Stats
  total_invoiced DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_paid DECIMAL(15,2) NOT NULL DEFAULT 0,
  outstanding_balance DECIMAL(15,2) GENERATED ALWAYS AS (total_invoiced - total_paid) STORED,
  last_invoice_date DATE,
  last_payment_date DATE,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_client_cif UNIQUE (tenant_id, cif),
  CONSTRAINT valid_vat CHECK (default_vat_percent IN (0, 5, 9, 19))
);

-- Index pentru căutare
CREATE INDEX idx_oblio_clients_search ON oblio_clients 
  USING GIN (name gin_trgm_ops);

CREATE INDEX idx_oblio_clients_cif ON oblio_clients(tenant_id, cif);

COMMENT ON TABLE oblio_clients IS 'Cache local pentru clienți Oblio';
```

### 3.2 oblio_api_logs

**Scop:** Log complet al tuturor apelurilor Oblio API.

```sql
CREATE TABLE oblio_api_logs (
  -- Identity (partitioned by month)
  id BIGSERIAL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Request
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  request_body JSONB,
  request_headers JSONB,
  
  -- Response
  response_status INTEGER,
  response_body JSONB,
  response_headers JSONB,
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER GENERATED ALWAYS AS (
    EXTRACT(MILLISECONDS FROM completed_at - started_at)
  ) STORED,
  
  -- Context
  document_id UUID REFERENCES oblio_documents(id),
  correlation_id UUID,
  triggered_by VARCHAR(50),
  
  -- Error Handling
  is_error BOOLEAN NOT NULL DEFAULT FALSE,
  error_code VARCHAR(50),
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Creare partiții lunare
CREATE TABLE oblio_api_logs_2026_01 PARTITION OF oblio_api_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE oblio_api_logs_2026_02 PARTITION OF oblio_api_logs
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE oblio_api_logs_2026_03 PARTITION OF oblio_api_logs
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
-- ... continuă pentru fiecare lună

-- Index pentru monitoring
CREATE INDEX idx_oblio_api_logs_errors ON oblio_api_logs(tenant_id, is_error, created_at)
  WHERE is_error = TRUE;

COMMENT ON TABLE oblio_api_logs IS 'Log complet apeluri Oblio API (partitioned)';
```

### 3.3 document_delivery

**Scop:** Tracking trimitere documente pe diverse canale.

```sql
-- Enum pentru canal de livrare
CREATE TYPE delivery_channel_enum AS ENUM (
  'EMAIL',
  'WHATSAPP',
  'SMS',
  'DOWNLOAD', -- Client a descărcat din portal
  'PRINT'     -- Printare fizică
);

-- Enum pentru status livrare
CREATE TYPE delivery_status_enum AS ENUM (
  'PENDING',
  'SENDING',
  'SENT',
  'DELIVERED',
  'READ',
  'BOUNCED',
  'FAILED'
);

CREATE TABLE document_delivery (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Relations
  document_id UUID NOT NULL REFERENCES oblio_documents(id),
  
  -- Delivery Details
  channel delivery_channel_enum NOT NULL,
  recipient_address VARCHAR(255) NOT NULL, -- Email/Phone
  recipient_name VARCHAR(255),
  
  -- Status
  status delivery_status_enum NOT NULL DEFAULT 'PENDING',
  
  -- Provider Response
  provider_name VARCHAR(50), -- RESEND, TIMELINES_AI, etc.
  provider_message_id VARCHAR(100),
  provider_status VARCHAR(50),
  provider_response JSONB,
  
  -- Timing
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Error Handling
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  
  -- Metadata
  subject VARCHAR(255), -- Pentru email
  body_preview TEXT, -- Primele 200 caractere
  attachment_count INTEGER NOT NULL DEFAULT 1,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Index pentru tracking status
CREATE INDEX idx_delivery_status ON document_delivery(tenant_id, document_id, channel, status);

-- Index pentru retry queue
CREATE INDEX idx_delivery_retry ON document_delivery(next_retry_at)
  WHERE status IN ('PENDING', 'FAILED') AND retry_count < max_retries;

COMMENT ON TABLE document_delivery IS 'Tracking trimitere documente pe canale multiple';
```

---

## 4. Funcții SQL

### 4.1 Funcții de Creare Documente

```sql
-- Creare proforma din negociere
CREATE OR REPLACE FUNCTION create_proforma_from_negotiation(
  p_negotiation_id UUID,
  p_series_name VARCHAR DEFAULT NULL,
  p_mentions TEXT DEFAULT NULL
)
RETURNS UUID -- Document ID
LANGUAGE plpgsql
AS $$
DECLARE
  v_neg RECORD;
  v_series RECORD;
  v_doc_number VARCHAR;
  v_doc_id UUID;
  v_products JSONB;
BEGIN
  -- Fetch negocierea
  SELECT * INTO v_neg
  FROM gold_negotiations
  WHERE id = p_negotiation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Negocierea % nu există', p_negotiation_id;
  END IF;
  
  -- Verifică stare
  IF v_neg.current_state NOT IN ('CLOSING', 'NEGOTIATION') THEN
    RAISE EXCEPTION 'Proforma se poate crea doar din starea CLOSING sau NEGOTIATION, actual: %', v_neg.current_state;
  END IF;
  
  -- Generează număr document
  SELECT * INTO v_series
  FROM get_next_document_number(v_neg.tenant_id, 'PROFORMA', p_series_name);
  
  -- Construiește produsele din negotiation_items
  SELECT jsonb_agg(
    jsonb_build_object(
      'product_id', ni.product_id,
      'sku', p.sku,
      'name', p.name,
      'quantity', ni.quantity,
      'unit_price', ni.unit_price,
      'discount_percent', ni.discount_percent,
      'line_total', ni.line_total,
      'vat_percent', ni.vat_percent,
      'line_vat', ni.line_vat
    )
  ) INTO v_products
  FROM negotiation_items ni
  JOIN gold_products p ON ni.product_id = p.id
  WHERE ni.negotiation_id = p_negotiation_id
    AND ni.status = 'ACTIVE';
  
  -- Creează documentul
  INSERT INTO oblio_documents (
    tenant_id,
    document_type,
    series_name,
    number,
    negotiation_id,
    lead_id,
    issuer_cif, issuer_name, -- Din settings tenant
    client_cif, client_name, client_address, client_email,
    subtotal, vat_amount, total,
    issue_date, due_date,
    status, einvoice_status,
    products, mentions
  )
  SELECT
    v_neg.tenant_id,
    'PROFORMA',
    v_series.series_name,
    v_series.full_number,
    v_neg.id,
    v_neg.lead_id,
    t.cif, t.name,
    v_neg.client_cif, v_neg.client_name, v_neg.client_address, v_neg.client_email,
    v_neg.total_value / 1.19, -- Subtotal (fără TVA)
    v_neg.total_value - (v_neg.total_value / 1.19), -- VAT
    v_neg.total_value,
    CURRENT_DATE,
    CURRENT_DATE + 7, -- Due în 7 zile
    'CREATED',
    'NOT_APPLICABLE', -- Proforma nu necesită e-Factura
    v_products,
    p_mentions
  FROM tenants t
  WHERE t.id = v_neg.tenant_id
  RETURNING id INTO v_doc_id;
  
  -- Update negocierea
  UPDATE gold_negotiations
  SET proforma_ref = v_series.series_name || v_series.full_number,
      current_state = 'PROFORMA_SENT',
      updated_at = NOW()
  WHERE id = p_negotiation_id;
  
  -- Log audit
  INSERT INTO fiscal_audit_trail (
    tenant_id, event_type, document_id, negotiation_id,
    actor_type, event_data
  ) VALUES (
    v_neg.tenant_id, 'DOCUMENT_CREATED', v_doc_id, p_negotiation_id,
    'SYSTEM',
    jsonb_build_object(
      'document_type', 'PROFORMA',
      'series', v_series.series_name,
      'number', v_series.full_number,
      'total', v_neg.total_value
    )
  );
  
  RETURN v_doc_id;
END;
$$;

-- Conversie proforma în factură
CREATE OR REPLACE FUNCTION convert_proforma_to_invoice(
  p_proforma_id UUID,
  p_series_name VARCHAR DEFAULT NULL
)
RETURNS UUID -- Invoice ID
LANGUAGE plpgsql
AS $$
DECLARE
  v_proforma RECORD;
  v_series RECORD;
  v_invoice_id UUID;
BEGIN
  SELECT * INTO v_proforma
  FROM oblio_documents
  WHERE id = p_proforma_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proforma % nu există', p_proforma_id;
  END IF;
  
  IF v_proforma.document_type != 'PROFORMA' THEN
    RAISE EXCEPTION 'Documentul nu este proforma, ci %', v_proforma.document_type;
  END IF;
  
  IF v_proforma.status = 'CONVERTED' THEN
    RAISE EXCEPTION 'Proforma a fost deja convertită';
  END IF;
  
  -- Generează număr factură
  SELECT * INTO v_series
  FROM get_next_document_number(v_proforma.tenant_id, 'INVOICE', p_series_name);
  
  -- Creează factura
  INSERT INTO oblio_documents (
    tenant_id,
    document_type,
    series_name,
    number,
    negotiation_id,
    lead_id,
    reference_document_id, -- Link la proforma
    issuer_cif, issuer_name,
    client_id, client_cif, client_name, client_address, client_email,
    subtotal, vat_amount, total, currency,
    issue_date, due_date,
    status, einvoice_status,
    products, mentions,
    affects_stock
  )
  SELECT
    v_proforma.tenant_id,
    'INVOICE',
    v_series.series_name,
    v_series.full_number,
    v_proforma.negotiation_id,
    v_proforma.lead_id,
    v_proforma.id,
    v_proforma.issuer_cif, v_proforma.issuer_name,
    v_proforma.client_id, v_proforma.client_cif, v_proforma.client_name,
    v_proforma.client_address, v_proforma.client_email,
    v_proforma.subtotal, v_proforma.vat_amount, v_proforma.total, v_proforma.currency,
    CURRENT_DATE,
    CURRENT_DATE + 30, -- 30 zile termen plată
    'CREATED',
    'PENDING', -- Factura necesită e-Factura
    v_proforma.products,
    v_proforma.mentions,
    TRUE -- Afectează stocul
  RETURNING id INTO v_invoice_id;
  
  -- Update proforma
  UPDATE oblio_documents
  SET status = 'CONVERTED',
      updated_at = NOW()
  WHERE id = p_proforma_id;
  
  -- Update negocierea
  UPDATE gold_negotiations
  SET invoice_ref = v_series.series_name || v_series.full_number,
      current_state = 'INVOICED',
      updated_at = NOW()
  WHERE id = v_proforma.negotiation_id;
  
  -- Creează înregistrare e-Factura submission
  INSERT INTO einvoice_submissions (
    tenant_id,
    document_id,
    negotiation_id,
    action,
    deadline_at,
    triggered_by
  ) VALUES (
    v_proforma.tenant_id,
    v_invoice_id,
    v_proforma.negotiation_id,
    'UPLOAD',
    CURRENT_DATE + 5, -- Deadline 5 zile
    'SYSTEM'
  );
  
  -- Log audit
  INSERT INTO fiscal_audit_trail (
    tenant_id, event_type, document_id, negotiation_id,
    actor_type, event_data
  ) VALUES (
    v_proforma.tenant_id, 'DOCUMENT_CONVERTED', v_invoice_id, v_proforma.negotiation_id,
    'SYSTEM',
    jsonb_build_object(
      'from_proforma', v_proforma.id,
      'invoice_series', v_series.series_name,
      'invoice_number', v_series.full_number,
      'total', v_proforma.total
    )
  );
  
  RETURN v_invoice_id;
END;
$$;

COMMENT ON FUNCTION create_proforma_from_negotiation IS 'Creează proforma din negocierea specificată';
COMMENT ON FUNCTION convert_proforma_to_invoice IS 'Convertește proforma în factură fiscală';
```

### 4.2 Funcții e-Factura

```sql
-- Obține facturi ce necesită trimitere urgentă e-Factura
CREATE OR REPLACE FUNCTION get_einvoice_urgent_queue(
  p_tenant_id UUID,
  p_max_days INTEGER DEFAULT 4 -- Safety net: ziua 4
)
RETURNS TABLE (
  document_id UUID,
  series_number VARCHAR,
  client_name VARCHAR,
  total DECIMAL,
  issue_date DATE,
  days_since_issue INTEGER,
  days_remaining INTEGER,
  urgency VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.series_name || d.number,
    d.client_name,
    d.total,
    d.issue_date,
    (CURRENT_DATE - d.issue_date)::INTEGER,
    (5 - (CURRENT_DATE - d.issue_date))::INTEGER,
    CASE
      WHEN CURRENT_DATE - d.issue_date >= 5 THEN 'CRITICAL_OVERDUE'
      WHEN CURRENT_DATE - d.issue_date = 4 THEN 'CRITICAL'
      WHEN CURRENT_DATE - d.issue_date = 3 THEN 'WARNING'
      ELSE 'NORMAL'
    END
  FROM oblio_documents d
  WHERE d.tenant_id = p_tenant_id
    AND d.document_type = 'INVOICE'
    AND d.einvoice_status IN ('PENDING', 'ERROR', 'REJECTED')
    AND d.status NOT IN ('CANCELLED', 'STORNO')
    AND CURRENT_DATE - d.issue_date >= 0
  ORDER BY d.issue_date ASC; -- Cele mai vechi primele
END;
$$;

-- Verifică status e-Factura
CREATE OR REPLACE FUNCTION check_einvoice_compliance(p_tenant_id UUID)
RETURNS TABLE (
  total_invoices INTEGER,
  pending_einvoice INTEGER,
  overdue_einvoice INTEGER,
  compliance_rate DECIMAL,
  oldest_pending_days INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE einvoice_status IN ('PENDING', 'SENDING', 'PROCESSING'))::INTEGER,
    COUNT(*) FILTER (WHERE einvoice_status IN ('PENDING', 'ERROR') AND CURRENT_DATE - issue_date > 5)::INTEGER,
    ROUND(
      COUNT(*) FILTER (WHERE einvoice_status = 'VALIDATED')::DECIMAL / 
      NULLIF(COUNT(*)::DECIMAL, 0) * 100,
      2
    ),
    MAX(CURRENT_DATE - issue_date) FILTER (WHERE einvoice_status IN ('PENDING', 'ERROR'))::INTEGER
  FROM oblio_documents
  WHERE tenant_id = p_tenant_id
    AND document_type = 'INVOICE'
    AND status NOT IN ('CANCELLED', 'STORNO')
    AND issue_date >= CURRENT_DATE - INTERVAL '90 days'; -- Ultimele 90 zile
END;
$$;

COMMENT ON FUNCTION get_einvoice_urgent_queue IS 'Returnează facturile ce necesită trimitere urgentă e-Factura';
COMMENT ON FUNCTION check_einvoice_compliance IS 'Verifică rata de conformitate e-Factura pentru tenant';
```

### 4.3 Funcții Reporting

```sql
-- Sumar facturare per perioadă
CREATE OR REPLACE FUNCTION get_invoicing_summary(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  period_start DATE,
  period_end DATE,
  total_proformas INTEGER,
  total_proformas_value DECIMAL,
  total_invoices INTEGER,
  total_invoices_value DECIMAL,
  total_vat DECIMAL,
  total_paid DECIMAL,
  total_outstanding DECIMAL,
  conversion_rate DECIMAL,
  avg_invoice_value DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH proforma_stats AS (
    SELECT
      COUNT(*) as cnt,
      COALESCE(SUM(total), 0) as val
    FROM oblio_documents
    WHERE tenant_id = p_tenant_id
      AND document_type = 'PROFORMA'
      AND issue_date BETWEEN p_start_date AND p_end_date
  ),
  invoice_stats AS (
    SELECT
      COUNT(*) as cnt,
      COALESCE(SUM(total), 0) as val,
      COALESCE(SUM(vat_amount), 0) as vat,
      COALESCE(SUM(CASE WHEN payment_collected THEN total ELSE 0 END), 0) as paid
    FROM oblio_documents
    WHERE tenant_id = p_tenant_id
      AND document_type = 'INVOICE'
      AND issue_date BETWEEN p_start_date AND p_end_date
      AND status NOT IN ('CANCELLED', 'STORNO')
  ),
  converted AS (
    SELECT COUNT(*) as cnt
    FROM oblio_documents
    WHERE tenant_id = p_tenant_id
      AND document_type = 'PROFORMA'
      AND status = 'CONVERTED'
      AND issue_date BETWEEN p_start_date AND p_end_date
  )
  SELECT
    p_start_date,
    p_end_date,
    p.cnt::INTEGER,
    p.val,
    i.cnt::INTEGER,
    i.val,
    i.vat,
    i.paid,
    i.val - i.paid,
    ROUND(c.cnt::DECIMAL / NULLIF(p.cnt::DECIMAL, 0) * 100, 2),
    ROUND(i.val / NULLIF(i.cnt::DECIMAL, 0), 2)
  FROM proforma_stats p, invoice_stats i, converted c;
END;
$$;

COMMENT ON FUNCTION get_invoicing_summary IS 'Sumar facturare pentru perioada specificată';
```

---

## 5. Triggere

```sql
-- Trigger: Update timestamp pe modificare
CREATE OR REPLACE FUNCTION update_fiscal_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_oblio_documents_timestamp
  BEFORE UPDATE ON oblio_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_fiscal_timestamp();

CREATE TRIGGER trg_oblio_clients_timestamp
  BEFORE UPDATE ON oblio_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_fiscal_timestamp();

CREATE TRIGGER trg_payment_reconciliation_timestamp
  BEFORE UPDATE ON payment_reconciliation
  FOR EACH ROW
  EXECUTE FUNCTION update_fiscal_timestamp();

-- Trigger: Validare document fiscal
CREATE OR REPLACE FUNCTION validate_fiscal_document()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Factura nu poate fi ștearsă
  IF TG_OP = 'DELETE' AND OLD.document_type = 'INVOICE' THEN
    RAISE EXCEPTION 'Factura nu poate fi ștearsă, doar stornată';
  END IF;
  
  -- Status CREATED sau SENT nu poate reveni la DRAFT
  IF TG_OP = 'UPDATE' AND OLD.status IN ('CREATED', 'SENT_TO_CLIENT') AND NEW.status = 'DRAFT' THEN
    RAISE EXCEPTION 'Document emis nu poate reveni la DRAFT';
  END IF;
  
  -- Proforma trimisă nu poate fi ștearsă
  IF TG_OP = 'DELETE' AND OLD.document_type = 'PROFORMA' AND OLD.status = 'SENT_TO_CLIENT' THEN
    RAISE EXCEPTION 'Proforma trimisă nu poate fi ștearsă';
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_fiscal_document
  BEFORE UPDATE OR DELETE ON oblio_documents
  FOR EACH ROW
  EXECUTE FUNCTION validate_fiscal_document();

-- Trigger: Auto-creare e-Factura submission pentru facturi noi
CREATE OR REPLACE FUNCTION auto_queue_einvoice()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.document_type = 'INVOICE' AND NEW.status = 'CREATED' 
     AND NEW.einvoice_status = 'PENDING' THEN
    INSERT INTO einvoice_submissions (
      tenant_id, document_id, negotiation_id,
      action, deadline_at, triggered_by
    ) VALUES (
      NEW.tenant_id, NEW.id, NEW.negotiation_id,
      'UPLOAD', NEW.issue_date + 5, 'TRIGGER'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_queue_einvoice
  AFTER INSERT OR UPDATE ON oblio_documents
  FOR EACH ROW
  EXECUTE FUNCTION auto_queue_einvoice();

-- Trigger: Update statistici client
CREATE OR REPLACE FUNCTION update_client_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.document_type = 'INVOICE' AND NEW.client_id IS NOT NULL THEN
    UPDATE oblio_clients
    SET 
      total_invoiced = total_invoiced + NEW.total,
      last_invoice_date = NEW.issue_date,
      updated_at = NOW()
    WHERE id = NEW.client_id;
    
    IF NEW.payment_collected = TRUE AND OLD.payment_collected = FALSE THEN
      UPDATE oblio_clients
      SET 
        total_paid = total_paid + NEW.total,
        last_payment_date = CURRENT_DATE,
        updated_at = NOW()
      WHERE id = NEW.client_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_client_stats
  AFTER INSERT OR UPDATE ON oblio_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_client_stats();
```

---

## 6. Indexuri

```sql
-- =====================
-- Indexuri oblio_documents
-- =====================

-- Lookup rapid pe serie și număr
CREATE INDEX idx_doc_series_number ON oblio_documents(tenant_id, series_name, number);

-- Căutare pe tip document și status
CREATE INDEX idx_doc_type_status ON oblio_documents(tenant_id, document_type, status);

-- Căutare pe client
CREATE INDEX idx_doc_client ON oblio_documents(tenant_id, client_cif);

-- Căutare pe dată emitere
CREATE INDEX idx_doc_issue_date ON oblio_documents(tenant_id, issue_date DESC);

-- Facturi neîncasate
CREATE INDEX idx_doc_unpaid ON oblio_documents(tenant_id, due_date)
  WHERE document_type = 'INVOICE' AND payment_collected = FALSE AND status NOT IN ('CANCELLED', 'STORNO');

-- e-Factura pending
CREATE INDEX idx_doc_einvoice_pending ON oblio_documents(tenant_id, issue_date)
  WHERE document_type = 'INVOICE' AND einvoice_status IN ('PENDING', 'ERROR');

-- Full-text search pe client
CREATE INDEX idx_doc_client_search ON oblio_documents 
  USING GIN (client_name gin_trgm_ops);

-- =====================
-- Indexuri einvoice_submissions
-- =====================

-- Status processing
CREATE INDEX idx_einvoice_processing ON einvoice_submissions(tenant_id, deadline_at)
  WHERE is_successful IS NULL OR is_successful = FALSE;

-- SPV index lookup
CREATE INDEX idx_einvoice_spv_index ON einvoice_submissions(spv_index)
  WHERE spv_index IS NOT NULL;

-- =====================
-- Indexuri payment_reconciliation
-- =====================

-- Matching automat
CREATE INDEX idx_payment_pending ON payment_reconciliation(tenant_id, payer_cif, amount_ron)
  WHERE status = 'PENDING';

-- Referință tranzacție
CREATE INDEX idx_payment_ref ON payment_reconciliation(transaction_reference);

-- =====================
-- Indexuri fiscal_audit_trail
-- =====================

-- Timeline evenimente document
CREATE INDEX idx_audit_document_timeline ON fiscal_audit_trail(document_id, id DESC)
  WHERE document_id IS NOT NULL;

-- Evenimente per tip
CREATE INDEX idx_audit_event_type ON fiscal_audit_trail(tenant_id, event_type, event_timestamp DESC);
```

---

## 7. Drizzle Schema TypeScript

```typescript
// schema/fiscal.ts
import { 
  pgTable, pgEnum, uuid, varchar, text, decimal, integer, boolean, 
  date, timestamp, jsonb, bigserial, inet,
  uniqueIndex, index, check
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants, users } from './core';
import { goldNegotiations, goldLeads } from './negotiations';

// =====================
// Enums
// =====================

export const documentTypeEnum = pgEnum('document_type_enum', [
  'PROFORMA',
  'INVOICE', 
  'NOTICE',
  'RECEIPT',
  'STORNO'
]);

export const documentStatusEnum = pgEnum('document_status_enum', [
  'DRAFT',
  'CREATED',
  'SENT_TO_CLIENT',
  'CONVERTED',
  'CANCELLED',
  'STORNO'
]);

export const einvoiceStatusEnum = pgEnum('einvoice_status_enum', [
  'NOT_APPLICABLE',
  'PENDING',
  'SENDING',
  'SENT',
  'PROCESSING',
  'VALIDATED',
  'REJECTED',
  'ERROR'
]);

export const spvActionEnum = pgEnum('spv_action_enum', [
  'UPLOAD',
  'CHECK_STATUS',
  'DOWNLOAD_XML',
  'STORNO'
]);

export const paymentSourceEnum = pgEnum('payment_source_enum', [
  'BANK_TRANSFER',
  'REVOLUT',
  'CARD',
  'CASH',
  'MANUAL'
]);

export const reconciliationStatusEnum = pgEnum('reconciliation_status_enum', [
  'PENDING',
  'MATCHED',
  'PARTIAL',
  'MANUAL',
  'RECONCILED',
  'DISPUTED'
]);

export const deliveryChannelEnum = pgEnum('delivery_channel_enum', [
  'EMAIL',
  'WHATSAPP',
  'SMS',
  'DOWNLOAD',
  'PRINT'
]);

export const deliveryStatusEnum = pgEnum('delivery_status_enum', [
  'PENDING',
  'SENDING',
  'SENT',
  'DELIVERED',
  'READ',
  'BOUNCED',
  'FAILED'
]);

export const fiscalEventTypeEnum = pgEnum('fiscal_event_type_enum', [
  'DOCUMENT_CREATED',
  'DOCUMENT_SENT',
  'DOCUMENT_CONVERTED',
  'DOCUMENT_CANCELLED',
  'DOCUMENT_STORNO',
  'EINVOICE_SUBMITTED',
  'EINVOICE_VALIDATED',
  'EINVOICE_REJECTED',
  'PAYMENT_RECEIVED',
  'PAYMENT_RECONCILED',
  'STOCK_DEDUCTED',
  'SERIES_NUMBER_GENERATED',
  'PRICE_OVERRIDE',
  'DISCOUNT_APPLIED',
  'MANUAL_CORRECTION'
]);

// =====================
// Tables
// =====================

export const oblioClients = pgTable('oblio_clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  oblioCif: varchar('oblio_cif', { length: 15 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  cif: varchar('cif', { length: 15 }).notNull(),
  registrationNumber: varchar('registration_number', { length: 20 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  county: varchar('county', { length: 50 }),
  country: varchar('country', { length: 2 }).default('RO').notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  bankAccount: varchar('bank_account', { length: 30 }),
  bankName: varchar('bank_name', { length: 100 }),
  
  contactName: varchar('contact_name', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 20 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  
  defaultVatPercent: decimal('default_vat_percent', { precision: 4, scale: 2 }).default('19.00').notNull(),
  paymentTermsDays: integer('payment_terms_days').default(30).notNull(),
  creditLimit: decimal('credit_limit', { precision: 15, scale: 2 }),
  
  isSyncedWithOblio: boolean('is_synced_with_oblio').default(false).notNull(),
  oblioClientId: varchar('oblio_client_id', { length: 50 }),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  
  totalInvoiced: decimal('total_invoiced', { precision: 15, scale: 2 }).default('0').notNull(),
  totalPaid: decimal('total_paid', { precision: 15, scale: 2 }).default('0').notNull(),
  lastInvoiceDate: date('last_invoice_date'),
  lastPaymentDate: date('last_payment_date'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueClientCif: uniqueIndex('unique_client_cif').on(table.tenantId, table.cif),
  searchIdx: index('idx_oblio_clients_search').using('gin', table.name),
  cifIdx: index('idx_oblio_clients_cif').on(table.tenantId, table.cif),
}));

export const oblioDocuments = pgTable('oblio_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  documentType: documentTypeEnum('document_type').notNull(),
  seriesName: varchar('series_name', { length: 20 }).notNull(),
  number: varchar('number', { length: 20 }).notNull(),
  
  negotiationId: uuid('negotiation_id').references(() => goldNegotiations.id),
  leadId: uuid('lead_id').references(() => goldLeads.id),
  originalDocumentId: uuid('original_document_id').references((): any => oblioDocuments.id),
  referenceDocumentId: uuid('reference_document_id').references((): any => oblioDocuments.id),
  
  issuerCif: varchar('issuer_cif', { length: 15 }).notNull(),
  issuerName: varchar('issuer_name', { length: 255 }).notNull(),
  
  clientId: uuid('client_id').references(() => oblioClients.id),
  clientCif: varchar('client_cif', { length: 15 }).notNull(),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientAddress: text('client_address'),
  clientEmail: varchar('client_email', { length: 255 }),
  
  subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull(),
  vatAmount: decimal('vat_amount', { precision: 15, scale: 2 }).notNull(),
  total: decimal('total', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('RON').notNull(),
  exchangeRate: decimal('exchange_rate', { precision: 10, scale: 6 }).default('1.0'),
  
  issueDate: date('issue_date').notNull(),
  dueDate: date('due_date'),
  deliveryDate: date('delivery_date'),
  
  status: documentStatusEnum('status').default('DRAFT').notNull(),
  einvoiceStatus: einvoiceStatusEnum('einvoice_status').default('NOT_APPLICABLE').notNull(),
  
  oblioId: varchar('oblio_id', { length: 50 }),
  pdfLink: text('pdf_link'),
  pdfStoredPath: text('pdf_stored_path'),
  
  einvoiceId: varchar('einvoice_id', { length: 50 }),
  einvoiceIndex: varchar('einvoice_index', { length: 100 }),
  einvoiceSentAt: timestamp('einvoice_sent_at', { withTimezone: true }),
  einvoiceValidatedAt: timestamp('einvoice_validated_at', { withTimezone: true }),
  einvoiceErrorMessage: text('einvoice_error_message'),
  einvoiceXmlPath: text('einvoice_xml_path'),
  
  products: jsonb('products').default([]).notNull(),
  mentions: text('mentions'),
  internalNote: text('internal_note'),
  
  affectsStock: boolean('affects_stock').default(false).notNull(),
  stockDeducted: boolean('stock_deducted').default(false).notNull(),
  paymentCollected: boolean('payment_collected').default(false).notNull(),
  emailSent: boolean('email_sent').default(false).notNull(),
  whatsappSent: boolean('whatsapp_sent').default(false).notNull(),
  
  oblioRequest: jsonb('oblio_request'),
  oblioResponse: jsonb('oblio_response'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  uniqueSeriesNumber: uniqueIndex('unique_document_series_number')
    .on(table.tenantId, table.documentType, table.seriesName, table.number),
  seriesNumberIdx: index('idx_doc_series_number').on(table.tenantId, table.seriesName, table.number),
  typeStatusIdx: index('idx_doc_type_status').on(table.tenantId, table.documentType, table.status),
  clientIdx: index('idx_doc_client').on(table.tenantId, table.clientCif),
  issueDateIdx: index('idx_doc_issue_date').on(table.tenantId, table.issueDate),
}));

export const oblioSeries = pgTable('oblio_series', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  documentType: documentTypeEnum('document_type').notNull(),
  seriesName: varchar('series_name', { length: 20 }).notNull(),
  fiscalYear: integer('fiscal_year').notNull(),
  
  currentNumber: integer('current_number').default(0).notNull(),
  prefix: varchar('prefix', { length: 10 }),
  padding: integer('padding').default(4).notNull(),
  
  oblioSeriesName: varchar('oblio_series_name', { length: 50 }),
  isSyncedWithOblio: boolean('is_synced_with_oblio').default(false).notNull(),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  
  isActive: boolean('is_active').default(true).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueSeriesTypeYear: uniqueIndex('unique_series_per_type_year')
    .on(table.tenantId, table.documentType, table.seriesName, table.fiscalYear),
  lookupIdx: index('idx_oblio_series_lookup')
    .on(table.tenantId, table.documentType, table.isActive, table.isDefault),
}));

export const einvoiceSubmissions = pgTable('einvoice_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  documentId: uuid('document_id').notNull().references(() => oblioDocuments.id),
  negotiationId: uuid('negotiation_id').references(() => goldNegotiations.id),
  
  action: spvActionEnum('action').notNull(),
  submissionAttempt: integer('submission_attempt').default(1).notNull(),
  
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  deadlineAt: timestamp('deadline_at', { withTimezone: true }).notNull(),
  
  spvIndex: varchar('spv_index', { length: 100 }),
  spvUploadId: varchar('spv_upload_id', { length: 100 }),
  spvStatus: varchar('spv_status', { length: 50 }),
  spvMessage: text('spv_message'),
  spvErrors: jsonb('spv_errors'),
  
  xmlContent: text('xml_content'),
  xmlHash: varchar('xml_hash', { length: 64 }),
  responseXml: text('response_xml'),
  
  processedAt: timestamp('processed_at', { withTimezone: true }),
  processingDurationMs: integer('processing_duration_ms'),
  
  isSuccessful: boolean('is_successful'),
  finalStatus: einvoiceStatusEnum('final_status'),
  errorCategory: varchar('error_category', { length: 50 }),
  
  retryCount: integer('retry_count').default(0).notNull(),
  maxRetries: integer('max_retries').default(3).notNull(),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  triggeredBy: varchar('triggered_by', { length: 50 }),
}, (table) => ({
  pendingIdx: index('idx_einvoice_pending').on(table.tenantId, table.deadlineAt),
  spvIndexIdx: index('idx_einvoice_spv_index').on(table.spvIndex),
}));

export const paymentReconciliation = pgTable('payment_reconciliation', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  paymentSource: paymentSourceEnum('payment_source').notNull(),
  externalPaymentId: varchar('external_payment_id', { length: 100 }),
  transactionReference: varchar('transaction_reference', { length: 100 }),
  
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('RON').notNull(),
  exchangeRate: decimal('exchange_rate', { precision: 10, scale: 6 }).default('1.0'),
  
  payerName: varchar('payer_name', { length: 255 }),
  payerAccount: varchar('payer_account', { length: 50 }),
  payerCif: varchar('payer_cif', { length: 15 }),
  
  status: reconciliationStatusEnum('status').default('PENDING').notNull(),
  documentId: uuid('document_id').references(() => oblioDocuments.id),
  negotiationId: uuid('negotiation_id').references(() => goldNegotiations.id),
  
  matchConfidence: decimal('match_confidence', { precision: 3, scale: 2 }),
  matchMethod: varchar('match_method', { length: 50 }),
  matchDetails: jsonb('match_details'),
  
  isPartial: boolean('is_partial').default(false).notNull(),
  partialSequence: integer('partial_sequence'),
  totalPaidForDocument: decimal('total_paid_for_document', { precision: 15, scale: 2 }),
  remainingAmount: decimal('remaining_amount', { precision: 15, scale: 2 }),
  
  paymentDate: date('payment_date').notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
  reconciledAt: timestamp('reconciled_at', { withTimezone: true }),
  
  reconciledBy: uuid('reconciled_by').references(() => users.id),
  reconciliationNote: text('reconciliation_note'),
  
  bankStatementText: text('bank_statement_text'),
  bankRawData: jsonb('bank_raw_data'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pendingIdx: index('idx_payment_pending').on(table.tenantId, table.payerCif),
  refIdx: index('idx_payment_ref').on(table.transactionReference),
}));

export const documentDelivery = pgTable('document_delivery', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  documentId: uuid('document_id').notNull().references(() => oblioDocuments.id),
  
  channel: deliveryChannelEnum('channel').notNull(),
  recipientAddress: varchar('recipient_address', { length: 255 }).notNull(),
  recipientName: varchar('recipient_name', { length: 255 }),
  
  status: deliveryStatusEnum('status').default('PENDING').notNull(),
  
  providerName: varchar('provider_name', { length: 50 }),
  providerMessageId: varchar('provider_message_id', { length: 100 }),
  providerStatus: varchar('provider_status', { length: 50 }),
  providerResponse: jsonb('provider_response'),
  
  queuedAt: timestamp('queued_at', { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  readAt: timestamp('read_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0).notNull(),
  maxRetries: integer('max_retries').default(3).notNull(),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
  
  subject: varchar('subject', { length: 255 }),
  bodyPreview: text('body_preview'),
  attachmentCount: integer('attachment_count').default(1).notNull(),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  statusIdx: index('idx_delivery_status').on(table.tenantId, table.documentId, table.channel, table.status),
  retryIdx: index('idx_delivery_retry').on(table.nextRetryAt),
}));

export const fiscalAuditTrail = pgTable('fiscal_audit_trail', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  eventType: fiscalEventTypeEnum('event_type').notNull(),
  eventTimestamp: timestamp('event_timestamp', { withTimezone: true }).defaultNow().notNull(),
  
  documentId: uuid('document_id').references(() => oblioDocuments.id),
  negotiationId: uuid('negotiation_id').references(() => goldNegotiations.id),
  einvoiceSubmissionId: uuid('einvoice_submission_id').references(() => einvoiceSubmissions.id),
  
  actorType: varchar('actor_type', { length: 20 }).notNull(),
  actorId: uuid('actor_id'),
  actorName: varchar('actor_name', { length: 255 }),
  actorIp: inet('actor_ip'),
  
  eventData: jsonb('event_data').notNull(),
  
  previousHash: varchar('previous_hash', { length: 64 }),
  currentHash: varchar('current_hash', { length: 64 }).notNull(),
  
  isVerified: boolean('is_verified'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  
  sourceSystem: varchar('source_system', { length: 50 }).default('CERNIQ').notNull(),
  correlationId: uuid('correlation_id'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  chainIdx: index('idx_fiscal_audit_chain').on(table.tenantId, table.id),
  documentIdx: index('idx_fiscal_audit_document').on(table.documentId),
  eventTypeIdx: index('idx_audit_event_type').on(table.tenantId, table.eventType, table.eventTimestamp),
}));

// =====================
// Relations
// =====================

export const oblioDocumentsRelations = relations(oblioDocuments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [oblioDocuments.tenantId],
    references: [tenants.id],
  }),
  negotiation: one(goldNegotiations, {
    fields: [oblioDocuments.negotiationId],
    references: [goldNegotiations.id],
  }),
  lead: one(goldLeads, {
    fields: [oblioDocuments.leadId],
    references: [goldLeads.id],
  }),
  client: one(oblioClients, {
    fields: [oblioDocuments.clientId],
    references: [oblioClients.id],
  }),
  originalDocument: one(oblioDocuments, {
    fields: [oblioDocuments.originalDocumentId],
    references: [oblioDocuments.id],
  }),
  referenceDocument: one(oblioDocuments, {
    fields: [oblioDocuments.referenceDocumentId],
    references: [oblioDocuments.id],
  }),
  einvoiceSubmissions: many(einvoiceSubmissions),
  deliveries: many(documentDelivery),
  payments: many(paymentReconciliation),
  auditTrail: many(fiscalAuditTrail),
}));

// =====================
// Types
// =====================

export type OblioDocument = typeof oblioDocuments.$inferSelect;
export type NewOblioDocument = typeof oblioDocuments.$inferInsert;
export type OblioClient = typeof oblioClients.$inferSelect;
export type NewOblioClient = typeof oblioClients.$inferInsert;
export type OblioSeries = typeof oblioSeries.$inferSelect;
export type EinvoiceSubmission = typeof einvoiceSubmissions.$inferSelect;
export type PaymentReconciliation = typeof paymentReconciliation.$inferSelect;
export type DocumentDelivery = typeof documentDelivery.$inferSelect;
export type FiscalAuditTrail = typeof fiscalAuditTrail.$inferSelect;
```

---

## 8. Diagrame Relații

### 8.1 ERD Simplificat

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FISCAL SCHEMA ERD                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐         ┌─────────────────┐                          │
│   │ gold_negotiations│◄────────│ oblio_documents │                          │
│   └────────┬────────┘         └────────┬────────┘                          │
│            │                           │                                    │
│            │                           │                                    │
│            │    ┌──────────────────────┼───────────────────┐               │
│            │    │                      │                   │               │
│            │    ▼                      ▼                   ▼               │
│   ┌────────┴────────┐    ┌──────────────────┐   ┌─────────────────┐       │
│   │   oblio_series  │    │einvoice_submissions│   │document_delivery│       │
│   └─────────────────┘    └──────────────────┘   └─────────────────┘       │
│                                    │                                        │
│            ┌───────────────────────┼───────────────────────┐               │
│            │                       │                       │               │
│            ▼                       ▼                       ▼               │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────┐     │
│   │ oblio_clients   │   │fiscal_audit_trail│   │payment_reconciliation│     │
│   └─────────────────┘   └─────────────────┘   └─────────────────────┘     │
│                                                                             │
│   ┌─────────────────┐                                                      │
│   │ oblio_api_logs  │ (Independent - pentru debugging)                     │
│   └─────────────────┘                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Flow Document Fiscal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DOCUMENT LIFECYCLE FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   NEGOCIERE                 PROFORMA                    FACTURĂ             │
│   ─────────                 ────────                    ───────             │
│                                                                             │
│   [NEGOTIATION] ──► [create_proforma()] ──► [PROFORMA CREATED]             │
│                              │                       │                      │
│                              ▼                       ▼                      │
│                     [send_to_client()] ──► [SENT_TO_CLIENT]                │
│                              │                       │                      │
│                              ▼                       ▼                      │
│                   [client_accepts()] ──► [APPROVED]                        │
│                              │                                              │
│                              ▼                                              │
│   [convert_proforma_to_invoice()] ──► [INVOICE CREATED]                    │
│                              │                       │                      │
│                              ├──────────────────────►│                      │
│                              ▼                       ▼                      │
│                   [auto_queue_einvoice()] ──► [e-Factura PENDING]          │
│                              │                                              │
│                              ▼                                              │
│   [oblio_send_einvoice()] ──► [e-Factura SENT] ──► [SPV VALIDATED]         │
│                              │                                              │
│                              ▼                                              │
│   [payment_received()] ──► [auto_match_payment()] ──► [PAID]               │
│                                                                             │
│   ═══════════════════════════════════════════════════════════════════      │
│   SAFETY NET: Cron zilnic la 09:00 verifică facturi aproape de deadline    │
│   Ziua 4: WARNING + queue urgent                                           │
│   Ziua 5: CRITICAL + force submission                                      │
│   ═══════════════════════════════════════════════════════════════════      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Statistici și Volume Estimate

| Tabelă | Rânduri/lună (estimate) | Retenție | Observații |
|--------|------------------------|----------|------------|
| oblio_documents | 5,000 | Permanent | Documente fiscale |
| oblio_series | 20 | Permanent | Serii configurate |
| einvoice_submissions | 5,000 | 2 ani | Log SPV |
| fiscal_audit_trail | 50,000 | 7 ani | Obligatoriu fiscal |
| payment_reconciliation | 4,000 | Permanent | Plăți primite |
| oblio_clients | 500 | Permanent | Clienți unici |
| oblio_api_logs | 100,000 | 90 zile | Partitioned, cleanup |
| document_delivery | 15,000 | 1 an | Email/WhatsApp tracking |

---

## 10. Checklist Implementare

- [ ] Creare enums
- [ ] Creare tabele principale
- [ ] Creare tabele suport
- [ ] Creare funcții SQL
- [ ] Creare triggere
- [ ] Creare indexuri
- [ ] Validare Drizzle schema
- [ ] Generare migrări
- [ ] Testare funcții cu date mock
- [ ] Verificare integritate hash chain
- [ ] Setup partiții pentru logs
- [ ] Configurare cleanup jobs

---

**Document creat:** Ianuarie 2026  
**Ultima actualizare:** Ianuarie 2026  
**Versiune schema:** 1.0  
**Compatibil cu:** Master Spec v1.2
