<!-- neuron-contract:author-complete -->

# Neuron `hitl:task:nps-followup`

> **Status:** audit manual **2026-04-13**. **v2** (L8655–8675): coadă `hitl:task:nps-followup`, `HumanNeuron`, OTel `cognitive.hitl.task.nps-followup`. **Repo:** **fără** această coadă în registry/catalog/workers. **Flux NPS automat:** `feedback:nps:send` (H43) / `feedback:nps:process` (H44) — **fără** prefix `hitl:task:`; H44 enfilează `churn:signal:detect` sau `state:advocate:promote`, nu un HITL `nps-followup`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `hitl:task:nps-followup` |
| etapa | E5 |
| familie (v2) | `hitl` |
| contract_path | `contracts/neurons/E5/hitl--task--nps-followup.md` |
| ADR familie (indicativ) | [hitl](../../adr/families/e5/hitl.md) |

## Scop în context real

**v2:** follow-up uman post-NPS (L8666–8668). **Cod:** procesare scor în `h44-feedback-nps-process.ts` (determinist); **nu** echivalează neuronului v2 HITL granular.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`hitl:task:nps-followup\`` (L8655–8675).
- `workers/shared/src/queue-registry.ts` — fără `hitl:task:nps-followup`; există `E5_FEEDBACK_NPS_SEND`, `E5_FEEDBACK_NPS_PROCESS` (L605–607).
- `workers/e5-nurturing/src/workers/h44-feedback-nps-process.ts` — flux downstream churn/advocate (L11–17, L134–146).
- Căutare `hitl:task:nps-followup` — **0** în TS (2026-04-13).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8671).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** — fără coadă v2 în runtime. | Confirmed queue (L8669). | NPS automat sub `feedback:*`. |
| 2 | Etapă, familie, swimlane | Neconectat. | E5, `hitl` (L8657–8658). | — |
| 3 | Rol declarat | Lipsă worker HITL dedicat. | Follow-up uman (L8666–8668). | — |
| 4 | NeuronType + SOFAI | Neconectat. | `HumanNeuron` (L8662). | — |
| 5 | Criticitate | Neconectat. | `CRITICAL` (L8664). | — |
| 6 | Înveliș telemetrie | Lipsă. | `cognitive.hitl.task.nps-followup` (L8674). | — |
| 7 | Înveliș politică | — | SLA 2h (L8672). | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI (L8671). | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L8672. | — |
| 11 | Micro-OODA | — | LangGraph (L8670). | — |
| 12 | Tier + de-escaladare | — | Tier 2 (L8665). | — |
| 13 | Stack (subset plan v2) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.hitl.task.nps-followup` (L8674).
- **Cod:** —

---
*Revizuire manuală:* dovezi repo 2026-04-13.
