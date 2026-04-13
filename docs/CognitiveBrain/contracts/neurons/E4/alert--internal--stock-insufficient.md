<!-- neuron-contract:author-complete -->

# Neuron `alert:internal:stock-insufficient`

> **Status:** audit manual **2026-04-13**. **v2** — `alert:internal:stock-insufficient`. **Repo:** literal **absent** în TS/JS. **Există** I43 `alert:stock` / `e4:alert:stock` pentru stoc scăzut (`i-alert-workers.ts` L160–164) — tematică apropiată, dar **nu** același identificator de coadă ca în v2.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `alert:internal:stock-insufficient` |
| etapa | E4 |
| familie (v2) | `alerts` |
| contract_path | `contracts/neurons/E4/alert--internal--stock-insufficient.md` |
| ADR familie (indicativ) | [alerts](../../adr/families/e4/alerts.md) |

## Scop în context real

**v2** (L6211–L6230): alertă internă stoc insuficient. **Repo:** I43 implementează alertă stoc cu `defaultEntityType` `gold_products` (L164); alinierea la „insufficient” vs „low stock” depinde de `alertType` în payload — **nu** impusă de numele cozii v2.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L6211–L6230.
- `workers/shared/src/queue-registry.ts` — `E4_ALERT_STOCK: "alert:stock"` (L471).
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:alert:stock` (L2630–2637).
- `workers/e4-postsale/src/workers/i-alert-workers.ts` — L160–164.
- `workers/e4-postsale/src/index.ts` — I43 L486–489.
- Căutare `alert:internal:stock-insufficient` — **0** (2026-04-13).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** nominal; există `alert:stock`. | L6225. | — |
| 2 | Etapă, familie, swimlane | `e4:alert:stock` → `social-action`. | v2 `alerts` (L6229). | — |
| 3 | Rol declarat | I43 stoc scăzut. | Stoc insuficient intern (v2). | Semantica payload: neforțată în codul citit. |
| 4 | NeuronType + SOFAI | `AlertNeuron`. | v2 L6218. | — |
| 5 | Criticitate | Catalog I43: `MEDIUM`. | v2 `HIGH` L6220. | **Contradicție** criticitate catalog vs v2. |
| 6 | Înveliș telemetrie | `cognitive:e4:alert:stock`. | `cognitive.alert.internal.stock-insufficient` L6230. | Denumiri diferite. |
| 7 | Înveliș politică | `i-alert-workers.ts` L14–17. | v2 L6228. | — |
| 8 | Rutare model (dacă AI) | **N/A** | L6227. | — |
| 9 | Guardrails | Audit + metrică. | — | — |
| 10 | Escaladare HITL | — | v2 L6228. | — |
| 11 | Micro-OODA | Log + metrică. | v2 L6226. | — |
| 12 | Tier + de-escaladare | — | Tier 3 L6221. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ. | — | — |

### Mapare OTel

- **v2:** `cognitive.alert.internal.stock-insufficient` (L6230).
- **Cod:** `cognitive:e4:alert:stock` pentru I43.

---
*Revizuire manuală:* dovezi repo 2026-04-13; reconciliere criticitate catalog vs v2 deschisă.
