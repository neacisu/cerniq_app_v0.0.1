<!-- neuron-contract:author-complete -->

# Neuron `sequence:schedule:followup`

> **Status:** audit manual **2026-04-11**. Calculează `nextActionAt`, actualizează `lead_journey`, enfilează `sequence:advance` cu delay BullMQ.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `sequence:schedule:followup` |
| etapa | E2 |
| familie (v2) | `sequences` |
| contract_path | `contracts/neurons/E2/sequence--schedule--followup.md` |
| ADR familie (indicativ) | [sequences](../../adr/families/e2/sequences.md) |

## Scop în context real

**v2:** programare follow-up în secvență. **Repo:** `createSequenceSchedulerWorker` (`workers/outreach/src/workers/sequences.ts`, L82–221): citește `outreach_sequences` / `outreach_sequence_steps`, dacă nu există pas următor marchează enrollment `COMPLETED`; altfel Luxon + `respectBusinessHours` (weekend, `ROMANIAN_HOLIDAYS_2026`, ore 9–18), UPDATE `lead_journey.nextActionAt` / `sequenceStep`, apoi `advanceQueue.add` pe `QUEUES.SEQUENCE_ADVANCE` cu `delay` ms. `withCognitiveSpan("e2:sequence:schedule-followup", ..., { tenantId })` (L88–216). **Teste:** `workers/outreach/src/workers/sequences.test.ts` (înregistrare coadă L206+).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — antet `### NEURON` pentru `sequence:schedule:followup` (L4008–4031).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:sequence:schedule-followup` (L1246–1254).
- `workers/shared/src/queue-registry.ts` — `SEQUENCE_SCHEDULE_FOLLOWUP`.
- `workers/outreach/src/workers/sequences.ts` — worker + tipuri.
- `workers/outreach/src/workers/sequences.test.ts`.

## Instanțe v2

- **Catalog nodeKey:** `e2:sequence:schedule-followup`
- **OTel (v2):** `cognitive.e2.sequence.schedule-followup`

## N/A pe criterii

- **Rând 8:** **N/A** — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e2:sequence:schedule-followup`; coadă `sequence:schedule:followup`. | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `pipeline-control`. | v2 sequences. | — |
| 3 | Rol declarat | Planificare temporală pas următor + lanț către advance. | v2. | — |
| 4 | NeuronType + SOFAI | Catalog: `ProceduralNeuron`. | v2. | — |
| 5 | Criticitate | `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e2:sequence:schedule-followup")` + `createWorker`. | `cognitive.e2.sequence.schedule-followup`. | Posibil span dublu fabrică. |
| 7 | Înveliș politică | Reguli business hours din secvență. | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | Return coduri `SEQUENCE_NOT_FOUND`, `SEQUENCE_COMPLETE`. | v2. | — |
| 10 | Escaladare HITL | Nu. | v2. | — |
| 11 | Micro-OODA | OBSERVE: DB pași; ORIENT: calendar RO; DECIDE: delay; ACT: enqueue advance. | v2. | — |
| 12 | Tier + de-escaladare | Erori Luxon invalid → `INVALID_NEXT_ACTION_TIME`. | v2. | — |
| 13 | Stack | BullMQ, Postgres, Luxon, `BUSINESS_HOURS` din `resilience.ts`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.sequence.schedule-followup`.
- **Cod:** `withCognitiveSpan("e2:sequence:schedule-followup")` — **aliniat** (explicit).

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
