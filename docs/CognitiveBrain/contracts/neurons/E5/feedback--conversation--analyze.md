<!-- neuron-contract:author-complete -->

# Neuron `feedback:conversation:analyze`

> **Status:** audit manual **2026-04-13**. **v2** (L7986–L8006): coadă `feedback:conversation:analyze`, `EmotionNeuron`, LLM (L8001–L8002). **Repo:** **fără** literal în registry. Calea E5 pentru analiză mesaj (text) + scor + semnale churn este **`sentiment:analyze`** — **B12** `b12-sentiment-analyze.ts`, `QUEUES.E5_SENTIMENT_ANALYZE` (`queue-registry.ts` L536), catalog `e5:sentiment:analyze` (`cognitive-node-catalog.ts` L2861–L2868), `withCognitiveSpan("e5:sentiment:analyze", …)` (`b12` L46). **Concluzie:** semantică apropiată „analiză conversație” este acoperită de **B12**, nu de un nume de coadă identic cu v2.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `feedback:conversation:analyze` |
| coadă runtime (mapare) | `sentiment:analyze` |
| etapa | E5 |
| familie (v2) | `feedback` |
| contract_path | `contracts/neurons/E5/feedback--conversation--analyze.md` |
| ADR familie (indicativ) | [feedback](../../adr/families/e5/feedback.md) |

## Scop în context real

Analiză LLM a textului mesajului, persistență scor, trigger B9 pentru semnale churn — vezi `b12-sentiment-analyze.ts`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7986–L8006.
- `workers/shared/src/queue-registry.ts` — `E5_SENTIMENT_ANALYZE` (L536).
- `packages/shared/src/cognitive-node-catalog.ts` — `e5:sentiment:analyze` (L2861–L2868).
- `workers/e5-nurturing/src/workers/b12-sentiment-analyze.ts` — LLM + enqueue `churn:signal:detect` (L40–46).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- **L7986–L8006:** span `cognitive.feedback.conversation.analyze` (L8005).

## N/A pe criterii

- —

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`sentiment:analyze`** (B12); **fără** `feedback:conversation:analyze`. | v2: `feedback:conversation:analyze` (L8000). | Denumire cozi. |
| 2 | Etapă, familie, swimlane | Catalog B12: swimlane `churn-detection` (L2866). | v2: familie `feedback` (L7989). | Familie v2 ≠ swimlane catalog. |
| 3 | Rol declarat | „Sentiment analysis AI B12…” (catalog L2864). | v2: analiză conversație + profil (L7997–L7999). | Parțial aliniat. |
| 4 | NeuronType + SOFAI | `EmotionNeuron` (catalog L2865). | v2: `EmotionNeuron` (L7993). | — |
| 5 | Criticitate | Catalog: `HIGH` (L2868). | v2: `MEDIUM` (L7995). | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e5:sentiment:analyze", …)` (`b12` L46). | v2 span (L8005). | — |
| 7 | Înveliș politică | Rate limit 100/min în antet B12 (`b12` L5). | v2 Tier 4 (L7996), fără HITL obligatoriu (L8003). | — |
| 8 | Rutare model (dacă AI) | PRIMARY QwQ + FALLBACK Claude (`b12` L12–14, implementare `analyzeSentiment`). | v2 vllm-fast + fallback (L8001–L8002). | Modele trebuie verificate în `claude-sentiment.js`. |
| 9 | Guardrails | Limită text 2000 chars (`b12` L27). | v2 L8003. | — |
| 10 | Escaladare HITL | Lanț churn (B9–B11), nu HITL direct în B12. | v2 escaladare în OODA (L8001). | — |
| 11 | Micro-OODA | Mesaj → LLM → DB → semnale → B9. | v2 OODA (L8001). | — |
| 12 | Tier + de-escaladare | Fallback model flag (`SentimentAnalyzeResult`). | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E5, apel HTTP LLM. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.feedback.conversation.analyze`.
- **Cod:** `cognitive:e5:sentiment:analyze`.

---
*Audit manual 2026-04-13.*
