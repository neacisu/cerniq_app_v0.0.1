<!-- neuron-contract:author-complete -->

# Neuron `stock:reserve:order`

> **Status:** audit manual **2026-04-13**. v2 L7333–7353: coadă graf `stock:reserve:order`, evidence **graph-export** — **nu** există literal în [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) sau în [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts). **Cel mai apropiat echivalent operațional:** E3 **`stock:reserve:create`** (`e3:stock:reserve-create`), worker [`f34-stock-reserve-create.ts`](../../../../../workers/e3-ai-sales/src/workers/f34-stock-reserve-create.ts) — etapă **E3**, nu E4.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `stock:reserve:order` |
| echivalent semantic (runtime) | `stock:reserve:create` (E3) |
| etapa (v2) | E4 |
| familie (v2) | `logistics` |
| contract_path | `contracts/neurons/E4/stock--reserve--order.md` |
| ADR familie (indicativ) | [logistics](../../adr/families/e4/logistics.md), [stock E3](../../adr/families/e3/stock.md) |

## Scop în context real

**Graf:** rezervare stoc la nivel de comandă în subgraph logistic E4. **Cod:** rezervările sunt modelate în **E3** sub numele `stock:reserve:create` / `stock:reserve:release` (vezi ADR e3-stock); specificațiile vechi [`etapa4-workers-F-stock-sync.md`](../../../../../docs/specifications/Etapa%204/etapa4-workers-F-stock-sync.md) menționează `stock:reserve:order` ca worker #29 — **nealinier** la constantele actuale `QUEUES`.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L7333–7353.
- Registry E3: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E3_STOCK_RESERVE_CREATE: "stock:reserve:create"` (~L260).
- ADR: [`adr/families/e3/stock.md`](../../adr/families/e3/stock.md).
- Spec (istoric): [`etapa4-workers-overview.md`](../../../../../docs/specifications/Etapa%204/etapa4-workers-overview.md) — tabel workeri 29–30.
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `logistics` (v2 L7333–7353)

- **Confirmed queue field:** `stock:reserve:order`
- **Neuron type (inferat):** LogisticsNeuron
- **Evidence status:** graph-export (L7353)
- **OTel (v2):** `cognitive.stock.reserve.order`

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI (v2).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap E4:** fără `stock:reserve:order` în registry. **E3:** `stock:reserve:create`, `e3:stock:reserve-create`. | v2 L7347. | Denumire comandă vs rezervare create. |
| 2 | Etapă, familie, swimlane | Implementare în **E3** stock; v2 plasează eticheta în **E4** logistics. | v2: E4, `logistics`. | Nealiniere etapă între graf și pachetul worker. |
| 3 | Rol declarat | Rezervare inventar în fluxul pre-comandă (ADR e3-stock). | v2 L7344–7346 — descriere logistică generică. | — |
| 4 | NeuronType + SOFAI | Catalog E3: `StockNeuron` pentru rezerve (vecin intrări stock). | v2 LogisticsNeuron inferat. | — |
| 5 | Criticitate | — | v2 inferat MEDIUM. | — |
| 6 | Înveliș telemetrie | Depinde de instrumentarea F34 (nu reluată aici). | v2 L7352. | — |
| 7 | Înveliș politică | — | v2 L7350. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | — | — |
| 11 | Micro-OODA | — | v2 L7348. | — |
| 12 | Tier + de-escaladare | — | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E3 pentru rezerve. | — | — |

### Mapare OTel

- **v2:** `cognitive.stock.reserve.order`.
- **Cod:** fără span dedicat pentru eticheta graf; destinație aliniere: instrumentare pe `e3:stock:reserve-create` dacă se unifică denumirile.

---
*Audit manual 2026-04-13.*
