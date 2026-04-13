<!-- neuron-contract:author-complete -->

# Neuron `hitl:escalation:overdue`

> **Status:** audit manual **2026-04-13**. **K53** — SLA breach E4: warning la 80% fereastră, apoi escaladare via `approvalService.escalate` (corp `k-hitl-workers.ts` L461+). `withCognitiveSpan` **`e4:hitl:escalation:overdue`** vs catalog **`e4:hitl:escalation-overdue`**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `hitl:escalation:overdue` |
| etapa | E4 |
| familie (v2) | `hitl` |
| contract_path | `contracts/neurons/E4/hitl--escalation--overdue.md` |
| ADR familie (indicativ) | [hitl](../../adr/families/e4/hitl.md) |

## Scop în context real

**v2** (L6998–L7021): escalare CRITICAL la depășire SLA. **Cod:** `hitlEscalationOverdueProcessor` — interogări `approvalTasks` pentru tenant, warning și escaladare (L461–; vezi `k-hitl-workers.ts` și `k53-hitl-escalation-overdue.ts`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`hitl:escalation:overdue\`` (L6998–L7021).
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:hitl:escalation-overdue` (L2724–2732).
- `workers/shared/src/queue-registry.ts` — `E4_HITL_ESCALATION_OVERDUE` (L503); concurrency (L1218).
- `workers/e4-postsale/src/index.ts` — L560–564.
- `workers/e4-postsale/src/workers/k-hitl-workers.ts` — K53; `withCognitiveSpan("e4:hitl:escalation:overdue", …)` (L464–465); logică warning L472+.
- `workers/e4-postsale/src/workers/k53-hitl-escalation-overdue.ts` — re-export.
- `workers/e4-postsale/src/__tests__/fhijk-workers.test.ts` — `hitlEscalationOverdueProcessor` (L1098+).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan`.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L7017).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Catalog `e4:hitl:escalation-overdue`; registry L503. | v2 L7015. | — |
| 2 | Etapă, familie, swimlane | Catalog `human-oversight-e4` (L2729). | v2 L7008. | — |
| 3 | Rol declarat | Query-uri SQL pe `approvalTasks`, pipelineStage E4 (L472–481). | v2 L7012–7014. | — |
| 4 | NeuronType + SOFAI | `HumanNeuron` (L2728). | v2 L7006. | — |
| 5 | Criticitate | `CRITICAL` (catalog L2731). | v2 L7009. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:hitl:escalation:overdue", …)` (L464) vs catalog `e4:hitl:escalation-overdue`. | v2 `cognitive.e4.hitl.escalation-overdue` (L7020). | Nealiniere. |
| 7 | Înveliș politică | Escaladare prin serviciu aprobări. | v2 L7018. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | ADR-0007. | — |
| 10 | Escaladare HITL | Nucleu procesor. | v2 L7018. | — |
| 11 | Micro-OODA | Observare task-uri overdue → acțiuni escalate (corp L461+). | v2 L7016. | — |
| 12 | Tier + de-escaladare | — | Tier 2 (v2 L7010). | — |
| 13 | Stack (subset plan v2) | BullMQ + Drizzle. | — | — |

### Mapare OTel

- **v2:** `cognitive.e4.hitl.escalation-overdue` (L7020).
- **Cod:** `cognitive:e4:hitl:escalation:overdue` (K53).

---
*Generator inițial (hydrate):* înlocuit prin audit manual.
