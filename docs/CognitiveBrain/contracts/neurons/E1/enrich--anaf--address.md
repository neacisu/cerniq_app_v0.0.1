<!-- neuron-contract:author-complete -->

# Neuron `enrich:anaf:address`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:anaf:address` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--anaf--address.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** definește un `ToolNeuron` pentru îmbogățire externă ANAF cu coadă `enrich:anaf:address` și span `cognitive.enrich.anaf.address`. În **cod**, **nu** există `enrich:anaf:address` în `queue-registry.ts` / `cognitive-node-catalog.ts` (audit literal **2026-04-11**). Datele de **adresă** din ANAF sunt însă extrase și persistate de workerul unificat **D0** pe coada **`enrich:anaf:full`**: câmp `adresa` din `date_generale` → coloana `silverCompanies.adresa` și `anafFiscalSummary.adresa` în metadata (`d0-anaf-full-fetch.ts` L187–188, L212–220, L232, L283). Deci „adresa ANAF” este o **fațetă** a aceluiași job D0, nu un worker dedicat cu numele din v2.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:anaf:address\`` (L1873–1893).
- `workers/shared/src/queue-registry.ts` — `ENRICH_ANAF_FULL`; fără `enrich:anaf:address`.
- `packages/shared/src/cognitive-node-catalog.ts` — fără intrare pentru `enrich:anaf:address`; există `e1:enrich:anaf-full-fetch` / `enrich:anaf:full` (L467–475).
- `workers/enrichment/src/main.ts` — `"enrich:anaf:full": anafFullFetchProcessor` (L128).
- `workers/enrichment/src/workers/d0-anaf-full-fetch.ts` — extragere `adresa`, update DB (L182–250).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan`.

## Instanțe v2

### Instanță 1 — `enrichment` (v2 ~L1873)

- **Stage:** E1
- **Family:** enrichment
- **Inferred neuron type:** ToolNeuron
- **Inferred criticality:** MEDIUM
- **Autonomy tier:** Tier 4 (fully autonomous)
- **Contract evidence status (v2):** graph-export-grounded + architecture-enhanced; coadă ne-reconciliată cu registry în v2.

### Extras câmpuri v2 (prima instanță)

- **OODA micro-cycle:** OBSERVE: read enrichment request. ORIENT: check rate limits + cache. DECIDE: API call vs cache. ACT: merge external data.
- **Model routing:** Non-AI neuron — deterministic processing.
- **Guardrail/HITL policy:** No mandatory HITL. Audit log 90 days.
- **Prometheus metrics (v2):** `cerniq_neuron_fires_total{neuron_type="ToolNeuron",stage="E1",swimlane="enrichment"}`
- **OTel span name (v2):** `cognitive.enrich.anaf.address`

## N/A pe criterii

- **Rând 8 (Rutare model):** **N/A** — fără LLM; v2 Non-AI; D0 este apel API + mapare deterministă.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap:** fără `nodeKey`/coadă `enrich:anaf:address` în catalog. **Execuție:** `e1:enrich:anaf-full-fetch` / `enrich:anaf:full` (`cognitive-node-catalog.ts` L467–475); `withCognitiveSpan("e1:enrich:anaf-full-fetch", …)` în `d0-anaf-full-fetch.ts` L108–110. | v2 coadă `enrich:anaf:address`. | Nume v2 ≠ coadă runtime; fără ADR de mapare în repo la audit. |
| 2 | Etapă, familie, swimlane | E1; swimlane catalog D0: **`enrichment-fiscal`**; v2 familie `enrichment` + metrică swimlane `enrichment`. | v2. | Două etichete swimlane (fiscal vs enrichment). |
| 3 | Rol declarat | Catalog D0: îmbogățire completă ANAF (D1–D5 unificate). **Adresa:** parte din `date_generale` (`d0-anaf-full-fetch.ts` L187–188, L232). | v2: tool extern ANAF (adresă). | Rolul v2 e granular; codul e agregat în D0. |
| 4 | NeuronType + SOFAI | `ToolNeuron` pentru D0 (**CRITICAL** în catalog); facetă adresă = același proces. **SOFAI:** instrument extern, **System 1** operațional (apel + reguli). | v2 `ToolNeuron`, Tier 4. | Criticitate catalog D0 (**CRITICAL**) ≠ v2 **MEDIUM** pentru acest neuron-graf. |
| 5 | Criticitate | **D0 catalog:** CRITICAL. **v2** acest neuron: MEDIUM. | v2 MEDIUM. | Tensiune între granularitate v2 și criticitate agregată D0. |
| 6 | Înveliș telemetrie | Span unic D0: `cognitive:e1:enrich:anaf-full-fetch` (`cognitive-helpers.ts` + D0 L108). **Nu** spanul `cognitive.enrich.anaf.address` din v2. | v2 span dedicat facetei. | Un span acoperă toate fațetele ANAF în implementarea citită. |
| 7 | Înveliș politică | Cache Redis + rate implicit prin cache (`d0-anaf-full-fetch.ts` L32–70, L137–149). Fără Cedar/OPA în fișierul citit. | v2: fără HITL obligatoriu. | HITL granular v2 pentru alte fațete ANAF nu se aplică direct adresei în D0. |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Validare CUI, mapare status, sanitizare nr. reg. com. (`d0-anaf-full-fetch.ts` L75–83, L85–92); fără NeMo. | v2 audit 90 zile. | NeMo N/A. |
| 10 | Escaladare HITL | `d0-anaf-full-fetch.ts` citit integral (L1–349): **fără** `createHitlApprovalTask`. | ADR-0008; v2 fără HITL obligatoriu pentru acest profil. | HITL granular pentru alte fațete ANAF în v2 nu apare în D0. |
| 11 | Micro-OODA | Observe: job + CUI; Orient: cache/API ANAF; Decide: hit/miss cache; Act: update `silverCompanies` inclusiv `adresa` (L137–250). **GraphRAG:** lipsă. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Eșec API → log + `not_found` / completare surse (`L157–179`, `ANAF_SOURCES` L99–105). Fără prag LLM. | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Redis cache, HTTP ANAF (`fetchAnafSingleByCui`), Postgres. | v2 subset. | Kafka/Neo4j neaudit pentru D0 în această sesiune. |

### Mapare OTel

- **v2:** `cognitive.enrich.anaf.address`.
- **Cod:** `cognitive:e1:enrich:anaf-full-fetch` pentru toate fațetele ANAF din D0.
- **Stare 2026-04-11:** span per-facet v2 neimplementat; metadata catalog pentru D0 disponibilă dacă `getNodeByKey("e1:enrich:anaf-full-fetch")` reușește.
