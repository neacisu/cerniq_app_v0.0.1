<!-- neuron-contract:author-complete -->

# Neuron `email:warm:proforma`

> **Status:** audit manual **2026-04-11**. Coada este **refolosită** pentru procesare răspunsuri / click-uri warm după Resend, nu pentru emiterea unei proforme ca job separat.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `email:warm:proforma` |
| etapa | E2 |
| familie (v2) | `email-warm` |
| contract_path | `contracts/neurons/E2/email--warm--proforma.md` |
| ADR familie (indicativ) | [email-warm](../../adr/families/e2/email-warm.md) |

## Scop în context real

**v2 + catalog:** `MotorNeuron`, trimitere proformă via email warm (`e2:email:warm-proforma`). **Repo:** `createEmailWarmReplyWorker` în `workers/outreach/src/workers/email.ts` (L557–625) pe `QUEUES.EMAIL_WARM_PROFORMA` (`email:warm:proforma`): procesează `EmailWarmReplyJobData` — inserează `communication_log` **INBOUND** cu `status: REPLIED`, apoi enfilează `lead:state:transition` (trigger `WEBHOOK_REPLY`, stare `NEGOTIATION`), `ai:sentiment:analyze` pe conținut, și `sequence:stop` cu motiv `WARM_REPLY_RECEIVED`. `createResendEventProcessorWorker` (`webhooks.ts` L457–473) poate adăuga job-uri pe această coadă pentru `email.clicked` (conținut gol). **Divergență:** semantică „proforma” în catalog/v2 vs. **reply pipeline** în cod.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`email:warm:proforma\`` (L3345–3368).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:email:warm-proforma` / `email:warm:proforma` (L1159–1166).
- `workers/shared/src/queue-registry.ts` — `EMAIL_WARM_PROFORMA` (L130, L801).
- `workers/outreach/src/workers/email.ts` — `EmailWarmReplyJobData`, `createEmailWarmReplyWorker` (L108–118, L557–625).
- `workers/outreach/src/workers/webhooks.ts` — `warmReplyQueue.add` pentru `email.clicked` (L457–473).
- `workers/outreach/src/index.ts` — `createEmailWarmReplyWorker` (L85, L195).

## Instanțe v2

- **Catalog nodeKey:** `e2:email:warm-proforma`
- **OTel (v2):** `cognitive.e2.email.warm-proforma`

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI în acest worker (sentimentul este delegat altei cozi).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:email:warm-proforma`**, coadă **`email:warm:proforma`**, worker `createEmailWarmReplyWorker`. | v2 queue field = registry. | — |
| 2 | Etapă, familie, swimlane | **Catalog:** etapa 2, `fiscal-execution`. | v2 familie `email-warm`. | — |
| 3 | Rol declarat | Persistență răspuns/semnal inbound + lanț lead/sentiment/sequence-stop. | v2/catalog: proformă outbound — **nu** implementată aici. | Divergență în *Scop*. |
| 4 | NeuronType + SOFAI | **Catalog:** `MotorNeuron`. | v2. | — |
| 5 | Criticitate | **Catalog:** `HIGH`. | v2 HIGH. | — |
| 6 | Înveliș telemetrie | `createWorker` etapa 2 → `cognitive:e2:email:warm-proforma` (pattern). | v2 `cognitive.e2.email.warm-proforma`. | Mapare `cognitive.neuron.*`: **migrare planificată**. |
| 7 | Înveliș politică | Fără Cedar în handler; ordine priorități job-uri cozi downstream (1, 2). | v2 Tier 3 + HITL — fără implementare explicită aici. | — |
| 8 | Rutare model (dacă AI) | N/A în acest worker | Non-AI (procesare deterministă + enqueue sentiment). | N/A |
| 9 | Guardrails | `journeyId` poate fi lipsă din webhook; worker tot inserează log dacă datele permit. | ADR-0007. | Comportament la `journeyId` nedefinit — verificat doar în ramura webhook (select journey). |
| 10 | Escaladare HITL | Nu din acest procesor. | v2. | — |
| 11 | Micro-OODA | OBSERVE: job reply/click; ORIENT: interpretare inbound; DECIDE: log + enqueue; ACT: cozi dependente. | v2 OODA pentru „send” — adaptat la **inbound**. | — |
| 12 | Tier + de-escaladare | Eșec → retry BullMQ; fără prag încredere în cod. | v2. | — |
| 13 | Stack | BullMQ, Postgres, cozi `LEAD_STATE_TRANSITION`, `AI_SENTIMENT_ANALYZE`, `SEQUENCE_STOP`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.email.warm-proforma`.
- **Cod:** convenție `cognitive:<nodeKey>`; **aliniat** ca pattern (vezi alte contracte E2).

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
