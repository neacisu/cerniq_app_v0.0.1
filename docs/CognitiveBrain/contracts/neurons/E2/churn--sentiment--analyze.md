<!-- neuron-contract:author-complete -->

# Neuron `churn:sentiment:analyze`

> **Status:** audit manual **2026-04-13**. v2 L7669–7692 plasează neuronul în **E2**, familie **churn**, dar **catalog** îl leagă de **`e2:ai:sentiment-analyze`** cu coadă canonică **`ai:sentiment:analyze`** (nu `churn:sentiment:analyze`). Worker: [`workers/outreach/src/workers/ai-sentiment.ts`](../../../../../workers/outreach/src/workers/ai-sentiment.ts), `withCognitiveSpan("e2:ai:sentiment-analyze", …)`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `churn:sentiment:analyze` |
| coadă runtime | `ai:sentiment:analyze` |
| etapa | E2 |
| familie (v2) | `churn` |
| contract_path | `contracts/neurons/E2/churn--sentiment--analyze.md` |
| ADR familie (indicativ) | [ai-analysis](../../adr/families/e2/ai-analysis.md), [churn E5](../../adr/families/e5/churn.md) (context churn în graf) |

## Scop în context real

Analiză sentiment + intenție mesaje lead (outreach), scor, `requiresHuman`, rutare — unificat cu fostul intent (comentariu fișier). Folosit în fluxuri care pot alimenta decizii churn în aval; **coada** este cea de outreach AI, nu o coadă separată „churn”.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L7669–7692.
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e2:ai:sentiment-analyze` / `ai:sentiment:analyze` (~L1313–1320).
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `AI_SENTIMENT_ANALYZE: "ai:sentiment:analyze"` (~L156).
- Handler: [`ai-sentiment.ts`](../../../../../workers/outreach/src/workers/ai-sentiment.ts) — `withCognitiveSpan("e2:ai:sentiment-analyze"` (~L186).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `churn` / E2 (v2 L7669–7692)

- **Catalog nodeKey:** `e2:ai:sentiment-analyze`
- **Neuron type:** EmotionNeuron
- **Swimlane:** `ai-analysis`
- **Criticitate:** HIGH
- **Model routing (v2):** vLLM + fallback (L7688)
- **OTel (v2):** `cognitive.e2.ai.sentiment-analyze`
- **Evidence status:** catalog-grounded (L7692)

## N/A pe criterii

- — (AI: da).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `ai:sentiment:analyze` + `e2:ai:sentiment-analyze`. Graf: `churn:sentiment:analyze`. | v2 L7686. | Familie graf „churn” vs coadă outreach. |
| 2 | Etapă, familie, swimlane | E2, swimlane `ai-analysis` în catalog. | v2 E2, familie churn în antet. | — |
| 3 | Rol declarat | Fișier antet: sentiment + intent + răspuns (~L1–11). | v2 L7683–7685. | — |
| 4 | NeuronType + SOFAI | EmotionNeuron. | v2 L7677. | — |
| 5 | Criticitate | HIGH în catalog. | v2 L7680. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e2:ai:sentiment-analyze", …)`. | v2 L7690–7691. | Aliniat. |
| 7 | Înveliș politică | Lanț LLM + guardrails în worker (vezi fișier). | v2 L7689. | — |
| 8 | Rutare model (dacă AI) | `resolveOutreachLlmRouting`, `withLlmFallbackChain`, etc. (importuri ~L26–32). | v2 L7688. | Detaliu modele: citire secțiuni relevante din `ai-sentiment.ts`. |
| 9 | Guardrails | Zod / structured output în worker. | — | — |
| 10 | Escaladare HITL | `requiresHuman` în design worker. | v2 L7689. | — |
| 11 | Micro-OODA | v2 L7687 — observe message → LLM → classify → act. | — | — |
| 12 | Tier + de-escaladare | Fallback-uri LLM în cod. | v2 Tier 3. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ outreach, Redis, OpenAI-compatible clients. | — | — |

### Mapare OTel

- **v2:** `cognitive.e2.ai.sentiment-analyze`.
- **Cod:** `cognitive:e2:ai:sentiment-analyze` prin `withCognitiveSpan` — concordant catalog.

---
*Audit manual 2026-04-13.*
