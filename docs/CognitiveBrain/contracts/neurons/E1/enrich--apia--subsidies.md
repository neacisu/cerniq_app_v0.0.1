<!-- neuron-contract:author-complete -->

# Neuron `enrich:apia:subsidies`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- | --- | --- | --- |
| v2_queue | `enrich:apia:subsidies` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--apia--subsidies.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** definește `enrich:apia:subsidies` ca neuron ToolNeuron de enrichment, Non-AI, cu coadă din export ne-reconciliată cu registry. **În repo:** nu există coadă separată pentru acest șir v2 — același procesor **`apiaDataProcessor`** și coada **`agri:apia`** ca pentru `enrich:apia:farmer-lookup` (vezi [enrich--apia--farmer-lookup.md](enrich--apia--farmer-lookup.md)). Catalogul are un singur `nodeKey` **`e1:agri:apia`** pentru «Verificare date subvenții APIA». Diferența farmer vs subsidies este **semantică în v2**, nu în mapare worker separată la data auditului.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:apia:subsidies\`` (~L2039–2059).
- `docs/CognitiveBrain/contracts/neurons/E1/enrich--apia--farmer-lookup.md` — același runtime `agri:apia` / `l1-apia-data.ts`.
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:agri:apia` / `agri:apia`.
- `workers/enrichment/src/workers/l1-apia-data.ts` — dovadă unică procesor APIA.
- `workers/enrichment/src/main.ts`, `workers/shared/src/queue-registry.ts` — ca în contractul farmer-lookup.

## Instanțe v2

- **Catalog (runtime partajat):** `e1:agri:apia` / `agri:apia`.
- **OTel span name (v2 plan):** `cognitive.enrich.apia.subsidies`
- **Cod efectiv:** `e1:agri:apia` în `withCognitiveSpan` (același fișier ca farmer-lookup).

## N/A pe criterii

- **Rând 8:** **N/A** — Non-AI în v2 și în `l1-apia-data.ts`.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Partajat** cu `enrich:apia:farmer-lookup`: runtime **`agri:apia`**, catalog **`e1:agri:apia`**. șir v2 `enrich:apia:subsidies` **lipsă** literal în registry. | v2 queue distinctă în plan. | Granța v2 §2.4 pentru mapare 1:1 nume. |
| 2 | Etapă, familie, swimlane | E1; enrichment; `enrichment-external` (catalog). | v2. | — |
| 3 | Rol declarat | Același flux ca farmer-lookup: date APIA în `metadata.apiaData`. Interpretare «subsidies» numai din payload / v2. | v2 label subsidies. | — |
| 4 | NeuronType + SOFAI | `ToolNeuron`; System1 (v2 §2.1). | v2. | — |
| 5 | Criticitate | MEDIUM (v2 + catalog). | v2. | — |
| 6 | Înveliș telemetrie | Span cod **`e1:agri:apia`**; span v2 **`cognitive.enrich.apia.subsidies`**. | ADR-0003. | Două nume v2 pe același worker. |
| 7 | Înveliș politică | Env APIA + timeout; identic farmer-lookup. | v2. | — |
| 8 | Rutare model (dacă AI) | **N/A**. | v2. | — |
| 9 | Guardrails | Identic `l1-apia-data.ts` (skip fără template, erori HTTP). | ADR-0007. | — |
| 10 | Escaladare HITL | Fără HITL în procesor. | ADR-0008. | — |
| 11 | Micro-OODA | Identic flux fetch→persist→log. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Identic excepții `l1-apia-data.ts`. | v2. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ, fetch, Postgres — ca farmer-lookup. | v2. | — |

### Mapare OTel

- **v2 / plan:** `cognitive.enrich.apia.subsidies`.
- **Cod:** `e1:agri:apia` (partajat cu `enrich:apia:farmer-lookup`).
- **Stare:** **migrare planificată** — fie span distinct per facetă v2, fie un contract runtime unic documentat.
