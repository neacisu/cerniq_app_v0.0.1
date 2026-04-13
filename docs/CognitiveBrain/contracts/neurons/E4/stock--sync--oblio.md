<!-- neuron-contract:author-complete -->

# Neuron `stock:sync:oblio`

> **Status:** audit manual **2026-04-13**. **F28** — coadă **`stock:sync:oblio`**, catalog `e4:stock:sync-oblio`. `withCognitiveSpan("e4:stock:sync:oblio", …)` folosește **două puncte** în ultimele segmente; catalog folosește **cratimă** în `sync-oblio` — verificați `getNodeByKey` pentru atribute span.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `stock:sync:oblio` |
| etapa | E4 |
| familie (v2) | `logistics` |
| contract_path | `contracts/neurons/E4/stock--sync--oblio.md` |
| ADR familie (indicativ) | [logistics](../../adr/families/e4/logistics.md) |

## Scop în context real

Cron **\*/15** (înregistrat în `index.ts` E4): sincronizare stoc Oblio → `goldProducts.metadata.stockCount` prin `oblioClient.syncStock` (comentariu anti-halucinare: **STUB** în `oblio-client-e4.ts`), metrică `e4StockSyncTotal`.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L7355–7378.
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e4:stock:sync-oblio` (~L2488–2496).
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E4_STOCK_SYNC_OBLIO` (~L440), config ~L1174.
- Handler: [`f28-stock-sync-oblio.ts`](../../../../../workers/e4-postsale/src/workers/f28-stock-sync-oblio.ts).
- Bootstrap + cron: [`workers/e4-postsale/src/index.ts`](../../../../../workers/e4-postsale/src/index.ts) — F28 ~L416–417, cron ~L644–645.
- **Notă:** E3 are [`oblio:stock:sync`](../../../../../workers/e3-ai-sales/src/workers/g44-oblio-stock-sync.ts) — flux **diferit** (stock_inventory vs goldProducts).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `logistics` (v2 L7355–7378)

- **Catalog nodeKey:** `e4:stock:sync-oblio`
- **Neuron type:** StockNeuron
- **Swimlane:** `logistics`
- **Criticitate:** HIGH
- **Autonomy tier (v2):** Tier 3
- **Model routing:** Non-AI
- **OTel (v2):** `cognitive.e4.stock.sync-oblio`
- **Evidence status:** catalog-grounded

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Coadă `stock:sync:oblio`; `nodeKey` catalog `e4:stock:sync-oblio`. | v2 L7362–7372. | — |
| 2 | Etapă, familie, swimlane | Etapa 4, swimlane `logistics`. | v2 L7357–7365. | — |
| 3 | Rol declarat | F28 antet + pași SELECT produse → sync → UPDATE metadata (~L1–16, ~L48–117). | v2 L7369–7370. | Client Oblio STUB. |
| 4 | NeuronType + SOFAI | StockNeuron. | v2 L7363. | — |
| 5 | Criticitate | HIGH în catalog. | v2 L7366. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:stock:sync:oblio", …)` (F28 ~L42–43); span `cognitive:e4:stock:sync:oblio`. Metrică Prometheus în F28. | v2 L7376–7377. | **Nealiniere** string `nodeKey` span vs catalog (`sync:oblio` vs `sync-oblio`). |
| 7 | Înveliș politică | Try/catch per produs + logging. | v2 L7375. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | Filtru `isActive`, SKU non-null. | — | — |
| 10 | Escaladare HITL | Nu în F28. | v2 L7375. | — |
| 11 | Micro-OODA | Colectare SKU → apel sync → persistență. | v2 L7373. | — |
| 12 | Tier + de-escaladare | Fără prag încredere. | v2 Tier 3. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E4, Drizzle, Redis DB E4. | — | — |

### Mapare OTel

- **v2:** `cognitive.e4.stock.sync-oblio`.
- **Cod:** `cognitive:e4:stock:sync:oblio` — unificare recomandată cu cheia din catalog pentru `getNodeByKey`.

---
*Audit manual 2026-04-13.*
