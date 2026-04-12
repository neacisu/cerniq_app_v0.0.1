<!-- neuron-contract:author-complete -->

# Neuron `wa:send:followup`

> **Status:** audit manual **2026-04-11**. **Nu există** coadă BullMQ literală `wa:send:followup` în registry. Follow-up-urile WA folosesc **`getWaPhoneFollowupQueueName(i)`** → **`q:wa:phone-NN:followup`** și `createWaWorker(i, true, …)` (`whatsapp.ts` L112–114, L298–300).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `wa:send:followup` |
| etapa | E2 |
| familie (v2) | `whatsapp` |
| contract_path | `contracts/neurons/E2/wa--send--followup.md` |
| ADR familie (indicativ) | [whatsapp](../../adr/families/e2/whatsapp.md) |

## Scop în context real

**v2:** antet graf pentru trimitere follow-up. **Repo:** același procesator `createWaWorker` cu `isFollowup: true` pe cozi **`:followup`**; în job, `isFollowup: true` face ca `quotaGuardianCheck` să trateze mesajul ca follow-up (cost quota 0 pentru contact existent în Lua), iar **fără** setarea stării `CONTACTED_WA` ca la primul mesaj (`whatsapp.ts` L241–270 doar pentru `!jobIsFollowup`). **Producători:** de ex. `createResponseGeneratorWorker` adaugă pe `getWaPhoneFollowupQueueName(phoneIdx)` (`ai-sentiment.ts` L511–513). **Catalog:** pattern `q:wa:phone-{01..20}:followup` (`cognitive-node-catalog.ts` L3389).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`wa:send:followup\`` (L4343–4363).
- `workers/outreach/src/workers/whatsapp.ts` — `getWaPhoneFollowupQueueName`, `createWaWorker`, ramură `jobIsFollowup`.
- `workers/shared/src/queue-registry.ts` — `getWaPhoneFollowupQueueName`, `buildWaPhoneQueues`.
- `workers/outreach/src/workers/ai-sentiment.ts` — enqueue follow-up L508–527.
- `packages/shared/src/cognitive-node-catalog.ts` — pattern followup.

## Instanțe v2

- **Divergență:** v2 queue `wa:send:followup` vs runtime **`q:wa:phone-NN:followup`**.

## N/A pe criterii

- **Rând 8:** **N/A** pentru traseul sender (fără LLM în `createWaWorker`); conținutul mesajului poate proveni de la LLM în upstream (`ai:response:generate`).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** `nodeKey` pentru literalul v2; pattern catalog pentru `:followup`. | v2 `wa:send:followup`. | — |
| 2 | Etapă, familie, swimlane | E2 whatsapp. | v2. | — |
| 3 | Rol declarat | Execuție mesaje WA follow-up pe cozi dedicate. | v2. | — |
| 4 | NeuronType + SOFAI | MotorNeuron. | v2 MotorNeuron. | — |
| 5 | Criticitate | — | v2 MEDIUM. | — |
| 6 | Înveliș telemetrie | Span per `q:wa:phone-NN:followup`. | v2 `cognitive.wa.send.followup`. | Nume diferite. |
| 7 | Înveliș politică | Concurrency 1, quota, jitter. | v2 Tier 4. | — |
| 8 | Rutare model (dacă AI) | N/A în `createWaWorker`. | v2 Non-AI pentru acest antet. | Conținut poate fi generat de LLM în alt neuron. |
| 9 | Guardrails | Quota, telefon ACTIVE, spintax. | ADR. | — |
| 10 | Escaladare HITL | Nu în sender. | v2. | — |
| 11 | Micro-OODA | Ca sender; fără aceeași tranziție journey ca la inițial. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Struct erori ca la inițial. | v2. | — |
| 13 | Stack | BullMQ, Redis Lua, PG, TimelinesAI. | v2 §2.3. | Payload job `ai-response` poate fi incomplet față de `WaSendInitialJobData` — verificare separată. |

### Mapare OTel

- **v2:** `cognitive.wa.send.followup`.
- **Cod:** telemetrie pe nume **`q:wa:phone-NN:followup`**; mapare **conceptuală** până la alias v2.

---
*Generator inițial:* înlocuit prin audit manual.
