<!-- neuron-contract:author-complete -->

# Neuron `alert:internal:contract-signed`

> **Status:** audit manual **2026-04-13**. **v2** definește coadă granulară `alert:internal:contract-signed` (`AlertNeuron`, E4). **Repo:** **nu** există literal `alert:internal:contract-signed` în `queue-registry.ts`, `cognitive-node-catalog.ts` sau `workers/**/*.{ts,tsx}` (`rg`). **Există** I39–I44 (`alert:payment` … `alert:dispatch`) cu `createAlertProcessor` — **fără** mapare explicită către acest nume v2.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `alert:internal:contract-signed` |
| etapa | E4 |
| familie (v2) | `alerts` |
| contract_path | `contracts/neurons/E4/alert--internal--contract-signed.md` |
| ADR familie (indicativ) | [alerts](../../adr/families/e4/alerts.md) |

## Scop în context real

**v2** (L6079–L6098): alertă internă contract semnat; OTel țintă `cognitive.alert.internal.contract-signed`. **Repo:** același strat I39–I44 ca în `i-alert-workers.ts` (audit `gold_audit_logs_etapa4`, `e4AlertsDispatchedTotal`); fără coadă BullMQ cu numele v2.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L6079–L6098.
- `workers/shared/src/queue-registry.ts` — L462–473 (**fără** coada granulară).
- `packages/shared/src/cognitive-node-catalog.ts` — L2593–2647.
- `workers/e4-postsale/src/workers/i-alert-workers.ts` — L62–170.
- `workers/e4-postsale/src/index.ts` — L460–496.
- `workers/shared/src/cognitive-helpers.ts` — L226.
- Căutare literal în `*.{ts,tsx,js,mjs}` — **0** rezultate (2026-04-13).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap**; cozi `alert:payment` … `alert:dispatch` în registry. | v2 queue L6093. | Granular v2 ≠ runtime. |
| 2 | Etapă, familie, swimlane | Catalog `e4:alert:*` → `social-action`. | v2 `alerts` / metrică swimlane `alerts` (L6097). | Posibilă nealiniere etichetă swimlane. |
| 3 | Rol declarat | Alert generic I39–I44. | Notificare eveniment contract (v2). | — |
| 4 | NeuronType + SOFAI | `AlertNeuron` I39–I44; fără rând pentru coada granulară. | v2 L6086. | — |
| 5 | Criticitate | Neconectat nominal. | `HIGH` L6088. | — |
| 6 | Înveliș telemetrie | Span `cognitive:e4:alert:*` pentru cozile existente. | v2 `cognitive.alert.internal.contract-signed` L6098. | Span granular neemis în sursa citită. |
| 7 | Înveliș politică | `i-alert-workers.ts` L14–17. | v2 L6096. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI L6095. | — |
| 9 | Guardrails | Audit + metrică. | — | — |
| 10 | Escaladare HITL | — | v2 L6096. | — |
| 11 | Micro-OODA | Log + metrică. | v2 L6094. | — |
| 12 | Tier + de-escaladare | — | Tier 3 L6089. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E4. | — | — |

### Mapare OTel

- **v2:** `cognitive.alert.internal.contract-signed` (L6098).
- **Cod:** doar `cognitive:e4:alert:payment` … `cognitive:e4:alert:dispatch` pentru alertele implementate.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
