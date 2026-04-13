<!-- neuron-contract:author-complete -->

# Neuron `alert:internal:nps-drop`

> **Status:** audit manual **2026-04-13**. v2 L7512–7532 — graph-export **`alert:internal:nps-drop`**; **fără** literal în `queue-registry.ts` la audit.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `alert:internal:nps-drop` |
| etapa | E5 |
| familie (v2) | `alerts` |
| contract_path | `contracts/neurons/E5/alert--internal--nps-drop.md` |
| ADR familie (indicativ) | [alerts](../../adr/families/e5/alerts.md), [feedback](../../adr/families/e5/feedback.md) |

## Scop în context real

Alertă internă scădere NPS (graf). **Cod:** fără coadă dedicată; agregări sentiment pot exista în `sentiment:aggregate` (E5) — **nu** echivalent direct fără dovezi suplimentare.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L7512–7532.
- Registry: fără literal.
- Catalog (vecin): `e5:sentiment:aggregate` / `sentiment:aggregate` — trend sentiment, nu NPS explicit.
- ADR: [`adr/families/e5/alerts.md`](../../adr/families/e5/alerts.md).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `alerts` (v2 L7512–7532)

- **Confirmed queue field:** `alert:internal:nps-drop`
- **OTel (v2):** `cognitive.alert.internal.nps-drop`
- **Evidence status:** graph-export (L7532)

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** runtime. | v2 L7526. | — |
| 2 | Etapă, familie, swimlane | — | v2 E5. | — |
| 3 | Rol declarat | — | v2 L7524–7525. | — |
| 4 | NeuronType + SOFAI | — | AlertNeuron inferat. | — |
| 5 | Criticitate | — | HIGH inferat. | — |
| 6 | Înveliș telemetrie | — | v2 L7531. | — |
| 7 | Înveliș politică | — | v2 L7529. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L7529. | — |
| 11 | Micro-OODA | — | v2 L7527. | — |
| 12 | Tier + de-escaladare | — | Tier 3. | — |
| 13 | Stack v2 §2.3 (subset) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.alert.internal.nps-drop`.
- **Cod:** neimplementat ca atare.

---
*Audit manual 2026-04-13.*
