<!-- neuron-contract:author-complete -->

# Neuron `credit:score:calculate`

> **Status:** audit manual **2026-04-13**. **v2** și **catalog** folosesc `nodeKey` **`e4:credit:score-calculate`**; procesorul C17 apelează `withCognitiveSpan` cu **`e4:credit:score:calculate`** (două puncte vs cratimă) — **divergență telemetrie / catalog** documentată la criteriul 6.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `credit:score:calculate` |
| etapa | E4 |
| familie (v2) | `credit` |
| contract_path | `contracts/neurons/E4/credit--score--calculate.md` |
| ADR familie (indicativ) | [credit](../../adr/families/e4/credit.md) |

## Scop în context real

**v2** (L6854–L6877): `CreditNeuron`, swimlane `credit-decision`, **CRITICAL**, Tier 2, scorare non-LLM, OTel `cognitive.e4.credit.score-calculate`. **Cod:** `creditScoreCalculateProcessor` (`c17-credit-score-calculate.ts`) — citește rezultate copii C14/C15/C16 (`job.getChildrenValues`), istoric plăți din DB, aplică `calculateCreditScore` din `credit-scoring-engine.ts`, actualizează `gold_credit_profiles`, inserează `gold_credit_scores`, enfilează C18 `credit:limit:calculate`; metrici `e4CreditScoringDurationSeconds`, `e4CreditScoreCalculatedTotal`, etc. Comentariu sursă: **determinist, fără LLM** (L15–16).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`credit:score:calculate\`` (L6854–L6877).
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:credit:score-calculate` / `credit:score:calculate` (L2384–2392).
- `workers/shared/src/queue-registry.ts` — `E4_CREDIT_SCORE_CALCULATE` (L390); concurrency worker (L1119).
- `workers/e4-postsale/src/index.ts` — `registerCognitiveWorkerEtapa(4)` (L30); `createWorker(QUEUES.E4_CREDIT_SCORE_CALCULATE, creditScoreCalculateProcessor, …)` (L266–271).
- `workers/e4-postsale/src/workers/c17-credit-score-calculate.ts` — procesor; `withCognitiveSpan("e4:credit:score:calculate", …)` (L69–71).
- `workers/e4-postsale/src/__tests__/c-workers.test.ts` — `describe("C17 — creditScoreCalculateProcessor"` (L497+).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` / `startActiveSpan` cu prefix **cognitive:** (L215–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6873).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Catalog `e4:credit:score-calculate`; coadă `credit:score:calculate`; registry L390; `index.ts` L266–271. | `Confirmed queue field` (L6871). | — |
| 2 | Etapă, familie, swimlane | Catalog etapa 4, swimlane `credit-decision` (L2389–2390). | Idem v2 (L6864–6865). | — |
| 3 | Rol declarat | Flow parent după C14+C15+C16; formulă 100p + persistență (antet c17 L2–17). | v2 L6868–6870. | — |
| 4 | NeuronType + SOFAI | `CreditNeuron` (catalog L2388). | v2 L6862. | — |
| 5 | Criticitate | `CRITICAL` (catalog L2391). | v2 L6865. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:credit:score:calculate", …)` (c17 L69) → span **`cognitive:e4:credit:score:calculate`**. Catalog `nodeKey` = **`e4:credit:score-calculate`**. | v2 `cognitive.e4.credit.score-calculate` (L6876). | **Divergență:** primul argument ≠ `nodeKey` catalog → `getNodeByKey` poate **nu** atașa atribute din catalog pe span (vezi `cognitive-helpers.ts` L225–233). |
| 7 | Înveliș politică | `runCreditBorderlineConsensusIfNeeded` (c17 L39, import L39); fără Cedar/OPA în fișier. | HITL ireversibile, SLA 2h (v2 L6874). | Detaliu consensus: `credit-consensus-advisory.ts` — neexpandat aici. |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Scoring determinist; fără NeMo în c17. | NeMo destinație ADR-0007. | — |
| 10 | Escaladare HITL | Lanț C18 + HITL K49 la limită mare (descris în catalog C18); nu în C17 direct. | v2 HITL engine (L6874). | — |
| 11 | Micro-OODA | Observare copii flow → calcul → scriere DB → enqueue C18. | v2 L6872. | LangGraph în v2: **nu** verificat în C17. |
| 12 | Tier + de-escaladare | Metrici distribuție/durată în c17. | Tier 2 (v2 L6866). | — |
| 13 | Stack v2 (subset2.3) | BullMQ FlowProducer + Drizzle + Redis E4. | Stack larg plan v2. | — |

### Mapare OTel

- **v2:** `cognitive.e4.credit.score-calculate` (L6876).
- **Cod:** span efectiv `cognitive:e4:credit:score:calculate` (din primul argument C17); **nu** coincide literal cu `nodeKey` catalog.
- **Stare:** instrumentare prezentă; **aliniere catalog ↔ span** necesită remediere cod sau convenție documentată.

---
*Generator inițial (hydrate):* înlocuit prin audit manual.
