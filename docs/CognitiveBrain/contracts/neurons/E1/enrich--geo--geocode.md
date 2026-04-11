<!-- neuron-contract:author-complete -->

# Neuron `enrich:geo:geocode`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:geo:geocode` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--geo--geocode.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** definește coada canonică `enrich:geo:geocode` (ToolNeuron, Non-AI, «not yet reconciled with runtime registry»). **În repo**, geocodarea operațională este implementată ca **Nominatim (OpenStreetMap)**: coada BullMQ **`geo:geocode:nominatim`**, procesor `nominatimGeocodingProcessor` — construiește interogare din `adresa` / `localitate` / `judet`, apelează `https://nominatim.openstreetmap.org/search`, persistă `latitude` / `longitude` și `metadata.geocoding` pe `silverCompanies`, înregistrează `silverEnrichmentLog` (`source: nominatim_geocoding`, `operation: geocode`), apoi enfilează **`geo:zones:postgis`** pentru zone. Orchestratorul `p1-orchestrate` enfilează `geo:geocode:nominatim` când există adresă sau localitate (`hasAddress`). **Divergență nume:** string-ul literal `enrich:geo:geocode` **nu** apare în `queue-registry.ts`; runtime = **`geo:geocode:nominatim`** / **`e1:geo:geocode-nominatim`** în catalog.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:geo:geocode\`` (~L2171–2191).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:geo:geocode-nominatim` / `geo:geocode:nominatim` (~L752–761).
- `workers/shared/src/queue-registry.ts` — `GEO_GEOCODE_NOMINATIM`, `withProvider(..., "nominatim")` (~L68, ~L736).
- `workers/shared/src/rate-limiter.ts` — `nominatim: { max: 1, duration: 1000 }` (~L17).
- `workers/enrichment/src/main.ts` — `"geo:geocode:nominatim": nominatimGeocodingProcessor` (~L153).
- `workers/enrichment/src/workers/k1-nominatim-geocoding.ts` — `withCognitiveSpan("e1:geo:geocode-nominatim", …)`, fetch Nominatim, update DB (~L44–187).
- `workers/enrichment/src/workers/p1-orchestrate.ts` — `addQueueJob("geo:geocode:nominatim", …)` (~L130–132).
- `apps/api/src/routes/imports-bronze.ts` — worker list `K1:nominatim-geocoding` (~L1942–1943, ~L2114).

## Instanțe v2

- **Catalog (runtime):** `nodeKey` **`e1:geo:geocode-nominatim`**, coadă **`geo:geocode:nominatim`**.
- **OTel span name (v2 plan):** `cognitive.enrich.geo.geocode`
- **Evidence status (v2):** graph-export-grounded; reconciliere registry anunțată ca nefinalizată.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI; `k1-nominatim-geocoding.ts` fără apel LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **v2_queue** `enrich:geo:geocode`; literal **lipsă** în registry. Runtime: **`geo:geocode:nominatim`**, catalog **`e1:geo:geocode-nominatim`**. | v2 vs catalog. | v2 §2.4 până la unificare nume. |
| 2 | Etapă, familie, swimlane | E1; worker enrichment; swimlane catalog **`enrichment-external`**. | v2 E1 `enrichment`. | — |
| 3 | Rol declarat | Catalog: «Geocodificare adrese cu Nominatim/OSM». Cod: query OSM + persistă coordonate + lanț `geo:zones:postgis`. | v2 operational purpose (generic enrichment extern). | — |
| 4 | NeuronType + SOFAI | `ToolNeuron`; System1 (reactiv) conform convenției v2 §2.1 pentru ToolNeuron. | v2. | — |
| 5 | Criticitate | Catalog **`LOW`**; v2 **`MEDIUM`** — **neconcordanță** documentată. | v2 MEDIUM. | Alegere criticitate runtime vs v2 necesită decizie ADR/governance. |
| 6 | Înveliș telemetrie | **`withCognitiveSpan("e1:geo:geocode-nominatim", …)`** (~L45–46). Span v2 (`cognitive.enrich.geo.geocode`) ≠ string span în cod. | ADR-0003. | Aliniere denumiri. |
| 7 | Înveliș politică | `callExternalApi("nominatim", …)`, rate limit dedicat (`rate-limiter.ts`), `NOMINATIM_USER_AGENT`, `NOMINATIM_TIMEOUT_MS`; fără OPA în fișier. | v2 tier 4 / policy text. | — |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Skip dacă nu există părți de adresă (~L74–79); circuit breaker config `nominatim` în `circuit-breaker.ts`. | ADR-0007. | — |
| 10 | Escaladare HITL | Fără HITL în procesor. | ADR-0008. | — |
| 11 | Micro-OODA | Citește job → construiește query → fetch → persistă → enqueue zone → log. | v2 OODA (API vs cache — cache explicit neimplementat în fișier). | Nu s-a găsit strat de cache dedicat în `k1-nominatim-geocoding.ts` la audit. |
| 12 | Tier + de-escaladare | Eșec HTTP/JSON: throw după log (~L169–182). | v2 trigger-e. | Fără test unitar/integration dedicat Nominatim la audit `*.test.ts`. |
| 13 | Stack v2 §2.3 (subset) | BullMQ, `fetch` Nominatim, Postgres (`silverCompanies`, `silverEnrichmentLog`), Redis, PostGIS queue downstream. | v2. | — |

### Mapare OTel

- **v2 / plan:** `cognitive.enrich.geo.geocode`.
- **Cod:** `withCognitiveSpan` — **`e1:geo:geocode-nominatim`** (`k1-nominatim-geocoding.ts`).
- **Stare:** **migrare planificată** (nume span / v2).

### Note audit (drift minor)

- În `silverEnrichmentLog`, `fieldsUpdated` include **`locationGeography`** (~L155), dar `db.update(silverCompanies)` din același fișier setează **`latitude`**, **`longitude`**, **`metadata`**, **`lastEnrichedAt`** — nu apare setare explicită `locationGeography` în acest handler; tratat ca posibil inconsistență între log și schema efectivă.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
