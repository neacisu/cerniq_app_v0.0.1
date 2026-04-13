<!-- neuron-contract:author-complete -->

# Neuron `sentiment:trend:analyze`

> **Status:** audit manual **2026-04-11**. **K64** — analiză **deterministă** a trendului de sentiment (fără LLM) pe baza `sentimentScore` din `aiConversationMessages`; la degradare >0.3 între ultimele 3 vs precedentele 3 mesaje user, enfilează **`handover:detect`** (`QUEUES.E3_HANDOVER_DETECT`).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `sentiment:trend:analyze` |
| etapa | E3 |
| familie (v2) | `ai-core` |
| contract_path | `contracts/neurons/E3/sentiment--trend--analyze.md` |
| ADR familie (indicativ) | [ai-core](../../adr/families/e3/ai-core.md) |

## Scop în context real

**v2** (L4697–4719) descrie **EmotionNeuron**, rutare LLM (QwQ/SGLang) și OODA cu analiză mesaj. **Repo:** `k64-sentiment-trend-analyze.ts` declară explicit **fără apel LLM** (L12–13): compară medii pe scoruri deja persistate (K61), fereastră 7 zile, prag `DEGRADATION_THRESHOLD = 0.3` (L51–53, L69–79). La trigger, `handoverQueue.add("handover:detect", { triggerReason: "SENTIMENT_DEGRADATION", … })` (`k64-sentiment-trend-analyze.ts` L140–152). **Worker:** `main.ts` L252. **Registry:** `QUEUES.E3_SENTIMENT_TREND_ANALYZE` (`queue-registry.ts` L325, L1025). **Producător CRON:** header K64 menționează CRON la 6 ore; **nu** s-a găsit `queue.add(..., { repeat: … })` pentru această coadă în `workers/e3-ai-sales` sau `apps/api` la grep. **Teste:** `k-workers.test.ts` L643+.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`sentiment:trend:analyze\`` (L4697–4719).
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:sentiment:trend-analyze` (L2086–2093).
- `workers/shared/src/queue-registry.ts` — L325, L1025.
- `workers/e3-ai-sales/src/main.ts` — L252.
- `workers/e3-ai-sales/src/workers/k64-sentiment-trend-analyze.ts` — procesor, praguri, enqueue handover.
- `workers/e3-ai-sales/src/__tests__/k-workers.test.ts` — K64.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A pentru **K64** — fișierul interzice explicit apeluri LLM (L12–13); **v2** cere LLM — **decalaj documentat**.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:sentiment:trend-analyze`**, coadă **`sentiment:trend:analyze`** (catalog L2086–2087). Registry L325. | v2: același `Confirmed queue field`. | — |
| 2 | Etapă, familie, swimlane | E3; swimlane **`ai-reasoning`** (catalog L2090). | v2: E3, ai-core. | — |
| 3 | Rol declarat | Detectare degradare sentiment → handover (`k64-sentiment-trend-analyze.ts` L1–10, L139–157). | v2: trend + trigger HITL. | Implementare pe scoruri stocate, nu pe text brut. |
| 4 | NeuronType + SOFAI | **EmotionNeuron** (catalog L2089). | v2: EmotionNeuron. | — |
| 5 | Criticitate | **HIGH** (catalog L2092). | v2: HIGH. | — |
| 6 | Înveliș telemetrie | Fabrică + `withCognitiveSpan` (`factory.ts` L90–107). | v2: `cognitive.e3.sentiment.trend-analyze`. | — |
| 7 | Înveliș politică | Filtru negocieri: `currentState NOT IN ('WON','LOST','DEAD')` (`k64-sentiment-trend-analyze.ts` L55, L92). | v2: Tier 3, HITL. | Alinierea `WON`/`LOST` cu FSM-ul `goldNegotiations` din alte rute: verificare schema DB / consistență stări. |
| 8 | Rutare model (dacă AI) | **N/A** — vezi N/A. | v2: QwQ / SGLang. | — |
| 9 | Guardrails | Prag numeric fix 0.3; minimum 6 mesaje cu scor (`k64-sentiment-trend-analyze.ts` L69–71). | ADR-0007. | — |
| 10 | Escaladare HITL | Enqueue **`handover:detect`** cu `SENTIMENT_DEGRADATION` (`k64-sentiment-trend-analyze.ts` L59, L140–152). | v2 trigger HITL. | Lanțul complet handover: în J56, nu în K64. |
| 11 | Micro-OODA | OBSERVE — mesaje + scoruri; ORIENT — medii; DECIDE — degradare; ACT — job handover (`k64-sentiment-trend-analyze.ts` L120–157). | v2 OODA cu LLM în ORIENT — **nu** în cod. | — |
| 12 | Tier + de-escaladare | — | v2 Tier 3. | — |
| 13 | Stack (subset) | BullMQ, Drizzle/Postgres, coadă downstream `handover:detect`. | v2 §2.3. | SGLang: absent în K64. |

### Mapare OTel

- **v2:** `cognitive.e3.sentiment.trend-analyze`.
- **Cod:** `cognitive.nodeKey` **`e3:sentiment:trend-analyze`** — **aliniat** cu catalog.

---
*Generator inițial:* înlocuit prin audit manual.
