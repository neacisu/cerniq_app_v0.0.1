<!-- neuron-contract:author-complete -->

# Neuron `nurturing:onboarding:start`

> **Status:** audit manual **2026-04-13**. **v2** (L8840–L8860): coadă `nurturing:onboarding:start`, OTel `cognitive.nurturing.onboarding.start`. **Runtime:** **`onboarding:sequence:start`** — **A3** `a3-onboarding-sequence-start.ts`, `withCognitiveSpan("e5:onboarding:sequence-start", …)` (L62); catalog `e5:onboarding:sequence-start` (L2778–L2786); registry `E5_ONBOARDING_SEQUENCE_START` (L516). **Bootstrap:** `index.ts` L71.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `nurturing:onboarding:start` |
| etapa | E5 |
| familie (v2) | `lifecycle` |
| contract_path | `contracts/neurons/E5/nurturing--onboarding--start.md` |
| ADR familie (indicativ) | [lifecycle](../../adr/families/e5/lifecycle.md) |

## Scop în context real

**Cod A3:** creează 3 pași onboarding (welcome d0, guide d3, check-in d7), INSERT `gold_nurturing_actions`, enqueue **A4** cu delay (L7–10, L29–47).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`nurturing:onboarding:start\`` (L8840–L8860).
- `workers/shared/src/queue-registry.ts` — L516; concurrency L1227.
- `packages/shared/src/cognitive-node-catalog.ts` — L2779–L2786.
- `workers/e5-nurturing/src/workers/a3-onboarding-sequence-start.ts` — A3.
- `workers/e5-nurturing/src/index.ts` — L71.
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8856).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `onboarding:sequence:start` vs v2 `nurturing:onboarding:start`. | Confirmed queue v2 (L8854). | Nume coadă diferită. |
| 2 | Etapă, familie, swimlane | Catalog `lifecycle-fsm-e5` (L2783). | v2 E5 `lifecycle` (L8842–L8858). | — |
| 3 | Rol declarat | Inițiere secvență + delayed jobs A4 (A3). | Start onboarding (L8851–L8853). | — |
| 4 | NeuronType + SOFAI | `AutonomicNeuron` catalog (L2782). | `AutonomicNeuron` v2 (L8847). | Aliniat. |
| 5 | Criticitate | `HIGH` catalog (L2785). | `MEDIUM` v2 (L8849). | Contradicție. |
| 6 | Înveliș telemetrie | `cognitive:e5:onboarding:sequence-start`. | `cognitive.nurturing.onboarding.start` (L8859). | — |
| 7 | Înveliș politică | — | No mandatory HITL (L8857). | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI (L8856). | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | Nu. | v2 L8857. | — |
| 11 | Micro-OODA | Definire pași → persist → schedule A4. | Cron generic v2 (L8855). | Trigger real: A1 context (antet A3 L5). |
| 12 | Tier + de-escaladare | — | Tier 4 v2 (L8850). | — |
| 13 | Stack (subset plan v2) | BullMQ delayed jobs. | — | — |

### Mapare OTel

- **v2:** `cognitive.nurturing.onboarding.start` (L8859).
- **Cod:** `cognitive:e5:onboarding:sequence-start`.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
