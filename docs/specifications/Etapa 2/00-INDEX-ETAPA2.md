# CERNIQ.APP — ETAPA 2: INDEX DOCUMENTAȚIE

## Cold Outreach Multi-Canal - Documentație Completă

### Versiunea 1.1 | 18 Ianuarie 2026

---

## SUMAR ETAPA 2

**Scop:** Automatizare cold outreach pentru agricultura românească  
**Canale:** WhatsApp (TimelinesAI), Email Cold (Instantly.ai), Email Warm (Resend)  
**Capacitate:** 4,000 WhatsApp + 5,000-10,000 Email / zi  
**Telefoane:** 20 numere × 200 contacte noi/zi  

---

## CATALOG DOCUMENTE (18 DOCUMENTE)

### 1. ARCHITECTURE & DESIGN

| # | Document | Descriere | Linii |
| --- | ---------- | ----------- | ------- |
| 1 | `00-INDEX-ETAPA2.md` | Index și statistici | ~300 |
| 2 | `etapa2-adrs.md` | 15 Architecture Decision Records | ~150 |
| 3 | `etapa2-schema-outreach.md` | Schema DB completă (11 tabele) | ~1000 |
| 4 | `etapa2-workers-triggers.md` | Inter-worker communication rules | ~500 |

### 2. WORKERS (52 WORKERS TOTAL)

| # | Document | Workers | Descriere |
| --- | ---------- | --------- | ----------- |
| 5 | `etapa2-workers-overview.md` | ALL | Overview și queue config |
| 6 | `etapa2-workers-A-quota-guardian.md` | #1-4 | Quota management |
| 7 | `etapa2-workers-B-orchestration.md` | #5-8 | Dispatch & routing |
| 8 | `etapa2-workers-C-whatsapp.md` | #9-15 | WhatsApp via TimelinesAI |
| 9 | `etapa2-workers-D-E-email.md` | #16-23 | Email Cold & Warm |
| 10 | `etapa2-workers-F-L-remaining.md` | #24-52 | Templates, Webhooks, AI, HITL |

### 3. FRONTEND UI/UX

| # | Document | Componente | Descriere |
| --- | ---------- | ------------ | ----------- |
| 11 | `etapa2-ui-pages.md` | 12+ pagini | Dashboard, Leads, Phones, Review |
| 12 | `etapa2-ui-forms-dialogs.md` | 6+ forms/dialogs | Send message, Create sequence |

### 4. BACKEND & API

| # | Document | Descriere |
| --- | ---------- | ----------- |
| 13 | `etapa2-api-endpoints.md` | 35+ REST endpoints complete |
| 14 | `etapa2-hitl-system.md` | Human-in-the-Loop workflow |

### 5. OPERATIONS

| # | Document | Descriere |
| --- | ---------- | ----------- |
| 15 | `etapa2-runbook.md` | **Runbook operațional complet** (consolidat v1.1) |
| 16 | `etapa2-development-standards.md` | **Coding standards & procedures** (consolidat v1.1) |
| 17 | `etapa2-testing-strategy.md` | Unit, Integration, E2E, Load tests |
| 18 | `etapa2-plan-implementare.md` | 118 taskuri JSON granulare |

> **Notă v1.1 (18 Ian 2026):**
>
> - `etapa2-runbook.md` consolidează fostele `etapa2-runbook.md` + `etapa2-runbook-operational.md`
> - `etapa2-development-standards.md` consolidează fostele `etapa2-standards.md` + `etapa2-standards-procedures.md`

---

## STATISTICI ETAPA 2

### Workers by Category

| Category | Count | Queue Prefix |
| ---------- | ------- | -------------- |
| A: Quota Guardian | 4 | `quota:*` |
| B: Orchestration | 4 | `outreach:orchestrator:*` |
| C: WhatsApp | 7 + 40 queues | `q:wa:*` |
| D: Email Cold | 5 | `q:email:cold*` |
| E: Email Warm | 3 | `q:email:warm*` |
| F: Templates | 3 | `template:*` |
| G: Webhooks | 4 | `webhook:*` |
| H: Sequences | 4 | `sequence:*` |
| I: State Machine | 3 | `lead:state:*` |
| J: AI Analysis | 3 | `ai:*` |
| K: Monitoring | 6 | `monitor:*`, `alert:*` |
| L: Human Review | 4 | `human:*` |
| Pipeline | 2 | `pipeline:outreach:*` |
| **TOTAL** | **52** | |

### Database Schema

| Table | Purpose | Est. Rows/Month |
| ------- | --------- | ----------------- |
| `gold_lead_journey` | Lead state machine | 50,000 |
| `gold_communication_log` | Message audit trail | 500,000 |
| `wa_phone_numbers` | 20 WhatsApp phones | 20 |
| `wa_quota_usage` | Daily quota tracking | 600 |
| `outreach_sequences` | Sequence definitions | 50 |
| `outreach_sequence_steps` | Sequence steps | 250 |
| `sequence_enrollments` | Active enrollments | 100,000 |
| `outreach_templates` | Message templates | 100 |
| `template_versions` | A/B test versions | 200 |
| `human_review_queue` | HITL items | 10,000 |
| `outreach_daily_stats` | Daily aggregates | 365 |

### API Endpoints

| Module | Endpoints | Method Distribution |
| -------- | ----------- | --------------------- |
| Leads | 6 | GET(3), POST(2), PATCH(1) |
| Sequences | 5 | GET(2), POST(3) |
| Templates | 5 | GET(2), POST(2), PATCH(1) |
| Phones | 4 | GET(2), PATCH(1), POST(1) |
| Reviews | 5 | GET(3), POST(2) |
| Analytics | 4 | GET(4) |
| Webhooks | 3 | POST(3) |
| **TOTAL** | **35+** | |

### Frontend Pages

| Route | Page | Components |
| ------- | ------ | ------------ |
| `/outreach/dashboard` | Dashboard | KPIs, QuotaGrid, Charts |
| `/outreach/leads` | Lead List | DataTable, Filters |
| `/outreach/leads/[id]` | Lead Detail | Conversation, Actions |
| `/outreach/sequences` | Sequences | SequenceCard, CreateForm |
| `/outreach/templates` | Templates | TemplateEditor, Preview |
| `/outreach/phones` | Phones | PhoneCard, QuotaProgress |
| `/outreach/review` | Review Queue | PriorityTabs, ReviewCard |
| `/outreach/analytics` | Analytics | Charts, DateRange |

---

## BUSINESS CONSTRAINTS

| Constraint | Value | Enforcement |
| ------------ | ------- | ------------- |
| WhatsApp new contacts/day/phone | 200 | Redis Lua atomic |
| WhatsApp follow-ups | Unlimited | No quota check |
| Business hours | 09:00-18:00 | Worker check |
| Weekend sending | Disabled | Worker check |
| Jitter pattern | 30s + rand(0,120s) | Before each send |
| Bounce threshold | 3% | Campaign pause |
| Sentiment auto-reply | Score ≥ 50 | AI routing |
| Sentiment human review | Score < 50 | HITL queue |
| SLA Urgent | 1 hour | BullMQ delayed |
| SLA High | 4 hours | BullMQ delayed |
| SLA Medium | 24 hours | BullMQ delayed |

---

## CHANNEL COMPARISON

| Feature | WhatsApp | Email Cold | Email Warm |
| --------- | ---------- | ------------ | ------------ |
| Provider | TimelinesAI | Instantly.ai | Resend |
| Cost/month | ~$500 | ~$200 | ~$0.0025/email |
| Daily capacity | 4,000 new | 5,000-10,000 | Unlimited |
| Response rate | 15-25% | 2-5% | 10-15% |
| Use case | Primary outreach | Volume | Warm follow-up |
| Tracking | Delivered, Read | Open, Click | Open, Click |

---

## PIPELINE FLOW

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    ETAPA 2: COLD OUTREACH PIPELINE                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Gold Lead (Etapa 1)                                               │
│        │                                                           │
│        ▼                                                           │
│  ┌─────────────┐                                                   │
│  │ Orchestrator │ ◄──── Cron */5 min                              │
│  │  Dispatch    │                                                  │
│  └──────┬──────┘                                                   │
│         │                                                           │
│    ┌────┴────┐                                                     │
│    ▼         ▼                                                     │
│ ┌──────┐ ┌──────┐                                                  │
│ │ WA   │ │Email │                                                  │
│ │Queue │ │Queue │                                                  │
│ └──┬───┘ └──┬───┘                                                  │
│    │        │                                                       │
│    ▼        ▼                                                       │
│ ┌──────────────┐                                                   │
│ │   Webhooks   │ ◄──── TimelinesAI / Instantly / Resend           │
│ └──────┬───────┘                                                   │
│        │                                                           │
│        ▼                                                           │
│ ┌──────────────┐     ┌──────────────┐                             │
│ │  Sentiment   │────►│ Human Review │                             │
│ │   Analysis   │     │    Queue     │                             │
│ └──────┬───────┘     └──────────────┘                             │
│        │                                                           │
│        ▼                                                           │
│ ┌──────────────┐                                                   │
│ │ AI Response  │────► Follow-up Queue                             │
│ │  Generator   │                                                   │
│ └──────────────┘                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## CROSS-REFERENCES

### Dependențe din alte etape

| Document | Relevanță pentru Etapa 2 |
| ---------- | -------------------------- |
| Master Spec | Source of truth pentru toate regulile |
| Etapa 1 Schema | Gold layer = input pentru outreach |
| Etapa 0 Infrastructure | Docker, Redis, PostgreSQL setup |
| HITL Unified System | Approval workflow patterns |
| Coding Standards | TypeScript, testing conventions |

### Outputs către alte etape

| Etapa | Ce primește |
| ------- | ------------- |
| Etapa 3 | Leads în WARM_REPLY, NEGOTIATION |
| Etapa 4 | Converted leads pentru monitoring |
| Etapa 5 | Communication history pentru nurturing |

---

## IMPLEMENTARE TIMELINE

| Fază | Săptămâna | Focus |
| ------ | ----------- | ------- |
| F2.1 | W1 | Database schema + migrations |
| F2.2-F2.4 | W2 | External integrations |
| F2.5-F2.6 | W3 | Quota + Orchestration workers |
| F2.7-F2.8 | W4 | WhatsApp + Email workers |
| F2.9-F2.11 | W5 | Webhooks + State machine |
| F2.12-F2.13 | W6 | AI + HITL workers |
| F2.14-F2.17 | W7 | Frontend + Monitoring |
| F2.18-F2.20 | W8 | API + Testing + Docs |

**Total estimat:** 8-10 săptămâni

---

**Document generat:** 15 Ianuarie 2026  
**Total documente:** 18  
**Total workers:** 52  
**Total linii cod documentație:** ~15,000  
**Conformitate:** Master Spec v1.2
