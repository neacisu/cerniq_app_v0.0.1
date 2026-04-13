<!-- neuron-contract:author-complete -->

# Neuron `alert:internal:delivery-cluster`

> **Status:** audit manual **2026-04-13**. v2 L7490–7510 — graph-export; **fără** literal în `queue-registry.ts`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `alert:internal:delivery-cluster` |
| etapa | E5 |
| familie (v2) | `alerts` |
| contract_path | `contracts/neurons/E5/alert--internal--delivery-cluster.md` |
| ADR familie (indicativ) | [alerts](../../adr/families/e5/alerts.md) |

## Scop în context real

Alertă internă cluster livrări (graf). **Cod:** fără coadă BullMQ cu acest nume în evidențele citite.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L7490–7510.
- Registry: fără literal.
- ADR: [`adr/families/e5/alerts.md`](../../adr/families/e5/alerts.md).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `alerts` (v2 L7490–7510)

- **Confirmed queue field:** `alert:internal:delivery-cluster`
- **OTel (v2):** `cognitive.alert.internal.delivery-cluster`
- **Evidence status:** graph-export (L7510)

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** runtime. | v2 L7504. | — |
| 2 | Etapă, familie, swimlane | — | v2 E5. | — |
| 3 | Rol declarat | — | v2 L7502–7503. | — |
| 4 | NeuronType + SOFAI | — | AlertNeuron inferat. | — |
| 5 | Criticitate | — | HIGH inferat. | — |
| 6 | Înveliș telemetrie | — | v2 L7509. | — |
| 7 | Înveliș politică | — | v2 L7507. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L7507. | — |
| 11 | Micro-OODA | — | v2 L7505. | — |
| 12 | Tier + de-escaladare | — | Tier 3. | — |
| 13 | Stack v2 §2.3 (subset) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.alert.internal.delivery-cluster`.
- **Cod:** neimplementat ca atare.

---
*Audit manual 2026-04-13.*
