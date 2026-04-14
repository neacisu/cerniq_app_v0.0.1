<!-- neuron-contract:author-complete -->

# Neuron `association:territory:infer`

> **Status:** audit manual **2026-04-13**. **v2** coadă `association:territory:infer` (L8297–8317). **Cod:** **fără** acest literal în registry sau TS. **Apropiere semantică (fără echivalență de nume):** (1) **`geo:territory:calculate`** (C17) — teritorii cluster; **pornit** în `index.ts` L89; (2) **`association:coverage:update`** (G42) — actualizare `gold_association_coverage` (catalog L3142–3148); worker `g42-association-coverage-update.ts`, span `e5:association:coverage-update` (L53). **Bootstrap:** G42 **nu** în `push()`; C17 **da**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `association:territory:infer` |
| etapa | E5 |
| familie (v2) | `graph-community` |
| contract_path | `contracts/neurons/E5/association--territory--infer.md` |
| ADR familie (indicativ) | [graph-community](../../adr/families/e5/graph-community.md); [geo](../../adr/families/e5/geo.md) |

## Scop în context real

**v2:** inferență teritoriu în subgraph graph-community. **Runtime:** teritorii geo (C17) și acoperire asociații (G42) sunt **unități separate** cu nume de coadă diferite.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — (L8297–8317).
- `packages/shared/src/cognitive-node-catalog.ts` — C17 `e5:geo:territory-calculate` (L2908–2915); G42 `e5:association:coverage-update` (L3141–3148).
- `workers/shared/src/queue-registry.ts` — `E5_GEO_TERRITORY_CALCULATE` (L548); `E5_ASSOCIATION_COVERAGE_UPDATE` (L602).
- `workers/e5-nurturing/src/workers/c17-geo-territory-calculate.ts` — `withCognitiveSpan("e5:geo:territory-calculate", …)` (L38).
- `workers/e5-nurturing/src/workers/g42-association-coverage-update.ts` — `withCognitiveSpan("e5:association:coverage-update", …)` (L53).
- `workers/e5-nurturing/src/index.ts` — C17 L89; fără G42.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8313).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Fără** `association:territory:infer`. Cozi: **`geo:territory:calculate`**, **`association:coverage:update`**. | v2 L8311. | Două candidați, niciunul = nume v2. |
| 2 | Etapă, familie, swimlane | C17: `geo-analysis` (L2913); G42: `association-scraping` (L3146). | v2 `graph-community` (L8300). | — |
| 3 | Rol declarat | Convex hull / coverage (antete C17, G42). | v2 generic (L8308–8310). | — |
| 4 | NeuronType + SOFAI | C17 `KnowledgeNeuron`; G42 `MaintenanceNeuron` (L2912, L3145). | v2 `KnowledgeNeuron` (L8304). | G42 ≠ tip v2. |
| 5 | Criticitate | C17 `LOW`; G42 `LOW` (L2915, L3148). | v2 `MEDIUM` (L8306). | — |
| 6 | Înveliș telemetrie | `e5:geo:territory-calculate`; `e5:association:coverage-update`. | v2 `cognitive.association.territory.infer` (L8316). | — |
| 7 | Înveliș politică | — | v2 L8314–8315. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | PostGIS / SQL în worker-e. | NeMo destinație. | — |
| 10 | Escaladare HITL | — | v2 L8315. | — |
| 11 | Micro-OODA | C17 activ în bootstrap; G42 doar dacă worker pornit. | v2 L8312. | G42 neînregistrat în bootstrap citit. |
| 12 | Tier + de-escaladare | — | Tier 4 (L8307). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + Drizzle + PostGIS (C17). | — | — |

### Mapare OTel

- **v2:** `cognitive.association.territory.infer`.
- **Cod:** `e5:geo:territory-calculate` și/sau `e5:association:coverage-update` — **nu** același nume.

---
*Audit manual 2026-04-13; surse verificate în repo.*
