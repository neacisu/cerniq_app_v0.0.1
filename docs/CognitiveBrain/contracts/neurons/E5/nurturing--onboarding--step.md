<!-- neuron-contract:author-complete -->

# Neuron `nurturing:onboarding:step`

> **Status:** audit manual **2026-04-13**. **v2** (L8862–L8882): coadă `nurturing:onboarding:step`, OTel `cognitive.nurturing.onboarding.step`. **Runtime:** **`onboarding:step:execute`** — **A4** `a4-onboarding-step-execute.ts`, `withCognitiveSpan("e5:onboarding:step-execute", …)` (L42); catalog `e5:onboarding:step-execute` (L2787–L2795); registry `E5_ONBOARDING_STEP_EXECUTE` (L518). **Bootstrap:** `index.ts` L72.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `nurturing:onboarding:step` |
| etapa | E5 |
| familie (v2) | `lifecycle` |
| contract_path | `contracts/neurons/E5/nurturing--onboarding--step.md` |
| ADR familie (indicativ) | [lifecycle](../../adr/families/e5/lifecycle.md) |

## Scop în context real

**Cod A4:** execută pas (canal + template), UPDATE `gold_nurturing_actions`; ultimul pas → enqueue **A5** `onboarding:complete:check` (L7–10, L34–37).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`nurturing:onboarding:step\`` (L8862–L8882).
- `workers/shared/src/queue-registry.ts` — L518; concurrency L1229.
- `packages/shared/src/cognitive-node-catalog.ts` — L2788–L2795 (`ProceduralNeuron`).
- `workers/e5-nurturing/src/workers/a4-onboarding-step-execute.ts` — A4.
- `workers/e5-nurturing/src/index.ts` — L72.
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8878).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `onboarding:step:execute` vs v2 `nurturing:onboarding:step`. | Confirmed queue v2 (L8876). | Nume coadă diferită. |
| 2 | Etapă, familie, swimlane | Catalog `lifecycle-fsm-e5` (L2792). | v2 E5 `lifecycle` (L8864–L8880). | — |
| 3 | Rol declarat | Execuție pas + legătură A5 (A4). | Pas onboarding (L8873–L8875). | — |
| 4 | NeuronType + SOFAI | `ProceduralNeuron` catalog (L2791). | `AutonomicNeuron` v2 (L8869). | Contradicție tip. |
| 5 | Criticitate | `MEDIUM` catalog (L2794). | `MEDIUM` v2 (L8871). | Aliniat. |
| 6 | Înveliș telemetrie | `cognitive:e5:onboarding:step-execute`. | `cognitive.nurturing.onboarding.step` (L8881). | — |
| 7 | Înveliș politică | — | No mandatory HITL (L8879). | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI (L8878). | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | Nu. | v2 L8879. | — |
| 11 | Micro-OODA | Executare acțiune → UPDATE → eventual A5. | Cron generic v2 (L8877). | Execuție declanșată de A3 delayed. |
| 12 | Tier + de-escaladare | — | Tier 4 v2 (L8872). | — |
| 13 | Stack (subset plan v2) | BullMQ E5. | — | — |

### Mapare OTel

- **v2:** `cognitive.nurturing.onboarding.step` (L8881).
- **Cod:** `cognitive:e5:onboarding:step-execute`.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
