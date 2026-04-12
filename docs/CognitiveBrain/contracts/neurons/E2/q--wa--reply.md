<!-- neuron-contract:author-complete -->

# Neuron `q:wa:reply`

> **Status:** audit manual **2026-04-11**. **Divergență majoră:** v2 + catalog descriu trimitere răspuns WA; în runtime **`q:wa:reply`** este coadă **legacy** pentru **același procesator ca `wa:delivery:status`** (actualizare status în `communication_log`), nu pentru outbound reply.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `q:wa:reply` |
| etapa | E2 |
| familie (v2) | `whatsapp` |
| contract_path | `contracts/neurons/E2/q--wa--reply.md` |
| ADR familie (indicativ) | [whatsapp](../../adr/families/e2/whatsapp.md) |

## Scop în context real

**Catalog:** `nodeKey` **`e2:wa:reply`**, queue **`q:wa:reply`** (`cognitive-node-catalog.ts`, L1057–1058). **Registry:** `LEGACY_WA_REPLY_QUEUE = "q:wa:reply"` — alias depreciat; job-uri noi → `WA_DELIVERY_STATUS` (`queue-registry.ts`, L14–18, L110–113). **Worker:** `createWaLegacyReplyDeliveryStatusWorker` apelează `createWorker(WA_REPLY_LEGACY_QUEUE_NAME, processWaDeliveryStatusJob, …)` (`whatsapp.ts` L27–28, L363–368), adică **procesare evenimente de livrare** (inclusiv enqueue către `wa:message:retry` pe FAILED — L346–352), nu trimitere mesaj către lead. **Trimitere răspuns AI:** enfileiere pe **`getWaPhoneFollowupQueueName(phoneIdx)`** din `createResponseGeneratorWorker` (`ai-sentiment.ts` L508–527), coadă de forma `q:wa:phone-NN:followup`, nu `q:wa:reply`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`q:wa:reply\`` (L4243–4266).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:wa:reply`, `q:wa:reply`.
- `workers/shared/src/queue-registry.ts` — `LEGACY_WA_REPLY_QUEUE`, `WA_REPLY`.
- `workers/outreach/src/workers/whatsapp.ts` — `createWaLegacyReplyDeliveryStatusWorker`, `processWaDeliveryStatusJob`.
- `workers/outreach/src/index.ts` — L154–155 (înregistrare drain legacy).
- `workers/outreach/src/workers/ai-sentiment.ts` — răspuns → `followupQueueName` (L511–512).

## Instanțe v2

- **Catalog vs comportament:** funcție cognitivă catalog „Trimitere răspuns” **≠** handler actual (delivery status).

## N/A pe criterii

- **Rând 8:** **N/A** — `processWaDeliveryStatusJob` fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:wa:reply`** + **`q:wa:reply`** în catalog L1057–1058. | v2 catalog-grounded. | Sens operațional legacy ≠ descriere semantică. |
| 2 | Etapă, familie, swimlane | E2; v2 swimlane `fiscal-execution` — worker partajează cod cu delivery. | v2. | — |
| 3 | Rol declarat | **În cod:** drain Redis pentru job-uri vechi pe `q:wa:reply` = update status + optional retry queue. **Nu** send reply. | v2 „Trimitere răspuns WhatsApp”. | **Limită:** migrare semantică / redenumire coadă recomandată. |
| 4 | NeuronType + SOFAI | Procesator comun cu evenimente livrare (Motor/Sensory hibrid în practică). | v2 MotorNeuron. | Clasificare SOFAI pentru legacy drain. |
| 5 | Criticitate | — | v2 HIGH. | — |
| 6 | Înveliș telemetrie | `createWorker` pe `q:wa:reply`. | v2 `cognitive.e2.wa.reply`. | — |
| 7 | Înveliș politică | Validare status, path FAILED → `WA_MESSAGE_RETRY`. | v2 HITL on anomaly — **nu** implementat aici. | — |
| 8 | Rutare model (dacă AI) | N/A | v2 Non-AI. | N/A |
| 9 | Guardrails | Validare enum status (`whatsapp.ts` L312–315). | v2. | — |
| 10 | Escaladare HITL | Nu în acest worker. | v2. | — |
| 11 | Micro-OODA | OBSERVE: job status; ORIENT: validare; ACT: UPDATE PG + optional enqueue retry. | v2 OODA trimitere — **nu se potrivește**; folosiți OODA ingest eveniment. | — |
| 12 | Tier + de-escaladare | BullMQ retry la nivel coadă (config fabrică). | v2 Tier 3. | — |
| 13 | Stack | BullMQ, Postgres `communication_log`, `createQueue(WA_MESSAGE_RETRY)`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.wa.reply`.
- **Cod:** `withCognitiveSpan` + **`cognitive.nodeKey`** pentru `e2:wa:reply` dacă rezolvarea mapează coada — **aliniat nominal**; **semantica operațională** necesită reconciliere cu catalog.

---
*Generator inițial:* înlocuit prin audit manual.
