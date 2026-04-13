<!-- neuron-contract:author-complete -->

# Neuron `feedback:sentiment:analyze`

> **Status:** audit manual **2026-04-13**. **v2** (L8052–L8075): câmp coadă `feedback:sentiment:analyze`, `EmotionNeuron`, **catalog `e2:ai:sentiment-analyze`**, etapă **E2** (L8059–L8074). **Repo:** coada BullMQ canonică este **`ai:sentiment:analyze`** — `QUEUES.AI_SENTIMENT_ANALYZE` (`queue-registry.ts` L156), același nod catalog (`cognitive-node-catalog.ts` L1313–L1320), worker `createSentimentAnalyzerWorker` în `workers/outreach/src/workers/ai-sentiment.ts`. **Concluzie:** numele v2 „feedback:” este alias documentar; **execuția** este identică cu neuronul [`ai--sentiment--analyze.md`](ai--sentiment--analyze.md).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `feedback:sentiment:analyze` |
| coadă runtime | `ai:sentiment:analyze` |
| etapa | E2 |
| familie (v2) | `feedback` |
| catalog nodeKey | `e2:ai:sentiment-analyze` |
| contract_path | `contracts/neurons/E2/feedback--sentiment--analyze.md` |
| contract mirror (runtime) | [`ai--sentiment--analyze.md`](ai--sentiment--analyze.md) |
| ADR familie (indicativ) | [ai-analysis](../../adr/families/e2/ai-analysis.md) |

## Scop în context real

Analiză LLM a mesajului lead, scor −100..100, rutare către `ai:response:generate` sau `human:review:queue` — vezi `ai-sentiment.ts` și contractul `ai:sentiment:analyze`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L8052–L8075 (atenție L8065: text „E5” în descriere vs antet E2 — **eroare internă v2**).
- `workers/shared/src/queue-registry.ts` — `AI_SENTIMENT_ANALYZE` (L156).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:ai:sentiment-analyze` (L1313–L1320).
- `workers/outreach/src/workers/ai-sentiment.ts` — worker sentiment E2.
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- **L8052–L8075:** `Confirmed queue field` `feedback:sentiment:analyze` (L8069) dar același `nodeKey` catalog ca `ai:sentiment:analyze` (L8059); span `cognitive.e2.ai.sentiment-analyze` (L8074).

## N/A pe criterii

- —

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`ai:sentiment:analyze`** + `e2:ai:sentiment-analyze`; **fără** `feedback:sentiment:analyze` în registry. | v2: `feedback:sentiment:analyze` (L8069). | Alias v2 vs literal runtime. |
| 2 | Etapă, familie, swimlane | Catalog: etapă `2`, `ai-analysis` (L1318). | v2: E2, `feedback`, swimlane `ai-analysis` (L8062, L8068). | — |
| 3 | Rol declarat | „Analiză sentiment mesaje primite de la lead” (catalog L1316). | v2: același rol operațional (L8066–L8068). | — |
| 4 | NeuronType + SOFAI | `EmotionNeuron` (catalog L1317). | v2: `EmotionNeuron` (L8060). | — |
| 5 | Criticitate | Catalog + v2: `HIGH` (L1320, L8063). | v2 L8063. | — |
| 6 | Înveliș telemetrie | Instrumentare `createWorker` outreach → span `cognitive:e2:ai:sentiment-analyze` (vezi contract `ai--sentiment--analyze`). | v2 span (L8074). | — |
| 7 | Înveliș politică | Praguri review ADR-0063 / logică `ai-sentiment.ts`. | v2 HITL la anomalii (L8072). | — |
| 8 | Rutare model (dacă AI) | LLM structurat în `ai-sentiment.ts`. | v2 QwQ + fallback (L8071). | Modele: vezi implementare actuală. |
| 9 | Guardrails | Schemă Zod, cache Redis — vezi `ai-sentiment.ts`. | v2 L8072. | — |
| 10 | Escaladare HITL | Enqueue `human:review:queue` pe ramuri negative (`ai-sentiment.ts`). | v2 L8072. | — |
| 11 | Micro-OODA | Text → LLM → persistență → rutare. | v2 OODA (L8070). | — |
| 12 | Tier + de-escaladare | Tier 3 v2 (L8064). | v2. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ outreach Etapa 2, Postgres. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.ai.sentiment-analyze`.
- **Cod:** `cognitive:e2:ai:sentiment-analyze` (vezi `ai--sentiment--analyze.md`).

---
*Audit manual 2026-04-13.*
