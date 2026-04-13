<!-- neuron-contract:author-complete -->

# Neuron `hitl:dashboard:metrics`

> **Status:** audit manual **2026-04-13**. **v2** (L8567–8587): `HumanNeuron`, coadă `hitl:dashboard:metrics`, swimlane `hitl`, CRITICAL, OTel `cognitive.hitl.dashboard.metrics`. **Repo:** **fără** literal `hitl:dashboard:metrics` în `queue-registry.ts`, `cognitive-node-catalog.ts` și `workers/**/*.ts` (căutare exactă). **HITL E5** implementat în registry doar ca `hitl:winback:review` și `hitl:complaint:review` (L641–643).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `hitl:dashboard:metrics` |
| etapa | E5 |
| familie (v2) | `hitl` |
| contract_path | `contracts/neurons/E5/hitl--dashboard--metrics.md` |
| ADR familie (indicativ) | [hitl](../../adr/families/e5/hitl.md) |

## Scop în context real

**v2:** agregare / expunere metrici dashboard pentru supraveghere umană, OODA HITL cu LangGraph (L8583–8584). **Cod:** niciun worker BullMQ sau `withCognitiveSpan` mapat la această coadă la data auditului.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`hitl:dashboard:metrics\`` (L8567–8587).
- `workers/shared/src/queue-registry.ts` — fără `hitl:dashboard:metrics`; compară `E5_HITL_WINBACK_REVIEW`, `E5_HITL_COMPLAINT_REVIEW` (L639–643).
- `packages/shared/src/cognitive-node-catalog.ts` — fără `dashboard:metrics` / `hitl:dashboard` la audit.
- Căutare `hitl:dashboard:metrics` în `workers/`, `packages/`, `apps/` — **0** potriviri `.ts`/`.tsx` (2026-04-13).
- `docs/CognitiveBrain/adr/families/e5/hitl.md` — enumeră exemple cozi HITL E5 fără `dashboard:metrics`.
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8583).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap:** fără registry/catalog/worker pentru coada v2. | Confirmed queue (L8581). | v2 L8587 — nereconciliat cu registry. |
| 2 | Etapă, familie, swimlane | Neconectat. | E5, `hitl`, swimlane `hitl` (L8569–8570). | — |
| 3 | Rol declarat | Lipsă handler. | Operațional HITL dashboard (L8578–8580). | — |
| 4 | NeuronType + SOFAI | Neconectat. | `HumanNeuron` (L8574). | — |
| 5 | Criticitate | Neconectat. | `CRITICAL` (L8576). | — |
| 6 | Înveliș telemetrie | Lipsă procesor. | `cognitive.hitl.dashboard.metrics` (L8587). | Prefix OTel diferit de `cognitive:e5:…` folosit în worker-ii E5 existenți. |
| 7 | Înveliș politică | — | HITL mandatory, SLA 2h (L8585). | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI (L8583). | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | Auto-escalation (L8585). | — |
| 11 | Micro-OODA | — | OODA LangGraph (L8583). | LangGraph neconfirmat fără cod. |
| 12 | Tier + de-escaladare | — | Tier 2 (L8577). | — |
| 13 | Stack (subset plan v2) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.hitl.dashboard.metrics` (L8587).
- **Cod:** — (fără `withCognitiveSpan` pentru această coadă).

---
*Revizuire manuală:* dovezi repo 2026-04-13.
