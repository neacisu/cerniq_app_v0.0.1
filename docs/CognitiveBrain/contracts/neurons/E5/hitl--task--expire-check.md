<!-- neuron-contract:author-complete -->

# Neuron `hitl:task:expire-check`

> **Status:** audit manual **2026-04-13**. **v2** (L8633–8653): coadă `hitl:task:expire-check`, `HumanNeuron`, OTel `cognitive.hitl.task.expire-check`. **Repo:** **fără** literal în registry/catalog/workers. **Nu confunda** cu `negotiation:expire:check` (E3, `E3_NEGOTIATION_EXPIRE_CHECK` în `queue-registry.ts` L240) — alt domeniu.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `hitl:task:expire-check` |
| etapa | E5 |
| familie (v2) | `hitl` |
| contract_path | `contracts/neurons/E5/hitl--task--expire-check.md` |
| ADR familie (indicativ) | [hitl](../../adr/families/e5/hitl.md) |

## Scop în context real

**v2:** verificare expirare task-uri HITL E5 (L8644–8646). **Cod:** niciun handler pentru această coadă.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`hitl:task:expire-check\`` (L8633–8653).
- `workers/shared/src/queue-registry.ts` — fără `hitl:task:expire-check`; există `negotiation:expire:check` (E3) — **altă coadă**.
- `packages/shared/src/cognitive-node-catalog.ts` — fără potrivire.
- Căutare `hitl:task:expire-check` în TypeScript — **0** (2026-04-13).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8649).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** — fără registry. | Confirmed queue (L8647). | — |
| 2 | Etapă, familie, swimlane | Neconectat. | E5, `hitl` (L8635–8636). | — |
| 3 | Rol declarat | Lipsă handler. | Expire-check HITL (L8644–8646). | — |
| 4 | NeuronType + SOFAI | Neconectat. | `HumanNeuron` (L8640). | — |
| 5 | Criticitate | Neconectat. | `CRITICAL` (L8642). | — |
| 6 | Înveliș telemetrie | Lipsă. | `cognitive.hitl.task.expire-check` (L8652). | — |
| 7 | Înveliș politică | — | SLA 2h (L8650). | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI (L8649). | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L8650. | — |
| 11 | Micro-OODA | — | LangGraph (L8648). | — |
| 12 | Tier + de-escaladare | — | Tier 2 (L8643). | — |
| 13 | Stack (subset plan v2) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.hitl.task.expire-check` (L8652).
- **Cod:** —

---
*Revizuire manuală:* dovezi repo 2026-04-13.
