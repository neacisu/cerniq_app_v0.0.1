# CERNIQ.APP — ETAPA 1: SPRINT PLAN

## Data Enrichment Pipeline — Plan Execuție

### Versiunea 1.0 | 2 Februarie 2026

---

## METADATA DOCUMENT

| Câmp                | Valoare                                 |
| ------------------- | --------------------------------------- |
| **Etapă**           | E1 - Data Enrichment                    |
| **Versiune**        | 1.0                                     |
| **Data creării**    | 2 Februarie 2026                        |
| **Autor**           | Cerniq Development Team                 |
| **Status**          | APPROVED - Ready for Execution          |
| **Durată totală**   | 8 săptămâni (4 sprinturi × 2 săptămâni) |
| **Total Sprinturi** | 4                                       |
| **Total PR-uri**    | 32                                      |
| **Total Task-uri**  | 126                                     |

---

## CONVENȚIE NUMEROTARE TASK-URI

### Schema Standardizată: `E{etapa}.S{sprint}.PR{pr}.{task}`

```
E1.S1.PR1.001
│  │  │   │
│  │  │   └── Task secvențial (001-999)
│  │  └────── PR în sprint (1-99)
│  └───────── Sprint (1-4)
└──────────── Etapa (1-5)
```

### Exemple

| Task ID         | Descriere                        |
| --------------- | -------------------------------- |
| `E1.S1.PR1.001` | Etapa 1, Sprint 1, PR 1, Task 1  |
| `E1.S2.PR3.005` | Etapa 1, Sprint 2, PR 3, Task 5  |
| `E1.S4.PR8.012` | Etapa 1, Sprint 4, PR 8, Task 12 |

### Mapare Faze → Sprinturi

| Fază        | Sprint | Descriere                         |
| ----------- | ------ | --------------------------------- |
| F1.1-F1.4   | S1     | Database + Workers Infrastructure |
| F1.5-F1.7   | S2     | Workers Categories A-E            |
| F1.8-F1.11  | S3     | Workers F-P + HITL                |
| F1.12-F1.15 | S4     | API + Frontend + Testing          |

---

## SPRINT 1: FOUNDATION (Săptămâna 1-2)

### 📅 Perioada: 3-14 Februarie 2026

### 🎯 Obiective Sprint

- [x] Database schema Bronze layer complet
- [x] Database schema Silver layer complet
- [x] Database schema Gold layer complet
- [x] Workers infrastructure BullMQ setup

### 📊 Metrici Sprint

| Metrică              | Target | Actual |
| -------------------- | ------ | ------ |
| PR-uri planificate   | 8      | -      |
| Task-uri planificate | 32     | -      |
| Story Points         | 40     | -      |
| Test Coverage        | ≥80%   | -      |

---

### PR E1.S1.PR1: Bronze Schema + Migrations

**Branch:** `feature/e1-s1-pr1-bronze-schema`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                                                           | Status  | Assignee | Estimare |
| ------------- | ------------------------------------------------------------------ | ------- | -------- | -------- |
| E1.S1.PR1.001 | Creare tabel `bronze_contacts` cu toate coloanele                  | ⬜ TODO | -        | 4h       |
| E1.S1.PR1.002 | Creare indecși pentru `bronze_contacts` (8 indecși)                | ⬜ TODO | -        | 2h       |
| E1.S1.PR1.003 | Configurare RLS și triggers imutabilitate Bronze                   | ⬜ TODO | -        | 3h       |
| E1.S1.PR1.004 | Creare tabel `bronze_import_batches`                               | ⬜ TODO | -        | 2h       |
| E1.S1.PR1.005 | Creare tabel `bronze_webhooks`                                     | ⬜ TODO | -        | 2h       |
| E1.S1.PR1.006 | Funcții SQL utilitare Bronze (`bronze_compute_content_hash`, etc.) | ⬜ TODO | -        | 3h       |

#### Acceptance Criteria

- [ ] Toate tabelele Bronze create și migrate
- [ ] RLS activat pe toate tabelele
- [ ] Trigger imutabilitate blochează UPDATE pe `raw_payload`
- [ ] Test cross-tenant access blocat
- [ ] Migrații Drizzle generate și aplicabile

#### Definition of Done

- [ ] Code review approved
- [ ] Unit tests passing (≥80% coverage)
- [ ] Migration testată în staging
- [ ] Documentație actualizată

---

### PR E1.S1.PR2: Silver Schema + Migrations

**Branch:** `feature/e1-s1-pr2-silver-schema`  
**Reviewer:** @lead-dev  
**Estimare:** 4 zile

#### Tasks

| Task ID       | Denumire                                                   | Status  | Assignee | Estimare |
| ------------- | ---------------------------------------------------------- | ------- | -------- | -------- |
| E1.S1.PR2.001 | Creare tabel `silver_companies` (~80 coloane)              | ⬜ TODO | -        | 6h       |
| E1.S1.PR2.002 | Creare indecși Silver (tenant, enrichment, promotion, FTS) | ⬜ TODO | -        | 3h       |
| E1.S1.PR2.003 | Configurare RLS și triggers Silver                         | ⬜ TODO | -        | 2h       |
| E1.S1.PR2.004 | Creare tabel `silver_contacts`                             | ⬜ TODO | -        | 3h       |
| E1.S1.PR2.005 | Creare tabel `silver_enrichment_log`                       | ⬜ TODO | -        | 2h       |
| E1.S1.PR2.006 | Creare tabel `silver_dedup_candidates`                     | ⬜ TODO | -        | 2h       |

#### Acceptance Criteria

- [ ] Toate cele 4 tabele Silver create
- [ ] GENERATED columns funcționează (`denumire_normalizata`, etc.)
- [ ] PostGIS geography columns funcționale
- [ ] pg_trgm extension activată pentru FTS
- [ ] Migrații generate și aplicabile

---

### PR E1.S1.PR3: Gold Schema + FSM

**Branch:** `feature/e1-s1-pr3-gold-schema`  
**Reviewer:** @lead-dev  
**Estimare:** 4 zile

#### Tasks

| Task ID       | Denumire                                                         | Status  | Assignee | Estimare |
| ------------- | ---------------------------------------------------------------- | ------- | -------- | -------- |
| E1.S1.PR3.001 | Instalare pgvector extension                                     | ⬜ TODO | -        | 1h       |
| E1.S1.PR3.002 | Creare tabel `gold_companies` (~120 coloane, 10 secțiuni)        | ⬜ TODO | -        | 8h       |
| E1.S1.PR3.003 | Creare indecși Gold (lead_score, FSM state, vector)              | ⬜ TODO | -        | 3h       |
| E1.S1.PR3.004 | Creare trigger FSM `gold_log_state_transition`                   | ⬜ TODO | -        | 2h       |
| E1.S1.PR3.005 | Creare trigger auto-compute `gold_compute_lead_score`            | ⬜ TODO | -        | 2h       |
| E1.S1.PR3.006 | Creare tabele auxiliare (`gold_contacts`, `gold_journey_events`) | ⬜ TODO | -        | 3h       |

#### Acceptance Criteria

- [ ] pgvector funcțional pentru embeddings
- [ ] FSM trigger loghează tranziții în `state_history`
- [ ] Lead score se recalculează automat
- [ ] Toate cele 10 secțiuni schema implementate

---

### PR E1.S1.PR4: BullMQ Infrastructure

**Branch:** `feature/e1-s1-pr4-bullmq-infra`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                                  | Status  | Assignee | Estimare |
| ------------- | ----------------------------------------- | ------- | -------- | -------- |
| E1.S1.PR4.001 | Setup conexiuni Redis (producer + worker) | ⬜ TODO | -        | 2h       |
| E1.S1.PR4.002 | Creare Worker Factory Pattern             | ⬜ TODO | -        | 4h       |
| E1.S1.PR4.003 | Implementare Rate Limiter per queue       | ⬜ TODO | -        | 3h       |
| E1.S1.PR4.004 | Implementare Circuit Breaker pattern      | ⬜ TODO | -        | 3h       |
| E1.S1.PR4.005 | Setup metrics și logging pentru workers   | ⬜ TODO | -        | 2h       |
| E1.S1.PR4.006 | Health check și graceful shutdown         | ⬜ TODO | -        | 2h       |

#### Acceptance Criteria

- [ ] Conexiuni Redis separate producer/worker
- [ ] Worker factory creează workeri cu logging și metrics
- [ ] Circuit breaker previne cascade failures
- [ ] Graceful shutdown procesează jobs în curs

---

### PR E1.S1.PR5: Queue Registry

**Branch:** `feature/e1-s1-pr5-queue-registry`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                                       | Status  | Assignee | Estimare |
| ------------- | ---------------------------------------------- | ------- | -------- | -------- |
| E1.S1.PR5.001 | Definire toate queue-urile Etapa 1 (58 queues) | ⬜ TODO | -        | 3h       |
| E1.S1.PR5.002 | Configurare rate limits per queue              | ⬜ TODO | -        | 2h       |
| E1.S1.PR5.003 | Setup queue events și monitoring               | ⬜ TODO | -        | 2h       |
| E1.S1.PR5.004 | Dashboard Bull Board pentru debugging          | ⬜ TODO | -        | 2h       |

---

### PR E1.S1.PR6: Drizzle Migrations Runner

**Branch:** `feature/e1-s1-pr6-migrations`  
**Reviewer:** @lead-dev  
**Estimare:** 1 zi

#### Tasks

| Task ID       | Denumire                            | Status  | Assignee | Estimare |
| ------------- | ----------------------------------- | ------- | -------- | -------- |
| E1.S1.PR6.001 | Script migration runner cu rollback | ⬜ TODO | -        | 2h       |
| E1.S1.PR6.002 | Seed data pentru development        | ⬜ TODO | -        | 2h       |
| E1.S1.PR6.003 | Integrare CI/CD pentru migrații     | ⬜ TODO | -        | 2h       |

---

### PR E1.S1.PR7: Unit Tests Database

**Branch:** `feature/e1-s1-pr7-db-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                                      | Status  | Assignee | Estimare |
| ------------- | --------------------------------------------- | ------- | -------- | -------- |
| E1.S1.PR7.001 | Tests pentru Bronze layer (RLS, triggers)     | ⬜ TODO | -        | 3h       |
| E1.S1.PR7.002 | Tests pentru Silver layer (enrichment, dedup) | ⬜ TODO | -        | 3h       |
| E1.S1.PR7.003 | Tests pentru Gold layer (FSM, scoring)        | ⬜ TODO | -        | 3h       |
| E1.S1.PR7.004 | Tests pentru funcții SQL utilitare            | ⬜ TODO | -        | 2h       |

---

### PR E1.S1.PR8: Integration Tests Infrastructure

**Branch:** `feature/e1-s1-pr8-infra-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 1 zi

#### Tasks

| Task ID       | Denumire                                  | Status  | Assignee | Estimare |
| ------------- | ----------------------------------------- | ------- | -------- | -------- |
| E1.S1.PR8.001 | Test containers setup (PostgreSQL, Redis) | ⬜ TODO | -        | 2h       |
| E1.S1.PR8.002 | Integration tests BullMQ                  | ⬜ TODO | -        | 2h       |
| E1.S1.PR8.003 | Performance baseline tests                | ⬜ TODO | -        | 2h       |

---

## SPRINT 2: INGESTION & ENRICHMENT CORE (Săptămâna 3-4)

### 📅 Perioada: 17-28 Februarie 2026

### 🎯 Obiective Sprint

- [ ] Workers Category A - Ingestie (5 workers)
- [ ] Workers Category B-C - Normalizare & Validare (6 workers)
- [ ] Workers Category D-E - ANAF & Termene.ro (9 workers)

### 📊 Metrici Sprint

| Metrică              | Target | Actual |
| -------------------- | ------ | ------ |
| PR-uri planificate   | 8      | -      |
| Task-uri planificate | 32     | -      |
| Workers implementați | 20     | -      |
| Story Points         | 50     | -      |

---

### PR E1.S2.PR1: Workers A.1-A.2 (CSV/Excel Parser)

**Branch:** `feature/e1-s2-pr1-workers-csv-excel`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                             | Status  | Assignee | Estimare |
| ------------- | ------------------------------------ | ------- | -------- | -------- |
| E1.S2.PR1.001 | Implementare A.1 CSV Parser Worker   | ⬜ TODO | -        | 6h       |
| E1.S2.PR1.002 | Implementare A.2 Excel Parser Worker | ⬜ TODO | -        | 4h       |
| E1.S2.PR1.003 | Column mapping și encoding detection | ⬜ TODO | -        | 3h       |
| E1.S2.PR1.004 | Streaming pentru fișiere mari (>1GB) | ⬜ TODO | -        | 3h       |
| E1.S2.PR1.005 | Unit tests CSV/Excel workers         | ⬜ TODO | -        | 2h       |

#### Acceptance Criteria

- [ ] CSV parsing cu PapaParse streaming
- [ ] Excel parsing cu XLSX library
- [ ] Caractere românești detectate corect
- [ ] Fișiere >1GB procesate fără OOM

---

### PR E1.S2.PR2: Workers A.3-A.5 (Webhook/API/Manual)

**Branch:** `feature/e1-s2-pr2-workers-ingest`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                                 | Status  | Assignee | Estimare |
| ------------- | ---------------------------------------- | ------- | -------- | -------- |
| E1.S2.PR2.001 | Implementare A.3 Webhook Receiver Worker | ⬜ TODO | -        | 3h       |
| E1.S2.PR2.002 | Implementare A.4 API Poller Worker       | ⬜ TODO | -        | 3h       |
| E1.S2.PR2.003 | Implementare A.5 Manual Entry Handler    | ⬜ TODO | -        | 2h       |
| E1.S2.PR2.004 | Signature validation pentru webhooks     | ⬜ TODO | -        | 2h       |

---

### PR E1.S2.PR3: Workers B.1-B.4 (Normalizare)

**Branch:** `feature/e1-s2-pr3-workers-normalize`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                                         | Status  | Assignee | Estimare |
| ------------- | ------------------------------------------------ | ------- | -------- | -------- |
| E1.S2.PR3.001 | Implementare B.1 Name Normalizer Worker          | ⬜ TODO | -        | 3h       |
| E1.S2.PR3.002 | Implementare B.2 Email Normalizer Worker         | ⬜ TODO | -        | 2h       |
| E1.S2.PR3.003 | Implementare B.3 Phone Normalizer Worker (E.164) | ⬜ TODO | -        | 3h       |
| E1.S2.PR3.004 | Implementare B.4 Address Normalizer Worker       | ⬜ TODO | -        | 4h       |
| E1.S2.PR3.005 | Unit tests normalization workers                 | ⬜ TODO | -        | 2h       |

#### Acceptance Criteria

- [ ] Nume normalizate cu diacritice corecte
- [ ] Email lowercase și validated format
- [ ] Telefoane în format E.164 (+40...)
- [ ] Adrese cu județul detectat

---

### PR E1.S2.PR4: Workers C.1-C.2 (Validare CUI/Email)

**Branch:** `feature/e1-s2-pr4-workers-validate`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                                   | Status  | Assignee | Estimare |
| ------------- | ------------------------------------------ | ------- | -------- | -------- |
| E1.S2.PR4.001 | Implementare C.1 CUI Validator (Modulo-11) | ⬜ TODO | -        | 3h       |
| E1.S2.PR4.002 | Implementare C.2 Email Syntax Validator    | ⬜ TODO | -        | 2h       |
| E1.S2.PR4.003 | Batch validation pentru eficiență          | ⬜ TODO | -        | 2h       |
| E1.S2.PR4.004 | Tests și edge cases                        | ⬜ TODO | -        | 2h       |

---

### PR E1.S2.PR5: Workers D.1-D.5 (ANAF Integration)

**Branch:** `feature/e1-s2-pr5-workers-anaf`  
**Reviewer:** @lead-dev  
**Estimare:** 4 zile

#### Tasks

| Task ID       | Denumire                                   | Status  | Assignee | Estimare |
| ------------- | ------------------------------------------ | ------- | -------- | -------- |
| E1.S2.PR5.001 | Implementare D.1 ANAF Fiscal Status Worker | ⬜ TODO | -        | 4h       |
| E1.S2.PR5.002 | Implementare D.2 ANAF TVA Worker           | ⬜ TODO | -        | 3h       |
| E1.S2.PR5.003 | Implementare D.3 ANAF CAEN Worker          | ⬜ TODO | -        | 3h       |
| E1.S2.PR5.004 | Implementare D.4 ANAF e-Factura Worker     | ⬜ TODO | -        | 2h       |
| E1.S2.PR5.005 | Implementare D.5 ANAF Batch Orchestrator   | ⬜ TODO | -        | 3h       |
| E1.S2.PR5.006 | Rate limiting 1 req/sec pentru ANAF        | ⬜ TODO | -        | 2h       |

#### Acceptance Criteria

- [ ] ANAF API integration funcțională
- [ ] Rate limit 1 req/sec respectat
- [ ] Toate câmpurile fiscale populate
- [ ] Error handling și retry logic

---

### PR E1.S2.PR6: Workers E.1-E.4 (Termene.ro Integration)

**Branch:** `feature/e1-s2-pr6-workers-termene`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                                      | Status  | Assignee | Estimare |
| ------------- | --------------------------------------------- | ------- | -------- | -------- |
| E1.S2.PR6.001 | Implementare E.1 Termene Balance Sheet Worker | ⬜ TODO | -        | 4h       |
| E1.S2.PR6.002 | Implementare E.2 Termene Risk Score Worker    | ⬜ TODO | -        | 3h       |
| E1.S2.PR6.003 | Implementare E.3 Termene Dosare Worker        | ⬜ TODO | -        | 3h       |
| E1.S2.PR6.004 | Implementare E.4 Termene Associates Worker    | ⬜ TODO | -        | 2h       |
| E1.S2.PR6.005 | API key rotation și rate limiting             | ⬜ TODO | -        | 2h       |

---

### PR E1.S2.PR7: Bronze → Silver Promotion

**Branch:** `feature/e1-s2-pr7-bronze-silver-promotion`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                                     | Status  | Assignee | Estimare |
| ------------- | -------------------------------------------- | ------- | -------- | -------- |
| E1.S2.PR7.001 | Implementare promotion logic Bronze → Silver | ⬜ TODO | -        | 4h       |
| E1.S2.PR7.002 | Merge duplicate records la promotion         | ⬜ TODO | -        | 3h       |
| E1.S2.PR7.003 | Trigger enrichment queue după promotion      | ⬜ TODO | -        | 2h       |

---

### PR E1.S2.PR8: Integration Tests Sprint 2

**Branch:** `feature/e1-s2-pr8-integration-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                                     | Status  | Assignee | Estimare |
| ------------- | -------------------------------------------- | ------- | -------- | -------- |
| E1.S2.PR8.001 | Integration tests CSV → Bronze → Silver flow | ⬜ TODO | -        | 4h       |
| E1.S2.PR8.002 | Integration tests ANAF enrichment            | ⬜ TODO | -        | 3h       |
| E1.S2.PR8.003 | Integration tests Termene enrichment         | ⬜ TODO | -        | 3h       |
| E1.S2.PR8.004 | Mock services pentru external APIs           | ⬜ TODO | -        | 2h       |

---

## SPRINT 3: ENRICHMENT ADVANCED & HITL (Săptămâna 5-6)

### 📅 Perioada: 3-14 Martie 2026

### 🎯 Obiective Sprint

- [ ] Workers Category F-H - ONRC, Email, Phone (11 workers)
- [ ] Workers Category I-L - Scraping, AI, Geo, Agri (16 workers)
- [ ] Workers Category M-P - Dedup, Score, Pipeline (11 workers)
- [ ] HITL Integration complet

### 📊 Metrici Sprint

| Metrică              | Target | Actual |
| -------------------- | ------ | ------ |
| PR-uri planificate   | 8      | -      |
| Task-uri planificate | 34     | -      |
| Workers implementați | 38     | -      |
| Story Points         | 55     | -      |

---

### PR E1.S3.PR1: Workers F.1-F.3 (ONRC)

**Branch:** `feature/e1-s3-pr1-workers-onrc`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                                     | Status  | Assignee | Estimare |
| ------------- | -------------------------------------------- | ------- | -------- | -------- |
| E1.S3.PR1.001 | Implementare F.1 ONRC Company Details Worker | ⬜ TODO | -        | 4h       |
| E1.S3.PR1.002 | Implementare F.2 ONRC Associates Worker      | ⬜ TODO | -        | 3h       |
| E1.S3.PR1.003 | Implementare F.3 ONRC History Worker         | ⬜ TODO | -        | 3h       |

---

### PR E1.S3.PR2: Workers G.1-G.5 & H.1-H.3 (Email/Phone)

**Branch:** `feature/e1-s3-pr2-workers-email-phone`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                                 | Status  | Assignee | Estimare |
| ------------- | ---------------------------------------- | ------- | -------- | -------- |
| E1.S3.PR2.001 | Implementare G.1 Email Pattern Generator | ⬜ TODO | -        | 3h       |
| E1.S3.PR2.002 | Implementare G.2 Email MX Validator      | ⬜ TODO | -        | 2h       |
| E1.S3.PR2.003 | Implementare G.3 Email SMTP Verifier     | ⬜ TODO | -        | 3h       |
| E1.S3.PR2.004 | Implementare G.4 Email Hunter.io Worker  | ⬜ TODO | -        | 2h       |
| E1.S3.PR2.005 | Implementare G.5 Email Confidence Scorer | ⬜ TODO | -        | 2h       |
| E1.S3.PR2.006 | Implementare H.1 Phone Format Validator  | ⬜ TODO | -        | 2h       |
| E1.S3.PR2.007 | Implementare H.2 Phone Carrier Lookup    | ⬜ TODO | -        | 2h       |
| E1.S3.PR2.008 | Implementare H.3 Phone WhatsApp Check    | ⬜ TODO | -        | 2h       |

---

### PR E1.S3.PR3: Workers I.1-I.4 & J.1-J.4 (Scraping/AI)

**Branch:** `feature/e1-s3-pr3-workers-scraping-ai`  
**Reviewer:** @lead-dev  
**Estimare:** 4 zile

#### Tasks

| Task ID       | Denumire                                 | Status  | Assignee | Estimare |
| ------------- | ---------------------------------------- | ------- | -------- | -------- |
| E1.S3.PR3.001 | Implementare I.1 Website Scraper Worker  | ⬜ TODO | -        | 4h       |
| E1.S3.PR3.002 | Implementare I.2 Social Media Scraper    | ⬜ TODO | -        | 3h       |
| E1.S3.PR3.003 | Implementare I.3 Lista Firme Scraper     | ⬜ TODO | -        | 3h       |
| E1.S3.PR3.004 | Implementare I.4 News Scraper            | ⬜ TODO | -        | 2h       |
| E1.S3.PR3.005 | Implementare J.1 AI Text Extractor (LLM) | ⬜ TODO | -        | 4h       |
| E1.S3.PR3.006 | Implementare J.2 AI Company Classifier   | ⬜ TODO | -        | 3h       |
| E1.S3.PR3.007 | Implementare J.3 AI Contact Extractor    | ⬜ TODO | -        | 3h       |
| E1.S3.PR3.008 | Implementare J.4 AI Summary Generator    | ⬜ TODO | -        | 2h       |

---

### PR E1.S3.PR4: Workers K.1-K.3 & L.1-L.5 (Geo/Agri)

**Branch:** `feature/e1-s3-pr4-workers-geo-agri`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                                            | Status  | Assignee | Estimare |
| ------------- | --------------------------------------------------- | ------- | -------- | -------- |
| E1.S3.PR4.001 | Implementare K.1 Google Geocoder Worker             | ⬜ TODO | -        | 3h       |
| E1.S3.PR4.002 | Implementare K.2 Nominatim Fallback Worker          | ⬜ TODO | -        | 2h       |
| E1.S3.PR4.003 | Implementare K.3 Address Standardizer Worker        | ⬜ TODO | -        | 2h       |
| E1.S3.PR4.004 | Implementare L.1 APIA Data Worker                   | ⬜ TODO | -        | 3h       |
| E1.S3.PR4.005 | Implementare L.2 LPIS Parcels Worker                | ⬜ TODO | -        | 3h       |
| E1.S3.PR4.006 | Implementare L.3 Agricultural Classification Worker | ⬜ TODO | -        | 2h       |
| E1.S3.PR4.007 | Implementare L.4 Farm Size Calculator Worker        | ⬜ TODO | -        | 2h       |
| E1.S3.PR4.008 | Implementare L.5 Crop Detection Worker              | ⬜ TODO | -        | 2h       |

---

### PR E1.S3.PR5: Workers M.1-M.2 & N.1-N.3 (Dedup/Score)

**Branch:** `feature/e1-s3-pr5-workers-dedup-score`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                                     | Status  | Assignee | Estimare |
| ------------- | -------------------------------------------- | ------- | -------- | -------- |
| E1.S3.PR5.001 | Implementare M.1 Exact Match Deduplicare     | ⬜ TODO | -        | 3h       |
| E1.S3.PR5.002 | Implementare M.2 Fuzzy Match cu HITL trigger | ⬜ TODO | -        | 4h       |
| E1.S3.PR5.003 | Implementare N.1 Completeness Scorer Worker  | ⬜ TODO | -        | 2h       |
| E1.S3.PR5.004 | Implementare N.2 Accuracy Scorer Worker      | ⬜ TODO | -        | 2h       |
| E1.S3.PR5.005 | Implementare N.3 Freshness Scorer Worker     | ⬜ TODO | -        | 2h       |
| E1.S3.PR5.006 | Quality scoring formula implementation       | ⬜ TODO | -        | 2h       |

---

### PR E1.S3.PR6: Workers O.1-O.2 & P.1-P.4 (Pipeline)

**Branch:** `feature/e1-s3-pr6-workers-pipeline`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                                  | Status  | Assignee | Estimare |
| ------------- | ----------------------------------------- | ------- | -------- | -------- |
| E1.S3.PR6.001 | Implementare O.1 Silver Aggregator Worker | ⬜ TODO | -        | 3h       |
| E1.S3.PR6.002 | Implementare O.2 Gold Promoter Worker     | ⬜ TODO | -        | 3h       |
| E1.S3.PR6.003 | Implementare P.1 Pipeline Orchestrator    | ⬜ TODO | -        | 4h       |
| E1.S3.PR6.004 | Implementare P.2 Retry Handler Worker     | ⬜ TODO | -        | 2h       |
| E1.S3.PR6.005 | Implementare P.3 Dead Letter Handler      | ⬜ TODO | -        | 2h       |
| E1.S3.PR6.006 | Implementare P.4 Stats Collector Worker   | ⬜ TODO | -        | 2h       |

---

### PR E1.S3.PR7: HITL Approval System

**Branch:** `feature/e1-s3-pr7-hitl-system`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                                | Status  | Assignee | Estimare |
| ------------- | --------------------------------------- | ------- | -------- | -------- |
| E1.S3.PR7.001 | Implementare ApprovalService            | ⬜ TODO | -        | 4h       |
| E1.S3.PR7.002 | Configurare approval types Etapa 1      | ⬜ TODO | -        | 2h       |
| E1.S3.PR7.003 | Implementare SLA și escalation          | ⬜ TODO | -        | 3h       |
| E1.S3.PR7.004 | Implementare decision flow              | ⬜ TODO | -        | 2h       |
| E1.S3.PR7.005 | Integration cu dedup și quality workers | ⬜ TODO | -        | 2h       |
| E1.S3.PR7.006 | Audit logging pentru HITL               | ⬜ TODO | -        | 2h       |

---

### PR E1.S3.PR8: Integration Tests Sprint 3

**Branch:** `feature/e1-s3-pr8-integration-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                             | Status  | Assignee | Estimare |
| ------------- | ------------------------------------ | ------- | -------- | -------- |
| E1.S3.PR8.001 | Integration tests full pipeline flow | ⬜ TODO | -        | 4h       |
| E1.S3.PR8.002 | Integration tests HITL decision flow | ⬜ TODO | -        | 3h       |
| E1.S3.PR8.003 | Integration tests dedup merge        | ⬜ TODO | -        | 2h       |
| E1.S3.PR8.004 | Load tests pentru 1000 contacts/min  | ⬜ TODO | -        | 3h       |

---

## SPRINT 4: API & FRONTEND (Săptămâna 7-8)

### 📅 Perioada: 17-28 Martie 2026

### 🎯 Obiective Sprint

- [ ] Backend API complet (40+ endpoints)
- [ ] Frontend pages și components
- [ ] Testing complet și documentație
- [ ] Deployment și monitoring

### 📊 Metrici Sprint

| Metrică              | Target | Actual |
| -------------------- | ------ | ------ |
| PR-uri planificate   | 8      | -      |
| Task-uri planificate | 28     | -      |
| API Endpoints        | 40+    | -      |
| Story Points         | 45     | -      |

---

### PR E1.S4.PR1: API Dashboard & Stats

**Branch:** `feature/e1-s4-pr1-api-dashboard`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                             | Status  | Assignee | Estimare |
| ------------- | ------------------------------------ | ------- | -------- | -------- |
| E1.S4.PR1.001 | Implementare GET /dashboard/stats    | ⬜ TODO | -        | 3h       |
| E1.S4.PR1.002 | Implementare GET /dashboard/activity | ⬜ TODO | -        | 2h       |
| E1.S4.PR1.003 | Zod schemas pentru dashboard         | ⬜ TODO | -        | 1h       |
| E1.S4.PR1.004 | Unit tests dashboard endpoints       | ⬜ TODO | -        | 2h       |

---

### PR E1.S4.PR2: API Imports & Bronze

**Branch:** `feature/e1-s4-pr2-api-imports-bronze`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                           | Status  | Assignee | Estimare |
| ------------- | ---------------------------------- | ------- | -------- | -------- |
| E1.S4.PR2.001 | Implementare CRUD /imports         | ⬜ TODO | -        | 4h       |
| E1.S4.PR2.002 | Implementare file upload multipart | ⬜ TODO | -        | 3h       |
| E1.S4.PR2.003 | Implementare CRUD /bronze/contacts | ⬜ TODO | -        | 3h       |
| E1.S4.PR2.004 | Implementare reprocess endpoint    | ⬜ TODO | -        | 2h       |
| E1.S4.PR2.005 | Zod schemas și validare            | ⬜ TODO | -        | 2h       |

---

### PR E1.S4.PR3: API Silver & Gold

**Branch:** `feature/e1-s4-pr3-api-silver-gold`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                                 | Status  | Assignee | Estimare |
| ------------- | ---------------------------------------- | ------- | -------- | -------- |
| E1.S4.PR3.001 | Implementare CRUD /silver/companies      | ⬜ TODO | -        | 4h       |
| E1.S4.PR3.002 | Implementare enrich și promote endpoints | ⬜ TODO | -        | 3h       |
| E1.S4.PR3.003 | Implementare CRUD /gold/companies        | ⬜ TODO | -        | 4h       |
| E1.S4.PR3.004 | Implementare FSM transition endpoint     | ⬜ TODO | -        | 3h       |
| E1.S4.PR3.005 | Zod schemas și tests                     | ⬜ TODO | -        | 2h       |

---

### PR E1.S4.PR4: API Approvals & Queues

**Branch:** `feature/e1-s4-pr4-api-approvals`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                                | Status  | Assignee | Estimare |
| ------------- | --------------------------------------- | ------- | -------- | -------- |
| E1.S4.PR4.001 | Implementare CRUD /approvals            | ⬜ TODO | -        | 3h       |
| E1.S4.PR4.002 | Implementare assign și decide endpoints | ⬜ TODO | -        | 3h       |
| E1.S4.PR4.003 | Implementare /enrichment/queues         | ⬜ TODO | -        | 2h       |
| E1.S4.PR4.004 | Unit tests approvals                    | ⬜ TODO | -        | 2h       |

---

### PR E1.S4.PR5: Frontend Pages

**Branch:** `feature/e1-s4-pr5-frontend-pages`  
**Reviewer:** @lead-dev  
**Estimare:** 4 zile

#### Tasks

| Task ID       | Denumire                               | Status  | Assignee | Estimare |
| ------------- | -------------------------------------- | ------- | -------- | -------- |
| E1.S4.PR5.001 | Implementare Dashboard page            | ⬜ TODO | -        | 4h       |
| E1.S4.PR5.002 | Implementare Imports list/detail pages | ⬜ TODO | -        | 4h       |
| E1.S4.PR5.003 | Implementare Bronze contacts page      | ⬜ TODO | -        | 3h       |
| E1.S4.PR5.004 | Implementare Silver companies page     | ⬜ TODO | -        | 4h       |
| E1.S4.PR5.005 | Implementare Gold leads page           | ⬜ TODO | -        | 4h       |
| E1.S4.PR5.006 | Implementare Approvals page            | ⬜ TODO | -        | 4h       |
| E1.S4.PR5.007 | Implementare Enrichment queues page    | ⬜ TODO | -        | 3h       |

---

### PR E1.S4.PR6: Frontend Components

**Branch:** `feature/e1-s4-pr6-frontend-components`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                            | Status  | Assignee | Estimare |
| ------------- | ----------------------------------- | ------- | -------- | -------- |
| E1.S4.PR6.001 | Implementare DataTable component    | ⬜ TODO | -        | 4h       |
| E1.S4.PR6.002 | Implementare FileUpload component   | ⬜ TODO | -        | 3h       |
| E1.S4.PR6.003 | Implementare StatCard components    | ⬜ TODO | -        | 2h       |
| E1.S4.PR6.004 | Implementare ApprovalCard component | ⬜ TODO | -        | 3h       |
| E1.S4.PR6.005 | Implementare QueueStatus component  | ⬜ TODO | -        | 2h       |
| E1.S4.PR6.006 | Implementare charts (Recharts)      | ⬜ TODO | -        | 3h       |

---

### PR E1.S4.PR7: E2E Tests

**Branch:** `feature/e1-s4-pr7-e2e-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                           | Status  | Assignee | Estimare |
| ------------- | ---------------------------------- | ------- | -------- | -------- |
| E1.S4.PR7.001 | E2E test: Import CSV flow          | ⬜ TODO | -        | 3h       |
| E1.S4.PR7.002 | E2E test: Enrichment pipeline flow | ⬜ TODO | -        | 3h       |
| E1.S4.PR7.003 | E2E test: HITL approval flow       | ⬜ TODO | -        | 2h       |
| E1.S4.PR7.004 | E2E test: Gold lead management     | ⬜ TODO | -        | 2h       |

---

### PR E1.S4.PR8: Documentation & Deployment

**Branch:** `feature/e1-s4-pr8-docs-deploy`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                                  | Status  | Assignee | Estimare |
| ------------- | ----------------------------------------- | ------- | -------- | -------- |
| E1.S4.PR8.001 | Actualizare runbook monitoring            | ⬜ TODO | -        | 2h       |
| E1.S4.PR8.002 | Actualizare environment variables docs    | ⬜ TODO | -        | 1h       |
| E1.S4.PR8.003 | Setup Grafana dashboards pentru Etapa 1   | ⬜ TODO | -        | 3h       |
| E1.S4.PR8.004 | Setup alerts pentru queue depth și errors | ⬜ TODO | -        | 2h       |
| E1.S4.PR8.005 | Final review și deployment checklist      | ⬜ TODO | -        | 2h       |

---

## REZUMAT SPRINT PLAN

### Statistici Totale

| Metrică             | Valoare     |
| ------------------- | ----------- |
| **Sprinturi**       | 4           |
| **PR-uri totale**   | 32          |
| **Task-uri totale** | 126         |
| **Durată totală**   | 8 săptămâni |
| **Workers**         | 58          |
| **API Endpoints**   | 40+         |
| **Pagini Frontend** | 15+         |

### Calendar Execuție

| Sprint | Perioada       | Focus                       |
| ------ | -------------- | --------------------------- |
| S1     | 3-14 Feb 2026  | Foundation (DB + Infra)     |
| S2     | 17-28 Feb 2026 | Ingestion & Core Enrichment |
| S3     | 3-14 Mar 2026  | Advanced Enrichment + HITL  |
| S4     | 17-28 Mar 2026 | API + Frontend + Testing    |

### Criterii Acceptare Etapa 1

- [ ] Toate cele 58 workers funcționale
- [ ] Pipeline Bronze → Silver → Gold complet
- [ ] HITL system operațional (3 tipuri aprobare)
- [ ] API cu 40+ endpoints documentate
- [ ] Frontend admin dashboard funcțional
- [ ] Test coverage ≥ 80%
- [ ] Documentație completă și actualizată
- [ ] Deployment în staging testat

---

## LINK-URI RAPIDE

### Documentație Conexă

- [00-INDEX-ETAPA1.md](./00-INDEX-ETAPA1.md) - Index documentație
- [etapa1-plan-implementare-COMPLET.md](./etapa1-plan-implementare-COMPLET.md) - Plan detaliat
- [etapa1-workers-overview.md](./etapa1-workers-overview.md) - Arhitectură workers
- [etapa1-api-endpoints.md](./etapa1-api-endpoints.md) - API spec
- [etapa1-testing-strategy.md](./etapa1-testing-strategy.md) - Strategie testare

### ADR-uri Relevante

- [ADR-0033](../../adr/ADR%20Etapa%201/ADR-0033-Arhitectura-Medallion-Bronze-Silver-Gold.md) - Medallion Architecture
- [ADR-0042](../../adr/ADR%20Etapa%201/ADR-0042-Pipeline-Orchestration.md) - Pipeline Orchestration
- [ADR-0043](../../adr/ADR%20Etapa%201/ADR-0043-HITL-Integration-Etapa-1.md) - HITL Integration

---

**Document generat:** 2 Februarie 2026  
**Conformitate:** Master Spec v1.2  
**Status:** APPROVED - Ready for Execution
