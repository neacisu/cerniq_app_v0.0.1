<!-- neuron-contract:author-complete -->

# Neuron `alert:internal:churn-daily`

> **Status:** audit manual **2026-04-13**. v2 L7446–7466 — graph-export **`alert:internal:churn-daily`**; **fără** literal în `queue-registry.ts`. Nodul apare ca sursă în **synapse** din același plan v2 (legături compliance/content) — comportament **declarat în graf**, nu ca worker izolat în codul citit.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `alert:internal:churn-daily` |
| etapa | E5 |
| familie (v2) | `alerts` |
| contract_path | `contracts/neurons/E5/alert--internal--churn-daily.md` |
| ADR familie (indicativ) | [alerts](../../adr/families/e5/alerts.md) |

## Scop în context real

Alertă internă agregată churn zilnic (graf). **Cod:** fără coadă BullMQ cu acest nume; pipeline churn operațional folosește `churn:signal:detect`, `churn:score:calculate`, `churn:risk:escalate`, etc. (registry E5).

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L7446–7466; synapse `alert-internal-churn-daily-*` (ex. ~L10865+).
- Registry: fără `alert:internal:churn-daily`.
- ADR: [`adr/families/e5/alerts.md`](../../adr/families/e5/alerts.md).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `alerts` (v2 L7446–7466)

- **Confirmed queue field:** `alert:internal:churn-daily`
- **OTel (v2):** `cognitive.alert.internal.churn-daily`
- **Evidence status:** graph-export (L7466)

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** coadă runtime. | v2 L7460. | — |
| 2 | Etapă, familie, swimlane | — | v2 E5. | — |
| 3 | Rol declarat | — | v2 L7458–7459. | — |
| 4 | NeuronType + SOFAI | — | AlertNeuron inferat. | — |
| 5 | Criticitate | — | HIGH inferat. | — |
| 6 | Înveliș telemetrie | — | v2 L7465. | — |
| 7 | Înveliș politică | — | v2 L7463. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L7463. | — |
| 11 | Micro-OODA | — | v2 L7461. | — |
| 12 | Tier + de-escaladare | — | Tier 3. | — |
| 13 | Stack v2 §2.3 (subset) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.alert.internal.churn-daily`.
- **Cod:** neimplementat ca atare.

---
*Audit manual 2026-04-13.*
