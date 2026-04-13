<!-- neuron-contract:author-complete -->

# Neuron `product:embedding:generate`

> **Status:** audit manual **2026-04-13**. **v2** nume coadă `product:embedding:generate` + **Non-AI** în bloc; **runtime** = **`product:embed`**, cu **`embedText()`** (LLM) — **divergență** nume + clasificare AI.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `product:embedding:generate` |
| etapa | E3 |
| familie (v2) | `product-search` |
| contract_path | `contracts/neurons/E3/product--embedding--generate.md` |
| ADR familie (indicativ) | [product-search](../../adr/families/e3/product-search.md) |

## Scop în context real

**v2** (L5580–5600). **Cod:** `productEmbedProcessor` (A2) apelează `embedText` (client LLM), validează dimensiune vector, upsert în `gold_product_embeddings` — vezi antet și corp `a2-product-embed.ts`.

## Surse audit

- v2 — L5580–5600.
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:product:embed` / `product:embed` (L1507–1515); **fără** `product:embedding:generate`.
- `workers/shared/src/queue-registry.ts` — `E3_PRODUCT_EMBED: "product:embed"` (L207).
- `workers/e3-ai-sales/src/main.ts` — `processors["product:embed"]` (L174).
- `workers/e3-ai-sales/src/workers/a2-product-embed.ts` — procesor; `workers/e3-ai-sales/src/lib/llm-client.ts` — `embedText` (apel indirect).
- `workers/e3-ai-sales/src/__tests__/a-workers.test.ts` — `describe("A2 — productEmbedProcessor"` (L233+).
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation` (L90–107).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L226–234).

## Instanțe v2

- —

## N/A pe criterii

- —

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Runtime **`product:embed`** → `e3:product:embed` (L1508–1509). Fără `product:embedding:generate` în registry. | v2 coadă L5594. | Mapare explicită v2 → runtime. |
| 2 | Etapă, familie, swimlane | Catalog `product-knowledge` (L1512). | v2 `product-search` (L5598). | Divergență swimlane/familie. |
| 3 | Rol declarat | Embedding vectorial + persistență (a2). | v2 descriere generică knowledge (L5591–5593). | — |
| 4 | NeuronType + SOFAI | `DeliberativeNeuron` (L1511). | v2 `KnowledgeNeuron` (L5587). | Divergență tip. |
| 5 | Criticitate | `HIGH` (L1514). | `MEDIUM` v2 (L5589). | Divergență criticitate. |
| 6 | Înveliș telemetrie | `cognitive:e3:product:embed`. | v2 `cognitive.product.embedding.generate` (L5599). | — |
| 7 | Înveliș politică | Respingere embedding dimensiuni neconforme (a2 L23–28). | v2 L5597. | — |
| 8 | Rutare model (dacă AI) | **Da:** `embedText()` — model din llm-client (a2 L16–17). | v2 «Non-AI» (L5596). | **Contradicție:** v2 Non-AI vs cod LLM. |
| 9 | Guardrails | Validare MRL 3072. | — | — |
| 10 | Escaladare HITL | — | v2 fără HITL obligatoriu (L5597). | — |
| 11 | Micro-OODA | Citire produs/chunk → embed → upsert. | v2 L5595. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L5590). | — |
| 13 | Stack v2 §2.3 (subset) | LLM client + pgvector/halfvec. | — | Detaliu model: în `llm-client.ts` — neexpandat aici. |

### Mapare OTel

- **v2:** `cognitive.product.embedding.generate`.
- **Cod:** `cognitive:e3:product:embed`.

---
*Generator inițial:* înlocuit prin audit manual.
