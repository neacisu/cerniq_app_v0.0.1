<!-- neuron-contract:author-complete -->

# Neuron `churn:recovery:check`

> **Status:** audit manual **2026-04-13**. v2 L7647–7667 — graph-export **`churn:recovery:check`**; **fără** literal în `queue-registry.ts` / catalog. ADR churn: `churn:recovery:*` lipsă din registry.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `churn:recovery:check` |
| etapa | E5 |
| familie (v2) | `churn` |
| contract_path | `contracts/neurons/E5/churn--recovery--check.md` |
| ADR familie (indicativ) | [churn](../../adr/families/e5/churn.md) |

## Scop în context real

Verificare stare recuperare churn (graf). **Cod:** fără coadă dedicată în evidențele citite.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L7647–7667.
- Registry / catalog: fără literal.
- ADR: [`adr/families/e5/churn.md`](../../adr/families/e5/churn.md).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `churn` (v2 L7647–7667)

- **Confirmed queue field:** `churn:recovery:check`
- **Evidence status:** graph-export (L7667)
- **OTel (v2):** `cognitive.churn.recovery.check`
- **Model routing (v2):** LLM (L7663)

## N/A pe criterii

- **8 — Rutare model:** țintă v2 fără handler → N/A implementare.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** runtime. | v2 L7661. | — |
| 2 | Etapă, familie, swimlane | — | v2 E5. | — |
| 3 | Rol declarat | — | v2 L7659–7660. | — |
| 4 | NeuronType + SOFAI | — | PredictiveNeuron inferat. | — |
| 5 | Criticitate | — | MEDIUM inferat. | — |
| 6 | Înveliș telemetrie | — | v2 L7666. | — |
| 7 | Înveliș politică | — | v2 L7664. | — |
| 8 | Rutare model (dacă AI) | Fără cod. | v2 L7663. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L7664. | — |
| 11 | Micro-OODA | — | v2 L7662. | — |
| 12 | Tier + de-escaladare | — | Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.churn.recovery.check`.
- **Cod:** neimplementat ca atare.

---
*Audit manual 2026-04-13.*
