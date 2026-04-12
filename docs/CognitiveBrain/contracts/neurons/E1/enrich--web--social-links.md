<!-- neuron-contract:author-complete -->

# Neuron `enrich:web:social-links`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:web:social-links` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--web--social-links.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** cere `enrich:web:social-links`. **În cod:** nu există coadă sau extracție dedicată de link-uri sociale din website. `i3-website-finder.ts` **exclude** domenii sociale din candidații Bing (`facebook.com`, `linkedin.com`, etc. ~L104–111) — comportament opus unei colectări «social-links». Alte fluxuri (ex. Hunter) pot popula `linkedinUrl` pe contacte — **alt** neuron (`g1-hunter-email-finder` etc.), **nu** `enrich:web:social-links`. **Concluzie:** **gap** pentru neuronul v2.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:web:social-links\`` (~L2633–2652).
- `workers/enrichment/src/workers/i3-website-finder.ts` — listă `excluded` cu rețele sociale (~L104–111).
- `workers/enrichment/src/workers/g1-hunter-email-finder.ts` — `linkedinUrl` din Hunter (~L88–112); **alt** flux, altă sursă.
- `rg` `enrich:web:social-links` în `*.ts`: **fără**.

## Instanțe v2

- **OTel v2:** `cognitive.enrich.web.social-links`.
- **Runtime:** lipsă.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** complet. | v2 social-links. | — |
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

- **v2:** `cognitive.enrich.web.social-links`.
- **Cod:** **lipsă**.
- **Stare:** **gap**.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
