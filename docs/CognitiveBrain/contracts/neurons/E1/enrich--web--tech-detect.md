<!-- neuron-contract:author-complete -->

# Neuron `enrich:web:tech-detect`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:web:tech-detect` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--web--tech-detect.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** definește `enrich:web:tech-detect` (CMS/stack detection). **Audit:** **fără** coadă, **fără** logică tip Wappalyzer sau fingerprint framework în `workers/enrichment` (căutare euristică `wordpress`, `wappalyzer`, `tech-detect` în TS enrichment: **fără** rezultat la `rg`). **Concluzie:** **gap** implementare.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:web:tech-detect\`` (~L2655–2674).
- `rg` -i `tech-detect|wappalyzer|cms\\b|wordpress` în `workers/enrichment/**/*.ts`: **fără** potrivire relevantă la audit.
- `packages/shared/src/cognitive-node-catalog.ts` — **fără** intrare.

## Instanțe v2

- **OTel v2:** `cognitive.enrich.web.tech-detect`.
- **Runtime:** lipsă.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** complet. | v2 tech-detect. | — |
| 2 | Etapă, familie, swimlane | v2 E1; cod: — | v2. | — |
| 3 | Rol declarat | v2: enrichment web. Cod: — | v2. | — |
| 4 | NeuronType + SOFAI | v2 ToolNeuron. Cod: — | v2. | — |
| 5 | Criticitate | v2 MEDIUM. Cod: — | v2. | — |
| 6 | Înveliș telemetrie | Fără handler. | ADR-0003. | — |
| 7 | Înveliș politică | — | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | ADR-0007. | — |
| 10 | Escaladare HITL | — | ADR-0008. | — |
| 11 | Micro-OODA | — | v2 OODA. | — |
| 12 | Tier + de-escaladare | — | v2 §2.2. | — |
| 13 | Stack | — | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.enrich.web.tech-detect`.
- **Cod:** **lipsă**.
- **Stare:** **gap**.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
