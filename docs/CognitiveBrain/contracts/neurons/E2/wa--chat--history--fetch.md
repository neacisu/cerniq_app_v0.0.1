<!-- neuron-contract:author-complete -->

# Neuron `wa:chat:history:fetch`

> **Status:** audit manual **2026-04-11**. Coada există în registry și catalog, dar **worker-ul înregistrat nu apelează API de istoric chat**; folosește același procesator ca **`wa:read:receipt`** (actualizare READ + `engagement_score`), conform comentariului din cod.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `wa:chat:history:fetch` |
| etapa | E2 |
| familie (v2) | `whatsapp` |
| contract_path | `contracts/neurons/E2/wa--chat--history--fetch.md` |
| ADR familie (indicativ) | [whatsapp](../../adr/families/e2/whatsapp.md) |

## Scop în context real

**v2 + catalog:** `e2:wa:chat-history`, SensoryNeuron, recuperare istoric conversații. **Repo:** `createWaLegacyChatHistoryReadReceiptWorker` = `createWorker(QUEUES.WA_CHAT_HISTORY_FETCH, processWaReadReceiptJob, …)` (`whatsapp.ts` L446–451). `processWaReadReceiptJob` (L376–437) actualizează `communication_log` la READ și recalculează `leadJourney.engagementScore` — **fără** `timelinesClient.getChatHistory` sau similar. Clientul TimelinesAI oferă `getChatHistory` (`packages/integrations/src/timelinesai/client.ts`, L251+) dar **nu** este folosit de acest worker. **Test:** `whatsapp-legacy-workers.test.ts` confirmă că worker-ul ascultă `WA_CHAT_HISTORY_FETCH` cu procesator read receipt (L41–51).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`wa:chat:history:fetch\`` (L4268–4291).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:wa:chat-history`, `wa:chat:history:fetch`.
- `workers/shared/src/queue-registry.ts` — `WA_CHAT_HISTORY_FETCH`, comentariu L116.
- `workers/outreach/src/workers/whatsapp.ts` — `createWaLegacyChatHistoryReadReceiptWorker`, `processWaReadReceiptJob`.
- `workers/outreach/src/index.ts` — L157–158.
- `workers/outreach/src/workers/whatsapp-legacy-workers.test.ts`.
- `packages/integrations/src/timelinesai/client.ts` — metodă istoric (neconectată la acest worker).

## Instanțe v2

- **Divergență semantică:** numele cozii sugerează fetch istoric; comportament = read receipt / engagement.

## N/A pe criterii

- **Rând 8:** **N/A** — fără LLM în `processWaReadReceiptJob`.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:wa:chat-history`** + queue în catalog L1075–1076. | v2 catalog-grounded. | — |
| 2 | Etapă, familie, swimlane | E2; v2 swimlane `data-ingest` — worker e mai degrabă post-procesare PG. | v2. | — |
| 3 | Rol declarat | **În cod:** compatibilitate job-uri vechi pe această coadă → același flux ca read receipt. | v2 „Recuperare istoric conversații”. | **Gap:** fetch istoric neimplementat în acest handler. |
| 4 | NeuronType + SOFAI | Logică de actualizare stare (aproape Sensory/Interneuron față de v2 Sensory). | v2 SensoryNeuron. | — |
| 5 | Criticitate | — | v2 LOW. | — |
| 6 | Înveliș telemetrie | `createWorker` pe `wa:chat:history:fetch`. | v2 `cognitive.e2.wa.chat-history`. | — |
| 7 | Înveliș politică | Concurrency 20 în registry L787; worker L449. | v2 Tier 4, retry BullMQ. | — |
| 8 | Rutare model (dacă AI) | N/A | v2 Non-AI. | N/A |
| 9 | Guardrails | Validare câmpuri prin utilizarea `job.data` în update-uri PG. | v2. | — |
| 10 | Escaladare HITL | Nu. | v2 No HITL. | — |
| 11 | Micro-OODA | OBSERVE: read receipt job; ACT: UPDATE log + journey score. | v2 OODA ingest — parțial. | — |
| 12 | Tier + de-escaladare | Retry BullMQ implicit. | v2 Tier 4. | — |
| 13 | Stack | BullMQ, Drizzle/Postgres. | v2 §2.3. | Integrare TimelinesAI pentru istoric: **nelegată**. |

### Mapare OTel

- **v2:** `cognitive.e2.wa.chat-history`.
- **Cod:** `cognitive.nodeKey` **`e2:wa:chat-history`** dacă rezolvarea urmează catalogul — **aliniat nominal**; **semantica** necesită fie redenumire coadă, fie handler dedicat fetch.

---
*Generator inițial:* înlocuit prin audit manual.
