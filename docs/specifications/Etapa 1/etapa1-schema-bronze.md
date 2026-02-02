# CERNIQ.APP — ETAPA 1: SCHEMA DATABASE BRONZE LAYER

## Tabele, Indecși, Constraints, Funcții

### Versiunea 1.0 | 15 Ianuarie 2026

---

## 1. OVERVIEW BRONZE LAYER

Bronze Layer este **zona de aterizare** pentru toate datele brute din surse multiple. Caracteristici fundamentale:

- **Append-only**: Nu se permite UPDATE sau DELETE
- **Imuabil**: Datele rămân nemodificate
- **Raw Format**: Păstrează payload-ul original exact cum a fost primit
- **Multi-tenant**: Izolare completă prin RLS

---

## 2. TABELE BRONZE

### 2.1 bronze_contacts (Tabel Principal)

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- TABEL: bronze_contacts
-- SCOP: Stocare date brute contacte din toate sursele
-- LAYER: Bronze (append-only, immutable)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE bronze_contacts (
    -- ─────────────────────────────────────────────────────────────────────────
    -- IDENTIFICARE
    -- ─────────────────────────────────────────────────────────────────────────
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- PAYLOAD BRUT (NEMODIFICAT)
    -- ─────────────────────────────────────────────────────────────────────────
    raw_payload JSONB NOT NULL,
    -- Exemplu payload CSV:
    -- {
    --   "denumire": "AGRO FARM SRL",
    --   "cui": "12345678",
    --   "adresa": "Str. Principala Nr. 10, Sat X, Com. Y, Jud. Braila",
    --   "telefon": "0721123456",
    --   "email": "contact@agrofarm.ro"
    -- }
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- METADATA SURSĂ
    -- ─────────────────────────────────────────────────────────────────────────
    source_type VARCHAR(30) NOT NULL 
        CHECK (source_type IN ('csv_import', 'webhook', 'scrape', 'manual', 'api', 'excel_import')),
    source_identifier VARCHAR(500) NOT NULL,
    -- CSV: filename + row number
    -- Webhook: endpoint URL + request ID
    -- Scrape: source URL + timestamp
    -- Manual: user_id + form_id
    -- API: endpoint + request_id
    
    source_metadata JSONB DEFAULT '{}',
    -- {
    --   "filename": "import_2026_01_15.csv",
    --   "row_number": 42,
    --   "sheet_name": "Contacts",
    --   "import_batch_id": "uuid"
    -- }
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- DEDUPLICARE (EXACT MATCH)
    -- ─────────────────────────────────────────────────────────────────────────
    content_hash VARCHAR(64) NOT NULL,
    -- SHA-256 hash al raw_payload pentru detectare duplicate exacte
    -- Calculat: sha256(jsonb_build_object('n', lower(name), 'c', cui, 'p', phone)::text)
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- IDENTIFICATORI EXTRAȘI (PENTRU INDEXARE RAPIDĂ)
    -- ─────────────────────────────────────────────────────────────────────────
    extracted_cui VARCHAR(12),
    -- Extras din raw_payload pentru indexare, NULL dacă nu există
    
    extracted_email VARCHAR(255),
    extracted_phone VARCHAR(20),
    extracted_name VARCHAR(255),
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- PROCESARE STATUS
    -- ─────────────────────────────────────────────────────────────────────────
    processing_status VARCHAR(30) DEFAULT 'pending'
        CHECK (processing_status IN ('pending', 'processing', 'promoted', 'rejected', 'error')),
    processing_error TEXT,
    promoted_to_silver_id UUID,
    promoted_at TIMESTAMPTZ,
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- FLAGS
    -- ─────────────────────────────────────────────────────────────────────────
    do_not_process BOOLEAN DEFAULT FALSE,
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of_id UUID REFERENCES bronze_contacts(id),
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- TIMESTAMPS (APPEND-ONLY: DOAR created_at)
    -- ─────────────────────────────────────────────────────────────────────────
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    
    -- NOTĂ: NU există updated_at - Bronze este IMUABIL
);

-- Comentariu tabel
COMMENT ON TABLE bronze_contacts IS 
'Bronze layer - raw contact data ingestion. IMMUTABLE - no updates allowed.';
```

### 2.2 bronze_contacts Indecși

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- INDECȘI bronze_contacts
-- ═══════════════════════════════════════════════════════════════════════════

-- Index principal pentru tenant isolation
CREATE INDEX idx_bronze_contacts_tenant 
ON bronze_contacts(tenant_id);

-- Index pentru deduplicare
CREATE UNIQUE INDEX idx_bronze_contacts_hash_unique 
ON bronze_contacts(tenant_id, content_hash) 
WHERE is_duplicate = FALSE;

-- Index pentru procesare queue
CREATE INDEX idx_bronze_contacts_pending 
ON bronze_contacts(tenant_id, processing_status, created_at) 
WHERE processing_status = 'pending';

-- Index pentru CUI lookup
CREATE INDEX idx_bronze_contacts_cui 
ON bronze_contacts(tenant_id, extracted_cui) 
WHERE extracted_cui IS NOT NULL;

-- Index pentru email lookup
CREATE INDEX idx_bronze_contacts_email 
ON bronze_contacts(tenant_id, extracted_email) 
WHERE extracted_email IS NOT NULL;

-- Index pentru source tracking
CREATE INDEX idx_bronze_contacts_source 
ON bronze_contacts(tenant_id, source_type, created_at DESC);

-- Index GIN pentru căutare în raw_payload
CREATE INDEX idx_bronze_contacts_payload_gin 
ON bronze_contacts USING GIN (raw_payload);

-- Index pentru promoted tracking
CREATE INDEX idx_bronze_contacts_promoted 
ON bronze_contacts(promoted_to_silver_id) 
WHERE promoted_to_silver_id IS NOT NULL;
```

### 2.3 bronze_contacts RLS & Triggers

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE bronze_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bronze_contacts FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_bronze_contacts ON bronze_contacts
FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER: PREVENT MODIFICATION (IMMUTABILITY)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION bronze_prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
    -- Permitem doar UPDATE pe câmpuri de procesare
    IF TG_OP = 'UPDATE' THEN
        -- Verificăm că raw_payload nu s-a modificat
        IF OLD.raw_payload IS DISTINCT FROM NEW.raw_payload THEN
            RAISE EXCEPTION 'Bronze raw_payload is immutable';
        END IF;
        IF OLD.content_hash IS DISTINCT FROM NEW.content_hash THEN
            RAISE EXCEPTION 'Bronze content_hash is immutable';
        END IF;
        IF OLD.source_type IS DISTINCT FROM NEW.source_type THEN
            RAISE EXCEPTION 'Bronze source_type is immutable';
        END IF;
        IF OLD.source_identifier IS DISTINCT FROM NEW.source_identifier THEN
            RAISE EXCEPTION 'Bronze source_identifier is immutable';
        END IF;
        -- Permitem update doar pentru processing_status, promoted_to_silver_id, etc.
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Bronze layer does not allow DELETE. Use do_not_process flag.';
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bronze_contacts_immutable
BEFORE UPDATE OR DELETE ON bronze_contacts
FOR EACH ROW
EXECUTE FUNCTION bronze_prevent_modification();

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER: AUTO-EXTRACT IDENTIFIERS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION bronze_extract_identifiers()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract CUI
    NEW.extracted_cui := COALESCE(
        NEW.raw_payload->>'cui',
        NEW.raw_payload->>'CUI',
        NEW.raw_payload->>'cod_fiscal',
        regexp_replace(NEW.raw_payload->>'cui_ro', '^RO', '', 'i')
    );
    
    -- Extract Email
    NEW.extracted_email := LOWER(COALESCE(
        NEW.raw_payload->>'email',
        NEW.raw_payload->>'Email',
        NEW.raw_payload->>'EMAIL',
        NEW.raw_payload->>'e_mail'
    ));
    
    -- Extract Phone (normalize)
    NEW.extracted_phone := regexp_replace(
        COALESCE(
            NEW.raw_payload->>'telefon',
            NEW.raw_payload->>'phone',
            NEW.raw_payload->>'tel',
            NEW.raw_payload->>'mobil'
        ),
        '[^0-9+]', '', 'g'
    );
    
    -- Extract Name
    NEW.extracted_name := COALESCE(
        NEW.raw_payload->>'denumire',
        NEW.raw_payload->>'name',
        NEW.raw_payload->>'company_name',
        NEW.raw_payload->>'firma'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bronze_contacts_extract
BEFORE INSERT ON bronze_contacts
FOR EACH ROW
EXECUTE FUNCTION bronze_extract_identifiers();
```

---

### 2.4 bronze_import_batches (Tracking Import-uri)

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- TABEL: bronze_import_batches
-- SCOP: Tracking batch-uri de import pentru audit și rollback
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE bronze_import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Informații import
    source_type VARCHAR(30) NOT NULL,
    filename VARCHAR(500),
    file_size_bytes BIGINT,
    file_checksum VARCHAR(64),
    
    -- Statistici
    total_rows INTEGER NOT NULL DEFAULT 0,
    processed_rows INTEGER NOT NULL DEFAULT 0,
    success_rows INTEGER NOT NULL DEFAULT 0,
    error_rows INTEGER NOT NULL DEFAULT 0,
    duplicate_rows INTEGER NOT NULL DEFAULT 0,
    
    -- Status
    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    error_message TEXT,
    
    -- User tracking
    imported_by UUID REFERENCES users(id),
    
    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indecși
CREATE INDEX idx_bronze_batches_tenant ON bronze_import_batches(tenant_id);
CREATE INDEX idx_bronze_batches_status ON bronze_import_batches(tenant_id, status);

-- RLS
ALTER TABLE bronze_import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_batches ON bronze_import_batches
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

---

### 2.5 bronze_webhooks (Webhook Ingestie)

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- TABEL: bronze_webhooks
-- SCOP: Log toate webhook-urile primite pentru audit și reprocessare
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE bronze_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Webhook metadata
    webhook_type VARCHAR(100) NOT NULL,
    source_ip INET,
    source_url VARCHAR(500),
    
    -- Headers și payload
    request_headers JSONB NOT NULL DEFAULT '{}',
    request_body JSONB NOT NULL,
    content_type VARCHAR(100),
    
    -- Signature verification
    signature_header VARCHAR(500),
    signature_valid BOOLEAN,
    
    -- Processing
    processing_status VARCHAR(30) DEFAULT 'pending',
    processed_contact_ids UUID[],
    error_message TEXT,
    
    -- Timestamps
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Indecși
CREATE INDEX idx_bronze_webhooks_tenant ON bronze_webhooks(tenant_id);
CREATE INDEX idx_bronze_webhooks_type ON bronze_webhooks(tenant_id, webhook_type);
CREATE INDEX idx_bronze_webhooks_pending ON bronze_webhooks(processing_status) 
WHERE processing_status = 'pending';

-- RLS
ALTER TABLE bronze_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_webhooks ON bronze_webhooks
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

---

### 2.6 bronze_scrape_results (Web Scraping)

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- TABEL: bronze_scrape_results
-- SCOP: Stocare rezultate web scraping pentru reprocessare
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE bronze_scrape_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Source
    source_url VARCHAR(2000) NOT NULL,
    source_domain VARCHAR(255) NOT NULL,
    scrape_type VARCHAR(50) NOT NULL,
    -- Tipuri: 'daj_list', 'anif_ouai', 'company_website', 'contact_page'
    
    -- Content
    raw_html TEXT,
    extracted_data JSONB NOT NULL,
    extraction_method VARCHAR(50), -- 'css_selector', 'xpath', 'ai_extraction'
    
    -- Quality
    confidence_score DECIMAL(5,4),
    validation_errors JSONB DEFAULT '[]',
    
    -- Processing
    processing_status VARCHAR(30) DEFAULT 'pending',
    promoted_contact_ids UUID[],
    
    -- Timestamps
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Indecși
CREATE INDEX idx_bronze_scrape_tenant ON bronze_scrape_results(tenant_id);
CREATE INDEX idx_bronze_scrape_domain ON bronze_scrape_results(source_domain);
CREATE INDEX idx_bronze_scrape_pending ON bronze_scrape_results(processing_status)
WHERE processing_status = 'pending';

-- RLS
ALTER TABLE bronze_scrape_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_scrape ON bronze_scrape_results
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

---

## 3. FUNCȚII UTILITARE BRONZE

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCȚIE: Calculare content hash
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION bronze_compute_content_hash(payload JSONB)
RETURNS VARCHAR(64) AS $$
DECLARE
    normalized_payload JSONB;
    hash_input TEXT;
BEGIN
    -- Normalizare: lowercase, trim, sortare keys
    normalized_payload := jsonb_build_object(
        'n', LOWER(TRIM(COALESCE(payload->>'denumire', payload->>'name', ''))),
        'c', REGEXP_REPLACE(COALESCE(payload->>'cui', ''), '[^0-9]', '', 'g'),
        'p', REGEXP_REPLACE(COALESCE(payload->>'telefon', payload->>'phone', ''), '[^0-9]', '', 'g'),
        'e', LOWER(TRIM(COALESCE(payload->>'email', '')))
    );
    
    hash_input := normalized_payload::text;
    
    -- PostgreSQL 14+ native sha256
    RETURN encode(sha256(hash_input::bytea), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCȚIE: Verificare duplicat înainte de insert
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION bronze_check_duplicate(
    p_tenant_id UUID,
    p_payload JSONB
)
RETURNS TABLE(is_duplicate BOOLEAN, existing_id UUID) AS $$
DECLARE
    v_hash VARCHAR(64);
BEGIN
    v_hash := bronze_compute_content_hash(p_payload);
    
    RETURN QUERY
    SELECT 
        TRUE,
        bc.id
    FROM bronze_contacts bc
    WHERE bc.tenant_id = p_tenant_id
      AND bc.content_hash = v_hash
      AND bc.is_duplicate = FALSE
    LIMIT 1;
    
    -- Dacă nu găsim nimic, returnăm FALSE
    IF NOT FOUND THEN
        is_duplicate := FALSE;
        existing_id := NULL;
        RETURN NEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCȚIE: Statistici Bronze pentru Dashboard
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION bronze_get_stats(p_tenant_id UUID)
RETURNS TABLE(
    total_contacts BIGINT,
    pending_contacts BIGINT,
    promoted_contacts BIGINT,
    rejected_contacts BIGINT,
    duplicate_contacts BIGINT,
    today_ingested BIGINT,
    avg_quality_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_contacts,
        COUNT(*) FILTER (WHERE processing_status = 'pending')::BIGINT,
        COUNT(*) FILTER (WHERE processing_status = 'promoted')::BIGINT,
        COUNT(*) FILTER (WHERE processing_status = 'rejected')::BIGINT,
        COUNT(*) FILTER (WHERE is_duplicate = TRUE)::BIGINT,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::BIGINT,
        NULL::DECIMAL -- Quality score calculat în Silver
    FROM bronze_contacts
    WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. DATA RETENTION (CLEANUP)

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCȚIE: Cleanup Bronze vechi (30 zile retention)
-- Rulează zilnic via pg_cron
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION bronze_cleanup_old_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Arhivare înainte de ștergere (opțional)
    -- INSERT INTO bronze_contacts_archive SELECT * FROM bronze_contacts WHERE ...
    
    -- Ștergere contacte procesate mai vechi de 30 zile
    DELETE FROM bronze_contacts
    WHERE created_at < NOW() - INTERVAL '30 days'
      AND processing_status IN ('promoted', 'rejected')
    RETURNING 1 INTO deleted_count;
    
    -- Log cleanup
    INSERT INTO system_logs (event_type, details)
    VALUES ('bronze_cleanup', jsonb_build_object('deleted_count', deleted_count));
    
    RETURN COALESCE(deleted_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Programare cleanup (necesită pg_cron extension)
-- SELECT cron.schedule('bronze-cleanup-daily', '0 3 * * *', 'SELECT bronze_cleanup_old_data()');
```

---

## 5. GRANT-URI ȘI PERMISIUNI

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- PERMISIUNI PENTRU APLICAȚIE
-- ═══════════════════════════════════════════════════════════════════════════

-- Grant pentru user aplicație
GRANT SELECT, INSERT ON bronze_contacts TO cerniq_app;
GRANT UPDATE (processing_status, processing_error, promoted_to_silver_id, promoted_at, do_not_process, is_duplicate, duplicate_of_id) 
ON bronze_contacts TO cerniq_app;
-- NU acordăm DELETE - Bronze este immutable

GRANT SELECT, INSERT, UPDATE ON bronze_import_batches TO cerniq_app;
GRANT SELECT, INSERT, UPDATE ON bronze_webhooks TO cerniq_app;
GRANT SELECT, INSERT, UPDATE ON bronze_scrape_results TO cerniq_app;

-- Grant pentru funcții
GRANT EXECUTE ON FUNCTION bronze_compute_content_hash(JSONB) TO cerniq_app;
GRANT EXECUTE ON FUNCTION bronze_check_duplicate(UUID, JSONB) TO cerniq_app;
GRANT EXECUTE ON FUNCTION bronze_get_stats(UUID) TO cerniq_app;
```

---

**Document generat:** 15 Ianuarie 2026
**Total tabele Bronze:** 4
**Conformitate:** Master Spec v1.2, ADR-0044 (Immutability)
