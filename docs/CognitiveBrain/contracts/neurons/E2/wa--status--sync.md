<!-- neuron-contract:author-complete -->

# Neuron `wa:status:sync`

> **Status:** audit manual **2026-04-11**. Worker **`createPhoneStatusSyncWorker`** (`phone-monitoring.ts`): pentru `tenantId` din job, citește toate `wa_phone_numbers`, apelează **`timelinesClient.getAccountStatus`** per telefon, mapează status și actualizează PG (`status`, `lastStatusChange`, `isConnected`, `lastHealthCheckAt`).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `wa:status:sync` |
| etapa | E2 |
| familie (v2) | `whatsapp` |
| contract_path | `contracts/neurons/E2/wa--status--sync.md` |
| ADR familie (indicativ) | [whatsapp](../../adr/families/e2/whatsapp.md) |

## Scop în context real

**Catalog:** `e2:wa:status-sync`, `wa:status:sync` (`cognitive-node-catalog.ts`, L1084–1085). **Registry:** `QUEUES.WA_STATUS_SYNC` (`queue-registry.ts`, L118, L789). **Worker:** `createWorker(QUEUES.WA_STATUS_SYNC, async (job) => { … getAccountStatus … update waPhoneNumbers })` (`phone-monitoring.ts` L284–335). Comentariu fișier L278–281 menționează cron `*/10 * * * *` — **producătorul** repeat job nu a fost găsit în `workers/outreach/src/index.ts` la acest audit (doar `push(createPhoneStatusSyncWorker())` L177). **Limită evidență:** sursa enqueue periodică poate fi alt serviciu sau neimplementată în repo.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`wa:status:sync\`` (L4409–4432).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:wa:status-sync`.
- `workers/shared/src/queue-registry.ts` — `WA_STATUS_SYNC`.
- `workers/outreach/src/workers/phone-monitoring.ts` — `createPhoneStatusSyncWorker`, `mapTimelinesAccountStatusToDb` (importat în același fișier).
- `workers/outreach/src/index.ts` — înregistrare worker L177.

## Instanțe v2

- —

## N/A pe criterii

- **Rând 8:** **N/A** — fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:wa:status-sync`** în catalog. | v2. | — |
| 2 | Etapă, familie, swimlane | Logger `outreach-phone-monitoring`, etapa e2; v2 swimlane `pipeline-control`. | v2. | — |
| 3 | Rol declarat | Sincronizare status conturi TimelinesAI → `wa_phone_numbers`. | v2 operational purpose. | — |
| 4 | NeuronType + SOFAI | AutonomicNeuron (mentenanță fundal). | v2 AutonomicNeuron. | — |
| 5 | Criticitate | — | v2 LOW. | — |
| 6 | Înveliș telemetrie | `createWorker` pe `wa:status:sync`. | v2 `cognitive.e2.wa.status-sync`. | — |
| 7 | Înveliș politică | Concurrency 5 (`phone-monitoring.ts` L333). | v2 Tier 4. | — |
| 8 | Rutare model (dacă AI) | N/A | v2 Non-AI. | N/A |
| 9 | Guardrails | Try/catch per telefon, log erori, continuă bucla (`phone-monitoring.ts` L322–328). | v2. | — |
| 10 | Escaladare HITL | Nu în worker. | v2 No HITL. | — |
| 11 | Micro-OODA | OBSERVE: job + rânduri PG; ORIENT: status API; ACT: UPDATE. | v2 OODA cron/timer. | Cron declarativ în comentariu vs lipsă `add` repeat în index. |
| 12 | Tier + de-escaladare | Erori locale per telefon fără oprire totală. | v2 Tier 4. | — |
| 13 | Stack | BullMQ, Postgres, `@cerniq/integrations` TimelinesAI client. | v2 §2.3. | **Limită:** producer repeat `*/10` ne-localizat în TS citit. |

### Mapare OTel

- **v2:** `cognitive.e2.wa.status-sync`.
- **Cod:** **`cognitive.nodeKey`** `e2:wa:status-sync` — **aliniat** cu catalog pentru coada `wa:status:sync`.

---
*Generator inițial:* înlocuit prin audit manual.
