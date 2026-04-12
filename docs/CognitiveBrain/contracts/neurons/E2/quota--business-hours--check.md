<!-- neuron-contract:author-complete -->

# Neuron `quota:business-hours:check`

> **Status:** audit manual **2026-04-11**. Worker `createBusinessHoursSchedulerWorker` programează sau trimite imediat către `targetQueue` în funcție de orele de program RO (Luxon), nu execută singur trimiterea mesajului.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `quota:business-hours:check` |
| etapa | E2 |
| familie (v2) | `quota` |
| contract_path | `contracts/neurons/E2/quota--business-hours--check.md` |
| ADR familie (indicativ) | [quota](../../adr/families/e2/quota.md) |

## Scop în context real

**v2 + catalog:** verificare ore de program pentru trimitere. **Repo:** `createBusinessHoursSchedulerWorker` (`workers/outreach/src/workers/resilience.ts`, L266–321) consumă `SchedulerJobData`: `targetQueue`, `jobData`, `jobName`, `enforceBusinessHours`. Dacă `enforceBusinessHours` și `!isBusinessHours()` (09–18 `Europe/Bucharest`, weekend, sărbători din `ROMANIAN_HOLIDAYS_2026`), calculează `getNextBusinessSlot()`, enfilează același job pe `targetQueue` cu `delay`; altfel `add` imediat. **Înregistrare:** `workers/outreach/src/index.ts` (L174). **Producător:** la audit în repo **nu** s-a găsit `createQueue(QUEUES.QUOTA_BUSINESS_HOURS_CHECK).add` în afara worker-ului — apelurile trebuie căutate în fluxuri care trimit `SchedulerJobData`; **Limită evidență**.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`quota:business-hours:check\`` (L3908–3931).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:quota:business-hours` (L1007–1015).
- `workers/shared/src/queue-registry.ts` — `QUOTA_BUSINESS_HOURS_CHECK`.
- `workers/outreach/src/workers/resilience.ts` — `createBusinessHoursSchedulerWorker`, `BUSINESS_HOURS`, `isBusinessHours`, `getNextBusinessSlot`, `SchedulerJobData`.
- `workers/outreach/src/workers/resilience.test.ts` — constante business hours / holidays (L22–58).
- `workers/outreach/src/index.ts` — `createBusinessHoursSchedulerWorker()`.

## Instanțe v2

- **Catalog nodeKey:** `e2:quota:business-hours`
- **OTel (v2):** `cognitive.e2.quota.business-hours`

## N/A pe criterii

- **Rând 8:** **N/A** — fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e2:quota:business-hours`; coadă `quota:business-hours:check`. | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `pipeline-control`. | v2 quota. | — |
| 3 | Rol declarat | Gate temporal + re-scheduling BullMQ delay către altă coadă. | v2 „verificare ore program”. | Verificarea pre-send există și în Lua quota (`quota-lua.ts` ore9–18) — două straturi. |
| 4 | NeuronType + SOFAI | Catalog: `RulesNeuron`. | v2. | — |
| 5 | Criticitate | Catalog / v2: `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker` + `createOutreachJobLogger`; fără `withCognitiveSpan` explicit. | OTel v2 `cognitive.e2.quota.business-hours`. | Aliniere span fabrică vs v2 — verificare runtime. |
| 7 | Înveliș politică | ADR-0056 (comentarii fișier). | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI v2. | N/A |
| 9 | Guardrails | Weekend + holiday list + interval orar. | v2. | — |
| 10 | Escaladare HITL | Nu. | v2. | — |
| 11 | Micro-OODA | OBSERVE: ceas RO; ORIENT: în afara orelor?; DECIDE: delay vs imediat; ACT: `targetQueue.add`. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Eșec DateTime invalid → throw. | v2. | — |
| 13 | Stack | BullMQ, Luxon, liste sărbători fixe 2026. | v2 §2.3. | Producători job `quota:business-hours:check` neenumerați la audit TS. |

### Mapare OTel

- **v2:** `cognitive.e2.quota.business-hours`.
- **Cod:** atribute cognitive prin fabrică dacă `tenantId` rezolvat din `jobData` via `tenantIdFromUnknownPayload` în logger — **mapare `cognitive.nodeKey`**: din rezolvare coadă canonică; fără span manual dedicat.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
