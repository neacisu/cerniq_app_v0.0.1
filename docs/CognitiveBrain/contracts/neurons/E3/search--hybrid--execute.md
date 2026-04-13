<!-- neuron-contract:author-complete -->

# Neuron `search:hybrid:execute`

> **Status:** audit manual **2026-04-13**. **Nu există** coadă atomică `search:hybrid:execute` în `queue-registry.ts` / `main.ts`. Căutarea hibridă este **compusă** din `search:query:rewrite` (B7), `search:vector:execute` (B8), `search:bm25:execute` (B9) și `search:rrf:fuse` (B10). Acest contract descrie **rolul agregat v2** și **dovada din pipeline-ul B7–B10**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `search:hybrid:execute` |
| etapa | E3 |
| familie (v2) | `product-search` |
| contract_path | `contracts/neurons/E3/search--hybrid--execute.md` |
| ADR familie (indicativ) | [product-search](../../adr/families/e3/product-search.md) |

## Scop în context real

**v2** (L5671–5691): neuron „hibrid” agregat în registru semantic; câmpul `Confirmed queue` este `search:hybrid:execute`, iar **Contract evidence status** notează nealinierea cu registry-ul runtime. **Cod:** orchestrarea efectivă pornește de la rescrierea interogării și enfilează în paralel căutarea vectorială și BM25 (`b7-search-query-rewrite.ts` L6–7, L31–32); fuziunea ponderată RRF este în `b10-search-rrf-fuse.ts` (antet L4–5). Nu există un singur `Worker` înregistrat sub numele `search:hybrid:execute`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`search:hybrid:execute\`` (L5671–5691).
- `packages/shared/src/cognitive-node-catalog.ts` — intrări B7–B10: `e3:search:query-rewrite` … `e3:search:rrf-fuse` (L1554–1587).
- `workers/shared/src/queue-registry.ts` — `E3_SEARCH_QUERY_REWRITE`, `E3_SEARCH_VECTOR_EXECUTE`, `E3_SEARCH_BM25_EXECUTE`, `E3_SEARCH_RRF_FUSE` (L214–217); **fără** `search:hybrid:execute`.
- `workers/e3-ai-sales/src/main.ts` — procesori `search:query:rewrite` … `search:rrf:fuse` (L176–183); comentariu pipeline B7–B12 (L6–10).
- `workers/e3-ai-sales/src/workers/b7-search-query-rewrite.ts`, `b8-search-vector-execute.ts`, `b9-search-bm25-execute.ts`, `b10-search-rrf-fuse.ts`.
- `workers/e3-ai-sales/src/__tests__/b-workers.test.ts` — `B7 — searchQueryRewriteProcessor`, `B10 — searchRrfFuseProcessor`.
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation` + apel `withCognitiveSpan` când există `tenantId` în job (L90–107).
- `workers/shared/src/cognitive-helpers.ts` — `startActiveSpan` cu nume `cognitive:` + `nodeKey` + atribute `cognitive.nodeKey`, `cognitive.neuronType`, … (L215–234).

## Instanțe v2

- —

## N/A pe criterii

- —

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Fără** `nodeKey` unic pentru `search:hybrid:execute`. Componente catalog: `e3:search:query-rewrite`, `e3:search:vector-execute`, `e3:search:bm25-execute`, `e3:search:rrf-fuse` (L1555–1583). | v2 coadă L5685. | Nume v2 = **capabilitate agregată**, nu coadă canonică în repo. |
| 2 | Etapă, familie, swimlane | Componente: swimlane catalog **`hybrid-search`** (L1559, L1568, L1577, L1586). | v2 Family `product-search` (L5674); aceeași etichetă în metrici Prometheus (L5689). | Familie v2 `product-search` vs swimlane `hybrid-search` pe sub-neuroni. |
| 3 | Rol declarat | RRF + căutări paralele (B10 + B8/B9); rewrite + enqueue în B7. | v2 L5682–5684. | — |
| 4 | NeuronType + SOFAI | Tipuri diferite pe sub-cozi: `DeliberativeNeuron`, `ToolNeuron`, `AssociativeNeuron` (L1558, L1567, L1576, L1585). | v2 `KnowledgeNeuron` inferat (L5678). | — |
| 5 | Criticitate | Sub-cozi în mare parte `HIGH` (L1561, L1570, L1579). | `MEDIUM` v2 (L5680). | — |
| 6 | Înveliș telemetrie | Span per sub-`nodeKey` via factory: `cognitive:e3:search:query-rewrite`, etc., când `tenantId` e prezent în job (`factory.ts` L103–106; `cognitive-helpers.ts` L226). | v2 `cognitive.search.hybrid.execute` (L5690). | Fără span unic cu numele v2 punctat; instrumentare pe cozi concrete. |
| 7 | Înveliș politică | Parțial: guard LLM în B7 — `e3ScanPromptBeforeLlm` (`b7` L11, L45). | v2 L5688. | — |
| 8 | Rutare model (dacă AI) | **Lanț mixt:** B7 apelează `fastChat` (L67–74); B10 este determinist. | v2 «Non-AI» pentru întreg blocul (L5687). | **v2 Non-AI** nu reflectă B7; contractul este agregat. |
| 9 | Guardrails | `e3-llm-guard` în B7 (L45–50). | — | — |
| 10 | Escaladare HITL | — | v2 L5688. | — |
| 11 | Micro-OODA | Pipeline observat: rewrite → paralel vector/BM25 → fuse (fișiere B7–B10). | v2 L5686. | Neo4j în OODA v2 — **țintă** (L5686); fără client Neo4j citit în acești workeri. |
| 12 | Tier + de-escaladare | — | Tier 4 (L5681). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + pg (B8/B9) + LLM client (B7). | — | — |

### Mapare OTel

- **v2 (convenție puncte):** `cognitive.search.hybrid.execute`.
- **Cod:** instrumentare per sub-neuron: span activ = `cognitive:` + `nodeKey` din catalog (ex. `cognitive:e3:search:query-rewrite`), atribute `cognitive.nodeKey`, `cognitive.neuronType`, `cognitive.swimlane`, `cognitive.etapa`, `cognitive.function` (`cognitive-helpers.ts` L226–234); învelișul este aplicația `wrapProcessorWithCognitiveInstrumentation` din `factory.ts` (L90–107).
- **Stare:** **ne aliniat 1:1** la un singur span v2; comportament real = **mai multe span-uri** pe cozile hibride.

---
*Generator inițial:* înlocuit prin audit manual.
