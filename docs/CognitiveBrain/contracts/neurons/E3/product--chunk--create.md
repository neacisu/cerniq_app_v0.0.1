<!-- neuron-contract:author-complete -->

# Neuron `product:chunk:create`

> **Status:** audit manual **2026-04-13**. **v2** folosește coada `product:chunk:create`; **runtime canonic** în repo = **`product:chunk`** (registry, catalog, worker A3). Contractul documentează ambele nume; implementarea citită este pentru `product:chunk`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `product:chunk:create` |
| etapa | E3 |
| familie (v2) | `product-search` |
| contract_path | `contracts/neurons/E3/product--chunk--create.md` |
| ADR familie (indicativ) | [product-search](../../adr/families/e3/product-search.md) |

## Scop în context real

**v2** (L5558–5578): chunking pentru RAG, tip `KnowledgeNeuron` inferat, swimlane `product-search` în blocul v2, evidence *not yet reconciled with runtime registry*. **Cod:** `productChunkProcessor` (A3) segmentează text produs (antet L4–8), șterge chunk-uri vechi, inserează noi, enfilează `product:embed` per chunk (flux descris în comentarii L4–5; implementare în corpul fișierului).

## Surse audit

- v2 — L5558–5578.
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:product:chunk` / `product:chunk` (L1516–1524) — **fără** intrare `product:chunk:create`.
- `workers/shared/src/queue-registry.ts` — `E3_PRODUCT_CHUNK: "product:chunk"` (L208).
- `workers/e3-ai-sales/src/main.ts` — `processors["product:chunk"]` (L175).
- `workers/e3-ai-sales/src/workers/a3-product-chunk.ts` — procesor.
- `workers/e3-ai-sales/src/__tests__/a-workers.test.ts` — `describe("A3 — productChunkProcessor"` (L359+).
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation` (L90–107).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L226–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI pentru acest bloc (L5574).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Mapare:** comportamentul este pe **`product:chunk`** → `e3:product:chunk` (catalog L1517–1518). **Nu** există literal `product:chunk:create` în registry/`main.ts` la audit. | v2 **Confirmed queue field** `product:chunk:create` (L5572). | **Denumire coadă:** v2 ≠ runtime; aliniere viitoare sau acceptare duală documentată. |
| 2 | Etapă, familie, swimlane | Catalog: swimlane `product-knowledge` (L1521). | v2 swimlane `product-search` (L5576). | **Divergență swimlane** v2 vs catalog. |
| 3 | Rol declarat | Chunking + persistență + lanț către embed (a3). | v2 L5569–5571. | — |
| 4 | NeuronType + SOFAI | Catalog `ProceduralNeuron` (L1520). | v2 `KnowledgeNeuron` inferat (L5565). | **Divergență tip** v2 vs catalog. |
| 5 | Criticitate | `MEDIUM` (L1522). | v2 L5567. | — |
| 6 | Înveliș telemetrie | Span pentru `e3:product:chunk` când factory activ. | v2 `cognitive.product.chunk.create` (L5577). | Prefix span v2 diferit de `cognitive:e3:...`. |
| 7 | Înveliș politică | — | v2 L5575–5576. | — |
| 8 | Rutare model (dacă AI) | **N/A** (procesor fără LLM). | v2 Non-AI. | — |
| 9 | Guardrails | Determinist chunking. | — | — |
| 10 | Escaladare HITL | — | v2 fără HITL obligatoriu (L5575). | — |
| 11 | Micro-OODA | Pipeline chunk → embed queue. | v2 L5573 (Neo4j menționat). | Neo4j **neinvocat** în a3 citit. |
| 12 | Tier + de-escaladare | — | Tier 4 (L5568). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + Postgres chunks. | — | — |

### Mapare OTel

- **v2:** `cognitive.product.chunk.create`.
- **Cod:** `cognitive:e3:product:chunk` (rezolvare catalog pentru `product:chunk`).

---
*Generator inițial:* înlocuit prin audit manual.
