<!-- neuron-contract:author-complete -->

# Neuron `enrich:apia:farmer-lookup`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:apia:farmer-lookup` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--apia--farmer-lookup.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** înregistrează coada canonică `enrich:apia:farmer-lookup` (ToolNeuron, Non-AI, «not yet reconciled with runtime registry»). **În repo:** același strat de integrare APIA rulează pe coada **`agri:apia`**, procesor `apiaDataProcessor` — `GET` către șablon `APIA_ENDPOINT_TEMPLATE` cu `{cui}` / `{judet}`, persistă `metadata.apiaData`, log `silverEnrichmentLog` sursă `apia_data`. Orchestratorul pipeline poate enfilea explicit `agri:apia` (`p1-orchestrate.ts`). Coada v2 **nu** apare literal în `queue-registry.ts`; runtime = **`agri:apia`** / `e1:agri:apia` în catalog. **Notă:** v2 are și `enrich:apia:subsidies` — același procesor unic în cod la audit; contractele rămân distincte pe coadă v2, cu trimitere încrucișată.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:apia:farmer-lookup\`` (~L2017–2037).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:agri:apia` / `agri:apia` (~L782–789).
- `workers/shared/src/queue-registry.ts` — `AGRI_APIA: "agri:apia"` (~L71).
- `workers/enrichment/src/main.ts` — `"agri:apia": apiaDataProcessor` (~L156).
- `workers/enrichment/src/workers/l1-apia-data.ts` — `withCognitiveSpan("e1:agri:apia", …)`, fetch + `jsonb_set` `apiaData` (~L17–108).
- `workers/enrichment/src/workers/p1-orchestrate.ts` — `addQueueJob("agri:apia", …)` (~L136–137).
- `workers/enrichment/src/workers/agri-workers.integration.test.ts` — export `apiaDataProcessor` (~L5–14).

## Instanțe v2

- **Catalog (runtime):** `nodeKey` **`e1:agri:apia`**, coadă **`agri:apia`**.
- **OTel span name (v2 plan):** `cognitive.enrich.apia.farmer-lookup`
- **Evidence status (v2):** graph-export-grounded; reconciliere registry anunțată ca nefinalizată.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI; `l1-apia-data.ts` fără apel LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **v2_queue** `enrich:apia:farmer-lookup`; literal **lipsă** în registry. Runtime: **`agri:apia`**, catalog **`e1:agri:apia`**. | v2 vs catalog. | v2 §2.4 până la unificare nume. |
| 2 | Etapă, familie, swimlane | E1; enrichment worker; swimlane catalog **`enrichment-external`**. | v2 E1 enrichment. | — |
| 3 | Rol declarat | Catalog: «Verificare date subvenții APIA». Cod: fetch HTTP + `metadata.apiaData` + log. | v2 operational purpose (generic enrichment). | Granularitate «farmer-lookup» vs «subsidies» numai în v2, nu în cod separat. |
| 4 | NeuronType + SOFAI | `ToolNeuron`; System1 (reactiv) conform convenției v2 §2.1 pentru ToolNeuron. | v2. | — |
| 5 | Criticitate | Catalog + v2 **MEDIUM**. | v2. | — |
| 6 | Înveliș telemetrie | **`withCognitiveSpan("e1:agri:apia", …)`** (~L17–19). Span v2 plan (`cognitive.enrich.apia.farmer-lookup`) ≠ string span în cod. | ADR-0003. | Aliniere denumiri. |
| 7 | Înveliș politică | Env `APIA_ENDPOINT_TEMPLATE`, timeout `APIA_TIMEOUT_MS`; fără OPA în fișier. | v2 tier 4 / policy text. | — |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Skip dacă lipsește template (~L37–43); erori HTTP → throw. | ADR-0007. | — |
| 10 | Escaladare HITL | Fără HITL în procesor. | ADR-0008. | — |
| 11 | Micro-OODA | Citește job → construiește URL → fetch → persistă payload → log. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Eșec rețea/HTTP: excepție după log (~L109+). | v2 trigger-e. | Fără test unitar dedicat flux APIA în audit. |
| 13 | Stack v2 §2.3 (subset) | BullMQ, `fetch`, Postgres, Redis (worker shared). | v2. | — |

### Mapare OTel

- **v2 / plan:** `cognitive.enrich.apia.farmer-lookup`.
- **Cod:** `withCognitiveSpan` — **`e1:agri:apia`** (`l1-apia-data.ts`).
- **Stare:** **migrare planificată** (nume span / v2).
