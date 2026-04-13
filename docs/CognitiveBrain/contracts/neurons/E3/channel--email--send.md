<!-- neuron-contract:author-complete -->

# Neuron `channel:email:send`

> **Status:** audit manual **2026-04-11**. **J60** — trimitere email de **handover** (Handlebars + **Resend**), nu un pipeline generic „ofertă/follow-up” decât prin extensie semantică a aceluiași canal.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `channel:email:send` |
| etapa | E3 |
| familie (v2) | `channels` |
| contract_path | `contracts/neurons/E3/channel--email--send.md` |
| ADR familie (indicativ) | [channels](../../adr/families/e3/channels.md) |

## Scop în context real

**v2** (L4722–4745) plasează neuronul în **channels**, **MotorNeuron**, scop catalog: trimitere email comercial (ofertă, follow-up, confirmare negociere), **Non-AI**. **Repo:** `workers/e3-ai-sales/src/workers/j60-channel-email-send.ts` implementează **notificare email de preluare conversație (handover)**: template-uri HTML RO/EN în sursă, compilare **Handlebars**, validare destinatar (`EMAIL_REGEX` L28, L142–147), apel **Resend** prin `callExternalApi("resend", …)` (L176–189), tag-uri `handover_notification` + `tenant_id` / `negotiation_id` / `stage` (L182–187). **Producător** principal: **J58** când decizia de canal este `EMAIL` — `emailSendQueue.add` cu `tenantId`, `negotiationId`, `recipientEmail`, `context`, `stage` (`j58-channel-route-decide.ts` L228–239). **Înregistrare worker:** `main.ts` L246. **Registry:** `QUEUES.E3_CHANNEL_EMAIL_SEND` (`queue-registry.ts` L314, L1014). **Teste:** `j-workers.test.ts` — secțiune J60 (L763+). Nu s-a găsit în audit `apps/api` enqueuing direct către această coadă.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`channel:email:send\`` (L4722–4745).
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:channel:email-send` (L2047–2055).
- `workers/shared/src/queue-registry.ts` — `E3_CHANNEL_EMAIL_SEND` (L314, L1014).
- `workers/e3-ai-sales/src/main.ts` — L246.
- `workers/e3-ai-sales/src/workers/j60-channel-email-send.ts` — procesor.
- `workers/e3-ai-sales/src/workers/j58-channel-route-decide.ts` — L228–239 (enqueue EMAIL).
- `workers/e3-ai-sales/src/__tests__/j-workers.test.ts` — J60 (L763+).
- `workers/shared/src/factory.ts` — instrumentare cognitivă worker.

## Instanțe v2

- — (o singură instanță în v2 pentru această coadă.)

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 **Non-AI** (L4741); J60 fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:channel:email-send`**, coadă **`channel:email:send`** (`cognitive-node-catalog.ts` L2048–2049). `QUEUES.E3_CHANNEL_EMAIL_SEND` (`queue-registry.ts` L314). | v2: același `Confirmed queue field` (L4739). | — |
| 2 | Etapă, familie, swimlane | E3; swimlane catalog **`ai-reasoning`** (`cognitive-node-catalog.ts` L2052). | v2: E3, channels, swimlane `ai-reasoning` (L4732). | — |
| 3 | Rol declarat | Handover email + template-uri RO/EN + Resend (`j60` L1–16, L159–201). | v2: formulare mai largă (ofertă/follow-up) (L4736–4737). | **Decalaj semantic:** implementarea actuală = handover, nu orice email comercial. |
| 4 | NeuronType + SOFAI | **`MotorNeuron`** (`cognitive-node-catalog.ts` L2051). | v2: MotorNeuron (L4730). | Clasificare SOFAI: reper v2 §2.1. |
| 5 | Criticitate | **`MEDIUM`** (`cognitive-node-catalog.ts` L2054). | v2: MEDIUM (L4733). | — |
| 6 | Înveliș telemetrie | `createWorker` + `withCognitiveSpan` (când tenant valid) — `factory.ts`. | v2: span `cognitive.e3.channel.email-send` (L4744). | **Parțial aliniat:** cod folosește `cognitive.nodeKey` etc.; v2 nume punctat — ADR-0003. |
| 7 | Înveliș politică | Fără Cedar/OPA; lipsă `RESEND_API_KEY` → throw (`j60` L153–155); email invalid → `sent: false` fără throw (L142–147). | v2: Tier 4, HITL la eșecuri repetate (L4734, L4742). | Fără contor „3+ erori” în J60; retry BullMQ la throw. |
| 8 | Rutare model (dacă AI) | **N/A** — vezi N/A. | v2: Non-AI. | — |
| 9 | Guardrails | Validare regex email; `callExternalApi` pentru rate limit/circuit breaker (comentariu L175). | NeMo / ADR-0007 — țintă. | — |
| 10 | Escaladare HITL | Nu în J60; lantul handover vine din J57→J58; HITL la „fără contact” e în J58 (`j58` L262–274). | v2: politică HITL la eșecuri repetate (L4742). | Escaladare pre-trimitere email, nu în workerul de send. |
| 11 | Micro-OODA | OBSERVE — payload job; ORIENT — validare + env Resend; DECIDE — trimite / skip invalid; ACT — Resend + log (`j60` L131–201). | v2 OODA generic send/defer/retry (L4740). | Aliniat operațional; fără „quota” explicită în J60 (spre deosebire de comentarii J59 pentru WA). |
| 12 | Tier + de-escaladare | Fără scor încredere sau tier în cod. | v2 Tier 4 (L4734). | — |
| 13 | Stack (subset) | BullMQ, **Resend** SDK, Handlebars, `@cerniq/worker-shared` (`callExternalApi`). | v2 §2.3 + integrări. | — |

### Mapare OTel

- **v2:** `cognitive.e3.channel.email-send`.
- **Cod:** `cognitive.nodeKey` **`e3:channel:email-send`**, atribute `withCognitiveSpan` — **parțial aliniat** față de convenția `cognitive.neuron.*` din v2 (ADR-0003).

---
*Generator inițial:* înlocuit prin audit manual.
