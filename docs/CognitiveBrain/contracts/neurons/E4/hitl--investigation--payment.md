<!-- neuron-contract:author-complete -->

# Neuron `hitl:investigation:payment`

> **Status:** audit manual **2026-04-13**. **K51** — Tier 3 / no match; comentariu **SLA 8h** vs `priority: "high"` (4h) în approval-service — proxy documentat în cod (L287–289, L334–347). `withCognitiveSpan` **`e4:hitl:payment:investigation`** vs catalog **`e4:hitl:payment-investigation`**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `hitl:investigation:payment` |
| etapa | E4 |
| familie (v2) | `hitl` |
| contract_path | `contracts/neurons/E4/hitl--investigation--payment.md` |
| ADR familie (indicativ) | [hitl](../../adr/families/e4/hitl.md) |

## Scop în context real

**v2** (L7023–L7046): investigare plată, ACCOUNTING, SLA în text v2 4h (L7043) vs **8h** în catalog și cod metadata. **Cod:** `hitlPaymentInvestigationProcessor` pe entitate `gold_revolut_payments` (`k-hitl-workers.ts` L283–364).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`hitl:investigation:payment\`` (L7023–L7046).
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:hitl:payment-investigation` (L2706–2714).
- `workers/shared/src/queue-registry.ts` — `E4_HITL_PAYMENT_INVESTIGATION` (L499); concurrency (L1214).
- `workers/e4-postsale/src/index.ts` — L546–551.
- `workers/e4-postsale/src/workers/k-hitl-workers.ts` — K51; `withCognitiveSpan("e4:hitl:payment:investigation", …)` (L313–314).
- `workers/e4-postsale/src/workers/k51-hitl-payment-investigation.ts` — re-export.
- `workers/e4-postsale/src/__tests__/fhijk-workers.test.ts` — HITL.
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan`.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L7042).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Catalog `e4:hitl:payment-investigation`; coadă `hitl:investigation:payment`; registry L499. | v2 L7040. | — |
| 2 | Etapă, familie, swimlane | Catalog `human-oversight-e4` (L2711). | v2 L7033. | — |
| 3 | Rol declarat | Task pentru `matchTier` TIER_3/NO_MATCH (L292–302). | v2 L7037–7039. | — |
| 4 | NeuronType + SOFAI | `HumanNeuron` (L2710). | v2 L7031. | — |
| 5 | Criticitate | Catalog `HIGH` (L2713). | v2 L7034. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:hitl:payment:investigation", …)` (L313) vs catalog `e4:hitl:payment-investigation`. | v2 `cognitive.e4.hitl.payment-investigation` (L7045). | Nealiniere. |
| 7 | Înveliș politică | `slaHours: 8` + `slaNote` în metadata (L345–347); `priority: "high"` (L334). | v2 L7043 spune SLA 4h. | **Divergență SLA** v2 ↔ cod; cod explică proxy4h (L287–289). |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | ADR-0007. | — |
| 10 | Escaladare HITL | Task în approval service. | v2 L7043. | — |
| 11 | Micro-OODA | Job → createTask → metrică (L351–355). | v2 L7041. | — |
| 12 | Tier + de-escaladare | — | Tier 3 (v2 L7035). | — |
| 13 | Stack (subset plan v2) | BullMQ E4. | — | — |

### Mapare OTel

- **v2:** `cognitive.e4.hitl.payment-investigation` (L7045).
- **Cod:** `cognitive:e4:hitl:payment:investigation` (K51).

---
*Generator inițial (hydrate):* înlocuit prin audit manual.
