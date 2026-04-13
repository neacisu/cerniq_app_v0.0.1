<!-- neuron-contract:author-complete -->

# Neuron `stock:sync:erp`

> **Status:** audit manual **2026-04-13**. **Cod:** F36 — **STUB** pentru apel ERP: fără `items` în job → log + `syncedCount: 0`; cu `items` → UPSERT `stock_inventory`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `stock:sync:erp` |
| etapa | E3 |
| familie (v2) | `stock` |
| contract_path | `contracts/neurons/E3/stock--sync--erp.md` |
| ADR familie (indicativ) | [stock](../../adr/families/e3/stock.md) |

## Scop în context real

**v2** (L5812–5835): sincronizare stoc din ERP extern. **Cod:** comentariu explicit integrare API pending; ramura fără items loghează STUB (`f36-stock-sync-erp.ts` L5–7, L40–44); ramura cu items face merge în DB (L48+).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`stock:sync:erp\`` (L5812–5835).
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:stock:sync-erp` / `stock:sync:erp` (L1823–1830).
- `workers/shared/src/queue-registry.ts` — `E3_STOCK_SYNC_ERP` (L262); concurență (L950).
- `workers/e3-ai-sales/src/main.ts` — `processors["stock:sync:erp"]` (L217).
- `workers/e3-ai-sales/src/workers/f36-stock-sync-erp.ts`.
- `workers/e3-ai-sales/src/__tests__/f-workers.test.ts` — `F36 — stockSyncErpProcessor`.
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation` (L90–107).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L215–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5831).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e3:stock:sync-erp` (L1824–1825); registry L262; `main.ts` L217. | v2 L5829. | — |
| 2 | Etapă, familie, swimlane | `stock-management` (L1827). | v2 L5822. | — |
| 3 | Rol declarat | UPSERT inventar sau STUB fără items (f36 L40–44, L48+). | v2 L5826–5828. | ERP extern **neconectat** în ramura goală. |
| 4 | NeuronType + SOFAI | `ToolNeuron` (L1826). | v2 L5820. | — |
| 5 | Criticitate | `HIGH` (L1829). | v2 L5823. | — |
| 6 | Înveliș telemetrie | Span `cognitive:e3:stock:sync-erp` când `tenantId` în job. | v2 `cognitive.e3.stock.sync-erp` (L5834). | — |
| 7 | Înveliș politică | — | v2 L5824, L5832. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Determinist pe date furnizate în `items`. | — | — |
| 10 | Escaladare HITL | — | v2 L5832. | — |
| 11 | Micro-OODA | v2 menționează API/cache (L5830); cod STUB fără items. | v2 L5830. | — |
| 12 | Tier + de-escaladare | — | Tier 3 (v2 L5824). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ; apel ERP **lipsă** în STUB. | — | — |

### Mapare OTel

- **v2:** `cognitive.e3.stock.sync-erp`.
- **Cod:** span `cognitive:e3:stock:sync-erp` + atribute catalog standard (`cognitive-helpers.ts` L226–234); înveliș `factory.ts` (L90–107).
- **Stare:** **parțial aliniat** (cheie canonică); comportament business incomplet până la integrarea ERP.

---
*Generator inițial:* înlocuit prin audit manual.
