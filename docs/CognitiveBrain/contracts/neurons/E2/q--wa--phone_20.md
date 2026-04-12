<!-- neuron-contract:author-complete -->

# Neuron `q:wa:phone_20`

> **Status:** audit manual **2026-04-11**. **Coada runtime:** **`q:wa:phone-20`** (ultimul index din `WA_PHONE_COUNT = 20`).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `q:wa:phone_20` |
| etapa | E2 |
| familie (v2) | `whatsapp` |
| contract_path | `contracts/neurons/E2/q--wa--phone_20.md` |
| ADR familie (indicativ) | [whatsapp](../../adr/families/e2/whatsapp.md) |

## Scop în context real

**Repo:** bucla `for (let i = 1; i <= WA_PHONE_COUNT; i++)` (`whatsapp.ts` L298) creează worker pentru **`getWaPhoneQueueName(20)`** = **`q:wa:phone-20`**. Același procesator `createWaWorker` ca pentru celelalte indexuri: limitare zilnică prin quota, jitter înainte de send, integrare TimelinesAI, logging (`whatsapp.ts` L106–290). **Orchestration** folosește `Math.min(phoneIndex, 20)` la alegerea cozii (`orchestration.ts` L532), deci indexul 20 este plafon explicit.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`q:wa:phone_20\`` (L4199–4219).
- `workers/outreach/src/workers/whatsapp.ts` — `createAllWaWorkers`, `WA_PHONE_COUNT` import.
- `workers/shared/src/queue-registry.ts` — `getWaPhoneQueueName`, `WA_PHONE_COUNT = 20`.
- `workers/outreach/src/workers/orchestration.ts` — `Math.min(phoneIndex, 20)` (L532).

## Instanțe v2

- **Mapare:** v2 `q:wa:phone_20` → **`q:wa:phone-20`**.

## N/A pe criterii

- **Rând 8:** **N/A** — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Pattern catalog; fără `nodeKey` singular „20”. | v2 `q:wa:phone_20`. | — |
| 2 | Etapă, familie, swimlane | E2 whatsapp. | v2. | — |
| 3 | Rol declarat | Coadă motor pentru linia WA #20. | v2. | — |
| 4 | NeuronType + SOFAI | MotorNeuron. | v2. | — |
| 5 | Criticitate | — | v2 MEDIUM. | — |
| 6 | Înveliș telemetrie | Worker `q:wa:phone-20`. | v2 `cognitive.q.wa.phone_20`. | — |
| 7 | Înveliș politică | Concurrency 1, quota. | v2 Tier 4. | — |
| 8 | Rutare model (dacă AI) | N/A | v2 Non-AI. | N/A |
| 9 | Guardrails | Quota Lua, status telefon, jitter. | ADR. | — |
| 10 | Escaladare HITL | Nu. | v2. | — |
| 11 | Micro-OODA | Flux `createWaWorker`. | v2. | — |
| 12 | Tier + de-escaladare | Erori deterministe non-retryable. | v2. | — |
| 13 | Stack | BullMQ + Redis + PG + provider. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.q.wa.phone_20`.
- **Cod:** `cognitive.nodeKey` / span din numele **`q:wa:phone-20`**; mapare față de `cognitive.neuron.*` (ADR-0003) — **în curs de aliniere** cu convenția v2.

---
*Generator inițial:* înlocuit prin audit manual.
