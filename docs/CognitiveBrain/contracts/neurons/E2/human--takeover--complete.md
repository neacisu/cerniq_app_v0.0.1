<!-- neuron-contract:author-complete -->

# Neuron `human:takeover:complete`

> **Status:** audit manual **2026-04-11**. Resolution handler: închide review, returnează journey la automatizare.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `human:takeover:complete` |
| etapa | E2 |
| familie (v2) | `human` |
| contract_path | `contracts/neurons/E2/human--takeover--complete.md` |
| ADR familie (indicativ) | [human](../../adr/families/e2/human.md) |

## Scop în context real

**v2 + catalog:** `HumanNeuron`, finalizare preluare și predare înapoi la AI. **Repo:** `createResolutionHandlerWorker` în `workers/outreach/src/workers/hitl.ts` (L572–682) pe `QUEUES.HUMAN_TAKEOVER_COMPLETE` (`human:takeover:complete`): setează `humanReviewQueue` la `RESOLVED` cu `resolutionAction: RETURN_TO_AUTOMATION`, `resolutionNotes`, `resolvedBy`; apoi `lead_journey` cu `isHumanControlled: false`, `requiresHumanReview: false`; inserează `hitlAuditLog` + `auditWriter`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`human:takeover:complete\`` (L3442–3465).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:human:takeover-complete` (L1425–1432).
- `workers/shared/src/queue-registry.ts` — `HUMAN_TAKEOVER_COMPLETE` (L174, L843).
- `workers/outreach/src/workers/hitl.ts` — `TakeoverCompleteJobData`, `createResolutionHandlerWorker` (L111–118, L572–682).
- `workers/outreach/src/index.ts` — L186.

## Instanțe v2

- **Catalog nodeKey:** `e2:human:takeover-complete`
- **OTel (v2):** `cognitive.e2.human.takeover-complete`

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | �Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:human:takeover-complete`**, worker `createResolutionHandlerWorker`. | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `human-oversight`. | v2. | — |
| 3 | Rol declarat | Închidere review + reluare automatizare pe journey. | v2. | — |
| 4 | NeuronType + SOFAI | **Catalog:** `HumanNeuron`. | v2. | — |
| 5 | Criticitate | **Catalog:** `HIGH`. | v2 HIGH. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e2:human:takeover-complete", …)` (L576). | v2 span. | — |
| 7 | Înveliș politică | `UnrecoverableError` dacă review/journey lipsesc după update. | v2 HITL policy. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | Rezoluție persistată + audit trail. | ADR-0007. | — |
| 10 | Escaladare HITL | Închide ciclul takeover; nu enfilează alt task HITL aici. | v2. | — |
| 11 | Micro-OODA | Update review → update journey → audit. | v2 LangGraph/UI — **nu** în cod. | LangGraph: **țintă v2**. |
| 12 | Tier + de-escaladare | Eșec dur la inconsistențe DB. | v2. | — |
| 13 | Stack | BullMQ, Postgres. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.human.takeover-complete`.
- **Cod:** `withCognitiveSpan("e2:human:takeover-complete")` — **aliniat**.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
