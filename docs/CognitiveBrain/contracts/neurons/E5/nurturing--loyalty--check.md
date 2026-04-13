<!-- neuron-contract:author-complete -->

# Neuron `nurturing:loyalty:check`

> **Status:** audit manual **2026-04-13**. **v2** (L8746–8766): coadă `nurturing:loyalty:check`, `AutonomicNeuron`, OTel `cognitive.nurturing.loyalty.check`. **Repo:** **fără** coadă literală. **Analog:** evaluare periodică FSM și propunere tranziții — **A2** `lifecycle:state:evaluate`, `a2-lifecycle-state-evaluate.ts`, `withCognitiveSpan("e5:lifecycle:state-evaluate", …)` L35; catalog `e5:lifecycle:state-evaluate` (L2769–2777). **Bootstrap:** A2 în `index.ts` L70. **Verificare loialitate explicită** (criterii advocate) în **A8**; A2 orchestrează evaluarea stării înainte de tranziții.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `nurturing:loyalty:check` |
| etapa | E5 |
| familie (v2) | `lifecycle` |
| contract_path | `contracts/neurons/E5/nurturing--loyalty--check.md` |
| ADR familie (indicativ) | [lifecycle](../../adr/families/e5/lifecycle.md) |

## Scop în context real

**v2:** verificare stadiu loialitate (L8757–8759). **Cod A2:** snapshot client, `daysSinceLastOrder`, semnale churn, `evaluateTransition` → eventual enqueue A6 (L7–11, L73+).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`nurturing:loyalty:check\`` (L8746–8766).
- `workers/shared/src/queue-registry.ts` — `E5_LIFECYCLE_STATE_EVALUATE: "lifecycle:state:evaluate"` (L514).
- `packages/shared/src/cognitive-node-catalog.ts` — L2769–2777.
- `workers/e5-nurturing/src/workers/a2-lifecycle-state-evaluate.ts` — A2.
- `workers/e5-nurturing/src/index.ts` — L70.
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8762).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Analog `lifecycle:state:evaluate`; v2 `nurturing:loyalty:check`. | Confirmed queue v2 (L8760). | Nume coadă diferită. |
| 2 | Etapă, familie, swimlane | Catalog `lifecycle-fsm-e5` (L2774). | v2 `lifecycle` (L8748–8749). | — |
| 3 | Rol declarat | Evaluare tranziții FSM (A2). | Verificare loialitate (L8757–8759). | A2 mai larg decât „loyalty” literal. |
| 4 | NeuronType + SOFAI | `AutonomicNeuron` catalog (L2773). | `AutonomicNeuron` v2 (L8753). | Aliniat. |
| 5 | Criticitate | `HIGH` catalog (L2776). | `MEDIUM` v2 (L8755). | Contradicție. |
| 6 | Înveliș telemetrie | `cognitive:e5:lifecycle:state-evaluate`. | `cognitive.nurturing.loyalty.check` (L8765). | — |
| 7 | Înveliș politică | — | No mandatory HITL (L8763). | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI (L8762). | — |
| 9 | Guardrails | Validare `isValidNurturingState` (A2 L55–57). | — | — |
| 10 | Escaladare HITL | Nu în A2 (fișier citit). | v2 L8763. | — |
| 11 | Micro-OODA | Observare DB → decizie tranziție → enqueue. | Cron v2 (L8761). | — |
| 12 | Tier + de-escaladare | — | Tier 4 v2 (L8756). | — |
| 13 | Stack (subset plan v2) | BullMQ A2 activ. | — | — |

### Mapare OTel

- **v2:** `cognitive.nurturing.loyalty.check` (L8765).
- **Cod (analog):** `cognitive:e5:lifecycle:state-evaluate`.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
