<!-- neuron-contract:author-complete -->

# Neuron `alert:client:welcome`

> **Status:** audit manual **2026-04-13**. v2 L7402–7422 — coadă graf **`alert:client:welcome`**; **lipsește** din `queue-registry.ts` la audit. Vezi ADR [`e5/alerts.md`](../../adr/families/e5/alerts.md).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `alert:client:welcome` |
| etapa | E5 |
| familie (v2) | `alerts` |
| contract_path | `contracts/neurons/E5/alert--client--welcome.md` |
| ADR familie (indicativ) | [alerts](../../adr/families/e5/alerts.md) |

## Scop în context real

Alertă / mesaj de bun venit către client — definit în graf; **fără** handler BullMQ cu acest nume în evidențele citite.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L7402–7422.
- Registry: fără literal `alert:client:welcome`.
- ADR: [`adr/families/e5/alerts.md`](../../adr/families/e5/alerts.md).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `alerts` (v2 L7402–7422)

- **Confirmed queue field:** `alert:client:welcome`
- **Evidence status:** graph-export (L7422)
- **OTel (v2):** `cognitive.alert.client.welcome`

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** registry/catalog pentru literal. | v2 L7416. | — |
| 2 | Etapă, familie, swimlane | — | v2 E5, `alerts`. | — |
| 3 | Rol declarat | — | v2 L7414–7415. | — |
| 4 | NeuronType + SOFAI | — | AlertNeuron inferat. | — |
| 5 | Criticitate | — | HIGH inferat. | — |
| 6 | Înveliș telemetrie | — | v2 L7421. | — |
| 7 | Înveliș politică | — | v2 L7419. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L7419. | — |
| 11 | Micro-OODA | — | v2 L7417. | — |
| 12 | Tier + de-escaladare | — | Tier 3. | — |
| 13 | Stack v2 §2.3 (subset) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.alert.client.welcome`.
- **Cod:** neimplementat ca coadă dedicată la audit.

---
*Audit manual 2026-04-13.*
