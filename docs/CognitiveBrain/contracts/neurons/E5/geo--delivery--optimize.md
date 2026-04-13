<!-- neuron-contract:author-complete -->

# Neuron `geo:delivery:optimize`

> **Status:** audit manual **2026-04-13**. **v2** definește coada `geo:delivery:optimize` (L8121–8141). În **`queue-registry.ts`** **nu** există acest literal. **Cod:** proximitate și zone de acoperire sunt implementate separat: **`geo:proximity:calculate`** (C15) și **`geo:catchment:build`** (C19). Ambele sunt **pornite** în `workers/e5-nurturing/src/index.ts` (`push` L87–91).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `geo:delivery:optimize` |
| etapa | E5 |
| familie (v2) | `geo` |
| contract_path | `contracts/neurons/E5/geo--delivery--optimize.md` |
| ADR familie (indicativ) | [geo](../../adr/families/e5/geo.md) |

## Scop în context real

**v2:** neuron geo `AssociativeNeuron`, Non-AI, OTel `cognitive.geo.delivery.optimize`. **Runtime:** două cozi distincte acoperă parțial intenția (scoruri proximitate + catchment), fără denumirea „delivery:optimize”.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`geo:delivery:optimize\`` (L8121–8141).
- `packages/shared/src/cognitive-node-catalog.ts` — `e5:geo:proximity-calculate` / `geo:proximity:calculate` (L2891–2897); `e5:geo:catchment-build` / `geo:catchment:build` (L2927–2933).
- `workers/shared/src/queue-registry.ts` — `E5_GEO_PROXIMITY_CALCULATE`, `E5_GEO_CATCHMENT_BUILD` (L544–552).
- `workers/e5-nurturing/src/index.ts` — import + `push` C15, C19 (L36–40, L87, L91).
- `workers/e5-nurturing/src/workers/c15-geo-proximity-calculate.ts` — `withCognitiveSpan("e5:geo:proximity-calculate", …)` (L56).
- `workers/e5-nurturing/src/workers/c19-geo-catchment-build.ts` — `withCognitiveSpan("e5:geo:catchment-build", …)` (L47).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8137).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Fără** `geo:delivery:optimize` în registry. Cozi apropiate: **`geo:proximity:calculate`**, **`geo:catchment:build`** (L544–552). | v2 **Confirmed queue field** (L8135). | Un v2 → două cozi runtime; fără nume unic. |
| 2 | Etapă, familie, swimlane | Catalog C15/C19: etapa 5, swimlane **`geo-analysis`** (L2894–2931). | v2 E5, familie `geo` (L8123–8124). | — |
| 3 | Rol declarat | C15: KNN + `gold_proximity_scores`; C19: catchment (antete fișiere). | v2 scop geo generic (L8132–8134). | „Livrare optimizată” nu e numită în handler-e. |
| 4 | NeuronType + SOFAI | `AssociativeNeuron` (L2894, L2930). | v2 `AssociativeNeuron` (L8128). | — |
| 5 | Criticitate | C15 `MEDIUM`, C19 `LOW` (L2897, L2931). | v2 `MEDIUM` (L8130). | Nu o singură criticitate. |
| 6 | Înveliș telemetrie | Span **`e5:geo:proximity-calculate`** (c15 L56); **`e5:geo:catchment-build`** (c19 L47). | v2 `cognitive.geo.delivery.optimize` (L8140). | OTel v2 ≠ span-uri C15/C19. |
| 7 | Înveliș politică | Logică worker; fără Cedar/OPA în fișierele citite. | v2 Tier 4, fără HITL obligatoriu (L8131–8138). | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | PostGIS + formule în antet C15. | NeMo țintă ADR-0007. | — |
| 10 | Escaladare HITL | — | v2 L8138. | — |
| 11 | Micro-OODA | DB → scoruri / poligoane; fără rută livrare explicită. | v2 OODA (L8136). | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8131). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + Drizzle + PostGIS. | v2 §2.3 țintă platformă. | — |

### Mapare OTel

- **v2:** `cognitive.geo.delivery.optimize`.
- **Cod:** `e5:geo:proximity-calculate` și `e5:geo:catchment-build` în `withCognitiveSpan`.

---
*Audit manual 2026-04-13; surse verificate în repo.*
