<!-- neuron-contract:author-complete -->

# Neuron `alert:internal:return-received`

> **Status:** audit manual **2026-04-13**. **v2** — `alert:internal:return-received`. **Repo:** literal **absent** în TS/JS. Fluxuri retur H37–H38 (`return:initiate`, `return:process`) sunt cozi distincte de alertă — **nu** înlocuiesc coada v2 fără dovada emitere job pe `alert:internal:return-received`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `alert:internal:return-received` |
| etapa | E4 |
| familie (v2) | `alerts` |
| contract_path | `contracts/neurons/E4/alert--internal--return-received.md` |
| ADR familie (indicativ) | [alerts](../../adr/families/e4/alerts.md) |

## Scop în context real

**v2** (L6189–L6208): alertă internă la primire retur. **Repo:** `i-alert-workers.ts` menționează triggeri livrare/retur pentru I40 (`alert:delivery`) la nivel de comentariu (L144–145) — totuși procesorul rămâne `e4:alert:delivery`, nu coada granulară v2.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L6189–L6208.
- `workers/shared/src/queue-registry.ts` — `E4_ALERT_DELIVERY` (L465); `E4_RETURN_*` (ex. L455+).
- `packages/shared/src/cognitive-node-catalog.ts` — L2593–2647.
- `workers/e4-postsale/src/workers/i-alert-workers.ts` — L144–146, L62–170.
- `workers/e4-postsale/src/index.ts` — L460–496, H37–H38 workers L440–458.
- Căutare `alert:internal:return-received` — **0** (2026-04-13).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** nominal; există `alert:delivery` + cozi retur. | L6203. | — |
| 2 | Etapă, familie, swimlane | Catalog → `social-action`. | v2 `alerts` (L6207). | — |
| 3 | Rol declarat | I40 livrare/retur (comentariu); H38 procesare retur. | Alertă primire retur (v2). | — |
| 4 | NeuronType + SOFAI | `AlertNeuron`. | v2 L6196. | — |
| 5 | Criticitate | — | `HIGH` L6198. | — |
| 6 | Înveliș telemetrie | `cognitive:e4:alert:delivery` dacă folosit. | `cognitive.alert.internal.return-received` L6208. | Denumiri diferite. |
| 7 | Înveliș politică | `i-alert-workers.ts` L14–17. | v2 L6206. | — |
| 8 | Rutare model (dacă AI) | **N/A** | L6205. | — |
| 9 | Guardrails | Audit + metrică pe alerte. | — | — |
| 10 | Escaladare HITL | — | v2 L6206. | — |
| 11 | Micro-OODA | Log + metrică. | v2 L6204. | — |
| 12 | Tier + de-escaladare | — | Tier 3 L6199. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ. | — | — |

### Mapare OTel

- **v2:** `cognitive.alert.internal.return-received` (L6208).
- **Cod:** fără coadă dedicată; posibil overlap semantic cu I40 — neexplicit.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
