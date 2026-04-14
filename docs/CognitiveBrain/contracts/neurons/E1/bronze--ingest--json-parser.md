<!-- neuron-contract:author-complete -->

# Neuron `bronze:ingest:json-parser`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `bronze:ingest:json-parser` |
| etapa | E1 |
| familie (v2, prima instanță) | `ingest` |
| contract_path | `contracts/neurons/E1/bronze--ingest--json-parser.md` |
| ADR familie (indicativ) | [ingest](../../adr/families/e1/ingest.md) |

## Scop în context real

**v2** definește **`bronze:ingest:json-parser`** ca neuron SensoryNeuron de ingestie Bronze (JSON structurat). **În repo** nu există coadă sau `nodeKey` cu acest nume. **Cea mai apropiată** capabilitate este **`ingest:webhook`**: job-ul primește deja `payload: Record<string, unknown> | Array<...>` (JSON de-serializat înainte de enqueue), semnătură HMAC pe `JSON.stringify(payload)`, limite de mărime și vârstă timestamp (`a3-webhook-receiver.ts`). Aceasta este **ingestie eveniment**, nu un «parser JSON bronze» generic pentru fișiere sau fluxuri batch ca la CSV. **Concluzie:** **fără mapare 1:1**; suprapunere semantică **parțială** cu webhook.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`bronze:ingest:json-parser\`` (~L2743–2763).
- `packages/shared/src/cognitive-node-catalog.ts` — **fără** `bronze:ingest:json-parser`; există `e1:ingest:webhook` / `ingest:webhook` (~L369–376).
- `workers/shared/src/queue-registry.ts` — `INGEST_WEBHOOK: "ingest:webhook"` (~L23).
- `workers/enrichment/src/main.ts` — `"ingest:webhook": webhookReceiverProcessor` (~L118).
- `workers/enrichment/src/workers/a3-webhook-receiver.ts` — tip `WebhookReceiverJobData`, validări, `withCognitiveSpan("e1:ingest:webhook", …)` (~L17–28, ~L54–57).
- `rg` `bronze:ingest:json-parser` în `*.ts`: **fără**.

## Instanțe v2

- **OTel span name (v2):** `cognitive.bronze.ingest.json-parser`
- **Evidence status:** graph-export-grounded; reconciliere registry nefinalizată în v2.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** `bronze:ingest:json-parser`. **Parțial:** `e1:ingest:webhook` / `ingest:webhook` pentru payload JSON la intrare. | v2 canonic. | Webhook ≠ parser bronze generic. |
| 2 | Etapă, familie, swimlane | A3: E1; catalog webhook: `data-ingest` (aceeași zonă ingest ca CSV). | v2 ingest. | — |
| 3 | Rol declarat | Catalog webhook: «Recepție date via webhook HTTP extern». | v2: parser JSON bronze. | Domeniu diferit (HTTP vs fișier/batch). |
| 4 | NeuronType + SOFAI | Catalog: `SensoryNeuron` pentru webhook; v2: `SensoryNeuron`. | v2. | — |
| 5 | Criticitate | Catalog webhook: `MEDIUM`. v2: `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e1:ingest:webhook", …)` → `cognitive:e1:ingest:webhook`. **Fără** span `cognitive.bronze.ingest.json-parser`. | ADR-0003. | Nealinat literal v2. |
| 7 | Înveliș politică | Semnătură, timestamp, max payload (~L30–51 în A3). | v2 Tier 4; audit. | Parser v2 dedicat: lipsă. |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Validări deterministe în A3; NeMo **destinație** ADR-0007. | v2. | — |
| 10 | Escaladare HITL | Webhook: fără legătură directă citită cu `hitl:*` în A3. | ADR-0008. | — |
| 11 | Micro-OODA | OBSERVE: payload + headers; ORIENT: validări; DECIDE: accept; ACT: inserții bronze (flux A3). | v2 OODA ingest. | Mapare parțială. |
| 12 | Tier + de-escaladare | Fără prag «încredere» în A3 la audit. | v2 §2.2. | — |
| 13 | Stack | BullMQ, Redis, Postgres (`bronzeWebhooks` etc. în A3), HMAC. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.bronze.ingest.json-parser`.
- **Cod:** **lipsă** pentru `v2_queue`; cel mai apropiat: **`cognitive:e1:ingest:webhook`**.
- **Stare:** **gap** canonic; **suprapunere parțială** JSON documentată.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
