<!-- neuron-contract:author-complete -->

# Neuron `webhook:timelinesai:ingest`

> **Status:** audit manual **2026-04-11**. Ingest WA: skip `from_me`, status → delivery, reply → log + notificare + `lead:state:transition` + `ai:sentiment:analyze`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `webhook:timelinesai:ingest` |
| etapa | E2 |
| familie (v2) | `webhooks` |
| contract_path | `contracts/neurons/E2/webhook--timelinesai--ingest.md` |
| ADR familie (indicativ) | [webhooks](../../adr/families/e2/webhooks.md) |

## Scop în context real

**v2:** ingest TimelinesAI. **Repo:** `createTimelinesAIEventProcessorWorker` (`workers/outreach/src/workers/webhooks.ts`, L180–312): filtru `from_me`; ramură status → `WA_DELIVERY_STATUS`; inbound: lookup `communication_log` by `threadId`, INSERT inbound log + `outreach_notifications`, enqueue `LEAD_STATE_TRANSITION` (`WARM_REPLY`), `AI_SENTIMENT_ANALYZE`; metrică `outreachRepliesReceivedTotal`. **Teste:** `outreach-metrics.test.ts` înregistrează procesorul.

## Surse audit

- v2 — L4108–4131.
- `packages/shared/src/cognitive-node-catalog.ts` — L1207–1215.
- `workers/outreach/src/workers/webhooks.ts`.
- `workers/outreach/src/workers/outreach-metrics.test.ts`.

## Instanțe v2

- **Catalog nodeKey:** `e2:webhook:timelinesai`
- **OTel (v2):** `cognitive.e2.webhook.timelinesai`

## N/A pe criterii

- **Rând 8:** **N/A**.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e2:webhook:timelinesai`; coadă `webhook:timelinesai:ingest`. | v2. | — |
| 2 | Etapă, familie, swimlane | `data-ingest`, etapa 2. | v2. | — |
| 3 | Rol declarat | Ingest evenimente WA și propagare downstream. | v2. | — |
| 4 | NeuronType + SOFAI | `SensoryNeuron`. | v2. | — |
| 5 | Criticitate | `HIGH`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker` fără span manual. | v2. | — |
| 7 | Înveliș politică | Skip fără thread găsit (warn). | v2 tier 3. | — |
| 8 | Rutare model (dacă AI) | N/A în ingest; sentiment în altă coadă. | v2. | — |
| 9 | Guardrails | `from_me` exclus explicit. | v2. | — |
| 10 | Escaladare HITL | Nu direct. | v2. | — |
| 11 | Micro-OODA | OBSERVE: payload; ORIENT: tip eveniment; DECIDE: rută; ACT: cozi + DB. | v2. | — |
| 12 | Tier + de-escaladare | early return fără throw când lipsește thread. | v2. | — |
| 13 | Stack | BullMQ, Postgres, cozi `lead:state:transition`, `ai:sentiment:analyze`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.webhook.timelinesai`.
- **Cod:** instrumentare fabrică — **aliniat** dacă `resolveNodeKeyFromQueueName` mapează coada la `e2:webhook:timelinesai`.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
