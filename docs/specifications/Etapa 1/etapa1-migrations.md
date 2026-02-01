# CERNIQ.APP — ETAPA 1: DATABASE MIGRATIONS

## Complete Migration Scripts & Procedures

### Versiunea 1.0 | 15 Ianuarie 2026

---

## 1. MIGRATION OVERVIEW

### 1.1 Migration Strategy

- **Tool:** Drizzle ORM Migrations
- **Naming:** `01XX_description.sql` (Etapa 1)
- **Approach:** Forward-only migrations
- **Rollback:** Separate rollback scripts

### 1.2 Migration Order for Etapa 1

```text
0100_create_bronze_contacts.sql
0101_create_bronze_import_batches.sql
0102_create_silver_companies.sql
0103_create_silver_contacts.sql
0104_create_silver_company_locations.sql
0105_create_silver_enrichment_log.sql
0106_create_silver_dedup_candidates.sql
0107_create_gold_companies.sql
0108_create_approval_tasks.sql
0109_create_approval_audit_log.sql
0110_create_daily_stats.sql
0111_create_pipeline_errors.sql
0112_add_indexes.sql
0113_add_functions.sql
0114_add_triggers.sql
```

---

## 2. BRONZE LAYER MIGRATIONS

### 2.1 Bronze Contacts (0100)

```sql
-- migrations/0100_create_bronze_contacts.sql

-- Enum types
CREATE TYPE bronze_source_type AS ENUM (
  'csv', 'xlsx', 'xls', 'api', 'webhook', 'manual'
);

CREATE TYPE bronze_processing_status AS ENUM (
  'pending', 'processing', 'validated', 'promoted', 
  'failed', 'duplicate', 'invalid'
);

-- Table
CREATE TABLE bronze_contacts (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Source tracking
  source_type bronze_source_type NOT NULL,
  batch_id UUID,
  external_id VARCHAR(255),
  content_hash VARCHAR(64),
  
  -- Extracted raw data
  extracted_name VARCHAR(255),
  extracted_cui VARCHAR(20),
  extracted_email VARCHAR(255),
  extracted_phone VARCHAR(50),
  extracted_address TEXT,
  extracted_website VARCHAR(255),
  
  -- Raw payload (original data)
  raw_payload JSONB DEFAULT '{}',
  
  -- Normalization results
  normalized_name VARCHAR(255),
  normalized_cui VARCHAR(10),
  normalized_email VARCHAR(255),
  normalized_phone VARCHAR(20),
  normalized_address TEXT,
  
  -- Validation
  cui_valid BOOLEAN,
  cui_checksum_valid BOOLEAN,
  cui_anaf_verified BOOLEAN,
  validation_errors JSONB DEFAULT '[]',
  
  -- Processing
  processing_status bronze_processing_status NOT NULL DEFAULT 'pending',
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  processing_error TEXT,
  
  -- Promotion
  promoted_to_silver_id UUID,
  promoted_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Comments
COMMENT ON TABLE bronze_contacts IS 'Raw ingested contact data before normalization and validation';
COMMENT ON COLUMN bronze_contacts.content_hash IS 'SHA-256 hash of raw_payload for deduplication';
COMMENT ON COLUMN bronze_contacts.normalized_cui IS 'CUI after removing whitespace and RO prefix';
```

### 2.2 Bronze Import Batches (0101)

```sql
-- migrations/0101_create_bronze_import_batches.sql

CREATE TYPE import_status AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'cancelled'
);

CREATE TABLE bronze_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- File info
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(10) NOT NULL,
  file_size_bytes BIGINT,
  file_path VARCHAR(500),
  
  -- Configuration
  has_header BOOLEAN DEFAULT true,
  delimiter VARCHAR(5) DEFAULT ',',
  encoding VARCHAR(20) DEFAULT 'utf-8',
  sheet_name VARCHAR(100),
  column_mapping JSONB NOT NULL,
  
  -- Processing options
  skip_duplicates BOOLEAN DEFAULT true,
  validate_cui BOOLEAN DEFAULT true,
  
  -- Status
  status import_status NOT NULL DEFAULT 'pending',
  
  -- Progress
  total_rows INTEGER,
  processed_rows INTEGER DEFAULT 0,
  success_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  duplicate_rows INTEGER DEFAULT 0,
  progress_percent NUMERIC(5,2) DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Errors
  error_message TEXT,
  error_details JSONB DEFAULT '[]',
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id)
);

COMMENT ON TABLE bronze_import_batches IS 'Tracks file import jobs and their progress';
```

---

## 3. SILVER LAYER MIGRATIONS

### 3.1 Silver Companies (0102)

```sql
-- migrations/0102_create_silver_companies.sql

-- Enums
CREATE TYPE enrichment_status AS ENUM (
  'pending', 'in_progress', 'complete', 'partial', 'failed'
);

CREATE TYPE promotion_status AS ENUM (
  'eligible', 'review_required', 'blocked', 'promoted'
);

CREATE TYPE company_status AS ENUM (
  'ACTIVA', 'INACTIVA', 'DIZOLVARE', 'RADIATA', 'INSOLVENTA'
);

CREATE TYPE forma_juridica AS ENUM (
  'SRL', 'SA', 'PFA', 'II', 'IF', 'SNC', 'SCS', 'ONG', 'COOP', 'OTHER'
);

CREATE TYPE risk_category AS ENUM (
  'LOW', 'MEDIUM', 'HIGH'
);

-- Main table
CREATE TABLE silver_companies (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Source
  source_bronze_id UUID REFERENCES bronze_contacts(id),
  
  -- Core identification
  cui VARCHAR(10) NOT NULL,
  denumire VARCHAR(255) NOT NULL,
  nr_reg_com VARCHAR(20),
  
  -- ANAF Data (D.1-D.5)
  status_firma company_status,
  data_inregistrare DATE,
  platitor_tva BOOLEAN,
  data_inceput_tva DATE,
  data_anulare_tva DATE,
  motiv_anulare_tva TEXT,
  inregistrat_e_factura BOOLEAN,
  data_inregistrare_e_factura DATE,
  are_restante_buget BOOLEAN,
  suma_totala_datorii NUMERIC(15,2),
  status_inactiv BOOLEAN,
  data_inactivare DATE,
  cod_caen_principal VARCHAR(4),
  denumire_caen VARCHAR(255),
  is_agricultural BOOLEAN DEFAULT false,
  agricultural_category VARCHAR(50),
  
  -- Termene.ro Data (E.1-E.4)
  cifra_afaceri NUMERIC(15,2),
  profit_net NUMERIC(15,2),
  numar_angajati INTEGER,
  capitaluri_proprii NUMERIC(15,2),
  datorii_totale NUMERIC(15,2),
  active_totale NUMERIC(15,2),
  an_bilant INTEGER,
  rata_solvabilitate NUMERIC(5,2),
  rata_lichiditate NUMERIC(5,2),
  scor_risc_termene INTEGER,
  categorie_risc risk_category,
  risc_financiar NUMERIC(5,2),
  risc_juridic NUMERIC(5,2),
  risc_operational NUMERIC(5,2),
  numar_dosare_actuale INTEGER,
  in_insolventa BOOLEAN DEFAULT false,
  are_executari_silite BOOLEAN DEFAULT false,
  tipuri_dosare JSONB DEFAULT '[]',
  numar_actionari INTEGER,
  numar_administratori INTEGER,
  are_actionar_majoritar BOOLEAN,
  
  -- ONRC Data (F.1-F.3)
  forma_juridica forma_juridica,
  capital_social NUMERIC(15,2),
  adresa_sediu TEXT,
  obiect_activitate TEXT,
  durata_societate VARCHAR(50),
  numar_sedii INTEGER DEFAULT 0,
  numar_puncte_lucru INTEGER DEFAULT 0,
  are_multiple_locatii BOOLEAN DEFAULT false,
  
  -- Location
  adresa_completa TEXT,
  localitate VARCHAR(100),
  judet VARCHAR(50),
  judet_cod VARCHAR(2),
  comuna_cod VARCHAR(6),
  cod_siruta VARCHAR(10),
  cod_postal VARCHAR(6),
  tara VARCHAR(50) DEFAULT 'România',
  
  -- Geocoding (K.1-K.3)
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  location GEOGRAPHY(POINT, 4326),
  geocoding_accuracy VARCHAR(20),
  geocoding_source VARCHAR(50),
  geocoded_at TIMESTAMPTZ,
  is_rural_area BOOLEAN,
  distance_to_nearest_city_km NUMERIC(10,2),
  nearest_ouai_id UUID,
  nearest_ouai_distance_km NUMERIC(10,2),
  nearest_coop_id UUID,
  nearest_coop_distance_km NUMERIC(10,2),
  
  -- Contact (G.1-G.5, H.1-H.3)
  email_principal VARCHAR(255),
  email_confidence NUMERIC(3,2),
  email_status VARCHAR(20),
  email_is_catch_all BOOLEAN,
  email_is_disposable BOOLEAN,
  email_verified_at TIMESTAMPTZ,
  email_generated BOOLEAN DEFAULT false,
  email_pattern VARCHAR(50),
  telefon_principal VARCHAR(20),
  telefon_national VARCHAR(20),
  telefon_international VARCHAR(25),
  phone_type VARCHAR(20),
  hlr_reachable BOOLEAN,
  hlr_carrier VARCHAR(50),
  hlr_carrier_type VARCHAR(20),
  detected_carrier VARCHAR(50),
  phone_validated_at TIMESTAMPTZ,
  website VARCHAR(255),
  website_domain VARCHAR(100),
  website_title VARCHAR(255),
  website_verified_at TIMESTAMPTZ,
  
  -- Agricultural (L.1-L.5)
  apia_registration_number VARCHAR(50),
  suprafata_agricola NUMERIC(10,2),
  total_subsidii_primite NUMERIC(15,2),
  ultimul_an_subventie INTEGER,
  subsidii_detalii JSONB DEFAULT '[]',
  is_ouai_member BOOLEAN DEFAULT false,
  suprafata_irigata_declarat NUMERIC(10,2),
  contributie_ouai NUMERIC(10,2),
  status_membru_ouai VARCHAR(20),
  is_cooperative_member BOOLEAN DEFAULT false,
  cooperative_count INTEGER DEFAULT 0,
  primary_cooperative_id UUID,
  daj_registration_number VARCHAR(50),
  categorie_exploatatie VARCHAR(50),
  culturi_principale JSONB DEFAULT '[]',
  categorie_agricola VARCHAR(50),
  tip_producator VARCHAR(50),
  are_contract_irigare BOOLEAN DEFAULT false,
  amenajare_irigare VARCHAR(100),
  acces_irigatii VARCHAR(50),
  tipuri_animale JSONB DEFAULT '[]',
  categorie_zootehnica VARCHAR(50),
  este_ferma_zootehnica BOOLEAN DEFAULT false,
  
  -- AI Processing (J.1-J.4)
  ai_structuring_confidence NUMERIC(3,2),
  ai_structuring_source VARCHAR(50),
  ai_merge_conflicts JSONB DEFAULT '[]',
  ai_data_approved_by UUID REFERENCES users(id),
  ai_data_approved_at TIMESTAMPTZ,
  
  -- Deduplication (M.1-M.2)
  is_master_record BOOLEAN DEFAULT true,
  master_record_id UUID,
  duplicate_confidence NUMERIC(3,2),
  duplicate_method VARCHAR(20),
  dedup_checked_at TIMESTAMPTZ,
  merge_history JSONB DEFAULT '[]',
  last_merge_at TIMESTAMPTZ,
  
  -- Quality Scoring (N.1-N.3)
  completeness_score NUMERIC(5,2),
  completeness_missing_fields JSONB DEFAULT '[]',
  accuracy_score NUMERIC(5,2),
  accuracy_issues JSONB DEFAULT '[]',
  freshness_score NUMERIC(5,2),
  freshness_issues JSONB DEFAULT '[]',
  total_quality_score NUMERIC(5,2),
  
  -- Enrichment Tracking
  enrichment_status enrichment_status DEFAULT 'pending',
  enrichment_sources_completed JSONB DEFAULT '[]',
  enrichment_errors JSONB DEFAULT '{}',
  last_enrichment_at TIMESTAMPTZ,
  
  -- Promotion
  promotion_status promotion_status,
  promotion_blocked_reason TEXT,
  promotion_override_by UUID REFERENCES users(id),
  promotion_override_reason TEXT,
  promoted_to_gold_id UUID,
  promoted_at TIMESTAMPTZ,
  
  -- CUI Validation
  cui_validated_at TIMESTAMPTZ,
  cui_anaf_verified BOOLEAN,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add self-reference after table creation
ALTER TABLE silver_companies 
  ADD CONSTRAINT fk_master_record 
  FOREIGN KEY (master_record_id) REFERENCES silver_companies(id);

-- Comments
COMMENT ON TABLE silver_companies IS 'Enriched company data with quality scores';
COMMENT ON COLUMN silver_companies.location IS 'PostGIS geography point for spatial queries';
COMMENT ON COLUMN silver_companies.is_master_record IS 'False if this is a duplicate record';
```

### 3.2 Silver Contacts (0103)

```sql
-- migrations/0103_create_silver_contacts.sql

CREATE TYPE contact_role AS ENUM (
  'ADMINISTRATOR', 'ACTIONAR', 'CONTACT', 'ASOCIAT', 'REPREZENTANT'
);

CREATE TABLE silver_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES silver_companies(id) ON DELETE CASCADE,
  
  -- Identity
  full_name VARCHAR(255) NOT NULL,
  role contact_role NOT NULL,
  
  -- Contact
  email VARCHAR(255),
  phone VARCHAR(50),
  linkedin_url VARCHAR(255),
  
  -- Business data (for shareholders/admins)
  ownership_percent NUMERIC(5,2),
  data_numire DATE,
  puteri TEXT,
  cetatenie VARCHAR(50),
  cnp_masked VARCHAR(20), -- First 2 + last 4 digits only for GDPR
  
  -- Enrichment
  photo_url VARCHAR(500),
  bio TEXT,
  enrichment_source VARCHAR(50),
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE silver_contacts IS 'People associated with silver companies';
COMMENT ON COLUMN silver_contacts.cnp_masked IS 'Partially masked CNP for GDPR compliance';
```

### 3.3 Silver Company Locations (0104)

```sql
-- migrations/0104_create_silver_company_locations.sql

CREATE TYPE location_type AS ENUM (
  'SEDIU_SOCIAL', 'PUNCT_LUCRU', 'SUCURSALA', 'DEPOZIT', 'FERMA'
);

CREATE TABLE silver_company_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES silver_companies(id) ON DELETE CASCADE,
  
  -- Type
  tip_locatie location_type NOT NULL,
  activ BOOLEAN DEFAULT true,
  
  -- Address
  adresa_completa TEXT NOT NULL,
  localitate VARCHAR(100),
  judet VARCHAR(50),
  cod_postal VARCHAR(6),
  
  -- Geocoding
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  location GEOGRAPHY(POINT, 4326),
  
  -- Agricultural specific
  suprafata_ha NUMERIC(10,2),
  culturi JSONB DEFAULT '[]',
  
  -- Source
  source VARCHAR(50),
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE silver_company_locations IS 'Additional company locations beyond main HQ';
```

### 3.4 Silver Enrichment Log (0105)

```sql
-- migrations/0105_create_silver_enrichment_log.sql

CREATE TABLE silver_enrichment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES silver_companies(id) ON DELETE CASCADE,
  
  -- Source
  source VARCHAR(50) NOT NULL,
  
  -- Result
  success BOOLEAN NOT NULL,
  duration_ms INTEGER,
  
  -- Data
  fields_updated JSONB DEFAULT '[]',
  raw_response JSONB DEFAULT '{}',
  error_message TEXT,
  error_code VARCHAR(50),
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partition by month for performance
-- CREATE TABLE silver_enrichment_log_y2026m01 PARTITION OF silver_enrichment_log
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

COMMENT ON TABLE silver_enrichment_log IS 'Tracks all enrichment attempts per company';
```

## 3.5 Silver Dedup Candidates (0106)

```sql
-- migrations/0106_create_silver_dedup_candidates.sql

CREATE TYPE dedup_status AS ENUM (
  'pending', 'auto_merged', 'hitl_pending', 'merged', 'rejected', 'expired'
);

CREATE TABLE silver_dedup_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Companies
  company_a_id UUID NOT NULL REFERENCES silver_companies(id) ON DELETE CASCADE,
  company_b_id UUID NOT NULL REFERENCES silver_companies(id) ON DELETE CASCADE,
  
  -- Scores
  overall_score NUMERIC(5,4) NOT NULL,
  name_score NUMERIC(5,4),
  address_score NUMERIC(5,4),
  phone_score NUMERIC(5,4),
  
  -- Status
  status dedup_status NOT NULL DEFAULT 'pending',
  
  -- Decision
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES users(id),
  decision_reason TEXT,
  
  -- Tracking
  approval_task_id UUID,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate pairs
  CONSTRAINT unique_dedup_pair UNIQUE (tenant_id, company_a_id, company_b_id)
);

COMMENT ON TABLE silver_dedup_candidates IS 'Potential duplicate pairs for review';
```

---

## 4. GOLD LAYER MIGRATIONS

### 4.1 Gold Companies (0107)

```sql
-- migrations/0107_create_gold_companies.sql

CREATE TYPE lead_state AS ENUM (
  'COLD', 'WARM', 'HOT', 'QUALIFIED', 'CONVERTED', 'LOST'
);

CREATE TABLE gold_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Source
  source_silver_id UUID NOT NULL REFERENCES silver_companies(id),
  
  -- All Silver fields (inherited)
  cui VARCHAR(10) NOT NULL,
  denumire VARCHAR(255) NOT NULL,
  nr_reg_com VARCHAR(20),
  status_firma company_status,
  forma_juridica forma_juridica,
  platitor_tva BOOLEAN,
  inregistrat_e_factura BOOLEAN,
  cod_caen_principal VARCHAR(4),
  denumire_caen VARCHAR(255),
  is_agricultural BOOLEAN,
  agricultural_category VARCHAR(50),
  
  -- Financial
  cifra_afaceri NUMERIC(15,2),
  profit_net NUMERIC(15,2),
  numar_angajati INTEGER,
  scor_risc_termene INTEGER,
  categorie_risc risk_category,
  in_insolventa BOOLEAN DEFAULT false,
  
  -- Location
  adresa_completa TEXT,
  localitate VARCHAR(100),
  judet VARCHAR(50),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  location GEOGRAPHY(POINT, 4326),
  is_rural_area BOOLEAN,
  
  -- Contact
  email_principal VARCHAR(255),
  telefon_principal VARCHAR(20),
  website VARCHAR(255),
  
  -- Agricultural
  suprafata_agricola NUMERIC(10,2),
  culturi_principale JSONB DEFAULT '[]',
  is_ouai_member BOOLEAN,
  is_cooperative_member BOOLEAN,
  
  -- Lead Management
  current_state lead_state NOT NULL DEFAULT 'COLD',
  state_changed_at TIMESTAMPTZ DEFAULT NOW(),
  lead_score NUMERIC(5,2),
  fit_score NUMERIC(5,2),
  engagement_score NUMERIC(5,2),
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ,
  
  -- Activity
  last_contact_at TIMESTAMPTZ,
  next_action_at TIMESTAMPTZ,
  next_action_type VARCHAR(50),
  
  -- Quality (from Silver)
  quality_score NUMERIC(5,2),
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  CONSTRAINT unique_gold_cui UNIQUE (tenant_id, cui)
);

COMMENT ON TABLE gold_companies IS 'Sales-ready companies with lead management';
```

---

## 5. HITL MIGRATIONS

### 5.1 Approval Tasks (0108)

```sql
-- migrations/0108_create_approval_tasks.sql

CREATE TYPE approval_status AS ENUM (
  'pending', 'assigned', 'approved', 'rejected', 'escalated', 'expired', 'cancelled'
);

CREATE TYPE approval_priority AS ENUM (
  'critical', 'high', 'normal', 'low'
);

CREATE TYPE approval_type AS ENUM (
  'dedup_review', 'quality_review', 'ai_structuring_review', 
  'ai_merge_review', 'low_confidence_review', 'data_anomaly',
  'manual_verification', 'error_review'
);

CREATE TABLE approval_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Entity
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Configuration
  approval_type approval_type NOT NULL,
  pipeline_stage VARCHAR(10) NOT NULL DEFAULT 'E1',
  priority approval_priority NOT NULL DEFAULT 'normal',
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ,
  
  -- Status
  status approval_status NOT NULL DEFAULT 'pending',
  
  -- SLA
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at TIMESTAMPTZ NOT NULL,
  decided_at TIMESTAMPTZ,
  
  -- Decision
  decision VARCHAR(20),
  decision_reason TEXT,
  decision_metadata JSONB DEFAULT '{}',
  
  -- Context
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Escalation
  escalation_level INTEGER DEFAULT 0,
  escalated_at TIMESTAMPTZ,
  escalated_to UUID REFERENCES users(id),
  
  -- Blocked job
  blocked_job_id VARCHAR(100),
  blocked_queue_name VARCHAR(100),
  
  -- Audit
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE approval_tasks IS 'Human-in-the-loop approval tasks';
```

### 5.2 Approval Audit Log (0109)

```sql
-- migrations/0109_create_approval_audit_log.sql

CREATE TABLE approval_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  approval_task_id UUID NOT NULL REFERENCES approval_tasks(id) ON DELETE CASCADE,
  
  -- Action
  action VARCHAR(50) NOT NULL,
  
  -- Actor
  actor_id UUID REFERENCES users(id),
  actor_type VARCHAR(20) NOT NULL,
  
  -- Change
  previous_status approval_status,
  new_status approval_status,
  
  -- Context
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE approval_audit_log IS 'Audit trail for approval actions';
```

---

## 6. SUPPORT TABLES

### 6.1 Daily Stats (0110)

```sql
-- migrations/0110_create_daily_stats.sql

CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Date
  stat_date DATE NOT NULL,
  pipeline_stage VARCHAR(10) NOT NULL DEFAULT 'E1',
  
  -- Bronze counts
  bronze_total INTEGER DEFAULT 0,
  bronze_pending INTEGER DEFAULT 0,
  bronze_promoted INTEGER DEFAULT 0,
  bronze_failed INTEGER DEFAULT 0,
  
  -- Silver counts
  silver_total INTEGER DEFAULT 0,
  silver_enrichment_pending INTEGER DEFAULT 0,
  silver_enrichment_complete INTEGER DEFAULT 0,
  
  -- Gold counts
  gold_total INTEGER DEFAULT 0,
  gold_by_state JSONB DEFAULT '{}',
  
  -- Quality metrics
  avg_quality_score NUMERIC(5,2),
  avg_lead_score NUMERIC(5,2),
  
  -- HITL metrics
  hitl_pending INTEGER DEFAULT 0,
  hitl_completed INTEGER DEFAULT 0,
  hitl_avg_resolution_hours NUMERIC(10,2),
  
  -- Enrichment metrics
  enrichment_jobs_completed INTEGER DEFAULT 0,
  enrichment_jobs_failed INTEGER DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_daily_stats UNIQUE (tenant_id, stat_date, pipeline_stage)
);

COMMENT ON TABLE daily_stats IS 'Daily aggregated statistics for dashboard';
```

### 6.2 Pipeline Errors (0111)

```sql
-- migrations/0111_create_pipeline_errors.sql

CREATE TYPE error_severity AS ENUM (
  'warning', 'error', 'critical'
);

CREATE TABLE pipeline_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Context
  pipeline_stage VARCHAR(10) NOT NULL,
  worker_name VARCHAR(100) NOT NULL,
  job_id VARCHAR(100),
  
  -- Entity
  entity_type VARCHAR(50),
  entity_id UUID,
  
  -- Error
  error_type VARCHAR(50) NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  severity error_severity NOT NULL DEFAULT 'error',
  
  -- Recovery
  recovery_action VARCHAR(50),
  recovered_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pipeline_errors IS 'Tracks pipeline errors for debugging';
```

---

## 7. INDEXES

```sql
-- migrations/0112_add_indexes.sql

-- Bronze indexes
CREATE INDEX idx_bronze_contacts_tenant_status 
  ON bronze_contacts(tenant_id, processing_status);
CREATE INDEX idx_bronze_contacts_batch 
  ON bronze_contacts(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_bronze_contacts_cui 
  ON bronze_contacts(tenant_id, normalized_cui) WHERE normalized_cui IS NOT NULL;
CREATE INDEX idx_bronze_contacts_content_hash 
  ON bronze_contacts(tenant_id, content_hash) WHERE content_hash IS NOT NULL;

-- Silver indexes
CREATE INDEX idx_silver_companies_tenant_cui 
  ON silver_companies(tenant_id, cui);
CREATE INDEX idx_silver_companies_tenant_enrichment 
  ON silver_companies(tenant_id, enrichment_status);
CREATE INDEX idx_silver_companies_tenant_promotion 
  ON silver_companies(tenant_id, promotion_status) 
  WHERE is_master_record = true;
CREATE INDEX idx_silver_companies_quality 
  ON silver_companies(tenant_id, total_quality_score DESC) 
  WHERE is_master_record = true;
CREATE INDEX idx_silver_companies_agricultural 
  ON silver_companies(tenant_id, is_agricultural, agricultural_category) 
  WHERE is_agricultural = true;
CREATE INDEX idx_silver_companies_location 
  ON silver_companies USING GIST(location);
CREATE INDEX idx_silver_companies_judet 
  ON silver_companies(tenant_id, judet);

-- Gold indexes
CREATE INDEX idx_gold_companies_tenant_state 
  ON gold_companies(tenant_id, current_state);
CREATE INDEX idx_gold_companies_tenant_assigned 
  ON gold_companies(tenant_id, assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_gold_companies_lead_score 
  ON gold_companies(tenant_id, lead_score DESC);
CREATE INDEX idx_gold_companies_location 
  ON gold_companies USING GIST(location);

-- HITL indexes
CREATE INDEX idx_approval_tasks_tenant_status 
  ON approval_tasks(tenant_id, status);
CREATE INDEX idx_approval_tasks_assigned 
  ON approval_tasks(assigned_to, status) WHERE status IN ('pending', 'assigned');
CREATE INDEX idx_approval_tasks_due 
  ON approval_tasks(due_at) WHERE status = 'pending';
CREATE INDEX idx_approval_tasks_entity 
  ON approval_tasks(entity_type, entity_id);

-- Enrichment log indexes
CREATE INDEX idx_enrichment_log_company 
  ON silver_enrichment_log(company_id, created_at DESC);
CREATE INDEX idx_enrichment_log_source 
  ON silver_enrichment_log(source, created_at DESC);

-- Dedup candidates indexes
CREATE INDEX idx_dedup_candidates_status 
  ON silver_dedup_candidates(tenant_id, status);
```

---

## 8. FUNCTIONS & TRIGGERS

```sql
-- migrations/0113_add_functions.sql

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Calculate total quality score
CREATE OR REPLACE FUNCTION calculate_total_quality_score(
  completeness NUMERIC,
  accuracy NUMERIC,
  freshness NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND(
    (COALESCE(completeness, 0) * 0.40) +
    (COALESCE(accuracy, 0) * 0.35) +
    (COALESCE(freshness, 0) * 0.25),
    2
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update location from lat/lng
CREATE OR REPLACE FUNCTION update_location_from_coords()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- migrations/0114_add_triggers.sql

-- Updated_at triggers
CREATE TRIGGER tr_bronze_contacts_updated_at
  BEFORE UPDATE ON bronze_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_silver_companies_updated_at
  BEFORE UPDATE ON silver_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_gold_companies_updated_at
  BEFORE UPDATE ON gold_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_approval_tasks_updated_at
  BEFORE UPDATE ON approval_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Location triggers
CREATE TRIGGER tr_silver_companies_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON silver_companies
  FOR EACH ROW EXECUTE FUNCTION update_location_from_coords();

CREATE TRIGGER tr_gold_companies_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON gold_companies
  FOR EACH ROW EXECUTE FUNCTION update_location_from_coords();
```

---

## 9. ROW LEVEL SECURITY

```sql
-- migrations/0115_add_rls.sql

-- Enable RLS on all tables
ALTER TABLE bronze_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bronze_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE silver_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE silver_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE silver_company_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE silver_enrichment_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE silver_dedup_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_errors ENABLE ROW LEVEL SECURITY;

-- Create policies (example for bronze_contacts)
CREATE POLICY bronze_contacts_tenant_isolation ON bronze_contacts
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY silver_companies_tenant_isolation ON silver_companies
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY gold_companies_tenant_isolation ON gold_companies
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY approval_tasks_tenant_isolation ON approval_tasks
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Repeat for all tables...
```

---

**Document generat:** 15 Ianuarie 2026
**Conformitate:** Master Spec v1.2
