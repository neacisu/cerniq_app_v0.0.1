<!-- neuron-contract:author-complete -->

# Neuron `wa:media:send`

> **Status:** audit manual **2026-04-11**. Worker activ: **`createWaMediaSendWorker`** în `extra-dispatch.ts` — trimite prin **`getTimelinesAIClient().sendMessage`** cu suport opțional `mediaUrl` / `mediaType` / `caption`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `wa:media:send` |
| etapa | E2 |
| familie (v2) | `whatsapp` |
| contract_path | `contracts/neurons/E2/wa--media--send.md` |
| ADR familie (indicativ) | [whatsapp](../../adr/families/e2/whatsapp.md) |

## Scop în context real

**Catalog:** `e2:wa:media-send`, `wa:media:send` (`cognitive-node-catalog.ts`, L1093–1094). **Registry:** `QUEUES.WA_MEDIA_SEND` (`queue-registry.ts`, L119, L790). **Worker:** `createWorker(QUEUES.WA_MEDIA_SEND, async (job) => { const client = getTimelinesAIClient(); return client.sendMessage(job.data); }, { concurrency: 5 })` (`extra-dispatch.ts`, L22–41). Payload job: `phone`, `recipient`, `message`, opțional `mediaUrl`, `mediaType`, `caption`, `correlationId`. **Bootstrap:** `push(createWaMediaSendWorker())` (`workers/outreach/src/index.ts`, L215).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`wa:media:send\`` (L4293–4316).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:wa:media-send`.
- `workers/shared/src/queue-registry.ts` — `WA_MEDIA_SEND`.
- `workers/outreach/src/workers/extra-dispatch.ts` — `createWaMediaSendWorker`.
- `workers/outreach/src/index.ts` — înregistrare worker.

## Instanțe v2

- —

## N/A pe criterii

- **Rând 8:** **N/A** — fără LLM în handler (apel direct client).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:wa:media-send`** în catalog; coadă `wa:media:send`. | v2. | — |
| 2 | Etapă, familie, swimlane | Logger `outreach-extra-dispatch`, `etapa: e2` (`extra-dispatch.ts` L20). | v2 `fiscal-execution`. | — |
| 3 | Rol declarat | Trimitere mesaj/media prin TimelinesAI. | v2 operational purpose. | — |
| 4 | NeuronType + SOFAI | MotorNeuron (acțiune externă). | v2 MotorNeuron. | — |
| 5 | Criticitate | — | v2 MEDIUM. | — |
| 6 | Înveliș telemetrie | `createWorker` standard fabrică. | v2 `cognitive.e2.wa.media-send`. | — |
| 7 | Înveliș politică | Concurrency 5. | v2 Tier 4; HITL repeated failure — **nu** verificat explicit în handler. | — |
| 8 | Rutare model (dacă AI) | N/A | v2 Non-AI. | N/A |
| 9 | Guardrails | Doar validare implicită în client integrare. | v2 ADR-0007 — parțial. | Fără quota Guardian ca în `createWaWorker`. |
| 10 | Escaladare HITL | Nu în worker. | v2. | — |
| 11 | Micro-OODA | OBSERVE: job; ACT: API send. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Erori propagate din `sendMessage`. | v2. | — |
| 13 | Stack | BullMQ, `@cerniq/integrations` TimelinesAI. | v2 §2.3. | **Limită:** nu s-au găsit teste Vitest dedicate `createWaMediaSendWorker` la acest audit. |

### Mapare OTel

- **v2:** `cognitive.e2.wa.media-send`.
- **Cod:** `withCognitiveSpan` / **`cognitive.nodeKey`** `e2:wa:media-send` — **aliniat** cu catalog dacă rezolvarea cozii mapează 1:1.

---
*Generator inițial:* înlocuit prin audit manual.
