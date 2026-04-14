<!-- neuron-contract:author-complete -->

# Neuron `hitl:approval:credit-limit`

> **Status:** audit manual **2026-04-13**. **K49** — `hitlCreditLimitProcessor`; `withCognitiveSpan` primește **`e4:hitl:credit:limit`**; catalog **`e4:hitl:credit-limit`** — **divergență** pentru atribute span din catalog (vezi criteriul 6).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `hitl:approval:credit-limit` |
| etapa | E4 |
| familie (v2) | `hitl` |
| contract_path | `contracts/neurons/E4/hitl--approval--credit-limit.md` |
| ADR familie (indicativ) | [hitl](../../adr/families/e4/hitl.md) |

## Scop în context real

**v2** (L6901–L6924): aprobare CFO limită credit >50K RON, HumanNeuron, swimlane `human-oversight-e4`. **Cod:** `approvalService.createTask` cu metadata `approverRole: "CFO"`, `slaHours: 4`, `priority: "high"` (`k-hitl-workers.ts` L146–197); export modul `k49-hitl-credit-limit.ts`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`hitl:approval:credit-limit\`` (L6901–L6924).
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:hitl:credit-limit` (L2688–2696).
- `workers/shared/src/queue-registry.ts` — `E4_HITL_CREDIT_LIMIT` (L495); concurrency (L1210).
- `workers/e4-postsale/src/index.ts` — `createWorker(QUEUES.E4_HITL_CREDIT_LIMIT, hitlCreditLimitProcessor, …)` (L532–536).
- `workers/e4-postsale/src/workers/k-hitl-workers.ts` — K49 (L124–197); `withCognitiveSpan("e4:hitl:credit:limit", …)` (L149).
- `workers/e4-postsale/src/workers/k49-hitl-credit-limit.ts` — re-export procesor.
- `workers/e4-postsale/src/__tests__/fhijk-workers.test.ts` — teste HITL K48–K53 (ex. L903+).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L215–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6920).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Catalog `e4:hitl:credit-limit`; coadă `hitl:approval:credit-limit`; registry L495; `index.ts` L533. | v2 L6918. | — |
| 2 | Etapă, familie, swimlane | Catalog swimlane `human-oversight-e4` (L2693). | Idem v2 (L6911). | — |
| 3 | Rol declarat | Task HITL limită >50K, text RO în title/description (k-hitl L160–167). | v2 L6915–6917. | — |
| 4 | NeuronType + SOFAI | `HumanNeuron` (catalog L2692). | v2 L6909. | — |
| 5 | Criticitate | `CRITICAL` (catalog L2695). | v2 L6912. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:hitl:credit:limit", …)` (L149) → span **`cognitive:e4:hitl:credit:limit`**. Catalog **`e4:hitl:credit-limit`**. | v2 `cognitive.e4.hitl.credit-limit` (L6923). | Primul argument ≠ `nodeKey` catalog → atribute catalog posibil lipsă pe span. |
| 7 | Înveliș politică | `approvalService.createTask`; fără Cedar în fișier. | HITL mandatory, SLA 2h (v2 L6921). | SLA cod: `priority: "high"` + `slaHours: 4` în metadata (L170–180) vs v2 „2h” — documentat în plan K49. |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Validare flux approval service. | NeMo destinație ADR-0007. | — |
| 10 | Escaladare HITL | Task creat în `approval_tasks`; K53 pentru SLA breach (plan K53). | v2 L6921. | — |
| 11 | Micro-OODA | Job → createTask → metrică `e4HitlTasksCreatedTotal` (L184–188). | v2 L6919. | LangGraph în v2: neverificat în K49. |
| 12 | Tier + de-escaladare | — | Tier 2 (v2 L6913). | — |
| 13 | Stack (subset plan v2) | BullMQ + `@cerniq/db` approval service. | — | — |

### Mapare OTel

- **v2:** `cognitive.e4.hitl.credit-limit` (L6923).
- **Cod:** span efectiv `cognitive:e4:hitl:credit:limit` (prim argument K49).

---
*Generator inițial (hydrate):* înlocuit prin audit manual.
