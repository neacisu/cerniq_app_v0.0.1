<!-- neuron-contract:author-complete -->

# Neuron `feedback:competitor:log`

> **Status:** audit manual **2026-04-13**. **v2** (L7964–L7984): coadă `feedback:competitor:log`, `EmotionNeuron`, rutare LLM (L7979–L7980). **Repo:** **fără** literal `feedback:competitor:log` sau `feedback:competitor:detect` în `workers/**/*.ts` la audit (căutare `rg`). Specificația Etapa 5 menționează un pas **H46: feedback:competitor:detect** în diagrame (`docs/specifications/Etapa 5/etapa5-workers-overview.md`), dar **workerul implementat** pentru H46 este **`feedback:complaint:route`** (`h46-feedback-complaint-route.ts`, L4–5) — altă responsabilitate (rutare plângeri NPS). **Concluzie:** neuronul v2 pentru competitor **nu** are implementare dedicată verificată în cod.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `feedback:competitor:log` |
| etapa | E5 |
| familie (v2) | `feedback` |
| contract_path | `contracts/neurons/E5/feedback--competitor--log.md` |
| ADR familie (indicativ) | [feedback](../../adr/families/e5/feedback.md) |

## Scop în context real

**v2:** capturare/log mențiuni competitor din feedback (L7975–L7978). **Cod:** fără coadă/mapare; H46 actual = plângeri, nu competitori.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7964–L7984.
- `workers/shared/src/queue-registry.ts` — `E5_FEEDBACK_COMPLAINT_ROUTE` etc.; **fără** competitor.
- `workers/e5-nurturing/src/workers/h46-feedback-complaint-route.ts` — **`feedback:complaint:route`** (L31).
- `docs/specifications/Etapa 5/etapa5-workers-overview.md` — mențiune H46 competitor (doc vs cod).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- **L7964–L7984:** span `cognitive.feedback.competitor.log` (L7983).

## N/A pe criterii

- —

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Lipsă** coadă `feedback:competitor:*` în implementarea TS citită. | v2: `feedback:competitor:log` (L7978). | Gap implementare. |
| 2 | Etapă, familie, swimlane | H46 real: swimlane `feedback-nps` pentru **complaint** (catalog L3184). | v2: `feedback` E5 (L7967). | — |
| 3 | Rol declarat | H46: rutare reclamație după scor NPS (`h46` L7–10). | v2: log competitor + LLM (L7975–L7978). | Responsabilități diferite. |
| 4 | NeuronType + SOFAI | H46 catalog: `ReflexNeuron` (L3183). | v2: `EmotionNeuron` (L7971). | — |
| 5 | Criticitate | — | v2: `MEDIUM` (L7973). | — |
| 6 | Înveliș telemetrie | H46 (complaint): `withCognitiveSpan("e5:feedback:complaint:route", …)` (`h46-feedback-complaint-route.ts` L70). | v2 span `cognitive.feedback.competitor.log` (L7983). | H46 ≠ competitor; dovezi separate. |
| 7 | Înveliș politică | — | v2 Tier 4 (L7974), fără HITL obligatoriu (L7981). | — |
| 8 | Rutare model (dacă AI) | H46 **fără** LLM (rutare deterministă). | v2: vllm-fast-14b (L7979–L7980). | — |
| 9 | Guardrails | — | v2 L7981. | — |
| 10 | Escaladare HITL | H46: enqueue `hitl:complaint:review` (L32). | v2 escaladare generică în OODA (L7978). | — |
| 11 | Micro-OODA | — | v2 OODA (L7978). | — |
| 12 | Tier + de-escaladare | — | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | — | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.feedback.competitor.log`.
- **Cod:** fără span dedicat; H46 folosește alt `nodeKey` (vezi `h46-feedback-complaint-route.ts`).

---
*Audit manual 2026-04-13.*
