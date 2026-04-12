<!-- neuron-contract:author-complete -->

# Neuron `outreach:wa:send`

> **Status:** audit manual **2026-04-11**. Numele v2 **`outreach:wa:send`** nu apare ca literal de coadă în runtime; **trimiterea WA** este implementată pe **cozi per-telefon** `q:wa:phone-NN` și `q:wa:phone-NN:followup` (`getWaPhoneQueueName` / `getWaPhoneFollowupQueueName`), worker `createWaWorker` în `whatsapp.ts`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `outreach:wa:send` |
| etapa | E2 |
| familie (v2) | `orchestrator` |
| contract_path | `contracts/neurons/E2/outreach--wa--send.md` |
| ADR familie (indicativ) | [orchestrator](../../adr/families/e2/orchestrator.md) |

## Scop în context real

**v2:** neuron graf umbrella „send”. **Repo:** `createWaWorker` (`workers/outreach/src/workers/whatsapp.ts`, L106–290) procesează `WaSendInitialJobData`: `quotaGuardianCheck` (Redis Lua), verificare telefon ACTIVE în PG, **jitter** 30s + random120s (`applyJitter`, ADR-0057), `processSpintax`, `createWaProvider("timelinesai").sendWhatsApp`, INSERT `communication_log`, UPDATE `lead_journey` (stare `CONTACTED_WA` pentru mesaje non-followup). Concurrency **1** per coadă (ADR-0060). **Catalog:** `CATALOG_STATS.skippedQueues` (`cognitive-node-catalog.ts` L3381–3393) documentează pattern-urile `q:wa:phone-{01..20}` fără `QUEUES.*` constante.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`outreach:wa:send\`` (L3886–3906).
- `workers/outreach/src/workers/whatsapp.ts` — `createWaWorker`, `WaSendInitialJobData`, `applyJitter`, integrare TimelinesAI.
- `workers/shared/src/queue-registry.ts` — `getWaPhoneQueueName`, `getWaPhoneFollowupQueueName`, `buildWaPhoneQueues`, `WA_PHONE_COUNT`.
- `packages/shared/src/cognitive-node-catalog.ts` — `CATALOG_STATS.skippedQueues` (cozi dinamice).
- `workers/outreach/src/workers/quota-guardian.ts` — `quotaGuardianCheck` apelat din WA sender.
- `docs/CognitiveBrain/NEURON_MATRIX.csv` — rând `outreach:wa:send`, catalog gol (neuron conceptual vs cozi reale).

## Instanțe v2

- **Catalog nodeKey (pentru `outreach:wa:send`):** — **gap**; neuroni înrudiți în catalog: `wa:send:initial` / `wa:send:reply` (alte intrări v2), nu acest literal.
- **OTel (v2):** `cognitive.outreach.wa.send`

## N/A pe criterii

- **Rând 8:** **N/A** — fără LLM în `createWaWorker` (doar reguli + provider HTTP).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Divergență:** implementare pe `q:wa:phone-*` / `*:followup`; fără `nodeKey` unic pentru eticheta `outreach:wa:send`. | v2 queue `outreach:wa:send`. | Aliniere registry ↔ v2 necesită decizie cutover. |
| 2 | Etapă, familie, swimlane | Worker outreach `etapa: e2` în logger (L38); cozi în registry secțiune WA. | v2 E2 orchestrator. | Swimlane v2 `orchestrator` vs `pipeline-control` în alte neuroni — folosiți v2 pentru acest antet. |
| 3 | Rol declarat | Trimitere WA outbound + telemetrie + journey. | v2 operational purpose generic. | — |
| 4 | NeuronType + SOFAI | — (fără intrare catalog pentru numele v2). | v2 ExecutiveNeuron inferat. | Catalog folosește alte chei pentru WA send. |
| 5 | Criticitate | — | v2 HIGH inferat. | — |
| 6 | Înveliș telemetrie | `createWorker(queueName, ...)` per coadă dinamică; rezolvare `nodeKey` din nume coadă + etapă (fabrică). | `cognitive.outreach.wa.send` (v2). | Nume span v2 ≠ pattern-uri `q:wa:phone-NN` — verificare `resolveNodeKeyFromQueueName` la nevoie. |
| 7 | Înveliș politică | Quota + status telefon + jitter obligatoriu. | v2 tier 3, guardrails. | — |
| 8 | Rutare model (dacă AI) | N/A | v2 declară LLM pentru antet graf — **nu** în cod sender. | N/A |
| 9 | Guardrails | Quota Lua, telefon ACTIVE, spintax. | ADR-0056, ADR-0057, ADR-0060. | — |
| 10 | Escaladare HITL | Nu în acest worker. | v2. | — |
| 11 | Micro-OODA | OBSERVE: Redis/PG; ORIENT: quota + telefon; DECIDE: skip vs send; ACT: provider + INSERT log. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Return struct cu `retryable` pe erori quota/telefon. | v2. | — |
| 13 | Stack | BullMQ, Redis Lua, Postgres, TimelinesAI (`@cerniq/integrations`), metrici `waSent` / `outreachMessagesSentTotal`. | v2 §2.3. | Fără test unitar citit pentru `createWaWorker` la acest audit. |

### Mapare OTel

- **v2:** `cognitive.outreach.wa.send`.
- **Cod:** span-uri din `createWorker` + rezolvare catalog pentru numele cozii reale; **nu** există o coadă unică `outreach:wa:send` — mapare **parțială / conceptuală** până la unificare denumiri.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
