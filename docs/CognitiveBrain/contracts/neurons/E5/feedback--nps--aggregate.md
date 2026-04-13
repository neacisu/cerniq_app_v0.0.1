<!-- neuron-contract:author-complete -->

# Neuron `feedback:nps:aggregate`

> **Status:** audit manual **2026-04-13**. **v2** (L8030–L8050): coadă `feedback:nps:aggregate`, `EmotionNeuron`, LLM (L8045–L8046). **Repo:** **fără** literal în registry. Agregare operațională NPS: **H47** **`feedback:report:generate`** — `E5_FEEDBACK_REPORT_GENERATE` (`queue-registry.ts` L613), catalog `e5:feedback:report-generate` (`cognitive-node-catalog.ts` L3188–L3195), worker `h47-feedback-report-generate.ts`, `withCognitiveSpan("e5:feedback:report:generate", …)` (L58) — calculează promoters/detractors/NPS pe perioadă. **Agregare trend sentiment** (altă metrică): **B13** `sentiment:aggregate` (`queue-registry.ts` L538). **Concluzie:** „aggregate” din v2 se mapează în principal la **H47**, nu la un nume de coadă identic.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `feedback:nps:aggregate` |
| coadă runtime (NPS summary) | `feedback:report:generate` |
| etapa | E5 |
| familie (v2) | `feedback` |
| contract_path | `contracts/neurons/E5/feedback--nps--aggregate.md` |
| ADR familie (indicativ) | [feedback](../../adr/families/e5/feedback.md) |

## Scop în context real

Raport NPS agregat per tenant (`ReportGenerateJobData.reportType` include `NPS_SUMMARY` — `h47` L36).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L8030–L8050.
- `workers/shared/src/queue-registry.ts` — `E5_FEEDBACK_REPORT_GENERATE` (L613); `E5_SENTIMENT_AGGREGATE` (L538).
- `packages/shared/src/cognitive-node-catalog.ts` — H47 (L3188–L3195), B13 (L2870–L2877).
- `workers/e5-nurturing/src/workers/h47-feedback-report-generate.ts` — agregare (L7–9, L58).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- **L8030–L8050:** span `cognitive.feedback.nps.aggregate` (L8049).

## N/A pe criterii

- **8 — Rutare model:** N/A pentru H47 — agregare SQL + log (fără LLM în fișierul citit).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`feedback:report:generate`** (H47); **fără** `feedback:nps:aggregate`. | v2: `feedback:nps:aggregate` (L8044). | Redenumire. |
| 2 | Etapă, familie, swimlane | Catalog H47: `feedback-nps`, etapă 5 (L3193–L3194). | v2: `feedback` E5 (L8033). | — |
| 3 | Rol declarat | „Generare raport feedback H47 — periodic…” (catalog L3191). | v2: agregare + LLM în text v2 (L8043–L8046). | H47 fără LLM. |
| 4 | NeuronType + SOFAI | H47: `KnowledgeNeuron` (catalog L3192). | v2: `EmotionNeuron` (L8037). | — |
| 5 | Criticitate | H47: `LOW` (L3194). | v2: `MEDIUM` (L8039). | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e5:feedback:report:generate", …)` (`h47` L58). | v2 span (L8049). | — |
| 7 | Înveliș politică | Timeout 60s, concurrency 5 (`h47` L4–5). | v2 Tier 4 (L8040), fără HITL obligatoriu (L8047). | — |
| 8 | Rutare model (dacă AI) | **N/A** pentru H47. | v2: vllm-fast (L8045–L8046). | Text v2 ≠ cod H47. |
| 9 | Guardrails | Limitări INSERT `goldNurturingActions` documentate în antet H47 (L12–15). | v2 L8047. | — |
| 10 | Escaladare HITL | — | v2 L8047. | — |
| 11 | Micro-OODA | SELECT agregate → log raport. | v2 OODA (L8045). | — |
| 12 | Tier + de-escaladare | — | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E5, SQL. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.feedback.nps.aggregate`.
- **Cod:** `cognitive:e5:feedback:report:generate`.

---
*Audit manual 2026-04-13.*
