<!-- neuron-contract:author-complete -->

# Neuron `monitor:quota:usage`

> **Status:** audit manual **2026-04-11**. Procesor **merge**: statistici zilnice outreach sau reputație telefon după forma payload-ului.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `monitor:quota:usage` |
| etapa | E2 |
| familie (v2) | `monitoring` |
| contract_path | `contracts/neurons/E2/monitor--quota--usage.md` |
| ADR familie (indicativ) | [monitoring](../../adr/families/e2/monitoring.md) |

## Scop în context real

**v2:** monitorizare utilizare cote zilnice. **Repo:** `createMergedMonitorQuotaWorker` (`workers/outreach/src/workers/monitoring.ts`, L198–217) pe `QUEUES.MONITOR_QUOTA_USAGE`: dacă `job.data` conține `phoneId`, delegă la `executePhoneReputationJob` (`phone-monitoring.ts`, L421+ — scor reputație, posibil quarantine); altfel rulează `executeStatsAggregatorJob` (agregare `communication_log` → `outreach_daily_stats`). **Limită evidență:** la audit **2026-04-11** nu s-a găsit în repo (TS) niciun `Queue.add` / `createQueue(...).add` către `monitor:quota:usage` — worker înregistrat în `workers/outreach/src/index.ts` (L180), dar sursa job-urilor (cron, API, alt serviciu) nu e dovedită în codul căutat.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`monitor:quota:usage\`` (L3667–3690).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:monitor:quota-usage` (L1360–1367).
- `workers/shared/src/queue-registry.ts` — `MONITOR_QUOTA_USAGE`.
- `workers/outreach/src/workers/monitoring.ts` — `createMergedMonitorQuotaWorker`, `executeStatsAggregatorJob`.
- `workers/outreach/src/workers/phone-monitoring.ts` — `executePhoneReputationJob`.
- `workers/outreach/src/workers/phone-monitoring-reputation.test.ts` — teste directe `executePhoneReputationJob` (fără coadă).
- `workers/outreach/src/index.ts` — worker.

## Instanțe v2

- **Catalog nodeKey:** `e2:monitor:quota-usage`
- **OTel (v2):** `cognitive.e2.monitor.quota-usage`

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI în v2.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:monitor:quota-usage`**, coadă `monitor:quota:usage`. | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `pipeline-control`. | v2. | — |
| 3 | Rol declarat | Agregare zilnică + ramură reputație WA pe același nume de coadă. | v2: cote zilnice. | Semantica „quota” pentru ramura reputație = mapare parțială (v2 §2.4). |
| 4 | NeuronType + SOFAI | Catalog: `AttentionNeuron`. | v2. | — |
| 5 | Criticitate | Catalog / v2: `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker` + span condiționat. | Span v2. | — |
| 7 | Înveliș politică | Insert/upsert `outreach_daily_stats`; quarantine separat pe scor. | v2 tier4. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | Prag reputație `REPUTATION_QUARANTINE_THRESHOLD` în `phone-monitoring.ts`. | ADR-0007 — destinație. | — |
| 10 | Escaladare HITL | Quarantine enfilează altă coadă, nu HITL direct. | v2. | — |
| 11 | Micro-OODA | OBSERVE DB; ACT upsert sau scor + quarantine. | v2. | — |
| 12 | Tier + de-escaladare | Ramuri separate fără throw în calea fericită. | v2. | — |
| 13 | Stack | BullMQ, Postgres (`outreach_daily_stats`, `communication_log`, `wa_phone_numbers`). | v2 §2.3. | **Producer BullMQ neidentificat în repo (TS).** |

### Mapare OTel

- **v2:** `cognitive.e2.monitor.quota-usage`.
- **Cod:** **aliniat** când `tenantId` prezent și instrumentare activă.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
