# Schema Completă Golden Contact pentru Cerniq.app

> **⚠️ VERSIUNE CORECTATĂ - ALINIATĂ CU MASTER SPEC v1.2**
>
> **Data corecției:** 11 Ianuarie 2026
>
> **Modificări față de versiunea originală:**
>
> - `shop_id` → `tenant_id` (naming canonic)
> - `cui UNIQUE` → `UNIQUE(tenant_id, cui)` (multi-tenant isolation)
> - Toate tabelele Silver/Gold au `tenant_id UUID NOT NULL`
>
> **REFERINȚĂ:** Acest document este SUBORDONAT `Cerniq_Master_Spec_Normativ_Complet.md` v1.2
> În caz de conflict, Master Spec CÂȘTIGĂ.

## 5.2 Politici de Securitate (RLS)

Implementăm **Row Level Security (RLS)** nativ în PostgreSQL pentru a garanta izolarea multi-tenant.

```sql
-- 1. Activare RLS pe tabele critice
ALTER TABLE silver_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_companies ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Tenant Isolation
-- Utilizatorul curent (app_user) trebuie să seteze session variable 'app.current_tenant'
CREATE POLICY tenant_isolation_policy ON gold_companies
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- 3. Policy: Service Role (Bypass)
-- Workerii au acces global (bypass RLS)
ALTER TABLE gold_companies FORCE ROW LEVEL SECURITY;
```

## Sumarul executiv și arhitectura Bronze → Silver → Golden

Cerniq.app este o platformă B2B de automatizare a vânzărilor pentru piața agricolă românească, targetând **2.86 milioane de ferme**, cu accent pe cele **29.000+ ferme comerciale** (peste 50 ha) și **25.000+ entități juridice** care controlează 54% din suprafața agricolă. Taxonomia contactelor urmează arhitectura **Medallion** (Bronze → Silver → Gold), unde fiecare nivel reprezintă o creștere în calitatea, completitudinea și valoarea operațională a datelor.

**Progresia strategică** a contactului transformă date brute, nevalidate, în "Golden Records" - contacte complet îmbogățite, validate și ready-for-outreach, capabile să susțină automatizarea completă a procesului de vânzare, de la primul contact până la emiterea facturii și înregistrarea în SPV.

---

## 1. STADIUL BRONZE: Ingestia Inițială

### 1.1 Definiție și scop

Stratul Bronze reprezintă **zona de aterizare** pentru toate datele brute, nevalidate. Este un strat **append-only și imuabil**, servind drept sursă de adevăr pentru orice reprocessare ulterioară. Datele intră în format original, fără transformări, păstrând trasabilitatea completă.

### 1.2 Surse de ingestie

| Sursă                   | Tip Date                               | Format      | Frecvență   |
|-------------------------|----------------------------------------|-------------|-------------|
| **ONRC/Recom**          | Date juridice societăți                | JSON/XML    | La cerere   |
| **Import manual**       | Liste prospecți                        | CSV/Excel   | Ad-hoc      |
| **Webhook-uri externe** | Evenimente timp real                   | JSON        | Real-time   |
| **Scraping**            | Site-uri Publice (B2B)                 | HTML parsed | Săptămânal  |

### 1.3 Câmpuri Bronze (Minime)

```json
{
  "bronze_contact": {
    "id": "UUID auto-generat",
    "raw_payload": "JSONB - date originale nemodificate",
    "source_type": "ENUM: import, webhook, scrape, manual, api",
    "source_identifier": "URL/filename/API endpoint",
    "ingestion_timestamp": "TIMESTAMPTZ",
    "tenant_id": "UUID - multi-tenant isolation (CANONIC - înlocuiește shop_id)"
  }
}
```

### 1.4 Validare Bronze (Minimală)

- Verificare format JSON valid
- Prezența cel puțin unui identificator (email SAU telefon SAU CUI)
- Deduplicare hash-based pentru prevenirea duplicatelor exacte
- Nu se efectuează transformări sau normalizări

### 1.5 Criterii de avansare Bronze → Silver

- Cel puțin un identificator unic validat (email deliverable SAU telefon valid format E.164 SAU CUI valid)
- Timestamp ingestie &lt; 30 zile (date fresh)
- Nu există flag de "do_not_process"

---

## 2. STADIUL SILVER: Date Curățate și Validate

### 2.1 Definiție și scop

Stratul Silver conține date **curățate, validate și normalizate**, reprezentând "viziunea enterprise" asupra contactelor. Aici se efectuează Entity Resolution, deduplicarea avansată și îmbogățirea inițială din surse externe.

### 2.2 Procese de transformare Bronze → Silver

1. **Normalizare**: Standardizare nume (capitalization), adrese (format SIRUTA), telefoane (E.164)
2. **Validare**: CUI (modulo 11), email (SMTP check), telefon (HLR lookup)
3. **Deduplicare**: Fuzzy matching pe nume + adresă + CUI
4. **Enrichment Fiscal**: API Termene.ro pentru date financiare, ANAF pentru status TVA/e-Factura

### 2.3 Schema Silver Companies

```sql
CREATE TABLE silver_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,  -- ⚠️ OBLIGATORIU pentru multi-tenant
    
    -- Identificatori
    -- ⚠️ CORECȚIE: CUI unic PER TENANT, nu global
    cui VARCHAR(12),
    cui_validated BOOLEAN DEFAULT FALSE,
    cui_validation_date TIMESTAMPTZ,
    nr_reg_com VARCHAR(20),
    
    -- Constraint multi-tenant (la sfârșitul tabelei)
    CONSTRAINT unique_silver_cui_per_tenant UNIQUE(tenant_id, cui),
    
    -- Date de bază
    denumire VARCHAR(255) NOT NULL,
    denumire_normalizata VARCHAR(255) GENERATED ALWAYS AS (
        UPPER(TRIM(REGEXP_REPLACE(denumire, '\s+', ' ', 'g')))
    ) STORED,
    
    -- Adresă normalizată
    adresa_sediu TEXT,
    judet VARCHAR(50),
    localitate VARCHAR(100),
    cod_siruta INTEGER REFERENCES nomenclator_siruta(cod),
    cod_postal VARCHAR(10),
    
    -- Date geografice (PostGIS)
    location_geography GEOGRAPHY(POINT, 4326),
    
    -- Date fiscale (din ANAF/Termene.ro)
    status_firma VARCHAR(20), -- ACTIVE, INACTIVE, SUSPENDED, RADIATED
    cod_caen_principal VARCHAR(6),
    data_inregistrare DATE,
    
    -- Status TVA și e-Factura
    platitor_tva BOOLEAN,
    data_inceput_tva DATE,
    status_e_factura BOOLEAN,
    
    -- Date financiare (din Termene.ro)
    cifra_afaceri DECIMAL(15,2),
    profit_net DECIMAL(15,2),
    numar_angajati INTEGER,
    capitaluri_proprii DECIMAL(15,2),
    datorii_totale DECIMAL(15,2),
    an_bilant INTEGER,
    
    -- Scoring și clasificare
    scor_risc_termene INTEGER, -- 0-100 din API
    categorie_risc VARCHAR(20), -- HIGH, MEDIUM, LOW
    
    -- Metadate
    source_bronze_id UUID REFERENCES bronze_contacts(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    enrichment_status VARCHAR(20) DEFAULT 'PENDING'
);
```

### 2.4 Schema Silver Contacts (Persoane de contact)

```sql
CREATE TABLE silver_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES silver_companies(id),
    
    -- Identificare
    prenume VARCHAR(100),
    nume VARCHAR(100),
    nume_complet VARCHAR(200) GENERATED ALWAYS AS (
        COALESCE(prenume, '') || ' ' || COALESCE(nume, '')
    ) STORED,
    
    -- Contact multi-channel
    email VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_date TIMESTAMPTZ,
    email_provider VARCHAR(50), -- gmail, yahoo, corporate
    
    telefon VARCHAR(20), -- Format E.164
    telefon_verified BOOLEAN DEFAULT FALSE,
    telefon_carrier VARCHAR(50), -- Vodafone, Orange, etc.
    
    telefon_secundar VARCHAR(20),
    whatsapp_number VARCHAR(20),
    whatsapp_available BOOLEAN,
    
    -- Profesional
    functie VARCHAR(100),
    departament VARCHAR(50),
    seniority VARCHAR(30), -- executive, manager, contributor
    
    -- Social
    linkedin_url VARCHAR(255),
    
    -- GDPR
    consent_marketing BOOLEAN,
    consent_date TIMESTAMPTZ,
    data_source VARCHAR(50), -- PUBLIC_REGISTER, WEBSITE, DIRECT_CONTACT
    
    -- Metadate
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.5 Criterii de avansare Silver → Gold

- **CUI Validat**: Verificare modulo-11 + status ACTIV în ANAF
- **Contact Verificat**: Email deliverable (SMTP) SAU telefon valid (HLR)
- **Date Financiare**: Bilanț disponibil (&lt; 2 ani vechime)
- **Locație Geocodată**: Coordonate GPS pentru interogări PostGIS
- **Completitudine minimă**: 60%+ din câmpurile obligatorii populate

---

## 3. STADIUL GOLDEN: Contact Ready-for-Outreach

### 3.1 Definiție și scop

**Golden Records** reprezintă contacte complet îmbogățite, validate pe multiple axe și ready pentru automatizarea completă a procesului de vânzare. Acestea susțin:

- Outreach multi-canal (WhatsApp, Email, Telefon)
- Lead scoring și prioritizare automată
- Generare oferte și facturi (Oblio.eu, e-Factura)
- Nurturing bazat pe proximitate și afilieri

### 3.2 Schema Golden Companies (Completă)

```sql
CREATE TABLE gold_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,  -- ⚠️ OBLIGATORIU pentru multi-tenant
    silver_id UUID UNIQUE REFERENCES silver_companies(id),
    
    -- ═══════════════════════════════════════════════════════════════
    -- SECȚIUNEA 1: IDENTIFICARE ȘI DATE DE BAZĂ
    -- ═══════════════════════════════════════════════════════════════
    
    -- Identificatori unici
    -- ⚠️ CORECȚIE: CUI unic PER TENANT, nu global
    cui VARCHAR(12) NOT NULL,
    cui_ro VARCHAR(14) GENERATED ALWAYS AS ('RO' || cui) STORED,
    nr_reg_com VARCHAR(20),
    iban_principal VARCHAR(34),
    
    -- Constraint multi-tenant (la sfârșitul tabelei)
    -- CONSTRAINT unique_gold_cui_per_tenant UNIQUE(tenant_id, cui),
    
    -- Denumiri
    denumire VARCHAR(255) NOT NULL,
    denumire_comerciala VARCHAR(255),
    denumire_normalizata VARCHAR(255),
    
    -- Forma juridică
    forma_juridica VARCHAR(50), -- SRL, SA, PFA, II, IF, COOP, OUAI
    tip_entitate VARCHAR(30), -- FIRMA, FERMA_PF, COOPERATIVA, OUAI, ASOCIATIE
    
    -- ═══════════════════════════════════════════════════════════════
    -- SECȚIUNEA 2: DATE JURIDICE ȘI FISCALE
    -- ═══════════════════════════════════════════════════════════════
    
    -- Status fiscal (din ANAF API)
    status_firma VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    data_inregistrare DATE,
    data_radiere DATE,
    
    -- TVA
    platitor_tva BOOLEAN NOT NULL DEFAULT FALSE,
    data_inceput_tva DATE,
    data_sfarsit_tva DATE,
    tva_la_incasare BOOLEAN DEFAULT FALSE,
    split_tva BOOLEAN DEFAULT FALSE,
    
    -- e-Factura
    status_e_factura BOOLEAN NOT NULL DEFAULT FALSE,
    data_inregistrare_e_factura DATE,
    
    -- CAEN
    cod_caen_principal VARCHAR(6),
    denumire_caen VARCHAR(255),
    coduri_caen_secundare VARCHAR(6)[],
    
    -- Capital social
    capital_social_subscris DECIMAL(15,2),
    capital_social_varsat DECIMAL(15,2),
    
    -- ═══════════════════════════════════════════════════════════════
    -- SECȚIUNEA 3: DATE AGRICOLE SPECIFICE
    -- ═══════════════════════════════════════════════════════════════
    
    -- Suprafețe și culturi
    suprafata_totala_ha DECIMAL(10,2),
    suprafata_arendata_ha DECIMAL(10,2),
    suprafata_proprie_ha DECIMAL(10,2),
    suprafata_irigata_ha DECIMAL(10,2),
    
    -- Clasificare agricolă
    tip_exploatatie VARCHAR(30), -- VEGETALA, ANIMALA, MIXTA
    categorie_dimensiune VARCHAR(30), -- MICRO, MICA, MEDIE, MARE
    specialist_cultura VARCHAR(50), -- CEREALE, LEGUME, VITA_DE_VIE, etc.
    
    -- Culturi principale (array JSONB pentru flexibilitate)
    culturi_principale JSONB DEFAULT '[]',
    -- Exemplu: [{"tip": "PORUMB", "suprafata_ha": 150}, {"tip": "GRAU", "suprafata_ha": 100}]
    
    -- Animale (pentru ferme zootehnice)
    efectiv_animale JSONB DEFAULT '{}',
    -- Exemplu: {"bovine": 50, "porcine": 200, "ovine": 100}
    total_lsu DECIMAL(10,2), -- Livestock Units calculat
    
    -- Echipamente agricole
    echipamente_agricole JSONB DEFAULT '[]',
    -- Exemplu: [{"tip": "TRACTOR", "marca": "John Deere", "putere_cp": 150, "an": 2020}]
    capacitate_stocare_tone DECIMAL(10,2),
    sistem_irigare VARCHAR(50), -- DRIP, SPRINKLER, FLOOD, PIVOT, NONE
    
    -- Certificări
    certificat_eco BOOLEAN DEFAULT FALSE,
    certificat_globalgap BOOLEAN DEFAULT FALSE,
    ggn_globalgap VARCHAR(20),
    alte_certificari VARCHAR(100)[],
    
    -- ═══════════════════════════════════════════════════════════════
    -- SECȚIUNEA 4: LOCAȚIE ȘI GEOGRAFIE (PostGIS)
    -- ═══════════════════════════════════════════════════════════════
    
    -- Adresa sediu social
    adresa_sediu TEXT,
    strada VARCHAR(200),
    numar VARCHAR(20),
    bloc VARCHAR(20),
    scara VARCHAR(10),
    apartament VARCHAR(10),
    cod_postal VARCHAR(10),
    localitate VARCHAR(100),
    comuna VARCHAR(100),
    judet VARCHAR(50),
    cod_siruta INTEGER,
    
    -- Coordonate geografice
    location_geography GEOGRAPHY(POINT, 4326),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    
    -- Zone agricole
    zona_agricola VARCHAR(50), -- CAMPIE, DEAL, MUNTE
    bazin_hidrografic VARCHAR(100),
    amenajare_hidroameliorativa VARCHAR(200),
    
    -- Proximitate (calculat)
    nearest_depot_km DECIMAL(8,2),
    nearest_easybox_km DECIMAL(8,2),
    zona_livrare VARCHAR(50),
    
    -- ═══════════════════════════════════════════════════════════════
    -- SECȚIUNEA 5: DATE FINANCIARE ȘI CREDIT SCORING
    -- ═══════════════════════════════════════════════════════════════
    
    -- Bilanț (din Termene.ro/RisCo)
    cifra_afaceri DECIMAL(15,2),
    profit_net DECIMAL(15,2),
    pierdere_neta DECIMAL(15,2),
    active_totale DECIMAL(15,2),
    active_circulante DECIMAL(15,2),
    datorii_totale DECIMAL(15,2),
    datorii_termen_scurt DECIMAL(15,2),
    datorii_termen_lung DECIMAL(15,2),
    capitaluri_proprii DECIMAL(15,2),
    numar_angajati INTEGER,
    an_bilant INTEGER,
    
    -- Indicatori financiari calculați
    lichiditate_curenta DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE WHEN datorii_termen_scurt > 0 
        THEN active_circulante / datorii_termen_scurt 
        ELSE NULL END
    ) STORED,
    grad_indatorare DECIMAL(8,4),
    solvabilitate_patrimoniala DECIMAL(8,4),
    
    -- Datorii la stat (din ANAF)
    datorii_anaf DECIMAL(15,2),
    data_verificare_datorii DATE,
    
    -- Dosare și litigii
    numar_dosare_actuale INTEGER DEFAULT 0,
    dosare_ca_parat INTEGER DEFAULT 0,
    in_insolventa BOOLEAN DEFAULT FALSE,
    data_insolventa DATE,
    
    -- Scoring risc
    scor_risc_intern INTEGER, -- 0-100, calculat intern
    scor_risc_termene INTEGER, -- 0-100, din API
    categorie_risc VARCHAR(20), -- HIGH, MEDIUM, LOW
    data_calcul_scor DATE,
    
    -- Credit comercial
    limita_credit_calculata DECIMAL(15,2),
    limita_credit_aprobata DECIMAL(15,2),
    limita_credit_utilizata DECIMAL(15,2),
    termen_plata_standard INTEGER DEFAULT 0, -- zile
    conditii_plata VARCHAR(30), -- AVANS, RAMBURS, TERMEN_30, TERMEN_60
    
    -- ═══════════════════════════════════════════════════════════════
    -- SECȚIUNEA 6: RELAȚII ȘI ASOCIERI
    -- ═══════════════════════════════════════════════════════════════
    
    -- Acționari și administratori (JSON pentru flexibilitate)
    actionari JSONB DEFAULT '[]',
    -- [{"nume": "Ion Popescu", "cnp": "...", "procent": 60}, ...]
    administratori JSONB DEFAULT '[]',
    
    -- Apartenența la structuri asociative
    membru_ouai BOOLEAN DEFAULT FALSE,
    ouai_id UUID REFERENCES gold_organizations(id),
    ouai_nume VARCHAR(200),
    
    membru_cooperativa BOOLEAN DEFAULT FALSE,
    cooperativa_id UUID REFERENCES gold_organizations(id),
    cooperativa_nume VARCHAR(200),
    
    membru_grup_producatori BOOLEAN DEFAULT FALSE,
    grup_producatori_id UUID REFERENCES gold_organizations(id),
    
    membru_asociatie_profesionala BOOLEAN DEFAULT FALSE,
    asociatii_profesionale VARCHAR(100)[], -- LAPAR, APPR, PRO_AGRO, etc.
    
    -- Relații comerciale
    furnizor_principal_cereale VARCHAR(100), -- Cargill, Ameropa, etc.
    client_retail BOOLEAN DEFAULT FALSE, -- Carrefour, Kaufland, etc.
    
    -- ═══════════════════════════════════════════════════════════════
    -- SECȚIUNEA 7: ENGAGEMENT ȘI SCORING
    -- ═══════════════════════════════════════════════════════════════
    
    -- Lead scoring
    lead_score INTEGER DEFAULT 0, -- 0-100
    fit_score INTEGER, -- ICP match
    engagement_score INTEGER, -- Activitate
    intent_score INTEGER, -- Semnal de cumpărare
    
    -- Componente scoring
    score_firmografic INTEGER,
    score_comportamental INTEGER,
    score_interes INTEGER,
    data_ultima_actualizare_scor TIMESTAMPTZ,
    
    -- Engagement stage (FSM)
    engagement_stage VARCHAR(30) DEFAULT 'COLD',
    -- COLD, CONTACTED_WA, CONTACTED_EMAIL, WARM_REPLY, NEGOTIATION, 
    -- PROPOSAL, CLOSING, CONVERTED, CHURNED, DEAD
    
    data_prima_contactare TIMESTAMPTZ,
    data_ultima_interactiune TIMESTAMPTZ,
    numar_interactiuni_totale INTEGER DEFAULT 0,
    
    -- Preferințe canal
    canal_preferat VARCHAR(20), -- WHATSAPP, EMAIL, TELEFON
    ora_preferata_contact TIME,
    zile_preferate_contact INTEGER[], -- 1=Luni, 7=Duminică
    
    -- Activitate recentă
    email_opens_30_zile INTEGER DEFAULT 0,
    email_clicks_30_zile INTEGER DEFAULT 0,
    wa_responses_30_zile INTEGER DEFAULT 0,
    
    -- Post-vânzare
    customer_status VARCHAR(20), -- PROSPECT, LEAD, CUSTOMER, CHURNED
    data_prima_comanda DATE,
    data_ultima_comanda DATE,
    valoare_totala_comenzi DECIMAL(15,2),
    numar_comenzi_totale INTEGER DEFAULT 0,
    average_order_value DECIMAL(15,2),
    
    -- NPS și satisfacție
    nps_score INTEGER, -- -100 to 100
    data_ultima_evaluare DATE,
    
    -- ═══════════════════════════════════════════════════════════════
    -- SECȚIUNEA 8: GDPR ȘI PREFERINȚE COMUNICARE
    -- ═══════════════════════════════════════════════════════════════
    
    -- Temei legal GDPR
    gdpr_legal_basis VARCHAR(30) DEFAULT 'LEGITIMATE_INTEREST',
    -- CONSENT, CONTRACT, LEGITIMATE_INTEREST, LEGAL_OBLIGATION
    
    gdpr_lia_documentat BOOLEAN DEFAULT FALSE, -- Legitimate Interest Assessment
    gdpr_data_lia DATE,
    
    -- Consimțământ granular
    consent_email_marketing BOOLEAN,
    consent_sms BOOLEAN,
    consent_whatsapp BOOLEAN,
    consent_telefon BOOLEAN,
    consent_date TIMESTAMPTZ,
    consent_source VARCHAR(100),
    
    -- Opt-out
    do_not_contact BOOLEAN DEFAULT FALSE,
    do_not_email BOOLEAN DEFAULT FALSE,
    do_not_call BOOLEAN DEFAULT FALSE,
    do_not_whatsapp BOOLEAN DEFAULT FALSE,
    
    -- Drepturi GDPR exercitate
    gdpr_access_request_date DATE,
    gdpr_rectification_date DATE,
    gdpr_erasure_request_date DATE,
    gdpr_objection_date DATE,
    
    -- Retenție date
    data_retention_review_date DATE,
    
    -- ═══════════════════════════════════════════════════════════════
    -- SECȚIUNEA 9: DATE AI/ML ȘI FEATURES
    -- ═══════════════════════════════════════════════════════════════
    
    -- Embedding pentru căutare semantică
    embedding VECTOR(1536), -- pgvector, OpenAI text-embedding-3-large
    embedding_updated_at TIMESTAMPTZ,
    
    -- Segmente și clustere
    segment_ai VARCHAR(50), -- Generat de ML
    cluster_id INTEGER,
    cluster_confidence DECIMAL(5,4),
    
    -- Predicții ML
    probabilitate_conversie DECIMAL(5,4),
    probabilitate_churn DECIMAL(5,4),
    predicted_cltv DECIMAL(15,2),
    data_predicii TIMESTAMPTZ,
    
    -- Features pentru ML (JSONB pentru flexibilitate)
    ml_features JSONB DEFAULT '{}',
    
    -- ═══════════════════════════════════════════════════════════════
    -- SECȚIUNEA 10: TIMELINE ȘI AUDIT
    -- ═══════════════════════════════════════════════════════════════
    
    -- Timestamps sistem
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Enrichment tracking
    enrichment_status VARCHAR(20) DEFAULT 'COMPLETE',
    enrichment_completeness DECIMAL(5,2), -- 0-100%
    last_enrichment_date TIMESTAMPTZ,
    next_enrichment_date TIMESTAMPTZ,
    
    -- Surse date
    data_sources JSONB DEFAULT '{}',
    -- {"termene_ro": "2026-01-10", "anaf": "2026-01-09", ...}
    
    -- Audit trail
    created_by UUID,
    updated_by UUID,
    version INTEGER DEFAULT 1,
    
    -- ═══════════════════════════════════════════════════════════════
    -- CONSTRAINTS ȘI INDEXURI
    -- ═══════════════════════════════════════════════════════════════
    
    CONSTRAINT valid_cui CHECK (cui ~ '^\d{2,10}$'),
    CONSTRAINT valid_lead_score CHECK (lead_score BETWEEN 0 AND 100),
    CONSTRAINT valid_engagement_stage CHECK (engagement_stage IN (
        'COLD', 'CONTACTED_WA', 'CONTACTED_EMAIL', 'WARM_REPLY',
        'NEGOTIATION', 'PROPOSAL', 'CLOSING', 'CONVERTED', 
        'ONBOARDING', 'NURTURING_ACTIVE', 'AT_RISK', 'LOYAL_ADVOCATE', 'CHURNED', 'DEAD'
    )),
    
    -- ⚠️ CONSTRAINT MULTI-TENANT (OBLIGATORIU)
    CONSTRAINT unique_gold_cui_per_tenant UNIQUE(tenant_id, cui)
);

-- Indexuri critice
-- ⚠️ Index CUI per tenant (nu global)
CREATE INDEX idx_gold_companies_tenant_cui ON gold_companies(tenant_id, cui);
CREATE INDEX idx_gold_companies_location ON gold_companies USING GIST(location_geography);
CREATE INDEX idx_gold_companies_embedding ON gold_companies USING HNSW(embedding vector_cosine_ops);
CREATE INDEX idx_gold_companies_judet ON gold_companies(judet);
CREATE INDEX idx_gold_companies_engagement ON gold_companies(engagement_stage);
CREATE INDEX idx_gold_companies_lead_score ON gold_companies(lead_score DESC);
CREATE INDEX idx_gold_companies_caen ON gold_companies(cod_caen_principal);
CREATE INDEX idx_gold_companies_ouai ON gold_companies(ouai_id) WHERE membru_ouai = TRUE;
CREATE INDEX idx_gold_companies_tenant ON gold_companies(tenant_id);  -- Pentru RLS
```

### 3.3 Schema Gold Contacts (Persoane fizice)

```sql
CREATE TABLE gold_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES gold_companies(id),
    silver_id UUID REFERENCES silver_contacts(id),
    
    -- Identificare
    prenume VARCHAR(100) NOT NULL,
    nume VARCHAR(100) NOT NULL,
    nume_complet VARCHAR(200),
    
    -- Contact verificat
    email VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    email_quality_score INTEGER, -- 0-100
    email_catch_all BOOLEAN,
    
    telefon VARCHAR(20),
    telefon_verified BOOLEAN DEFAULT FALSE,
    telefon_tip VARCHAR(20), -- MOBILE, LANDLINE, VOIP
    telefon_carrier VARCHAR(50),
    
    whatsapp_number VARCHAR(20),
    whatsapp_verified BOOLEAN DEFAULT FALSE,
    whatsapp_profile_name VARCHAR(100),
    
    -- Rol și decizie
    functie VARCHAR(150),
    departament VARCHAR(50),
    seniority VARCHAR(30),
    buying_role VARCHAR(30), -- DECISION_MAKER, INFLUENCER, CHAMPION, GATEKEEPER, USER
    budget_authority BOOLEAN,
    
    -- Social
    linkedin_url VARCHAR(255),
    linkedin_connections INTEGER,
    
    -- Engagement personal
    canal_preferat VARCHAR(20),
    best_time_to_contact TIME,
    limba_preferata VARCHAR(10) DEFAULT 'ro',
    
    -- Activitate
    total_emails_sent INTEGER DEFAULT 0,
    total_emails_opened INTEGER DEFAULT 0,
    total_email_replies INTEGER DEFAULT 0,
    total_wa_messages INTEGER DEFAULT 0,
    total_wa_replies INTEGER DEFAULT 0,
    total_calls INTEGER DEFAULT 0,
    
    last_contacted_at TIMESTAMPTZ,
    last_response_at TIMESTAMPTZ,
    
    -- GDPR per contact
    consent_email BOOLEAN,
    consent_whatsapp BOOLEAN,
    consent_phone BOOLEAN,
    do_not_contact BOOLEAN DEFAULT FALSE,
    
    -- Metadate
    is_primary_contact BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.4 Schema Gold Lead Journey (Mașina de Stare)

```sql
CREATE TABLE gold_lead_journey (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES gold_companies(id),
    contact_id UUID REFERENCES gold_contacts(id),
    
    -- Stare curentă
    current_stage VARCHAR(30) NOT NULL,
    previous_stage VARCHAR(30),
    stage_entered_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Canal și asignare
    assigned_phone_id INTEGER, -- Din clusterul de 20 numere WhatsApp
    assigned_email_account VARCHAR(255),
    owner_id UUID, -- Utilizator responsabil
    
    -- Secvență outreach
    sequence_id UUID, -- ID secvență activă
    sequence_step INTEGER,
    sequence_paused BOOLEAN DEFAULT FALSE,
    
    -- Timeline interacțiuni (JSONB pentru flexibilitate)
    interactions JSONB DEFAULT '[]',
    -- [{"type": "EMAIL_SENT", "timestamp": "...", "template_id": "..."}, ...]
    
    -- Negociere
    negotiation_started_at TIMESTAMPTZ,
    last_offer_id UUID,
    last_offer_amount DECIMAL(15,2),
    expected_close_date DATE,
    deal_probability DECIMAL(5,2),
    
    -- Conversie
    converted_at TIMESTAMPTZ,
    conversion_value DECIMAL(15,2),
    first_order_id UUID,
    
    -- Churn
    churned_at TIMESTAMPTZ,
    churn_reason VARCHAR(100),
    win_back_attempts INTEGER DEFAULT 0,
    
    -- Metadate
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.5 Schema Gold Affiliations (Graf Social)

```sql
CREATE TABLE gold_affiliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    source_entity_id UUID NOT NULL REFERENCES gold_companies(id),
    target_group_id UUID NOT NULL REFERENCES gold_organizations(id),
    
    -- Tipul relației
    relation_type VARCHAR(50) NOT NULL,
    -- MEMBER, BOARD_MEMBER, PRESIDENT, SHAREHOLDER, NEIGHBOR, SUPPLY_CHAIN
    
    -- Forța relației
    strength DECIMAL(5,4) DEFAULT 0.5, -- 0-1
    confidence_score DECIMAL(5,4) DEFAULT 1.0,
    
    -- Sursă și validare
    evidence_source JSONB,
    source_document_id UUID,
    is_inferred BOOLEAN DEFAULT FALSE,
    
    -- Validitate
    valid_from DATE,
    valid_until DATE,
    last_verified_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadate
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_affiliation UNIQUE (source_entity_id, target_group_id, relation_type)
);

-- Index pentru analiza grafurilor
CREATE INDEX idx_affiliations_source ON gold_affiliations(source_entity_id);
CREATE INDEX idx_affiliations_target ON gold_affiliations(target_group_id);
CREATE INDEX idx_affiliations_type ON gold_affiliations(relation_type);
```

---

## 4. FORMAT JSON SCHEMA (Cu Validări)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://cerniq.app/schemas/golden-contact.json",
  "title": "Golden Contact Schema - Cerniq.app",
  "description": "Schema completă pentru contacte Golden în platforma B2B agricolă",
  "type": "object",
  "required": ["id", "cui", "denumire", "engagement_stage"],
  
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Identificator unic UUID v4"
    },
    
    "cui": {
      "type": "string",
      "pattern": "^[0-9]{2,10}$",
      "description": "Cod Unic de Înregistrare (2-10 cifre)",
      "examples": ["14399840", "1234567"]
    },
    
    "cui_ro": {
      "type": "string",
      "pattern": "^RO[0-9]{2,10}$",
      "description": "CUI cu prefix RO pentru plătitori TVA",
      "examples": ["RO14399840"]
    },
    
    "nr_reg_com": {
      "type": "string",
      "pattern": "^J[0-9]{2}/[0-9]+/[0-9]{4}$",
      "description": "Număr Registrul Comerțului",
      "examples": ["J40/1234/2020"]
    },
    
    "denumire": {
      "type": "string",
      "minLength": 2,
      "maxLength": 255,
      "description": "Denumirea oficială a firmei"
    },
    
    "forma_juridica": {
      "type": "string",
      "enum": ["SRL", "SA", "PFA", "II", "IF", "COOP", "OUAI", "ASOCIATIE", "FUNDATIE"],
      "description": "Forma juridică a entității"
    },
    
    "tip_entitate": {
      "type": "string",
      "enum": ["FIRMA", "FERMA_PF", "COOPERATIVA", "OUAI", "GRUP_PRODUCATORI", "ASOCIATIE"],
      "description": "Tipul de entitate agricolă"
    },
    
    "status_firma": {
      "type": "string",
      "enum": ["ACTIVE", "INACTIVE", "SUSPENDED", "RADIATED", "IN_INSOLVENTA"],
      "default": "ACTIVE"
    },
    
    "platitor_tva": {
      "type": "boolean",
      "default": false,
      "description": "Statut plătitor TVA"
    },
    
    "status_e_factura": {
      "type": "boolean",
      "default": false,
      "description": "Înregistrat în sistemul RO e-Factura"
    },
    
    "cod_caen_principal": {
      "type": "string",
      "pattern": "^[0-9]{4}$",
      "description": "Cod CAEN principal (4 cifre)",
      "examples": ["0111", "0121", "4621"]
    },
    
    "date_agricole": {
      "type": "object",
      "properties": {
        "suprafata_totala_ha": {
          "type": "number",
          "minimum": 0,
          "description": "Suprafață totală în hectare"
        },
        "tip_exploatatie": {
          "type": "string",
          "enum": ["VEGETALA", "ANIMALA", "MIXTA"]
        },
        "culturi_principale": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "tip": {
                "type": "string",
                "enum": ["PORUMB", "GRAU", "FLOAREA_SOARELUI", "RAPITA", "SOI", "ORZOAICA", "SECARA", "LEGUME", "FRUCTE", "VIE", "ALTELE"]
              },
              "suprafata_ha": {"type": "number", "minimum": 0}
            }
          }
        },
        "total_lsu": {
          "type": "number",
          "minimum": 0,
          "description": "Total Livestock Units"
        },
        "subventii_apia_ultimul_an": {
          "type": "number",
          "minimum": 0,
          "description": "Subvenții APIA în EUR"
        }
      }
    },
    
    "locatie": {
      "type": "object",
      "properties": {
        "adresa_sediu": {"type": "string"},
        "judet": {"type": "string", "maxLength": 50},
        "localitate": {"type": "string", "maxLength": 100},
        "cod_siruta": {"type": "integer"},
        "cod_postal": {"type": "string", "pattern": "^[0-9]{6}$"},
        "latitude": {"type": "number", "minimum": 43.5, "maximum": 48.5},
        "longitude": {"type": "number", "minimum": 20.0, "maximum": 30.0}
      }
    },
    
    "date_financiare": {
      "type": "object",
      "properties": {
        "cifra_afaceri": {"type": "number"},
        "profit_net": {"type": "number"},
        "numar_angajati": {"type": "integer", "minimum": 0},
        "an_bilant": {"type": "integer", "minimum": 2000},
        "scor_risc_termene": {"type": "integer", "minimum": 0, "maximum": 100},
        "categorie_risc": {"type": "string", "enum": ["HIGH", "MEDIUM", "LOW"]}
      }
    },
    
    "credit_comercial": {
      "type": "object",
      "properties": {
        "limita_credit_aprobata": {"type": "number", "minimum": 0},
        "limita_credit_utilizata": {"type": "number", "minimum": 0},
        "termen_plata_standard": {"type": "integer", "minimum": 0, "maximum": 180},
        "conditii_plata": {
          "type": "string",
          "enum": ["AVANS", "RAMBURS", "TERMEN_15", "TERMEN_30", "TERMEN_60", "TERMEN_90"]
        }
      }
    },
    
    "afilieri": {
      "type": "object",
      "properties": {
        "membru_ouai": {"type": "boolean"},
        "ouai_id": {"type": "string", "format": "uuid"},
        "membru_cooperativa": {"type": "boolean"},
        "cooperativa_id": {"type": "string", "format": "uuid"},
        "asociatii_profesionale": {
          "type": "array",
          "items": {"type": "string", "enum": ["LAPAR", "APPR", "PRO_AGRO", "UNCSV", "ALTRE"]}
        }
      }
    },
    
    "engagement": {
      "type": "object",
      "properties": {
        "lead_score": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100,
          "description": "Scor lead 0-100"
        },
        "engagement_stage": {
          "type": "string",
          "enum": [
            "COLD", "CONTACTED_WA", "CONTACTED_EMAIL", "WARM_REPLY",
            "NEGOTIATION", "PROPOSAL", "CLOSING", "CONVERTED",
            "ONBOARDING", "NURTURING_ACTIVE", "AT_RISK", "LOYAL_ADVOCATE", "CHURNED", "DEAD"
          ]
        },
        "canal_preferat": {
          "type": "string",
          "enum": ["WHATSAPP", "EMAIL", "TELEFON"]
        }
      }
    },
    
    "gdpr": {
      "type": "object",
      "properties": {
        "legal_basis": {
          "type": "string",
          "enum": ["CONSENT", "CONTRACT", "LEGITIMATE_INTEREST", "LEGAL_OBLIGATION"]
        },
        "consent_email_marketing": {"type": "boolean"},
        "consent_whatsapp": {"type": "boolean"},
        "do_not_contact": {"type": "boolean"},
        "data_retention_review_date": {"type": "string", "format": "date"}
      }
    },
    
    "persoane_contact": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["prenume", "nume"],
        "properties": {
          "id": {"type": "string", "format": "uuid"},
          "prenume": {"type": "string"},
          "nume": {"type": "string"},
          "email": {"type": "string", "format": "email"},
          "email_verified": {"type": "boolean"},
          "telefon": {"type": "string", "pattern": "^\\+?[0-9]{10,15}$"},
          "functie": {"type": "string"},
          "buying_role": {
            "type": "string",
            "enum": ["DECISION_MAKER", "INFLUENCER", "CHAMPION", "GATEKEEPER", "USER"]
          },
          "is_primary_contact": {"type": "boolean"}
        }
      }
    },
    
    "metadata": {
      "type": "object",
      "properties": {
        "created_at": {"type": "string", "format": "date-time"},
        "updated_at": {"type": "string", "format": "date-time"},
        "enrichment_completeness": {"type": "number", "minimum": 0, "maximum": 100},
        "data_sources": {
          "type": "object",
          "additionalProperties": {"type": "string", "format": "date"}
        }
      }
    }
  }
}
```

---

## 5. DIAGRAME DE FLUX

### 5.1 Pipeline Ingestie Bronze

```logic
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PIPELINE INGESTIE BRONZE                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  CSV Import  │   │  PDF Scrape  │   │  API Webhook │   │ Manual Entry │
│  (APIA/MADR) │   │ (DAJ/ANIF)   │   │  (Shopify)   │   │  (Admin UI)  │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FASTIFY API GATEWAY (Node.js 24)                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Zod Schema Validation  │  Rate Limiting  │  Source Tagging         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BRONZE LAYER (PostgreSQL 18)                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  bronze_imports  │  bronze_webhooks  │  bronze_onboarding           │    │
│  │  (JSONB raw)     │  (JSONB raw)      │  (JSONB raw)                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                         APPEND-ONLY, IMMUTABLE                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Progresia Bronze → Silver → Golden

```logic
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MEDALLION PROGRESSION PIPELINE                           │
└─────────────────────────────────────────────────────────────────────────────┘

╔═══════════════════╗
║   BRONZE LAYER    ║
║  (Raw, Unvalidated)║
╠═══════════════════╣
║ • JSONB raw data  ║
║ • No transforms   ║
║ • Append-only     ║
║ • Source tracking ║
╚════════╤══════════╝
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│              TRANSFORMATION WORKERS (Python 3.14)              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Normalizare  │ │  Validare    │ │ Deduplicare  │            │
│  │ (Nume,Adrese)│ │ (CUI,Email,  │ │  (Fuzzy      │            │
│  │              │ │  Telefon)    │ │   Match)     │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
╔═════════════════════╗
║   SILVER LAYER      ║
║ (Cleaned, Validated)║
╠═════════════════════╣
║ • CUI validated     ║
║ • Email verified    ║
║ • Deduplicated      ║
║ • Normalized        ║
║ • 40-60% complete   ║
╚════════╤════════════╝
         │
         ▼
┌─────────────────────────────────-────────────────────────-───────┐
│              ENRICHMENT WORKERS (Python 3.14)                    │
│  ┌──────────────┐ ┌──────────-────┐ ┌──────────-────┐            │
│  │ Termene.ro   │ │ ANAF API      │ │ Grok AI       │            │
│  │ (Financiar,  │ │ (TVA,         │ │ (Structured   │            │
│  │  Litigii)    │ │  e-Factura)   │ │  Extraction)  │            │
│  └──────────────┘ └───────────-───┘ └────────────-──┘            │
│  ┌──────────────┐ ┌─────────-─────┐ ┌───────────-───┐            │
│  │ PostGIS      │ │ NetworkX      │ │ pgvector      │            │
│  │ (Geocoding)  │ │ (Affiliations)│ │ (Embeddings)  │            │
│  └──────────────┘ └────────────-──┘ └──────────-────┘            │
└────────────────────────────────────────────────────────────--────┘
         │
         ▼
╔════════════════════╗
║   GOLDEN LAYER     ║
║ (Ready for Action) ║
╠════════════════════╣
║ • 80%+ complete    ║
║ • Full financial   ║
║ • Geocoded         ║
║ • Affiliations     ║
║ • Lead scored      ║
║ • Embedding ready  ║
╚════════════════════╝
```

### 5.3 Flow Nurturing și Outreach

```logic
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OUTREACH ORCHESTRATION                             │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────────────────────┐
     │                    GOLDEN CONTACT                           │
     │  [lead_score: 75] [stage: COLD] [canal_preferat: WHATSAPP]  │
     └─────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OUTREACH ORCHESTRATOR (Node.js 24)                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      QUOTA GUARDIAN (Redis Lua)                       │  │
│  │  • 200 contacte NOI/zi per WhatsApp number                            │  │
│  │  • Follow-up nelimitat                                                │  │
│  │  • Verificare atomică + incrementare                                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                │                           │                     │
                ▼                           ▼                     ▼
    ┌───────────────────┐      ┌───────────────────┐   ┌───────────────────┐
    │   WhatsApp (20x)  │      │   Email Hunter    │   │   Email Farmer    │
    │   TimelinesAI     │      │   Instantly.ai    │   │   Resend          │
    │   (Cold Outreach) │      │   (Cold)          │   │   (Warm/Transact) │
    └─────────┬─────────┘      └─────────┬─────────┘   └─────────┬─────────┘
              │                          │                       │
              ▼                          ▼                       ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                        WEBHOOK HANDLERS                             │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
    │  │ MESSAGE_    │  │ EMAIL_      │  │ EMAIL_      │                  │
    │  │ DELIVERED   │  │ OPENED      │  │ REPLIED     │                  │
    │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
    └─────────┼────────────────┼────────────────┼─────────────────────────┘
              │                │                │
              ▼                ▼                ▼
    ┌──────────────────────────────────────────────────────────────-───────┐
    │                   LEAD JOURNEY STATE MACHINE                         │
    │                                                                      │
    │  COLD ──► CONTACTED_WA ──► WARM_REPLY ──► NEGOTIATION                │
    │    │                           │              │                      │
    │    └──► CONTACTED_EMAIL ───────┘              ▼                      │
    │                                           PROPOSAL                   │
    │                                              │                       │
    │                                              ▼                       │
    │  DEAD ◄── AT_RISK ◄── NURTURING ◄── CONVERTED ◄── CLOSING            │
    │                           │                                          │
    │                           ▼                                          │
    │                    LOYAL_ADVOCATE                                    │
    └───────────────────────────────────────────────────────────────-──────┘
```

---

## 6. CRITERII DE SCORING LEAD

### 6.1 Scor Firmografic (0-40 puncte)

| Criteriu                  | Puncte |
|---------------------------|--------|
| Suprafață &gt; 100 ha     | +15    |
| Suprafață 50-100 ha       | +10    |
| Suprafață 20-50 ha        | +5     |
| Cifră afaceri &gt; 1M RON | +10    |
| Cifră afaceri 500K-1M RON | +5     |
| Membru OUAI/Cooperativă   | +5     |
| Certificare Eco/GlobalGAP | +5     |
| CAEN agricol principal    | +5     |

### 6.2 Scor Comportamental (0-40 puncte)

| Acțiune                    | Puncte |
|----------------------------|--------|
| Răspuns WhatsApp           | +15    |
| Răspuns Email              | +10    |
| Click pe link              | +5     |
| Deschidere email           | +2     |
| Vizită pagină prețuri      | +10    |
| Cerere ofertă              | +20    |
| Interacțiune multiplă (3+) | +10    |

### 6.3 Scor Interes/Intent (0-20 puncte)

| Semnal                        | Puncte |
|-------------------------------|--------|
| Mențiune competitor           | +10    |
| Întrebare despre preț         | +8     |
| Solicitare demo/test          | +15    |
| Sezon agricol activ           | +5     |
| Post-subvenție APIA (Oct-Dec) | +5     |

### 6.4 Penalizări

| Criteriu            | Puncte |
|---------------------|--------|
| Email invalid       | -15    |
| Telefon invalid     | -10    |
| În insolvență       | -50    |
| Status inactiv ANAF | -30    |
| Do Not Contact      | -100   |
| Scor risc HIGH      | -15    |

---

## 7. SURSE DE DATE PENTRU FIECARE CÂMP

### 7.1 Date din ANAF API (Gratuit)

- `cui`, `denumire`, `adresa`, `cod_postal`
- `platitor_tva`, `data_inceput_tva`, `data_sfarsit_tva`
- `status_e_factura`, `tva_la_incasare`, `split_tva`
- `stare_inregistrare`, `data_inregistrare`
- `cod_caen_principal`, `iban`

### 7.2 Date din Termene.ro API (Plătit)

- `cifra_afaceri`, `profit_net`, `numar_angajati`
- `active_totale`, `datorii_totale`, `capitaluri_proprii`
- `scor_risc_termene`, `categorie_risc`
- `actionari`, `administratori`
- `numar_dosare_actuale`, `dosare_ca_parat`
- `in_insolventa`, `datorii_anaf`

### 7.3 Date din APIA/MADR (Scraping PDF)

- `suprafata_totala_ha`, `culturi_principale`
- `subventii_apia_ultimul_an`, `tip_subventii`
- `membru_ouai`, `ouai_id`, `amenajare_hidroameliorativa`
- `membru_cooperativa`, `membru_grup_producatori`

### 7.4 Date din validare directă

- `email_verified` - SMTP verification
- `telefon_verified` - HLR lookup
- `whatsapp_verified` - TimelinesAI status

### 7.5 Date calculate intern

- `lead_score` - Algoritm scoring intern
- `limita_credit_calculata` - Formula bazată pe capitaluri proprii
- `total_lsu` - Calculat din efectiv animale
- `enrichment_completeness` - % câmpuri populate
- `embedding` - OpenAI text-embedding-3-large

---

## 8. CONFORMITATE GDPR ȘI LEGEA 190/2018

### 8.1 Temei Legal pentru B2B

**Articolul 6(1)(f) - Interes Legitim** este temeiul principal pentru prospectare B2B. Recital 47 GDPR specifică explicit că "procesarea datelor personale pentru marketing direct poate fi considerată realizată pentru interes legitim."

### 8.2 Cerințe Legea 190/2018 România

- **Art. 4**: Procesarea CNP/CI pe baza interesului legitim necesită **DPO obligatoriu**
- Termen remediere neconformități: **90 zile maxim**
- Penalități: **1.000-200.000 RON** (entități private)

### 8.3 Câmpuri GDPR obligatorii în schema Golden

```sql
gdpr_legal_basis VARCHAR(30) -- LEGITIMATE_INTEREST pentru B2B
gdpr_lia_documentat BOOLEAN -- Legitimate Interest Assessment completat
consent_email_marketing BOOLEAN
consent_whatsapp BOOLEAN
do_not_contact BOOLEAN
gdpr_access_request_date DATE
data_retention_review_date DATE
```

### 8.4 Reguli pentru Strategia de Vecinătate

- **NU** dezvăluiți numele clientului existent fără consimțământ explicit
- Folosiți referințe generice: "Am livrat recent în comuna dumneavoastră"
- La referral explicit, cereți permisiunea prin WhatsApp înainte de a folosi numele
- Stocați `evidence_source` pentru trasabilitatea fiecărei relații inferate

---

## 9. CONCLUZIE

Schema Golden Contact pentru Cerniq.app reprezintă o **taxonomie exhaustivă** care acoperă:

1. **200+ câmpuri** organizate în 10 categorii funcționale
2. **Progresia Medallion** Bronze → Silver → Gold cu criterii clare de tranziție
3. **Specificități agricole românești**: OUAI, Cooperative, subvenții APIA, LSU
4. **Integrări native**: ANAF, Termene.ro, Oblio.eu, PostGIS, pgvector
5. **Conformitate completă**: GDPR Art. 6(1)(f), Legea 190/2018, e-Factura
6. **Suport AI/ML**: Embeddings, scoring algoritmic, predicții churn/CLTV

Această schemă servește drept **"Single Source of Truth"** pentru automatizarea completă a procesului de vânzare B2B în agricultura românească, de la primul contact până la facturarea și nurturing-ul post-vânzare.
