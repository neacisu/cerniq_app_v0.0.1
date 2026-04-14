<!-- neuron-contract:author-complete -->

# Neuron `geo:territory:map`

> **Status:** audit manual **2026-04-13**. **v2** coadă `geo:territory:map` (L8165–8185). **Runtime:** **`geo:territory:calculate`** (C17), convex hull per cluster. Worker **pornit** în `index.ts` (L89).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `geo:territory:map` |
| etapa | E5 |
| familie (v2) | `geo` |
| contract_path | `contracts/neurons/E5/geo--territory--map.md` |
| ADR familie (indicativ) | [geo](../../adr/families/e5/geo.md) |

## Scop în context real

**v2:** teritoriu geo, `AssociativeNeuron` în bloc (L8170). **Cod:** catalog folosește **`KnowledgeNeuron`** pentru C17 (L2912) — divergență față de v2. SQL: `ST_ConvexHull(ST_Collect(...))` (antet `c17` L7–8).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`geo:territory:map\`` (L8165–8185).
- `packages/shared/src/cognitive-node-catalog.ts` — `e5:geo:territory-calculate` (L2908–2915).
- `workers/shared/src/queue-registry.ts` — `E5_GEO_TERRITORY_CALCULATE` (L548).
- `workers/e5-nurturing/src/index.ts` — C17 (L38–39, L89).
- `workers/e5-nurturing/src/workers/c17-geo-territory-calculate.ts` — `withCognitiveSpan("e5:geo:territory-calculate", …)` (L38).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8181).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`geo:territory:calculate`**, `e5:geo:territory-calculate` (L2909–2910). **Fără** `geo:territory:map`. | v2 coadă (L8179). | `map` vs `calculate`. |
| 2 | Etapă, familie, swimlane | `KnowledgeNeuron`, **`geo-analysis`** (L2912–2913). | v2 `AssociativeNeuron` (L8170). | **Divergență tip** v2 vs catalog. |
| 3 | Rol declarat | Poligon teritoriu + rază km (antet C17). | v2 geo generic (L8176–8178). | — |
| 4 | NeuronType + SOFAI | `KnowledgeNeuron` (L2912). | v2 `AssociativeNeuron` (L8170). | — |
| 5 | Criticitate | Catalog **`LOW`** (L2915). | v2 **`MEDIUM`** (L8174). | Divergență. |
| 6 | Înveliș telemetrie | `e5:geo:territory-calculate` (L38). | v2 `cognitive.geo.territory.map` (L8184). | — |
| 7 | Înveliș politică | — | v2 L8180–8181. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | GEOMETRY vs GEOGRAPHY (antet C17 L10–11). | NeMo destinație. | — |
| 10 | Escaladare HITL | — | v2 L8181. | — |
| 11 | Micro-OODA | Membri cluster → hull → persistență. | v2 L8176. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8175). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + PostGIS. | — | — |

### Mapare OTel

- **v2:** `cognitive.geo.territory.map`.
- **Cod:** `e5:geo:territory-calculate`.

---
*Audit manual 2026-04-13; surse verificate în repo.*
