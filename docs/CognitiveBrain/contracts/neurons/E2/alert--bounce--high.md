<!-- neuron-contract:author-complete -->

# Neuron `alert:bounce:high`

> **Status:** audit manual **2026-04-11**. Consumator unificat pentru alerte prag (inclusiv bounce); emitere din monitorul de deliverability cold email.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `alert:bounce:high` |
| etapa | E2 |
| familie (v2) | `monitoring` |
| contract_path | `contracts/neurons/E2/alert--bounce--high.md` |
| ADR familie (indicativ) | [monitoring](../../adr/families/e2/monitoring.md) |

## Scop în context real

**v2:** alertă când bounce rate email depășește pragul. **Repo:** `createBounceRateMonitorWorker` (`workers/outreach/src/workers/email.ts`, L398–468) calculează rata în fereastra 24h pe `communication_log` (canal `EMAIL_COLD`); dacă `bounceRate > 0.03` (ADR-0066), enfilează `email:cold:campaign:pause` și apoi `QUEUES.ALERT_BOUNCE_HIGH` cu `tenantId`, `campaignId`, `bounceRate`, `threshold`. Procesorul `createAlertWorker` (`workers/outreach/src/workers/monitoring.ts`, L293–334) ascultă aceeași coadă: scrie în Redis (`alert:${tenantId}:${alertType}:…`, TTL 24h) și inserează în `webhook_event_archive` doar dacă `alertType` este `BOUNCE_HIGH` sau `PHONE_BANNED`. **Divergență:** payload-ul emis din `email.ts` (L453–462) **nu** include `alertType` nici `payload` în forma `AlertJobData` (L42–47 din `monitoring.ts`) — `alertType` devine `undefined`, deci ramura `webhook_event_archive` pentru bounce **nu** se execută pentru această cale principală; persistă doar înregistrarea Redis cu `alertType: null` în JSON.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`alert:bounce:high\`` (L3542–3565).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:alert:bounce-high` (L1387–1395).
- `workers/shared/src/queue-registry.ts` — `ALERT_BOUNCE_HIGH` (L168, L837).
- `workers/outreach/src/workers/email.ts` — `createBounceRateMonitorWorker`, prag `BOUNCE_THRESHOLD`, `bounceAlertQueue.add`.
- `workers/outreach/src/workers/monitoring.ts` — `AlertJobData`, `createAlertWorker`.
- `workers/outreach/src/index.ts` — înregistrare worker (L181, L193).
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation` / `withCognitiveSpan` după rezolvare `nodeKey`.

## Instanțe v2

- **Catalog nodeKey:** `e2:alert:bounce-high`
- **OTel (v2):** `cognitive.e2.alert.bounce-high`

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI în v2; fără rutare LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:alert:bounce-high`**, coadă `alert:bounce:high` (`queue-registry`). | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `pipeline-control`. | v2 monitoring. | — |
| 3 | Rol declarat | Persistență alertă prag bounce + (intenție) audit DB pentru `BOUNCE_HIGH`. | v2. | Comportament DB blocat de forma payload — vezi Scop. |
| 4 | NeuronType + SOFAI | Catalog: `AttentionNeuron`. | v2. | — |
| 5 | Criticitate | Catalog / v2: `HIGH`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker` + `resolveNodeKeyFromQueueNameAndEtapa` → `withCognitiveSpan` când există `tenantId` în job (`factory.ts` L90–107). | Span v2: `cognitive.e2.alert.bounce-high`. | Dacă `tenantId` lipsește, instrumentarea cognitivă sare peste span (L103–105). |
| 7 | Înveliș politică | Fără Cedar/OPA în handler; Redis + insert condiționat. | v2 tier3 + HITL policy = țintă. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | Nu NeMo în acest worker; pragul bounce este în `email.ts` (monitor). | ADR-0007 țintă. | — |
| 10 | Escaladare HITL | Nu enfilează direct `human:*` / `hitl:*`. | v2. | — |
| 11 | Micro-OODA | OBSERVE date din job + Redis; ACT scriere Redis / DB condiționat. | v2 OODA generic. | — |
| 12 | Tier + de-escaladare | Procesare fără throw în calea fericită. | v2. | — |
| 13 | Stack | BullMQ, Redis, Postgres (`webhook_event_archive`), worker outreach. | v2 §2.3 subset. | — |

### Mapare OTel

- **v2:** `cognitive.e2.alert.bounce-high`.
- **Cod:** span din `createWorker` cu `nodeKey` rezolvat din catalog — **aliniat** când `tenantId` este prezent în `job.data`.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
