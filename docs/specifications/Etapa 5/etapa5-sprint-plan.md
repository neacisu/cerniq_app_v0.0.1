# CERNIQ.APP — ETAPA 5: SPRINT PLAN

## Nurturing Agentic — Plan Execuție

### Versiunea 1.0 | 2 Februarie 2026

---

## METADATA DOCUMENT

| Câmp                | Valoare                                                |
| ------------------- | ------------------------------------------------------ |
| **Etapă**           | E5 - Nurturing Agentic (Post-Sale Customer Management) |
| **Versiune**        | 1.0                                                    |
| **Data creării**    | 2 Februarie 2026                                       |
| **Autor**           | Cerniq Development Team                                |
| **Status**          | APPROVED - Ready for Execution                         |
| **Prerequisite**    | Etapa 4 completă (Order Lifecycle FSM funcțional)      |
| **Durată totală**   | 14 săptămâni (7 sprinturi × 2 săptămâni)               |
| **Total Sprinturi** | 7                                                      |
| **Total PR-uri**    | 42                                                     |
| **Total Task-uri**  | 99                                                     |
| **Task Range**      | 400-498                                                |
| **Conformitate**    | Master Spec v1.2                                       |

---

## CONVENȚIE NUMEROTARE TASK-URI

### Schema Standardizată: `E{etapa}.S{sprint}.PR{pr}.{task}`

```
E5.S1.PR1.001
│  │  │   │
│  │  │   └── Task secvențial (001-999)
│  │  └────── PR în sprint (1-99)
│  └───────── Sprint (1-7)
└──────────── Etapa (5)
```

### Mapare Legacy ID → Sprint ID

| Legacy ID    | Sprint ID       | Descriere             |
| ------------ | --------------- | --------------------- |
| `E5-INF-001` | `E5.S1.PR1.001` | Infrastructure Task 1 |
| `E5-DB-001`  | `E5.S1.PR3.001` | Database Task 1       |
| `E5-SM-001`  | `E5.S2.PR1.001` | State Machine Task 1  |
| `E5-CHR-001` | `E5.S2.PR3.001` | Churn Task 1          |
| `E5-GEO-001` | `E5.S3.PR1.001` | Geospatial Task 1     |
| `E5-GRA-001` | `E5.S3.PR4.001` | Graph Task 1          |
| `E5-REF-001` | `E5.S4.PR1.001` | Referral Task 1       |
| `E5-WB-001`  | `E5.S4.PR4.001` | Win-Back Task 1       |
| `E5-ASS-001` | `E5.S5.PR1.001` | Associations Task 1   |
| `E5-FBK-001` | `E5.S5.PR4.001` | Feedback Task 1       |
| `E5-UI-001`  | `E5.S6.PR1.001` | UI Task 1             |
| `E5-TST-001` | `E5.S7.PR1.001` | Testing Task 1        |
| `E5-DEP-001` | `E5.S7.PR4.001` | Deployment Task 1     |

---

## MAPARE FAZE → SPRINTURI

### Schema de Conversie Phase (F5.x) → Sprint (E5.Sx)

| Fază  | Sprint    | Focus          | Descriere                                          | Taskuri |
| ----- | --------- | -------------- | -------------------------------------------------- | ------- |
| F5.1  | **E5.S1** | Infrastructure | Redis queues, Python services, PostGIS, cron setup | 8       |
| F5.2  | **E5.S1** | Database       | Schema creation, enums, migrations, indexes        | 12      |
| F5.3  | **E5.S2** | Workers        | State Machine A1-A8                                | 8       |
| F5.4  | **E5.S2** | Workers        | Churn Detection B9-B14                             | 8       |
| F5.5  | **E5.S3** | Workers        | Geospatial Analysis C15-C19                        | 8       |
| F5.6  | **E5.S3** | Workers        | Graph Analysis D20-D24                             | 8       |
| F5.7  | **E5.S4** | Workers        | Referral System E25-E31                            | 10      |
| F5.8  | **E5.S4** | Workers        | Win-Back Campaigns F32-F36                         | 8       |
| F5.9  | **E5.S5** | Workers        | Association Ingestion G37-G42                      | 8       |
| F5.10 | **E5.S5** | Workers        | Feedback, Content, Alerts H-K                      | 10      |
| F5.11 | **E5.S6** | Frontend       | UI Implementation (8 pages)                        | 8       |
| F5.12 | **E5.S7** | Testing        | E2E, Security Audit, Deploy                        | 3       |

---

## ADR TRACEABILITY MATRIX

| ADR      | Titlu                       | Fază  | Sprinturi | Taskuri Afectate                       |
| -------- | --------------------------- | ----- | --------- | -------------------------------------- |
| ADR-0098 | Nurturing State Machine     | F5.3  | E5.S2     | E5.S2.PR1._, E5.S2.PR2._               |
| ADR-0099 | Churn Detection AI          | F5.4  | E5.S2     | E5.S2.PR3._, E5.S2.PR4._               |
| ADR-0100 | PostGIS Proximity           | F5.5  | E5.S3     | E5.S3.PR1._, E5.S3.PR2._, E5.S3.PR3.\* |
| ADR-0101 | Leiden Community Detection  | F5.6  | E5.S3     | E5.S3.PR4._, E5.S3.PR5._, E5.S3.PR6.\* |
| ADR-0102 | GDPR Referral Consent       | F5.7  | E5.S4     | E5.S4.PR1._, E5.S4.PR2._               |
| ADR-0103 | Competition Law Safe Harbor | F5.10 | E5.S5     | E5.S5.PR5.001                          |
| ADR-0104 | Public Register Scraping    | F5.9  | E5.S5     | E5.S5.PR1._, E5.S5.PR2._               |
| ADR-0105 | KOL Graph Centrality        | F5.6  | E5.S3     | E5.S3.PR5.002, E5.S3.PR5.003           |
| ADR-0106 | Win-Back Campaigns          | F5.8  | E5.S4     | E5.S4.PR4._, E5.S4.PR5._               |
| ADR-0107 | Real-Time Sentiment         | F5.4  | E5.S2     | E5.S2.PR4.001, E5.S2.PR4.002           |

---

## SPRINT 1: FOUNDATION (Săptămâna 1-2)

### 📅 Perioada: TBD (Prima după completare Etapa 4)

### 🎯 Obiective Sprint

- [ ] Redis queues configurate pentru 58 workers (12 queues)
- [ ] Python Graph Service funcțional cu NetworkX/Leiden
- [ ] PostGIS extensions și indexes configurate
- [ ] Database schema completă (21 tabele)
- [ ] Cron jobs și notifications setup
- [ ] Environment variables și secrets configurate

### 📊 Metrici Sprint

| Metrică              | Target | Actual |
| -------------------- | ------ | ------ |
| PR-uri planificate   | 6      | -      |
| Task-uri planificate | 20     | -      |
| Story Points         | 63     | -      |
| Test Coverage        | ≥80%   | -      |

---

### PR E5.S1.PR1: Redis Queues & Infrastructure

**Branch:** `feature/e5-s1-pr1-redis-queues`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.1.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                                 | Status  | Estimare |
| ------------- | ---------- | ------ | ---------------------------------------- | ------- | -------- |
| E5.S1.PR1.001 | E5-INF-001 | 400    | Setup Redis Queues pentru Etapa 5        | ⬜ TODO | 4h       |
| E5.S1.PR1.002 | E5-INF-005 | 405    | Setup Cron Jobs Etapa 5                  | ⬜ TODO | 3h       |
| E5.S1.PR1.003 | E5-INF-007 | 407    | Environment Variables și Secrets Etapa 5 | ⬜ TODO | 2h       |

#### Acceptance Criteria

- [ ] 12 BullMQ queues create și funcționale (lifecycle, onboarding, state, churn, sentiment, decay, geospatial, graph, referral, winback, association, feedback, content, alerts, compliance)
- [ ] Rate limiting activ pe webhook endpoints
- [ ] 8 cron jobs configurate cu monitoring
- [ ] Dashboard BullMQ accesibil
- [ ] Environment variables documentate și în OpenBao (vezi [ADR-0033](../../adr/ADR%20Etapa%200/ADR-0033-OpenBao-Secrets-Management.md))

#### Definition of Done

- [ ] Code review approved
- [ ] Unit tests passing (≥80% coverage)
- [ ] Integration tests pentru queue operations
- [ ] Documentație actualizată

---

### PR E5.S1.PR2: Python Services Setup

**Branch:** `feature/e5-s1-pr2-python-services`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F5.1.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                                        | Status  | Estimare |
| ------------- | ---------- | ------ | ----------------------------------------------- | ------- | -------- |
| E5.S1.PR2.001 | E5-INF-002 | 401    | Setup Python Graph Service                      | ⬜ TODO | 6h       |
| E5.S1.PR2.002 | E5-INF-003 | 402    | Configure Anthropic LLM Client pentru Sentiment | ⬜ TODO | 4h       |
| E5.S1.PR2.003 | E5-INF-004 | 404    | Setup PDF Extraction Service                    | ⬜ TODO | 5h       |
| E5.S1.PR2.004 | E5-INF-006 | 406    | Configure ANM Weather API Integration           | ⬜ TODO | 2h       |

#### Acceptance Criteria

- [ ] Python Graph Service cu FastAPI, NetworkX, cdlib pentru community detection
- [ ] Anthropic Claude client cu rate limiting și cost tracking
- [ ] PDF service cu tabula-py, pdfplumber pentru MADR scraping
- [ ] ANM Weather API client funcțional
- [ ] Health checks pentru toate serviciile Python

---

### PR E5.S1.PR3: PostGIS & Database Enums

**Branch:** `feature/e5-s1-pr3-postgis-enums`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.1.1, F5.2.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                            | Status  | Estimare |
| ------------- | ---------- | ------ | ----------------------------------- | ------- | -------- |
| E5.S1.PR3.001 | E5-INF-004 | 403    | Setup PostGIS Extensions și Indexes | ⬜ TODO | 3h       |
| E5.S1.PR3.002 | E5-DB-001  | 408    | Create Etapa 5 Enums                | ⬜ TODO | 2h       |

#### Acceptance Criteria

- [ ] PostGIS extension activată
- [ ] 12 enum types create (nurturing_state_enum, churn_signal_type_enum, referral_status_enum, etc.)
- [ ] GEOGRAPHY type configurat pentru coordonate
- [ ] GiST index template ready

---

### PR E5.S1.PR4: Database Nurturing & Churn Tables

**Branch:** `feature/e5-s1-pr4-db-nurturing-churn`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.2.1

#### Tasks

| Task ID       | Legacy ID | Task # | Denumire                            | Status  | Estimare |
| ------------- | --------- | ------ | ----------------------------------- | ------- | -------- |
| E5.S1.PR4.001 | E5-DB-002 | 409    | Create gold_nurturing_state Table   | ⬜ TODO | 3h       |
| E5.S1.PR4.002 | E5-DB-003 | 410    | Create gold_nurturing_actions Table | ⬜ TODO | 2h       |
| E5.S1.PR4.003 | E5-DB-004 | 411    | Create Churn Tables                 | ⬜ TODO | 4h       |

#### Acceptance Criteria

- [ ] gold_nurturing_state cu 7 stări FSM
- [ ] gold_nurturing_actions pentru audit trail
- [ ] gold_churn_signals, gold_churn_factors, gold_sentiment_analysis create
- [ ] Toate FK și indexes verificate
- [ ] Drizzle migrations executate

---

### PR E5.S1.PR5: Database Referral, Cluster & Association Tables

**Branch:** `feature/e5-s1-pr5-db-referral-cluster`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.2.1

#### Tasks

| Task ID       | Legacy ID | Task # | Denumire                  | Status  | Estimare |
| ------------- | --------- | ------ | ------------------------- | ------- | -------- |
| E5.S1.PR5.001 | E5-DB-005 | 412    | Create Referral Tables    | ⬜ TODO | 4h       |
| E5.S1.PR5.002 | E5-DB-006 | 413    | Create Cluster Tables     | ⬜ TODO | 3h       |
| E5.S1.PR5.003 | E5-DB-007 | 414    | Create Association Tables | ⬜ TODO | 4h       |

#### Acceptance Criteria

- [ ] gold_referrals, gold_entity_relationships, gold_proximity_scores create
- [ ] gold_clusters, gold_cluster_members create
- [ ] gold_associations, gold_affiliations, gold_ouai_registry, gold_cooperatives create
- [ ] PostGIS GEOGRAPHY columns pe toate tabelele cu locații

---

### PR E5.S1.PR6: Database KOL, WinBack, Feedback & Indexes

**Branch:** `feature/e5-s1-pr6-db-kol-feedback`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.2.1

#### Tasks

| Task ID       | Legacy ID | Task # | Denumire                    | Status  | Estimare |
| ------------- | --------- | ------ | --------------------------- | ------- | -------- |
| E5.S1.PR6.001 | E5-DB-008 | 415    | Create KOL Tables           | ⬜ TODO | 2h       |
| E5.S1.PR6.002 | E5-DB-009 | 416    | Create Win-Back Tables      | ⬜ TODO | 2h       |
| E5.S1.PR6.003 | E5-DB-010 | 417    | Create Feedback Tables      | ⬜ TODO | 3h       |
| E5.S1.PR6.004 | E5-DB-011 | 418    | Create GiST Spatial Indexes | ⬜ TODO | 2h       |
| E5.S1.PR6.005 | E5-DB-012 | 419    | Seed Initial Data           | ⬜ TODO | 3h       |

#### Acceptance Criteria

- [ ] gold_kol_profiles create cu centrality metrics
- [ ] gold_winback_campaigns create
- [ ] gold_nps_surveys, gold_content_drips, gold_competitor_intel create
- [ ] GiST indexes pe toate tabelele cu GEOGRAPHY
- [ ] Seed data: content templates, NPS templates, association registry

---

## SPRINT 2: STATE MACHINE & CHURN (Săptămâna 3-4)

### 📅 Perioada: TBD

### 🎯 Obiective Sprint

- [ ] State Machine complet (ADR-0098)
- [ ] Churn Detection AI funcțional (ADR-0099)
- [ ] Sentiment Analysis cu LLM (ADR-0107)
- [ ] 14 workers (A1-A8, B9-B14) implementați

### 📊 Metrici Sprint

| Metrică              | Target | Actual |
| -------------------- | ------ | ------ |
| PR-uri planificate   | 6      | -      |
| Task-uri planificate | 16     | -      |
| Story Points         | 67     | -      |
| Test Coverage        | ≥80%   | -      |

---

### PR E5.S2.PR1: State Machine Core Workers

**Branch:** `feature/e5-s2-pr1-state-machine-core`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.3.1

#### Tasks

| Task ID       | Legacy ID | Task # | Denumire                             | Status  | Estimare |
| ------------- | --------- | ------ | ------------------------------------ | ------- | -------- |
| E5.S2.PR1.001 | E5-SM-001 | 420    | Worker A1: lifecycle:order:completed | ⬜ TODO | 4h       |
| E5.S2.PR1.002 | E5-SM-002 | 421    | Worker A2: lifecycle:state:evaluate  | ⬜ TODO | 5h       |

#### Acceptance Criteria

- [ ] Trigger la order DELIVERED pentru nurturing state init
- [ ] State evaluation cu reguli și AI scoring
- [ ] 7-state FSM complet implementat (ADR-0098)
- [ ] Audit trail pentru toate tranzițiile

---

### PR E5.S2.PR2: Onboarding & State Transition Workers

**Branch:** `feature/e5-s2-pr2-onboarding-state`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F5.3.1

#### Tasks

| Task ID       | Legacy ID | Task # | Denumire                            | Status  | Estimare |
| ------------- | --------- | ------ | ----------------------------------- | ------- | -------- |
| E5.S2.PR2.001 | E5-SM-003 | 422    | Workers A3-A5: Onboarding Sequence  | ⬜ TODO | 6h       |
| E5.S2.PR2.002 | E5-SM-004 | 423    | Worker A6: state:transition:execute | ⬜ TODO | 4h       |
| E5.S2.PR2.003 | E5-SM-005 | 424    | Worker A7: state:metrics:update     | ⬜ TODO | 3h       |
| E5.S2.PR2.004 | E5-SM-006 | 425    | Worker A8: state:advocate:promote   | ⬜ TODO | 2h       |

#### Acceptance Criteria

- [ ] Onboarding sequence cu multi-step workflow
- [ ] State transition cu side effects
- [ ] Metrics update periodic
- [ ] Advocate promotion logic

---

### PR E5.S2.PR3: Churn Signal Detection

**Branch:** `feature/e5-s2-pr3-churn-signals`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.4.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                          | Status  | Estimare |
| ------------- | ---------- | ------ | --------------------------------- | ------- | -------- |
| E5.S2.PR3.001 | E5-CHR-001 | 428    | Worker B9: churn:signal:detect    | ⬜ TODO | 5h       |
| E5.S2.PR3.002 | E5-CHR-002 | 429    | Worker B10: churn:score:calculate | ⬜ TODO | 5h       |
| E5.S2.PR3.003 | E5-CHR-003 | 430    | Worker B11: churn:risk:escalate   | ⬜ TODO | 3h       |

#### Acceptance Criteria

- [ ] 8 signal types detectate (COMMUNICATION_FADE, NEGATIVE_SENTIMENT, etc.)
- [ ] Weighted scoring formula (ADR-0099)
- [ ] HITL escalation pentru high-risk

---

### PR E5.S2.PR4: Sentiment Analysis Workers

**Branch:** `feature/e5-s2-pr4-sentiment`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.4.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                          | Status  | Estimare |
| ------------- | ---------- | ------ | --------------------------------- | ------- | -------- |
| E5.S2.PR4.001 | E5-CHR-004 | 431    | Worker B12: sentiment:analyze     | ⬜ TODO | 6h       |
| E5.S2.PR4.002 | E5-CHR-005 | 432    | Worker B13: sentiment:aggregate   | ⬜ TODO | 3h       |
| E5.S2.PR4.003 | E5-CHR-006 | 433    | Worker B14: decay:behavior:detect | ⬜ TODO | 4h       |

#### Acceptance Criteria

- [ ] LLM sentiment analysis cu Claude (ADR-0107)
- [ ] Aggregation per client
- [ ] Behavioral decay detection

---

### PR E5.S2.PR5: State Machine Tests

**Branch:** `feature/e5-s2-pr5-state-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 1 zi  
**Phase Mapping:** F5.3.1

#### Tasks

| Task ID       | Legacy ID | Task # | Denumire                        | Status  | Estimare |
| ------------- | --------- | ------ | ------------------------------- | ------- | -------- |
| E5.S2.PR5.001 | E5-SM-007 | 426    | State Machine Unit Tests        | ⬜ TODO | 4h       |
| E5.S2.PR5.002 | E5-SM-008 | 427    | State Machine Integration Tests | ⬜ TODO | 4h       |

#### Acceptance Criteria

- [ ] Unit tests pentru toate tranzițiile
- [ ] Integration tests pentru lifecycle complet
- [ ] Coverage ≥80%

---

### PR E5.S2.PR6: Churn Detection Tests

**Branch:** `feature/e5-s2-pr6-churn-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 1 zi  
**Phase Mapping:** F5.4.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                 | Status  | Estimare |
| ------------- | ---------- | ------ | ------------------------ | ------- | -------- |
| E5.S2.PR6.001 | E5-CHR-007 | 434    | Churn Detection Tests    | ⬜ TODO | 5h       |
| E5.S2.PR6.002 | E5-CHR-008 | 435    | Sentiment Analysis Tests | ⬜ TODO | 4h       |

#### Acceptance Criteria

- [ ] Unit tests pentru signal detection și scoring
- [ ] Tests pentru LLM integration
- [ ] Mock tests pentru API calls

---

## SPRINT 3: GEOSPATIAL & GRAPH (Săptămâna 5-6)

### 📅 Perioada: TBD

### 🎯 Obiective Sprint

- [ ] PostGIS KNN queries (ADR-0100)
- [ ] NetworkX/Leiden community detection (ADR-0101)
- [ ] KOL identification (ADR-0105)
- [ ] 10 workers (C15-C19, D20-D24) implementați

### 📊 Metrici Sprint

| Metrică              | Target | Actual |
| -------------------- | ------ | ------ |
| PR-uri planificate   | 6      | -      |
| Task-uri planificate | 16     | -      |
| Story Points         | 61     | -      |
| Test Coverage        | ≥80%   | -      |

---

### PR E5.S3.PR1: Geospatial Proximity Workers

**Branch:** `feature/e5-s3-pr1-geo-proximity`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.5.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                            | Status  | Estimare |
| ------------- | ---------- | ------ | ----------------------------------- | ------- | -------- |
| E5.S3.PR1.001 | E5-GEO-001 | 436    | Worker C15: geo:proximity:calculate | ⬜ TODO | 5h       |
| E5.S3.PR1.002 | E5-GEO-002 | 437    | Worker C16: geo:neighbor:identify   | ⬜ TODO | 4h       |

#### Acceptance Criteria

- [ ] KNN proximity cu PostGIS (ADR-0100)
- [ ] Neighbor identification pentru referral
- [ ] <100ms query time pe 10K records

---

### PR E5.S3.PR2: Geospatial Territory Workers

**Branch:** `feature/e5-s3-pr2-geo-territory`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.5.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                            | Status  | Estimare |
| ------------- | ---------- | ------ | ----------------------------------- | ------- | -------- |
| E5.S3.PR2.001 | E5-GEO-003 | 438    | Worker C17: geo:territory:calculate | ⬜ TODO | 4h       |
| E5.S3.PR2.002 | E5-GEO-004 | 439    | Worker C18: geo:coverage:analyze    | ⬜ TODO | 3h       |
| E5.S3.PR2.003 | E5-GEO-005 | 440    | Worker C19: geo:catchment:build     | ⬜ TODO | 3h       |

#### Acceptance Criteria

- [ ] Convex Hull pentru territory calculation
- [ ] Coverage analysis per county
- [ ] Catchment zone building

---

### PR E5.S3.PR3: PostGIS Optimization & API

**Branch:** `feature/e5-s3-pr3-postgis-api`  
**Reviewer:** @lead-dev  
**Estimare:** 1 zi  
**Phase Mapping:** F5.5.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                   | Status  | Estimare |
| ------------- | ---------- | ------ | -------------------------- | ------- | -------- |
| E5.S3.PR3.001 | E5-GEO-006 | 441    | PostGIS Query Optimization | ⬜ TODO | 3h       |
| E5.S3.PR3.002 | E5-GEO-007 | 442    | Geospatial Tests           | ⬜ TODO | 4h       |
| E5.S3.PR3.003 | E5-GEO-008 | 443    | GeoJSON API Endpoints      | ⬜ TODO | 3h       |

#### Acceptance Criteria

- [ ] Query optimization și indexes
- [ ] Tests pentru toate PostGIS queries
- [ ] GeoJSON export pentru map display

---

### PR E5.S3.PR4: Graph Build & Community Detection

**Branch:** `feature/e5-s3-pr4-graph-community`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F5.6.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                              | Status  | Estimare |
| ------------- | ---------- | ------ | ------------------------------------- | ------- | -------- |
| E5.S3.PR4.001 | E5-GRA-001 | 444    | Worker D20: graph:build:relationships | ⬜ TODO | 5h       |
| E5.S3.PR4.002 | E5-GRA-002 | 445    | Worker D21: community:detect:leiden   | ⬜ TODO | 6h       |

#### Acceptance Criteria

- [ ] Graph construction din toate relațiile
- [ ] Leiden algorithm cu cdlib (ADR-0101)
- [ ] Resolution parameter configurable

---

### PR E5.S3.PR5: Centrality & KOL Workers

**Branch:** `feature/e5-s3-pr5-centrality-kol`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.6.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                            | Status  | Estimare |
| ------------- | ---------- | ------ | ----------------------------------- | ------- | -------- |
| E5.S3.PR5.001 | E5-GRA-003 | 446    | Worker D22: centrality:calculate    | ⬜ TODO | 4h       |
| E5.S3.PR5.002 | E5-GRA-004 | 447    | Worker D23: kol:identify            | ⬜ TODO | 4h       |
| E5.S3.PR5.003 | E5-GRA-005 | 448    | Worker D24: cluster:implicit:detect | ⬜ TODO | 4h       |

#### Acceptance Criteria

- [ ] Degree, Betweenness, Eigenvector, PageRank (ADR-0105)
- [ ] KOL tier classification: ELITE, ESTABLISHED, EMERGING
- [ ] Implicit cluster detection

---

### PR E5.S3.PR6: Python Graph Service API & Tests

**Branch:** `feature/e5-s3-pr6-graph-api-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.6.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                 | Status  | Estimare |
| ------------- | ---------- | ------ | ------------------------ | ------- | -------- |
| E5.S3.PR6.001 | E5-GRA-006 | 449    | Python Graph Service API | ⬜ TODO | 6h       |
| E5.S3.PR6.002 | E5-GRA-007 | 450    | Graph Analysis Tests     | ⬜ TODO | 5h       |
| E5.S3.PR6.003 | E5-GRA-008 | 451    | Graph Visualization API  | ⬜ TODO | 3h       |

#### Acceptance Criteria

- [ ] FastAPI endpoints pentru graph operations
- [ ] Unit și integration tests
- [ ] Export format d3/vis.js

---

## SPRINT 4: REFERRAL & WIN-BACK (Săptămâna 7-8)

### 📅 Perioada: TBD

### 🎯 Obiective Sprint

- [ ] GDPR-compliant referral flow (ADR-0102)
- [ ] Win-Back campaign orchestration (ADR-0106)
- [ ] 12 workers (E25-E31, F32-F36) implementați

### 📊 Metrici Sprint

| Metrică              | Target | Actual |
| -------------------- | ------ | ------ |
| PR-uri planificate   | 6      | -      |
| Task-uri planificate | 18     | -      |
| Story Points         | 68     | -      |
| Test Coverage        | ≥80%   | -      |

---

### PR E5.S4.PR1: Referral Detection & Consent

**Branch:** `feature/e5-s4-pr1-referral-consent`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F5.7.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                             | Status  | Estimare |
| ------------- | ---------- | ------ | ------------------------------------ | ------- | -------- |
| E5.S4.PR1.001 | E5-REF-001 | 452    | Worker E25: referral:detect:mention  | ⬜ TODO | 5h       |
| E5.S4.PR1.002 | E5-REF-002 | 453    | Worker E26: referral:request:send    | ⬜ TODO | 4h       |
| E5.S4.PR1.003 | E5-REF-003 | 454    | Worker E27: referral:consent:process | ⬜ TODO | 4h       |

#### Acceptance Criteria

- [ ] LLM detection pentru referral mentions
- [ ] GDPR consent flow (ADR-0102)
- [ ] WhatsApp/Email interactive buttons

---

### PR E5.S4.PR2: Referral Outreach & Conversion

**Branch:** `feature/e5-s4-pr2-referral-outreach`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.7.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                                         | Status  | Estimare |
| ------------- | ---------- | ------ | ------------------------------------------------ | ------- | -------- |
| E5.S4.PR2.001 | E5-REF-004 | 455    | Worker E28: referral:outreach:execute            | ⬜ TODO | 4h       |
| E5.S4.PR2.002 | E5-REF-005 | 456    | Worker E29: referral:conversion:track            | ⬜ TODO | 3h       |
| E5.S4.PR2.003 | E5-REF-006 | 457    | Workers E30-E31: Reward Calculation & Processing | ⬜ TODO | 5h       |

#### Acceptance Criteria

- [ ] Outreach doar cu consent APPROVED
- [ ] Conversion tracking
- [ ] Reward calculation și processing

---

### PR E5.S4.PR3: Referral API & Tests

**Branch:** `feature/e5-s4-pr3-referral-api-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.7.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                           | Status  | Estimare |
| ------------- | ---------- | ------ | ---------------------------------- | ------- | -------- |
| E5.S4.PR3.001 | E5-REF-007 | 458    | Referral API Endpoints             | ⬜ TODO | 5h       |
| E5.S4.PR3.002 | E5-REF-008 | 459    | Referral Tests                     | ⬜ TODO | 5h       |
| E5.S4.PR3.003 | E5-REF-009 | 460    | Proximity-Based Referral Detection | ⬜ TODO | 4h       |
| E5.S4.PR3.004 | E5-REF-010 | 461    | Referral GDPR Compliance Review    | ⬜ TODO | 3h       |

#### Acceptance Criteria

- [ ] REST API complet pentru referrals
- [ ] Unit și integration tests
- [ ] Proximity integration cu geospatial
- [ ] GDPR compliance audit

---

### PR E5.S4.PR4: Win-Back Campaign Workers

**Branch:** `feature/e5-s4-pr4-winback-workers`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.8.1

#### Tasks

| Task ID       | Legacy ID | Task # | Denumire                             | Status  | Estimare |
| ------------- | --------- | ------ | ------------------------------------ | ------- | -------- |
| E5.S4.PR4.001 | E5-WB-001 | 462    | Worker F32: winback:campaign:create  | ⬜ TODO | 5h       |
| E5.S4.PR4.002 | E5-WB-002 | 463    | Worker F33: winback:step:execute     | ⬜ TODO | 5h       |
| E5.S4.PR4.003 | E5-WB-003 | 464    | Worker F34: winback:response:process | ⬜ TODO | 3h       |

#### Acceptance Criteria

- [ ] Campaign creation cu strategy selection (ADR-0106)
- [ ] Multi-step execution
- [ ] Response processing

---

### PR E5.S4.PR5: Win-Back Conversion & API

**Branch:** `feature/e5-s4-pr5-winback-api`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.8.1

#### Tasks

| Task ID       | Legacy ID | Task # | Denumire                                   | Status  | Estimare |
| ------------- | --------- | ------ | ------------------------------------------ | ------- | -------- |
| E5.S4.PR5.001 | E5-WB-004 | 465    | Workers F35-F36: Conversion & Reactivation | ⬜ TODO | 4h       |
| E5.S4.PR5.002 | E5-WB-005 | 466    | Win-Back API Endpoints                     | ⬜ TODO | 4h       |
| E5.S4.PR5.003 | E5-WB-006 | 467    | Win-Back Templates                         | ⬜ TODO | 3h       |

#### Acceptance Criteria

- [ ] Conversion tracking și reactivation
- [ ] REST API pentru campaigns
- [ ] Email/WhatsApp templates

---

### PR E5.S4.PR6: Win-Back Tests & Analytics

**Branch:** `feature/e5-s4-pr6-winback-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 1 zi  
**Phase Mapping:** F5.8.1

#### Tasks

| Task ID       | Legacy ID | Task # | Denumire                     | Status  | Estimare |
| ------------- | --------- | ------ | ---------------------------- | ------- | -------- |
| E5.S4.PR6.001 | E5-WB-007 | 468    | Win-Back Tests               | ⬜ TODO | 4h       |
| E5.S4.PR6.002 | E5-WB-008 | 469    | Win-Back Analytics Dashboard | ⬜ TODO | 3h       |

#### Acceptance Criteria

- [ ] Unit și integration tests
- [ ] ROI și conversion metrics

---

## SPRINT 5: ASSOCIATIONS & FEEDBACK (Săptămâna 9-10)

### 📅 Perioada: TBD

### 🎯 Obiective Sprint

- [ ] Association data ingestion (ADR-0104)
- [ ] Feedback & Zero-Party Data
- [ ] Competition Law compliance (ADR-0103)
- [ ] 15 workers (G37-G42, H43-H47, I48-I51, J52-J55, K56-K58) implementați

### 📊 Metrici Sprint

| Metrică              | Target | Actual |
| -------------------- | ------ | ------ |
| PR-uri planificate   | 6      | -      |
| Task-uri planificate | 18     | -      |
| Story Points         | 68     | -      |
| Test Coverage        | ≥80%   | -      |

---

### PR E5.S5.PR1: Association Scraping Workers

**Branch:** `feature/e5-s5-pr1-association-scraping`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F5.9.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                                        | Status  | Estimare |
| ------------- | ---------- | ------ | ----------------------------------------------- | ------- | -------- |
| E5.S5.PR1.001 | E5-ASS-001 | 470    | Worker G37: ingest:ouai:scrape                  | ⬜ TODO | 5h       |
| E5.S5.PR1.002 | E5-ASS-002 | 471    | Worker G38: ingest:ouai:parse                   | ⬜ TODO | 4h       |
| E5.S5.PR1.003 | E5-ASS-003 | 472    | Workers G39-G40: Cooperative Scraping & Parsing | ⬜ TODO | 6h       |

#### Acceptance Criteria

- [ ] PDF scraping cu tabula-py (ADR-0104)
- [ ] OUAI data parsing și normalization
- [ ] Cooperative registry parsing

---

### PR E5.S5.PR2: Association Sync & API

**Branch:** `feature/e5-s5-pr2-association-api`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.9.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                             | Status  | Estimare |
| ------------- | ---------- | ------ | ------------------------------------ | ------- | -------- |
| E5.S5.PR2.001 | E5-ASS-004 | 473    | Worker G41: ingest:madr:sync         | ⬜ TODO | 4h       |
| E5.S5.PR2.002 | E5-ASS-005 | 474    | Worker G42: ingest:affiliation:match | ⬜ TODO | 5h       |
| E5.S5.PR2.003 | E5-ASS-006 | 475    | Association API Endpoints            | ⬜ TODO | 4h       |
| E5.S5.PR2.004 | E5-ASS-007 | 476    | Association Tests                    | ⬜ TODO | 4h       |

#### Acceptance Criteria

- [ ] MADR sync periodic
- [ ] Affiliation matching
- [ ] REST API pentru associations

---

### PR E5.S5.PR3: Association Quality Dashboard

**Branch:** `feature/e5-s5-pr3-association-quality`  
**Reviewer:** @lead-dev  
**Estimare:** 1 zi  
**Phase Mapping:** F5.9.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                    | Status  | Estimare |
| ------------- | ---------- | ------ | --------------------------- | ------- | -------- |
| E5.S5.PR3.001 | E5-ASS-008 | 477    | OUAI Data Quality Dashboard | ⬜ TODO | 3h       |

#### Acceptance Criteria

- [ ] Data quality monitoring
- [ ] Error tracking pentru PDF parsing

---

### PR E5.S5.PR4: Feedback & NPS Workers

**Branch:** `feature/e5-s5-pr4-feedback-nps`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.10.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                                        | Status  | Estimare |
| ------------- | ---------- | ------ | ----------------------------------------------- | ------- | -------- |
| E5.S5.PR4.001 | E5-FBK-001 | 478    | Workers H43-H44: NPS Send & Process             | ⬜ TODO | 5h       |
| E5.S5.PR4.002 | E5-FBK-002 | 479    | Workers H45-H47: Entity & Competitor Extraction | ⬜ TODO | 5h       |
| E5.S5.PR4.003 | E5-FBK-003 | 483    | Feedback API Endpoints                          | ⬜ TODO | 3h       |

#### Acceptance Criteria

- [ ] NPS survey workflow
- [ ] Entity extraction din conversații
- [ ] Competitor intel (compliant - ADR-0103)

---

### PR E5.S5.PR5: Content, Alerts & Compliance Workers

**Branch:** `feature/e5-s5-pr5-content-alerts`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.10.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                                   | Status  | Estimare |
| ------------- | ---------- | ------ | ------------------------------------------ | ------- | -------- |
| E5.S5.PR5.001 | E5-CNT-001 | 480    | Workers I48-I51: Content Drip System       | ⬜ TODO | 6h       |
| E5.S5.PR5.002 | E5-ALR-001 | 481    | Workers J52-J55: Weather & Seasonal Alerts | ⬜ TODO | 5h       |
| E5.S5.PR5.003 | E5-CMP-001 | 482    | Workers K56-K58: Compliance & Audit        | ⬜ TODO | 5h       |

#### Acceptance Criteria

- [ ] Content drip scheduling
- [ ] Weather alerts cu ANM
- [ ] GDPR consent verification

---

### PR E5.S5.PR6: Feedback Tests & Compliance Review

**Branch:** `feature/e5-s5-pr6-feedback-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.10.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                               | Status  | Estimare |
| ------------- | ---------- | ------ | -------------------------------------- | ------- | -------- |
| E5.S5.PR6.001 | E5-CNT-002 | 484    | Content Templates Library              | ⬜ TODO | 4h       |
| E5.S5.PR6.002 | E5-FBK-004 | 485    | Competitor Intel Dashboard (compliant) | ⬜ TODO | 3h       |
| E5.S5.PR6.003 | E5-CMP-002 | 486    | Competition Law Review                 | ⬜ TODO | 2h       |
| E5.S5.PR6.004 | E5-FBK-005 | 487    | Feedback System Tests                  | ⬜ TODO | 4h       |

#### Acceptance Criteria

- [ ] Content templates library
- [ ] Competition law audit
- [ ] Integration tests

---

## SPRINT 6: UI IMPLEMENTATION (Săptămâna 11-12)

### 📅 Perioada: TBD

### 🎯 Obiective Sprint

- [ ] 8 pagini UI implementate
- [ ] Map integration cu PostGIS
- [ ] HITL queue integration pentru E5
- [ ] Toate componentele reutilizabile

### 📊 Metrici Sprint

| Metrică              | Target | Actual |
| -------------------- | ------ | ------ |
| PR-uri planificate   | 6      | -      |
| Task-uri planificate | 8      | -      |
| Story Points         | 41     | -      |
| Test Coverage        | ≥80%   | -      |

---

### PR E5.S6.PR1: Nurturing Dashboard

**Branch:** `feature/e5-s6-pr1-nurturing-dashboard`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.11.1

#### Tasks

| Task ID       | Legacy ID | Task # | Denumire                 | Status  | Estimare |
| ------------- | --------- | ------ | ------------------------ | ------- | -------- |
| E5.S6.PR1.001 | E5-UI-001 | 488    | Nurturing Dashboard Page | ⬜ TODO | 6h       |

#### Acceptance Criteria

- [ ] KPIs și charts
- [ ] State distribution visualization
- [ ] Churn trend chart

---

### PR E5.S6.PR2: Client Detail & Churn Pages

**Branch:** `feature/e5-s6-pr2-client-churn`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.11.1

#### Tasks

| Task ID       | Legacy ID | Task # | Denumire                     | Status  | Estimare |
| ------------- | --------- | ------ | ---------------------------- | ------- | -------- |
| E5.S6.PR2.001 | E5-UI-002 | 489    | Client Nurturing Detail Page | ⬜ TODO | 6h       |
| E5.S6.PR2.002 | E5-UI-003 | 490    | Churn Risk Dashboard         | ⬜ TODO | 5h       |

#### Acceptance Criteria

- [ ] Lifecycle timeline
- [ ] Churn risk management
- [ ] Action buttons pentru interventions

---

### PR E5.S6.PR3: Referral Management Page

**Branch:** `feature/e5-s6-pr3-referral-page`  
**Reviewer:** @lead-dev  
**Estimare:** 1 zi  
**Phase Mapping:** F5.11.1

#### Tasks

| Task ID       | Legacy ID | Task # | Denumire                 | Status  | Estimare |
| ------------- | --------- | ------ | ------------------------ | ------- | -------- |
| E5.S6.PR3.001 | E5-UI-004 | 491    | Referral Management Page | ⬜ TODO | 5h       |

#### Acceptance Criteria

- [ ] Referral listing și filtering
- [ ] Consent status tracking
- [ ] Conversion metrics

---

### PR E5.S6.PR4: Clusters Map Page

**Branch:** `feature/e5-s6-pr4-clusters-map`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.11.1

#### Tasks

| Task ID       | Legacy ID | Task # | Denumire            | Status  | Estimare |
| ------------- | --------- | ------ | ------------------- | ------- | -------- |
| E5.S6.PR4.001 | E5-UI-005 | 492    | Clusters & Map Page | ⬜ TODO | 6h       |

#### Acceptance Criteria

- [ ] PostGIS map integration
- [ ] Cluster visualization
- [ ] Territory overlay

---

### PR E5.S6.PR5: KOL & Win-Back Pages

**Branch:** `feature/e5-s6-pr5-kol-winback`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.11.1

#### Tasks

| Task ID       | Legacy ID | Task # | Denumire                | Status  | Estimare |
| ------------- | --------- | ------ | ----------------------- | ------- | -------- |
| E5.S6.PR5.001 | E5-UI-006 | 493    | KOL Management Page     | ⬜ TODO | 4h       |
| E5.S6.PR5.002 | E5-UI-007 | 494    | Win-Back Campaigns Page | ⬜ TODO | 5h       |

#### Acceptance Criteria

- [ ] KOL dashboard cu tier classification
- [ ] Campaign management
- [ ] ROI metrics

---

### PR E5.S6.PR6: HITL Integration

**Branch:** `feature/e5-s6-pr6-hitl-integration`  
**Reviewer:** @lead-dev  
**Estimare:** 1 zi  
**Phase Mapping:** F5.11.1

#### Tasks

| Task ID       | Legacy ID | Task # | Denumire                              | Status  | Estimare |
| ------------- | --------- | ------ | ------------------------------------- | ------- | -------- |
| E5.S6.PR6.001 | E5-UI-008 | 495    | HITL Queue Integration pentru Etapa 5 | ⬜ TODO | 4h       |

#### Acceptance Criteria

- [ ] E5 task types în HITL dashboard
- [ ] pipelineStage=E5 filter
- [ ] Approval workflow

---

## SPRINT 7: TESTING & DEPLOYMENT (Săptămâna 13-14)

### 📅 Perioada: TBD

### 🎯 Obiective Sprint

- [ ] E2E tests pentru toate flows
- [ ] Security audit complet
- [ ] Production deployment cu rollback plan
- [ ] Monitoring și alerting operational

### 📊 Metrici Sprint

| Metrică              | Target | Actual |
| -------------------- | ------ | ------ |
| PR-uri planificate   | 6      | -      |
| Task-uri planificate | 3      | -      |
| Story Points         | 22     | -      |
| Test Coverage        | ≥85%   | -      |

---

### PR E5.S7.PR1: E2E Tests

**Branch:** `feature/e5-s7-pr1-e2e-tests`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F5.12.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire          | Status  | Estimare |
| ------------- | ---------- | ------ | ----------------- | ------- | -------- |
| E5.S7.PR1.001 | E5-TST-001 | 496    | E2E Tests Etapa 5 | ⬜ TODO | 8h       |

#### Acceptance Criteria

- [ ] E2E pentru nurturing flow
- [ ] E2E pentru referral flow
- [ ] E2E pentru churn detection
- [ ] All tests passing

---

### PR E5.S7.PR2: Security Audit

**Branch:** `feature/e5-s7-pr2-security-audit`  
**Reviewer:** @security-lead  
**Estimare:** 2 zile  
**Phase Mapping:** F5.12.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire               | Status  | Estimare |
| ------------- | ---------- | ------ | ---------------------- | ------- | -------- |
| E5.S7.PR2.001 | E5-TST-002 | 497    | Security Audit Etapa 5 | ⬜ TODO | 6h       |

#### Acceptance Criteria

- [ ] Security review pentru toate endpoints
- [ ] GDPR compliance verification
- [ ] Rate limiting verification
- [ ] No critical vulnerabilities

---

### PR E5.S7.PR3: Production Deployment

**Branch:** `feature/e5-s7-pr3-production-deploy`  
**Reviewer:** @lead-dev, @devops  
**Estimare:** 2 zile  
**Phase Mapping:** F5.12.1

#### Tasks

| Task ID       | Legacy ID  | Task # | Denumire                     | Status  | Estimare |
| ------------- | ---------- | ------ | ---------------------------- | ------- | -------- |
| E5.S7.PR3.001 | E5-DEP-001 | 498    | Deploy Etapa 5 to Production | ⬜ TODO | 8h       |

#### Acceptance Criteria

- [ ] Migrations executate successfully
- [ ] Health checks passing
- [ ] Monitoring dashboards operational
- [ ] Rollback tested și documentat

---

### PR E5.S7.PR4: Post-Deployment Monitoring

**Branch:** `feature/e5-s7-pr4-monitoring`  
**Reviewer:** @devops  
**Estimare:** 1 zi  
**Phase Mapping:** F5.12.1

#### Acceptance Criteria

- [ ] Grafana dashboards pentru E5
- [ ] Alert rules configurate
- [ ] Runbook verificat

---

### PR E5.S7.PR5: Documentation Update

**Branch:** `feature/e5-s7-pr5-documentation`  
**Reviewer:** @lead-dev  
**Estimare:** 1 zi  
**Phase Mapping:** F5.12.1

#### Acceptance Criteria

- [ ] README-uri actualizate
- [ ] API documentation completă
- [ ] Runbook finalizat

---

### PR E5.S7.PR6: Release Notes

**Branch:** `feature/e5-s7-pr6-release`  
**Reviewer:** @lead-dev  
**Estimare:** 0.5 zile  
**Phase Mapping:** F5.12.1

#### Acceptance Criteria

- [ ] CHANGELOG actualizat
- [ ] Release notes publicate
- [ ] Version tag creat

---

## REZUMAT SPRINT-URI

### Distribuție Taskuri pe Sprinturi

| Sprint    | Focus                 | PR-uri | Taskuri | Ore Est. | Zile         |
| --------- | --------------------- | ------ | ------- | -------- | ------------ |
| S1        | Foundation            | 6      | 20      | 63       | 8            |
| S2        | State/Churn           | 6      | 16      | 67       | 9            |
| S3        | Geo/Graph             | 6      | 16      | 61       | 8            |
| S4        | Referral/WinBack      | 6      | 18      | 68       | 9            |
| S5        | Associations/Feedback | 6      | 18      | 68       | 9            |
| S6        | UI                    | 6      | 8       | 41       | 6            |
| S7        | Testing/Deploy        | 6      | 3       | 22       | 4            |
| **TOTAL** |                       | **42** | **99**  | **390**  | **~53 zile** |

### Critical Path

```
S1 (Foundation)
    │
    ├─→ S2 (State Machine, Churn) ─→ S4 (Win-Back)
    │
    └─→ S3 (Geospatial, Graph) ─→ S4 (Referral)
                                      │
S5 (Associations, Feedback) ──────────┘
    │
    └─→ S6 (UI) ─→ S7 (Deploy)
```

---

## RISK REGISTER

| Risk                      | Impact | Probability | Mitigation                              |
| ------------------------- | ------ | ----------- | --------------------------------------- |
| PostGIS query performance | High   | Medium      | Early optimization în S3                |
| Graph analysis memory     | High   | Medium      | Batch processing, Python free-threading |
| GDPR compliance gaps      | High   | Low         | Legal review în S4                      |
| LLM API costs             | Medium | Medium      | Cost tracking, rate limiting            |
| PDF parsing accuracy      | Medium | High        | Fallback manual ingestion               |

---

## APPROVAL

| Rol           | Nume | Data | Signature |
| ------------- | ---- | ---- | --------- |
| Product Owner | -    | -    | ⬜        |
| Tech Lead     | -    | -    | ⬜        |
| DevOps        | -    | -    | ⬜        |

---

**Document generat**: 2 Februarie 2026  
**Status**: APPROVED ✅
