<!-- neuron-contract:author-complete -->

# Neuron `monitor:phone:health`

> **Status:** audit manual **2026-04-11**. Health check TimelinesAI per tenant; poate enfilează alertă offline sau ban + quarantine.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `monitor:phone:health` |
| etapa | E2 |
| familie (v2) | `monitoring` |
| contract_path | `contracts/neurons/E2/monitor--phone--health.md` |
| ADR familie (indicativ) | [monitoring](../../adr/families/e2/monitoring.md) |

## Scop în context real

**v2:** monitorizare sănătate linii WhatsApp. **Repo:** `createPhoneHealthMonitorWorker` (`workers/outreach/src/workers/phone-monitoring.ts`, L166–274) pe `QUEUES.MONITOR_PHONE_HEALTH`: pentru fiecare rând `wa_phone_numbers` activ (`isEnabled`), citește status din TimelinesAI, actualizează DB; la `BANNED` enfilează `alert:phone:banned` + `phone:quarantine:trigger`; la trecere `ACTIVE`→`OFFLINE` enfilează `alert:phone:offline` cu întârziere. **API:** `POST /phones/:id/health-check` (`apps/api/src/routes/outreach.ts`, L2243–2257) enfilează job cu `tenantId` și `phoneId`; worker-ul iterează **toate** telefoanele activate ale tenantului — **nu** filtrează după `phoneId` din payload în bucla citită (L183–186), deci health-check-ul manual poate avea efect mai larg decât ID-ul cerut.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`monitor:phone:health\`` (L3642–3665).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:monitor:phone-health` (L1342–1350).
- `workers/shared/src/queue-registry.ts` — `MONITOR_PHONE_HEALTH`.
- `workers/outreach/src/workers/phone-monitoring.ts` — `PhoneHealthCheckJobData`, `createPhoneHealthMonitorWorker`.
- `apps/api/src/routes/outreach.ts` — enqueue manual.

## Instanțe v2

- **Catalog nodeKey:** `e2:monitor:phone-health`
- **OTel (v2):** `cognitive.e2.monitor.phone-health`

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI în v2.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:monitor:phone-health`**, coadă `monitor:phone:health`. | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `pipeline-control`. | v2. | — |
| 3 | Rol declarat | Sincronizare status API → DB + alertă derivată. | v2. | — |
| 4 | NeuronType + SOFAI | Catalog: `AttentionNeuron`. | v2. | — |
| 5 | Criticitate | Catalog / v2: `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker` + span condiționat (`factory.ts`). | Span v2. | — |
| 7 | Înveliș politică | Metrică `outreachPhoneStatus`; fără Cedar în handler. | v2 tier4. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | Try/catch per telefon; continuă bucla la eroare. | ADR-0067 antet fișier. | — |
| 10 | Escaladare HITL | Alertă pe cozi dedicate, nu `human:review` direct. | v2. | — |
| 11 | Micro-OODA | OBSERVE API; ORIENT map status; ACT DB + cozi. | v2. | — |
| 12 | Tier + de-escaladare | Eroare per telefon → log, nu oprire globală. | v2. | — |
| 13 | Stack | BullMQ, `@cerniq/integrations` TimelinesAI, Postgres `wa_phone_numbers`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.monitor.phone-health`.
- **Cod:** **aliniat** când `tenantId` în `job.data`.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
