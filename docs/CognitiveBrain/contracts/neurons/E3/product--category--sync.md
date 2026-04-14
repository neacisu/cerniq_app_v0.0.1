<!-- neuron-contract:author-complete -->

# Neuron `product:category:sync`

> **Status:** audit manual **2026-04-13**. Coadă **aliniată** v2 ↔ registry ↔ catalog; procesor `a5-product-category-sync.ts` (BullMQ E3).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `product:category:sync` |
| etapa | E3 |
| familie (v2) | `product-search` |
| contract_path | `contracts/neurons/E3/product--category--sync.md` |
| ADR familie (indicativ) | [product-search](../../adr/families/e3/product-search.md) |

## Scop în context real

**v2** (L5533–5556): sincronizare categorii cu taxonomie, `ProceduralNeuron`, swimlane `product-knowledge`, Non-AI. **Cod:** procesorul parcurge categoriile/produsele tenant, propagă reguli de preț default (`category_default`, `minMarginPct=8%`) pentru produse fără reguli — logică DB și arbori de categorii (vezi comentarii L7–9, L39+ din sursă).

## Surse audit

- v2 — `### NEURON \`product:category:sync\`` (L5533–5556).
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:product:category-sync` / `product:category:sync` (L1534–1542).
- `workers/shared/src/queue-registry.ts` — `E3_PRODUCT_CATEGORY_SYNC` (L210).
- `workers/e3-ai-sales/src/main.ts` — `processors["product:category:sync"]` (L177).
- `workers/e3-ai-sales/src/workers/a5-product-category-sync.ts` — procesor.
- `workers/e3-ai-sales/src/__tests__/a-workers.test.ts` — `describe("A5 — productCategorySyncProcessor"` (L499+).
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation` (L90–107).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L226–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5552).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e3:product:category-sync` / `product:category:sync` în catalog (L1535–1536); registry L210; `main.ts` L177. | Confirmat v2 (L5550). | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 3, swimlane `product-knowledge` (L1539). | v2: familie `product-search` (L5536), swimlane `product-knowledge` (L5543). | Familie v2 (`product-search`) ≠ numele swimlane-ului; swimlane este aliniat catalog ↔ v2. |
| 3 | Rol declarat | Sync categorii + reguli default preț (a5, antet L2–9). | v2 L5547–5549. | — |
| 4 | NeuronType + SOFAI | `ProceduralNeuron` (catalog L1538). | v2 L5541. | — |
| 5 | Criticitate | `MEDIUM` (catalog L1540). | v2 L5544. | — |
| 6 | Înveliș telemetrie | Factory → `withCognitiveSpan` → `cognitive:e3:product:category-sync`. | v2 `cognitive.e3.product.category-sync` (L5555). | Convenție puncte vs `cognitive:nodeKey`. |
| 7 | Înveliș politică | Fără OPA explicit în a5; erori → excepții BullMQ. | Tier 4; HITL la eșecuri repetate (v2 L5545, L5553). | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI (L5552). | — |
| 9 | Guardrails | Logică deterministă SQL/DB. | NeMo destinație ADR-0007. | — |
| 10 | Escaladare HITL | Fără enqueue `human:*` în a5 citit. | v2 L5553. | — |
| 11 | Micro-OODA | Transformări deterministe pe payload categorii/produse. | OODA v2 L5551. | — |
| 12 | Tier + de-escaladare | Fără prag confidență. | Tier 4 (v2 L5545). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + `@cerniq/db`. | Stack larg v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e3.product.category-sync`.
- **Cod:** `cognitive:e3:product:category-sync` + atribute din catalog.
- **Stare:** instrumentare factory standard E3.

---
*Generator inițial:* înlocuit prin audit manual.
