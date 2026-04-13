<!-- neuron-contract:author-complete -->

# Neuron `winback:step:execute`

> **Status:** audit manual **2026-04-13**. Graf v2 **`winback:step:execute`** (L9154–9177) — **runtime aliniat:** [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) `E5_WINBACK_STEP_EXECUTE`, catalog `e5:winback:step-execute`, worker F33 [`f33-winback-step-execute.ts`](../../../../../workers/e5-nurturing/src/workers/f33-winback-step-execute.ts), `withCognitiveSpan("e5:winback:step-execute", …)` (~L72).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `winback:step:execute` |
| etapa | E5 |
| familie (v2) | `winback` |
| contract_path | `contracts/neurons/E5/winback--step--execute.md` |
| ADR familie (indicativ) | [winback](../../adr/families/e5/winback.md) |

## Scop în context real

Execută pasul curent al campaniei (înregistrare acțiune, delay-uri între pași), programează ofertă/următorul pas sau `winback:result:track` / `winback:escalate:hitl` după logică.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L9154–9177.
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e5:winback:step-execute`.
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — ~L583.
- Handler: [`f33-winback-step-execute.ts`](../../../../../workers/e5-nurturing/src/workers/f33-winback-step-execute.ts).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `winback` (L9154–9177)

- **Catalog nodeKey:** `e5:winback:step-execute`
- **Neuron type:** MotorNeuron
- **Swimlane:** `winback-campaigns`
- **Criticitate:** HIGH
- **Evidence status:** catalog-grounded (L9177)

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 și F33: procesare fără rutare LLM obligatorie în fluxul nominal (oferte pot merge pe altă coadă).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Coadă + span + catalog concordante. | v2 L9171. | — |
| 2 | Etapă, familie, swimlane | Etapa 5, `winback-campaigns`. | v2 E5 `winback`. | — |
| 3 | Rol declarat | Antet F33 + lanț către result/HITL/offer. | v2 L9168–9170. | — |
| 4 | NeuronType + SOFAI | MotorNeuron. | v2 L9160. | — |
| 5 | Criticitate | HIGH. | v2 L9165. | — |
| 6 | Înveliș telemetrie | `e5:winback:step-execute`. | v2 L9176–9177. | — |
| 7 | Înveliș politică | Tier 3 + HITL la anomalii (v2). | v2 L9174. | — |
| 8 | Rutare model (dacă AI) | **N/A** flux nominal F33; `winback:offer:generate` separat. | Non-AI în v2 bloc. | — |
| 9 | Guardrails | Validări campanie + pași. | — | — |
| 10 | Escaladare HITL | Coadă `winback:escalate:hitl` în F33. | v2 L9174. | — |
| 11 | Micro-OODA | Execute → schedule next / complete. | v2 L9172. | — |
| 12 | Tier + de-escaladare | Tier 3. | — | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ DB 5, Drizzle. | — | — |

### Mapare OTel

- **v2:** `cognitive.e5.winback.step-execute`.
- **Cod:** `cognitive:e5:winback:step-execute`.

---
*Audit manual 2026-04-13.*
