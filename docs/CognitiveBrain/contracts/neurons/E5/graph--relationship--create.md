<!-- neuron-contract:author-complete -->

# Neuron `graph:relationship:create`

> **Status:** audit manual **2026-04-13**. **v2** coadă `graph:relationship:create` (L8523–8543). **Runtime:** **parțial acoperit** de **`graph:build:relationships`** (D20) — construire muchii din surse operaționale (catalog L2938–2940). **Nu** există coadă cu numele exact `graph:relationship:create` în `queue-registry.ts`. Span D20: `e5:graph:build-relationships` (L184). **Bootstrap:** D20 **nu** în `index.ts` L68–91.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `graph:relationship:create` |
| etapa | E5 |
| familie (v2) | `graph-community` |
| contract_path | `contracts/neurons/E5/graph--relationship--create.md` |
| ADR familie (indicativ) | [graph-community](../../adr/families/e5/graph-community.md) |

## Scop în context real

**v2:** creare relații generic. **Cod:** „build relationships” ca etapă de ingestie graf, echivalent funcțional parțial, nume diferit.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — (L8523–8543).
- `packages/shared/src/cognitive-node-catalog.ts` — D20 (L2937–2945).
- `workers/shared/src/queue-registry.ts` — `E5_GRAPH_BUILD_RELATIONSHIPS` (L555).
- `workers/e5-nurturing/src/workers/d20-graph-build-relationships.ts` — `withCognitiveSpan("e5:graph:build-relationships", …)` (L184).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8539).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`graph:build:relationships`**. **Fără** `graph:relationship:create`. | v2 L8537. | Verb `create` vs `build`. |
| 2 | Etapă, familie, swimlane | `graph-community` (L2942). | v2 L8525–8526. | — |
| 3 | Rol declarat | Muchii din orders+referrals+proximity (L2940). | v2 generic (L8534–8536). | — |
| 4 | NeuronType + SOFAI | `KnowledgeNeuron` (L2941). | v2 `KnowledgeNeuron` (L8530). | — |
| 5 | Criticitate | `HIGH` (L2944). | v2 `MEDIUM` (L8532). | Divergență. |
| 6 | Înveliș telemetrie | `e5:graph:build-relationships`. | v2 `cognitive.graph.relationship.create` (L8542). | — |
| 7 | Înveliș politică | — | v2 L8540–8541. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | NeMo destinație. | — |
| 10 | Escaladare HITL | — | v2 L8541. | — |
| 11 | Micro-OODA | Output folosit de pipeline Leiden/centralitate. | v2 L8538. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8533). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + DB. | — | — |

### Mapare OTel

- **v2:** `cognitive.graph.relationship.create`.
- **Cod:** `e5:graph:build-relationships`.

---
*Audit manual 2026-04-13; surse verificate în repo.*
