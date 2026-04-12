<!-- neuron-contract:author-complete -->

# Neuron `silver:quality:tier-assign`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `silver:quality:tier-assign` |
| etapa | E1 |
| familie (v2, prima instanță) | `quality` |
| contract_path | `contracts/neurons/E1/silver--quality--tier-assign.md` |
| ADR familie (indicativ) | [quality](../../adr/families/e1/quality.md) |

## Scop în context real

**v2** `silver:quality:tier-assign` nu are coadă dedicată. **Clasificarea «tier»** de promovare (`promotionStatus`) este implementată în **`aggregate:quality-rollup`** (O2).

## Surse audit

- v2 (~L3029–3049).
- `cognitive-node-catalog.ts` — `e1:aggregate:quality-rollup` (~L888–894).
- `main.ts` — `aggregate:quality-rollup` (~L167).
- `o2-quality-rollup.ts` — ~L55–94, ~L29–31.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** literal `silver:quality:tier-assign`. **Semantica «tier» promovare:** `aggregate:quality-rollup` / `e1:aggregate:quality-rollup` (`o2-quality-rollup.ts`). | v2 tier-assign. | — |
| 2 | Etapă, familie, swimlane | E1; `dedup-scoring` pentru rollup în catalog. | v2. | — |
| 3 | Rol declarat | Calculează `total` din scoruri, setează `promotionStatus` (`eligible` / `review_required` / `blocked`) ~L55–67. | v2 clasificare prag. | — |
| 4 | NeuronType + SOFAI | Catalog rollup: `ProceduralNeuron`; v2 tier: `PredictiveNeuron`. | v2. | **Divergență** tip. |
| 5 | Criticitate | Catalog rollup `LOW`; v2 `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | `cognitive:e1:aggregate:quality-rollup` (~L29–31). | `cognitive.silver.quality.tier-assign`. | — |
| 7 | Înveliș politică | Praguri 70/40; HITL la `review_required` ~L96+ | v2. | — |
| 8 | Rutare model (dacă AI) | **N/A** în O2 la audit. v2 LLM — **divergență**. | v2. | — |
| 9 | Guardrails | Reguli deterministe eligibilitate. | ADR-0007. | — |
| 10 | Escaladare HITL | `createHitlApprovalTask` pentru review ~L96+. | ADR-0008. | — |
| 11 | Micro-OODA | Agregare scoruri → decizie tier promovare. | v2. | — |
| 12 | Tier + de-escaladare | Blocare sub prag. | v2. | — |
| 13 | Stack | BullMQ `aggregate:quality-rollup`. | v2. | — |

### Mapare OTel

- **v2:** vezi bloc `### NEURON`.
- **Cod:** indicat în tabel.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
