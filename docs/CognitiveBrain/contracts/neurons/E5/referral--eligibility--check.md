<!-- neuron-contract:author-complete -->

# Neuron `referral:eligibility:check`

> **Status:** audit manual **2026-04-13**. Graf v2 **`referral:eligibility:check`** (L8978–8998) — **fără** înregistrare în [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) și **fără** worker `createWorker("referral:eligibility:check", …)`. **Dovadă parțială:** coada este **creată** și **enqueue-uită** din [`a6-state-transition-execute.ts`](../../../../../workers/e5-nurturing/src/workers/a6-state-transition-execute.ts) (tranziție → `LOYAL_CLIENT`) și [`a8-state-advocate-promote.ts`](../../../../../workers/e5-nurturing/src/workers/a8-state-advocate-promote.ts) — comentarii „E5-E, viitor”. **Gap consumator:** joburile pot acumula fără procesor dedicat.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `referral:eligibility:check` |
| etapa | E5 |
| familie (v2) | `referral` |
| contract_path | `contracts/neurons/E5/referral--eligibility--check.md` |
| ADR familie (indicativ) | [referral](../../adr/families/e5/referral.md) |

## Scop în context real

Verificare eligibilitate referral în sensul grafului v2; în cod există doar puncte de **emitere** a jobului, nu logica de verificare.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L8978–8998.
- Producători: `a6-state-transition-execute.ts`, `a8-state-advocate-promote.ts` — `createQueue("referral:eligibility:check")`.
- ADR: [`adr/families/e5/referral.md`](../../adr/families/e5/referral.md) — reconciliere graf vs registry.
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `referral` (L8978–8998)

- **Evidence status:** graph-export (L8998)
- **OTel (v2):** `cognitive.referral.eligibility.check`
- **Model routing (v2):** Non-AI (L8994)

## N/A pe criterii

- **6–8:** Fără handler → învelișuri/LLM **N/A** până la implementare.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | String coadă în A6/A8; **nu** în `QUEUES`. | v2 L8992. | Risc cozi orfane. |
| 2 | Etapă, familie, swimlane | — | v2 E5 `referral`. | — |
| 3 | Rol declarat | Comentarii „viitor” lângă enqueue. | v2 L8989–8991. | — |
| 4 | NeuronType + SOFAI | — | ProceduralNeuron inferat. | — |
| 5 | Criticitate | — | MEDIUM inferat. | — |
| 6 | Înveliș telemetrie | — | v2 L8997. | Fără `withCognitiveSpan` pe această coadă. |
| 7 | Înveliș politică | — | v2 L8995. | — |
| 8 | Rutare model (dacă AI) | — | Non-AI. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 fără HITL obligatoriu. | — |
| 11 | Micro-OODA | — | v2 L8993. | — |
| 12 | Tier + de-escaladare | — | Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ DB 5 la producători. | — | — |

### Mapare OTel

- **v2:** `cognitive.referral.eligibility.check`.
- **Cod:** neimplementat ca worker.

---
*Audit manual 2026-04-13.*
