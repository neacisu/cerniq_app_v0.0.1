<!-- neuron-contract:author-complete -->

# Neuron `graph:centrality:calculate`

> **Status:** audit manual **2026-04-13**. **v2** coadă `graph:centrality:calculate` (L8341–8364) — aliniat cu registry **`centrality:calculate`** (L559). Worker D22, span `e5:centrality:calculate` (L77). **Bootstrap:** D22 **nu** în `index.ts` L68–91.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `graph:centrality:calculate` |
| etapa | E5 |
| familie (v2) | `graph-community` |
| contract_path | `contracts/neurons/E5/graph--centrality--calculate.md` |
| ADR familie (indicativ) | [graph-community](../../adr/families/e5/graph-community.md) |

## Scop în context real

**v2 + catalog:** degree / betweenness / pagerank pe noduri din graf (L8355–8357, catalog L2956–2958).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — (L8341–8364).
- `packages/shared/src/cognitive-node-catalog.ts` — `e5:centrality:calculate` (L2955–2963).
- `workers/shared/src/queue-registry.ts` — `E5_CENTRALITY_CALCULATE` (L559).
- `workers/e5-nurturing/src/workers/d22-centrality-calculate.ts` — `withCognitiveSpan("e5:centrality:calculate", …)` (L77).
- `workers/e5-nurturing/src/index.ts` — fără D22.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8360).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Coadă **`centrality:calculate`**; `nodeKey` **`e5:centrality:calculate`** (L2956–2957). Prefix v2 **`graph:`** (L8358). | v2 L8358. | Prefix `graph:` v2 vs coadă fără prefix. |
| 2 | Etapă, familie, swimlane | Etapa 5, **`graph-community`** (L2960–2961). | v2 L8343–8351. | — |
| 3 | Rol declarat | Calcul metrici centralitate (catalog L2958). | v2 L8355–8357. | — |
| 4 | NeuronType + SOFAI | `KnowledgeNeuron` (L2959). | v2 `KnowledgeNeuron` (L8349). | — |
| 5 | Criticitate | `MEDIUM` (L2962). | v2 `MEDIUM` (L8352). | — |
| 6 | Înveliș telemetrie | `e5:centrality:calculate` (d22 L77). | v2 **`cognitive.e5.centrality.calculate`** (L8363). | v2 folosește prefix `e5` în segmente OTel. |
| 7 | Înveliș politică | — | v2 HITL la eșecuri repetate (L8361). | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | NeMo țintă. | — |
| 10 | Escaladare HITL | — | v2 L8361. | — |
| 11 | Micro-OODA | Output `topNodes` pentru D23 (d22 antet citit în d23). | v2 L8359. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8353). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + calcule pe graf. | — | — |

### Mapare OTel

- **v2:** `cognitive.e5.centrality.calculate`.
- **Cod:** `e5:centrality:calculate`.

---
*Audit manual 2026-04-13; surse verificate în repo.*
