<!-- neuron-contract:author-complete -->

# Neuron `wa:send:reply`

> **Status:** audit manual **2026-04-11**. **Nu există** coadă `wa:send:reply` în registry. Răspunsurile WA generate de AI sunt puse în coadă **`q:wa:phone-NN:followup`** (job name `ai-response`) din `createResponseGeneratorWorker` (`ai-sentiment.ts` L508–527).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `wa:send:reply` |
| etapa | E2 |
| familie (v2) | `whatsapp` |
| contract_path | `contracts/neurons/E2/wa--send--reply.md` |
| ADR familie (indicativ) | [whatsapp](../../adr/families/e2/whatsapp.md) |

## Scop în context real

**v2:** antet graf pentru trimitere reply. **Repo:** LLM în worker `ai:response:generate` (`QUEUES.AI_RESPONSE_GENERATE` — vezi `index.ts` L205); după generare, dacă există `phoneLabel` și `chatId`, job-ul este adăugat pe **`getWaPhoneFollowupQueueName(phoneIdx)`** cu `bodyTemplate: generatedResponse`, `isFollowup: true` (`ai-sentiment.ts` L508–523). Execuția efectivă de trimitere = același **`createWaWorker`** pe coada `:followup` ca la `wa:send:followup`. **Nu** s-a găsit literal `wa:send:reply` în surse TypeScript la audit.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`wa:send:reply\`` (L4387–4407).
- `workers/outreach/src/workers/ai-sentiment.ts` — `createResponseGeneratorWorker`, enqueue followup.
- `workers/outreach/src/workers/whatsapp.ts` — `createWaWorker` pentru `:followup`.
- `workers/outreach/src/index.ts` — `createResponseGeneratorWorker(redis)` L205.
- `grep` repo: zero potriviri pentru `wa:send:reply` în `*.ts`.

## Instanțe v2

- **E5 duplicat #2:** același `v2_queue` în plan — contract separat `E5/wa--send--reply.md` (todo separat).

## N/A pe criterii

- **Rând 8 (sender BullMQ):** traseul **motor** `createWaWorker` este Non-AI; **rând 8 aplicabil parțial** pentru etapa LLM în `createResponseGeneratorWorker` — rutare prin `resolveOutreachLlmRouting` / `generateOutreachResponseTextWithRetries` (`ai-sentiment.ts` L474–485) — fără detaliere model în acest contract (vezi neuron `ai:response:generate`).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** `nodeKey` pentru `wa:send:reply`; execuție pe cozi `q:wa:phone-*:followup`. | v2 `wa:send:reply`. | — |
| 2 | Etapă, familie, swimlane | E2 whatsapp + legătură `ai-sentiment` etapa e2. | v2. | — |
| 3 | Rol declarat | „Reply” operațional = generare LLM + enqueue follow-up WA. | v2 operational purpose. | — |
| 4 | NeuronType + SOFAI | Motor la nivel trimitere; analiză/generare în alt neuron. | v2 MotorNeuron pentru antet. | Lanț multi-neuron. |
| 5 | Criticitate | — | v2 MEDIUM. | — |
| 6 | Înveliș telemetrie | Span pe cozi reale + span AI în generator. | v2 `cognitive.wa.send.reply`. | — |
| 7 | Înveliș politică | Fallback review queue dacă generare goală (`ai-sentiment.ts` L487–501). | v2 guardrails. | — |
| 8 | Rutare model (dacă AI) | **Parțial:** LLM în `createResponseGeneratorWorker`; nu în `createWaWorker`. | v2 Self-hosted-first — vezi implementare `resolveOutreachLlmRouting`. | Detaliu model în contractul `ai:response:generate`. |
| 9 | Guardrails | Cache răspuns, truncare conținut review, fallback RO. | v2. | — |
| 10 | Escaladare HITL | `human:review:queue` pe incertitudine (`ai-sentiment.ts` L489–500). | v2. | — |
| 11 | Micro-OODA | OBSERVE: analiză inbound; ORIENT: rută LLM; DECIDE: text; ACT: enqueue WA follow-up. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Fallback + review queue. | v2 Tier 4 pentru antet graf simplu. | — |
| 13 | Stack | BullMQ, Redis (cache), LLM client outreach, TimelinesAI la send. | v2 §2.3. | **Limită:** payload `ai-response` vs `WaSendInitialJobData` — verificare câmpuri obligatorii. |

### Mapare OTel

- **v2:** `cognitive.wa.send.reply`.
- **Cod:** combinație **AI span** + **motor span** pe `q:wa:phone-NN:followup` — mapare **multi-span**, nu un singur `nodeKey` pentru eticheta v2.

---
*Generator inițial:* înlocuit prin audit manual.
