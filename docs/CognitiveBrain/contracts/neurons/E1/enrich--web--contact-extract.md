<!-- neuron-contract:author-complete -->

# Neuron `enrich:web:contact-extract`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:web:contact-extract` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--web--contact-extract.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** definește `enrich:web:contact-extract` (Non-AI, span `cognitive.enrich.web.contact-extract`). **În runtime**, extracția de contact din HTML este implementată ca **`scrape:website:contact-page`** — `contactPageScraperProcessor` în `i4-contact-page-scraper.ts`, span **`e1:scrape:website-contact`**. Job-ul primește `websiteUrl`, încearcă rute `/contact`, `/contacte`, etc., face `fetch` + regex pentru email, telefon RO, adresă, apoi actualizează `silverCompanies` și `metadata.contactScraper`. **Nu** există coada literală `enrich:web:contact-extract` în registry.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:web:contact-extract\`` (~L2567–2586).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:scrape:website-contact` / `scrape:website:contact-page` (~L704–711).
- `workers/shared/src/queue-registry.ts` — `SCRAPE_WEBSITE_CONTACT_PAGE` (~L63).
- `workers/enrichment/src/main.ts` — `"scrape:website:contact-page"` (~L148).
- `workers/enrichment/src/workers/i3-website-finder.ts` — enqueue către `scrape:website:contact-page` (~L162–171).
- `workers/enrichment/src/workers/i4-contact-page-scraper.ts` — `withCognitiveSpan("e1:scrape:website-contact", …)` (~L59–62); `extractFromHtml` (~L37–45).
- `rg` `enrich:web:contact-extract` în `*.ts`: **fără** potrivire.

## Instanțe v2

- **OTel v2:** `cognitive.enrich.web.contact-extract`.
- **OTel cod:** `e1:scrape:website-contact`.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** literal v2. Runtime: `e1:scrape:website-contact` ↔ `scrape:website:contact-page`. | v2 contact-extract. | Nume v2 ≠ registry. |
| 2 | Etapă, familie, swimlane | Catalog: E1 `enrichment-external`. | v2 E1 enrichment. | — |
| 3 | Rol declarat | «Extragere date contact de pe website» (catalog). | v2. | — |
| 4 | NeuronType + SOFAI | `ToolNeuron`. | v2 ToolNeuron. | — |
| 5 | Criticitate | Catalog `MEDIUM`; v2 `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | Span `e1:scrape:website-contact` vs v2 `cognitive.enrich.web.contact-extract`. | ADR-0003. | Nealinat literal. |
| 7 | Înveliș politică | Circuit breaker + timeout fetch; fără HITL în handler. | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Regex filtre (ex. exclude `example.com`); logging. | ADR-0007. | — |
| 10 | Escaladare HITL | Fără. | ADR-0008. | — |
| 11 | Micro-OODA | Fetch HTML → strip tags → regex → DB. | v2 OODA generic. | — |
| 12 | Tier + de-escaladare | Fără prag încredere. | v2 §2.2. | — |
| 13 | Stack | BullMQ, `fetch`, Postgres. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.enrich.web.contact-extract`.
- **Cod:** `e1:scrape:website-contact`.
- **Stare:** **nealinat** (nume).

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
