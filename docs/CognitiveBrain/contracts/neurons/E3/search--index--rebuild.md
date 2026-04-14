<!-- neuron-contract:author-complete -->

# Neuron `search:index:rebuild`

> **Status:** audit manual **2026-04-13**. **v2** folosește coada `search:index:rebuild`; **runtime** și **catalog** folosesc **`product:index:rebuild`** / `e3:product:index-rebuild` (A4).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `search:index:rebuild` |
| etapa | E3 |
| familie (v2) | `product-search` |
| contract_path | `contracts/neurons/E3/search--index--rebuild.md` |
| ADR familie (indicativ) | [product-search](../../adr/families/e3/product-search.md) |

## Scop în context real

**v2** (L5693–5716). **Cod:** `productIndexRebuildProcessor` reconstruiește `search_vector` (`to_tsvector('romanian', …)`) și `name_trigram` pe `gold_products` (`a4-product-index-rebuild.ts` L4–6, L33–39). **Notă:** textul din catalog menționează „index vector pgvector” (L1528); implementarea A4 citită este **FTS + trigram** pe coloanele produsului, nu reconstruirea indexului pgvector din același fișier.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`search:index:rebuild\`` (L5693–5716).
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:product:index-rebuild` / `product:index:rebuild` (L1525–1532).
- `workers/shared/src/queue-registry.ts` — `E3_PRODUCT_INDEX_REBUILD: "product:index:rebuild"` (L209).
- `workers/e3-ai-sales/src/main.ts` — `processors["product:index:rebuild"]` (L176).
- `workers/e3-ai-sales/src/workers/a4-product-index-rebuild.ts`.
- `workers/e3-ai-sales/src/__tests__/a-workers.test.ts` — `A4 — productIndexRebuildProcessor`.
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation` (L90–107).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L215–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5712).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Runtime **`product:index:rebuild`** → `e3:product:index-rebuild` (catalog L1526–1527). **Fără** literal `search:index:rebuild` în registry. | v2 L5710; `Catalog nodeKey` L5700. | **Prefix v2** (`search:`) ≠ numele cozii BullMQ (`product:`). |
| 2 | Etapă, familie, swimlane | Catalog: swimlane **`product-knowledge`** (L1530). | v2 familie `product-search`, swimlane `product-knowledge` (L5696, L5703). | Familie v2 `product-search` vs swimlane `product-knowledge` — explicat în v2. |
| 3 | Rol declarat | Reindex FTS + trigram pe rânduri produs (a4 L33–39). | v2 / catalog: formulare „vector pgvector” (L5707–5708, catalog L1528). | **Dovada A4** = FTS românesc + trigram; nu extragere pgvector din acest procesor. |
| 4 | NeuronType + SOFAI | `AutonomicNeuron` (L1529). | v2 `AutonomicNeuron` (L5701). | — |
| 5 | Criticitate | `HIGH` (L1532). | `HIGH` (v2 L5704). | — |
| 6 | Înveliș telemetrie | Factory + `withCognitiveSpan`: span **`cognitive:e3:product:index-rebuild`** când `tenantId` în job. | v2 `cognitive.e3.product.index-rebuild` (L5715). | Convenție puncte (v2) vs `cognitive:nodeKey` în cod. |
| 7 | Înveliș politică | Singleton, concurrency 1 (antet a4 L2). | Tier 3; HITL anomalii (v2 L5705, L5713). | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Actualizare SQL deterministă. | NeMo destinație ADR-0007. | — |
| 10 | Escaladare HITL | — | v2 L5713. | — |
| 11 | Micro-OODA | Job BullMQ → UPDATE filtrat pe tenant / produs. | v2 L5711 (cron/timer). | Declanșator cron nu e citit în A4; doar procesarea job-ului. |
| 12 | Tier + de-escaladare | — | Tier 3 (v2 L5705). | — |
| 13 | Stack v2 §2.3 (subset) | Postgres FTS (`to_tsvector`) + Drizzle (`@cerniq/db`). | — | — |

### Mapare OTel

- **v2:** `cognitive.e3.product.index-rebuild`.
- **Cod:** span activ = `cognitive:e3:product:index-rebuild` prin `withCognitiveSpan(nodeKey, …)`; atribute `cognitive.nodeKey`, `cognitive.neuronType`, `cognitive.swimlane`, `cognitive.etapa`, `cognitive.function` (`cognitive-helpers.ts` L226–234); înveliș worker `factory.ts` (L90–107).
- **Stare:** **parțial aliniat** (aceeași cheie canonică `e3:product:index-rebuild`) între denumirea span-ului cu două puncte și convenția v2 cu puncte.

---
*Generator inițial:* înlocuit prin audit manual.
