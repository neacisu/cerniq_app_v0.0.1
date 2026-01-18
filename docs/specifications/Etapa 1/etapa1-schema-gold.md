# CERNIQ.APP — ETAPA 1: SCHEMA DATABASE GOLD LAYER

## Tabele, Indecși, Constraints, Funcții

### Versiunea 1.0 | 15 Ianuarie 2026

---

## 1. OVERVIEW GOLD LAYER

Gold Layer conține contacte **complet îmbogățite și ready-for-outreach**. Caracteristici:

- **Complete**: Toate câmpurile critice populate și validate
- **Scored**: Lead scoring și risk scoring aplicat
- **FSM Ready**: Stare engagement tracking
- **Outreach Ready**: Date suficiente pentru campanii multi-canal

---

## 2. TABELE GOLD

### 2.1 gold_companies (Companii Ready-for-Outreach)

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- TABEL: gold_companies
-- SCOP: Companii complet îmbogățite, gata pentru outreach și vânzare
-- LAYER: Gold (operational, ready-for-sales)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE gold_companies (
    -- ─────────────────────────────────────────────────────────────────────────
    -- IDENTIFICARE ȘI TRASABILITATE
    -- ─────────────────────────────────────────────────────────────────────────
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Legături layer-uri anterioare
    silver_id UUID UNIQUE REFERENCES silver_companies(id),
    bronze_ids UUID[] DEFAULT '{}', -- Multiple bronze sources posibile
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- SECȚIUNEA 1: IDENTIFICATORI ȘI DATE DE BAZĂ
    -- ─────────────────────────────────────────────────────────────────────────
    
    -- Identificatori unici
    cui VARCHAR(12) NOT NULL,
    cui_ro VARCHAR(14) GENERATED ALWAYS AS ('RO' || cui) STORED,
    nr_reg_com VARCHAR(20),
    iban_principal VARCHAR(34),
    
    -- Denumiri
    denumire VARCHAR(255) NOT NULL,
    denumire_comerciala VARCHAR(255),
    denumire_normalizata VARCHAR(255),
    
    -- Forma juridică
    forma_juridica VARCHAR(20),
    tip_entitate VARCHAR(30),
    -- 'FIRMA', 'FERMA_PF', 'COOPERATIVA', 'OUAI', 'ASOCIATIE', 'GRUP_PRODUCATORI'
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- SECȚIUNEA 2: DATE JURIDICE ȘI FISCALE (VALIDATE ANAF)
    -- ─────────────────────────────────────────────────────────────────────────
    
    status_firma VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',
    data_inregistrare DATE NOT NULL,
    data_radiere DATE,
    
    -- TVA
    platitor_tva BOOLEAN NOT NULL DEFAULT FALSE,
    data_inceput_tva DATE,
    data_sfarsit_tva DATE,
    tva_la_incasare BOOLEAN DEFAULT FALSE,
    split_tva BOOLEAN DEFAULT FALSE,
    
    -- e-Factura
    inregistrat_e_factura BOOLEAN NOT NULL DEFAULT FALSE,
    data_inregistrare_e_factura DATE,
    
    -- CAEN
    cod_caen_principal VARCHAR(6) NOT NULL,
    denumire_caen VARCHAR(255),
    coduri_caen_secundare VARCHAR(6)[] DEFAULT '{}',
    
    -- Clasificare agricolă (din CAEN)
    is_agricultural BOOLEAN GENERATED ALWAYS AS (
        cod_caen_principal LIKE '01%' OR
        cod_caen_principal LIKE '02%' OR
        cod_caen_principal LIKE '03%'
    ) STORED,
    
    -- Capital social
    capital_social DECIMAL(15, 2),
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- SECȚIUNEA 3: DATE AGRICOLE SPECIFICE
    -- ─────────────────────────────────────────────────────────────────────────
    
    -- Suprafețe
    suprafata_totala_ha DECIMAL(10, 2),
    suprafata_arendata_ha DECIMAL(10, 2),
    suprafata_proprie_ha DECIMAL(10, 2),
    suprafata_irigata_ha DECIMAL(10, 2),
    
    -- Clasificare agricolă
    tip_exploatatie VARCHAR(30), -- 'VEGETALA', 'ANIMALA', 'MIXTA', 'SERVICII'
    categorie_dimensiune VARCHAR(20),
    -- 'SUBZISTENTA' (<2ha), 'MICA' (2-50ha), 'MEDIE' (50-250ha), 'MARE' (>250ha)
    
    -- Culturi principale (JSONB pentru flexibilitate)
    culturi_principale JSONB DEFAULT '[]',
    -- [{"tip": "PORUMB", "suprafata_ha": 150, "procent": 60}, ...]
    
    -- Animale (pentru ferme zootehnice)
    efectiv_animale JSONB DEFAULT '{}',
    total_lsu DECIMAL(10, 2), -- Livestock Units
    
    -- Echipamente
    echipamente_agricole JSONB DEFAULT '[]',
    capacitate_stocare_tone DECIMAL(10, 2),
    sistem_irigare VARCHAR(50),
    
    -- Subvenții APIA
    subventii_apia_ultimul_an DECIMAL(15, 2),
    tip_subventii VARCHAR(100)[] DEFAULT '{}',
    
    -- Certificări
    certificat_eco BOOLEAN DEFAULT FALSE,
    certificat_globalgap BOOLEAN DEFAULT FALSE,
    alte_certificari VARCHAR(100)[] DEFAULT '{}',
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- SECȚIUNEA 4: LOCAȚIE ȘI GEOGRAFIE (PostGIS)
    -- ─────────────────────────────────────────────────────────────────────────
    
    -- Adresa completă
    adresa_completa TEXT NOT NULL,
    strada VARCHAR(200),
    numar VARCHAR(20),
    cod_postal VARCHAR(10),
    localitate VARCHAR(100) NOT NULL,
    comuna VARCHAR(100),
    judet VARCHAR(50) NOT NULL,
    judet_cod VARCHAR(2) NOT NULL,
    cod_siruta INTEGER,
    
    -- Coordonate
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    location_geography GEOGRAPHY(POINT, 4326) NOT NULL,
    
    -- Zone agricole
    zona_agricola VARCHAR(50),
    bazin_hidrografic VARCHAR(100),
    
    -- Proximitate calculată
    nearest_depot_km DECIMAL(8, 2),
    nearest_competitor_km DECIMAL(8, 2),
    zona_livrare VARCHAR(50),
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- SECȚIUNEA 5: DATE FINANCIARE ȘI CREDIT SCORING
    -- ─────────────────────────────────────────────────────────────────────────
    
    -- Bilanț (din Termene.ro)
    cifra_afaceri DECIMAL(15, 2),
    profit_net DECIMAL(15, 2),
    active_totale DECIMAL(15, 2),
    datorii_totale DECIMAL(15, 2),
    capitaluri_proprii DECIMAL(15, 2),
    numar_angajati INTEGER,
    an_bilant INTEGER,
    
    -- Indicatori financiari calculați
    lichiditate_curenta DECIMAL(8, 4),
    grad_indatorare DECIMAL(8, 4),
    marja_profit DECIMAL(8, 4),
    
    -- Datorii la stat
    datorii_anaf DECIMAL(15, 2) DEFAULT 0,
    data_verificare_datorii DATE,
    
    -- Dosare juridice
    numar_dosare_actuale INTEGER DEFAULT 0,
    in_insolventa BOOLEAN DEFAULT FALSE,
    
    -- Risk scoring
    scor_risc_intern INTEGER, -- 0-100, calculat intern
    scor_risc_termene INTEGER, -- 0-100, din API
    categorie_risc VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    -- 'LOW' (0-30), 'MEDIUM' (31-60), 'HIGH' (61-100)
    
    -- Credit comercial
    limita_credit_calculata DECIMAL(15, 2),
    limita_credit_aprobata DECIMAL(15, 2),
    termen_plata_standard INTEGER DEFAULT 0,
    conditii_plata VARCHAR(30) DEFAULT 'RAMBURS',
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- SECȚIUNEA 6: LEAD SCORING ȘI ENGAGEMENT
    -- ─────────────────────────────────────────────────────────────────────────
    
    -- Lead scoring composite (0-100)
    lead_score INTEGER NOT NULL DEFAULT 0,
    fit_score INTEGER DEFAULT 0, -- ICP match
    engagement_score INTEGER DEFAULT 0, -- Activitate
    intent_score INTEGER DEFAULT 0, -- Semnal cumpărare
    
    -- Componente detaliate
    score_firmografic INTEGER DEFAULT 0,
    score_comportamental INTEGER DEFAULT 0,
    score_interes INTEGER DEFAULT 0,
    data_calcul_scor TIMESTAMPTZ,
    
    -- Engagement Stage FSM
    current_state VARCHAR(30) NOT NULL DEFAULT 'COLD',
    -- 'COLD', 'CONTACTED_WA', 'CONTACTED_EMAIL', 'CONTACTED_PHONE',
    -- 'WARM_REPLY', 'ENGAGED', 'NEGOTIATION', 'PROPOSAL', 
    -- 'CLOSING', 'CONVERTED', 'CHURNED', 'DEAD', 'DO_NOT_CONTACT'
    
    previous_state VARCHAR(30),
    state_changed_at TIMESTAMPTZ DEFAULT NOW(),
    state_history JSONB DEFAULT '[]',
    -- [{"state": "COLD", "entered_at": "...", "exited_at": "..."}]
    
    -- Timeline engagement
    data_prima_contactare TIMESTAMPTZ,
    data_ultima_interactiune TIMESTAMPTZ,
    numar_interactiuni_totale INTEGER DEFAULT 0,
    
    -- Preferințe comunicare (învățate)
    canal_preferat VARCHAR(20), -- 'WHATSAPP', 'EMAIL', 'TELEFON'
    ora_preferata_contact TIME,
    zile_preferate_contact INTEGER[], -- 1=Luni, 7=Duminică
    
    -- Metrici recente
    email_opens_30_zile INTEGER DEFAULT 0,
    email_clicks_30_zile INTEGER DEFAULT 0,
    wa_messages_sent_30_zile INTEGER DEFAULT 0,
    wa_replies_30_zile INTEGER DEFAULT 0,
    calls_30_zile INTEGER DEFAULT 0,
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- SECȚIUNEA 7: RELAȚII ȘI ASOCIERI
    -- ─────────────────────────────────────────────────────────────────────────
    
    -- Acționari și administratori
    actionari JSONB DEFAULT '[]',
    administratori JSONB DEFAULT '[]',
    
    -- Apartenența la structuri
    membru_ouai BOOLEAN DEFAULT FALSE,
    ouai_id UUID,
    ouai_nume VARCHAR(200),
    
    membru_cooperativa BOOLEAN DEFAULT FALSE,
    cooperativa_id UUID,
    cooperativa_nume VARCHAR(200),
    
    membru_grup_producatori BOOLEAN DEFAULT FALSE,
    grup_producatori_id UUID,
    
    asociatii_profesionale VARCHAR(100)[] DEFAULT '{}',
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- SECȚIUNEA 8: GDPR ȘI PREFERINȚE COMUNICARE
    -- ─────────────────────────────────────────────────────────────────────────
    
    gdpr_legal_basis VARCHAR(30) DEFAULT 'LEGITIMATE_INTEREST',
    gdpr_lia_documentat BOOLEAN DEFAULT TRUE,
    gdpr_data_lia DATE,
    
    -- Consimțământ granular
    consent_email_marketing BOOLEAN DEFAULT TRUE,
    consent_whatsapp BOOLEAN DEFAULT TRUE,
    consent_telefon BOOLEAN DEFAULT TRUE,
    consent_date TIMESTAMPTZ,
    
    -- Opt-out
    do_not_contact BOOLEAN DEFAULT FALSE,
    do_not_email BOOLEAN DEFAULT FALSE,
    do_not_call BOOLEAN DEFAULT FALSE,
    do_not_whatsapp BOOLEAN DEFAULT FALSE,
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- SECȚIUNEA 9: AI/ML FEATURES
    -- ─────────────────────────────────────────────────────────────────────────
    
    -- Embedding pentru căutare semantică
    embedding VECTOR(1536), -- pgvector
    embedding_updated_at TIMESTAMPTZ,
    
    -- Segmente ML
    segment_ai VARCHAR(50),
    cluster_id INTEGER,
    
    -- Predicții
    probabilitate_conversie DECIMAL(5, 4),
    probabilitate_churn DECIMAL(5, 4),
    predicted_ltv DECIMAL(15, 2),
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- SECȚIUNEA 10: POST-VÂNZARE (pentru tracking ulterior)
    -- ─────────────────────────────────────────────────────────────────────────
    
    customer_status VARCHAR(20) DEFAULT 'PROSPECT',
    -- 'PROSPECT', 'LEAD', 'OPPORTUNITY', 'CUSTOMER', 'CHURNED'
    
    data_prima_comanda DATE,
    data_ultima_comanda DATE,
    valoare_totala_comenzi DECIMAL(15, 2) DEFAULT 0,
    numar_comenzi INTEGER DEFAULT 0,
    average_order_value DECIMAL(15, 2),
    
    -- Owner assignment
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ,
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- TIMESTAMPS ȘI VERSIONING
    -- ─────────────────────────────────────────────────────────────────────────
    
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE gold_companies IS 
'Gold layer - fully enriched companies ready for sales outreach and automation.';
```

### 2.2 gold_companies Indecși

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- INDECȘI gold_companies
-- ═══════════════════════════════════════════════════════════════════════════

-- UNIQUE per tenant
CREATE UNIQUE INDEX idx_gold_companies_cui_tenant 
ON gold_companies(tenant_id, cui);

-- Tenant isolation
CREATE INDEX idx_gold_companies_tenant 
ON gold_companies(tenant_id);

-- Lead scoring pentru prioritizare outreach
CREATE INDEX idx_gold_companies_lead_score 
ON gold_companies(tenant_id, lead_score DESC, current_state)
WHERE do_not_contact = FALSE;

-- FSM state pentru workflow
CREATE INDEX idx_gold_companies_state 
ON gold_companies(tenant_id, current_state, state_changed_at);

-- Geographic pentru proximity queries
CREATE INDEX idx_gold_companies_geo 
ON gold_companies USING GIST (location_geography);

-- Judet pentru segmentare regională
CREATE INDEX idx_gold_companies_judet 
ON gold_companies(tenant_id, judet_cod);

-- Risk scoring pentru credit decisions
CREATE INDEX idx_gold_companies_risk 
ON gold_companies(tenant_id, categorie_risc, scor_risc_intern);

-- Agricultural filtering
CREATE INDEX idx_gold_companies_agri 
ON gold_companies(tenant_id, is_agricultural, categorie_dimensiune)
WHERE is_agricultural = TRUE;

-- Owner assignment
CREATE INDEX idx_gold_companies_owner 
ON gold_companies(assigned_to, current_state)
WHERE assigned_to IS NOT NULL;

-- Full-text search pe denumire
CREATE INDEX idx_gold_companies_name_fts 
ON gold_companies USING GIN (to_tsvector('romanian', denumire));

-- pgvector pentru similarity search
CREATE INDEX idx_gold_companies_embedding 
ON gold_companies USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Composite pentru dashboard queries
CREATE INDEX idx_gold_companies_dashboard 
ON gold_companies(tenant_id, customer_status, current_state, lead_score DESC);
```

### 2.3 gold_companies Constraints și Triggers

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- CONSTRAINTS
-- ═══════════════════════════════════════════════════════════════════════════

-- CUI format
ALTER TABLE gold_companies 
ADD CONSTRAINT chk_gold_cui_format 
CHECK (cui ~ '^\d{2,10}$');

-- Lead score range
ALTER TABLE gold_companies 
ADD CONSTRAINT chk_gold_lead_score 
CHECK (lead_score BETWEEN 0 AND 100);

-- Valid coordinates
ALTER TABLE gold_companies 
ADD CONSTRAINT chk_gold_coords 
CHECK (latitude BETWEEN 43.5 AND 48.5 AND longitude BETWEEN 20 AND 30);
-- Coordonate aproximative România

-- Valid state
ALTER TABLE gold_companies 
ADD CONSTRAINT chk_gold_state 
CHECK (current_state IN (
    'COLD', 'CONTACTED_WA', 'CONTACTED_EMAIL', 'CONTACTED_PHONE',
    'WARM_REPLY', 'ENGAGED', 'NEGOTIATION', 'PROPOSAL', 
    'CLOSING', 'CONVERTED', 'CHURNED', 'DEAD', 'DO_NOT_CONTACT'
));

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Auto-update timestamp
CREATE TRIGGER trg_gold_companies_timestamp
BEFORE UPDATE ON gold_companies
FOR EACH ROW
EXECUTE FUNCTION silver_update_timestamp(); -- Reuse funcția

-- FSM State transition logging
CREATE OR REPLACE FUNCTION gold_log_state_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.current_state IS DISTINCT FROM NEW.current_state THEN
        NEW.previous_state := OLD.current_state;
        NEW.state_changed_at := NOW();
        NEW.state_history := NEW.state_history || jsonb_build_object(
            'from_state', OLD.current_state,
            'to_state', NEW.current_state,
            'changed_at', NOW(),
            'changed_by', current_setting('app.current_user_id', true)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gold_companies_fsm
BEFORE UPDATE OF current_state ON gold_companies
FOR EACH ROW
EXECUTE FUNCTION gold_log_state_transition();

-- Auto-compute lead score composite
CREATE OR REPLACE FUNCTION gold_compute_lead_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.lead_score := LEAST(100, GREATEST(0,
        (COALESCE(NEW.fit_score, 0) * 0.40) +
        (COALESCE(NEW.engagement_score, 0) * 0.35) +
        (COALESCE(NEW.intent_score, 0) * 0.25)
    ))::INTEGER;
    NEW.data_calcul_scor := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gold_companies_score
BEFORE INSERT OR UPDATE OF fit_score, engagement_score, intent_score ON gold_companies
FOR EACH ROW
EXECUTE FUNCTION gold_compute_lead_score();

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE gold_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_companies FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_gold_companies ON gold_companies
FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

---

### 2.4 gold_contacts (Contacte Ready-for-Outreach)

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- TABEL: gold_contacts
-- SCOP: Persoane de contact validate, gata pentru comunicare directă
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE gold_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES gold_companies(id) ON DELETE CASCADE,
    silver_contact_id UUID REFERENCES silver_contacts(id),
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- IDENTITATE
    -- ─────────────────────────────────────────────────────────────────────────
    prenume VARCHAR(100),
    nume VARCHAR(100),
    nume_complet VARCHAR(200) GENERATED ALWAYS AS (
        TRIM(COALESCE(prenume, '') || ' ' || COALESCE(nume, ''))
    ) STORED,
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- CANALE CONTACT (VALIDATE)
    -- ─────────────────────────────────────────────────────────────────────────
    
    -- Email (verified deliverable)
    email VARCHAR(255),
    email_verified BOOLEAN NOT NULL DEFAULT TRUE,
    email_deliverability VARCHAR(20) NOT NULL DEFAULT 'deliverable',
    
    -- Telefon (format E.164, verified)
    telefon VARCHAR(20),
    telefon_verified BOOLEAN NOT NULL DEFAULT TRUE,
    telefon_type VARCHAR(20), -- mobile, landline
    
    -- WhatsApp
    whatsapp_number VARCHAR(20),
    whatsapp_verified BOOLEAN DEFAULT FALSE,
    whatsapp_opted_in BOOLEAN DEFAULT TRUE,
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- PROFESIONAL
    -- ─────────────────────────────────────────────────────────────────────────
    functie VARCHAR(100),
    departament VARCHAR(50),
    seniority VARCHAR(30),
    is_decision_maker BOOLEAN DEFAULT FALSE,
    is_primary_contact BOOLEAN DEFAULT FALSE,
    
    linkedin_url VARCHAR(500),
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- ENGAGEMENT TRACKING
    -- ─────────────────────────────────────────────────────────────────────────
    last_contacted_at TIMESTAMPTZ,
    last_responded_at TIMESTAMPTZ,
    total_messages_sent INTEGER DEFAULT 0,
    total_responses INTEGER DEFAULT 0,
    response_rate DECIMAL(5, 4) GENERATED ALWAYS AS (
        CASE WHEN total_messages_sent > 0 
        THEN total_responses::DECIMAL / total_messages_sent 
        ELSE 0 END
    ) STORED,
    
    -- Preferences learned
    preferred_channel VARCHAR(20),
    preferred_time TIME,
    language VARCHAR(10) DEFAULT 'ro',
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- GDPR
    -- ─────────────────────────────────────────────────────────────────────────
    consent_email BOOLEAN DEFAULT TRUE,
    consent_whatsapp BOOLEAN DEFAULT TRUE,
    consent_phone BOOLEAN DEFAULT TRUE,
    unsubscribed BOOLEAN DEFAULT FALSE,
    unsubscribed_at TIMESTAMPTZ,
    
    -- ─────────────────────────────────────────────────────────────────────────
    -- TIMESTAMPS
    -- ─────────────────────────────────────────────────────────────────────────
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indecși
CREATE INDEX idx_gold_contacts_tenant ON gold_contacts(tenant_id);
CREATE INDEX idx_gold_contacts_company ON gold_contacts(company_id);
CREATE UNIQUE INDEX idx_gold_contacts_email_tenant 
ON gold_contacts(tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_gold_contacts_whatsapp 
ON gold_contacts(whatsapp_number) WHERE whatsapp_number IS NOT NULL;
CREATE INDEX idx_gold_contacts_primary 
ON gold_contacts(company_id, is_primary_contact) WHERE is_primary_contact = TRUE;

-- RLS
ALTER TABLE gold_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_gold_contacts ON gold_contacts
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

---

### 2.5 gold_lead_journey (Event Log FSM)

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- TABEL: gold_lead_journey
-- SCOP: Event log pentru FSM transitions și acțiuni pe lead
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE gold_lead_journey (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES gold_companies(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES gold_contacts(id),
    
    -- Event type
    event_type VARCHAR(50) NOT NULL,
    -- 'STATE_CHANGE', 'EMAIL_SENT', 'EMAIL_OPENED', 'EMAIL_CLICKED',
    -- 'WA_SENT', 'WA_DELIVERED', 'WA_READ', 'WA_REPLY',
    -- 'CALL_MADE', 'CALL_ANSWERED', 'MEETING_SCHEDULED',
    -- 'PROPOSAL_SENT', 'PROPOSAL_VIEWED', 'ORDER_PLACED', 'CHURNED'
    
    -- State transition (for STATE_CHANGE events)
    from_state VARCHAR(30),
    to_state VARCHAR(30),
    
    -- Event details
    channel VARCHAR(20), -- 'email', 'whatsapp', 'phone', 'meeting', 'system'
    subject TEXT,
    content_preview TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    -- {"campaign_id": "...", "template_id": "...", "message_id": "..."}
    
    -- Actor
    performed_by UUID REFERENCES users(id),
    performed_by_type VARCHAR(20), -- 'user', 'system', 'automation'
    
    -- Correlation
    correlation_id UUID,
    
    -- Timestamps
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indecși
CREATE INDEX idx_gold_journey_company 
ON gold_lead_journey(company_id, occurred_at DESC);
CREATE INDEX idx_gold_journey_event 
ON gold_lead_journey(tenant_id, event_type, occurred_at DESC);
CREATE INDEX idx_gold_journey_correlation 
ON gold_lead_journey(correlation_id);

-- Partition by month pentru performance
-- CREATE TABLE gold_lead_journey_y2026m01 PARTITION OF gold_lead_journey ...

-- RLS
ALTER TABLE gold_lead_journey ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_journey ON gold_lead_journey
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

---

## 3. FUNCȚII GOLD

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCȚIE: Calculare Fit Score (ICP Match)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION gold_compute_fit_score(company gold_companies)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
BEGIN
    -- Size factor (max 30 points)
    IF company.categorie_dimensiune = 'MARE' THEN score := score + 30;
    ELSIF company.categorie_dimensiune = 'MEDIE' THEN score := score + 25;
    ELSIF company.categorie_dimensiune = 'MICA' THEN score := score + 15;
    ELSE score := score + 5;
    END IF;
    
    -- Agricultural factor (max 25 points)
    IF company.is_agricultural THEN score := score + 25;
    ELSIF company.cod_caen_principal LIKE '46%' THEN score := score + 15; -- Wholesale
    END IF;
    
    -- Financial health (max 25 points)
    IF company.categorie_risc = 'LOW' THEN score := score + 25;
    ELSIF company.categorie_risc = 'MEDIUM' THEN score := score + 15;
    ELSE score := score + 5;
    END IF;
    
    -- Geographic factor (max 10 points)
    IF company.judet_cod IN ('BV', 'CJ', 'TM', 'B', 'IS', 'CT') THEN
        score := score + 10; -- Premium regions
    ELSE
        score := score + 5;
    END IF;
    
    -- e-Factura bonus (max 10 points)
    IF company.inregistrat_e_factura THEN score := score + 10; END IF;
    
    RETURN LEAST(100, score);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCȚIE: Statistici Gold Dashboard
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION gold_get_dashboard_stats(p_tenant_id UUID)
RETURNS TABLE(
    total_leads BIGINT,
    cold_leads BIGINT,
    warm_leads BIGINT,
    hot_leads BIGINT,
    converted BIGINT,
    avg_lead_score DECIMAL,
    conversion_rate DECIMAL,
    leads_by_state JSONB,
    leads_by_region JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE current_state = 'COLD')::BIGINT,
        COUNT(*) FILTER (WHERE current_state IN ('WARM_REPLY', 'ENGAGED'))::BIGINT,
        COUNT(*) FILTER (WHERE current_state IN ('NEGOTIATION', 'PROPOSAL', 'CLOSING'))::BIGINT,
        COUNT(*) FILTER (WHERE current_state = 'CONVERTED')::BIGINT,
        AVG(lead_score)::DECIMAL(5,2),
        (COUNT(*) FILTER (WHERE current_state = 'CONVERTED')::DECIMAL / 
         NULLIF(COUNT(*), 0) * 100)::DECIMAL(5,2),
        jsonb_object_agg(current_state, state_count),
        jsonb_object_agg(judet_cod, region_count)
    FROM gold_companies
    CROSS JOIN LATERAL (
        SELECT current_state, COUNT(*) as state_count 
        FROM gold_companies g2 
        WHERE g2.tenant_id = p_tenant_id 
        GROUP BY current_state
    ) states
    CROSS JOIN LATERAL (
        SELECT judet_cod, COUNT(*) as region_count 
        FROM gold_companies g3 
        WHERE g3.tenant_id = p_tenant_id 
        GROUP BY judet_cod
    ) regions
    WHERE tenant_id = p_tenant_id
    GROUP BY states.current_state, states.state_count, regions.judet_cod, regions.region_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. GRANT-URI GOLD

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON gold_companies TO cerniq_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON gold_contacts TO cerniq_app;
GRANT SELECT, INSERT ON gold_lead_journey TO cerniq_app;

GRANT EXECUTE ON FUNCTION gold_compute_fit_score(gold_companies) TO cerniq_app;
GRANT EXECUTE ON FUNCTION gold_get_dashboard_stats(UUID) TO cerniq_app;
```

---

**Document generat:** 15 Ianuarie 2026
**Total tabele Gold:** 3
**Conformitate:** Master Spec v1.2, ADR-0039 (Quality Scoring)
