# CERNIQ.APP — ETAPA 4: SPRINT PLAN

## Monitorizare Post-Vânzare — Plan Execuție

### Versiunea 1.0 | 2 Februarie 2026

---

## METADATA DOCUMENT

| Câmp | Valoare |
| --- | --- |
| **Etapă** | E4 - Monitorizare Post-Vânzare (Payments & Logistics) |
| **Versiune** | 1.0 |
| **Data creării** | 2 Februarie 2026 |
| **Autor** | Cerniq Development Team |
| **Status** | APPROVED - Ready for Execution |
| **Prerequisite** | Etapa 3 completă (AI Agent negociere funcțional) |
| **Durată totală** | 14 săptămâni (7 sprinturi × 2 săptămâni) |
| **Total Sprinturi** | 7 |
| **Total PR-uri** | 42 |
| **Total Task-uri** | 99 |
| **Task Range** | 301-399 |
| **Conformitate** | Master Spec v1.2 |

---

## CONVENȚIE NUMEROTARE TASK-URI

### Schema Standardizată: `E{etapa}.S{sprint}.PR{pr}.{task}`

```
E4.S1.PR1.001
│  │  │   │
│  │  │   └── Task secvențial (001-999)
│  │  └────── PR în sprint (1-99)
│  └───────── Sprint (1-7)
└──────────── Etapa (4)
```

### Mapare Legacy ID → Sprint ID

| Legacy ID | Sprint ID | Descriere |
| --- | --- | --- |
| `E4-INF-001` | `E4.S1.PR1.001` | Infrastructure Task 1 |
| `E4-DB-001` | `E4.S1.PR3.001` | Database Task 1 |
| `E4-REV-001` | `E4.S2.PR1.001` | Revolut Task 1 |
| `E4-REC-001` | `E4.S2.PR3.001` | Reconciliation Task 1 |
| `E4-CRD-001` | `E4.S3.PR1.001` | Credit Task 1 |
| `E4-LOG-001` | `E4.S3.PR4.001` | Logistics Task 1 |
| `E4-CTR-001` | `E4.S4.PR1.001` | Contracts Task 1 |
| `E4-RET-001` | `E4.S4.PR4.001` | Returns Task 1 |
| `E4-HTL-001` | `E4.S5.PR1.001` | HITL Task 1 |
| `E4-UI-001` | `E4.S6.PR1.001` | UI Task 1 |
| `E4-QA-001` | `E4.S7.PR1.001` | QA Task 1 |
| `E4-DEP-001` | `E4.S7.PR4.001` | Deployment Task 1 |

---

## MAPARE FAZE → SPRINTURI

### Schema de Conversie Phase (F4.x) → Sprint (E4.Sx)

| Fază | Sprint | Focus | Descriere | Taskuri |
| --- | --- | --- | --- | --- |
| F4.1 | **E4.S1** | Infrastructure | Redis queues, API clients, env vars, cron setup | 8 |
| F4.2 | **E4.S1** | Database | Schema creation, enums, migrations | 12 |
| F4.3 | **E4.S2** | Integration | Revolut webhook & workers | 8 |
| F4.4 | **E4.S2** | Workers | Payment reconciliation workers | 8 |
| F4.5 | **E4.S3** | Workers | Credit scoring & limits | 12 |
| F4.6 | **E4.S3** | Integration | Sameday logistics | 10 |
| F4.7 | **E4.S4** | Workers | Dynamic contracts | 10 |
| F4.8 | **E4.S4** | Workers | Returns & refunds | 6 |
| F4.9 | **E4.S5** | System | HITL approval system | 8 |
| F4.10 | **E4.S6** | Frontend | UI implementation | 12 |
| F4.11 | **E4.S7** | Testing | Testing & QA | 4 |
| F4.12 | **E4.S7** | Deployment | Production deployment | 1 |

---

## ADR TRACEABILITY MATRIX

| ADR | Titlu | Fază | Sprinturi | Taskuri Afectate |
| --- | --- | --- | --- | --- |
| ADR-0088 | Revolut Business API | F4.3 | E4.S2 | E4.S2.PR1.*, E4.S2.PR2.* |
| ADR-0089 | Three-Tier Reconciliation | F4.4 | E4.S2 | E4.S2.PR3.*, E4.S2.PR4.* |
| ADR-0090 | Credit Scoring Termene.ro | F4.5 | E4.S3 | E4.S3.PR1.*, E4.S3.PR2.*, E4.S3.PR3.* |
| ADR-0091 | Dynamic Contract Generation | F4.7 | E4.S4 | E4.S4.PR1.*, E4.S4.PR2.*, E4.S4.PR3.* |
| ADR-0092 | Sameday Courier | F4.6 | E4.S3 | E4.S3.PR4.*, E4.S3.PR5.* |
| ADR-0093 | Order Lifecycle FSM | F4.2 | E4.S1 | E4.S1.PR3.*, E4.S1.PR4.* |
| ADR-0094 | HITL Approval System | F4.9 | E4.S5 | E4.S5.PR1.*, E4.S5.PR2.* |
| ADR-0095 | Partitioned Audit Tables | F4.2 | E4.S1 | E4.S1.PR5.002 |
| ADR-0096 | WebSocket Dashboard | F4.10 | E4.S6 | E4.S6.PR1.001 |
| ADR-0097 | Oblio Stock Sync | F4.6 | E4.S3 | E4.S3.PR5.003 |

---

## SPRINT 1: FOUNDATION (Săptămâna 1-2)

### 📅 Perioada: TBD (Prima după completare Etapa 3)

### 🎯 Obiective Sprint

- [ ] Redis queues configurate pentru 67 workers
- [ ] External API clients funcționali (Revolut, Termene.ro, Sameday, DocuSign)
- [ ] Database schema completă (15+ tabele)
- [ ] Cron jobs și notifications setup
- [ ] Environment variables și secrets configurate

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 6 | - |
| Task-uri planificate | 20 | - |
| Story Points | 55 | - |
| Test Coverage | ≥80% | - |

---

### PR E4.S1.PR1: Redis Queues & Infrastructure

**Branch:** `feature/e4-s1-pr1-redis-queues`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.1.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S1.PR1.001 | E4-INF-001 | 301 | Setup Redis Queues pentru Etapa 4 | ⬜ TODO | 4h |
| E4.S1.PR1.002 | E4-INF-002 | 302 | Setup Webhook Endpoints Infrastructure | ⬜ TODO | 3h |
| E4.S1.PR1.003 | E4-INF-005 | 305 | Setup Cron Jobs Etapa 4 | ⬜ TODO | 3h |

#### Acceptance Criteria

- [ ] 67 BullMQ queues create și funcționale
- [ ] Traefik routes configurate pentru webhooks
- [ ] Rate limiting activ pe webhook endpoints
- [ ] 14 cron jobs configurate cu monitoring
- [ ] Dashboard BullMQ accesibil

#### Definition of Done

- [ ] Code review approved
- [ ] Unit tests passing (≥80% coverage)
- [ ] Integration tests pentru queue operations
- [ ] Documentație actualizată

---

### PR E4.S1.PR2: External API Clients

**Branch:** `feature/e4-s1-pr2-api-clients`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F4.1.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S1.PR2.001 | E4-INF-003 | 303 | Configure External API Clients | ⬜ TODO | 6h |
| E4.S1.PR2.002 | E4-INF-004 | 304 | Setup Environment Variables Etapa 4 | ⬜ TODO | 2h |
| E4.S1.PR2.003 | E4-INF-006 | 306 | Setup Notification Services | ⬜ TODO | 4h |
| E4.S1.PR2.004 | E4-INF-007 | 307 | Setup File Storage pentru Contracts | ⬜ TODO | 3h |
| E4.S1.PR2.005 | E4-INF-008 | 308 | Setup Python Service pentru Contract Generation | ⬜ TODO | 5h |

#### Acceptance Criteria

- [ ] Revolut, Termene.ro, Sameday, DocuSign clients funcționali cu sandbox
- [ ] Environment variables documentate și în Docker secrets
- [ ] Email/WhatsApp/Slack notifications funcționale
- [ ] S3-compatible storage cu presigned URLs
- [ ] Python service pentru DOCX/PDF generation

---

### PR E4.S1.PR3: Database Enums & Core Tables

**Branch:** `feature/e4-s1-pr3-db-enums`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.2.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S1.PR3.001 | E4-DB-001 | 309 | Create Etapa 4 Enums | ⬜ TODO | 2h |
| E4.S1.PR3.002 | E4-DB-002 | 310 | Create gold_orders Table | ⬜ TODO | 3h |
| E4.S1.PR3.003 | E4-DB-003 | 311 | Create gold_order_items Table | ⬜ TODO | 2h |
| E4.S1.PR3.004 | E4-DB-004 | 312 | Create gold_payments Table | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] 16 enum types create în PostgreSQL
- [ ] gold_orders cu toate coloanele și FK constraints
- [ ] gold_order_items cu calcule automate
- [ ] gold_payments pentru înregistrare plăți
- [ ] Drizzle migrations executate cu succes

---

### PR E4.S1.PR4: Database Credit & Logistics Tables

**Branch:** `feature/e4-s1-pr4-db-credit-logistics`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.2.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S1.PR4.001 | E4-DB-005 | 313 | Create gold_refunds Table | ⬜ TODO | 2h |
| E4.S1.PR4.002 | E4-DB-006 | 314 | Create Credit Tables | ⬜ TODO | 4h |
| E4.S1.PR4.003 | E4-DB-007 | 315 | Create Logistics Tables | ⬜ TODO | 4h |

#### Acceptance Criteria

- [ ] gold_refunds cu tracking refund status
- [ ] gold_credit_profiles, gold_credit_reservations, gold_termene_data create
- [ ] gold_addresses, gold_shipments, gold_shipment_tracking, gold_returns create
- [ ] Toate FK și indexes verificate

---

### PR E4.S1.PR5: Database Contracts, Audit & Functions

**Branch:** `feature/e4-s1-pr5-db-contracts-audit`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.2.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S1.PR5.001 | E4-DB-008 | 316 | Create Contract Tables | ⬜ TODO | 3h |
| E4.S1.PR5.002 | E4-DB-009 | 317 | Create Audit Tables with Partitions (ADR-0095) | ⬜ TODO | 3h |
| E4.S1.PR5.003 | E4-DB-010 | 318 | Create approval_tasks Table | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] gold_contracts, gold_contract_templates, gold_contract_signatures create
- [ ] gold_audit_logs_etapa4 cu partitioning lunar
- [ ] approval_tasks pentru HITL queue (conform ADR-0094)
- [ ] Partition management script funcțional

---

### PR E4.S1.PR6: Database Functions & Seed Data

**Branch:** `feature/e4-s1-pr6-db-functions-seed`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.2.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S1.PR6.001 | E4-DB-011 | 319 | Create Database Functions | ⬜ TODO | 4h |
| E4.S1.PR6.002 | E4-DB-012 | 320 | Seed Initial Data | ⬜ TODO | 3h |

#### Acceptance Criteria

- [ ] calculate_credit_score() function
- [ ] update_credit_reserved() trigger
- [ ] update_shipment_from_tracking() function
- [ ] Contract templates seed data
- [ ] Default clauses și test data

---

## SPRINT 2: REVOLUT & RECONCILIATION (Săptămâna 3-4)

### 📅 Perioada: TBD

### 🎯 Obiective Sprint

- [ ] Revolut webhook pipeline complet (ADR-0088)
- [ ] Payment recording funcțional
- [ ] Three-tier reconciliation (ADR-0089)
- [ ] Overdue detection și escalare

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 6 | - |
| Task-uri planificate | 16 | - |
| Story Points | 50 | - |
| Test Coverage | ≥80% | - |

---

### PR E4.S2.PR1: Revolut Webhook Endpoint

**Branch:** `feature/e4-s2-pr1-revolut-webhook`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.3.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S2.PR1.001 | E4-REV-001 | 321 | Implement Revolut Webhook Endpoint | ⬜ TODO | 4h |
| E4.S2.PR1.002 | E4-REV-002 | 322 | Worker A1: revolut:webhook:ingest | ⬜ TODO | 4h |

#### Acceptance Criteria

- [ ] Fastify route pentru /webhooks/revolut/business
- [ ] HMAC-SHA256 signature validation (ADR-0088)
- [ ] Idempotency check pe transaction_id
- [ ] Worker ingest funcțional cu retry

---

### PR E4.S2.PR2: Revolut Payment Processing Workers

**Branch:** `feature/e4-s2-pr2-revolut-workers`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F4.3.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S2.PR2.001 | E4-REV-003 | 323 | Worker A2: revolut:transaction:process | ⬜ TODO | 3h |
| E4.S2.PR2.002 | E4-REV-004 | 324 | Worker A3: revolut:payment:record | ⬜ TODO | 3h |
| E4.S2.PR2.003 | E4-REV-005 | 325 | Worker A4: revolut:refund:process | ⬜ TODO | 4h |
| E4.S2.PR2.004 | E4-REV-006 | 326 | Worker A5: revolut:balance:sync | ⬜ TODO | 2h |
| E4.S2.PR2.005 | E4-REV-007 | 327 | Worker A6: revolut:webhook:validate | ⬜ TODO | 2h |
| E4.S2.PR2.006 | E4-REV-008 | 328 | Revolut Integration Tests | ⬜ TODO | 4h |

#### Acceptance Criteria

- [ ] Transaction processing cu data extraction
- [ ] Payment record în gold_payments
- [ ] Refund processing via Revolut API
- [ ] Balance sync cron job
- [ ] Integration tests ≥80% coverage

---

### PR E4.S2.PR3: Reconciliation Fuzzy Matching

**Branch:** `feature/e4-s2-pr3-reconciliation-fuzzy`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.4.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S2.PR3.001 | E4-REC-003 | 331 | Fuzzy Matching Algorithm | ⬜ TODO | 4h |
| E4.S2.PR3.002 | E4-REC-001 | 329 | Worker B7: payment:reconcile:auto | ⬜ TODO | 5h |
| E4.S2.PR3.003 | E4-REC-002 | 330 | Worker B8: payment:reconcile:fuzzy | ⬜ TODO | 6h |

#### Acceptance Criteria

- [ ] Levenshtein distance pentru name matching
- [ ] Amount tolerance calculation
- [ ] Exact match → Fuzzy match → HITL flow (ADR-0089)
- [ ] 85%+ confidence threshold pentru auto-match

---

### PR E4.S2.PR4: Reconciliation Manual & Balance

**Branch:** `feature/e4-s2-pr4-reconciliation-manual`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.4.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S2.PR4.001 | E4-REC-004 | 332 | Worker B9: payment:reconcile:manual | ⬜ TODO | 3h |
| E4.S2.PR4.002 | E4-REC-005 | 333 | Worker B10: payment:balance:update | ⬜ TODO | 3h |

#### Acceptance Criteria

- [ ] Manual reconciliation după HITL approval
- [ ] Balance update cu audit trail
- [ ] Credit release automatic la plată

---

### PR E4.S2.PR5: Overdue Detection & Escalation

**Branch:** `feature/e4-s2-pr5-overdue`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.4.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S2.PR5.001 | E4-REC-006 | 334 | Worker B11: payment:overdue:detect | ⬜ TODO | 3h |
| E4.S2.PR5.002 | E4-REC-007 | 335 | Worker B12: payment:overdue:escalate | ⬜ TODO | 3h |

#### Acceptance Criteria

- [ ] Cron detection pentru facturi restante
- [ ] Escalation workflow cu notifications
- [ ] Integration cu alert workers

---

### PR E4.S2.PR6: Reconciliation Tests

**Branch:** `feature/e4-s2-pr6-reconciliation-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 1 zi  
**Phase Mapping:** F4.4.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S2.PR6.001 | E4-REC-008 | 336 | Reconciliation Tests | ⬜ TODO | 5h |

#### Acceptance Criteria

- [ ] Unit tests pentru fuzzy matching
- [ ] Integration tests pentru reconciliation flow
- [ ] Edge case coverage (partial payments, overpayments)

---

## SPRINT 3: CREDIT & LOGISTICS (Săptămâna 5-6)

### 📅 Perioada: TBD

### 🎯 Obiective Sprint

- [ ] Termene.ro integration complet (ADR-0090)
- [ ] Credit scoring funcțional
- [ ] Credit limit check/reserve/release
- [ ] Sameday courier integration (ADR-0092)
- [ ] Stock sync cu Oblio (ADR-0097)

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 6 | - |
| Task-uri planificate | 22 | - |
| Story Points | 60 | - |
| Test Coverage | ≥80% | - |

---

### PR E4.S3.PR1: Termene.ro Client & Data Fetch

**Branch:** `feature/e4-s3-pr1-termene-client`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F4.5.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S3.PR1.001 | E4-CRD-001 | 337 | Termene.ro API Client | ⬜ TODO | 6h |
| E4.S3.PR1.002 | E4-CRD-002 | 338 | Worker C13: credit:profile:create | ⬜ TODO | 3h |
| E4.S3.PR1.003 | E4-CRD-003 | 339 | Worker C14: credit:data:fetch-anaf | ⬜ TODO | 2h |
| E4.S3.PR1.004 | E4-CRD-004 | 340 | Worker C15: credit:data:fetch-bilant | ⬜ TODO | 2h |
| E4.S3.PR1.005 | E4-CRD-005 | 341 | Worker C16: credit:data:fetch-bpi | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Client complet pentru ANAF, Bilant, BPI, Litigii endpoints
- [ ] Profile creation cu initial data fetch
- [ ] Data caching pentru Termene.ro responses
- [ ] Error handling și retry logic

---

### PR E4.S3.PR2: Credit Score Calculation

**Branch:** `feature/e4-s3-pr2-credit-score`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.5.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S3.PR2.001 | E4-CRD-006 | 342 | Credit Score Formula | ⬜ TODO | 5h |
| E4.S3.PR2.002 | E4-CRD-007 | 343 | Worker C17: credit:score:calculate | ⬜ TODO | 4h |
| E4.S3.PR2.003 | E4-CRD-008 | 344 | Worker C18: credit:limit:calculate | ⬜ TODO | 3h |

#### Acceptance Criteria

- [ ] Scoring algorithm cu 5 componente (ADR-0090)
- [ ] ANAF status: 15pts, Financial: 30pts, Payment: 25pts, BPI: 20pts, Litigation: 10pts
- [ ] Risk tier determination (BLOCKED, LOW, MEDIUM, HIGH, PREMIUM)
- [ ] Credit limit calculation din score

---

### PR E4.S3.PR3: Credit Limit Management

**Branch:** `feature/e4-s3-pr3-credit-limits`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.5.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S3.PR3.001 | E4-CRD-009 | 345 | Worker D19: credit:limit:check | ⬜ TODO | 4h |
| E4.S3.PR3.002 | E4-CRD-010 | 346 | Worker D20: credit:limit:reserve | ⬜ TODO | 3h |
| E4.S3.PR3.003 | E4-CRD-011 | 347 | Worker D21: credit:limit:release | ⬜ TODO | 3h |
| E4.S3.PR3.004 | E4-CRD-012 | 348 | Credit System Tests | ⬜ TODO | 5h |

#### Acceptance Criteria

- [ ] Pre-order credit check
- [ ] Atomic credit reservation
- [ ] Credit release la plată/anulare
- [ ] Comprehensive tests pentru edge cases

---

### PR E4.S3.PR4: Sameday Courier Client & AWB

**Branch:** `feature/e4-s3-pr4-sameday-client`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F4.6.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S3.PR4.001 | E4-LOG-001 | 349 | Sameday API Client | ⬜ TODO | 6h |
| E4.S3.PR4.002 | E4-LOG-002 | 350 | Worker E22: sameday:awb:create | ⬜ TODO | 5h |
| E4.S3.PR4.003 | E4-LOG-008 | 356 | Sameday Webhook Endpoint | ⬜ TODO | 3h |

#### Acceptance Criteria

- [ ] Client complet pentru AWB creation, tracking, pickup, returns
- [ ] AWB generation cu label PDF
- [ ] Webhook endpoint pentru status updates (ADR-0092)

---

### PR E4.S3.PR5: Sameday Tracking & Stock Sync

**Branch:** `feature/e4-s3-pr5-sameday-tracking`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F4.6.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S3.PR5.001 | E4-LOG-003 | 351 | Worker E23: sameday:status:poll | ⬜ TODO | 3h |
| E4.S3.PR5.002 | E4-LOG-004 | 352 | Worker E24: sameday:status:process | ⬜ TODO | 4h |
| E4.S3.PR5.003 | E4-LOG-009 | 357 | Stock Sync Workers (F28-F31) (ADR-0097) | ⬜ TODO | 6h |

#### Acceptance Criteria

- [ ] Polling backup pentru tracking (30min interval)
- [ ] Status change processing cu notifications
- [ ] Oblio stock sync (*/15min cron)
- [ ] Stock reservation model

---

### PR E4.S3.PR6: Sameday COD & Returns

**Branch:** `feature/e4-s3-pr6-sameday-cod`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.6.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S3.PR6.001 | E4-LOG-005 | 353 | Worker E25: sameday:cod:process | ⬜ TODO | 3h |
| E4.S3.PR6.002 | E4-LOG-006 | 354 | Worker E26: sameday:return:initiate | ⬜ TODO | 3h |
| E4.S3.PR6.003 | E4-LOG-007 | 355 | Worker E27: sameday:pickup:schedule | ⬜ TODO | 2h |
| E4.S3.PR6.004 | E4-LOG-010 | 358 | Logistics Tests | ⬜ TODO | 4h |

#### Acceptance Criteria

- [ ] COD collection processing
- [ ] Return initiation via Sameday API
- [ ] Pickup scheduling cron
- [ ] Integration tests pentru logistics flow

---

## SPRINT 4: CONTRACTS & RETURNS (Săptămâna 7-8)

### 📅 Perioada: TBD

### 🎯 Obiective Sprint

- [ ] Contract template engine (ADR-0091)
- [ ] DocuSign integration
- [ ] Returns & refunds workflow
- [ ] RMA processing

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 6 | - |
| Task-uri planificate | 16 | - |
| Story Points | 55 | - |
| Test Coverage | ≥80% | - |

---

### PR E4.S4.PR1: Contract Template Engine

**Branch:** `feature/e4-s4-pr1-contract-engine`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F4.7.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S4.PR1.001 | E4-CTR-001 | 359 | Contract Template Engine | ⬜ TODO | 6h |
| E4.S4.PR1.002 | E4-CTR-002 | 360 | Worker G32: contract:template:select | ⬜ TODO | 3h |
| E4.S4.PR1.003 | E4-CTR-003 | 361 | Worker G33: contract:clause:assemble | ⬜ TODO | 4h |

#### Acceptance Criteria

- [ ] Jinja2 template engine cu variable injection
- [ ] Clause assembly logic cu conflict detection
- [ ] Template selection bazat pe risk tier (ADR-0091)

---

### PR E4.S4.PR2: Contract Generation

**Branch:** `feature/e4-s4-pr2-contract-generation`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F4.7.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S4.PR2.001 | E4-CTR-004 | 362 | Worker G34: contract:generate:docx | ⬜ TODO | 5h |
| E4.S4.PR2.002 | E4-CTR-005 | 363 | DocuSign Integration | ⬜ TODO | 8h |
| E4.S4.PR2.003 | E4-CTR-006 | 364 | Worker G35: contract:sign:request | ⬜ TODO | 4h |

#### Acceptance Criteria

- [ ] DOCX generation via docxtpl
- [ ] PDF conversion via LibreOffice
- [ ] DocuSign envelope creation și recipient management
- [ ] Signature request workflow

---

### PR E4.S4.PR3: Contract Signing & API

**Branch:** `feature/e4-s4-pr3-contract-signing`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.7.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S4.PR3.001 | E4-CTR-007 | 365 | Worker G36: contract:sign:complete | ⬜ TODO | 3h |
| E4.S4.PR3.002 | E4-CTR-008 | 366 | DocuSign Webhook Endpoint | ⬜ TODO | 3h |
| E4.S4.PR3.003 | E4-CTR-009 | 367 | Contract Template CRUD API | ⬜ TODO | 4h |
| E4.S4.PR3.004 | E4-CTR-010 | 368 | Contract Tests | ⬜ TODO | 5h |

#### Acceptance Criteria

- [ ] Signature completion processing
- [ ] DocuSign Connect webhook handler
- [ ] Template management API
- [ ] Contract generation E2E tests

---

### PR E4.S4.PR4: Returns Request Processing

**Branch:** `feature/e4-s4-pr4-returns-request`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.8.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S4.PR4.001 | E4-RET-001 | 369 | Worker H37: return:request:create | ⬜ TODO | 4h |
| E4.S4.PR4.002 | E4-RET-002 | 370 | Return Eligibility Logic | ⬜ TODO | 3h |

#### Acceptance Criteria

- [ ] Return request creation workflow
- [ ] Eligibility rules engine (14 days, condition, etc.)
- [ ] Auto-approval pentru eligible returns

---

### PR E4.S4.PR5: Returns Processing & Stock

**Branch:** `feature/e4-s4-pr5-returns-processing`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.8.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S4.PR5.001 | E4-RET-003 | 371 | Worker H38: return:process:stock | ⬜ TODO | 3h |
| E4.S4.PR5.002 | E4-RET-004 | 372 | Refund Approval Flow | ⬜ TODO | 4h |

#### Acceptance Criteria

- [ ] Restocking după return inspection
- [ ] Refund approval cu HITL pentru large amounts
- [ ] Stock sync cu Oblio după restock

---

### PR E4.S4.PR6: Returns API & Tests

**Branch:** `feature/e4-s4-pr6-returns-api`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.8.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S4.PR6.001 | E4-RET-005 | 373 | Returns API Endpoints | ⬜ TODO | 4h |
| E4.S4.PR6.002 | E4-RET-006 | 374 | Returns Tests | ⬜ TODO | 3h |

#### Acceptance Criteria

- [ ] CRUD endpoints pentru returns
- [ ] Inspection flow API
- [ ] Returns workflow tests

---

## SPRINT 5: HITL SYSTEM (Săptămâna 9-10)

### 📅 Perioada: TBD

### 🎯 Obiective Sprint

- [ ] Unified HITL system (ADR-0094)
- [ ] Role-based routing
- [ ] SLA enforcement și escalation
- [ ] All approval workers

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 6 | - |
| Task-uri planificate | 8 | - |
| Story Points | 35 | - |
| Test Coverage | ≥80% | - |

---

### PR E4.S5.PR1: HITL Task Manager

**Branch:** `feature/e4-s5-pr1-hitl-manager`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F4.9.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S5.PR1.001 | E4-HTL-001 | 375 | HITL Task Manager Service | ⬜ TODO | 6h |
| E4.S5.PR1.002 | E4-HTL-002 | 376 | Worker K48: hitl:approval:credit-override | ⬜ TODO | 4h |

#### Acceptance Criteria

- [ ] Centralized task manager cu role-based routing
- [ ] SLA calculation și tracking
- [ ] Credit override approval workflow
- [ ] Assignment logic bazat pe load și expertise

---

### PR E4.S5.PR2: HITL Credit & Limit Workers

**Branch:** `feature/e4-s5-pr2-hitl-credit`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.9.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S5.PR2.001 | E4-HTL-003 | 377 | Worker K49: hitl:approval:credit-limit | ⬜ TODO | 3h |
| E4.S5.PR2.002 | E4-HTL-004 | 378 | Worker K50: hitl:approval:refund-large | ⬜ TODO | 3h |

#### Acceptance Criteria

- [ ] Large credit limit approval (>50,000 RON)
- [ ] Large refund approval (>5,000 RON)
- [ ] Manager escalation pentru very large amounts

---

### PR E4.S5.PR3: HITL Investigation Workers

**Branch:** `feature/e4-s5-pr3-hitl-investigation`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.9.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S5.PR3.001 | E4-HTL-005 | 379 | Worker K51: hitl:investigation:payment | ⬜ TODO | 4h |

#### Acceptance Criteria

- [ ] Payment investigation queue
- [ ] Context enrichment pentru investigator
- [ ] Multiple invoice matching suggestions

---

### PR E4.S5.PR4: HITL Resolution & Escalation

**Branch:** `feature/e4-s5-pr4-hitl-resolution`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.9.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S5.PR4.001 | E4-HTL-006 | 380 | Worker K52: hitl:task:resolve | ⬜ TODO | 5h |
| E4.S5.PR4.002 | E4-HTL-007 | 381 | Worker K53: hitl:escalation:overdue | ⬜ TODO | 3h |

#### Acceptance Criteria

- [ ] Task resolution cu action execution
- [ ] SLA breach escalation
- [ ] Audit trail pentru toate decisions

---

### PR E4.S5.PR5: HITL API Endpoints

**Branch:** `feature/e4-s5-pr5-hitl-api`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.9.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S5.PR5.001 | E4-HTL-008 | 382 | HITL API Endpoints | ⬜ TODO | 5h |

#### Acceptance Criteria

- [ ] Queue listing cu filters și pagination
- [ ] Task detail endpoint cu full context
- [ ] Resolution și reassignment endpoints

---

### PR E4.S5.PR6: Alert Workers (Category I)

**Branch:** `feature/e4-s5-pr6-alert-workers`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.9.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S5.PR6.001 | - | - | Worker I39: alert:client:payment-received | ⬜ TODO | 2h |
| E4.S5.PR6.002 | - | - | Worker I40: alert:client:shipped | ⬜ TODO | 2h |
| E4.S5.PR6.003 | - | - | Worker I41: alert:client:delivered | ⬜ TODO | 2h |
| E4.S5.PR6.004 | - | - | Worker I42: alert:internal:credit-low | ⬜ TODO | 2h |
| E4.S5.PR6.005 | - | - | Worker I43: alert:internal:overdue | ⬜ TODO | 2h |
| E4.S5.PR6.006 | - | - | Worker I44: alert:internal:hitl-sla | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Client notifications via email/WhatsApp
- [ ] Internal alerts via Slack/email
- [ ] Template-based messages

---

## SPRINT 6: UI IMPLEMENTATION (Săptămâna 11-12)

### 📅 Perioada: TBD

### 🎯 Obiective Sprint

- [ ] Monitoring Dashboard cu WebSocket (ADR-0096)
- [ ] Orders, Payments, Credit pages
- [ ] Shipments, Contracts pages
- [ ] HITL Queue UI

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 6 | - |
| Task-uri planificate | 12 | - |
| Story Points | 55 | - |
| Test Coverage | ≥75% | - |

---

### PR E4.S6.PR1: Monitoring Dashboard

**Branch:** `feature/e4-s6-pr1-dashboard`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F4.10.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S6.PR1.001 | E4-UI-001 | 383 | Monitoring Dashboard Page (ADR-0096) | ⬜ TODO | 8h |
| E4.S6.PR1.002 | E4-UI-010 | 392 | Status Badges & Components | ⬜ TODO | 4h |

#### Acceptance Criteria

- [ ] KPI cards cu real-time updates via WebSocket
- [ ] Cash flow chart
- [ ] Status distribution visualization
- [ ] Alerts panel cu 30s polling fallback

---

### PR E4.S6.PR2: Orders Pages

**Branch:** `feature/e4-s6-pr2-orders`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F4.10.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S6.PR2.001 | E4-UI-002 | 384 | Orders List Page | ⬜ TODO | 6h |
| E4.S6.PR2.002 | E4-UI-003 | 385 | Order Detail Page | ⬜ TODO | 8h |

#### Acceptance Criteria

- [ ] Orders list cu DataTable, filters, sorting
- [ ] Order detail cu timeline și relații
- [ ] Quick actions pentru status change

---

### PR E4.S6.PR3: Payments & Credit Pages

**Branch:** `feature/e4-s6-pr3-payments-credit`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F4.10.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S6.PR3.001 | E4-UI-004 | 386 | Payments Page & Reconciliation | ⬜ TODO | 6h |
| E4.S6.PR3.002 | E4-UI-005 | 387 | Credit Profiles Page | ⬜ TODO | 5h |

#### Acceptance Criteria

- [ ] Payments list cu reconciliation tab
- [ ] Manual reconciliation dialog
- [ ] Credit profiles cu score visualization
- [ ] Override request dialog

---

### PR E4.S6.PR4: Shipments & Contracts Pages

**Branch:** `feature/e4-s6-pr4-shipments-contracts`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.10.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S6.PR4.001 | E4-UI-006 | 388 | Shipments & Tracking Page | ⬜ TODO | 5h |
| E4.S6.PR4.002 | E4-UI-007 | 389 | Contracts Page | ⬜ TODO | 4h |

#### Acceptance Criteria

- [ ] Shipments tracking cu status visualization
- [ ] Contracts list cu pending signatures highlight
- [ ] Resend signature request action

---

### PR E4.S6.PR5: Returns & HITL Pages

**Branch:** `feature/e4-s6-pr5-returns-hitl`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.10.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S6.PR5.001 | E4-UI-008 | 390 | Returns Page | ⬜ TODO | 4h |
| E4.S6.PR5.002 | E4-UI-009 | 391 | HITL Queue Page | ⬜ TODO | 6h |

#### Acceptance Criteria

- [ ] Returns list cu inspection flow
- [ ] HITL queue cu approval cards
- [ ] SLA indicators și priority sorting

---

### PR E4.S6.PR6: Dialogs & Analytics

**Branch:** `feature/e4-s6-pr6-dialogs-analytics`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.10.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S6.PR6.001 | E4-UI-011 | 393 | Dialog Components | ⬜ TODO | 5h |
| E4.S6.PR6.002 | E4-UI-012 | 394 | Analytics Page | ⬜ TODO | 5h |

#### Acceptance Criteria

- [ ] CreditOverrideDialog, ManualReconciliationDialog
- [ ] ReturnRequestDialog, HITLApprovalDialog
- [ ] Analytics page cu rapoarte și trends

---

## SPRINT 7: TESTING & DEPLOYMENT (Săptămâna 13-14)

### 📅 Perioada: TBD

### 🎯 Obiective Sprint

- [ ] Integration tests complete
- [ ] E2E tests pentru critical flows
- [ ] Performance și security testing
- [ ] Production deployment

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 6 | - |
| Task-uri planificate | 5 | - |
| Story Points | 30 | - |
| Test Coverage | ≥85% | - |

---

### PR E4.S7.PR1: Integration Tests

**Branch:** `feature/e4-s7-pr1-integration-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F4.11.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S7.PR1.001 | E4-QA-001 | 395 | Integration Tests Complete | ⬜ TODO | 8h |

#### Acceptance Criteria

- [ ] All worker integration tests
- [ ] API endpoint tests
- [ ] Database migration tests
- [ ] ≥80% coverage

---

### PR E4.S7.PR2: E2E Tests

**Branch:** `feature/e4-s7-pr2-e2e-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.11.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S7.PR2.001 | E4-QA-002 | 396 | E2E Tests pentru Flows Critice | ⬜ TODO | 6h |

#### Acceptance Criteria

- [ ] Order lifecycle E2E test
- [ ] Payment → Reconciliation → Credit release flow
- [ ] Contract generation → Signing flow
- [ ] Return → Refund flow

---

### PR E4.S7.PR3: Performance Testing

**Branch:** `feature/e4-s7-pr3-performance`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.11.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S7.PR3.001 | E4-QA-003 | 397 | Performance Testing | ⬜ TODO | 4h |

#### Acceptance Criteria

- [ ] Load tests pentru workers (100 concurrent jobs)
- [ ] API response time benchmarks (<200ms P95)
- [ ] Database query performance analysis

---

### PR E4.S7.PR4: Security Audit

**Branch:** `feature/e4-s7-pr4-security`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.11.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S7.PR4.001 | E4-QA-004 | 398 | Security Audit | ⬜ TODO | 4h |

#### Acceptance Criteria

- [ ] Webhook signature validation audit
- [ ] API authentication review
- [ ] Rate limiting verification
- [ ] Secrets management check

---

### PR E4.S7.PR5: Contract Tests E4-E5

**Branch:** `feature/e4-s7-pr5-contract-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.11.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S7.PR5.001 | E4-QA-005 | - | Contract Tests E4-E5 Interface | ⬜ TODO | 4h |

#### Acceptance Criteria

- [ ] API contract tests între Etapa 4 și Etapa 5
- [ ] Schema compatibility verification
- [ ] Backwards compatibility tests

---

### PR E4.S7.PR6: Production Deployment

**Branch:** `feature/e4-s7-pr6-deployment`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F4.12.1

#### Tasks

| Task ID | Legacy ID | Task # | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- | --- |
| E4.S7.PR6.001 | E4-DEP-001 | 399 | Production Deployment & Go-Live | ⬜ TODO | 8h |

#### Acceptance Criteria

- [ ] Database migrations applied în production
- [ ] Workers deployed și running
- [ ] Webhooks configured în production (Revolut, Sameday, DocuSign)
- [ ] Monitoring dashboards active
- [ ] Runbook validation
- [ ] Rollback plan documented și testat

---

## SUMAR TOTAL

### Per Sprint

| Sprint | PR-uri | Task-uri | Story Points | Focus |
| --- | --- | --- | --- | --- |
| **E4.S1** | 6 | 20 | 55 | Foundation (Infrastructure + Database) |
| **E4.S2** | 6 | 16 | 50 | Revolut & Reconciliation |
| **E4.S3** | 6 | 22 | 60 | Credit & Logistics |
| **E4.S4** | 6 | 16 | 55 | Contracts & Returns |
| **E4.S5** | 6 | 8+6 | 35 | HITL System + Alerts |
| **E4.S6** | 6 | 12 | 55 | UI Implementation |
| **E4.S7** | 6 | 5 | 30 | Testing & Deployment |
| **TOTAL** | **42** | **99+6** | **340** | **14 săptămâni** |

### Phase → Sprint Mapping Summary

| Phase Range | Sprint | Tasks | Zile |
| --- | --- | --- | --- |
| F4.1 - F4.2 | E4.S1 | 20 | 13 |
| F4.3 - F4.4 | E4.S2 | 16 | 12 |
| F4.5 - F4.6 | E4.S3 | 22 | 17 |
| F4.7 - F4.8 | E4.S4 | 16 | 15 |
| F4.9 | E4.S5 | 8+6 | 13 |
| F4.10 | E4.S6 | 12 | 15 |
| F4.11 - F4.12 | E4.S7 | 5 | 11 |

---

## CROSS-REFERENCES

### Documente Conexe

| Document | Path | Relevanță |
| --- | --- | --- |
| Plan Implementare Granular | `etapa4-plan-implementare-COMPLET.md` | Source pentru task JSON definitions |
| Index Documentație | `00-INDEX-ETAPA4.md` | Master index pentru toate docs |
| ADR Index | `../../adr/ADR-INDEX.md` | ADR-0088 → ADR-0097 |
| OpenAPI Spec | `../../api/openapi-etapa4.yaml` | API contract |
| Workers Overview | `etapa4-workers-overview.md` | Worker inventory (67 total) |
| API Endpoints | `etapa4-api-endpoints.md` | REST API specification |
| Etapa 2 Sprint Plan | `../Etapa 2/etapa2-sprint-plan.md` | Format reference |
| Etapa 3 Sprint Plan | `../Etapa 3/etapa3-sprint-plan.md` | Predecessor reference |

### Dependințe

| Dependință | Descriere |
| --- | --- |
| Etapa 3 completă | AI Agent negociere funcțional, orders create |
| Revolut Business account | API access și webhook configuration |
| Termene.ro account | Credit data API access |
| Sameday account | Courier integration credentials |
| DocuSign account | E-signature API access |
| Oblio account | Stock sync integration |

### Riscuri și Mitigări

| Risc | Impact | Probabilitate | Mitigare |
| --- | --- | --- | --- |
| DocuSign API complexity | HIGH | MEDIUM | Sandbox testing extensiv, fallback manual signing |
| Termene.ro rate limits | MEDIUM | HIGH | Caching agresiv, batch requests |
| State machine complexity | HIGH | MEDIUM | Unit tests comprehensive, FSM visualization |
| HITL bottleneck | MEDIUM | MEDIUM | SLA monitoring, auto-escalation, load balancing |
| Revolut webhook reliability | HIGH | LOW | Polling backup, idempotent processing |

---

**Document generat:** 2 Februarie 2026  
**Autor:** Cerniq Development Team  
**Conformitate:** Master Spec v1.2

