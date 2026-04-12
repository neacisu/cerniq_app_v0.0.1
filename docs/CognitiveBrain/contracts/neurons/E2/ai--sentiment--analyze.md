<!-- neuron-contract:author-complete -->

# Neuron `ai:sentiment:analyze`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `ai:sentiment:analyze` |
| etapa | E2 |
| familie (v2) | `ai-analysis` |
| contract_path | `contracts/neurons/E2/ai--sentiment--analyze.md` |
| ADR familie (indicativ) | [ai-analysis](../../adr/families/e2/ai-analysis.md) |

## Scop în context real

În **v2**, neuronul este **EmotionNeuron** pentru analiza sentimentului mesajelor de la lead, cu rutare LLM, prag de încredere și span `cognitive.e2.ai.sentiment-analyze`. În **repo**, coada **`ai:sentiment:analyze`** (`QUEUES.AI_SENTIMENT_ANALYZE`) este procesată de `createSentimentAnalyzerWorker` în `workers/outreach/src/workers/ai-sentiment.ts`: apel LLM structurat JSON (schema Zod `sentimentAnalysisSchema`), scor −100..100, intenții (`INTERESTED`, `NOT_INTERESTED`, `QUESTION`, `COMPLAINT`, `NEUTRAL`), `urgency`, `requiresHuman`; cache Redis per tenant+conținut; actualizare `leadJourney` în DB; rutare **ADR-0063** — dacă `score >= 50` și fără review obligatoriu → enqueue **`ai:response:generate`**; altfel (inclusiv `NOT_INTERESTED` sau `requiresHuman`) → **`human:review:queue`**. Comentariul din fișier documentează **unificarea** logicii vechi `ai:intent:classify` (ex. `NOT_INTERESTED` forțează review). Worker-ul outreach înregistrează **`registerCognitiveWorkerEtapa(2)`** (`workers/outreach/src/index.ts`). Rutarea modelului folosește `resolveOutreachLlmRouting(tenantId, OUTREACH_NODE_SENTIMENT)` cu `OUTREACH_NODE_SENTIMENT = "e2:ai:sentiment-analyze"` (`outreach-llm-routing.ts`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`ai:sentiment:analyze\`` (L3123–3146).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:ai:sentiment-analyze` / `ai:sentiment:analyze` (în jurul L1308–1320).
- `workers/shared/src/queue-registry.ts` — `AI_SENTIMENT_ANALYZE: "ai:sentiment:analyze"` (L156); concurrency (L827).
- `workers/outreach/src/index.ts` — `registerCognitiveWorkerEtapa(2)` (L27).
- `workers/outreach/src/workers/ai-sentiment.ts` — worker sentiment, `withCognitiveSpan("e2:ai:sentiment-analyze", …)`, rutare, `callAIForSentiment`, schema Zod (L172–337, L339–436).
- `workers/shared/src/outreach-llm-routing.ts` — `OUTREACH_NODE_SENTIMENT`, fast vs reasoning (L19–21, L29+).
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation` + `createWorker` (L90–107, L209–221).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` → `cognitive:${nodeKey}` (L215–234).
- `workers/outreach/src/workers/ai-sentiment.test.ts` — teste worker sentiment / rutare / registry.

## Instanțe v2

### Instanță 1 — `ai-analysis` (v2 ~L3123)

- **Catalog nodeKey:** `e2:ai:sentiment-analyze`
- **Confirmed queue field:** `ai:sentiment:analyze`
- **Neuron type:** `EmotionNeuron`
- **OTel span name (v2):** `cognitive.e2.ai.sentiment-analyze`

### Extras câmpuri v2

- OODA, QwQ/SGLang, HITL la încredere < 0.80 — conform blocului v2.

## N/A pe criterii

Nu s-a folosit **N/A** pe rânduri.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Catalog:** `nodeKey` **`e2:ai:sentiment-analyze`**, coadă **`ai:sentiment:analyze`**. **Registry:** același literal. **Worker:** `createSentimentAnalyzerWorker` + `QUEUES.AI_SENTIMENT_ANALYZE` (`ai-sentiment.ts` L179–184). | v2: `ai:sentiment:analyze`. | — |
| 2 | Etapă, familie, swimlane | **Catalog:** `etapa: 2`, `swimlane: "ai-analysis"`. **Worker:** `registerCognitiveWorkerEtapa(2)`. | v2: E2, familie `ai-analysis`, swimlane `ai-analysis`. | — |
| 3 | Rol declarat | Analiză sentiment + intenție pentru outreach; actualizare `leadJourney`; rutare către răspuns AI sau coadă umană (`ai-sentiment.ts` L265–322). **Catalog:** „Analiză sentiment mesaje primite de la lead”. | v2: funcție cognitivă + analogie amigdală. | „Intent” unificat aici vs neuron separat `ai:intent:classify` în v2 — documentat în cod ca deprecare. |
| 4 | NeuronType + SOFAI | **Catalog:** `NeuronType.EmotionNeuron`. Clasificare **emoție / tonalitate** (v2 §2.1), nu DeliberativeNeuron. | v2: `EmotionNeuron`. | — |
| 5 | Criticitate | **Catalog:** `HIGH`. | v2: `HIGH`. | — |
| 6 | Înveliș telemetrie | **Explicit:** `withCognitiveSpan("e2:ai:sentiment-analyze", …)` în procesor (`ai-sentiment.ts` L186). Span activ: `cognitive:e2:ai:sentiment-analyze` (`cognitive-helpers.ts` L226). **Automat:** `createWorker` poate învălui același `nodeKey` rezolvat din coadă + etapă 2 — guard anti-dublare în `withCognitiveSpan` (L221–223). **v2:** notație puncte `cognitive.e2.ai.sentiment-analyze`. | ADR-0003. | Diferență puncte vs două puncte în numele spanului. |
| 7 | Înveliș politică | **Fără** Cedar/OPA în fișier. Rutare comportament: praguri `score >= 50`, `requiresReview`, `score < 0` (`ai-sentiment.ts` L269–322). La eșec structurat → flag review + enqueue `human:review:queue` (L211–239). | v2: Tier 3, HITL la anomalii, SLA 4h. | SLA4h nu e citit în acest worker; politici numerice diferite de checklist v2. |
| 8 | Rutare model (dacă AI) | **`resolveOutreachLlmRouting`** alege fast vs reasoning vs echivalent Anthropic per tenant (`outreach-llm-routing.ts`). În `callAIForSentiment`, apel OpenAI-compat cu `response_format` JSON și lanț fallback frontier (`ai-sentiment.ts` L393–433). Fallback-ul urmează eșecul apelului, nu un prag de încredere scris în schema v2. | v2: QwQ-32B și fallback la încredere sub 0.80. | Reasoning disponibil prin config; mecanism diferit de textul v2. |
| 9 | Guardrails | **Zod** `sentimentAnalysisSchema`; `generateValidatedJsonWithRetries` max 3 încercări (`ai-sentiment.ts` L373–397). **Fără** NeMo în fișier. | v2 + ADR-0007. | NeMo: țintă. |
| 10 | Escaladare HITL | Enqueue **`QUEUES.HUMAN_REVIEW_QUEUE`** (`human:review:queue` registry) pe ramurile review (`ai-sentiment.ts` L226–238, L306–321). | v2 + ADR-0008. | Detaliu handler coadă umană în afara fragmentului citat. |
| 11 | Micro-OODA | Observe (mesaj + cache), Orient (LLM JSON), Decide (schema + praguri score/intent), Act (DB update + enqueue response sau review). **Fără** GraphRAG. | v2 OODA; GraphRAG țintă ADR-0005. | — |
| 12 | Tier + de-escaladare | Escaladare la `NOT_INTERESTED`, `requiresHuman`, scor negativ, sau eșec validare structurată. **Nu** apare trigger „2σ” explicit. | v2 §2.2. | Trigger-e statistice v2 neobservate literal. |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Redis cache, Postgres `leadJourney`, OpenAI-compat gateway + frontier, OTel `withCognitiveSpan`. | v2 §2.3. | Kafka/SGLang/Neo4j: neaudit pentru acest worker. |

### Mapare OTel

- **v2:** `cognitive.e2.ai.sentiment-analyze`.
- **Cod:** `cognitive:e2:ai:sentiment-analyze`; atribute catalog populate din `getNodeByKey("e2:ai:sentiment-analyze")` când spanul este creat.
- **Stare la 2026-04-11:** **parțial aliniat** — același `nodeKey`, convenție separator nume span diferită de notația puncte din v2.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
