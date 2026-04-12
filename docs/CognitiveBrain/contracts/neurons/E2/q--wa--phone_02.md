<!-- neuron-contract:author-complete -->

# Neuron `q:wa:phone_02`

> **Status:** audit manual **2026-04-11**. **Coada runtime:** **`q:wa:phone-02`** (`getWaPhoneQueueName(2)`); divergență față de v2 `q:wa:phone_02` (underscore).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `q:wa:phone_02` |
| etapa | E2 |
| familie (v2) | `whatsapp` |
| contract_path | `contracts/neurons/E2/q--wa--phone_02.md` |
| ADR familie (indicativ) | [whatsapp](../../adr/families/e2/whatsapp.md) |

## Scop în context real

**Repo:** `createWaWorker(2, false, redis, luaSha)` consumă **`q:wa:phone-02`** (`whatsapp.ts` L298–300, `queue-registry.ts` L661–662). Flux identic cu `q:wa:phone-01`: quota Guardian, verificare `wa_phone_numbers`, jitter, spintax, TimelinesAI, persistență `communication_log` / `lead_journey` (`whatsapp.ts` L106–290). Producători tipici: orchestrare (`orchestration.ts`), API outreach (`apps/api/src/routes/outreach.ts`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`q:wa:phone_02\`` (L4177–4197).
- `workers/outreach/src/workers/whatsapp.ts` — `createWaWorker`, `createAllWaWorkers`.
- `workers/shared/src/queue-registry.ts` — `getWaPhoneQueueName`, `buildWaPhoneQueues`.
- `workers/outreach/src/workers/orchestration.ts` — trimitere către cozi WA.
- `apps/api/src/routes/outreach.ts` — enqueue WA.

## Instanțe v2

- **Mapare:** v2 `q:wa:phone_02` → runtime **`q:wa:phone-02`**, index **2**.

## N/A pe criterii

- **Rând 8:** **N/A** — Non-AI sender.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Pattern catalog `q:wa:phone-{01..20}`; fără `nodeKey` dedicat „02”. | v2 `q:wa:phone_02`. | — |
| 2 | Etapă, familie, swimlane | E2 whatsapp. | v2. | — |
| 3 | Rol declarat | Trimitere WA pentru linia 2. | v2. | — |
| 4 | NeuronType + SOFAI | MotorNeuron. | v2. | — |
| 5 | Criticitate | — | v2 MEDIUM. | — |
| 6 | Înveliș telemetrie | Worker pe `q:wa:phone-02`. | v2 `cognitive.q.wa.phone_02`. | Nume diferite. |
| 7 | Înveliș politică | Concurrency 1, quota, ADR-0060. | v2 Tier 4. | — |
| 8 | Rutare model (dacă AI) | N/A | v2 Non-AI. | N/A |
| 9 | Guardrails | Quota + telefon ACTIVE + jitter. | ADR. | — |
| 10 | Escaladare HITL | Nu în worker. | v2. | — |
| 11 | Micro-OODA | Ca `createWaWorker`. | v2. | — |
| 12 | Tier + de-escaladare | Struct erori cu `retryable`. | v2. | — |
| 13 | Stack | BullMQ, Redis, PG, integrations. | v2 §2.3. | Fără test dedicat doar pentru „02” în afară de registry/metrics. |

### Mapare OTel

- **v2:** `cognitive.q.wa.phone_02`.
- **Cod:** telemetrie fabrică pe **`q:wa:phone-02`**; mapare `cognitive.nodeKey` vs convenția v2 `cognitive.neuron.*` — **parțială** până la normalizare separator.

---
*Generator inițial:* înlocuit prin audit manual.
