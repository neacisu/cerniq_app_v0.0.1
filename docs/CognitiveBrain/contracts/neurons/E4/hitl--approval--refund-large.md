<!-- neuron-contract:author-complete -->

# Neuron `hitl:approval:refund-large`

> **Status:** audit manual **2026-04-13**. **K50** — prag **1000 RON** (`REFUND_HITL_THRESHOLD_RON`, L223); `withCognitiveSpan` **`e4:hitl:refund:large`** vs catalog **`e4:hitl:refund-large`**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `hitl:approval:refund-large` |
| etapa | E4 |
| familie (v2) | `hitl` |
| contract_path | `contracts/neurons/E4/hitl--approval--refund-large.md` |
| ADR familie (indicativ) | [hitl](../../adr/families/e4/hitl.md) |

## Scop în context real

**v2** (L6951–L6974): aprobare rambursare mare, FINANCE_MANAGER, SLA 4h. **Cod:** `hitlRefundLargeProcessor` — `approvalService.createTask` pentru `gold_orders`, `approverRole: "FINANCE_MANAGER"` (`k-hitl-workers.ts` L222–281).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`hitl:approval:refund-large\`` (L6951–L6974).
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:hitl:refund-large` (L2697–2705).
- `workers/shared/src/queue-registry.ts` — `E4_HITL_REFUND_LARGE` (L497); concurrency (L1212).
- `workers/e4-postsale/src/index.ts` — L539–544.
- `workers/e4-postsale/src/workers/k-hitl-workers.ts` — K50; `withCognitiveSpan("e4:hitl:refund:large", …)` (L228–229).
- `workers/e4-postsale/src/workers/k50-hitl-refund-large.ts` — re-export.
- `workers/e4-postsale/src/__tests__/fhijk-workers.test.ts` — suite HITL.
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan`.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6970).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Catalog `e4:hitl:refund-large`; registry L497. | v2 L6968. | — |
| 2 | Etapă, familie, swimlane | Catalog `human-oversight-e4` (L2702). | v2 L6961. | — |
| 3 | Rol declarat | Prag 1000 RON (L223); descriere job (L240–247). | v2 L6965–6967. | — |
| 4 | NeuronType + SOFAI | `HumanNeuron` (L2701). | v2 L6959. | — |
| 5 | Criticitate | Catalog `HIGH` (L2704). | v2 L6962. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:hitl:refund:large", …)` (L228) vs catalog `e4:hitl:refund-large`. | v2 `cognitive.e4.hitl.refund-large` (L6973). | Nealiniere. |
| 7 | Înveliș politică | `priority: "high"`, SLA 4h în metadata (L251–264). | v2 L6971 (anomalii + SLA 4h în text). | Formulare v2 diferă de K50 pe guardrail. |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | ADR-0007. | — |
| 10 | Escaladare HITL | Task approval standard. | v2 L6971. | — |
| 11 | Micro-OODA | Job → createTask → metrică (L268–272). | v2 L6969. | — |
| 12 | Tier + de-escaladare | — | Tier 3 (v2 L6963). | — |
| 13 | Stack (subset plan v2) | BullMQ E4. | — | — |

### Mapare OTel

- **v2:** `cognitive.e4.hitl.refund-large` (L6973).
- **Cod:** `cognitive:e4:hitl:refund:large` (K50).

---
*Generator inițial (hydrate):* înlocuit prin audit manual.
