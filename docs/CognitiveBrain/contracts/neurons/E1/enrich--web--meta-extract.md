<!-- neuron-contract:author-complete -->

# Neuron `enrich:web:meta-extract`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:web:meta-extract` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--web--meta-extract.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** definește `enrich:web:meta-extract` (Non-AI). **La audit:** **fără** coadă, **fără** `nodeKey`, **fără** handler care parsează `<meta>` / Open Graph dedicat. `i4-contact-page-scraper.ts` elimină tag-uri HTML generic (`HTML_TAG_RE`) pentru regex pe text liber — **nu** extrage `og:title`, `description` sau meta keywords ca entități structurate. **Concluzie:** neuronul v2 **nu** are implementare E1 dedicată pentru meta.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:web:meta-extract\`` (~L2611–2630).
- `packages/shared/src/cognitive-node-catalog.ts` — **fără** `enrich:web:meta-extract`.
- `workers/enrichment/src/workers/i4-contact-page-scraper.ts` — strip tag-uri, fără parser meta (~L22–44).
- `rg` `meta-extract` / `og:title` în workers enrichment: **fără** potrivire relevantă.

## Instanțe v2

- **OTel v2:** `cognitive.enrich.web.meta-extract`.
- **Runtime:** lipsă.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** complet. | v2 meta-extract. | — |
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

- **v2:** `cognitive.enrich.web.meta-extract`.
- **Cod:** **lipsă**.
- **Stare:** **gap**.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
