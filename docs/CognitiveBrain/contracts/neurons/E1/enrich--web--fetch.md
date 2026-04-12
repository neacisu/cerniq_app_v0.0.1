<!-- neuron-contract:author-complete -->

# Neuron `enrich:web:fetch`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:web:fetch` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--web--fetch.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** definește `enrich:web:fetch` ca «apel extern generic». **Nu** există coadă sau `nodeKey` cu acest nume. **HTTP GET** pentru pagini web apare **în** `i3-website-finder.ts` (`verifyCompanyWebsite`, `fetch` + verificare conținut ~L25–40) și **în** `i4-contact-page-scraper.ts` (circuit breaker `fetch` ~L47–54). Ambele folosesc span-uri **`e1:scrape:website-finder`** respectiv **`e1:scrape:website-contact`**, nu `enrich:web:fetch`. **Concluzie:** «fetch» v2 este **capabilitate transversală** în fluxul scrape, **fără** neuron izolat canonic în cod.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:web:fetch\`` (~L2589–2608).
- `packages/shared/src/cognitive-node-catalog.ts` — **fără** `enrich:web:fetch` (~L695–712 pentru scrape website).
- `workers/shared/src/queue-registry.ts` — `scrape:website:*` (~L62–63).
- `workers/enrichment/src/workers/i3-website-finder.ts` — `fetch` în `verifyCompanyWebsite` (~L27–29).
- `workers/enrichment/src/workers/i4-contact-page-scraper.ts` — `fetch` în breaker (~L49–51).
- `rg` `enrich:web:fetch` în `*.ts`: **fără**.

## Instanțe v2

- **OTel v2:** `cognitive.enrich.web.fetch`.
- **OTel cod:** încorporat în scrape (vezi Mapare).

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** `enrich:web:fetch`. Dovezi parțiale: `e1:scrape:website-finder`, `e1:scrape:website-contact`. | v2 fetch. | Fără unitate 1:1. |
| 2 | Etapă, familie, swimlane | Prin scrape: E1 `enrichment-external`. | v2 E1. | — |
| 3 | Rol declarat | Descărcare HTTP în subpași ai finder/contact. | v2 generic. | — |
| 4 | NeuronType + SOFAI | `ToolNeuron` pe căile scrape. | v2 ToolNeuron. | — |
| 5 | Criticitate | Catalog scrape: `MEDIUM`; v2 `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | Span-uri scrape, **nu** `cognitive.enrich.web.fetch`. | ADR-0003. | Nealinat. |
| 7 | Înveliș politică | Timeout-uri env; breaker pe contact. | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Tratare HTTP/network în i3/i4. | ADR-0007. | — |
| 10 | Escaladare HITL | Fără. | ADR-0008. | — |
| 11 | Micro-OODA | GET → parse/verify. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Fără prag explicit. | v2 §2.2. | — |
| 13 | Stack | `fetch`, BullMQ, Bing API (finder). | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.enrich.web.fetch`.
- **Cod:** **fără** span dedicat; fetch în `e1:scrape:website-finder` / `e1:scrape:website-contact`.
- **Stare:** **gap** canonic.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
