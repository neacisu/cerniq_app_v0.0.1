<!-- neuron-contract:author-complete -->

# Neuron `graph:build:full`

> **Status:** audit manual **2026-04-13**. **v2** coadă `graph:build:full` (L8319–8339). **Runtime:** **`graph:build:relationships`** (D20), `e5:graph:build-relationships` — construire noduri+muchii (catalog L2937–2945). **Bootstrap E5:** D20 **nu** în `workers/e5-nurturing/src/index.ts` L68–91; worker `d20-graph-build-relationships.ts`, span `e5:graph:build-relationships` (L184).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `graph:build:full` |
| etapa | E5 |
| familie (v2) | `graph-community` |
| contract_path | `contracts/neurons/E5/graph--build--full.md` |
| ADR familie (indicativ) | [graph-community](../../adr/families/e5/graph-community.md) |

## Scop în context real

**v2:** „full graph build” generic. **Cod:** etapă explicită de **relații** din surse declarate în catalog (orders, referrals, proximity), nu eticheta `build:full`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — (L8319–8339).
- `packages/shared/src/cognitive-node-catalog.ts` — D20 (L2937–2945).
- `workers/shared/src/queue-registry.ts` — `E5_GRAPH_BUILD_RELATIONSHIPS` (L555).
- `workers/e5-nurturing/src/workers/d20-graph-build-relationships.ts` — `withCognitiveSpan("e5:graph:build-relationships", …)` (L184).
- `workers/e5-nurturing/src/lib/e5-metrics.ts` — `cerniq_e5_graph_build_seconds`, `cerniq_e5_etapa5_graph_build_seconds` (L103–107, L400–406).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8335).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`graph:build:relationships`** (L555). **Fără** `graph:build:full`. | v2 L8333. | Sufix `full` vs `relationships`. |
| 2 | Etapă, familie, swimlane | `KnowledgeNeuron`, **`graph-community`** (L2941–2942). | v2 L8321–8322. | — |
| 3 | Rol declarat | Build relații din orders+referrals+proximity (catalog L2940). | v2 generic (L8330–8332). | — |
| 4 | NeuronType + SOFAI | `KnowledgeNeuron` (L2941). | v2 `KnowledgeNeuron` (L8326). | — |
| 5 | Criticitate | Catalog **`HIGH`** (L2944). | v2 **`MEDIUM`** (L8328). | Divergență. |
| 6 | Înveliș telemetrie | `e5:graph:build-relationships` (d20 L184). | v2 `cognitive.graph.build.full` (L8338). | — |
| 7 | Înveliș politică | — | v2 L8336–8337. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Logică SQL/graph în D20 (fișier citit parțial). | NeMo destinație. | — |
| 10 | Escaladare HITL | — | v2 L8337. | — |
| 11 | Micro-OODA | Persistență muchii → input pentru D21/D22. | v2 L8334. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8329). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + DB; metrică build în `e5-metrics.ts`. | — | — |

### Mapare OTel

- **v2:** `cognitive.graph.build.full`.
- **Cod:** `e5:graph:build-relationships`.

---
*Audit manual 2026-04-13; surse verificate în repo.*
