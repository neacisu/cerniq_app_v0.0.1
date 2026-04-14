<!-- neuron-contract:author-complete -->

# Neuron `hitl:approval:credit-override`

> **Status:** audit manual **2026-04-13**. **K48** — `hitlCreditOverrideProcessor`; prim argument `withCognitiveSpan`: **`e4:hitl:credit:override`** vs catalog **`e4:hitl:credit-override`** — divergență telemetrie (criteriul 6).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `hitl:approval:credit-override` |
| etapa | E4 |
| familie (v2) | `hitl` |
| contract_path | `contracts/neurons/E4/hitl--approval--credit-override.md` |
| ADR familie (indicativ) | [hitl](../../adr/families/e4/hitl.md) |

## Scop în context real

**v2** (L6926–L6949): override credit depășit, approver SALES_MANAGER/CFO. **Cod:** `approvalService.createTask` cu `hitlInvestigationType: "credit_override"`, `approverRole: "SALES_MANAGER/CFO"`, `slaHours: 4` (`k-hitl-workers.ts` L65–122).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`hitl:approval:credit-override\`` (L6926–L6949).
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:hitl:credit-override` (L2679–2687).
- `workers/shared/src/queue-registry.ts` — `E4_HITL_CREDIT_OVERRIDE` (L493); concurrency (L1208).
- `workers/e4-postsale/src/index.ts` — `createWorker(… E4_HITL_CREDIT_OVERRIDE …)` (L525–529).
- `workers/e4-postsale/src/workers/k-hitl-workers.ts` — K48; `withCognitiveSpan("e4:hitl:credit:override", …)` (L68–69).
- `workers/e4-postsale/src/workers/k48-hitl-credit-override.ts` — re-export.
- `workers/e4-postsale/src/__tests__/fhijk-workers.test.ts` — `hitlCreditOverrideProcessor` (L903+).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L215–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6945).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Catalog `e4:hitl:credit-override`; registry L493; `index.ts` L526. | v2 L6943. | — |
| 2 | Etapă, familie, swimlane | Catalog `human-oversight-e4` (L2684). | v2 L6936. | — |
| 3 | Rol declarat | Mesaje RO + depășire `overLimit` (L75–88). | v2 L6940–6942. | — |
| 4 | NeuronType + SOFAI | `HumanNeuron` (L2683). | v2 L6934. | — |
| 5 | Criticitate | `CRITICAL` (L2686). | v2 L6937. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:hitl:credit:override", …)` (L68) → `cognitive:e4:hitl:credit:override`. Catalog `e4:hitl:credit-override`. | v2 `cognitive.e4.hitl.credit-override` (L6948). | Nealiniere prim argument vs catalog. |
| 7 | Înveliș politică | `approvalService.createTask`, `priority: "high"`. | v2 L6946. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | ADR-0007. | — |
| 10 | Escaladare HITL | Task + metrică; legătură K53 în comentarii fișier (L11). | v2 L6946. | — |
| 11 | Micro-OODA | Observare job → task → log (L114–116). | v2 L6944. | — |
| 12 | Tier + de-escaladare | — | Tier 2 (L6938). | — |
| 13 | Stack (subset plan v2) | BullMQ E4. | — | — |

### Mapare OTel

- **v2:** `cognitive.e4.hitl.credit-override` (L6948).
- **Cod:** `cognitive:e4:hitl:credit:override` (K48).

---
*Generator inițial (hydrate):* înlocuit prin audit manual.
