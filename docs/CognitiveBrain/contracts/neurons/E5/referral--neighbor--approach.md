<!-- neuron-contract:author-complete -->

# Neuron `referral:neighbor:approach`

> **Status:** audit manual **2026-04-13**. Graf v2 **`referral:neighbor:approach`** (L9000–9020) — **fără** literal în [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts), **fără** intrare `n(` în [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) pentru această coadă, **fără** `createWorker` / `createQueue` în `workers/` (căutare exactă `referral:neighbor:approach`).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `referral:neighbor:approach` |
| etapa | E5 |
| familie (v2) | `referral` |
| contract_path | `contracts/neurons/E5/referral--neighbor--approach.md` |
| ADR familie (indicativ) | [referral](../../adr/families/e5/referral.md) |

## Scop în context real

În v2: abordare „vecini” în subgraph referral. **Cod:** nu există traseu BullMQ cu acest nume; orice comportament similar (ex. outreach geografic) trebuie demonstrat separat.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L9000–9020.
- ADR: [`adr/families/e5/referral.md`](../../adr/families/e5/referral.md) — export graf vs registry.
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `referral` (L9000–9020)

- **Evidence status:** graph-export (L9020)
- **OTel (v2):** `cognitive.referral.neighbor.approach`

## N/A pe criterii

- **6–8:** Fără runtime → N/A.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** runtime. | v2 L9014. | — |
| 2 | Etapă, familie, swimlane | — | v2 E5 `referral`. | — |
| 3 | Rol declarat | — | v2 L9011–9013. | — |
| 4 | NeuronType + SOFAI | — | ProceduralNeuron inferat. | — |
| 5 | Criticitate | — | MEDIUM inferat. | — |
| 6 | Înveliș telemetrie | — | v2 L9019. | — |
| 7 | Înveliș politică | — | v2 L9017. | — |
| 8 | Rutare model (dacă AI) | — | Non-AI. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L9017. | — |
| 11 | Micro-OODA | — | v2 L9015. | — |
| 12 | Tier + de-escaladare | — | Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.referral.neighbor.approach`.
- **Cod:** neimplementat ca atare.

---
*Audit manual 2026-04-13.*
