<!-- neuron-contract:author-complete -->

# Neuron `human:review:queue`

> **Status:** audit manual **2026-04-11**. Review Queue Manager: creează rând `human_review_queue`, actualizează `lead_journey`, programează SLA.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `human:review:queue` |
| etapa | E2 |
| familie (v2) | `human` |
| contract_path | `contracts/neurons/E2/human--review--queue.md` |
| ADR familie (indicativ) | [human](../../adr/families/e2/human.md) |

## Scop în context real

**v2 + catalog:** `HumanNeuron`, coadă mesaje pentru operator. **Repo:** `createReviewQueueManagerWorker` în `workers/outreach/src/workers/hitl.ts` (L151–293) pe `QUEUES.HUMAN_REVIEW_QUEUE` (`human:review:queue`): validează `lead_journey`, deschide tranzacție — inserează `humanReviewQueue` (status `PENDING`, `slaDueAt` din `SLA_HOURS`), setează pe journey `requiresHumanReview`, `humanReviewReason`, `humanReviewPriority`, apoi enfilează job întârziat pe `hitl:sla:enforce`. `auditWriter` + `createOutreachJobLogger`. Teste: `workers/outreach/src/workers/ai-sentiment.test.ts` (ex. escaldare la `human:review:queue`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`human:review:queue\`` (L3417–3440).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:human:review-queue` (L1398–1405).
- `workers/shared/src/queue-registry.ts` — `HUMAN_REVIEW_QUEUE` (L171, L840).
- `workers/outreach/src/workers/hitl.ts` — `ReviewQueueJobData`, `createReviewQueueManagerWorker` (L72–81, L151–293).
- `workers/outreach/src/index.ts` — `createReviewQueueManagerWorker` (L183).
- `workers/outreach/src/workers/ai-sentiment.test.ts` — mock `human:review:queue`.

## Instanțe v2

- **Catalog nodeKey:** `e2:human:review-queue`
- **OTel (v2):** `cognitive.e2.human.review-queue`

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:human:review-queue`**, worker `createReviewQueueManagerWorker`. | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `human-oversight`. | v2. | — |
| 3 | Rol declarat | Persistență task review + SLA + flag journey. | v2. | — |
| 4 | NeuronType + SOFAI | **Catalog:** `HumanNeuron`. | v2. | — |
| 5 | Criticitate | **Catalog:** `HIGH`. | v2. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e2:human:review-queue", …)` (L157). | v2 `cognitive.e2.human.review-queue`. | Mapare `cognitive.neuron.*` globală: vezi ADR-0003. |
| 7 | Înveliș politică | Tranzacție DB + `UnrecoverableError` la inconsistențe; SLA din `SLA_HOURS`. | v2 HITL policy. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | Normalizare motiv `AI_FLAGGED` → `AI_UNCERTAIN` (`toPersistedReviewReason`). | ADR-0007. | — |
| 10 | Escaladare HITL | Enqueue `hitl:sla:enforce`; escaladare ulterioară în alți workeri. | v2 + ADR-0008. | — |
| 11 | Micro-OODA | OBSERVE/ORIENT/DECIDE/ACT în jurul creării review + journey update. | v2 menționează LangGraph checkpoint — **absent** în handler. | ORIENT „LangGraph”: **destinație v2**, fără cod. |
| 12 | Tier + de-escaladare | Eșec → `UnrecoverableError` / throw pe erori tranzacție. | v2. | — |
| 13 | Stack | BullMQ, Postgres (`humanReviewQueue`, `leadJourney`), coadă `hitl:sla:enforce`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.human.review-queue`.
- **Cod:** `withCognitiveSpan("e2:human:review-queue")` — **aliniat** pe string nodeKey.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
