<!-- neuron-contract:author-complete -->

# Neuron `enrich:anaf:caen`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:anaf:caen` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--anaf--caen.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** + **catalog** definesc `e1:enrich:anaf-caen` / `enrich:anaf:caen` — extragere CAEN ANAF. În **runtime**, workerul `workers/enrichment/src/main.ts` are procesor doar pentru **`enrich:anaf:full`** (`anafFullFetchProcessor`); **nu** există intrare `"enrich:anaf:caen": …` în harta procesoarelor. Datele CAEN sunt produse în **D0** (`d0-anaf-full-fetch.ts`): `codCaen` din `date_generale`, `isAgricultural`, patch `codCaenPrincipal`, metadata `anafCaen` (L207–209, L224, L237–238, L245–246). Cozi deprecate D1–D5 sunt marcate în catalog (comentariu L477). `queue-registry.ts` poate încă declara `ENRICH_ANAF_CAEN`, dar fără procesor în acest serviciu nu există execuție izolată pentru coada respectivă.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:anaf:caen\`` (L1895+).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:enrich:anaf-caen` (L514–521); comentariu D0 (L477).
- `workers/shared/src/queue-registry.ts` — `ENRICH_ANAF_CAEN`.
- `workers/enrichment/src/main.ts` — doar `enrich:anaf:full`.
- `workers/enrichment/src/workers/d0-anaf-full-fetch.ts` — logică CAEN + `markEnrichmentSourceComplete` pentru `anaf_caen` (L99–105, L311–314).
- `workers/enrichment/src/workers/d5-anaf-caen.ts` — antet `@deprecated` (fișier există, neînregistrat în `main.ts`).

## Instanțe v2

### Instanță 1 — `enrichment` (v2; catalog-grounded)

- **Catalog nodeKey:** `e1:enrich:anaf-caen`
- **Neuron type:** ToolNeuron
- **Swimlane:** `enrichment-fiscal`
- **Criticality:** HIGH (v2 + catalog)
- **Autonomy tier:** Tier 3 (v2)
- **OTel span name (v2):** `cognitive.e1.enrich.anaf-caen`

## N/A pe criterii

- **Rând 8:** **N/A** — Non-AI / fără LLM în D0 pentru CAEN.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Catalog:** `e1:enrich:anaf-caen` / `enrich:anaf:caen`. **Execuție activă:** `e1:enrich:anaf-full-fetch` / `enrich:anaf:full` (D0); același span L108–110. **Procesor dedicat** pentru `enrich:anaf:caen`: absent din `main.ts`. | v2 coadă canonică + catalog. | Risc: job-uri trimise doar pe `enrich:anaf:caen` fără consumator în acest worker. |
| 2 | Etapă, familie, swimlane | E1; swimlane catalog facetă: **`enrichment-fiscal`**; D0 folosește același swimlane (L472). | v2 familie `enrichment` + swimlane fiscal în catalog. | — |
| 3 | Rol declarat | Catalog facetă: „Extragere coduri CAEN de la ANAF”. D0: setează `codCaenPrincipal`, `metadata.anafCaen` (L207–209, L237–246). | v2 operațional + cognitive function catalog. | — |
| 4 | NeuronType + SOFAI | `ToolNeuron`; **System 1** (instrument ANAF). | v2. | — |
| 5 | Criticitate | Catalog facetă: **HIGH**; D0 unificat: **CRITICAL** (L474). | v2 HIGH. | Criticitate agregată D0 mai mare decât facetă. |
| 6 | Înveliș telemetrie | Span D0: `cognitive:e1:enrich:anaf-full-fetch`. **Nu** `cognitive.e1.enrich.anaf-caen` separat. | v2 span facetă. | Observabilitate per-facet neimplementată în D0. |
| 7 | Înveliș politică | Cache Redis + flux API; fără OPA în D0. v2 facetă: HITL la anomalii — **nu** observat în D0 (fișier L1–349). | v2 Tier 3 + HITL la anomalii pentru intrarea catalog. | Tensiune politică v2 vs implementare D0. |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Mapare cod CAEN + flag agricol (`isAgriculturalCaen`, L94–97). | v2 + ADR-0007. | NeMo N/A. |
| 10 | Escaladare HITL | D0: fără `createHitlApprovalTask` (audit fișier complet). | v2 HITL la anomalii pentru această intrare catalog. | HITL v2 neobservat în D0. |
| 11 | Micro-OODA | Extract CAEN în ramura D0 (Observe/Orient prin record ANAF; Act: update silver + `anaf_caen` completare surse). GraphRAG: lipsă. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Tratare erori: catch + log + throw (L336–345); surse marcate complete chiar și la `not_found` (L171–173). | v2 Tier 3 + trigger-e. | Trigger-e v2 (încredere, 2σ) **N/A** fără model. |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Redis, HTTP ANAF, Postgres. | v2. | — |

### Mapare OTel

- **v2:** `cognitive.e1.enrich.anaf-caen`.
- **Cod:** `cognitive:e1:enrich:anaf-full-fetch` (D0).
- **Stare 2026-04-11:** span per-facet lipsește; folosiți log structurat / atribute custom dacă se cere separarea.
