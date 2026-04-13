<!-- neuron-contract:author-complete -->

# Neuron `geo:neighbor:find`

> **Status:** audit manual **2026-04-13**. **v2** coadă `geo:neighbor:find` (L8143–8163). **Runtime:** **`geo:neighbor:identify`** (C16), `e5:geo:neighbor-identify` în catalog. Worker **pornit** în `index.ts` (L88).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `geo:neighbor:find` |
| etapa | E5 |
| familie (v2) | `geo` |
| contract_path | `contracts/neurons/E5/geo--neighbor--find.md` |
| ADR familie (indicativ) | [geo](../../adr/families/e5/geo.md) |

## Scop în context real

**v2:** vecini geo, `AssociativeNeuron`, Non-AI. **Cod:** inserare relații `NEIGHBOR` în `gold_entity_relationships` când scorul din `gold_proximity_scores` depășește pragul (`c16` antet L12–16, logică L72+).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`geo:neighbor:find\`` (L8143–8163).
- `packages/shared/src/cognitive-node-catalog.ts` — `e5:geo:neighbor-identify` (L2900–2906).
- `workers/shared/src/queue-registry.ts` — `E5_GEO_NEIGHBOR_IDENTIFY` (L546).
- `workers/e5-nurturing/src/index.ts` — C16 (L37–38, L88).
- `workers/e5-nurturing/src/workers/c16-geo-neighbor-identify.ts` — `withCognitiveSpan("e5:geo:neighbor-identify", …)` (L50).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8159).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`geo:neighbor:identify`**, `e5:geo:neighbor-identify` (catalog L2900–2902). **Fără** `geo:neighbor:find`. | v2 coadă (L8157). | `find` (v2) vs `identify` (runtime). |
| 2 | Etapă, familie, swimlane | `AssociativeNeuron`, **`geo-analysis`** (L2903–2904). | v2 E5 / `geo` (L8146–8147). | — |
| 3 | Rol declarat | Vecini, bidirecționalitate, `neighborCount` (`c16` L12–16). | v2 descriere geo (L8154–8156). | — |
| 4 | NeuronType + SOFAI | `AssociativeNeuron` (L2903). | v2 `AssociativeNeuron` (L8150). | — |
| 5 | Criticitate | `MEDIUM` (L2906). | v2 `MEDIUM` (L8152). | — |
| 6 | Înveliș telemetrie | `e5:geo:neighbor-identify` (L50). | v2 `cognitive.geo.neighbor.find` (L8162). | Segment `identify` vs `find`. |
| 7 | Înveliș politică | — | v2 L8158–8159. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Prag `NEIGHBOR_THRESHOLD` partajat cu C15 (`c16` L29). | NeMo țintă. | — |
| 10 | Escaladare HITL | — | v2 L8159. | — |
| 11 | Micro-OODA | Citire scor proximitate → INSERT relații. | v2 L8156. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8153). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + Drizzle + PostGIS. | — | — |

### Mapare OTel

- **v2:** `cognitive.geo.neighbor.find`.
- **Cod:** `e5:geo:neighbor-identify`.

---
*Audit manual 2026-04-13; surse verificate în repo.*
