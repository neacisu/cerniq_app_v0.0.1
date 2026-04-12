<!-- neuron-contract:author-complete -->

# Neuron `webhook:instantly:ingest`

> **Status:** audit manual **2026-04-11**. Rezolvă lead după email, enfilează `email:cold:lead:status` pentru tracking.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `webhook:instantly:ingest` |
| etapa | E2 |
| familie (v2) | `webhooks` |
| contract_path | `contracts/neurons/E2/webhook--instantly--ingest.md` |
| ADR familie (indicativ) | [webhooks](../../adr/families/e2/webhooks.md) |

## Scop în context real

**v2:** ingest Instantly. **Repo:** `createInstantlyEventProcessorWorker` (`webhooks.ts`, L320–419): join `lead_journey` + `goldContacts` pe email; pentru `reply_received` / `lead_unsubscribed` cere journey rezolvat — altfel warn + return; `trackingQueue.add` (`EMAIL_COLD_LEAD_STATUS`) cu `event_type`; metrici pe reply. **Teste:** `outreach-metrics.test.ts`.

## Surse audit

- v2 — L4058–4081.
- `packages/shared/src/cognitive-node-catalog.ts` — L1217–1225.
- `workers/outreach/src/workers/webhooks.ts`.
- `workers/outreach/src/workers/outreach-metrics.test.ts`.

## Instanțe v2

- **Catalog nodeKey:** `e2:webhook:instantly`
- **OTel (v2):** `cognitive.e2.webhook.instantly`

## N/A pe criterii

- **Rând 8:** **N/A**.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e2:webhook:instantly`. | v2. | — |
| 2 | Etapă, familie, swimlane | `data-ingest`. | v2. | — |
| 3 | Rol declarat | Normalizare eveniment cold email → coadă tracking. | v2. | — |
| 4 | NeuronType + SOFAI | `SensoryNeuron`. | v2. | — |
| 5 | Criticitate | `HIGH`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker`. | v2. | — |
| 7 | Înveliș politică | Skip controlat dacă nu se rezolvă journey. | v2. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | Validare email gol → warn. | v2. | — |
| 10 | Escaladare HITL | Nu. | v2. | — |
| 11 | Micro-OODA | OBSERVE: rawEvent; ORIENT: tip; ACT: enqueue tracking. | v2. | — |
| 12 | Tier + de-escaladare | return early pe unresolved. | v2. | — |
| 13 | Stack | BullMQ, Postgres, coadă `email:cold:lead:status`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.webhook.instantly`.
- **Cod:** fabrică OTel — aliniat condiționat de rezolvare `nodeKey`.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
