<!-- neuron-contract:author-complete -->

# Neuron `sameday:status:poll`

> **Status:** audit manual **2026-04-13**. **v2** (L7239–L7262): coadă `sameday:status:poll`, poll la 30 min. **Repo:** **E23** — `E4_SAMEDAY_STATUS_POLL` (`queue-registry.ts` L408), worker `index.ts` L332–337, cron `*/30 * * * *` (`index.ts` L611–619). **Observație:** E23 folosește `createServiceLogger` (`e23-sameday-status-poll.ts` L35) dar **nu** `withCognitiveSpan` (`rg` pe fișier — 0).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `sameday:status:poll` |
| etapa | E4 |
| familie (v2) | `logistics` |
| contract_path | `contracts/neurons/E4/sameday--status--poll.md` |
| ADR familie (indicativ) | [logistics](../../adr/families/e4/logistics.md) |

## Scop în context real

Poll expedieri active, compară cu tracking, enqueue E24 la schimbare status (header E23 L1–9).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7239–L7262.
- `workers/shared/src/queue-registry.ts` — L408.
- `packages/shared/src/cognitive-node-catalog.ts` — L2442–L2449.
- `workers/e4-postsale/src/workers/e23-sameday-status-poll.ts` — logger L35; fără `withCognitiveSpan`.
- `workers/e4-postsale/src/index.ts` — E23 L332–337; cron L611–619.
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L7258).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Coadă + `e4:sameday:status-poll`. | v2 L7256. | — |
| 2 | Etapă, familie, swimlane | `logistics` (L2446). | v2 L7249. | — |
| 3 | Rol declarat | Poll + enqueue E24. | v2 L7253–L7254. | — |
| 4 | NeuronType + SOFAI | `LogisticsNeuron`. | v2 L7247. | — |
| 5 | Criticitate | `HIGH` (L2448). | v2 L7250. | — |
| 6 | Înveliș telemetrie | Logger serviciu; fără span cognitiv `withCognitiveSpan`. | v2 `cognitive.e4.sameday.status-poll` (L7261). | Gap span cognitiv; alt canal log. |
| 7 | Înveliș politică | — | v2 L7259. | — |
| 8 | Rutare model (dacă AI) | **N/A** | L7258. | — |
| 9 | Guardrails | Rate limit menționat în header E23 (L8). | — | — |
| 10 | Escaladare HITL | — | v2 L7259. | — |
| 11 | Micro-OODA | — | v2 L7257. | — |
| 12 | Tier + de-escaladare | — | Tier 3 (L7251). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + `@cerniq/observability`. | — | — |

### Mapare OTel

- **v2:** `cognitive.e4.sameday.status-poll` (L7261).
- **Cod:** fără `withCognitiveSpan` în E23; observabilitate prin `createServiceLogger`.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
