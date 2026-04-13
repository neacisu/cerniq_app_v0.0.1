<!-- neuron-contract:author-complete -->

# Neuron `product:variant:process`

> **Status:** audit manual **2026-04-13**. Coadă aliniată v2; procesor `a6-product-variant-process.ts`; poate enfileua `product:ingest` pentru variante cu `variantAsSeparateProduct === true` (a6 L72–91).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `product:variant:process` |
| etapa | E3 |
| familie (v2) | `product-search` |
| contract_path | `contracts/neurons/E3/product--variant--process.md` |
| ADR familie (indicativ) | [product-search](../../adr/families/e3/product-search.md) |

## Scop în context real

**v2** (L5646–5669): procesare variante (dimensiuni, culori). **Cod:** scrie `variants` în `gold_products.metadata` prin `jsonb_set` (a6 L59–66); pentru variante cu `variantAsSeparateProduct === true`, deschide coada `product:ingest` și adaugă job-uri (a6 L72–91).

## Surse audit

- v2 — L5646–5669.
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:product:variant-process` / `product:variant:process` (L1543–1551).
- `workers/shared/src/queue-registry.ts` — `E3_PRODUCT_VARIANT_PROCESS` (L211).
- `workers/e3-ai-sales/src/main.ts` — `processors["product:variant:process"]` (L178).
- `workers/e3-ai-sales/src/workers/a6-product-variant-process.ts` — procesor.
- `workers/e3-ai-sales/src/__tests__/a-workers.test.ts` — `describe("A6 — productVariantProcessProcessor"` (L660+).
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation` (L90–107).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L226–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5665).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Catalog L1544–1545; registry L211; `main.ts` L178. | v2 L5663. | — |
| 2 | Etapă, familie, swimlane | Catalog `product-knowledge` (L1548). | v2 swimlane `product-knowledge` (L5668). | — |
| 3 | Rol declarat | Update metadata + ingest opțional (a6). | v2 L5660–5662. | — |
| 4 | NeuronType + SOFAI | `ProceduralNeuron` (L1547). | v2 L5654. | — |
| 5 | Criticitate | `MEDIUM` (L1549). | v2 L5657. | — |
| 6 | Înveliș telemetrie | `cognitive:e3:product:variant-process`. | v2 L5669. | Convenție span ca la ceilalți. |
| 7 | Înveliș politică | Throw dacă produs lipsă (a6 L55–57). | Tier 4; HITL v2 L5666. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Validare existență produs; fără NeMo în fișier. | ADR-0007. | — |
| 10 | Escaladare HITL | Nu în a6. | v2 L5666. | — |
| 11 | Micro-OODA | Observare variantele → scriere JSONB → act ingest. | v2 L5664. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (v2 L5658). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + `createQueue` pentru ingest. | — | — |

### Mapare OTel

- **v2:** `cognitive.e3.product.variant-process`.
- **Cod:** `cognitive:e3:product:variant-process`.

---
*Generator inițial:* înlocuit prin audit manual.
