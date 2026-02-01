# CERNIQ.APP — ETAPA 1: PLAN IMPLEMENTARE COMPLET

## Data Enrichment Bronze → Silver → Gold

### Versiunea 1.0 | 15 Ianuarie 2026

---

## METADATA DOCUMENT

| Câmp | Valoare |
| ------ | --------- |
| **Etapa** | 1 - Data Enrichment |
| **Versiune** | 1.0 |
| **Data creării** | 15 Ianuarie 2026 |
| **Autor** | Cerniq Development Team |
| **Status** | DRAFT - Ready for Implementation |
| **Sursă de adevăr** | Master Spec v1.2 |
| **Faze totale** | 15 (F1.1 - F1.15) |
| **Taskuri estimate** | ~120 |
| **Durată estimată** | 8-10 săptămâni |

---

## CUPRINS FAZE

| Fază | Denumire | Taskuri | Prioritate |
| ------ | ---------- | --------- | ------------ |
| F1.1 | Database Schema Bronze | 6 | CRITICAL |
| F1.2 | Database Schema Silver | 6 | CRITICAL |
| F1.3 | Database Schema Gold | 6 | CRITICAL |
| F1.4 | Workers Infrastructure | 8 | CRITICAL |
| F1.5 | Workers Cat. A - Ingestie | 6 | HIGH |
| F1.6 | Workers Cat. B-C - Normalizare & Validare | 8 | HIGH |
| F1.7 | Workers Cat. D-E - ANAF & Termene | 10 | HIGH |
| F1.8 | Workers Cat. F-H - ONRC, Email, Phone | 12 | MEDIUM |
| F1.9 | Workers Cat. I-L - Scraping, AI, Geo, Agri | 14 | MEDIUM |
| F1.10 | Workers Cat. M-P - Dedup, Score, Pipeline | 10 | HIGH |
| F1.11 | HITL Integration | 6 | HIGH |
| F1.12 | Backend API | 10 | HIGH |
| F1.13 | Frontend Pages | 10 | MEDIUM |
| F1.14 | Frontend Components | 8 | MEDIUM |
| F1.15 | Testing & Monitoring | 6 | HIGH |
| | **TOTAL** | **~126** | |

---

## DEPENDENȚE INTER-FAZE

```text
F1.1 (Bronze Schema) ──┐
F1.2 (Silver Schema) ──┼──▶ F1.4 (Workers Infra) ──▶ F1.5-F1.10 (Workers)
F1.3 (Gold Schema) ────┘                                    │
                                                            ▼
F1.11 (HITL) ◀────────────────────────────────────────────┘
     │
     ▼
F1.12 (API) ──▶ F1.13 (Pages) ──▶ F1.14 (Components)
                                         │
                                         ▼
                                 F1.15 (Testing)
```

---

## F1.1 DATABASE SCHEMA BRONZE

### F1.1.1 - Creare tabel bronze_contacts

```json
{
  "taskID": "F1.1.1.T001",
  "denumire_task": "Creare tabel bronze_contacts cu toate coloanele",
  "context_anterior": "Etapa 0 completă cu PostgreSQL 18.1 și Drizzle ORM configurat",
  "descriere_task": "Creare tabel bronze_contacts conform schema din etapa1-schema-bronze.md:\n\n```sql\nCREATE TABLE bronze_contacts (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,\n    raw_payload JSONB NOT NULL,\n    source_type VARCHAR(30) NOT NULL CHECK (source_type IN ('csv_import', 'webhook', 'scrape', 'manual', 'api', 'excel_import')),\n    source_identifier VARCHAR(500) NOT NULL,\n    source_metadata JSONB DEFAULT '{}',\n    content_hash VARCHAR(64) NOT NULL,\n    extracted_cui VARCHAR(12),\n    extracted_email VARCHAR(255),\n    extracted_phone VARCHAR(20),\n    extracted_name VARCHAR(255),\n    processing_status VARCHAR(30) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'promoted', 'rejected', 'error')),\n    processing_error TEXT,\n    promoted_to_silver_id UUID,\n    promoted_at TIMESTAMPTZ,\n    do_not_process BOOLEAN DEFAULT FALSE,\n    is_duplicate BOOLEAN DEFAULT FALSE,\n    duplicate_of_id UUID REFERENCES bronze_contacts(id),\n    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);\n```\n\nDrizzle schema:\n```typescript\n// packages/db/src/schema/bronze.ts\nimport { pgTable, uuid, jsonb, varchar, boolean, timestamp, check } from 'drizzle-orm/pg-core';\nimport { tenants } from './tenants';\n\nexport const bronzeContacts = pgTable('bronze_contacts', {\n  id: uuid('id').primaryKey().defaultRandom(),\n  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),\n  rawPayload: jsonb('raw_payload').notNull(),\n  sourceType: varchar('source_type', { length: 30 }).notNull(),\n  sourceIdentifier: varchar('source_identifier', { length: 500 }).notNull(),\n  sourceMetadata: jsonb('source_metadata').default({}),\n  contentHash: varchar('content_hash', { length: 64 }).notNull(),\n  extractedCui: varchar('extracted_cui', { length: 12 }),\n  extractedEmail: varchar('extracted_email', { length: 255 }),\n  extractedPhone: varchar('extracted_phone', { length: 20 }),\n  extractedName: varchar('extracted_name', { length: 255 }),\n  processingStatus: varchar('processing_status', { length: 30 }).default('pending'),\n  processingError: text('processing_error'),\n  promotedToSilverId: uuid('promoted_to_silver_id'),\n  promotedAt: timestamp('promoted_at', { withTimezone: true }),\n  doNotProcess: boolean('do_not_process').default(false),\n  isDuplicate: boolean('is_duplicate').default(false),\n  duplicateOfId: uuid('duplicate_of_id'),\n  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),\n});\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/src/schema",
  "restrictii_antihalucinatie": {
    "NU": [
      "NU adăuga coloana updated_at - Bronze este IMUABIL",
      "NU folosi UNIQUE(cui) global - trebuie UNIQUE(tenant_id, content_hash)",
      "NU permite DELETE sau UPDATE pe raw_payload"
    ],
    "TREBUIE": [
      "TREBUIE să includă tenant_id pentru multi-tenancy",
      "TREBUIE să folosească JSONB pentru raw_payload",
      "TREBUIE să aibă content_hash pentru deduplicare"
    ],
    "VERIFICĂ": [
      "VERIFICĂ că CHECK constraints sunt valide",
      "VERIFICĂ că foreign keys au ON DELETE CASCADE",
      "VERIFICĂ encoding UTF-8 pentru varchar"
    ]
  },
  "validare_task": [
    "[ ] Tabelul creat în PostgreSQL",
    "[ ] Drizzle schema definită",
    "[ ] Migrație generată cu drizzle-kit generate",
    "[ ] Migrație aplicată cu drizzle-kit migrate",
    "[ ] Test insert row funcționează"
  ],
  "outcome": "Tabel bronze_contacts funcțional cu toate coloanele și constraints"
}
```

### F1.1.2 - Indecși bronze_contacts

```json
{
  "taskID": "F1.1.1.T002",
  "denumire_task": "Creare indecși pentru bronze_contacts",
  "context_anterior": "Tabel bronze_contacts creat (F1.1.1.T001)",
  "descriere_task": "Creare indecși conform schema:\n\n```sql\n-- Index pentru tenant isolation\nCREATE INDEX idx_bronze_contacts_tenant ON bronze_contacts(tenant_id);\n\n-- Index UNIQUE pentru deduplicare (per tenant)\nCREATE UNIQUE INDEX idx_bronze_contacts_hash_unique \nON bronze_contacts(tenant_id, content_hash) \nWHERE is_duplicate = FALSE;\n\n-- Index pentru procesare queue\nCREATE INDEX idx_bronze_contacts_pending \nON bronze_contacts(tenant_id, processing_status, created_at) \nWHERE processing_status = 'pending';\n\n-- Index pentru CUI lookup\nCREATE INDEX idx_bronze_contacts_cui \nON bronze_contacts(tenant_id, extracted_cui) \nWHERE extracted_cui IS NOT NULL;\n\n-- Index pentru email lookup\nCREATE INDEX idx_bronze_contacts_email \nON bronze_contacts(tenant_id, extracted_email) \nWHERE extracted_email IS NOT NULL;\n\n-- Index pentru source tracking\nCREATE INDEX idx_bronze_contacts_source \nON bronze_contacts(tenant_id, source_type, created_at DESC);\n\n-- Index GIN pentru căutare în raw_payload\nCREATE INDEX idx_bronze_contacts_payload_gin \nON bronze_contacts USING GIN (raw_payload);\n\n-- Index pentru promoted tracking\nCREATE INDEX idx_bronze_contacts_promoted \nON bronze_contacts(promoted_to_silver_id) \nWHERE promoted_to_silver_id IS NOT NULL;\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/drizzle",
  "restrictii_antihalucinatie": {
    "NU": [
      "NU crea index UNIQUE fără tenant_id",
      "NU folosi BTREE pentru JSONB (folosește GIN)"
    ],
    "TREBUIE": [
      "TREBUIE să folosească partial indexes cu WHERE clause",
      "TREBUIE să includă tenant_id în toate indexurile composite"
    ],
    "VERIFICĂ": [
      "VERIFICĂ că indexurile sunt create cu EXPLAIN ANALYZE",
      "VERIFICĂ că nu există duplicate index definitions"
    ]
  },
  "validare_task": [
    "[ ] Toate indexurile create",
    "[ ] EXPLAIN ANALYZE arată folosirea indexurilor",
    "[ ] Duplicate check funcționează"
  ],
  "outcome": "Bronze contacts optimizat pentru queries frecvente"
}
```

### F1.1.3 - RLS și Triggers bronze_contacts

```json
{
  "taskID": "F1.1.1.T003",
  "denumire_task": "Configurare RLS și triggers pentru bronze_contacts",
  "context_anterior": "Tabel și indecși bronze_contacts create",
  "descriere_task": "Configurare Row Level Security și triggers pentru imutabilitate:\n\n```sql\n-- Enable RLS\nALTER TABLE bronze_contacts ENABLE ROW LEVEL SECURITY;\nALTER TABLE bronze_contacts FORCE ROW LEVEL SECURITY;\n\n-- Policy pentru tenant isolation\nCREATE POLICY tenant_isolation_bronze_contacts ON bronze_contacts\nFOR ALL\nUSING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);\n\n-- Trigger pentru imutabilitate\nCREATE OR REPLACE FUNCTION bronze_prevent_modification()\nRETURNS TRIGGER AS $$\nBEGIN\n    IF TG_OP = 'UPDATE' THEN\n        IF OLD.raw_payload IS DISTINCT FROM NEW.raw_payload THEN\n            RAISE EXCEPTION 'Bronze raw_payload is immutable';\n        END IF;\n        IF OLD.content_hash IS DISTINCT FROM NEW.content_hash THEN\n            RAISE EXCEPTION 'Bronze content_hash is immutable';\n        END IF;\n        IF OLD.source_type IS DISTINCT FROM NEW.source_type THEN\n            RAISE EXCEPTION 'Bronze source_type is immutable';\n        END IF;\n        RETURN NEW;\n    END IF;\n    IF TG_OP = 'DELETE' THEN\n        RAISE EXCEPTION 'Bronze layer does not allow DELETE';\n    END IF;\n    RETURN NULL;\nEND;\n$$ LANGUAGE plpgsql;\n\nCREATE TRIGGER trg_bronze_contacts_immutable\nBEFORE UPDATE OR DELETE ON bronze_contacts\nFOR EACH ROW\nEXECUTE FUNCTION bronze_prevent_modification();\n\n-- Trigger pentru auto-extract identifiers\nCREATE OR REPLACE FUNCTION bronze_extract_identifiers()\nRETURNS TRIGGER AS $$\nBEGIN\n    NEW.extracted_cui := COALESCE(\n        NEW.raw_payload->>'cui',\n        NEW.raw_payload->>'CUI',\n        regexp_replace(NEW.raw_payload->>'cui_ro', '^RO', '', 'i')\n    );\n    NEW.extracted_email := LOWER(COALESCE(\n        NEW.raw_payload->>'email',\n        NEW.raw_payload->>'Email'\n    ));\n    NEW.extracted_phone := regexp_replace(\n        COALESCE(NEW.raw_payload->>'telefon', NEW.raw_payload->>'phone'),\n        '[^0-9+]', '', 'g'\n    );\n    NEW.extracted_name := COALESCE(\n        NEW.raw_payload->>'denumire',\n        NEW.raw_payload->>'name'\n    );\n    RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql;\n\nCREATE TRIGGER trg_bronze_contacts_extract\nBEFORE INSERT ON bronze_contacts\nFOR EACH ROW\nEXECUTE FUNCTION bronze_extract_identifiers();\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/drizzle",
  "restrictii_antihalucinatie": {
    "NU": [
      "NU dezactiva RLS în producție",
      "NU permite bypass pentru superuser fără FORCE ROW LEVEL SECURITY"
    ],
    "TREBUIE": [
      "TREBUIE să seteze app.current_tenant_id în fiecare request",
      "TREBUIE să protejeze câmpurile immutable"
    ],
    "VERIFICĂ": [
      "VERIFICĂ că RLS blochează accesul cross-tenant",
      "VERIFICĂ că UPDATE pe raw_payload aruncă eroare"
    ]
  },
  "validare_task": [
    "[ ] RLS activat și funcțional",
    "[ ] Trigger imutabilitate blochează modificări ilegale",
    "[ ] Trigger extract populează câmpurile automat",
    "[ ] Test cross-tenant access blocat"
  ],
  "outcome": "Bronze contacts securizat cu RLS și protected de modificări"
}
```

### F1.1.4 - Tabel bronze_import_batches

```json
{
  "taskID": "F1.1.1.T004",
  "denumire_task": "Creare tabel bronze_import_batches",
  "context_anterior": "bronze_contacts complet configurat",
  "descriere_task": "Creare tabel pentru tracking import batches:\n\n```sql\nCREATE TABLE bronze_import_batches (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,\n    source_type VARCHAR(30) NOT NULL,\n    filename VARCHAR(500),\n    file_size_bytes BIGINT,\n    file_checksum VARCHAR(64),\n    total_rows INTEGER NOT NULL DEFAULT 0,\n    processed_rows INTEGER NOT NULL DEFAULT 0,\n    success_rows INTEGER NOT NULL DEFAULT 0,\n    error_rows INTEGER NOT NULL DEFAULT 0,\n    duplicate_rows INTEGER NOT NULL DEFAULT 0,\n    status VARCHAR(30) DEFAULT 'pending'\n        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),\n    error_message TEXT,\n    imported_by UUID REFERENCES users(id),\n    started_at TIMESTAMPTZ,\n    completed_at TIMESTAMPTZ,\n    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);\n\n-- Indecși\nCREATE INDEX idx_bronze_batches_tenant ON bronze_import_batches(tenant_id);\nCREATE INDEX idx_bronze_batches_status ON bronze_import_batches(tenant_id, status);\n\n-- RLS\nALTER TABLE bronze_import_batches ENABLE ROW LEVEL SECURITY;\nCREATE POLICY tenant_isolation_batches ON bronze_import_batches\nFOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);\n```\n\nDrizzle schema:\n```typescript\nexport const bronzeImportBatches = pgTable('bronze_import_batches', {\n  id: uuid('id').primaryKey().defaultRandom(),\n  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),\n  sourceType: varchar('source_type', { length: 30 }).notNull(),\n  filename: varchar('filename', { length: 500 }),\n  fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }),\n  fileChecksum: varchar('file_checksum', { length: 64 }),\n  totalRows: integer('total_rows').notNull().default(0),\n  processedRows: integer('processed_rows').notNull().default(0),\n  successRows: integer('success_rows').notNull().default(0),\n  errorRows: integer('error_rows').notNull().default(0),\n  duplicateRows: integer('duplicate_rows').notNull().default(0),\n  status: varchar('status', { length: 30 }).default('pending'),\n  errorMessage: text('error_message'),\n  importedBy: uuid('imported_by').references(() => users.id),\n  startedAt: timestamp('started_at', { withTimezone: true }),\n  completedAt: timestamp('completed_at', { withTimezone: true }),\n  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),\n});\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/src/schema",
  "restrictii_antihalucinatie": {
    "NU": ["NU uita RLS pe acest tabel"],
    "TREBUIE": ["TREBUIE să referențieze users pentru imported_by"],
    "VERIFICĂ": ["VERIFICĂ că bigint mode este 'number' nu 'bigint'"]
  },
  "validare_task": [
    "[ ] Tabel creat cu toate coloanele",
    "[ ] RLS activat",
    "[ ] Indecși creați",
    "[ ] Foreign keys funcționale"
  ],
  "outcome": "bronze_import_batches funcțional pentru tracking importuri"
}
```

### F1.1.5 - Tabel bronze_webhooks

```json
{
  "taskID": "F1.1.1.T005",
  "denumire_task": "Creare tabel bronze_webhooks",
  "context_anterior": "bronze_import_batches creat",
  "descriere_task": "Creare tabel pentru logging webhooks primite:\n\n```sql\nCREATE TABLE bronze_webhooks (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,\n    webhook_type VARCHAR(100) NOT NULL,\n    source_ip INET,\n    source_url VARCHAR(500),\n    request_headers JSONB NOT NULL DEFAULT '{}',\n    request_body JSONB NOT NULL,\n    content_type VARCHAR(100),\n    signature_header VARCHAR(500),\n    signature_valid BOOLEAN,\n    processing_status VARCHAR(30) DEFAULT 'pending',\n    processed_contact_ids UUID[],\n    error_message TEXT,\n    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n    processed_at TIMESTAMPTZ\n);\n\nCREATE INDEX idx_bronze_webhooks_tenant ON bronze_webhooks(tenant_id);\nCREATE INDEX idx_bronze_webhooks_type ON bronze_webhooks(tenant_id, webhook_type);\nCREATE INDEX idx_bronze_webhooks_pending ON bronze_webhooks(processing_status) \nWHERE processing_status = 'pending';\n\nALTER TABLE bronze_webhooks ENABLE ROW LEVEL SECURITY;\nCREATE POLICY tenant_isolation_webhooks ON bronze_webhooks\nFOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/src/schema",
  "restrictii_antihalucinatie": {
    "NU": ["NU stoca API keys în request_headers - redactează-le"],
    "TREBUIE": ["TREBUIE să folosească INET pentru IP"],
    "VERIFICĂ": ["VERIFICĂ că UUID[] este suportat de Drizzle"]
  },
  "validare_task": [
    "[ ] Tabel creat",
    "[ ] RLS activat",
    "[ ] Test insert webhook funcționează"
  ],
  "outcome": "bronze_webhooks funcțional pentru audit webhooks"
}
```

### F1.1.6 - Funcții utilitare Bronze

```json
{
  "taskID": "F1.1.1.T006",
  "denumire_task": "Creare funcții SQL utilitare pentru Bronze layer",
  "context_anterior": "Toate tabelele Bronze create",
  "descriere_task": "Creare funcții SQL pentru operații comune:\n\n```sql\n-- Funcție: Calculare content hash\nCREATE OR REPLACE FUNCTION bronze_compute_content_hash(payload JSONB)\nRETURNS VARCHAR(64) AS $$\nDECLARE\n    normalized_payload JSONB;\n    hash_input TEXT;\nBEGIN\n    normalized_payload := jsonb_build_object(\n        'n', LOWER(TRIM(COALESCE(payload->>'denumire', payload->>'name', ''))),\n        'c', REGEXP_REPLACE(COALESCE(payload->>'cui', ''), '[^0-9]', '', 'g'),\n        'p', REGEXP_REPLACE(COALESCE(payload->>'telefon', payload->>'phone', ''), '[^0-9]', '', 'g'),\n        'e', LOWER(TRIM(COALESCE(payload->>'email', '')))\n    );\n    hash_input := normalized_payload::text;\n    RETURN encode(sha256(hash_input::bytea), 'hex');\nEND;\n$$ LANGUAGE plpgsql IMMUTABLE;\n\n-- Funcție: Check duplicate\nCREATE OR REPLACE FUNCTION bronze_check_duplicate(\n    p_tenant_id UUID,\n    p_payload JSONB\n)\nRETURNS TABLE(is_duplicate BOOLEAN, existing_id UUID) AS $$\nDECLARE\n    v_hash VARCHAR(64);\nBEGIN\n    v_hash := bronze_compute_content_hash(p_payload);\n    RETURN QUERY\n    SELECT TRUE, bc.id\n    FROM bronze_contacts bc\n    WHERE bc.tenant_id = p_tenant_id\n      AND bc.content_hash = v_hash\n      AND bc.is_duplicate = FALSE\n    LIMIT 1;\n    IF NOT FOUND THEN\n        is_duplicate := FALSE;\n        existing_id := NULL;\n        RETURN NEXT;\n    END IF;\nEND;\n$$ LANGUAGE plpgsql;\n\n-- Funcție: Statistici Bronze\nCREATE OR REPLACE FUNCTION bronze_get_stats(p_tenant_id UUID)\nRETURNS TABLE(\n    total_contacts BIGINT,\n    pending_contacts BIGINT,\n    promoted_contacts BIGINT,\n    rejected_contacts BIGINT,\n    duplicate_contacts BIGINT,\n    today_ingested BIGINT\n) AS $$\nBEGIN\n    RETURN QUERY\n    SELECT \n        COUNT(*)::BIGINT,\n        COUNT(*) FILTER (WHERE processing_status = 'pending')::BIGINT,\n        COUNT(*) FILTER (WHERE processing_status = 'promoted')::BIGINT,\n        COUNT(*) FILTER (WHERE processing_status = 'rejected')::BIGINT,\n        COUNT(*) FILTER (WHERE is_duplicate = TRUE)::BIGINT,\n        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::BIGINT\n    FROM bronze_contacts\n    WHERE tenant_id = p_tenant_id;\nEND;\n$$ LANGUAGE plpgsql;\n\n-- Grant permisiuni\nGRANT EXECUTE ON FUNCTION bronze_compute_content_hash(JSONB) TO cerniq_app;\nGRANT EXECUTE ON FUNCTION bronze_check_duplicate(UUID, JSONB) TO cerniq_app;\nGRANT EXECUTE ON FUNCTION bronze_get_stats(UUID) TO cerniq_app;\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/drizzle",
  "restrictii_antihalucinatie": {
    "NU": ["NU folosi pgcrypto - sha256 este nativă în PostgreSQL 14+"],
    "TREBUIE": ["TREBUIE să marcheze funcțiile pure ca IMMUTABLE"],
    "VERIFICĂ": ["VERIFICĂ că funcțiile sunt callable din aplicație"]
  },
  "validare_task": [
    "[ ] Funcții create în DB",
    "[ ] Test bronze_compute_content_hash returnează hash valid",
    "[ ] Test bronze_check_duplicate găsește duplicate",
    "[ ] Test bronze_get_stats returnează statistici corecte"
  ],
  "outcome": "Funcții SQL utilitare pentru operații Bronze"
}
```

---

## F1.2 DATABASE SCHEMA SILVER

### F1.2.1 - Creare tabel silver_companies

```json
{
  "taskID": "F1.2.1.T001",
  "denumire_task": "Creare tabel silver_companies cu toate coloanele",
  "context_anterior": "Bronze layer complet (F1.1)",
  "descriere_task": "Creare tabel silver_companies conform etapa1-schema-silver.md:\n\n```sql\nCREATE TABLE silver_companies (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,\n    source_bronze_id UUID REFERENCES bronze_contacts(id),\n    \n    -- Identificatori fiscali\n    cui VARCHAR(12) NOT NULL,\n    cui_validated BOOLEAN DEFAULT FALSE,\n    cui_validation_date TIMESTAMPTZ,\n    cui_validation_source VARCHAR(50),\n    cui_ro VARCHAR(14) GENERATED ALWAYS AS ('RO' || cui) STORED,\n    nr_reg_com VARCHAR(20),\n    \n    -- Denumire\n    denumire VARCHAR(255) NOT NULL,\n    denumire_normalizata VARCHAR(255) GENERATED ALWAYS AS (\n        UPPER(TRIM(REGEXP_REPLACE(denumire, '\\s+', ' ', 'g')))\n    ) STORED,\n    denumire_comerciala VARCHAR(255),\n    forma_juridica VARCHAR(20),\n    \n    -- Adresă\n    adresa_completa TEXT,\n    adresa_normalizata TEXT,\n    strada VARCHAR(200),\n    numar VARCHAR(20),\n    cod_postal VARCHAR(10),\n    localitate VARCHAR(100),\n    comuna VARCHAR(100),\n    judet VARCHAR(50),\n    judet_cod VARCHAR(2),\n    cod_siruta INTEGER,\n    \n    -- Coordonate\n    latitude DECIMAL(10, 7),\n    longitude DECIMAL(10, 7),\n    location_geography GEOGRAPHY(POINT, 4326),\n    geocoding_accuracy VARCHAR(30),\n    geocoding_source VARCHAR(30),\n    \n    -- Date fiscale ANAF\n    status_firma VARCHAR(20) DEFAULT 'UNKNOWN',\n    data_inregistrare DATE,\n    platitor_tva BOOLEAN,\n    data_inceput_tva DATE,\n    inregistrat_e_factura BOOLEAN DEFAULT FALSE,\n    cod_caen_principal VARCHAR(6),\n    denumire_caen VARCHAR(255),\n    coduri_caen_secundare VARCHAR(6)[] DEFAULT '{}',\n    \n    -- Date financiare Termene.ro\n    cifra_afaceri DECIMAL(15, 2),\n    profit_net DECIMAL(15, 2),\n    numar_angajati INTEGER,\n    capitaluri_proprii DECIMAL(15, 2),\n    datorii_totale DECIMAL(15, 2),\n    active_totale DECIMAL(15, 2),\n    an_bilant INTEGER,\n    scor_risc_termene INTEGER,\n    categorie_risc VARCHAR(20),\n    numar_dosare_actuale INTEGER DEFAULT 0,\n    in_insolventa BOOLEAN DEFAULT FALSE,\n    \n    -- Enrichment tracking\n    enrichment_status VARCHAR(30) DEFAULT 'pending',\n    enrichment_sources_completed VARCHAR(50)[] DEFAULT '{}',\n    enrichment_errors JSONB DEFAULT '{}',\n    last_enrichment_at TIMESTAMPTZ,\n    next_enrichment_at TIMESTAMPTZ,\n    \n    -- Quality scoring\n    completeness_score INTEGER DEFAULT 0,\n    accuracy_score INTEGER DEFAULT 0,\n    freshness_score INTEGER DEFAULT 0,\n    total_quality_score INTEGER DEFAULT 0,\n    quality_issues JSONB DEFAULT '[]',\n    \n    -- Promotion\n    promotion_status VARCHAR(30) DEFAULT 'pending',\n    promotion_blocked_reason TEXT,\n    promoted_to_gold_id UUID,\n    promoted_at TIMESTAMPTZ,\n    \n    -- Deduplicare\n    is_master_record BOOLEAN DEFAULT TRUE,\n    master_record_id UUID REFERENCES silver_companies(id),\n    duplicate_confidence DECIMAL(5, 4),\n    merge_history JSONB DEFAULT '[]',\n    \n    -- Timestamps\n    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/src/schema",
  "restrictii_antihalucinatie": {
    "NU": [
      "NU folosi UNIQUE(cui) global - trebuie UNIQUE(tenant_id, cui) WHERE is_master_record = TRUE"
    ],
    "TREBUIE": [
      "TREBUIE să aibă updated_at (Silver este MUTABLE)",
      "TREBUIE să folosească GEOGRAPHY pentru PostGIS"
    ],
    "VERIFICĂ": [
      "VERIFICĂ că GENERATED ALWAYS funcționează pentru expresii complexe"
    ]
  },
  "validare_task": [
    "[ ] Tabel creat cu toate coloanele",
    "[ ] GENERATED columns funcționează",
    "[ ] PostGIS GEOGRAPHY funcționează"
  ],
  "outcome": "silver_companies funcțional cu toate câmpurile enrichment"
}
```

### F1.2.2-6 - Indecși, RLS, Contacts, Log, Dedup

```json
{
  "taskID": "F1.2.1.T002",
  "denumire_task": "Creare indecși și RLS pentru silver_companies",
  "context_anterior": "Tabel silver_companies creat",
  "descriere_task": "Indecși esențiali pentru Silver:\n\n```sql\n-- UNIQUE per tenant\nCREATE UNIQUE INDEX idx_silver_companies_cui_tenant \nON silver_companies(tenant_id, cui) \nWHERE is_master_record = TRUE;\n\n-- Tenant isolation\nCREATE INDEX idx_silver_companies_tenant ON silver_companies(tenant_id);\n\n-- Enrichment queue\nCREATE INDEX idx_silver_companies_enrichment \nON silver_companies(tenant_id, enrichment_status, last_enrichment_at)\nWHERE enrichment_status IN ('pending', 'partial');\n\n-- Promotion eligibility\nCREATE INDEX idx_silver_companies_promotion \nON silver_companies(tenant_id, promotion_status, total_quality_score)\nWHERE promotion_status = 'eligible';\n\n-- Full-text search\nCREATE INDEX idx_silver_companies_denumire_trgm \nON silver_companies USING GIN (denumire_normalizata gin_trgm_ops);\n\n-- Geographic\nCREATE INDEX idx_silver_companies_geo \nON silver_companies USING GIST (location_geography);\n\n-- Quality score ordering\nCREATE INDEX idx_silver_companies_quality \nON silver_companies(tenant_id, total_quality_score DESC);\n\n-- Enable trigram extension first\nCREATE EXTENSION IF NOT EXISTS pg_trgm;\n\n-- RLS\nALTER TABLE silver_companies ENABLE ROW LEVEL SECURITY;\nALTER TABLE silver_companies FORCE ROW LEVEL SECURITY;\nCREATE POLICY tenant_isolation_silver_companies ON silver_companies\nFOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/drizzle",
  "restrictii_antihalucinatie": {
    "NU": ["NU uita pg_trgm pentru full-text search"],
    "TREBUIE": ["TREBUIE să activeze RLS și FORCE"],
    "VERIFICĂ": ["VERIFICĂ GIST index pentru geography"]
  },
  "validare_task": [
    "[ ] Toate indexurile create",
    "[ ] pg_trgm extension activată",
    "[ ] RLS funcțional"
  ],
  "outcome": "Silver companies optimizat pentru queries"
}
```

---

## F1.3 DATABASE SCHEMA GOLD

### F1.3.1 - Creare tabel gold_companies

```json
{
  "taskID": "F1.3.1.T001",
  "denumire_task": "Creare tabel gold_companies cu toate cele 10 secțiuni",
  "context_anterior": "Silver layer complet (F1.2)",
  "descriere_task": "Creare tabel gold_companies conform etapa1-schema-gold.md cu toate secțiunile:\n\n1. IDENTIFICARE\n2. DATE JURIDICE ȘI FISCALE\n3. DATE AGRICOLE SPECIFICE\n4. LOCAȚIE ȘI GEOGRAFIE\n5. DATE FINANCIARE\n6. LEAD SCORING\n7. RELAȚII ȘI ASOCIERI\n8. GDPR\n9. AI/ML FEATURES\n10. POST-VÂNZARE\n\n```sql\nCREATE TABLE gold_companies (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,\n    silver_id UUID UNIQUE REFERENCES silver_companies(id),\n    bronze_ids UUID[] DEFAULT '{}',\n    \n    -- [SECȚIUNEA 1-10 - vezi etapa1-schema-gold.md pentru schema completă]\n    -- ... toate câmpurile ...\n    \n    -- Lead Score și FSM\n    lead_score INTEGER NOT NULL DEFAULT 0,\n    fit_score INTEGER DEFAULT 0,\n    engagement_score INTEGER DEFAULT 0,\n    intent_score INTEGER DEFAULT 0,\n    current_state VARCHAR(30) NOT NULL DEFAULT 'COLD',\n    previous_state VARCHAR(30),\n    state_changed_at TIMESTAMPTZ DEFAULT NOW(),\n    state_history JSONB DEFAULT '[]',\n    \n    -- Timestamps\n    version INTEGER DEFAULT 1,\n    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);\n```\n\nNOTĂ: Schema completă are ~120 coloane - vezi documentul dedicat.",
  "director_implementare": "/var/www/CerniqAPP/packages/db/src/schema",
  "restrictii_antihalucinatie": {
    "NU": [
      "NU crea gold_companies fără toate câmpurile din schema",
      "NU folosi embedding fără pgvector extension"
    ],
    "TREBUIE": [
      "TREBUIE să instaleze pgvector: CREATE EXTENSION IF NOT EXISTS vector",
      "TREBUIE să aibă FSM state tracking complet"
    ],
    "VERIFICĂ": [
      "VERIFICĂ că VECTOR(1536) este recunoscut după pgvector install"
    ]
  },
  "validare_task": [
    "[ ] pgvector extension instalată",
    "[ ] Tabel creat cu toate cele ~120 coloane",
    "[ ] GENERATED columns funcționează",
    "[ ] FSM state history funcționează"
  ],
  "outcome": "gold_companies funcțional pentru outreach și vânzări"
}
```

### F1.3.2-6 - Indecși, Contacts, Journey, Triggers

```json
{
  "taskID": "F1.3.1.T002",
  "denumire_task": "Creare indecși și triggers pentru Gold layer",
  "context_anterior": "gold_companies creat",
  "descriere_task": "Indecși critici pentru Gold:\n\n```sql\n-- UNIQUE per tenant\nCREATE UNIQUE INDEX idx_gold_companies_cui_tenant ON gold_companies(tenant_id, cui);\n\n-- Lead scoring\nCREATE INDEX idx_gold_companies_lead_score \nON gold_companies(tenant_id, lead_score DESC, current_state)\nWHERE do_not_contact = FALSE;\n\n-- FSM state\nCREATE INDEX idx_gold_companies_state \nON gold_companies(tenant_id, current_state, state_changed_at);\n\n-- Geographic\nCREATE INDEX idx_gold_companies_geo \nON gold_companies USING GIST (location_geography);\n\n-- pgvector similarity search\nCREATE INDEX idx_gold_companies_embedding \nON gold_companies USING ivfflat (embedding vector_cosine_ops)\nWITH (lists = 100);\n\n-- Triggers\nCREATE OR REPLACE FUNCTION gold_log_state_transition()\nRETURNS TRIGGER AS $$\nBEGIN\n    IF OLD.current_state IS DISTINCT FROM NEW.current_state THEN\n        NEW.previous_state := OLD.current_state;\n        NEW.state_changed_at := NOW();\n        NEW.state_history := NEW.state_history || jsonb_build_object(\n            'from_state', OLD.current_state,\n            'to_state', NEW.current_state,\n            'changed_at', NOW()\n        );\n    END IF;\n    RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql;\n\nCREATE TRIGGER trg_gold_companies_fsm\nBEFORE UPDATE OF current_state ON gold_companies\nFOR EACH ROW\nEXECUTE FUNCTION gold_log_state_transition();\n\n-- Auto-compute lead score\nCREATE OR REPLACE FUNCTION gold_compute_lead_score()\nRETURNS TRIGGER AS $$\nBEGIN\n    NEW.lead_score := LEAST(100, GREATEST(0,\n        (COALESCE(NEW.fit_score, 0) * 0.40) +\n        (COALESCE(NEW.engagement_score, 0) * 0.35) +\n        (COALESCE(NEW.intent_score, 0) * 0.25)\n    ))::INTEGER;\n    NEW.data_calcul_scor := NOW();\n    RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql;\n\nCREATE TRIGGER trg_gold_companies_score\nBEFORE INSERT OR UPDATE OF fit_score, engagement_score, intent_score ON gold_companies\nFOR EACH ROW\nEXECUTE FUNCTION gold_compute_lead_score();\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/drizzle",
  "restrictii_antihalucinatie": {
    "NU": ["NU folosi index ivfflat fără date - trebuie CREATE INDEX după populated data"],
    "TREBUIE": ["TREBUIE să testeze trigger FSM cu tranziții"],
    "VERIFICĂ": ["VERIFICĂ lead_score se recalculează automat"]
  },
  "validare_task": [
    "[ ] Toate indexurile create",
    "[ ] FSM trigger funcționează",
    "[ ] Lead score se calculează automat"
  ],
  "outcome": "Gold layer optimizat pentru queries outreach"
}
```

---

## F1.4 WORKERS INFRASTRUCTURE

### F1.4.1 - BullMQ Connection Setup

```json
{
  "taskID": "F1.4.1.T001",
  "denumire_task": "Configurare conexiuni BullMQ pentru workers",
  "context_anterior": "Database complete, Redis configurat în Etapa 0",
  "descriere_task": "Setup conexiuni Redis pentru BullMQ:\n\n```typescript\n// packages/queue/src/config.ts\nimport IORedis from 'ioredis';\nimport { QueueOptions, WorkerOptions } from 'bullmq';\n\n// Conexiune producători (fail fast)\nexport const producerConnection = new IORedis({\n  host: process.env.REDIS_HOST || 'redis',\n  port: parseInt(process.env.REDIS_PORT || '64039'),\n  password: process.env.REDIS_PASSWORD,\n  maxRetriesPerRequest: 3,\n  enableOfflineQueue: false,\n  connectTimeout: 10000,\n  lazyConnect: true,\n});\n\n// Conexiune workeri (retry indefinit) - CRITIC pentru BullMQ\nexport const workerConnection = new IORedis({\n  host: process.env.REDIS_HOST || 'redis',\n  port: parseInt(process.env.REDIS_PORT || '64039'),\n  password: process.env.REDIS_PASSWORD,\n  maxRetriesPerRequest: null, // OBLIGATORIU pentru BullMQ workers\n  enableOfflineQueue: true,\n  retryStrategy: (times) => Math.min(Math.exp(times), 20000),\n});\n\n// Health check\nexport async function checkRedisConnection(): Promise<boolean> {\n  try {\n    await producerConnection.ping();\n    return true;\n  } catch {\n    return false;\n  }\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/queue/src",
  "restrictii_antihalucinatie": {
    "NU": [
      "NU folosi maxRetriesPerRequest cu valoare pentru workers - trebuie null",
      "NU partaja conexiunea între producers și workers"
    ],
    "TREBUIE": [
      "TREBUIE conexiuni separate pentru producers și workers",
      "TREBUIE maxmemory-policy noeviction în Redis"
    ],
    "VERIFICĂ": [
      "VERIFICĂ că Redis răspunde la PING",
      "VERIFICĂ că password-ul este citit din env"
    ]
  },
  "validare_task": [
    "[ ] Conexiuni create fără erori",
    "[ ] Health check funcționează",
    "[ ] Workers pot procesa jobs"
  ],
  "outcome": "Conexiuni BullMQ funcționale și reziliente"
}
```

### F1.4.2-8 - Worker Factory, Rate Limiter, Circuit Breaker

```json
{
  "taskID": "F1.4.1.T002",
  "denumire_task": "Creare Worker Factory Pattern",
  "context_anterior": "Conexiuni Redis configurate",
  "descriere_task": "Factory pattern pentru crearea workerilor:\n\n```typescript\n// packages/queue/src/worker-factory.ts\nimport { Worker, Job, Queue, QueueEvents } from 'bullmq';\nimport { Logger } from 'pino';\nimport { trace, SpanStatusCode } from '@opentelemetry/api';\nimport { workerConnection, producerConnection } from './config';\nimport { logger as baseLogger } from '@cerniq/logger';\nimport { metrics } from '@cerniq/metrics';\n\nexport interface WorkerConfig<TData, TResult> {\n  queueName: string;\n  processor: (job: Job<TData, TResult>, logger: Logger) => Promise<TResult>;\n  concurrency: number;\n  limiter?: { max: number; duration: number };\n  attempts?: number;\n  backoff?: { type: 'exponential' | 'fixed'; delay: number };\n  timeout?: number;\n}\n\nexport function createWorker<TData, TResult>(\n  config: WorkerConfig<TData, TResult>\n): Worker<TData, TResult> {\n  const worker = new Worker<TData, TResult>(\n    config.queueName,\n    async (job) => {\n      const jobLogger = baseLogger.child({\n        jobId: job.id,\n        queue: config.queueName,\n        correlationId: job.data.correlationId,\n      });\n      \n      const startTime = Date.now();\n      \n      try {\n        jobLogger.info({ data: job.data }, 'Job started');\n        \n        const result = await config.processor(job, jobLogger);\n        \n        const duration = Date.now() - startTime;\n        jobLogger.info({ duration, result }, 'Job completed');\n        \n        metrics.histogram('worker.job.duration', duration, {\n          queue: config.queueName,\n          status: 'success',\n        });\n        \n        return result;\n      } catch (error) {\n        const duration = Date.now() - startTime;\n        jobLogger.error({ error, duration }, 'Job failed');\n        \n        metrics.histogram('worker.job.duration', duration, {\n          queue: config.queueName,\n          status: 'failed',\n        });\n        \n        throw error;\n      }\n    },\n    {\n      connection: workerConnection,\n      concurrency: config.concurrency,\n      limiter: config.limiter,\n      autorun: false,\n      lockDuration: 60000,\n      stalledInterval: 30000,\n    }\n  );\n  \n  // Event handlers\n  worker.on('completed', (job) => {\n    metrics.counter('worker.jobs.completed', 1, { queue: config.queueName });\n  });\n  \n  worker.on('failed', (job, error) => {\n    metrics.counter('worker.jobs.failed', 1, { queue: config.queueName });\n  });\n  \n  return worker;\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/queue/src",
  "restrictii_antihalucinatie": {
    "NU": ["NU porni workerul automat (autorun: false)"],
    "TREBUIE": ["TREBUIE să logheze start/end pentru fiecare job"],
    "VERIFICĂ": ["VERIFICĂ că metrics sunt exportate"]
  },
  "validare_task": [
    "[ ] Factory creează workeri funcționali",
    "[ ] Logging funcționează",
    "[ ] Metrics sunt colectate"
  ],
  "outcome": "Worker factory reutilizabil pentru toți workerii"
}
```

---

## F1.5 WORKERS CATEGORIA A - INGESTIE

### F1.5.1 - CSV Parser Worker

```json
{
  "taskID": "F1.5.1.T001",
  "denumire_task": "Implementare A.1 CSV Parser Worker",
  "context_anterior": "Worker factory creat (F1.4)",
  "descriere_task": "Worker pentru parsare fișiere CSV:\n\n```typescript\n// apps/workers/src/bronze/csv-parser.worker.ts\nimport { createWorker } from '@cerniq/queue';\nimport Papa from 'papaparse';\nimport { createReadStream } from 'fs';\nimport { db, bronzeContacts, bronzeImportBatches } from '@cerniq/db';\nimport { eq } from 'drizzle-orm';\n\ninterface CsvParserJobData {\n  tenantId: string;\n  batchId: string;\n  filePath: string;\n  fileName: string;\n  encoding?: string;\n  delimiter?: string;\n  columnMapping?: Record<string, string>;\n  correlationId: string;\n}\n\nexport const csvParserWorker = createWorker<CsvParserJobData, { success: number; errors: number }>({\n  queueName: 'bronze:ingest:csv-parser',\n  concurrency: 5,\n  attempts: 3,\n  backoff: { type: 'exponential', delay: 1000 },\n  timeout: 300000, // 5 minute\n  \n  processor: async (job, logger) => {\n    const { tenantId, batchId, filePath, columnMapping, correlationId } = job.data;\n    \n    let successRows = 0;\n    let errorRows = 0;\n    let duplicateRows = 0;\n    \n    return new Promise((resolve, reject) => {\n      const stream = createReadStream(filePath, {\n        encoding: job.data.encoding || 'utf-8'\n      });\n      \n      Papa.parse(stream, {\n        header: true,\n        delimiter: job.data.delimiter || ',',\n        skipEmptyLines: true,\n        \n        step: async (results, parser) => {\n          parser.pause();\n          \n          try {\n            const row = results.data as Record<string, string>;\n            const mapped = columnMapping ? mapColumns(row, columnMapping) : row;\n            \n            // Compute hash\n            const contentHash = await db.execute(\n              sql`SELECT bronze_compute_content_hash(${mapped}::jsonb)`\n            );\n            \n            // Check duplicate\n            const existing = await db.query.bronzeContacts.findFirst({\n              where: (bc, { eq, and }) => and(\n                eq(bc.tenantId, tenantId),\n                eq(bc.contentHash, contentHash[0].bronze_compute_content_hash)\n              )\n            });\n            \n            if (existing) {\n              duplicateRows++;\n            } else {\n              await db.insert(bronzeContacts).values({\n                tenantId,\n                rawPayload: mapped,\n                sourceType: 'csv_import',\n                sourceIdentifier: `${job.data.fileName}:row_${results.meta.cursor}`,\n                sourceMetadata: { batchId, fileName: job.data.fileName },\n                contentHash: contentHash[0].bronze_compute_content_hash,\n              });\n              successRows++;\n            }\n          } catch (error) {\n            errorRows++;\n            logger.error({ error, row: results.meta.cursor }, 'Row error');\n          }\n          \n          parser.resume();\n        },\n        \n        complete: async () => {\n          // Update batch\n          await db.update(bronzeImportBatches)\n            .set({ status: 'completed', successRows, errorRows, duplicateRows, completedAt: new Date() })\n            .where(eq(bronzeImportBatches.id, batchId));\n          \n          resolve({ success: successRows, errors: errorRows });\n        },\n        \n        error: reject,\n      });\n    });\n  },\n});\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/workers/src/bronze",
  "restrictii_antihalucinatie": {
    "NU": ["NU citi tot fișierul în memorie - folosește streaming"],
    "TREBUIE": ["TREBUIE să pause/resume parser pentru async operations"],
    "VERIFICĂ": ["VERIFICĂ că batch status se actualizează"]
  },
  "validare_task": [
    "[ ] Worker procesează CSV",
    "[ ] Duplicate detection funcționează",
    "[ ] Batch stats se actualizează",
    "[ ] Fișiere mari (>1GB) procesate fără OOM"
  ],
  "outcome": "CSV Parser funcțional pentru import masiv"
}
```

### F1.5.2-6 - Excel, Webhook, Manual, API Workers

```json
{
  "taskID": "F1.5.1.T002",
  "denumire_task": "Implementare A.2 Excel Parser Worker",
  "context_anterior": "CSV Parser implementat",
  "descriere_task": "Worker pentru parsare fișiere Excel (.xlsx, .xls):\n\n```typescript\n// apps/workers/src/bronze/excel-parser.worker.ts\nimport * as XLSX from 'xlsx';\n// ... similar cu CSV dar folosind xlsx library\n\nexport const excelParserWorker = createWorker<ExcelParserJobData>({\n  queueName: 'bronze:ingest:excel-parser',\n  concurrency: 3,\n  timeout: 600000, // 10 minute\n  // ...\n});\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/workers/src/bronze",
  "restrictii_antihalucinatie": {
    "NU": ["NU ignora sheet selection pentru Excel"],
    "TREBUIE": ["TREBUIE să proceseze date formatate ca DATE din Excel"],
    "VERIFICĂ": ["VERIFICĂ că encoding funcționează pentru caractere românești"]
  },
  "validare_task": [
    "[ ] XLSX și XLS procesate",
    "[ ] Sheet selection funcționează",
    "[ ] Caractere românești corecte"
  ],
  "outcome": "Excel Parser funcțional"
}
```

---

## F1.10 WORKERS CAT. M-P - DEDUP, SCORE, PIPELINE

### F1.10.1 - Dedup Exact Match Worker

```json
{
  "taskID": "F1.10.1.T001",
  "denumire_task": "Implementare M.1 Exact Match Deduplicare",
  "context_anterior": "Enrichment workers complete",
  "descriere_task": "Worker pentru deduplicare exactă bazată pe CUI:\n\n```typescript\n// apps/workers/src/silver/dedup-exact.worker.ts\n\nexport const dedupExactWorker = createWorker<DedupJobData>({\n  queueName: 'silver:dedup:exact-match',\n  concurrency: 10,\n  \n  processor: async (job, logger) => {\n    const { tenantId, companyId } = job.data;\n    \n    const company = await db.query.silverCompanies.findFirst({\n      where: eq(silverCompanies.id, companyId)\n    });\n    \n    if (!company) return { status: 'not_found' };\n    \n    // Find exact duplicates by CUI\n    const duplicates = await db.query.silverCompanies.findMany({\n      where: and(\n        eq(silverCompanies.tenantId, tenantId),\n        eq(silverCompanies.cui, company.cui),\n        ne(silverCompanies.id, companyId),\n        eq(silverCompanies.isMasterRecord, true)\n      )\n    });\n    \n    if (duplicates.length > 0) {\n      // Merge into oldest record (master)\n      const master = duplicates.reduce((a, b) => \n        a.createdAt < b.createdAt ? a : b\n      );\n      \n      await db.update(silverCompanies)\n        .set({\n          isMasterRecord: false,\n          masterRecordId: master.id,\n          duplicateConfidence: 1.0, // Exact match\n        })\n        .where(eq(silverCompanies.id, companyId));\n      \n      logger.info({ masterId: master.id }, 'Exact duplicate merged');\n      return { status: 'merged', masterId: master.id };\n    }\n    \n    return { status: 'unique' };\n  },\n});\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/workers/src/silver",
  "restrictii_antihalucinatie": {
    "NU": ["NU șterge duplicate - doar marchează is_master_record = false"],
    "TREBUIE": ["TREBUIE să păstreze cel mai vechi record ca master"],
    "VERIFICĂ": ["VERIFICĂ că merge history se actualizează"]
  },
  "validare_task": [
    "[ ] Duplicate exacte detectate",
    "[ ] Master record selectat corect",
    "[ ] Merge nu pierde date"
  ],
  "outcome": "Deduplicare exactă funcțională"
}
```

### F1.10.2 - Fuzzy Match Deduplicare (HITL)

```json
{
  "taskID": "F1.10.1.T002",
  "denumire_task": "Implementare M.2 Fuzzy Match cu HITL trigger",
  "context_anterior": "Exact match implementat",
  "descriere_task": "Worker pentru deduplicare fuzzy cu Jaro-Winkler:\n\n```typescript\n// apps/workers/src/silver/dedup-fuzzy.worker.ts\nimport fuzzball from 'fuzzball';\n\nexport const dedupFuzzyWorker = createWorker<DedupJobData>({\n  queueName: 'silver:dedup:fuzzy-match',\n  concurrency: 5,\n  \n  processor: async (job, logger) => {\n    const { tenantId, companyId } = job.data;\n    \n    const company = await db.query.silverCompanies.findFirst({\n      where: eq(silverCompanies.id, companyId)\n    });\n    \n    // Find potential duplicates by name similarity\n    const candidates = await db.query.silverCompanies.findMany({\n      where: and(\n        eq(silverCompanies.tenantId, tenantId),\n        ne(silverCompanies.id, companyId),\n        eq(silverCompanies.isMasterRecord, true),\n        eq(silverCompanies.judet, company.judet) // Same county\n      )\n    });\n    \n    for (const candidate of candidates) {\n      const nameSimilarity = fuzzball.WRatio(\n        company.denumireNormalizata,\n        candidate.denumireNormalizata\n      );\n      \n      const addressSimilarity = fuzzball.partial_ratio(\n        company.adresaNormalizata || '',\n        candidate.adresaNormalizata || ''\n      );\n      \n      const confidence = (nameSimilarity * 0.7 + addressSimilarity * 0.3) / 100;\n      \n      if (confidence >= 0.70) {\n        // Create dedup candidate for review\n        await db.insert(silverDedupCandidates).values({\n          tenantId,\n          companyAId: company.id,\n          companyBId: candidate.id,\n          nameSimilarity: nameSimilarity / 100,\n          addressSimilarity: addressSimilarity / 100,\n          overallConfidence: confidence,\n          status: confidence >= 0.85 ? 'auto_merged' : 'hitl_review',\n        });\n        \n        if (confidence >= 0.85) {\n          // Auto merge high confidence\n          await mergeCompanies(company.id, candidate.id);\n          logger.info({ confidence }, 'Auto-merged high confidence');\n        } else {\n          // Create HITL approval task\n          await createApprovalTask({\n            entityType: 'dedup_candidate',\n            entityId: company.id,\n            approvalType: 'dedup_review',\n            pipelineStage: 'E1',\n            metadata: {\n              companyAId: company.id,\n              companyBId: candidate.id,\n              confidence,\n              nameSimilarity: nameSimilarity / 100,\n            },\n          });\n          logger.info({ confidence }, 'HITL review created');\n        }\n      }\n    }\n    \n    return { status: 'processed' };\n  },\n});\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/workers/src/silver",
  "restrictii_antihalucinatie": {
    "NU": ["NU auto-merge sub 85% confidence"],
    "TREBUIE": ["TREBUIE să creeze HITL task pentru 70-85%"],
    "VERIFICĂ": ["VERIFICĂ că fuzzball este instalat"]
  },
  "validare_task": [
    "[ ] Fuzzy matching funcționează",
    "[ ] Auto-merge peste 85%",
    "[ ] HITL created pentru 70-85%",
    "[ ] Sub 70% ignorat"
  ],
  "outcome": "Deduplicare fuzzy cu HITL integration"
}
```

---

## F1.11 HITL INTEGRATION

### F1.11.1 - Approval Service

```json
{
  "taskID": "F1.11.1.T001",
  "denumire_task": "Implementare Approval Service pentru Etapa 1",
  "context_anterior": "Workers dedup complete, HITL schema din Unified HITL doc",
  "descriere_task": "Service pentru creare și management approval tasks:\n\n```typescript\n// packages/hitl/src/approval.service.ts\nimport { db, approvalTasks, approvalTypeConfigs, approvalAuditLog } from '@cerniq/db';\nimport { Queue } from 'bullmq';\n\nexport class ApprovalService {\n  private escalationQueue: Queue;\n  \n  constructor() {\n    this.escalationQueue = new Queue('approval:escalation');\n  }\n  \n  async createTask(params: CreateApprovalParams): Promise<ApprovalTask> {\n    const config = await db.query.approvalTypeConfigs.findFirst({\n      where: eq(approvalTypeConfigs.approvalType, params.approvalType)\n    });\n    \n    if (!config) throw new Error(`Unknown approval type: ${params.approvalType}`);\n    \n    const slaMinutes = config[`sla_${params.priority || 'normal'}`];\n    const dueAt = new Date(Date.now() + slaMinutes * 60 * 1000);\n    \n    const [task] = await db.insert(approvalTasks).values({\n      tenantId: params.tenantId,\n      entityType: params.entityType,\n      entityId: params.entityId,\n      pipelineStage: params.pipelineStage,\n      approvalType: params.approvalType,\n      status: 'pending',\n      priority: params.priority || 'normal',\n      slaMinutes,\n      dueAt,\n      metadata: params.metadata,\n      bullmqJobId: params.bullmqJobId,\n      bullmqQueueName: params.bullmqQueueName,\n    }).returning();\n    \n    // Schedule escalation jobs\n    await this.scheduleEscalation(task);\n    \n    // Emit event\n    await this.emitEvent('APPROVAL_CREATED', task);\n    \n    return task;\n  }\n  \n  async decide(taskId: string, decision: Decision): Promise<ApprovalTask> {\n    const task = await db.query.approvalTasks.findFirst({\n      where: eq(approvalTasks.id, taskId)\n    });\n    \n    if (!task) throw new Error('Task not found');\n    if (['approved', 'rejected', 'expired'].includes(task.status)) {\n      throw new Error('Task already decided');\n    }\n    \n    const [updated] = await db.update(approvalTasks)\n      .set({\n        status: decision.decision,\n        decision: decision.decision,\n        decisionReason: decision.reason,\n        decidedBy: decision.decidedBy,\n        decidedAt: new Date(),\n      })\n      .where(eq(approvalTasks.id, taskId))\n      .returning();\n    \n    // Cancel escalation jobs\n    await this.cancelEscalation(task);\n    \n    // Log audit\n    await db.insert(approvalAuditLog).values({\n      taskId,\n      action: `DECISION_${decision.decision.toUpperCase()}`,\n      performedBy: decision.decidedBy,\n      details: { reason: decision.reason },\n    });\n    \n    // Resume blocked job if approved\n    if (decision.decision === 'approved' && task.bullmqJobId) {\n      await this.resumeBlockedJob(task);\n    }\n    \n    return updated;\n  }\n  \n  private async scheduleEscalation(task: ApprovalTask) {\n    // Warning at 80% SLA\n    const warningDelay = task.slaMinutes * 0.8 * 60 * 1000;\n    await this.escalationQueue.add(\n      'warn',\n      { taskId: task.id },\n      { delay: warningDelay, jobId: `warn-${task.id}` }\n    );\n    \n    // Escalation at 100% SLA\n    const escalationDelay = task.slaMinutes * 60 * 1000;\n    await this.escalationQueue.add(\n      'escalate',\n      { taskId: task.id },\n      { delay: escalationDelay, jobId: `esc-${task.id}` }\n    );\n  }\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/hitl/src",
  "restrictii_antihalucinatie": {
    "NU": ["NU permite multiple decisions pe același task"],
    "TREBUIE": ["TREBUIE să schedule escalation delayed jobs"],
    "VERIFICĂ": ["VERIFICĂ că blocked jobs sunt resumed"]
  },
  "validare_task": [
    "[ ] Tasks create corect",
    "[ ] SLA calculat corect",
    "[ ] Escalation scheduled",
    "[ ] Decision flow complet"
  ],
  "outcome": "HITL Approval Service funcțional"
}
```

---

## F1.15 TESTING & MONITORING

### F1.15.1 - Unit Tests Workers

```json
{
  "taskID": "F1.15.1.T001",
  "denumire_task": "Unit tests pentru workers Etapa 1",
  "context_anterior": "Toți workerii implementați",
  "descriere_task": "Teste pentru fiecare worker category:\n\n```typescript\n// apps/workers/tests/bronze/csv-parser.test.ts\nimport { describe, it, expect, beforeAll, afterAll } from 'vitest';\nimport { csvParserWorker } from '../../src/bronze/csv-parser.worker';\nimport { createTestDb, seedTestData, cleanupTestDb } from '@cerniq/test-utils';\n\ndescribe('CSV Parser Worker', () => {\n  let testDb: TestDatabase;\n  \n  beforeAll(async () => {\n    testDb = await createTestDb();\n    await seedTestData(testDb);\n  });\n  \n  afterAll(async () => {\n    await cleanupTestDb(testDb);\n  });\n  \n  it('should parse valid CSV and create bronze contacts', async () => {\n    const job = createMockJob({\n      tenantId: 'test-tenant',\n      batchId: 'test-batch',\n      filePath: './fixtures/valid.csv',\n      fileName: 'valid.csv',\n      correlationId: 'test-correlation',\n    });\n    \n    const result = await csvParserWorker.processor(job, mockLogger);\n    \n    expect(result.success).toBeGreaterThan(0);\n    expect(result.errors).toBe(0);\n  });\n  \n  it('should detect and skip duplicates', async () => {\n    // Insert existing record\n    await testDb.insert(bronzeContacts).values({\n      tenantId: 'test-tenant',\n      rawPayload: { denumire: 'TEST', cui: '12345678' },\n      contentHash: 'abc123',\n      sourceType: 'csv_import',\n      sourceIdentifier: 'existing',\n    });\n    \n    const job = createMockJob({\n      // Same data\n    });\n    \n    const result = await csvParserWorker.processor(job, mockLogger);\n    \n    // Should have duplicate\n    expect(result.duplicates).toBeGreaterThan(0);\n  });\n  \n  it('should handle malformed CSV gracefully', async () => {\n    const job = createMockJob({\n      filePath: './fixtures/malformed.csv',\n    });\n    \n    await expect(csvParserWorker.processor(job, mockLogger))\n      .rejects.toThrow();\n  });\n});\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/workers/tests",
  "restrictii_antihalucinatie": {
    "NU": ["NU folosi production DB pentru teste"],
    "TREBUIE": ["TREBUIE să cleanup după fiecare test"],
    "VERIFICĂ": ["VERIFICĂ coverage >= 80%"]
  },
  "validare_task": [
    "[ ] Tests trec pentru toți workerii",
    "[ ] Coverage >= 80%",
    "[ ] No flaky tests"
  ],
  "outcome": "Test suite complet pentru Etapa 1"
}
```

---

## REZUMAT FINAL

### Statistici Plan Implementare Etapa 1

| Metrică | Valoare |
| --------- | --------- |
| **Faze totale** | 15 (F1.1 - F1.15) |
| **Taskuri totale** | ~126 |
| **Workers implementați** | 61 |
| **Tabele database** | ~12 |
| **API endpoints** | ~40 |
| **Pagini frontend** | ~15 |
| **HITL approval types** | 3 |

## Dependențe Critice

1. **Etapa 0** trebuie 100% completă înainte de F1.1
2. **F1.1-F1.3** (database) trebuie complete înainte de F1.4+ (workers)
3. **F1.11** (HITL) poate fi paralel cu F1.5-F1.10
4. **F1.15** (testing) continuu pe măsură ce se implementează

## Next Steps

1. Review plan cu stakeholders
2. Estimare effort per task
3. Alocare resurse
4. Sprint planning

---

**Document generat:** 15 Ianuarie 2026
**Conformitate:** Master Spec v1.2
**Status:** READY FOR IMPLEMENTATION
