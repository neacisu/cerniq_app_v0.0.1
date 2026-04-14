<!-- neuron-contract:author-complete -->

# Neuron `alert:internal:competitor-price`

> **Status:** audit manual **2026-04-13**. v2 L7468–7488 — graph-export; **fără** literal în `queue-registry.ts`. Synapse-uri v2 leagă nodul de fluxuri compliance/content (vezi plan).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `alert:internal:competitor-price` |
| etapa | E5 |
| familie (v2) | `alerts` |
| contract_path | `contracts/neurons/E5/alert--internal--competitor-price.md` |
| ADR familie (indicativ) | [alerts](../../adr/families/e5/alerts.md) |

## Scop în context real

Alertă internă preț competitor (graf). **Cod:** fără coadă dedicată cu acest nume; pricing competitor poate fi în alte cozi E3/E5 (cercetare separată dacă e în scope).

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L7468–7488.
- Registry: fără literal.
- ADR: [`adr/families/e5/alerts.md`](../../adr/families/e5/alerts.md).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `alerts` (v2 L7468–7488)

- **Confirmed queue field:** `alert:internal:competitor-price`
- **OTel (v2):** `cognitive.alert.internal.competitor-price`
- **Evidence status:** graph-export (L7488)

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** runtime. | v2 L7482. | — |
| 2 | Etapă, familie, swimlane | — | v2 E5. | — |
| 3 | Rol declarat | — | v2 L7480–7481. | — |
| 4 | NeuronType + SOFAI | — | AlertNeuron inferat. | — |
| 5 | Criticitate | — | HIGH inferat. | — |
| 6 | Înveliș telemetrie | — | v2 L7487. | — |
| 7 | Înveliș politică | — | v2 L7485. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L7485. | — |
| 11 | Micro-OODA | — | v2 L7483. | — |
| 12 | Tier + de-escaladare | — | Tier 3. | — |
| 13 | Stack v2 §2.3 (subset) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.alert.internal.competitor-price`.
- **Cod:** neimplementat ca atare.

---
*Audit manual 2026-04-13.*
