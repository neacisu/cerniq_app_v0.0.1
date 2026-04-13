<!-- neuron-contract:author-complete -->

# Neuron `alert:internal:oblio-sync-failed`

> **Status:** audit manual **2026-04-13**. **v2** — `alert:internal:oblio-sync-failed`. **Repo:** literal **absent** în `*.{ts,tsx,js,mjs}`. Există flux stoc Oblio (ex. `stock:sync:oblio`, cron în `index.ts` L644–652) — **nu** echivalent cu coada de alertă granulară v2 fără dovezi suplimentare de emitere alertă.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `alert:internal:oblio-sync-failed` |
| etapa | E4 |
| familie (v2) | `alerts` |
| contract_path | `contracts/neurons/E4/alert--internal--oblio-sync-failed.md` |
| ADR familie (indicativ) | [alerts](../../adr/families/e4/alerts.md) |

## Scop în context real

**v2** (L6167–L6186): alertă internă eșec sincronizare Oblio. **Repo:** I43 (`alert:stock`) sau I44 (`alert:dispatch`) ar putea teoretic purta mesaje legate de logistică/stoc; **nu** există în codul citit mapare documentată Oblio → această coadă.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L6167–L6186.
- `workers/shared/src/queue-registry.ts` — alerte L462–473; `E4_STOCK_SYNC_OBLIO` în altă secțiune (vezi `index.ts` L645).
- `packages/shared/src/cognitive-node-catalog.ts` — L2593–2647.
- `workers/e4-postsale/src/workers/i-alert-workers.ts` — L62–170.
- `workers/e4-postsale/src/index.ts` — alert workers L460–496; cron stoc Oblio L644–652.
- Căutare `alert:internal:oblio-sync-failed` — **0** (2026-04-13).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** pentru coada v2. | L6181. | — |
| 2 | Etapă, familie, swimlane | `e4:alert:*` → `social-action`. | v2 `alerts` (L6185). | — |
| 3 | Rol declarat | Alert generic vs worker stoc Oblio separat. | Alertă sync Oblio (v2). | Legătură Oblio→alertă: neconfirmată. |
| 4 | NeuronType + SOFAI | `AlertNeuron` I39–I44. | v2 L6174. | — |
| 5 | Criticitate | — | `HIGH` L6176. | — |
| 6 | Înveliș telemetrie | `cognitive:e4:alert:*`. | `cognitive.alert.internal.oblio-sync-failed` L6186. | — |
| 7 | Înveliș politică | `i-alert-workers.ts` L14–17. | v2 L6184. | — |
| 8 | Rutare model (dacă AI) | **N/A** | L6183. | — |
| 9 | Guardrails | Audit + metrică (alerte). | — | — |
| 10 | Escaladare HITL | — | v2 L6184. | — |
| 11 | Micro-OODA | Log + metrică. | v2 L6182. | — |
| 12 | Tier + de-escaladare | — | Tier 3 L6177. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ. | — | — |

### Mapare OTel

- **v2:** `cognitive.alert.internal.oblio-sync-failed` (L6186).
- **Cod:** fără procesor pentru coada granulară.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
