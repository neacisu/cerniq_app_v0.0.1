<!-- neuron-contract:author-complete -->

# Neuron `search:query:understand`

> **Status:** audit manual **2026-04-13**. **v2** înregistrează coada `search:query:understand` + **Non-AI**; **runtime** = **`search:query:rewrite`** (B7) cu **LLM** (`fastChat`) — divergență nume + rutare model.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `search:query:understand` |
| etapa | E3 |
| familie (v2) | `product-search` |
| contract_path | `contracts/neurons/E3/search--query--understand.md` |
| ADR familie (indicativ) | [product-search](../../adr/families/e3/product-search.md) |

## Scop în context real

**v2** (L5718–5738). **Cod:** rescriere/expandare interogare prin apel `fastChat`, guard înainte de LLM, apoi enqueue paralel `search:vector:execute` și `search:bm25:execute` (`b7-search-query-rewrite.ts` L6–7, L31–32, L45–74).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`search:query:understand\`` (L5718–5738).
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:search:query-rewrite` / `search:query:rewrite` (L1554–1561).
- `workers/shared/src/queue-registry.ts` — `E3_SEARCH_QUERY_REWRITE` (L214).
- `workers/e3-ai-sales/src/main.ts` — `processors["search:query:rewrite"]` (L180).
- `workers/e3-ai-sales/src/workers/b7-search-query-rewrite.ts`.
- `workers/e3-ai-sales/src/__tests__/b-workers.test.ts` — `B7 — searchQueryRewriteProcessor`.
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation` (L90–107).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L215–234).

## Instanțe v2

- —

## N/A pe criterii

- —

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`search:query:rewrite`** + `e3:search:query-rewrite` (catalog L1555–1556). Fără `search:query:understand` în registry. | v2 L5732. | Mapare explicită v2 → runtime. |
| 2 | Etapă, familie, swimlane | Swimlane **`hybrid-search`** (L1559). | v2 familie `product-search` (L5721); metrics swimlane `product-search` (L5736). | — |
| 3 | Rol declarat | Rewrite JSON + expansions + limbă (b7 L53–61, L67–84). | v2 descriere generică retrieval (L5729–5731). | — |
| 4 | NeuronType + SOFAI | `DeliberativeNeuron` (L1558). | v2 `KnowledgeNeuron` inferat (L5725). | Divergență tip declarativ. |
| 5 | Criticitate | `HIGH` (L1561). | `MEDIUM` v2 (L5727). | Divergență. |
| 6 | Înveliș telemetrie | Span `cognitive:e3:search:query-rewrite` când `tenantId` în job (factory + helpers). | v2 `cognitive.search.query.understand` (L5737). | Două nume pentru același traseu conceptual. |
| 7 | Înveliș politică | `e3ScanPromptBeforeLlm` (b7 L11, L45). | v2 L5735. | — |
| 8 | Rutare model (dacă AI) | **Da:** `fastChat` cu timeout 5s (b7 L67–73). | v2 «Non-AI» (L5734). | **Contradicție** v2 ↔ cod. |
| 9 | Guardrails | LLM Guard local + flux blocat dacă `guard.blocked` (b7 L45–50). | — | — |
| 10 | Escaladare HITL | — | v2 L5735. | — |
| 11 | Micro-OODA | Rewrite → enqueue cozi vector + BM25 (b7 L31–32 și corp procesor). | v2 L5733. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L5728). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + client LLM (`fastChat`) + cozi derivate din `QUEUES`. | — | — |

### Mapare OTel

- **v2:** `cognitive.search.query.understand`.
- **Cod:** span canonic instrumentat = `cognitive:e3:search:query-rewrite` + atribute `cognitive.nodeKey`, `cognitive.neuronType`, `cognitive.swimlane`, `cognitive.etapa`, `cognitive.function` (`cognitive-helpers.ts` L226–234); înveliș `factory.ts` (L90–107).
- **Stare:** **denumiri diferite** (v2 vs `nodeKey`); **același handler** pentru traseul de înțelegere/rescriere a interogării.

---
*Generator inițial:* înlocuit prin audit manual.
