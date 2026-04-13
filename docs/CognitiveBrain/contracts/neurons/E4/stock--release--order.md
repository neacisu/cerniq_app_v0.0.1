<!-- neuron-contract:author-complete -->

# Neuron `stock:release:order`

> **Status:** audit manual **2026-04-13**. v2 L7311–7331: coadă graf `stock:release:order` — **lipsește** din registry/catalog ca literal. **Echivalent operațional:** E3 **`stock:reserve:release`** (`e3:stock:reserve-release`), [`f35-stock-reserve-release.ts`](../../../../../workers/e3-ai-sales/src/workers/f35-stock-reserve-release.ts).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `stock:release:order` |
| echivalent semantic (runtime) | `stock:reserve:release` (E3) |
| etapa (v2) | E4 |
| familie (v2) | `logistics` |
| contract_path | `contracts/neurons/E4/stock--release--order.md` |
| ADR familie (indicativ) | [logistics](../../adr/families/e4/logistics.md), [stock E3](../../adr/families/e3/stock.md) |

## Scop în context real

Eliberare rezervă stoc (ex. anulare comandă) — în documentația de specificație E4 asociată cu `order:cancel`; în runtime actual, coada mapată este **`stock:reserve:release`** în E3.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L7311–7331.
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E3_STOCK_RESERVE_RELEASE` (~L261).
- ADR: [`adr/families/e3/stock.md`](../../adr/families/e3/stock.md).
- Spec triggers: [`etapa4-workers-triggers.md`](../../../../../docs/specifications/Etapa%204/etapa4-workers-triggers.md) — mențiune `stock:release:order`.
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `logistics` (v2 L7311–7331)

- **Confirmed queue field:** `stock:release:order`
- **Evidence status:** graph-export (L7331)
- **OTel (v2):** `cognitive.stock.release.order`

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap literal graf.** Runtime: `stock:reserve:release`. | v2 L7325. | `release:order` vs `reserve:release`. |
| 2 | Etapă, familie, swimlane | Worker E3; v2 E4. | v2 E4 `logistics`. | — |
| 3 | Rol declarat | Eliberare rezervă inventar (ADR e3-stock). | v2 L7323–7324. | — |
| 4 | NeuronType + SOFAI | StockNeuron (catalog E3). | v2 LogisticsNeuron inferat. | — |
| 5 | Criticitate | — | v2 MEDIUM inferat. | — |
| 6 | Înveliș telemetrie | — | v2 L7330. | — |
| 7 | Înveliș politică | — | v2 L7328. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | — | — |
| 11 | Micro-OODA | — | v2 L7326. | — |
| 12 | Tier + de-escaladare | — | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E3. | — | — |

### Mapare OTel

- **v2:** `cognitive.stock.release.order`.
- **Cod:** aliniere recomandată la `e3:stock:reserve-release` dacă graful este reconciliat.

---
*Audit manual 2026-04-13.*
