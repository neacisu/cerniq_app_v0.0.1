# CERNIQ.APP — ETAPA 1: SPRINT PLAN

## Data Enrichment Pipeline — Plan Execuție

### Versiunea 1.1 | 27 Februarie 2026

---

## METADATA DOCUMENT

| Câmp                    | Valoare                                     |
| ----------------------- | ------------------------------------------- |
| **Etapă**               | E1 - Data Enrichment                        |
| **Versiune**            | 1.2                                         |
| **Data creării**        | 27 Februarie 2026                           |
| **Autor**               | Cerniq Development Team                     |
| **Status**              | ✅ IMPLEMENTAT — Audit & remediation complet |
| **Ultima actualizare**  | 19 Martie 2026                              |
| **Durată totală**       | 8 săptămâni (4 sprinturi × 2 săptămâni)     |
| **Total Sprinturi**     | 4                                           |
| **Total PR-uri**        | 32                                          |
| **Total Task-uri**      | 193                                         |

> ⚠️ **ACTUALIZARE 19 Martie 2026**: Sprint plan actualizat cu statusuri reale post-audit.
> Toate task-urile din Sprinturile 1-3 sunt COMPLETATE (implementare validată prin audit).
> Sprint 4 (API + Frontend + Testing) este COMPLETAT cu remedieri de audit aplicate.

---

## CONVENȚIE NUMEROTARE TASK-URI

### Schema Standardizată: `E{etapa}.S{sprint}.PR{pr}.{task}`

```text
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

### 📅 Perioada: 27 Februarie - 12 Martie 2026

### 🎯 Obiective Sprint

- [x] Database schema Bronze layer complet
- [x] Database schema Silver layer complet
- [x] Database schema Gold layer complet
- [x] Workers infrastructure BullMQ setup

### 📊 Metrici Sprint

| Metrică              | Target | Actual |
| -------------------- | ------ | ------ |
| PR-uri planificate   | 8      | 8      |
| Task-uri planificate | 32     | 32     |
| Story Points         | 40     | 40     |
| Test Coverage        | ≥80%   | ~85%   |

---

### PR E1.S1.PR1: Bronze Schema + Migrations

**Branch:** `feature/e1-s1-pr1-bronze-schema`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                                                           | Status  | Assignee | Estimare |
| ------------- | ------------------------------------------------------------------ | ------- | -------- | -------- |
| E1.S1.PR1.001 | Creare tabel `bronze_contacts` cu toate coloanele                  | ✅ DONE | -        | 4h       |
| E1.S1.PR1.002 | Creare indecși pentru `bronze_contacts` (8 indecși)                | ✅ DONE | -        | 2h       |
| E1.S1.PR1.003 | Configurare RLS și triggers imutabilitate Bronze                   | ✅ DONE | -        | 3h       |
| E1.S1.PR1.004 | Creare tabel `bronze_import_batches`                               | ✅ DONE | -        | 2h       |
| E1.S1.PR1.005 | Creare tabel `bronze_webhooks`                                     | ✅ DONE | -        | 2h       |
| E1.S1.PR1.006 | Funcții SQL utilitare Bronze (`bronze_compute_content_hash`, etc.) | ✅ DONE | -        | 3h       |

#### Acceptance Criteria

- [x] Toate tabelele Bronze create și migrate
- [x] RLS activat pe toate tabelele
- [x] Trigger imutabilitate blochează UPDATE pe `raw_payload`
- [x] Test cross-tenant access blocat
- [x] Migrații Drizzle generate și aplicabile

#### Definition of Done

- [x] Code review approved
- [x] Unit tests passing (≥80% coverage)
- [x] Migration testată în staging
- [x] Documentație actualizată

---

### PR E1.S1.PR2: Silver Schema + Migrations

**Branch:** `feature/e1-s1-pr2-silver-schema`  
**Reviewer:** @lead-dev  
**Estimare:** 4 zile

#### Tasks

| Task ID       | Denumire                                                   | Status  | Assignee | Estimare |
| ------------- | ---------------------------------------------------------- | ------- | -------- | -------- |
| E1.S1.PR2.001 | Creare tabel `silver_companies` (~80 coloane)              | ✅ DONE | -        | 6h       |
| E1.S1.PR2.002 | Creare indecși Silver (tenant, enrichment, promotion, FTS) | ✅ DONE | -        | 3h       |
| E1.S1.PR2.003 | Configurare RLS și triggers Silver                         | ✅ DONE | -        | 2h       |
| E1.S1.PR2.004 | Creare tabel `silver_contacts`                             | ✅ DONE | -        | 3h       |
| E1.S1.PR2.005 | Creare tabel `silver_enrichment_log`                       | ✅ DONE | -        | 2h       |
| E1.S1.PR2.006 | Creare tabel `silver_dedup_candidates`                     | ✅ DONE | -        | 2h       |

#### Acceptance Criteria

- [x] Toate cele 4 tabele Silver create
- [x] GENERATED columns funcționează (`denumire_normalizata`, etc.)
- [x] PostGIS geography columns funcționale
- [x] pg_trgm extension activată pentru FTS
- [x] Migrații generate și aplicabile

---

### PR E1.S1.PR3: Gold Schema + FSM

**Branch:** `feature/e1-s1-pr3-gold-schema`  
**Reviewer:** @lead-dev  
**Estimare:** 4 zile

#### Tasks

| Task ID       | Denumire                                                         | Status  | Assignee | Estimare |
| ------------- | ---------------------------------------------------------------- | ------- | -------- | -------- |
| E1.S1.PR3.001 | Instalare pgvector extension                                     | ✅ DONE | -        | 1h       |
| E1.S1.PR3.002 | Creare tabel `gold_companies` (~120 coloane, 10 secțiuni)        | ✅ DONE | -        | 8h       |
| E1.S1.PR3.003 | Creare indecși Gold (lead_score, FSM state, vector)              | ✅ DONE | -        | 3h       |
| E1.S1.PR3.004 | Creare trigger FSM `gold_log_state_transition`                   | ✅ DONE | -        | 2h       |
| E1.S1.PR3.005 | Creare trigger auto-compute `gold_compute_lead_score`            | ✅ DONE | -        | 2h       |
| E1.S1.PR3.006 | Creare tabele auxiliare (`gold_contacts`, `gold_journey_events`) | ✅ DONE | -        | 3h       |

#### Acceptance Criteria

- [x] pgvector funcțional pentru embeddings
- [x] FSM trigger loghează tranziții în `state_history`
- [x] Lead score se recalculează automat
- [x] Toate cele 10 secțiuni schema implementate

---

### PR E1.S1.PR4: BullMQ Infrastructure

**Branch:** `feature/e1-s1-pr4-bullmq-infra`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                                  | Status  | Assignee | Estimare |
| ------------- | ----------------------------------------- | ------- | -------- | -------- |
| E1.S1.PR4.001 | Setup conexiuni Redis (producer + worker) | ✅ DONE | -        | 2h       |
| E1.S1.PR4.002 | Creare Worker Factory Pattern             | ✅ DONE | -        | 4h       |
| E1.S1.PR4.003 | Implementare Rate Limiter per queue       | ✅ DONE | -        | 3h       |
| E1.S1.PR4.004 | Implementare Circuit Breaker pattern      | ✅ DONE | -        | 3h       |
| E1.S1.PR4.005 | Setup metrics și logging pentru workers   | ✅ DONE | -        | 2h       |
| E1.S1.PR4.006 | Health check și graceful shutdown         | ✅ DONE | -        | 2h       |

#### Acceptance Criteria

- [x] Conexiuni Redis separate producer/worker
- [x] Worker factory creează workeri cu logging și metrics
- [x] Circuit breaker previne cascade failures
- [x] Graceful shutdown procesează jobs în curs

---

### PR E1.S1.PR5: Queue Registry

**Branch:** `feature/e1-s1-pr5-queue-registry`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                                       | Status  | Assignee | Estimare |
| ------------- | ---------------------------------------------- | ------- | -------- | -------- |
| E1.S1.PR5.001 | Definire toate queue-urile Etapa 1 (58 queues) | ✅ DONE | -        | 3h       |
| E1.S1.PR5.002 | Configurare rate limits per queue              | ✅ DONE | -        | 2h       |
| E1.S1.PR5.003 | Setup queue events și monitoring               | ✅ DONE | -        | 2h       |
| E1.S1.PR5.004 | Dashboard Bull Board pentru debugging          | ✅ DONE | -        | 2h       |

---

### PR E1.S1.PR6: Drizzle Migrations Runner

**Branch:** `feature/e1-s1-pr6-migrations`  
**Reviewer:** @lead-dev  
**Estimare:** 1 zi

#### Tasks

| Task ID       | Denumire                            | Status  | Assignee | Estimare |
| ------------- | ----------------------------------- | ------- | -------- | -------- |
| E1.S1.PR6.001 | Script migration runner cu rollback | ✅ DONE | -        | 2h       |
| E1.S1.PR6.002 | Seed data pentru development        | ✅ DONE | -        | 2h       |
| E1.S1.PR6.003 | Integrare CI/CD pentru migrații     | ✅ DONE | -        | 2h       |

---

### PR E1.S1.PR7: Unit Tests Database

**Branch:** `feature/e1-s1-pr7-db-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                                      | Status  | Assignee | Estimare |
| ------------- | --------------------------------------------- | ------- | -------- | -------- |
| E1.S1.PR7.001 | Tests pentru Bronze layer (RLS, triggers)     | ✅ DONE | -        | 3h       |
| E1.S1.PR7.002 | Tests pentru Silver layer (enrichment, dedup) | ✅ DONE | -        | 3h       |
| E1.S1.PR7.003 | Tests pentru Gold layer (FSM, scoring)        | ✅ DONE | -        | 3h       |
| E1.S1.PR7.004 | Tests pentru funcții SQL utilitare            | ✅ DONE | -        | 2h       |

---

### PR E1.S1.PR8: Integration Tests Infrastructure

**Branch:** `feature/e1-s1-pr8-infra-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 1 zi

#### Tasks

| Task ID       | Denumire                                  | Status  | Assignee | Estimare |
| ------------- | ----------------------------------------- | ------- | -------- | -------- |
| E1.S1.PR8.001 | Test containers setup (PostgreSQL, Redis) | ✅ DONE | -        | 2h       |
| E1.S1.PR8.002 | Integration tests BullMQ                  | ✅ DONE | -        | 2h       |
| E1.S1.PR8.003 | Performance baseline tests                | ✅ DONE | -        | 2h       |

---

## SPRINT 2: INGESTION & ENRICHMENT CORE (Săptămâna 3-4)

### 📅 Perioada: 13-26 Martie 2026

### 🎯 Obiective Sprint

- [x] Workers Category A - Ingestie (5 workers)
- [x] Workers Category B-C - Normalizare & Validare (6 workers)
- [x] Workers Category D-E - ANAF & Termene.ro (9 workers)

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
| E1.S2.PR1.001 | Implementare A.1 CSV Parser Worker   | ✅ DONE | -        | 6h       |
| E1.S2.PR1.002 | Implementare A.2 Excel Parser Worker | ✅ DONE | -        | 4h       |
| E1.S2.PR1.003 | Column mapping și encoding detection | ✅ DONE | -        | 3h       |
| E1.S2.PR1.004 | Streaming pentru fișiere mari (>1GB) | ✅ DONE | -        | 3h       |
| E1.S2.PR1.005 | Unit tests CSV/Excel workers         | ✅ DONE | -        | 2h       |

#### Acceptance Criteria

- [x] CSV parsing cu PapaParse streaming
- [x] Excel parsing cu XLSX library
- [x] Caractere românești detectate corect
- [x] Fișiere >1GB procesate fără OOM

---

### PR E1.S2.PR2: Workers A.3-A.5 (Webhook/API/Manual)

**Branch:** `feature/e1-s2-pr2-workers-ingest`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                                 | Status  | Assignee | Estimare |
| ------------- | ---------------------------------------- | ------- | -------- | -------- |
| E1.S2.PR2.001 | Implementare A.3 Webhook Receiver Worker | ✅ DONE | -        | 3h       |
| E1.S2.PR2.002 | Implementare A.4 API Poller Worker       | ✅ DONE | -        | 3h       |
| E1.S2.PR2.003 | Implementare A.5 Manual Entry Handler    | ✅ DONE | -        | 2h       |
| E1.S2.PR2.004 | Signature validation pentru webhooks     | ✅ DONE | -        | 2h       |

---

### PR E1.S2.PR3: Workers B.1-B.4 (Normalizare)

**Branch:** `feature/e1-s2-pr3-workers-normalize`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                                         | Status  | Assignee | Estimare |
| ------------- | ------------------------------------------------ | ------- | -------- | -------- |
| E1.S2.PR3.001 | Implementare B.1 Name Normalizer Worker          | ✅ DONE | -        | 3h       |
| E1.S2.PR3.002 | Implementare B.2 Email Normalizer Worker         | ✅ DONE | -        | 2h       |
| E1.S2.PR3.003 | Implementare B.3 Phone Normalizer Worker (E.164) | ✅ DONE | -        | 3h       |
| E1.S2.PR3.004 | Implementare B.4 Address Normalizer Worker       | ✅ DONE | -        | 4h       |
| E1.S2.PR3.005 | Unit tests normalization workers                 | ✅ DONE | -        | 2h       |

#### Acceptance Criteria

- [x] Nume normalizate cu diacritice corecte
- [x] Email lowercase și validated format
- [x] Telefoane în format E.164 (+40...)
- [x] Adrese cu județul detectat

---

### PR E1.S2.PR4: Workers C.1-C.2 (Validare CUI)

**Branch:** `feature/e1-s2-pr4-workers-validate`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                                    | Status  | Assignee | Estimare |
| ------------- | ------------------------------------------- | ------- | -------- | -------- |
| E1.S2.PR4.001 | Implementare C.1 CUI Validator (Modulo-11)  | ✅ DONE | -        | 3h       |
| E1.S2.PR4.002 | Implementare C.2 CUI ANAF Validator         | ✅ DONE | -        | 3h       |
| E1.S2.PR4.003 | Batch validation pentru eficiență           | ✅ DONE | -        | 2h       |
| E1.S2.PR4.004 | Tests și edge cases                         | ✅ DONE | -        | 2h       |

---

### PR E1.S2.PR5: Workers D.1-D.5 (ANAF Integration)

**Branch:** `feature/e1-s2-pr5-workers-anaf`  
**Reviewer:** @lead-dev  
**Estimare:** 4 zile

#### Tasks

| Task ID       | Denumire                                   | Status  | Assignee | Estimare |
| ------------- | ------------------------------------------ | ------- | -------- | -------- |
| E1.S2.PR5.001 | Implementare D.1 ANAF Fiscal Status Worker | ✅ DONE | -        | 4h       |
| E1.S2.PR5.002 | Implementare D.2 ANAF TVA Worker           | ✅ DONE | -        | 3h       |
| E1.S2.PR5.003 | Implementare D.3 ANAF CAEN Worker          | ✅ DONE | -        | 3h       |
| E1.S2.PR5.004 | Implementare D.4 ANAF e-Factura Worker     | ✅ DONE | -        | 2h       |
| E1.S2.PR5.005 | Implementare D.5 ANAF Batch Orchestrator   | ✅ DONE | -        | 3h       |
| E1.S2.PR5.006 | Rate limiting 1 req/sec pentru ANAF        | ✅ DONE | -        | 2h       |

#### Acceptance Criteria

- [x] ANAF API integration funcțională
- [x] Rate limit 1 req/sec respectat
- [x] Toate câmpurile fiscale populate
- [x] Error handling și retry logic

---

### PR E1.S2.PR6: Workers E.1-E.4 (Termene.ro Integration)

**Branch:** `feature/e1-s2-pr6-workers-termene`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                                      | Status  | Assignee | Estimare |
| ------------- | --------------------------------------------- | ------- | -------- | -------- |
| E1.S2.PR6.001 | Implementare E.1 Termene Balance Sheet Worker | ✅ DONE | -        | 4h       |
| E1.S2.PR6.002 | Implementare E.2 Termene Risk Score Worker    | ✅ DONE | -        | 3h       |
| E1.S2.PR6.003 | Implementare E.3 Termene Dosare Worker        | ✅ DONE | -        | 3h       |
| E1.S2.PR6.004 | Implementare E.4 Termene Associates Worker    | ✅ DONE | -        | 2h       |
| E1.S2.PR6.005 | API key rotation și rate limiting             | ✅ DONE | -        | 2h       |

---

### PR E1.S2.PR7: Bronze → Silver Promotion

**Branch:** `feature/e1-s2-pr7-bronze-silver-promotion`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                                     | Status  | Assignee | Estimare |
| ------------- | -------------------------------------------- | ------- | -------- | -------- |
| E1.S2.PR7.001 | Implementare promotion logic Bronze → Silver | ✅ DONE | -        | 4h       |
| E1.S2.PR7.002 | Merge duplicate records la promotion         | ✅ DONE | -        | 3h       |
| E1.S2.PR7.003 | Trigger enrichment queue după promotion      | ✅ DONE | -        | 2h       |

---

### PR E1.S2.PR8: Integration Tests Sprint 2

**Branch:** `feature/e1-s2-pr8-integration-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                                     | Status  | Assignee | Estimare |
| ------------- | -------------------------------------------- | ------- | -------- | -------- |
| E1.S2.PR8.001 | Integration tests CSV → Bronze → Silver flow | ✅ DONE | -        | 4h       |
| E1.S2.PR8.002 | Integration tests ANAF enrichment            | ✅ DONE | -        | 3h       |
| E1.S2.PR8.003 | Integration tests Termene enrichment         | ✅ DONE | -        | 3h       |
| E1.S2.PR8.004 | Mock services pentru external APIs           | ✅ DONE | -        | 2h       |

---

## SPRINT 3: ENRICHMENT ADVANCED & HITL (Săptămâna 5-6)

### 📅 Perioada: 27 Martie - 9 Aprilie 2026

### 🎯 Obiective Sprint

- [x] Workers Category F-H - ONRC, Email, Phone (11 workers)
- [x] Workers Category I-L - Scraping, AI, Geo, Agri (16 workers)
- [x] Workers Category M-P - Dedup, Score, Pipeline (11 workers)
- [x] HITL Integration complet

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
| E1.S3.PR1.001 | Implementare F.1 ONRC Company Details Worker | ✅ DONE | -        | 4h       |
| E1.S3.PR1.002 | Implementare F.2 ONRC Associates Worker      | ✅ DONE | -        | 3h       |
| E1.S3.PR1.003 | Implementare F.3 ONRC History Worker         | ✅ DONE | -        | 3h       |

---

### PR E1.S3.PR2: Workers G.1-G.5 & H.1-H.3 (Email/Phone)

**Branch:** `feature/e1-s3-pr2-workers-email-phone`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                                 | Status  | Assignee | Estimare |
| ------------- | ---------------------------------------- | ------- | -------- | -------- |
| E1.S3.PR2.001 | Implementare G.1 Email Pattern Generator | ✅ DONE | -        | 3h       |
| E1.S3.PR2.002 | Implementare G.2 Email MX Validator      | ✅ DONE | -        | 2h       |
| E1.S3.PR2.003 | Implementare G.3 Email SMTP Verifier     | ✅ DONE | -        | 3h       |
| E1.S3.PR2.004 | Implementare G.4 Email Hunter.io Worker  | ✅ DONE | -        | 2h       |
| E1.S3.PR2.005 | Implementare G.5 Email Confidence Scorer | ✅ DONE | -        | 2h       |
| E1.S3.PR2.006 | Implementare H.1 Phone Format Validator  | ✅ DONE | -        | 2h       |
| E1.S3.PR2.007 | Implementare H.2 Phone Carrier Lookup    | ✅ DONE | -        | 2h       |
| E1.S3.PR2.008 | Implementare H.3 Phone WhatsApp Check    | ✅ DONE | -        | 2h       |

---

### PR E1.S3.PR3: Workers I.1-I.4 & J.1-J.4 (Scraping/AI)

**Branch:** `feature/e1-s3-pr3-workers-scraping-ai`  
**Reviewer:** @lead-dev  
**Estimare:** 4 zile

#### Tasks

| Task ID       | Denumire                                 | Status  | Assignee | Estimare |
| ------------- | ---------------------------------------- | ------- | -------- | -------- |
| E1.S3.PR3.001 | Implementare I.1 Website Scraper Worker  | ✅ DONE | -        | 4h       |
| E1.S3.PR3.002 | Implementare I.2 Social Media Scraper    | ✅ DONE | -        | 3h       |
| E1.S3.PR3.003 | Implementare I.3 Lista Firme Scraper     | ✅ DONE | -        | 3h       |
| E1.S3.PR3.004 | Implementare I.4 News Scraper            | ✅ DONE | -        | 2h       |
| E1.S3.PR3.005 | Implementare J.1 AI Text Extractor (LLM) | ✅ DONE | -        | 4h       |
| E1.S3.PR3.006 | Implementare J.2 AI Company Classifier   | ✅ DONE | -        | 3h       |
| E1.S3.PR3.007 | Implementare J.3 AI Contact Extractor    | ✅ DONE | -        | 3h       |
| E1.S3.PR3.008 | Implementare J.4 AI Summary Generator    | ✅ DONE | -        | 2h       |

---

### PR E1.S3.PR4: Workers K.1-K.3 & L.1-L.5 (Geo/Agri)

**Branch:** `feature/e1-s3-pr4-workers-geo-agri`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                                            | Status  | Assignee | Estimare |
| ------------- | --------------------------------------------------- | ------- | -------- | -------- |
| E1.S3.PR4.001 | Implementare K.1 Nominatim Geocoding Worker         | ✅ DONE | -        | 3h       |
| E1.S3.PR4.002 | Implementare K.2 Nominatim Fallback Worker          | ✅ DONE | -        | 2h       |
| E1.S3.PR4.003 | Implementare K.3 Address Standardizer Worker        | ✅ DONE | -        | 2h       |
| E1.S3.PR4.004 | Implementare L.1 APIA Data Worker                   | ✅ DONE | -        | 3h       |
| E1.S3.PR4.005 | Implementare L.2 LPIS Parcels Worker                | ✅ DONE | -        | 3h       |
| E1.S3.PR4.006 | Implementare L.3 Agricultural Classification Worker | ✅ DONE | -        | 2h       |
| E1.S3.PR4.007 | Implementare L.4 Farm Size Calculator Worker        | ✅ DONE | -        | 2h       |
| E1.S3.PR4.008 | Implementare L.5 Crop Detection Worker              | ✅ DONE | -        | 2h       |

---

### PR E1.S3.PR5: Workers M.1-M.2 & N.1-N.3 (Dedup/Score)

**Branch:** `feature/e1-s3-pr5-workers-dedup-score`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                                     | Status  | Assignee | Estimare |
| ------------- | -------------------------------------------- | ------- | -------- | -------- |
| E1.S3.PR5.001 | Implementare M.1 Exact Match Deduplicare     | ✅ DONE | -        | 3h       |
| E1.S3.PR5.002 | Implementare M.2 Fuzzy Match cu HITL trigger | ✅ DONE | -        | 4h       |
| E1.S3.PR5.003 | Implementare N.1 Completeness Scorer Worker  | ✅ DONE | -        | 2h       |
| E1.S3.PR5.004 | Implementare N.2 Accuracy Scorer Worker      | ✅ DONE | -        | 2h       |
| E1.S3.PR5.005 | Implementare N.3 Freshness Scorer Worker     | ✅ DONE | -        | 2h       |
| E1.S3.PR5.006 | Quality scoring formula implementation       | ✅ DONE | -        | 2h       |

---

### PR E1.S3.PR6: Workers O.1-O.2 & P.1-P.4 (Pipeline)

**Branch:** `feature/e1-s3-pr6-workers-pipeline`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                                   | Status  | Assignee | Estimare |
| ------------- | ------------------------------------------ | ------- | -------- | -------- |
| E1.S3.PR6.001 | Implementare O.1 Silver Aggregator Worker  | ✅ DONE | -        | 3h       |
| E1.S3.PR6.002 | Implementare O.2 Quality Rollup Worker     | ✅ DONE | -        | 3h       |
| E1.S3.PR6.003 | Implementare P.1 Pipeline Orchestrator     | ✅ DONE | -        | 4h       |
| E1.S3.PR6.004 | Implementare P.2 Promotion Silver->Gold    | ✅ DONE | -        | 3h       |
| E1.S3.PR6.005 | Implementare P.3 Pipeline Monitor          | ✅ DONE | -        | 2h       |
| E1.S3.PR6.006 | Implementare P.4 Error Handler             | ✅ DONE | -        | 2h       |

---

### PR E1.S3.PR7: HITL Approval System

**Branch:** `feature/e1-s3-pr7-hitl-system`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                                | Status  | Assignee | Estimare |
| ------------- | --------------------------------------- | ------- | -------- | -------- |
| E1.S3.PR7.001 | Implementare ApprovalService            | ✅ DONE | -        | 4h       |
| E1.S3.PR7.002 | Configurare approval types Etapa 1      | ✅ DONE | -        | 2h       |
| E1.S3.PR7.003 | Implementare SLA și escalation          | ✅ DONE | -        | 3h       |
| E1.S3.PR7.004 | Implementare decision flow              | ✅ DONE | -        | 2h       |
| E1.S3.PR7.005 | Integration cu dedup și quality workers | ✅ DONE | -        | 2h       |
| E1.S3.PR7.006 | Audit logging pentru HITL               | ✅ DONE | -        | 2h       |

---

### PR E1.S3.PR8: Integration Tests Sprint 3

**Branch:** `feature/e1-s3-pr8-integration-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                             | Status  | Assignee | Estimare |
| ------------- | ------------------------------------ | ------- | -------- | -------- |
| E1.S3.PR8.001 | Integration tests full pipeline flow | ✅ DONE | -        | 4h       |
| E1.S3.PR8.002 | Integration tests HITL decision flow | ✅ DONE | -        | 3h       |
| E1.S3.PR8.003 | Integration tests dedup merge        | ✅ DONE | -        | 2h       |
| E1.S3.PR8.004 | Load tests pentru 1000 contacts/min  | ✅ DONE | -        | 3h       |

---

## SPRINT 4: API & FRONTEND (Săptămâna 7-8)

### 📅 Perioada: 10-23 Aprilie 2026

### 🎯 Obiective Sprint

- [x] Backend API complet (28 endpoints E1)
- [x] Frontend pages și components
- [x] Testing complet și documentație
- [x] Deployment și monitoring

### 📊 Metrici Sprint

| Metrică              | Target | Actual |
| -------------------- | ------ | ------ |
| PR-uri planificate   | 8      | -      |
| Task-uri planificate | 28     | -      |
| API Endpoints        | 28     | -      |
| Story Points         | 45     | -      |

---

### PR E1.S4.PR1: API Dashboard & Stats

**Branch:** `feature/e1-s4-pr1-api-dashboard`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                             | Status  | Assignee | Estimare |
| ------------- | ------------------------------------ | ------- | -------- | -------- |
| E1.S4.PR1.001 | Implementare GET /dashboard/stats    | ✅ DONE | -        | 3h       |
| E1.S4.PR1.002 | Implementare GET /dashboard/activity | ✅ DONE | -        | 2h       |
| E1.S4.PR1.003 | Zod schemas pentru dashboard         | ✅ DONE | -        | 1h       |
| E1.S4.PR1.004 | Unit tests dashboard endpoints       | ✅ DONE | -        | 2h       |

---

### PR E1.S4.PR2: API Imports & Bronze

**Branch:** `feature/e1-s4-pr2-api-imports-bronze`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                           | Status  | Assignee | Estimare |
| ------------- | ---------------------------------- | ------- | -------- | -------- |
| E1.S4.PR2.001 | Implementare CRUD /imports         | ✅ DONE | -        | 4h       |
| E1.S4.PR2.002 | Implementare file upload multipart | ✅ DONE | -        | 3h       |
| E1.S4.PR2.003 | Implementare CRUD /bronze/contacts | ✅ DONE | -        | 3h       |
| E1.S4.PR2.004 | Implementare reprocess endpoint    | ✅ DONE | -        | 2h       |
| E1.S4.PR2.005 | Zod schemas și validare            | ✅ DONE | -        | 2h       |

---

### PR E1.S4.PR3: API Silver & Gold

**Branch:** `feature/e1-s4-pr3-api-silver-gold`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                                 | Status  | Assignee | Estimare |
| ------------- | ---------------------------------------- | ------- | -------- | -------- |
| E1.S4.PR3.001 | Implementare CRUD /silver/companies      | ✅ DONE | -        | 4h       |
| E1.S4.PR3.002 | Implementare enrich și promote endpoints | ✅ DONE | -        | 3h       |
| E1.S4.PR3.003 | Implementare CRUD /gold/companies        | ✅ DONE | -        | 4h       |
| E1.S4.PR3.004 | Implementare FSM transition endpoint     | ✅ DONE | -        | 3h       |
| E1.S4.PR3.005 | Zod schemas și tests                     | ✅ DONE | -        | 2h       |

---

### PR E1.S4.PR4: API Approvals & Queues

**Branch:** `feature/e1-s4-pr4-api-approvals`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                                | Status  | Assignee | Estimare |
| ------------- | --------------------------------------- | ------- | -------- | -------- |
| E1.S4.PR4.001 | Implementare CRUD /approvals            | ✅ DONE | -        | 3h       |
| E1.S4.PR4.002 | Implementare assign și decide endpoints | ✅ DONE | -        | 3h       |
| E1.S4.PR4.003 | Implementare /enrichment/queues         | ✅ DONE | -        | 2h       |
| E1.S4.PR4.004 | Unit tests approvals                    | ✅ DONE | -        | 2h       |

---

### PR E1.S4.PR5: Frontend Pages

**Branch:** `feature/e1-s4-pr5-frontend-pages`  
**Reviewer:** @lead-dev  
**Estimare:** 4 zile

#### Tasks

| Task ID       | Denumire                               | Status  | Assignee | Estimare |
| ------------- | -------------------------------------- | ------- | -------- | -------- |
| E1.S4.PR5.001 | Implementare Dashboard page            | ✅ DONE | -        | 4h       |
| E1.S4.PR5.002 | Implementare Imports list/detail pages | ✅ DONE | -        | 4h       |
| E1.S4.PR5.003 | Implementare Bronze contacts page      | ✅ DONE | -        | 3h       |
| E1.S4.PR5.004 | Implementare Silver companies page     | ✅ DONE | -        | 4h       |
| E1.S4.PR5.005 | Implementare Gold leads page           | ✅ DONE | -        | 4h       |
| E1.S4.PR5.006 | Implementare Approvals page            | ✅ DONE | -        | 4h       |
| E1.S4.PR5.007 | Implementare Enrichment queues page    | ✅ DONE | -        | 3h       |

---

### PR E1.S4.PR6: Frontend Components

**Branch:** `feature/e1-s4-pr6-frontend-components`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile

#### Tasks

| Task ID       | Denumire                            | Status  | Assignee | Estimare |
| ------------- | ----------------------------------- | ------- | -------- | -------- |
| E1.S4.PR6.001 | Implementare DataTable component    | ✅ DONE | -        | 4h       |
| E1.S4.PR6.002 | Implementare FileUpload component   | ✅ DONE | -        | 3h       |
| E1.S4.PR6.003 | Implementare StatCard components    | ✅ DONE | -        | 2h       |
| E1.S4.PR6.004 | Implementare ApprovalCard component | ✅ DONE | -        | 3h       |
| E1.S4.PR6.005 | Implementare QueueStatus component  | ✅ DONE | -        | 2h       |
| E1.S4.PR6.006 | Implementare charts (Recharts)      | ✅ DONE | -        | 3h       |

---

### PR E1.S4.PR7: E2E Tests

**Branch:** `feature/e1-s4-pr7-e2e-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                           | Status  | Assignee | Estimare |
| ------------- | ---------------------------------- | ------- | -------- | -------- |
| E1.S4.PR7.001 | E2E test: Import CSV flow          | ✅ DONE | -        | 3h       |
| E1.S4.PR7.002 | E2E test: Enrichment pipeline flow | ✅ DONE | -        | 3h       |
| E1.S4.PR7.003 | E2E test: HITL approval flow       | ✅ DONE | -        | 2h       |
| E1.S4.PR7.004 | E2E test: Gold lead management     | ✅ DONE | -        | 2h       |

---

### PR E1.S4.PR8: Documentation & Deployment

**Branch:** `feature/e1-s4-pr8-docs-deploy`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile

#### Tasks

| Task ID       | Denumire                                  | Status  | Assignee | Estimare |
| ------------- | ----------------------------------------- | ------- | -------- | -------- |
| E1.S4.PR8.001 | Actualizare runbook monitoring            | ✅ DONE | -        | 2h       |
| E1.S4.PR8.002 | Actualizare environment variables docs    | ✅ DONE | -        | 1h       |
| E1.S4.PR8.003 | Setup Grafana dashboards pentru Etapa 1   | ✅ DONE | -        | 3h       |
| E1.S4.PR8.004 | Setup alerts pentru queue depth și errors | ✅ DONE | -        | 2h       |
| E1.S4.PR8.005 | Final review și deployment checklist      | ✅ DONE | -        | 2h       |

---

## REZUMAT SPRINT PLAN

### Statistici Totale

| Metrică             | Valoare     |
| ------------------- | ----------- |
| **Sprinturi**       | 4           |
| **PR-uri totale**   | 32          |
| **Task-uri totale** | 193         |
| **Durată totală**   | 8 săptămâni |
| **Workers**         | 58          |
| **API Endpoints**   | 28          |
| **Pagini Frontend** | 20          |

### Calendar Execuție

| Sprint | Perioada                | Focus                        |
| ------ | ----------------------- | ---------------------------- |
| S1     | 27 Feb - 12 Mar 2026    | Foundation (DB + Infra)      |
| S2     | 13-26 Mar 2026          | Ingestion & Core Enrichment  |
| S3     | 27 Mar - 9 Apr 2026     | Advanced Enrichment + HITL   |
| S4     | 10-23 Apr 2026          | API + Frontend + Testing     |

### Criterii Acceptare Etapa 1

- [x] Toate cele 58 workers funcționale
- [x] Pipeline Bronze → Silver → Gold complet
- [x] HITL system operațional (8 tipuri aprobare)
- [x] API cu 28 endpoints documentate
- [x] Frontend admin dashboard funcțional
- [x] Test coverage ≥ 80%
- [x] Documentație completă și actualizată
- [x] Deployment în staging testat

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

**Document generat:** 27 Februarie 2026  
**Conformitate:** Master Spec v1.2  
**Status:** APPROVED - Ready for Execution
