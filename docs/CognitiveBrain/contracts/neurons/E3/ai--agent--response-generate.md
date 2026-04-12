<!-- neuron-contract:author-complete -->

# Neuron `ai:agent:response-generate`

> **Status:** audit manual **2026-04-11**. **Divergență denumire:** v2 folosește **`ai:agent:response-generate`**, iar runtime E3 folosește **`ai:e3:response:generate`** (`QUEUES.E3_AI_RESPONSE_GENERATE` în `queue-registry.ts` L230). **C15** — `aiResponseGenerateProcessor` în `c15-ai-response-generate.ts`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `ai:agent:response-generate` |
| etapa | E3 |
| familie (v2) | `ai-core` |
| contract_path | `contracts/neurons/E3/ai--agent--response-generate.md` |
| ADR familie (indicativ) | [ai-core](../../adr/families/e3/ai-core.md) |

## Scop în context real

**v2:** DeliberativeNeuron pentru generare răspuns post-raționament. **Repo:** procesor înregistrat sub cheia **`"ai:e3:response:generate"`** în `main.ts` L189 (nu sub literalul v2). Primește `AiResponseGenerateJobData`: `rawResponse`, `modelUsed`, `userMessage`, token counts, `toolCalls`, etc. (`c15` L18–33). Pași: elimină `<think>` și `<tool_call>`, detectează limbă, opțional `fastChat` pentru `complexity === "simple"`, apoi enqueue paralel **`ai:response:validate`** (C16) și **`ai:conversation:store`** (C17) (`c15` L122–165). **Producător:** C14 adaugă job cu nume `"ai:e3:response:generate"` (`c14` L148–150).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`ai:agent:response-generate\`` (L4481–4501).
- `workers/shared/src/queue-registry.ts` — `E3_AI_RESPONSE_GENERATE: "ai:e3:response:generate"`, comentariu L900.
- `workers/e3-ai-sales/src/main.ts` — L189.
- `workers/e3-ai-sales/src/workers/c15-ai-response-generate.ts` — procesor.
- `workers/e3-ai-sales/src/workers/c14-ai-agent-orchestrate.ts` — enqueue C15 L148–166.
- `packages/shared/src/cognitive-node-catalog.ts` — intrare **`e3:ai:response-generate`** cu câmp coadă catalog **`ai:response:generate`** (L1628–1636) — **diferit** atât de v2 `ai:agent:response-generate`, cât și de runtime **`ai:e3:response:generate`**.

## Instanțe v2

- **Notă:** E2 folosește separat `ai:response:generate` pentru outreach (`queue-registry` L157) — **alt** flux decât E3 `ai:e3:response:generate`.

## N/A pe criterii

- —

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Catalog **`e3:ai:response-generate`** ↔ **`ai:response:generate`**; runtime **`ai:e3:response:generate`** (`QUEUES.E3_AI_RESPONSE_GENERATE`); v2 **`ai:agent:response-generate`**. | v2 antet. | **Triplă divergență** nume coadă (v2 / catalog / registry). |
| 2 | Etapă, familie, swimlane | E3, prefix cozi `ai:` în worker binary. | v2 `ai-core`. | — |
| 3 | Rol declarat | Curățare + reformatare răspuns brut + fan-out validate/store. | v2 generare comercială. | Rol mai îngust (post-procesare după C14). |
| 4 | NeuronType + SOFAI | Deliberative / procesare limbaj. | v2 DeliberativeNeuron. | — |
| 5 | Criticitate | — | v2 HIGH. | — |
| 6 | Înveliș telemetrie | `createWorker` pe coada E3. | v2 `cognitive.ai.agent.response-generate`. | Nume span v2 ≠ nume coadă. |
| 7 | Înveliș politică | `complexity` controlează reformatarea; gol după curățare → throw (`c15` L116–118). | v2 Tier 3. | — |
| 8 | Rutare model (dacă AI) | `fastChat` pentru reformatare simplă (`c15` L52–69, L109–111). | v2 QwQ primary — C15 e post-procesare; model principal în C14. | — |
| 9 | Guardrails | Sanitizare conținut, detectare limbă. | v2. | — |
| 10 | Escaladare HITL | Validare în C16 (alt worker). | v2 HITL. | — |
| 11 | Micro-OODA | OBSERVE: rawResponse; ORIENT: limbă/complexitate; DECIDE: reformatare; ACT: enqueue C16+C17. | v2 OODA. | — |
| 12 | Tier + de-escaladare | `attemptNumber` propagat. | v2. | — |
| 13 | Stack | BullMQ, `fastChat` din `llm-client.js`, cozi `E3_AI_RESPONSE_VALIDATE`, `E3_AI_CONVERSATION_STORE`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.ai.agent.response-generate`.
- **Cod:** span pe **`ai:e3:response:generate`**; mapare **`cognitive.nodeKey`** — verificare catalog după unificare v2 ↔ registry; stadiu **parțial** până la alias.

---
*Generator inițial:* înlocuit prin audit manual.
