<!-- neuron-contract:author-complete -->

# Neuron `bronze:ingest:pdf-extractor`

> **Status:** audit manual **2026-04-13** — **instanța v2 #2 (E5)**. În planul v2, bloc NEURON „duplicat #2” la L7556–7576: **Stage E5**, familie **`association-ingest`**, `SensoryNeuron`. **Același literal coadă** ca instanța E1 (`bronze:ingest:pdf-extractor`), dar **context** diferit. **Registry:** fără literal; extracție PDF în alte workeri E5 (asociații) — vezi contract E1 pentru trimiteri `g37`/`g38`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `bronze:ingest:pdf-extractor` |
| instanță v2 | **#2** — E5 / `association-ingest` |
| etapa | E5 |
| familie (v2) | `association-ingest` |
| contract_path | `contracts/neurons/E5/bronze--ingest--pdf-extractor.md` |
| ADR familie (indicativ) | [association-ingest](../../adr/families/e5/association-ingest.md) |
| instanță paralelă | [E1 `bronze--ingest--pdf-extractor`](../E1/bronze--ingest--pdf-extractor.md) |

## Scop în context real

**v2 E5:** ingestie senzorială PDF în fluxul **association-ingest**. **Cod:** nu există coadă BullMQ `bronze:ingest:pdf-extractor`; procesare PDF apare în workeri de scraping asociații (ex. `runPdfScrape`) — **aceeași tehnologie posibilă**, **altă granulație** decât „neuron bronze” izolat.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L7556–7576 (duplicat #2).
- Contract E1 (instanță 1): [`E1/bronze--ingest--pdf-extractor.md`](../E1/bronze--ingest--pdf-extractor.md) — gap registry + trimiteri E5.
- Registry: fără `bronze:ingest:pdf-extractor`.
- ADR: [`adr/families/e5/association-ingest.md`](../../adr/families/e5/association-ingest.md).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — E1 / `ingest` (primul bloc în plan)

- Vezi fișier E1; aceeași `v2_queue`, alt Stage/Family.

### Instanță 2 — E5 / `association-ingest` (L7556–7576)

- **Confirmed queue field:** `bronze:ingest:pdf-extractor`
- **Neuron type (inferat):** SensoryNeuron
- **Evidence status:** graph-export (L7576)
- **OTel (v2):** `cognitive.bronze.ingest.pdf-extractor`
- **Swimlane (metrică v2):** `association-ingest`

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI (v2).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** coadă `bronze:ingest:pdf-extractor` în registry. PDF în E5: vezi E1 contract + `g37`/`g38`. | v2 L7570. | Instanță #2 păstrează eticheta v2. |
| 2 | Etapă, familie, swimlane | Workerii PDF citați sunt E5 nurturing/asociații, nu „bronze” queue. | v2 E5 `association-ingest`. | — |
| 3 | Rol declarat | Ingest extern PDF pentru date asociații (ipoteză din pattern worker). | v2 L7568–7569. | Detaliu handler: vezi fișiere concrete în contract E1. |
| 4 | NeuronType + SOFAI | — | v2 SensoryNeuron inferat. | — |
| 5 | Criticitate | — | MEDIUM inferat. | — |
| 6 | Înveliș telemetrie | — | v2 L7575. | — |
| 7 | Înveliș politică | — | v2 L7573. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | — | — |
| 11 | Micro-OODA | — | v2 L7571. | — |
| 12 | Tier + de-escaladare | — | Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.bronze.ingest.pdf-extractor` (partajat între instanțe E1/E5 în etichetă).
- **Cod:** fără span per coadă; instrumentare pe workerii reali când sunt identificați.

---
*Audit manual 2026-04-13.*
