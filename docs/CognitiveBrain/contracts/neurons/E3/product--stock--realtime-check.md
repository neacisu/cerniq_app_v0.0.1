<!-- neuron-contract:author-complete -->

# Neuron `product:stock:realtime-check`

> **Status:** audit manual **2026-04-13**. **v2** plasează coada sub prefix `product:`; **implementarea** folosește **`stock:realtime:check`** (F33), `nodeKey` `e3:stock:realtime-check`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `product:stock:realtime-check` |
| etapa | E3 |
| familie (v2) | `product-search` |
| contract_path | `contracts/neurons/E3/product--stock--realtime-check.md` |
| ADR familie (indicativ) | [product-search](../../adr/families/e3/product-search.md) |

## Scop în context real

**v2** (L5602–5622): descriere generică knowledge; coadă confirmată `product:stock:realtime-check`. **Cod:** `stockRealtimeCheckProcessor` — rezolvare SKU, apel SQL `get_available_stock`, determinist, fără LLM (f33 antet L4–7, validare intrare L33–35, logică L37+).

## Surse audit

- v2 — L5602–5622.
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:stock:realtime-check` / `stock:realtime:check` (L1796–1804).
- `workers/shared/src/queue-registry.ts` — `E3_STOCK_REALTIME_CHECK: "stock:realtime:check"` (L259).
- `workers/e3-ai-sales/src/main.ts` — `processors["stock:realtime:check"]` (L214).
- `workers/e3-ai-sales/src/workers/f33-stock-realtime-check.ts` — procesor.
- `workers/e3-ai-sales/src/__tests__/f-workers.test.ts` — `describe("F33 — stockRealtimeCheckProcessor"` (L214+).
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation` (L90–107).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L226–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5618).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`stock:realtime:check`** + `e3:stock:realtime-check` (catalog L1797–1798). **Nu** există `product:stock:realtime-check` în registry la audit (2026-04-13). | v2 **Confirmed queue field** `product:stock:realtime-check` (L5616). | **Prefix `product:`** în v2 ≠ coadă runtime `stock:`. |
| 2 | Etapă, familie, swimlane | Catalog: etapa 3, swimlane `stock-management` (L1801). | v2: familie `product-search` (L5605), swimlane `product-search` în metrici (L5620). | v2 plasează neuronul în familia product-search; catalog îl plasează în `stock-management`. |
| 3 | Rol declarat | Verificare stoc disponibil SQL (f33). | v2 descriere generică (L5613–5615). | — |
| 4 | NeuronType + SOFAI | `SensoryNeuron` (L1800). | v2 `KnowledgeNeuron` (L5609). | Divergență. |
| 5 | Criticitate | `HIGH` (L1802). | `MEDIUM` v2 (L5611). | Divergență. |
| 6 | Înveliș telemetrie | `cognitive:e3:stock:realtime-check`. | v2 `cognitive.product.stock.realtime-check` (L5621). | — |
| 7 | Înveliș politică | Validare productId/sku (f33 L33–35). | v2 L5619. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Determinist. | — | — |
| 10 | Escaladare HITL | — | v2 L5619. | — |
| 11 | Micro-OODA | Rezolvare SKU → apel SQL stoc. | v2 L5617. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L5612). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + SQL function. | — | — |

### Mapare OTel

- **v2:** `cognitive.product.stock.realtime-check`.
- **Cod:** `cognitive:e3:stock:realtime-check`.

---
*Generator inițial:* înlocuit prin audit manual.
