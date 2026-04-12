<!-- neuron-contract:author-complete -->

# Neuron `bronze:ingest:html-scraper`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `bronze:ingest:html-scraper` |
| etapa | E1 |
| familie (v2, prima instanță) | `ingest` |
| contract_path | `contracts/neurons/E1/bronze--ingest--html-scraper.md` |
| ADR familie (indicativ) | [ingest](../../adr/families/e1/ingest.md) |

## Scop în context real

**v2** descrie un neuron SensoryNeuron de ingestie Bronze cu coada **`bronze:ingest:html-scraper`**. **La audit în repo (2026-04-11)** nu există coadă BullMQ, `nodeKey` sau procesor cu acest nume (`rg` pe literal în `*.ts`: **lipsă**). **HTML** este însă consumat în fluxul de **enrichment extern**: `scrape:website:finder` / `scrape:website:contact-page` (I3/I4), cu `ToolNeuron` și swimlane `enrichment-external` în catalog — **nu** «bronze bulk ingest» ca la CSV. **Concluzie:** neuronul v2 **nu are implementare 1:1**; există doar **căi adiacente** de scraping HTML pentru companii.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`bronze:ingest:html-scraper\`` (~L2721–2741).
- `packages/shared/src/cognitive-node-catalog.ts` — **fără** `bronze:ingest:html-scraper`; intrări `e1:scrape:website-finder`, `e1:scrape:website-contact` (~L696–711).
- `workers/shared/src/queue-registry.ts` — `SCRAPE_WEBSITE_FINDER`, `SCRAPE_WEBSITE_CONTACT_PAGE` (~L62–63); **fără** `bronze:ingest:html-scraper`.
- `workers/enrichment/src/main.ts` — `"scrape:website:finder"`, `"scrape:website:contact-page"` (~L147–148).
- `workers/enrichment/src/workers/i3-website-finder.ts` — `withCognitiveSpan("e1:scrape:website-finder", …)` (~L60–63).
- `workers/enrichment/src/workers/i4-contact-page-scraper.ts` — `withCognitiveSpan("e1:scrape:website-contact", …)` (~L59–62).
- `rg` `bronze:ingest:html-scraper` în repo: **fără** potrivire relevantă.

## Instanțe v2

- **OTel span name (v2):** `cognitive.bronze.ingest.html-scraper`
- **Evidence status:** graph-export-grounded; reconciliere registry nefinalizată în v2.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** pentru `bronze:ingest:html-scraper`. **Semnale:** `e1:scrape:website-finder`, `e1:scrape:website-contact` (cozi diferite). | v2 canonic. | Fără unitate 1:1. |
| 2 | Etapă, familie, swimlane | I3/I4: E1, catalog `enrichment-external`. v2: familie `ingest`, swimlane ingest în metrică. | v2 ingest Bronze. | **Divergență** familie/swimlane față de scrape. |
| 3 | Rol declarat | Catalog scrape: descoperire site / extragere contact; **nu** «ingest fișier HTML bronze» generic. | v2 ingest Bronze. | — |
| 4 | NeuronType + SOFAI | Catalog scrape: `ToolNeuron`. v2: `SensoryNeuron`. | v2. | Tipuri diferite între v2 și căile reale. |
| 5 | Criticitate | Catalog scrape: `MEDIUM`. v2: `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | Span-uri `cognitive:e1:scrape:website-finder` / `cognitive:e1:scrape:website-contact`. **Fără** span `cognitive.bronze.ingest.html-scraper`. | ADR-0003. | Nealinat v2. |
| 7 | Înveliș politică | Breaker/timeout în i3/i4; **fără** neuron dedicat v2. | v2 Tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | HTTP/circuit breaker pe căile I3/I4. | ADR-0007. | Neuron v2: lipsă. |
| 10 | Escaladare HITL | Neuron v2: lipsă; HITL transversal separat. | ADR-0008. | — |
| 11 | Micro-OODA | Scrape orientat companii (finder → contact), nu OODA bronze-ingest generic din v2. | v2 OODA ingest. | — |
| 12 | Tier + de-escaladare | Fără prag explicit per-neuron v2. | v2 §2.2. | — |
| 13 | Stack | `fetch`, BullMQ (cozi scrape), Redis, Postgres (entități legate). | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.bronze.ingest.html-scraper`.
- **Cod:** **lipsă** pentru `v2_queue`; scraping HTML sub `cognitive:e1:scrape:website-finder` / `cognitive:e1:scrape:website-contact`.
- **Stare:** **gap** canonic; **semnale înrudite** documentate mai sus.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
