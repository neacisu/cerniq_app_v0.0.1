<!-- neuron-contract:author-complete -->

# Neuron `bronze:ingest:pdf-extractor`

> **Status:** audit manual **2026-04-11** (instanță **E1** din v2).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `bronze:ingest:pdf-extractor` |
| etapa | E1 |
| familie (v2, prima instanță) | `ingest` |
| contract_path | `contracts/neurons/E1/bronze--ingest--pdf-extractor.md` |
| ADR familie (indicativ) | [ingest](../../adr/families/e1/ingest.md) |

## Scop în context real

**v2 (E1)** descrie **`bronze:ingest:pdf-extractor`** ca SensoryNeuron de ingestie Bronze (extragere text din PDF). **La audit în repo (2026-04-11)** nu există coadă BullMQ, `nodeKey` E1 sau worker în `workers/enrichment` pentru acest literal. **Extragere din PDF** apare în alte contexte (ex. workeri **E5** asociații: descărcare PDF + subprocess Python `pdf_scraper.py` în `g37-association-ouai-scrape.ts` / `g38-association-madr-scrape.ts`) — **etapă, familie și cozi diferite** față de neuronul E1 v2. **Concluzie:** neuronul **E1** din v2 este **neimplementat** ca unitate izolată; PDF în sistem este **în altă swimlane**, fără echivalență automată.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`bronze:ingest:pdf-extractor\`` (~L2764–2785, instanță E1/ingest).
- `packages/shared/src/cognitive-node-catalog.ts` — **fără** `bronze:ingest:pdf-extractor` sau ingest PDF E1.
- `workers/shared/src/queue-registry.ts` — **fără** `bronze:ingest:pdf-extractor`.
- `workers/enrichment/src/main.ts` — **fără** procesor PDF bronze; ingest A1–A5: csv, excel, webhook, api, manual.
- `rg` `bronze:ingest:pdf-extractor` în `workers/enrichment`: **fără**.
- `workers/e5-nurturing/src/workers/g37-association-ouai-scrape.ts`, `g38-association-madr-scrape.ts` — PDF + `runPdfScrape` (context **E5**, nu E1).

## Instanțe v2

- **OTel span name (v2):** `cognitive.bronze.ingest.pdf-extractor`
- **Evidence status:** graph-export-grounded; reconciliere registry nefinalizată în v2.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** E1: fără `nodeKey`/coadă pentru `bronze:ingest:pdf-extractor`. | v2 canonic E1. | Altă etapă (E5) are PDF; **nu** substituie acest contract. |
| 2 | Etapă, familie, swimlane | Neuron v2 E1 ingest; cod: **lipsă** worker E1. | v2. | — |
| 3 | Rol declarat | v2: ingest Bronze PDF. Cod E1: **lipsă**. | v2. | — |
| 4 | NeuronType + SOFAI | v2: `SensoryNeuron`. Cod: **neinstanțiat** E1. | v2. | — |
| 5 | Criticitate | v2: `MEDIUM`. Cod E1: neaplicabil ca unitate. | v2. | — |
| 6 | Înveliș telemetrie | **Fără** `withCognitiveSpan` pentru acest `v2_queue` în E1. | ADR-0003. | Doar destinație documentată până la implementare. |
| 7 | Înveliș politică | Neuron dedicat: lipsă. | v2 Tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Neuron E1 dedicat: lipsă. | ADR-0007. | — |
| 10 | Escaladare HITL | Neuron E1 dedicat: lipsă. | ADR-0008. | — |
| 11 | Micro-OODA | Neuron E1 dedicat: lipsă. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Neuron E1 dedicat: lipsă. | v2 §2.2. | — |
| 13 | Stack | BullMQ/Postgres în alte fluxuri E1; PDF scraping E5 folosește Python subprocess — **în afara** scope E1 acestui neuron. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.bronze.ingest.pdf-extractor`.
- **Cod (E1):** **lipsă** handler → fără `cognitive.nodeKey` operațional pentru acest `v2_queue` la E1.
- **Stare:** **doar destinație documentată** / gap documentat pentru E1.

### Semnale înrudite (nu înlocuiesc neuronul E1 v2)

- **E5 PDF** (asociații): `g37-association-ouai-scrape.ts`, `g38-association-madr-scrape.ts` — contract separat pentru instanța **E5** `bronze:ingest:pdf-extractor` (duplicat v2).

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
