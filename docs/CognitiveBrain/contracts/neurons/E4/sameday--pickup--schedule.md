<!-- neuron-contract:author-complete -->

# Neuron `sameday:pickup:schedule`

> **Status:** audit manual **2026-04-13**. **v2** (L7189–L7212): coadă `sameday:pickup:schedule`, cron `0 14 * * *` în catalog (L7203). **Repo:** **E27** — `E4_SAMEDAY_PICKUP_SCHEDULE` (`queue-registry.ts` L416), worker `index.ts` L364–369, cron repeat `0 14 * * *` / `jobId` `sameday:pickup:schedule:cron` (`index.ts` L622–630). **Fără** `withCognitiveSpan` în `e27-sameday-pickup-schedule.ts`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `sameday:pickup:schedule` |
| etapa | E4 |
| familie (v2) | `logistics` |
| contract_path | `contracts/neurons/E4/sameday--pickup--schedule.md` |
| ADR familie (indicativ) | [logistics](../../adr/families/e4/logistics.md) |

## Scop în context real

Programare pickup batch pentru expedieri `CREATED` (text catalog L2481; v2 L7203–L7204).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7189–L7212.
- `workers/shared/src/queue-registry.ts` — L416.
- `packages/shared/src/cognitive-node-catalog.ts` — L2478–L2485.
- `workers/e4-postsale/src/workers/e27-sameday-pickup-schedule.ts` — fără `withCognitiveSpan` (`rg`).
- `workers/e4-postsale/src/index.ts` — E27 worker L364–369; cron L622–630.
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L7208).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Coadă + `e4:sameday:pickup-schedule`. | v2 L7206. | — |
| 2 | Etapă, familie, swimlane | `logistics` (L2482). | v2 L7199. | — |
| 3 | Rol declarat | Cron pickup batch. | v2 L7203–L7204. | — |
| 4 | NeuronType + SOFAI | `LogisticsNeuron`. | v2 L7197. | — |
| 5 | Criticitate | `MEDIUM` (L2484). | v2 L7200. | — |
| 6 | Înveliș telemetrie | Fără `withCognitiveSpan` în E27. | v2 `cognitive.e4.sameday.pickup-schedule` (L7211). | Gap span. |
| 7 | Înveliș politică | — | v2 L7209. | — |
| 8 | Rutare model (dacă AI) | **N/A** | L7208. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L7209. | — |
| 11 | Micro-OODA | — | v2 L7207. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L7201). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ cron. | — | — |

### Mapare OTel

- **v2:** `cognitive.e4.sameday.pickup-schedule` (L7211).
- **Cod:** span cognitiv standard neobservat în E27.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
