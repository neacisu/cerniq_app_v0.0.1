<!-- neuron-contract:author-complete -->

# Neuron `churn:recovery:attempt`

> **Status:** audit manual **2026-04-13**. v2 L7625–7645 — graph-export **`churn:recovery:attempt`**; **fără** literal în `queue-registry.ts` sau catalog la audit. ADR [`e5/churn.md`](../../adr/families/e5/churn.md) L46: cozi `churn:recovery:*` **nu** în `QUEUES` citit.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `churn:recovery:attempt` |
| etapa | E5 |
| familie (v2) | `churn` |
| contract_path | `contracts/neurons/E5/churn--recovery--attempt.md` |
| ADR familie (indicativ) | [churn](../../adr/families/e5/churn.md) |

## Scop în context real

Încercare recuperare churn (graf). **Cod:** fără worker dedicat cu acest nume; winback poate fi legat indirect (ex. cozi create în B11) — **fără echivalență 1:1** fără dovezi suplimentare.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L7625–7645.
- Registry / catalog: fără `churn:recovery:attempt`.
- ADR: [`adr/families/e5/churn.md`](../../adr/families/e5/churn.md).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `churn` (v2 L7625–7645)

- **Confirmed queue field:** `churn:recovery:attempt`
- **Evidence status:** graph-export (L7645)
- **Model routing (v2):** LLM (L7641)
- **OTel (v2):** `cognitive.churn.recovery.attempt`

## N/A pe criterii

- **8 — Rutare model:** N/A până la existența handlerului — sau marcat „țintă v2” fără cod.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** runtime. | v2 L7639. | — |
| 2 | Etapă, familie, swimlane | — | v2 E5. | — |
| 3 | Rol declarat | — | v2 L7637–7638. | — |
| 4 | NeuronType + SOFAI | — | PredictiveNeuron inferat. | — |
| 5 | Criticitate | — | MEDIUM inferat. | — |
| 6 | Înveliș telemetrie | — | v2 L7644. | — |
| 7 | Înveliș politică | — | v2 L7642. | — |
| 8 | Rutare model (dacă AI) | Fără handler → **țintă v2** L7641. | v2 LLM. | Fără dovadă implementare. |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L7642. | — |
| 11 | Micro-OODA | — | v2 L7640. | — |
| 12 | Tier + de-escaladare | — | Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.churn.recovery.attempt`.
- **Cod:** neimplementat ca atare.

---
*Audit manual 2026-04-13.*
