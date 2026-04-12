<!-- neuron-contract:author-complete -->

# Neuron `wa:message:retry`

> **Status:** audit manual **2026-04-11**. **Consumator principal:** `createRetryOrchestratorWorker` (`resilience.ts`) așteaptă **`RetryJobData`** (`originalQueue`, `originalJobData`, `errorType`, `attemptsMade`, …). **Producător separat:** `processWaDeliveryStatusJob` enfileiază pe FAILED un job cu **`tenantId`**, **`externalMessageId`**, **`failureReason`** (`whatsapp.ts` L346–352) — **schema incompatibilă** cu `RetryJobData`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `wa:message:retry` |
| etapa | E2 |
| familie (v2) | `whatsapp` |
| contract_path | `contracts/neurons/E2/wa--message--retry.md` |
| ADR familie (indicativ) | [whatsapp](../../adr/families/e2/whatsapp.md) |

## Scop în context real

**Catalog:** `e2:wa:message-retry` (`cognitive-node-catalog.ts`, L1066–1067). **Registry:** `WA_MESSAGE_RETRY: "wa:message:retry"` (`queue-registry.ts`, L114). **Orchestrator retry:** clasifică erori, DLQ pentru erori client (4xx) sau epuizare încercări, altfel re-enqueue pe `originalQueue` cu backoff (`resilience.ts`, L169–249). **Enqueue din livrare:** pe status FAILED, `createQueue(QUEUES.WA_MESSAGE_RETRY).add("evaluate", { tenantId, externalMessageId, failureReason })` (`whatsapp.ts` L347–352). Al doilea payload **nu** conține `originalQueue` / `originalJobData` — risc de comportament incorect dacă ambele tipuri de job împart aceeași coadă.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`wa:message:retry\`` (L4318–4341).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:wa:message-retry`.
- `workers/shared/src/queue-registry.ts` — `WA_MESSAGE_RETRY`.
- `workers/outreach/src/workers/resilience.ts` — `createRetryOrchestratorWorker`, `RetryJobData` L122–128.
- `workers/outreach/src/workers/whatsapp.ts` — enqueue pe FAILED L346–352.
- `workers/outreach/src/index.ts` — `createRetryOrchestratorWorker` L173.
- `workers/outreach/src/workers/whatsapp-delivery-status.test.ts` — verifică apel retry pe FAILED L52–64.

## Instanțe v2

- —

## N/A pe criterii

- **Rând 8:** **N/A** — orchestrator determinist, fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:wa:message-retry`** în catalog. | v2. | — |
| 2 | Etapă, familie, swimlane | `outreach-resilience`, etapa e2 (`resilience.ts` L23). | v2 `pipeline-control`. | — |
| 3 | Rol declarat | Reîncercare orchestrată / rutare DLQ; plus intent separat din webhook FAILED. | v2 „Reîncercare mesaj eșuat”. | **Divergență payload** între producători. |
| 4 | NeuronType + SOFAI | ReflexNeuron (rutare automată retry sau DLQ). | v2 ReflexNeuron. | — |
| 5 | Criticitate | — | v2 MEDIUM. | — |
| 6 | Înveliș telemetrie | `createWorker(QUEUES.WA_MESSAGE_RETRY, …)`. | v2 `cognitive.e2.wa.message-retry`. | — |
| 7 | Înveliș politică | `RETRY_POLICIES`, `DLQ_CONFIG` (`resilience.ts` L57–68). | v2 HITL după erori repetate — nu mapat 1:1 în handler. | — |
| 8 | Rutare model (dacă AI) | N/A | v2 Non-AI. | N/A |
| 9 | Guardrails | Eroare client → DLQ imediat; număr maxim de încercări per policy. | ADR-style policies în cod. | — |
| 10 | Escaladare HITL | DLQ + categorii `reviewRequired` în config (L68); consumator DLQ în altă parte. | v2. | — |
| 11 | Micro-OODA | OBSERVE: job retry; ORIENT: policy; DECIDE: DLQ vs amânare re-enqueue; ACT: `targetQueue.add`. | v2 OODA. | — |
| 12 | Tier + de-escaladare | `attemptsMade` comparat cu `attempts` din policy. | v2 Tier 4. | — |
| 13 | Stack | BullMQ, DLQ `dlq:outreach`. | v2 §2.3. | Testele citite verifică enqueue din delivery, nu procesarea completă a ambelor forme de payload. |

### Mapare OTel

- **v2:** `cognitive.e2.wa.message-retry`.
- **Cod:** span fabrică + **`cognitive.nodeKey`** `e2:wa:message-retry` — **aliniat**; unificare **payload** recomandată.

---
*Generator inițial:* înlocuit prin audit manual.
