# CERNIQ.APP — ETAPA 4: WORKERS OVERVIEW

## Arhitectură 67 Workeri Event-Driven

### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [Arhitectură Generală](#1-arhitectura)
2. [Categorii Workers](#2-categorii)
3. [Inventar Complet 67 Workeri](#3-inventar)
4. [Queue Naming Convention](#4-naming)
5. [Rate Limits & Concurrency](#5-rate-limits)
6. [Dependențe între Workers](#6-dependente)

---

## 1. Arhitectură Generală {#1-arhitectura}

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ETAPA 4 - 67 WORKERI EVENT-DRIVEN                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     WEBHOOK INGESTION LAYER                            │ │
│  │                                                                        │ │
│  │  POST /webhooks/revolut    POST /webhooks/sameday    Cron Jobs         │ │
│  │         │                          │                      │            │ │
│  │         ▼                          ▼                      ▼            │ │
│  │   ┌─────────┐               ┌──────────┐            ┌──────────┐       │ │
│  │   │ Queue A │               │ Queue E  │            │ Scheduled│       │ │
│  │   │Revolut  │               │ Sameday  │            │   Jobs   │       │ │
│  │   └────┬────┘               └────┬─────┘            └────┬─────┘       │ │
│  └────────┼──────────────────────────┼──────────────────────┼─────────────┘ │
│           │                          │                      │               │
│           ▼                          ▼                      ▼               │
│  ┌─────────────────┐       ┌─────────────────┐     ┌─────────────────┐      │
│  │   CATEGORIA A   │       │   CATEGORIA E   │     │   CATEGORIA C   │      │
│  │    Revolut      │       │    Sameday      │     │  Credit Scoring │      │
│  │   (6 workers)   │       │   (6 workers)   │     │   (6 workers)   │      │
│  └────────┬────────┘       └────────┬────────┘     └────────┬────────┘      │
│           │                         │                       │               │
│           └─────────────────────────┼───────────────────────┘               │
│                                     │                                       │
│                                     ▼                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      BUSINESS LOGIC LAYER                              │ │
│  │                                                                        │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │ │
│  │  │     B      │  │     D      │  │     F      │  │     G      │        │ │
│  │  │ Reconcile  │  │Credit Limit│  │Stock Sync  │  │ Contracts  │        │ │
│  │  │(6 workers) │  │(3 workers) │  │(4 workers) │  │(5 workers) │        │ │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘        │ │
│  │                                                                        │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │ │
│  │  │     H      │  │     I      │  │     J      │  │     K      │        │ │
│  │  │  Returns   │  │   Alerts   │  │   Audit    │  │    HITL    │        │ │
│  │  │(2 workers) │  │(6 workers) │  │(3 workers) │  │(6 workers) │        │ │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         DATA LAYER                                     │ │
│  │  PostgreSQL 18.1 │ Redis 8.4.0 │ BullMQ 5.66.5 │ SigNoz                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Categorii Workers {#2-categorii}

| Cat | Nume | Workers | Queue Prefix | Responsabilitate |
|-----|------|---------|--------------|------------------|
| **A** | Revolut Webhook | 6 | `revolut:*` | Procesare webhooks, tranzacții |
| **B** | Payment Reconciliation | 6 | `payment:*` | Matching facturi, solduri |
| **C** | Credit Scoring | 6 | `credit:*` | Termene.ro, scoring |
| **D** | Credit Limits | 3 | `credit:limit:*` | Check/reserve credit |
| **E** | Sameday Logistics | 6 | `sameday:*` | AWB, tracking, COD |
| **F** | Stock Sync | 4 | `stock:*` | Oblio inventory sync |
| **G** | Dynamic Contracts | 5 | `contract:*` | Generate, sign contracts |
| **H** | Returns & RMA | 2 | `return:*` | Process returns |
| **I** | Alerts & Notifications | 6 | `alert:*` | Client & internal alerts |
| **J** | Audit & Compliance | 3 | `audit:*` | Logging, GDPR |
| **K** | Human Intervention | 6 | `hitl:*` | Approvals, escalation |
| **-** | Pipeline/Cron | 14 | Various | Orchestration |
| | **TOTAL** | **67** | | |

---

## 3. Inventar Complet 67 Workeri {#3-inventar}

### CATEGORIA A: REVOLUT WEBHOOK WORKERS (6)

| # | Queue Name | Trigger | Concurrency | Critical |
|---|------------|---------|-------------|----------|
| 1 | `revolut:webhook:ingest` | Webhook POST | 10 | ✓ |
| 2 | `revolut:transaction:process` | A1 onComplete | 5 | ✓ |
| 3 | `revolut:payment:record` | A2 onComplete | 10 | ✓ |
| 4 | `revolut:refund:process` | Manual/API | 3 | |
| 5 | `revolut:balance:sync` | Cron */30min | 1 | |
| 6 | `revolut:webhook:validate` | A1 parallel | 10 | |

### CATEGORIA B: PAYMENT RECONCILIATION (6)

| # | Queue Name | Trigger | Concurrency | Critical |
|---|------------|---------|-------------|----------|
| 7 | `payment:reconcile:auto` | A3 onComplete | 10 | ✓ |
| 8 | `payment:reconcile:fuzzy` | B7 no_match | 5 | |
| 9 | `payment:reconcile:manual` | HITL resolve | 3 | |
| 10 | `payment:balance:update` | B7/B8/B9 | 10 | |
| 11 | `payment:overdue:detect` | Cron 09:00 | 1 | ✓ |
| 12 | `payment:overdue:escalate` | B11 found | 5 | |

### CATEGORIA C: CREDIT SCORING (6)

| # | Queue Name | Trigger | Concurrency | Critical |
|---|------------|---------|-------------|----------|
| 13 | `credit:profile:create` | client:created | 3 | |
| 14 | `credit:data:fetch-anaf` | C13 parallel | 5 | |
| 15 | `credit:data:fetch-bilant` | C13 parallel | 5 | |
| 16 | `credit:data:fetch-bpi` | C13 parallel | 5 | |
| 17 | `credit:score:calculate` | After C14-16 | 3 | ✓ |
| 18 | `credit:limit:calculate` | C17 onComplete | 3 | |

### CATEGORIA D: CREDIT LIMIT WORKERS (3)

| # | Queue Name | Trigger | Concurrency | Critical |
|---|------------|---------|-------------|----------|
| 19 | `credit:limit:check` | order:created | 10 | ✓ |
| 20 | `credit:limit:reserve` | D19 approved | 5 | |
| 21 | `credit:limit:release` | order:paid/cancel | 5 | |

### CATEGORIA E: SAMEDAY LOGISTICS (6)

| # | Queue Name | Trigger | Concurrency | Critical |
|---|------------|---------|-------------|----------|
| 22 | `sameday:awb:create` | order:ready | 3 | ✓ |
| 23 | `sameday:status:poll` | Repeat 30min | 5 | |
| 24 | `sameday:status:process` | E23 onChange | 3 | ✓ |
| 25 | `sameday:cod:process` | E24 DELIVERED | 3 | |
| 26 | `sameday:return:initiate` | Manual/3xFail | 2 | |
| 27 | `sameday:pickup:schedule` | Cron 14:00 | 1 | |

### CATEGORIA F: STOCK SYNC (4)

| # | Queue Name | Trigger | Concurrency | Critical |
|---|------------|---------|-------------|----------|
| 28 | `stock:sync:oblio` | Cron */15min | 1 | |
| 29 | `stock:reserve:order` | order:created | 5 | |
| 30 | `stock:release:order` | order:cancel | 5 | |
| 31 | `stock:deduct:delivered` | E24 DELIVERED | 5 | |

### CATEGORIA G: DYNAMIC CONTRACTS (5)

| # | Queue Name | Trigger | Concurrency | Critical |
|---|------------|---------|-------------|----------|
| 32 | `contract:template:select` | order:approved | 5 | |
| 33 | `contract:clause:assemble` | G32 onComplete | 3 | |
| 34 | `contract:generate:docx` | G33 onComplete | 3 | |
| 35 | `contract:sign:request` | G34 onComplete | 2 | |
| 36 | `contract:sign:complete` | Webhook DocuSign | 3 | ✓ |

### CATEGORIA H: RETURNS & RMA (2)

| # | Queue Name | Trigger | Concurrency | Critical |
|---|------------|---------|-------------|----------|
| 37 | `return:request:create` | API client | 5 | |
| 38 | `return:process:stock` | E24 RETURNED | 3 | |

### CATEGORIA I: ALERTS & NOTIFICATIONS (6)

| # | Queue Name | Trigger | Concurrency | Critical |
|---|------------|---------|-------------|----------|
| 39 | `alert:client:payment-received` | A3 onComplete | 10 | |
| 40 | `alert:client:shipped` | E24 PICKED_UP | 10 | |
| 41 | `alert:client:delivered` | E24 DELIVERED | 10 | |
| 42 | `alert:client:payment-reminder` | B11 overdue | 10 | |
| 43 | `alert:internal:credit-blocked` | D19 blocked | 5 | |
| 44 | `alert:internal:daily-summary` | Cron 18:00 | 1 | |

### CATEGORIA J: AUDIT & COMPLIANCE (3)

| # | Queue Name | Trigger | Concurrency | Critical |
|---|------------|---------|-------------|----------|
| 45 | `audit:log:write` | All workers | 20 | |
| 46 | `audit:compliance:check` | Cron 06:00 | 1 | |
| 47 | `audit:data:anonymize` | Cron Sunday | 1 | |

### CATEGORIA K: HITL WORKERS (6)

| # | Queue Name | Trigger | Concurrency | Critical |
|---|------------|---------|-------------|----------|
| 48 | `hitl:approval:credit-override` | D19 overage | 5 | |
| 49 | `hitl:approval:credit-limit` | C18 >50K | 3 | |
| 50 | `hitl:approval:refund-large` | refund >1K | 3 | |
| 51 | `hitl:investigation:payment` | B7 no_match | 5 | |
| 52 | `hitl:task:resolve` | API UI | 5 | |
| 53 | `hitl:escalation:overdue` | SLA breach | 3 | ✓ |

### PIPELINE & CRON WORKERS (14)

| # | Queue Name | Schedule/Trigger | Concurrency |
|---|------------|------------------|-------------|
| 54 | `pipeline:order:advance` | Order state changes | 10 |
| 55 | `pipeline:credit:refresh-all` | Cron 03:00 daily | 1 |
| 56 | `pipeline:reservation:expire` | Cron */15min | 1 |
| 57 | `pipeline:contract:expire` | Cron 01:00 | 1 |
| 58 | `pipeline:health:check` | Cron */1min | 1 |
| 59 | `pipeline:metrics:collect` | Cron */5min | 1 |
| 60 | `cron:daily:overdue-check` | 09:00 daily | 1 |
| 61 | `cron:daily:summary` | 18:00 daily | 1 |
| 62 | `cron:weekly:compliance` | Sunday 02:00 | 1 |
| 63 | `cron:monthly:cleanup` | 1st 03:00 | 1 |
| 64 | `webhook:docusign:ingest` | Webhook POST | 5 |
| 65 | `webhook:normalize` | After any webhook | 10 |
| 66 | `notification:send:whatsapp` | Alert workers | 5 |
| 67 | `notification:send:email` | Alert workers | 10 |

---

## 4. Queue Naming Convention {#4-naming}

```
{domain}:{category}:{action}[:{variant}]

Exemple:
- revolut:webhook:ingest
- payment:reconcile:auto
- credit:score:calculate
- sameday:awb:create
- alert:client:shipped
- hitl:approval:credit-override
```

---

## 5. Rate Limits & Concurrency {#5-rate-limits}

| External API | Rate Limit | Queue Strategy |
|--------------|------------|----------------|
| Revolut API | N/A (webhook) | Process immediately |
| Termene.ro | 20 req/sec | Concurrency: 5 |
| Sameday API | 30 req/min | Concurrency: 3 + delay |
| Oblio API | 100 req/min | Concurrency: 1 + batch |
| DocuSign | 1000 req/h | Concurrency: 2 |
| WhatsApp | 50/min per number | Concurrency: 5 |

---

## 6. Dependențe între Workers {#6-dependente}

```
Revolut Webhook → A1 → A2 → A3 → B7 → B10
                              ↓
                   Payment Recorded → Alert I39
                              ↓
                   Order Status → Pipeline #54
                              ↓
                   Credit Release → D21

Credit Flow: C13 → [C14,C15,C16] → C17 → C18 → D19 → D20/HITL

Logistics: Order Ready → E22 → E23 → E24 → [I40,I41,F31,E25]

Contract: Order Approved → G32 → G33 → G34 → G35 → G36 → Order Ready
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
