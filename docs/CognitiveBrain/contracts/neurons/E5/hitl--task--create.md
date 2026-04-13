<!-- neuron-contract:author-complete -->

# Neuron `hitl:task:create`

> **Status:** audit manual **2026-04-13**. **v2** (L8611–8631): coadă `hitl:task:create`, `HumanNeuron`, OTel `cognitive.hitl.task.create`. **Repo:** **fără** această coadă în `queue-registry.ts` / catalog / workers. **Pattern apropiat:** E4 folosește `approvalService.createTask` în `k-hitl-workers.ts` pentru K48–K53 (ex. credit override) — **nu** echivalent direct cu numele v2 E5.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `hitl:task:create` |
| etapa | E5 |
| familie (v2) | `hitl` |
| contract_path | `contracts/neurons/E5/hitl--task--create.md` |
| ADR familie (indicativ) | [hitl](../../adr/families/e5/hitl.md) |

## Scop în context real

**v2:** creare task HITL în E5 (L8622–8624). **Cod:** specificație `docs/specifications/Etapa 5/etapa5-hitl-system.md` menționează pattern `hitl:task:create` (L375+) — **nu** înlocuiește absența din registry/runtime verificat.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`hitl:task:create\`` (L8611–8631).
- `workers/shared/src/queue-registry.ts` — fără `hitl:task:create`; HITL E5: `hitl:winback:review`, `hitl:complaint:review` (L639–643).
- `packages/shared/src/cognitive-node-catalog.ts` — fără potrivire.
- Căutare `hitl:task:create` în `workers/**/*.ts` — **0** (2026-04-13).
- `docs/specifications/Etapa 5/etapa5-hitl-system.md` — referință conceptuală (ex. L375+).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8627).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** runtime. | Confirmed queue (L8625). | Spec vs registry nealiniate. |
| 2 | Etapă, familie, swimlane | Neconectat. | E5, `hitl` (L8613–8614). | — |
| 3 | Rol declarat | Lipsă worker. | HITL task create (L8622–8624). | — |
| 4 | NeuronType + SOFAI | Neconectat. | `HumanNeuron` (L8618). | — |
| 5 | Criticitate | Neconectat. | `CRITICAL` (L8620). | — |
| 6 | Înveliș telemetrie | Lipsă. | `cognitive.hitl.task.create` (L8630). | — |
| 7 | Înveliș politică | — | SLA 2h (L8628). | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI (L8627). | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L8628. | — |
| 11 | Micro-OODA | — | LangGraph (L8626). | — |
| 12 | Tier + de-escaladare | — | Tier 2 (L8621). | — |
| 13 | Stack (subset plan v2) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.hitl.task.create` (L8630).
- **Cod:** —

---
*Revizuire manuală:* dovezi repo 2026-04-13.
