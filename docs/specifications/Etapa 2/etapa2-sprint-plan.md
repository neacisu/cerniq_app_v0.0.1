# CERNIQ.APP — ETAPA 2: SPRINT PLAN

## Cold Outreach Multi-Canal — Plan Execuție

### Versiunea 1.0 | 2 Februarie 2026

---

## METADATA DOCUMENT

| Câmp | Valoare |
| --- | --- |
| **Etapă** | E2 - Cold Outreach Multi-Canal |
| **Versiune** | 1.0 |
| **Data creării** | 2 Februarie 2026 |
| **Autor** | Cerniq Development Team |
| **Status** | APPROVED - Ready for Execution |
| **Prerequisite** | Etapa 1 completă (Gold layer populat) |
| **Durată totală** | 8 săptămâni (4 sprinturi × 2 săptămâni) |
| **Total Sprinturi** | 4 |
| **Total PR-uri** | 32 |
| **Total Task-uri** | 118 |
| **Conformitate** | Master Spec v1.2 |

---

## CONVENȚIE NUMEROTARE TASK-URI

### Schema Standardizată: `E{etapa}.S{sprint}.PR{pr}.{task}`

```
E2.S1.PR1.001
│  │  │   │
│  │  │   └── Task secvențial (001-999)
│  │  └────── PR în sprint (1-99)
│  └───────── Sprint (1-4)
└──────────── Etapa (2)
```

### Exemple

| Task ID | Descriere |
| --- | --- |
| `E2.S1.PR1.001` | Etapa 2, Sprint 1, PR 1, Task 1 |
| `E2.S2.PR3.005` | Etapa 2, Sprint 2, PR 3, Task 5 |
| `E2.S4.PR8.012` | Etapa 2, Sprint 4, PR 8, Task 12 |

---

## MAPARE FAZE → SPRINTURI

### Schema de Conversie Phase (F2.x) → Sprint (E2.Sx)

| Fază | Sprint | Focus | Descriere |
| --- | --- | --- | --- |
| F2.1 | **E2.S1** | Database | Database schema outreach (8 tasks) |
| F2.2 | **E2.S1** | Integration | TimelinesAI integration (6 tasks) |
| F2.3 | **E2.S1** | Integration | Instantly.ai integration (5 tasks) |
| F2.4 | **E2.S1** | Integration | Resend integration (4 tasks) |
| F2.5 | **E2.S2** | Workers | Quota Guardian system (6 tasks) |
| F2.6 | **E2.S2** | Workers | Orchestration workers (6 tasks) |
| F2.7 | **E2.S2** | Workers | WhatsApp workers (8 tasks) |
| F2.8 | **E2.S2** | Workers | Email workers (6 tasks) |
| F2.9 | **E2.S3** | Webhooks | Webhook handlers (6 tasks) |
| F2.10 | **E2.S3** | Sequences | Sequence management (5 tasks) |
| F2.11 | **E2.S3** | FSM | Lead state machine (4 tasks) |
| F2.12 | **E2.S3** | AI | AI sentiment analysis (5 tasks) |
| F2.13 | **E2.S3** | HITL | Human review system (6 tasks) |
| F2.14 | **E2.S3** | Monitoring | Monitoring & alerts (5 tasks) |
| F2.15 | **E2.S4** | Frontend | Frontend dashboard (8 tasks) |
| F2.16 | **E2.S4** | Frontend | Frontend lead management (7 tasks) |
| F2.17 | **E2.S4** | Frontend | Frontend review queue (5 tasks) |
| F2.18 | **E2.S4** | API | API endpoints (8 tasks) |
| F2.19 | **E2.S4** | Testing | Testing (6 tasks) |
| F2.20 | **E2.S4** | Docs | Documentation (4 tasks) |

### Task ID Conversion Formula

```
Phase ID: F2.{phase}.{subphase}.T{xxx}
Sprint ID: E2.S{sprint}.PR{pr}.{xxx}

Conversion:
F2.1.1.T001 → E2.S1.PR1.001
F2.5.1.T001 → E2.S2.PR1.001
F2.9.1.T001 → E2.S3.PR1.001
F2.15.1.T001 → E2.S4.PR1.001
```

---

## SPRINT 1: FOUNDATION (Săptămâna 1-2)

### 📅 Perioada: 3-14 Februarie 2026

### 🎯 Obiective Sprint

- [ ] Database schema Etapa 2 complet (11 tabele)
- [ ] TimelinesAI client + webhook integration
- [ ] Instantly.ai client + webhook integration
- [ ] Resend client + webhook integration
- [ ] Enum types și migrations

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 8 | - |
| Task-uri planificate | 23 | - |
| Story Points | 40 | - |
| Test Coverage | ≥80% | - |

---

### PR E2.S1.PR1: Outreach Enum Types & Base Schema

**Branch:** `feature/e2-s1-pr1-outreach-enums`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F2.1.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S1.PR1.001 | F2.1.1.T001 | Creare enum types pentru Etapa 2 Outreach | ⬜ TODO | 4h |
| E2.S1.PR1.002 | F2.1.1.T002 | Creare tabel `gold_lead_journey` pentru state machine | ⬜ TODO | 6h |
| E2.S1.PR1.003 | F2.1.1.T003 | Creare tabel `gold_communication_log` pentru audit trail | ⬜ TODO | 4h |

#### Acceptance Criteria

- [ ] Toate 7 enum types create și migrate
- [ ] `gold_lead_journey` cu toate coloanele și index-urile
- [ ] `gold_communication_log` cu partitioning-ready comments
- [ ] pnpm drizzle-kit generate rulează cu succes
- [ ] Unit tests pentru schema validations

#### Definition of Done

- [ ] Code review approved
- [ ] Unit tests passing (≥80% coverage)
- [ ] Migration testată în staging
- [ ] Documentație actualizată

---

### PR E2.S1.PR2: WhatsApp Phone Management Schema

**Branch:** `feature/e2-s1-pr2-wa-phone-schema`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F2.1.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S1.PR2.001 | F2.1.1.T004 | Creare tabel `wa_phone_numbers` (20 telefoane) | ⬜ TODO | 3h |
| E2.S1.PR2.002 | F2.1.1.T005 | Creare tabel `wa_quota_usage` pentru tracking zilnic | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] `wa_phone_numbers` cu daily_quota_limit default 200
- [ ] `wa_quota_usage` cu UNIQUE (phone_id, usage_date)
- [ ] Toate index-urile pentru performance
- [ ] Seed data pentru 20 telefoane

---

### PR E2.S1.PR3: Sequence & Template Schema

**Branch:** `feature/e2-s1-pr3-sequence-template-schema`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F2.1.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S1.PR3.001 | F2.1.1.T006 | Creare tabele `outreach_sequences` și `sequence_steps` | ⬜ TODO | 4h |
| E2.S1.PR3.002 | F2.1.1.T007 | Creare tabel `outreach_templates` cu spintax support | ⬜ TODO | 3h |
| E2.S1.PR3.003 | F2.1.1.T008 | Creare tabele `human_review_queue` și `outreach_daily_stats` | ⬜ TODO | 3h |

#### Acceptance Criteria

- [ ] Sequence management cu enrollment tracking
- [ ] Template versioning pentru A/B testing
- [ ] Review queue cu SLA fields
- [ ] Daily stats aggregation ready

---

### PR E2.S1.PR4: TimelinesAI Integration

**Branch:** `feature/e2-s1-pr4-timelinesai`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F2.2.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S1.PR4.001 | F2.2.1.T001 | Creare TimelinesAI API client cu rate limiting | ⬜ TODO | 4h |
| E2.S1.PR4.002 | F2.2.1.T002 | Implementare sendMessage, getChatHistory | ⬜ TODO | 4h |
| E2.S1.PR4.003 | F2.2.1.T003 | Setup TimelinesAI webhook endpoint | ⬜ TODO | 4h |
| E2.S1.PR4.004 | F2.2.1.T004 | Implementare webhook signature verification | ⬜ TODO | 2h |
| E2.S1.PR4.005 | F2.2.1.T005 | Creare webhook normalizer (ADR-0061) | ⬜ TODO | 3h |
| E2.S1.PR4.006 | F2.2.1.T006 | Integration tests cu mock server | ⬜ TODO | 3h |

#### Acceptance Criteria

- [ ] Client funcțional cu rate limiting 50 req/min
- [ ] Webhook handler cu signature verification
- [ ] Event normalization conform ADR-0061
- [ ] Integration tests cu >80% coverage

---

### PR E2.S1.PR5: Instantly.ai Integration

**Branch:** `feature/e2-s1-pr5-instantly`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F2.3.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S1.PR5.001 | F2.3.1.T001 | Creare Instantly.ai API client | ⬜ TODO | 3h |
| E2.S1.PR5.002 | F2.3.1.T002 | Implementare sendEmail, getCampaigns | ⬜ TODO | 3h |
| E2.S1.PR5.003 | F2.3.1.T003 | Setup Instantly webhook handler | ⬜ TODO | 3h |
| E2.S1.PR5.004 | F2.3.1.T004 | Bounce rate circuit breaker (ADR-0066) | ⬜ TODO | 4h |
| E2.S1.PR5.005 | F2.3.1.T005 | Integration tests | ⬜ TODO | 3h |

#### Acceptance Criteria

- [ ] Cold email separation per ADR-0059
- [ ] Circuit breaker pentru 3% bounce threshold
- [ ] Webhook handling pentru tracking events
- [ ] Integration tests

---

### PR E2.S1.PR6: Resend Integration

**Branch:** `feature/e2-s1-pr6-resend`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F2.4.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S1.PR6.001 | F2.4.1.T001 | Creare Resend API client | ⬜ TODO | 2h |
| E2.S1.PR6.002 | F2.4.1.T002 | Implementare sendEmail pentru warm leads | ⬜ TODO | 2h |
| E2.S1.PR6.003 | F2.4.1.T003 | Setup Resend webhook handler (Svix) | ⬜ TODO | 3h |
| E2.S1.PR6.004 | F2.4.1.T004 | Integration tests | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Warm email only (replied leads)
- [ ] Svix signature verification
- [ ] Webhook handling
- [ ] Integration tests

---

## SPRINT 2: WORKERS (Săptămâna 3-4)

### 📅 Perioada: 17-28 Februarie 2026

### 🎯 Obiective Sprint

- [ ] Quota Guardian system complet
- [ ] Orchestration workers funcționali
- [ ] WhatsApp workers cu 20 queue-uri
- [ ] Email workers (cold + warm)

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 8 | - |
| Task-uri planificate | 26 | - |
| Story Points | 50 | - |
| Test Coverage | ≥80% | - |

---

### PR E2.S2.PR1: Quota Guardian Lua Scripts

**Branch:** `feature/e2-s2-pr1-quota-guardian-lua`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F2.5.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S2.PR1.001 | F2.5.1.T001 | Implementare Redis Lua script pentru atomic quota check | ⬜ TODO | 6h |
| E2.S2.PR1.002 | F2.5.1.T002 | Implementare Quota Guardian Check Worker | ⬜ TODO | 4h |
| E2.S2.PR1.003 | F2.5.1.T003 | Implementare Quota Daily Reset Worker | ⬜ TODO | 3h |

#### Acceptance Criteria

- [ ] Lua script atomic pentru quota check
- [ ] Business hours validation (09:00-18:00)
- [ ] Follow-up cost=0 always allowed
- [ ] Concurrency 100 pentru check worker

---

### PR E2.S2.PR2: Quota Persistence Workers

**Branch:** `feature/e2-s2-pr2-quota-persistence`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F2.5.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S2.PR2.001 | F2.5.1.T004 | Quota Persist Worker (Redis → PostgreSQL) | ⬜ TODO | 3h |
| E2.S2.PR2.002 | F2.5.1.T005 | Quota Sync Worker | ⬜ TODO | 3h |
| E2.S2.PR2.003 | F2.5.1.T006 | Quota Monitoring Dashboard Data | ⬜ TODO | 2h |

---

### PR E2.S2.PR3: Orchestration Dispatch Worker

**Branch:** `feature/e2-s2-pr3-orchestration-dispatch`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F2.6.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S2.PR3.001 | F2.6.1.T001 | Outreach Dispatcher Worker | ⬜ TODO | 6h |
| E2.S2.PR3.002 | F2.6.1.T002 | Phone Assigner Worker (STICKY - ADR-0055) | ⬜ TODO | 4h |
| E2.S2.PR3.003 | F2.6.1.T003 | Channel Router Worker | ⬜ TODO | 3h |

---

### PR E2.S2.PR4: Orchestration Retry & Scheduling

**Branch:** `feature/e2-s2-pr4-orchestration-retry`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F2.6.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S2.PR4.001 | F2.6.1.T004 | Retry Orchestrator Worker | ⬜ TODO | 3h |
| E2.S2.PR4.002 | F2.6.1.T005 | Scheduling Worker (business hours) | ⬜ TODO | 3h |
| E2.S2.PR4.003 | F2.6.1.T006 | Priority Queue Manager | ⬜ TODO | 2h |

---

### PR E2.S2.PR5: WhatsApp Sender Workers

**Branch:** `feature/e2-s2-pr5-wa-sender`  
**Reviewer:** @lead-dev  
**Estimare:** 4 zile  
**Phase Mapping:** F2.7.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S2.PR5.001 | F2.7.1.T001 | WA Sender Worker Factory (20 queues) | ⬜ TODO | 6h |
| E2.S2.PR5.002 | F2.7.1.T002 | WA Jitter Worker (ADR-0057) | ⬜ TODO | 3h |
| E2.S2.PR5.003 | F2.7.1.T003 | WA Delivery Status Worker | ⬜ TODO | 3h |
| E2.S2.PR5.004 | F2.7.1.T004 | WA Read Receipt Worker | ⬜ TODO | 2h |

---

### PR E2.S2.PR6: WhatsApp Health Workers

**Branch:** `feature/e2-s2-pr6-wa-health`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F2.7.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S2.PR6.001 | F2.7.1.T005 | Phone Health Monitor Worker | ⬜ TODO | 4h |
| E2.S2.PR6.002 | F2.7.1.T006 | Phone Status Sync Worker | ⬜ TODO | 3h |
| E2.S2.PR6.003 | F2.7.1.T007 | Phone Quarantine Worker | ⬜ TODO | 3h |
| E2.S2.PR6.004 | F2.7.1.T008 | Phone Reputation Calculator | ⬜ TODO | 2h |

---

### PR E2.S2.PR7: Email Cold Workers

**Branch:** `feature/e2-s2-pr7-email-cold`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F2.8.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S2.PR7.001 | F2.8.1.T001 | Email Cold Sender Worker | ⬜ TODO | 4h |
| E2.S2.PR7.002 | F2.8.1.T002 | Email Tracking Worker | ⬜ TODO | 3h |
| E2.S2.PR7.003 | F2.8.1.T003 | Bounce Rate Monitor Worker | ⬜ TODO | 3h |

---

### PR E2.S2.PR8: Email Warm Workers

**Branch:** `feature/e2-s2-pr8-email-warm`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F2.8.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S2.PR8.001 | F2.8.1.T004 | Email Warm Sender Worker | ⬜ TODO | 3h |
| E2.S2.PR8.002 | F2.8.1.T005 | Email Reply Processor Worker | ⬜ TODO | 3h |
| E2.S2.PR8.003 | F2.8.1.T006 | Email Tracking Warm Worker | ⬜ TODO | 2h |

---

## SPRINT 3: INTELLIGENCE (Săptămâna 5-6)

### 📅 Perioada: 3-14 Martie 2026

### 🎯 Obiective Sprint

- [ ] Webhook processing pipeline complet
- [ ] Sequence management funcțional
- [ ] Lead state machine (FSM) operațional
- [ ] AI sentiment analysis integrat
- [ ] Human review system funcțional
- [ ] Monitoring & alerts setup

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 8 | - |
| Task-uri planificate | 31 | - |
| Story Points | 55 | - |
| Test Coverage | ≥80% | - |

---

### PR E2.S3.PR1: Webhook Processing Pipeline

**Branch:** `feature/e2-s3-pr1-webhook-pipeline`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F2.9.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S3.PR1.001 | F2.9.1.T001 | Webhook Normalizer Worker (ADR-0061) | ⬜ TODO | 4h |
| E2.S3.PR1.002 | F2.9.1.T002 | TimelinesAI Event Processor | ⬜ TODO | 3h |
| E2.S3.PR1.003 | F2.9.1.T003 | Instantly Event Processor | ⬜ TODO | 3h |
| E2.S3.PR1.004 | F2.9.1.T004 | Resend Event Processor | ⬜ TODO | 2h |
| E2.S3.PR1.005 | F2.9.1.T005 | Event Deduplication Worker | ⬜ TODO | 2h |
| E2.S3.PR1.006 | F2.9.1.T006 | Event Archive Worker | ⬜ TODO | 2h |

---

### PR E2.S3.PR2: Sequence Management Workers

**Branch:** `feature/e2-s3-pr2-sequence-management`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F2.10.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S3.PR2.001 | F2.10.1.T001 | Sequence Scheduler Worker | ⬜ TODO | 4h |
| E2.S3.PR2.002 | F2.10.1.T002 | Step Executor Worker | ⬜ TODO | 4h |
| E2.S3.PR2.003 | F2.10.1.T003 | Sequence Pause/Resume Worker | ⬜ TODO | 3h |
| E2.S3.PR2.004 | F2.10.1.T004 | Enrollment Manager Worker | ⬜ TODO | 3h |
| E2.S3.PR2.005 | F2.10.1.T005 | Sequence Stats Aggregator | ⬜ TODO | 2h |

---

### PR E2.S3.PR3: Lead State Machine

**Branch:** `feature/e2-s3-pr3-lead-fsm`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F2.11.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S3.PR3.001 | F2.11.1.T001 | Lead State Transition Worker (ADR-0062) | ⬜ TODO | 6h |
| E2.S3.PR3.002 | F2.11.1.T002 | State History Logger | ⬜ TODO | 3h |
| E2.S3.PR3.003 | F2.11.1.T003 | Transition Validator | ⬜ TODO | 3h |
| E2.S3.PR3.004 | F2.11.1.T004 | State Change Notifier | ⬜ TODO | 2h |

---

### PR E2.S3.PR4: AI Sentiment Analysis

**Branch:** `feature/e2-s3-pr4-ai-sentiment`  
**Reviewer:** @lead-dev  
**Estimare:** 4 zile  
**Phase Mapping:** F2.12.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S3.PR4.001 | F2.12.1.T001 | Sentiment Analyzer Worker (xAI Grok-4) | ⬜ TODO | 6h |
| E2.S3.PR4.002 | F2.12.1.T002 | Intent Classifier Worker | ⬜ TODO | 4h |
| E2.S3.PR4.003 | F2.12.1.T003 | Response Generator Worker | ⬜ TODO | 4h |
| E2.S3.PR4.004 | F2.12.1.T004 | Sentiment-Based Router (ADR-0063) | ⬜ TODO | 3h |
| E2.S3.PR4.005 | F2.12.1.T005 | AI Response Cache | ⬜ TODO | 2h |

---

### PR E2.S3.PR5: Human Review System

**Branch:** `feature/e2-s3-pr5-human-review`  
**Reviewer:** @lead-dev  
**Estimare:** 4 zile  
**Phase Mapping:** F2.13.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S3.PR5.001 | F2.13.1.T001 | Review Queue Manager Worker | ⬜ TODO | 4h |
| E2.S3.PR5.002 | F2.13.1.T002 | SLA Enforcer Worker | ⬜ TODO | 3h |
| E2.S3.PR5.003 | F2.13.1.T003 | Human Takeover Worker (ADR-0064) | ⬜ TODO | 4h |
| E2.S3.PR5.004 | F2.13.1.T004 | Escalation Handler Worker | ⬜ TODO | 3h |
| E2.S3.PR5.005 | F2.13.1.T005 | Review Resolution Worker | ⬜ TODO | 3h |
| E2.S3.PR5.006 | F2.13.1.T006 | Review Analytics Worker | ⬜ TODO | 2h |

---

### PR E2.S3.PR6: Monitoring Workers

**Branch:** `feature/e2-s3-pr6-monitoring`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F2.14.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S3.PR6.001 | F2.14.1.T001 | Quota Monitor Worker | ⬜ TODO | 3h |
| E2.S3.PR6.002 | F2.14.1.T002 | Phone Health Monitor Worker | ⬜ TODO | 3h |
| E2.S3.PR6.003 | F2.14.1.T003 | Bounce Rate Monitor Worker | ⬜ TODO | 2h |
| E2.S3.PR6.004 | F2.14.1.T004 | Alert Dispatcher Worker | ⬜ TODO | 3h |
| E2.S3.PR6.005 | F2.14.1.T005 | Daily Stats Aggregator Worker | ⬜ TODO | 2h |

---

## SPRINT 4: FRONTEND & API (Săptămâna 7-8)

### 📅 Perioada: 17-28 Martie 2026

### 🎯 Obiective Sprint

- [ ] Dashboard Outreach complet
- [ ] Lead management pages
- [ ] Review queue UI
- [ ] All REST API endpoints
- [ ] E2E și integration testing
- [ ] Documentation finalizată

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 8 | - |
| Task-uri planificate | 38 | - |
| Story Points | 60 | - |
| Test Coverage | ≥85% | - |

---

### PR E2.S4.PR1: Dashboard Page

**Branch:** `feature/e2-s4-pr1-dashboard`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F2.15.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S4.PR1.001 | F2.15.1.T001 | Outreach Dashboard Page | ⬜ TODO | 6h |
| E2.S4.PR1.002 | F2.15.1.T002 | QuotaUsageGrid Component (20 phones) | ⬜ TODO | 4h |
| E2.S4.PR1.003 | F2.15.1.T003 | KPI Cards Component | ⬜ TODO | 3h |
| E2.S4.PR1.004 | F2.15.1.T004 | Channel Performance Chart | ⬜ TODO | 3h |

---

### PR E2.S4.PR2: Dashboard Analytics

**Branch:** `feature/e2-s4-pr2-dashboard-analytics`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F2.15.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S4.PR2.001 | F2.15.1.T005 | Lead Funnel Visualization | ⬜ TODO | 3h |
| E2.S4.PR2.002 | F2.15.1.T006 | Recent Activity Feed | ⬜ TODO | 3h |
| E2.S4.PR2.003 | F2.15.1.T007 | Sentiment Distribution Chart | ⬜ TODO | 2h |
| E2.S4.PR2.004 | F2.15.1.T008 | Real-time Updates (React Query) | ⬜ TODO | 3h |

---

### PR E2.S4.PR3: Lead Management Pages

**Branch:** `feature/e2-s4-pr3-lead-pages`  
**Reviewer:** @lead-dev  
**Estimare:** 4 zile  
**Phase Mapping:** F2.16.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S4.PR3.001 | F2.16.1.T001 | Lead List Page (DataTable + Filters) | ⬜ TODO | 6h |
| E2.S4.PR3.002 | F2.16.1.T002 | Lead Detail Page | ⬜ TODO | 6h |
| E2.S4.PR3.003 | F2.16.1.T003 | Conversation Timeline Component | ⬜ TODO | 4h |
| E2.S4.PR3.004 | F2.16.1.T004 | Send Message Dialog | ⬜ TODO | 3h |
| E2.S4.PR3.005 | F2.16.1.T005 | Bulk Actions Component | ⬜ TODO | 3h |
| E2.S4.PR3.006 | F2.16.1.T006 | Lead Quick View Panel | ⬜ TODO | 2h |
| E2.S4.PR3.007 | F2.16.1.T007 | State Change Dialog | ⬜ TODO | 2h |

---

### PR E2.S4.PR4: Review Queue UI

**Branch:** `feature/e2-s4-pr4-review-queue`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F2.17.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S4.PR4.001 | F2.17.1.T001 | Review Queue Page | ⬜ TODO | 4h |
| E2.S4.PR4.002 | F2.17.1.T002 | Priority Tabs Component | ⬜ TODO | 2h |
| E2.S4.PR4.003 | F2.17.1.T003 | Review Card Component | ⬜ TODO | 3h |
| E2.S4.PR4.004 | F2.17.1.T004 | Quick Actions Panel | ⬜ TODO | 3h |
| E2.S4.PR4.005 | F2.17.1.T005 | SLA Timer Component | ⬜ TODO | 2h |

---

### PR E2.S4.PR5: REST API Leads & Sequences

**Branch:** `feature/e2-s4-pr5-api-leads`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F2.18.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S4.PR5.001 | F2.18.1.T001 | GET /api/v1/outreach/leads endpoint | ⬜ TODO | 3h |
| E2.S4.PR5.002 | F2.18.1.T002 | GET /api/v1/outreach/leads/:id endpoint | ⬜ TODO | 2h |
| E2.S4.PR5.003 | F2.18.1.T003 | PATCH /api/v1/outreach/leads/:id endpoint | ⬜ TODO | 2h |
| E2.S4.PR5.004 | F2.18.1.T004 | POST /api/v1/outreach/leads/:id/send-message | ⬜ TODO | 3h |
| E2.S4.PR5.005 | F2.18.1.T005 | Sequences CRUD endpoints | ⬜ TODO | 4h |

---

### PR E2.S4.PR6: REST API Templates, Phones, Analytics

**Branch:** `feature/e2-s4-pr6-api-remaining`  
**Reviewer:** @lead-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F2.18.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S4.PR6.001 | F2.18.1.T006 | Templates CRUD endpoints | ⬜ TODO | 3h |
| E2.S4.PR6.002 | F2.18.1.T007 | Phones endpoints | ⬜ TODO | 3h |
| E2.S4.PR6.003 | F2.18.1.T008 | Analytics endpoints | ⬜ TODO | 3h |

---

### PR E2.S4.PR7: Testing

**Branch:** `feature/e2-s4-pr7-testing`  
**Reviewer:** @lead-dev  
**Estimare:** 4 zile  
**Phase Mapping:** F2.19.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S4.PR7.001 | F2.19.1.T001 | Unit tests pentru workers | ⬜ TODO | 8h |
| E2.S4.PR7.002 | F2.19.1.T002 | Integration tests pentru API | ⬜ TODO | 6h |
| E2.S4.PR7.003 | F2.19.1.T003 | E2E tests pentru frontend flows | ⬜ TODO | 6h |
| E2.S4.PR7.004 | F2.19.1.T004 | Load testing pentru workers | ⬜ TODO | 4h |
| E2.S4.PR7.005 | F2.19.1.T005 | Webhook mock server | ⬜ TODO | 3h |
| E2.S4.PR7.006 | F2.19.1.T006 | Test coverage report | ⬜ TODO | 2h |

---

### PR E2.S4.PR8: Documentation

**Branch:** `feature/e2-s4-pr8-documentation`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F2.20.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E2.S4.PR8.001 | F2.20.1.T001 | Update OpenAPI spec (complete) | ⬜ TODO | 4h |
| E2.S4.PR8.002 | F2.20.1.T002 | Update ADR-INDEX | ⬜ TODO | 2h |
| E2.S4.PR8.003 | F2.20.1.T003 | Runbook final validation | ⬜ TODO | 3h |
| E2.S4.PR8.004 | F2.20.1.T004 | Developer onboarding guide | ⬜ TODO | 3h |

---

## SUMAR TOTAL

### Per Sprint

| Sprint | PR-uri | Task-uri | Story Points | Perioada |
| --- | --- | --- | --- | --- |
| **E2.S1** | 6 | 23 | 40 | 3-14 Feb 2026 |
| **E2.S2** | 8 | 26 | 50 | 17-28 Feb 2026 |
| **E2.S3** | 6 | 31 | 55 | 3-14 Mar 2026 |
| **E2.S4** | 8 | 38 | 60 | 17-28 Mar 2026 |
| **TOTAL** | **32** | **118** | **205** | **8 săptămâni** |

### Phase → Sprint Mapping Summary

| Phase Range | Sprint | Tasks |
| --- | --- | --- |
| F2.1 - F2.4 | E2.S1 | 23 |
| F2.5 - F2.8 | E2.S2 | 26 |
| F2.9 - F2.14 | E2.S3 | 31 |
| F2.15 - F2.20 | E2.S4 | 38 |

---

## CROSS-REFERENCES

### Documente Conexe

| Document | Path | Relevanță |
| --- | --- | --- |
| Plan Implementare Granular | `etapa2-plan-implementare.md` | Source pentru task JSON definitions |
| Index Documentație | `00-INDEX-ETAPA2.md` | Master index pentru toate docs |
| ADR Index | `../../adr/ADR-INDEX.md` | ADR-0053 → ADR-0067 |
| OpenAPI Spec | `../../api/openapi-etapa2.yaml` | API contract |
| Etapa 1 Sprint Plan | `../Etapa 1/etapa1-sprint-plan.md` | Format reference |

### Dependințe

| Dependință | Descriere |
| --- | --- |
| Etapa 1 completă | Gold layer populat, pipeline funcțional |
| TimelinesAI account | 20 numere de telefon configurate |
| Instantly.ai account | Cold email platform setup |
| Resend account | Warm email platform setup |
| xAI API access | Grok-4 pentru sentiment analysis |

---

**Document generat:** 2 Februarie 2026  
**Autor:** Cerniq Development Team  
**Conformitate:** Master Spec v1.2
