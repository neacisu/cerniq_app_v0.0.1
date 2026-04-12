<!-- neuron-contract:author-complete -->

# Neuron `enrich:termene:anaf-debts`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:termene:anaf-debts` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--termene--anaf-debts.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** folosește eticheta «termene / anaf-debts», dar **nu** există integrare Termene.ro pentru datorii ANAF: `termene-api-client.ts` expune doar `/bilant`, `/scor-risc`, `/dosare`, `/actionari`. **Datorii / insolvență din date ANAF** apar în **`enrich:anaf:full`**: `d0-anaf-full-fetch.ts` construiește `anafDatoriiSummary` (`stareInsolv`, `stareInactivi`) și îl persistă în `metadata.anafDatorii`, marcând și sursa `anaf_datorii` ca completă. **Coada granulară** `enrich:anaf:datorii` există în registry și este enfileată de `p1-orchestrate.ts`, dar **`main.ts` nu are procesor** pentru ea; `d4-anaf-datorii.ts` este **deprecated** și neînregistrat. **Coada v2** `enrich:termene:anaf-debts` **lipsește** din registry. Concluzie: neuronul v2 este un **alias de domeniu greșit (Termene)** pentru o capacitate **ANAF**; implementarea utilă curentă este **`e1:enrich:anaf-full-fetch`**.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:termene:anaf-debts\`` (~L2391–2410).
- `workers/enrichment/src/workers/d0-anaf-full-fetch.ts` — `anafDatoriiSummary`, `metadata.anafDatorii`, `markEnrichmentSourceComplete` pentru `anaf_datorii` (~L203–247, ~311–314).
- `workers/enrichment/src/workers/d4-anaf-datorii.ts` — antet deprecated + neînregistrat (~L1–4); `e1:enrich:anaf-datorii` (~L22–25).
- `workers/enrichment/src/main.ts` — `"enrich:anaf:full"` singurul procesor ANAF (~L128).
- `workers/enrichment/src/workers/p1-orchestrate.ts` — `"enrich:anaf:datorii"` în listă (~L109).
- `workers/shared/src/queue-registry.ts` — `ENRICH_ANAF_DATORII` (~L41).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:enrich:anaf-full-fetch`, `e1:enrich:anaf-datorii` (~L468–512).
- `workers/enrichment/src/lib/termene-api-client.ts` — fără endpoint ANAF datorii (~L159–172).
- `rg` `enrich:termene:anaf-debts` — doar documentație v2 + matrice.

## Instanțe v2

- **OTel v2:** `cognitive.enrich.termene.anaf-debts`.
- **OTel cod relevant:** `e1:enrich:anaf-full-fetch` (D0).

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** `enrich:termene:anaf-debts`. Funcție echivalentă: `e1:enrich:anaf-full-fetch`; legacy `e1:enrich:anaf-datorii` fără procesor activ în `main.ts`. | v2 «termene» + anaf-debts. | Nume v2 induce furnizor greșit. |
| 2 | Etapă, familie, swimlane | D0: catalog `enrichment-fiscal` pentru `enrich:anaf:full` (secțiunea D din catalog). | v2 E1 enrichment. | — |
| 3 | Rol declarat | Captură câmpuri insolvență/inactivitate ANAF în metadata; nu «datorii» detaliate ca în d4 istoric. | v2 enrichment generic. | Forma exactă JSON ANAF în afara scope-ului unic al acestui contract. |
| 4 | NeuronType + SOFAI | Catalog ANAF full: `ToolNeuron`. | v2 `ToolNeuron`. | — |
| 5 | Criticitate | Catalog `enrich:anaf:full`: `CRITICAL` (`cognitive-node-catalog.ts` ~L467–474); v2 `MEDIUM`. | v2. | Divergență criticitate documentată. |
| 6 | Înveliș telemetrie | `e1:enrich:anaf-full-fetch` vs span v2 `cognitive.enrich.termene.anaf-debts`. | ADR-0003. | Nealinat. |
| 7 | Înveliș politică | D0: cache Redis, `callExternalApi`/fetch ANAF; fără HITL în handler. | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Validare CUI; erori logate; fără NeMo în D0. | ADR-0007. | — |
| 10 | Escaladare HITL | Fără cozi `human:*` în D0 citat. | ADR-0008. | — |
| 11 | Micro-OODA | Fetch/cache ANAF → mapare câmpuri → update DB. | v2 OODA generic. | — |
| 12 | Tier + de-escaladare | Fără praguri încredere explicite în D0. | v2 §2.2. | — |
| 13 | Stack | BullMQ, Redis cache, HTTP ANAF, Postgres. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.enrich.termene.anaf-debts` — **fără** handler cu acest nume.
- **Cod:** `e1:enrich:anaf-full-fetch` pentru fluxul real ANAF.
- **Stare:** **nealinat**; necesită reconciliere canonică (v2 §6 vs registry) în fază 2.

### Notă operațională

- **`enrich:anaf:datorii` enfileată din P1 fără worker în `main.ts`** — risc de job-uri neconsumate; în afara scope-ului contractului, dar relevant pentru audit integrare.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
