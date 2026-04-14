<!-- neuron-contract:author-complete -->

# Neuron `monitor:email:deliverability`

> **Status:** audit manual **2026-04-11**. Worker calcul bounce rate cold email și lanț către pauză campanie + alertă.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `monitor:email:deliverability` |
| etapa | E2 |
| familie (v2) | `monitoring` |
| contract_path | `contracts/neurons/E2/monitor--email--deliverability.md` |
| ADR familie (indicativ) | [monitoring](../../adr/families/e2/monitoring.md) |

## Scop în context real

**v2:** monitorizare deliverability email. **Repo:** `createBounceRateMonitorWorker` (`workers/outreach/src/workers/email.ts`, L398–468) pe `QUEUES.MONITOR_EMAIL_DELIVERABILITY`: agregă din `communication_log` mesaje `EMAIL_COLD` outbound în fereastra 24h (`BOUNCE_WINDOW_HOURS`), calculează `bounceRate`; dacă `bounceRate > 0.03` (ADR-0066) enfilează `email:cold:campaign:pause` și `alert:bounce:high`. **Trigger:** `createEmailColdTrackingWorker` (`email.ts`, L343–367) adaugă job `check` pe această coadă la eveniment `email_bounced` din tracking Instantly.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`monitor:email:deliverability\`` (L3617–3640).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:monitor:email-deliverability` (L1351–1358).
- `workers/shared/src/queue-registry.ts` — `MONITOR_EMAIL_DELIVERABILITY`.
- `workers/outreach/src/workers/email.ts` — `createBounceRateMonitorWorker`, `createEmailColdTrackingWorker`.
- `workers/outreach/src/index.ts` — `createBounceRateMonitorWorker`.

## Instanțe v2

- **Catalog nodeKey:** `e2:monitor:email-deliverability`
- **OTel (v2):** `cognitive.e2.monitor.email-deliverability`

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI în v2.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:monitor:email-deliverability`**, coadă `monitor:email:deliverability`. | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `pipeline-control`. | v2. | — |
| 3 | Rol declarat | Măsurare bounce cold vs outbound și acțiune la depășire prag. | v2 deliverability. | Nu există logică separată „per domeniu” în SQL citit — agregat tenant + canal. |
| 4 | NeuronType + SOFAI | Catalog: `AttentionNeuron`. | v2. | — |
| 5 | Criticitate | Catalog / v2: `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker` + span condiționat (`factory.ts`). | Span v2. | — |
| 7 | Înveliș politică | Pauză campanie Instantly + alertă (vezi contract `alert:bounce:high` pentru forma job-ului alertă). | v2 tier4. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | Prag `BOUNCE_THRESHOLD` fix 3% în cod. | ADR-0066, ADR-0007 — destinație. | — |
| 10 | Escaladare HITL | Nu coadă `human:*` din acest worker. | v2. | — |
| 11 | Micro-OODA | OBSERVE `communication_log`; DECIDE peste prag; ACT enfilează pause + alert. | v2. | — |
| 12 | Tier + de-escaladare | Early return dacă nu există outbound în fereastră. | v2. | — |
| 13 | Stack | BullMQ, Postgres, coadă `EMAIL_COLD_CAMPAIGN_PAUSE`, `ALERT_BOUNCE_HIGH`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.monitor.email-deliverability`.
- **Cod:** **aliniat** când `tenantId` în `job.data`.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
