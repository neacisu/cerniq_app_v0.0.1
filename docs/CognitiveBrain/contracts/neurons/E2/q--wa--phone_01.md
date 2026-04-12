<!-- neuron-contract:author-complete -->

# Neuron `q:wa:phone_01`

> **Status:** audit manual **2026-04-11**. **Coada runtime** pentru telefonul index 1 este **`q:wa:phone-01`** (cratimă + zero-leading), nu literalul v2 cu underscore `q:wa:phone_01`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `q:wa:phone_01` |
| etapa | E2 |
| familie (v2) | `whatsapp` |
| contract_path | `contracts/neurons/E2/q--wa--phone_01.md` |
| ADR familie (indicativ) | [whatsapp](../../adr/families/e2/whatsapp.md) |

## Scop în context real

**Repo:** `createWaWorker(1, false, redis, luaSha)` (`whatsapp.ts` L298–300) înregistrează worker pe **`getWaPhoneQueueName(1)`** = **`q:wa:phone-01`** (`queue-registry.ts` L661–662). Procesor: același flux ca familia `q:wa:phone-*` — quota, verificare telefon ACTIVE, jitter ADR-0057, spintax, `sendWhatsApp`, `communication_log`, update `lead_journey` pentru mesaje non-followup (`whatsapp.ts` L106–290). **Test:** `outreach-metrics.test.ts` referă procesor înregistrat pentru `'q:wa:phone-01'` (L306–307).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`q:wa:phone_01\`` (L4155–4175).
- `workers/outreach/src/workers/whatsapp.ts` — `createWaWorker`, `createAllWaWorkers`.
- `workers/shared/src/queue-registry.ts` — `getWaPhoneQueueName`.
- `workers/outreach/src/workers/orchestration.ts` — `getWaPhoneQueueName(Math.min(phoneIndex, 20))` (L532) — producători posibili de job-uri.
- `apps/api/src/routes/outreach.ts` — L570–576, alegere coadă WA.
- `workers/outreach/src/workers/outreach-metrics.test.ts` — L306–307.

## Instanțe v2

- **Mapare 1:1:** v2 `q:wa:phone_01` ≡ instanță logică **phone index 1** ≡ coadă **`q:wa:phone-01`**.

## N/A pe criterii

- **Rând 8:** **N/A** — fără LLM în sender.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** `nodeKey` per instanță; pattern catalog `q:wa:phone-{01..20}`. | v2 `q:wa:phone_01`. | — |
| 2 | Etapă, familie, swimlane | E2, whatsapp (`whatsapp.ts` L38). | v2. | — |
| 3 | Rol declarat | Worker motor trimitere WA pentru coada telefonului 1. | v2 operational purpose. | — |
| 4 | NeuronType + SOFAI | MotorNeuron (execuție externă). | v2 MotorNeuron. | — |
| 5 | Criticitate | — | v2 MEDIUM. | — |
| 6 | Înveliș telemetrie | `createWorker('q:wa:phone-01', …)` prin fabrică. | v2 `cognitive.q.wa.phone_01`. | Diferență nume span vs coadă. |
| 7 | Înveliș politică | Concurrency **1** (L285–286), quota + telefon. | v2 Tier 4. | — |
| 8 | Rutare model (dacă AI) | N/A | v2 Non-AI. | N/A |
| 9 | Guardrails | Quota Lua, `PHONE_INACTIVE`, jitter, ADR-0060. | ADR-0056/57/60. | — |
| 10 | Escaladare HITL | Nu aici. | v2. | — |
| 11 | Micro-OODA | OBSERVE–ACT ca în `createWaWorker`. | v2. | — |
| 12 | Tier + de-escaladare | Cod erori `retryable: false` pentru quota/telefon. | v2. | — |
| 13 | Stack | BullMQ + Redis + PG + TimelinesAI. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.q.wa.phone_01`.
- **Cod:** span din `createWorker`; atribute reale `cognitive.nodeKey` rezolvate din **`q:wa:phone-01`** — verificare `resolveNodeKeyFromQueueName` la nevoie; **aliniere parțială** față de eticheta v2 cu underscore.

---
*Generator inițial:* înlocuit prin audit manual.
