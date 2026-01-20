# CERNIQ.APP — ETAPA 1: SCHEMA DATABASE SILVER LAYER

## Tabele, Indecși, Constraints, Funcții

### Versiunea 1.0 | 15 Ianuarie 2026

---

## 1. OVERVIEW SILVER LAYER

Silver Layer conține date **curățate, validate și parțial îmbogățite**. Caracteristici:

- **Mutable**: Permite UPDATE pentru enrichment progresiv
- **Validated**: Toate datele trec prin validare (CUI, email, phone)
- **Normalized**: Format standard pentru toate câmpurile
- **Deduplicated**: Entity resolution și fuzzy matching aplicat

---

## 2. TABELE SILVER

### 2.1 silver_companies (Companii Validate)

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- TABEL: silver_companies
-- SCOP: Companii curățate, validate și parțial enriched
-- LAYER: Silver (mutable, validated)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE silver_companies (
    -- ─────────────────────────────────────────────────────────────────────────
    -- IDENTIFICARE
    -- ─────────────────────────────────────────────────────────────────────────
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Legătură Bronze (trasabilitate)
    source_bronze_id UUID REFERENCES bronze_contacts(id),
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- IDENTIFICATORI FISCALI (VALIDAȚI)
    -- ─────────────────────────────────────────────────────────────────────────
    cui VARCHAR(12) NOT NULL,
    cui_validated BOOLEAN DEFAULT FALSE,
    cui_validation_date TIMESTAMPTZ,
    cui_validation_source VARCHAR(50), -- 'modulo11', 'anaf_api', 'manual'
    
    cui_ro VARCHAR(14) GENERATED ALWAYS AS ('RO' || cui) STORED,
    nr_reg_com VARCHAR(20),
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- DENUMIRE (NORMALIZATĂ)
    -- ─────────────────────────────────────────────────────────────────────────
    denumire VARCHAR(255) NOT NULL,
    denumire_normalizata VARCHAR(255) GENERATED ALWAYS AS (
        UPPER(TRIM(REGEXP_REPLACE(denumire, '\s+', ' ', 'g')))
    ) STORED,
    denumire_comerciala VARCHAR(255),
    
    forma_juridica VARCHAR(20),
    -- SRL, SA, PFA, II, IF, SNC, SCS, COOP, OUAI, ASOC, ONG
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- ADRESĂ (NORMALIZATĂ ȘI PARSATĂ)
    -- ─────────────────────────────────────────────────────────────────────────
    adresa_completa TEXT,
    adresa_normalizata TEXT,
    
    -- Componente parsate
    strada VARCHAR(200),
    numar VARCHAR(20),
    bloc VARCHAR(20),
    scara VARCHAR(10),
    etaj VARCHAR(10),
    apartament VARCHAR(10),
    cod_postal VARCHAR(10),
    
    -- Localizare administrativă
    localitate VARCHAR(100),
    comuna VARCHAR(100),
    judet VARCHAR(50),
    judet_cod VARCHAR(2), -- Cod auto (BV, B, CJ, etc.)
    cod_siruta INTEGER,
    
    -- Coordonate (din geocoding)
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    location_geography GEOGRAPHY(POINT, 4326),
    geocoding_accuracy VARCHAR(30), -- 'exact', 'street', 'locality', 'county'
    geocoding_source VARCHAR(30), -- 'nominatim', 'google', 'manual'
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- DATE FISCALE (DIN ANAF)
    -- ─────────────────────────────────────────────────────────────────────────
    status_firma VARCHAR(20) DEFAULT 'UNKNOWN',
    -- ACTIVA, INACTIVA, SUSPENDATA, RADIATA, DIZOLVATA, IN_INSOLVENTA
    
    data_inregistrare DATE,
    data_radiere DATE,
    data_suspendare DATE,
    
    -- TVA
    platitor_tva BOOLEAN,
    data_inceput_tva DATE,
    data_sfarsit_tva DATE,
    tva_la_incasare BOOLEAN DEFAULT FALSE,
    split_tva BOOLEAN DEFAULT FALSE,
    
    -- e-Factura
    inregistrat_e_factura BOOLEAN DEFAULT FALSE,
    data_inregistrare_e_factura DATE,
    
    -- CAEN
    cod_caen_principal VARCHAR(6),
    denumire_caen VARCHAR(255),
    coduri_caen_secundare VARCHAR(6)[],
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- DATE FINANCIARE (DIN TERMENE.RO)
    -- ─────────────────────────────────────────────────────────────────────────
    cifra_afaceri DECIMAL(15, 2),
    profit_net DECIMAL(15, 2),
    numar_angajati INTEGER,
    capitaluri_proprii DECIMAL(15, 2),
    datorii_totale DECIMAL(15, 2),
    active_totale DECIMAL(15, 2),
    an_bilant INTEGER,
    
    -- Risk scoring (din Termene.ro)
    scor_risc_termene INTEGER, -- 0-100
    categorie_risc VARCHAR(20), -- LOW, MEDIUM, HIGH
    
    -- Dosare juridice
    numar_dosare_actuale INTEGER DEFAULT 0,
    in_insolventa BOOLEAN DEFAULT FALSE,
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- ENRICHMENT TRACKING
    -- ─────────────────────────────────────────────────────────────────────────
    enrichment_status VARCHAR(30) DEFAULT 'pending',
    -- pending, in_progress, partial, complete, failed
    
    enrichment_sources_completed VARCHAR(50)[] DEFAULT '{}',
    -- Array: ['anaf', 'termene', 'onrc', 'geocoding']
    
    enrichment_errors JSONB DEFAULT '{}',
    -- {"anaf": "rate_limited", "termene": null}
    
    last_enrichment_at TIMESTAMPTZ,
    next_enrichment_at TIMESTAMPTZ,
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- QUALITY SCORING
    -- ─────────────────────────────────────────────────────────────────────────
    completeness_score INTEGER DEFAULT 0, -- 0-100
    accuracy_score INTEGER DEFAULT 0, -- 0-100
    freshness_score INTEGER DEFAULT 0, -- 0-100
    total_quality_score INTEGER DEFAULT 0, -- 0-100
    
    quality_issues JSONB DEFAULT '[]',
    -- [{"field": "email", "issue": "not_verified"}, ...]
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- PROMOTION TO GOLD
    -- ─────────────────────────────────────────────────────────────────────────
    promotion_status VARCHAR(30) DEFAULT 'pending',
    -- pending, eligible, promoted, blocked
    
    promotion_blocked_reason TEXT,
    promoted_to_gold_id UUID,
    promoted_at TIMESTAMPTZ,
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- DEDUPLICARE
    -- ─────────────────────────────────────────────────────────────────────────
    is_master_record BOOLEAN DEFAULT TRUE,
    master_record_id UUID REFERENCES silver_companies(id),
    duplicate_confidence DECIMAL(5, 4),
    merge_history JSONB DEFAULT '[]',
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- TIMESTAMPS
    -- ─────────────────────────────────────────────────────────────────────────
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentariu
COMMENT ON TABLE silver_companies IS 
'Silver layer - validated and partially enriched companies. Mutable for progressive enrichment.';
```

### 2.2 silver_companies Indecși

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- INDECȘI silver_companies
-- ═══════════════════════════════════════════════════════════════════════════

-- UNIQUE constraint per tenant (CRITIC pentru multi-tenancy)
CREATE UNIQUE INDEX idx_silver_companies_cui_tenant 
ON silver_companies(tenant_id, cui) 
WHERE is_master_record = TRUE;

-- Index pentru tenant isolation
CREATE INDEX idx_silver_companies_tenant 
ON silver_companies(tenant_id);

-- Index pentru enrichment queue
CREATE INDEX idx_silver_companies_enrichment 
ON silver_companies(tenant_id, enrichment_status, last_enrichment_at)
WHERE enrichment_status IN ('pending', 'partial');

-- Index pentru promotion eligibility
CREATE INDEX idx_silver_companies_promotion 
ON silver_companies(tenant_id, promotion_status, total_quality_score)
WHERE promotion_status = 'eligible';

-- Index pentru căutare denumire
CREATE INDEX idx_silver_companies_denumire_trgm 
ON silver_companies USING GIN (denumire_normalizata gin_trgm_ops);

-- Index pentru căutare CUI
CREATE INDEX idx_silver_companies_cui 
ON silver_companies(cui);

-- Index geografic pentru proximity queries
CREATE INDEX idx_silver_companies_geo 
ON silver_companies USING GIST (location_geography);

-- Index pentru status
CREATE INDEX idx_silver_companies_status 
ON silver_companies(tenant_id, status_firma);

-- Index pentru CAEN
CREATE INDEX idx_silver_companies_caen 
ON silver_companies(cod_caen_principal);

-- Index pentru quality score ordering
CREATE INDEX idx_silver_companies_quality 
ON silver_companies(tenant_id, total_quality_score DESC);
```

### 2.3 silver_companies Constraints și Triggers

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- CONSTRAINTS
-- ═══════════════════════════════════════════════════════════════════════════

-- CUI format validation
ALTER TABLE silver_companies 
ADD CONSTRAINT chk_silver_cui_format 
CHECK (cui ~ '^\d{2,10}$');

-- Quality scores 0-100
ALTER TABLE silver_companies 
ADD CONSTRAINT chk_silver_quality_range 
CHECK (
    completeness_score BETWEEN 0 AND 100 AND
    accuracy_score BETWEEN 0 AND 100 AND
    freshness_score BETWEEN 0 AND 100 AND
    total_quality_score BETWEEN 0 AND 100
);

-- Latitude/Longitude range
ALTER TABLE silver_companies 
ADD CONSTRAINT chk_silver_coords_range 
CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION silver_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_silver_companies_timestamp
BEFORE UPDATE ON silver_companies
FOR EACH ROW
EXECUTE FUNCTION silver_update_timestamp();

-- Auto-compute geography from lat/lon
CREATE OR REPLACE FUNCTION silver_compute_geography()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location_geography := ST_SetSRID(
            ST_MakePoint(NEW.longitude, NEW.latitude),
            4326
        )::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_silver_companies_geo
BEFORE INSERT OR UPDATE OF latitude, longitude ON silver_companies
FOR EACH ROW
EXECUTE FUNCTION silver_compute_geography();

-- Auto-calculate total quality score
CREATE OR REPLACE FUNCTION silver_compute_quality_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_quality_score := (
        NEW.completeness_score * 0.40 +
        NEW.accuracy_score * 0.35 +
        NEW.freshness_score * 0.25
    )::INTEGER;
    
    -- Auto-set promotion eligibility
    IF NEW.total_quality_score >= 70 AND NEW.cui_validated = TRUE THEN
        NEW.promotion_status := 'eligible';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_silver_companies_quality
BEFORE INSERT OR UPDATE OF completeness_score, accuracy_score, freshness_score ON silver_companies
FOR EACH ROW
EXECUTE FUNCTION silver_compute_quality_score();

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE silver_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE silver_companies FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_silver_companies ON silver_companies
FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

---

### 2.4 silver_contacts (Persoane de Contact)

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- TABEL: silver_contacts
-- SCOP: Persoane de contact validate asociate companiilor
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE silver_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES silver_companies(id) ON DELETE CASCADE,
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- NUME (NORMALIZAT)
    -- ─────────────────────────────────────────────────────────────────────────
    prenume VARCHAR(100),
    nume VARCHAR(100),
    nume_complet VARCHAR(200) GENERATED ALWAYS AS (
        TRIM(COALESCE(prenume, '') || ' ' || COALESCE(nume, ''))
    ) STORED,
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- EMAIL (VALIDAT)
    -- ─────────────────────────────────────────────────────────────────────────
    email VARCHAR(255),
    email_normalized VARCHAR(255) GENERATED ALWAYS AS (LOWER(TRIM(email))) STORED,
    email_valid BOOLEAN,
    email_validation_date TIMESTAMPTZ,
    email_validation_source VARCHAR(30), -- 'zerobounce', 'smtp', 'hunter'
    email_deliverability VARCHAR(20), -- 'deliverable', 'risky', 'undeliverable'
    email_provider VARCHAR(50), -- 'gmail', 'yahoo', 'corporate', 'other'
    email_catch_all BOOLEAN,
    email_role_based BOOLEAN, -- info@, contact@, etc.
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- TELEFON (VALIDAT, FORMAT E.164)
    -- ─────────────────────────────────────────────────────────────────────────
    telefon VARCHAR(20),
    telefon_normalized VARCHAR(20), -- Format E.164: +40721123456
    telefon_valid BOOLEAN,
    telefon_validation_date TIMESTAMPTZ,
    telefon_carrier VARCHAR(50), -- Vodafone, Orange, Telekom, Digi
    telefon_type VARCHAR(20), -- mobile, landline, voip
    
    telefon_secundar VARCHAR(20),
    
    -- WhatsApp
    whatsapp_number VARCHAR(20),
    whatsapp_available BOOLEAN,
    whatsapp_verified_at TIMESTAMPTZ,
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- PROFESIONAL
    -- ─────────────────────────────────────────────────────────────────────────
    functie VARCHAR(100),
    functie_normalizata VARCHAR(100),
    departament VARCHAR(50),
    seniority VARCHAR(30), -- 'c_level', 'director', 'manager', 'staff'
    decision_maker BOOLEAN,
    
    -- Social
    linkedin_url VARCHAR(500),
    linkedin_verified BOOLEAN,
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- SURSĂ ȘI GDPR
    -- ─────────────────────────────────────────────────────────────────────────
    data_source VARCHAR(50) NOT NULL,
    -- 'public_register', 'website_scrape', 'linkedin', 'hunter', 'manual', 'webhook'
    
    legal_basis VARCHAR(30) DEFAULT 'legitimate_interest',
    -- 'consent', 'legitimate_interest', 'contract', 'legal_obligation'
    
    lia_documented BOOLEAN DEFAULT FALSE,
    consent_date TIMESTAMPTZ,
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- QUALITY ȘI ENRICHMENT
    -- ─────────────────────────────────────────────────────────────────────────
    completeness_score INTEGER DEFAULT 0,
    enrichment_status VARCHAR(30) DEFAULT 'pending',
    enrichment_sources VARCHAR(50)[] DEFAULT '{}',
    
    -- Primary contact flag
    is_primary_contact BOOLEAN DEFAULT FALSE,
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- TIMESTAMPS
    -- ─────────────────────────────────────────────────────────────────────────
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indecși
CREATE INDEX idx_silver_contacts_tenant ON silver_contacts(tenant_id);
CREATE INDEX idx_silver_contacts_company ON silver_contacts(company_id);
CREATE UNIQUE INDEX idx_silver_contacts_email_tenant 
ON silver_contacts(tenant_id, email_normalized) 
WHERE email_normalized IS NOT NULL;
CREATE INDEX idx_silver_contacts_phone 
ON silver_contacts(telefon_normalized) 
WHERE telefon_normalized IS NOT NULL;
CREATE INDEX idx_silver_contacts_primary 
ON silver_contacts(company_id, is_primary_contact) 
WHERE is_primary_contact = TRUE;

-- RLS
ALTER TABLE silver_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_silver_contacts ON silver_contacts
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

---

### 2.5 silver_enrichment_log (Audit Trail Enrichment)

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- TABEL: silver_enrichment_log
-- SCOP: Log detaliat al tuturor operațiunilor de enrichment
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE silver_enrichment_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Entity reference
    entity_type VARCHAR(30) NOT NULL, -- 'company', 'contact'
    entity_id UUID NOT NULL,
    
    -- Enrichment details
    source VARCHAR(50) NOT NULL,
    -- 'anaf_fiscal', 'anaf_tva', 'termene_balance', 'termene_score', 
    -- 'hunter_email', 'zerobounce', 'nominatim', 'scrape'
    
    operation VARCHAR(30) NOT NULL,
    -- 'fetch', 'validate', 'enrich', 'geocode', 'score'
    
    -- Request/Response
    request_payload JSONB,
    response_payload JSONB,
    
    -- Result
    status VARCHAR(20) NOT NULL,
    -- 'success', 'partial', 'failed', 'skipped', 'rate_limited'
    
    error_message TEXT,
    error_code VARCHAR(50),
    
    -- Changes made
    fields_updated TEXT[],
    previous_values JSONB,
    new_values JSONB,
    
    -- Correlation
    correlation_id UUID,
    job_id VARCHAR(255),
    
    -- Performance
    duration_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indecși (optimizat pentru queries frecvente)
CREATE INDEX idx_silver_enrich_log_entity 
ON silver_enrichment_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_silver_enrich_log_source 
ON silver_enrichment_log(source, status, created_at DESC);
CREATE INDEX idx_silver_enrich_log_correlation 
ON silver_enrichment_log(correlation_id);
CREATE INDEX idx_silver_enrich_log_job 
ON silver_enrichment_log(job_id);

-- Partition by month pentru performance (opțional pentru volume mari)
-- CREATE TABLE silver_enrichment_log_y2026m01 PARTITION OF silver_enrichment_log
-- FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- RLS
ALTER TABLE silver_enrichment_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_enrich_log ON silver_enrichment_log
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

---

### 2.6 silver_dedup_candidates (Candidați Deduplicare)

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- TABEL: silver_dedup_candidates
-- SCOP: Perechi candidate pentru deduplicare fuzzy (HITL review)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE silver_dedup_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Pair references
    company_a_id UUID NOT NULL REFERENCES silver_companies(id),
    company_b_id UUID NOT NULL REFERENCES silver_companies(id),
    
    -- Similarity scores
    name_similarity DECIMAL(5, 4), -- Jaro-Winkler score
    address_similarity DECIMAL(5, 4),
    cui_match BOOLEAN,
    phone_match BOOLEAN,
    
    overall_confidence DECIMAL(5, 4) NOT NULL,
    
    -- Matching details
    matching_fields JSONB,
    -- {"name": 0.92, "address": 0.85, "phone": true}
    
    -- Decision
    status VARCHAR(30) DEFAULT 'pending',
    -- 'pending', 'auto_merged', 'hitl_review', 'confirmed_duplicate', 'not_duplicate'
    
    decided_by UUID REFERENCES users(id),
    decision_reason TEXT,
    decided_at TIMESTAMPTZ,
    
    -- Merge result
    master_company_id UUID REFERENCES silver_companies(id),
    merged_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- UNIQUE constraint pentru a evita perechi duplicate
CREATE UNIQUE INDEX idx_silver_dedup_pair 
ON silver_dedup_candidates(
    tenant_id, 
    LEAST(company_a_id, company_b_id), 
    GREATEST(company_a_id, company_b_id)
);

CREATE INDEX idx_silver_dedup_pending 
ON silver_dedup_candidates(tenant_id, status, overall_confidence DESC)
WHERE status IN ('pending', 'hitl_review');

-- RLS
ALTER TABLE silver_dedup_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_dedup ON silver_dedup_candidates
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

---

## 3. FUNCȚII SILVER

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCȚIE: Calculare completeness score
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION silver_compute_completeness(company silver_companies)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    total_fields INTEGER := 20;
    filled_fields INTEGER := 0;
BEGIN
    -- Core fields (obligatorii)
    IF company.cui IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.denumire IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.adresa_completa IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.judet IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.localitate IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    
    -- Fiscal fields
    IF company.status_firma IS NOT NULL AND company.status_firma != 'UNKNOWN' THEN filled_fields := filled_fields + 1; END IF;
    IF company.platitor_tva IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.cod_caen_principal IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.data_inregistrare IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    
    -- Financial fields
    IF company.cifra_afaceri IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.profit_net IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.numar_angajati IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.an_bilant IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    
    -- Geo fields
    IF company.latitude IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.longitude IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.cod_siruta IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    
    -- Risk fields
    IF company.scor_risc_termene IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.categorie_risc IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    
    -- e-Factura
    IF company.inregistrat_e_factura IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    
    -- Nr reg com
    IF company.nr_reg_com IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    
    score := (filled_fields::DECIMAL / total_fields * 100)::INTEGER;
    RETURN score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCȚIE: Statistici Silver pentru Dashboard
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION silver_get_stats(p_tenant_id UUID)
RETURNS TABLE(
    total_companies BIGINT,
    validated_companies BIGINT,
    enriched_companies BIGINT,
    eligible_for_gold BIGINT,
    promoted_to_gold BIGINT,
    pending_dedup_review BIGINT,
    avg_quality_score DECIMAL,
    avg_completeness DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE cui_validated = TRUE)::BIGINT,
        COUNT(*) FILTER (WHERE enrichment_status = 'complete')::BIGINT,
        COUNT(*) FILTER (WHERE promotion_status = 'eligible')::BIGINT,
        COUNT(*) FILTER (WHERE promotion_status = 'promoted')::BIGINT,
        (SELECT COUNT(*) FROM silver_dedup_candidates d 
         WHERE d.tenant_id = p_tenant_id AND d.status = 'hitl_review')::BIGINT,
        AVG(total_quality_score)::DECIMAL(5,2),
        AVG(completeness_score)::DECIMAL(5,2)
    FROM silver_companies
    WHERE tenant_id = p_tenant_id AND is_master_record = TRUE;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. GRANT-URI SILVER

```sql
-- Permisiuni pentru aplicație
GRANT SELECT, INSERT, UPDATE, DELETE ON silver_companies TO cerniq_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON silver_contacts TO cerniq_app;
GRANT SELECT, INSERT ON silver_enrichment_log TO cerniq_app;
GRANT SELECT, INSERT, UPDATE ON silver_dedup_candidates TO cerniq_app;

-- Funcții
GRANT EXECUTE ON FUNCTION silver_compute_completeness(silver_companies) TO cerniq_app;
GRANT EXECUTE ON FUNCTION silver_get_stats(UUID) TO cerniq_app;
```

---

**Document generat:** 15 Ianuarie 2026
**Total tabele Silver:** 4
**Conformitate:** Master Spec v1.2, ADR-0043 (Multi-tenant)
