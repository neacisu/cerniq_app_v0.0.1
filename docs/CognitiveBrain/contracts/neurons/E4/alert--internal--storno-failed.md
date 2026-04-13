<!-- neuron-contract:author-complete -->

# Neuron `alert:internal:storno-failed`

> **Status:** audit manual **2026-04-13**. **v2** — `alert:internal:storno-failed`. **Repo:** literal **absent** în `*.{ts,tsx,js,mjs}`. I39 (`alert:payment`) poate acoperi eșecuri de plată/storno **doar** dacă producătorii emit job-uri pe acea coadă cu `alertType` potrivit — neverificat în această sesiune.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `alert:internal:storno-failed` |
| etapa | E4 |
| familie (v2) | `alerts` |
| contract_path | `contracts/neurons/E4/alert--internal--storno-failed.md` |
| ADR familie (indicativ) | [alerts](../../adr/families/e4/alerts.md) |

## Scop în context real

**v2** (L6233–L6252): alertă internă eșec storno. **Repo:** infrastructură I39–I44; fără coadă dedicată și fără literal în cod.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L6233–L6252.
- `workers/shared/src/queue-registry.ts` — L462–473.
- `packages/shared/src/cognitive-node-catalog.ts` — L2593–2647.
- `workers/e4-postsale/src/workers/i-alert-workers.ts` — `alertPaymentProcessor` L140, L62–170.
- `workers/e4-postsale/src/index.ts` — I39 L462–465.
- Căutare `alert:internal:storno-failed` — **0** (2026-04-13).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap**; opțional overlap semantic cu `alert:payment`. | L6247. | Producerii de job: neauditați. |
| 2 | Etapă, familie, swimlane | `e4:alert:*` → `social-action`. | v2 `alerts` (L6251). | — |
| 3 | Rol declarat | Alert generic / I39 plată. | Storno eșuat (v2). | — |
| 4 | NeuronType + SOFAI | `AlertNeuron`. | v2 L6240. | — |
| 5 | Criticitate | — | `HIGH` L6242. | — |
| 6 | Înveliș telemetrie | `cognitive:e4:alert:payment` dacă folosit. | `cognitive.alert.internal.storno-failed` L6252. | — |
| 7 | Înveliș politică | `i-alert-workers.ts` L14–17. | v2 L6250. | — |
| 8 | Rutare model (dacă AI) | **N/A** | L6249. | — |
| 9 | Guardrails | Audit + metrică. | — | — |
| 10 | Escaladare HITL | — | v2 L6250. | — |
| 11 | Micro-OODA | Log + metrică. | v2 L6248. | — |
| 12 | Tier + de-escaladare | — | Tier 3 L6243. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ. | — | — |

### Mapare OTel

- **v2:** `cognitive.alert.internal.storno-failed` (L6252).
- **Cod:** fără mapare explicită; posibil I39 doar prin convenție de payload.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
