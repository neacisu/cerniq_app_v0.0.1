<!-- neuron-contract:author-complete -->

# Neuron `alert:phone:offline`

> **Status:** audit manual **2026-04-11**. Persistă alertă în `webhook_event_archive` și notificări multi-canal.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `alert:phone:offline` |
| etapa | E2 |
| familie (v2) | `monitoring` |
| contract_path | `contracts/neurons/E2/alert--phone--offline.md` |
| ADR familie (indicativ) | [monitoring](../../adr/families/e2/monitoring.md) |

## Scop în context real

**v2:** alertă telefon WhatsApp deconectat. **Repo:** `createPhoneHealthMonitorWorker` (`phone-monitoring.ts`, L238–252) enfilează `QUEUES.ALERT_PHONE_OFFLINE` când status trece de la `ACTIVE` la `OFFLINE`, cu `delay` 30 min (`PHONE_OFFLINE_ALERT_AFTER_MINUTES`). Procesor `createAlertPhoneOfflineWorker` (`extra-dispatch.ts`, L79–138): log structurat, insert `webhook_event_archive` (`source: OPS_MONITORING`, `eventType: PHONE_OFFLINE`), apoi `dispatchNotification` (canale `IN_APP`, `EMAIL`, `WEBHOOK`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`alert:phone:offline\`` (L3592–3615).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:alert:phone-offline` (L1369–1377).
- `workers/shared/src/queue-registry.ts` — `ALERT_PHONE_OFFLINE`.
- `workers/outreach/src/workers/phone-monitoring.ts` — enqueue offline (L238–252).
- `workers/outreach/src/workers/extra-dispatch.ts` — `createAlertPhoneOfflineWorker`, `AlertPhoneOfflineJobData`.

## Instanțe v2

- **Catalog nodeKey:** `e2:alert:phone-offline`
- **OTel (v2):** `cognitive.e2.alert.phone-offline`

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI în v2.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:alert:phone-offline`**, coadă `alert:phone:offline`. | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `pipeline-control`. | v2. | — |
| 3 | Rol declarat | Audit DB + notificare operațională pentru linie offline. | v2. | — |
| 4 | NeuronType + SOFAI | Catalog: `AttentionNeuron`. | v2. | — |
| 5 | Criticitate | Catalog / v2: `HIGH`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker` + span cognitiv condiționat (`factory.ts`). | Span v2. | — |
| 7 | Înveliș politică | Notificare prin `dispatchNotification`; fără Cedar în handler. | v2 tier3. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | Try/catch în jurul `dispatchNotification` (L111–132). | ADR-0007 țintă. | — |
| 10 | Escaladare HITL | Nu coadă `human:*` directă. | v2. | — |
| 11 | Micro-OODA | OBSERVE payload offline; ACT persist + notify. | v2. | — |
| 12 | Tier + de-escaladare | Eșec notificare → log error, job reușit cu `{ logged: true }`. | v2. | — |
| 13 | Stack | BullMQ, Postgres `webhook_event_archive`, `@cerniq/worker-shared` dispatch. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.alert.phone-offline`.
- **Cod:** **aliniat** (instrumentare automată `createWorker` + `tenantId`).

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
