<!-- neuron-contract:author-complete -->

# Neuron `pipeline:approval:pending`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `pipeline:approval:pending` |
| etapa | E1 |
| familie (v2, prima instanță) | `hitl` |
| contract_path | `contracts/neurons/E1/pipeline--approval--pending.md` |
| ADR familie (indicativ) | [hitl](../../adr/families/e1/hitl.md) |

## Scop în context real

**v2** descrie un **HumanNeuron** cu coadă canonică `pipeline:approval:pending`, HITL obligatoriu, span `cognitive.pipeline.approval.pending`. **În runtime**, **nu** există această coadă în `queue-registry.ts` sau procesor în `workers/enrichment/src/main.ts`. **Aprobările în așteptare** sunt modelate în **Postgres** (`approval_tasks`, status `pending` / `assigned` / `escalated`) — vezi `packages/db/src/schemas/approval.ts`, `packages/db/src/services/approval-service.ts`. **Dashboard** agregă `approvals.pending` din aceleași rânduri (`apps/api/src/lib/dashboard-stats-payload.ts`). Worker **`hitl:escalate`** (`hitl-escalation.ts`, span `e1:hitl:escalate`) parcurge task-uri pending/assigned/escalated pentru avertismente SLA și escaladare la depășire `dueAt` — **alt** mecanism decât o coadă «approval:pending». **Concluzie:** numele v2 evocă o **coadă BullMQ** inexistentă; starea operațională «pending approvals» este **persistență + API + cozi HITL auxiliare** (`hitl:escalate`, `hitl:resume`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`pipeline:approval:pending\`` (~L2677–2696).
- `packages/shared/src/cognitive-node-catalog.ts` — **fără** `pipeline:approval:pending` la audit.
- `workers/shared/src/queue-registry.ts` — **fără** literal `pipeline:approval:pending`.
- `workers/enrichment/src/main.ts` — procesoare `hitl:escalate`, `hitl:resume` (~L175–176); **fără** `pipeline:approval:pending`.
- `packages/db/src/schemas/approval.ts` — `approvalStatusEnum`, default `pending` (~L61).
- `packages/db/src/services/approval-service.ts` — agregări task-uri pending (~L417+).
- `apps/api/src/lib/dashboard-stats-payload.ts` — `approvals.pending` (~L52–63, ~L147–148).
- `workers/enrichment/src/workers/hitl-escalation.ts` — query status `pending`/`assigned`/`escalated` (~L22–31, ~L84–87); `withCognitiveSpan("e1:hitl:escalate", …)` (~L15–17).
- `rg` `pipeline:approval:pending` în `*.ts`: **fără** potrivire.

## Instanțe v2

- **OTel v2:** `cognitive.pipeline.approval.pending`.
- **OTel cod:** **fără** handler cu acest nume; cel mai apropiat: `e1:hitl:escalate`, `e1:hitl:resume` (dacă aplicabil fluxului de reluare).

## N/A pe criterii

- **Rând 8:** **N/A** — v2 include «Non-AI neuron — deterministic processing» pentru acest HumanNeuron; **fără** rutare LLM pentru coada v2 (coada lipsește în cod).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** `pipeline:approval:pending` ca queue. Stare pending: `approval_tasks`, servicii API. | v2 HumanNeuron + queue. | Model date ≠ BullMQ queue. |
| 2 | Etapă, familie, swimlane | v2 E1 `hitl`. Cod: task-uri trans-tenant; worker escalation în enrichment E1. | v2. | — |
| 3 | Rol declarat | v2: operațional HITL. Cod: persistență aprobări + notificări escaladare. | v2 neocortex. | UI/API uman detaliat în afara acestui fișier. |
| 4 | NeuronType + SOFAI | v2 `HumanNeuron`. Cod: **fără** neuron catalog pentru v2_queue. | v2 §2.1. | — |
| 5 | Criticitate | v2 `CRITICAL`. Cod: escaladare/notificări pentru SLA — severitate operațională ridicată implicit. | v2. | — |
| 6 | Înveliș telemetrie | Span `e1:hitl:escalate` (ex.); **fără** `cognitive.pipeline.approval.pending`. | ADR-0003. | Nealinat. |
| 7 | Înveliș politică | `hitl-escalation`: prag 80% SLA, breach100%, `approvalService.escalate`. | v2 HITL mandatory, SLA 2h. | Egalare exactă SLA 2h vs cod: neaudit în acest contract. |
| 8 | Rutare model (dacă AI) | **N/A** | v2 «Non-AI» pe același bloc cu HumanNeuron — tensiune documentată. | — |
| 9 | Guardrails | Audit `writeAuditEvent` pe SLA warning (`hitl-escalation` ~L53–66). | ADR-0007. | — |
| 10 | Escaladare HITL | `hitl:escalate`, `approvalService.escalate`. | v2. | — |
| 11 | Micro-OODA | Query DB → notificare / escaladare. | v2 OODA (LangGraph în v2 neconfirmat în handler citat). | LangGraph checkpoint: **Limită evidență** în repo la acest neuron. |
| 12 | Tier + de-escaladare | Tier v2: 2. Cod: logică timp `dueAt`/`createdAt`. | v2 §2.2. | — |
| 13 | Stack | BullMQ (`hitl:escalate`), Postgres, notificări. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.pipeline.approval.pending`.
- **Cod:** **lipsă** span dedicat; activitate apropiere semantică sub `e1:hitl:escalate` / `e1:hitl:resume`.
- **Stare:** **gap** + **nealinat**.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
