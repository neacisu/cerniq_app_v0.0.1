<!-- neuron-contract:author-complete -->

# Neuron `stock:deduct:delivered`

> **Status:** audit manual **2026-04-13**. **v2** (L7289–L7309): coadă **`stock:deduct:delivered`**, `LogisticsNeuron` inferat, `MEDIUM`. **Repo:** coadă **`stock:deduct`** (**F29**), `StockNeuron`, **`HIGH`** în catalog — descriere „Deducere stoc la **DELIVERED**” (`cognitive-node-catalog.ts` L2499–L2505). **Semantic:** aliniat la livrare; **identificator** diferit de v2.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `stock:deduct:delivered` |
| etapa | E4 |
| familie (v2) | `logistics` |
| contract_path | `contracts/neurons/E4/stock--deduct--delivered.md` |
| ADR familie (indicativ) | [logistics](../../adr/families/e4/logistics.md) |

## Scop în context real

**Cod (F29):** la `DELIVERED`, scade `stockCount` per articol, alertă F31 dacă sub prag, audit `STOCK_DEDUCTED` (`f29-stock-deduct.ts` L1–12, L47–48). Registry: `E4_STOCK_DEDUCT: "stock:deduct"` (L442).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7289–L7309.
- `workers/shared/src/queue-registry.ts` — `E4_STOCK_DEDUCT: "stock:deduct"` (L442); **fără** `stock:deduct:delivered`.
- `packages/shared/src/cognitive-node-catalog.ts` — L2498–L2505.
- `workers/e4-postsale/src/workers/f29-stock-deduct.ts` — `withCognitiveSpan("e4:stock:deduct", …)` (L47–48).
- `workers/e4-postsale/src/index.ts` — F29 L423–427.
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L7305).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`stock:deduct`** / `e4:stock:deduct`. | v2 **`stock:deduct:delivered`** L7303. | Nume coadă diferit. |
| 2 | Etapă, familie, swimlane | `logistics` (L2503). | v2 `logistics` (L7292). | — |
| 3 | Rol declarat | Deducere la DELIVERED (header F29 L5). | v2 L7301–L7302. | — |
| 4 | NeuronType + SOFAI | **`StockNeuron`**. | v2 **`LogisticsNeuron`** (L7296). | Contradicție. |
| 5 | Criticitate | **`HIGH`** (L2505). | v2 **`MEDIUM`** (L7298). | Contradicție. |
| 6 | Înveliș telemetrie | `cognitive:e4:stock:deduct`. | v2 `cognitive.stock.deduct.delivered` (L7308). | Prefixe diferite. |
| 7 | Înveliș politică | — | v2 L7306. | — |
| 8 | Rutare model (dacă AI) | **N/A** | L7305. | — |
| 9 | Guardrails | Prag stoc scăzut + enqueue F31 (F29). | — | — |
| 10 | Escaladare HITL | — | v2 L7306. | — |
| 11 | Micro-OODA | SELECT items + UPDATE stock. | v2 OODA AWB (L7304). | v2 OODA generic logistică. |
| 12 | Tier + de-escaladare | — | Tier 4 (L7299). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + DB. | — | — |

### Mapare OTel

- **v2:** `cognitive.stock.deduct.delivered` (L7308).
- **Cod:** `cognitive:e4:stock:deduct`.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
