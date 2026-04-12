<!-- neuron-contract:author-complete -->

# Neuron `outreach:phone:allocator`

> **Status:** audit manual **2026-04-11**. Alocare telefon WA (sticky ADR-0055 sau `SKIP LOCKED` + min usage), apoi enqueue `outreach:channel:selector`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `outreach:phone:allocator` |
| etapa | E2 |
| familie (v2) | `orchestrator` |
| contract_path | `contracts/neurons/E2/outreach--phone--allocator.md` |
| ADR familie (indicativ) | [orchestrator](../../adr/families/e2/orchestrator.md) |

## Scop în context real

**v2:** alocare număr pentru trimitere WA. **Repo:** `createPhoneAllocatorWorker` (`workers/outreach/src/workers/orchestration.ts`, L367–438) înfășurat în `withCognitiveSpan("e2:outreach:phone-allocator")` (L373). Citește starea journey; încearcă `tryReuseStickyWaPhoneAssignment`; altfel `allocateNewWaPhoneWithMinimumQuota` (transacție `pickNextWaPhoneForTenantSkipLocked`, update `lead_journey.assignedPhoneId`). În ambele ramuri reușite enfilează `outreach:channel:selector` cu `ChannelSelectorJobData` (sticky: L265–276; nou: L340–351). Epuizare pool →eroare + metrică `phoneAllocatorContentionTotal` (`exhausted`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`outreach:phone:allocator\`` (L3817–3840).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:outreach:phone-allocator` (L1036–1044).
- `workers/shared/src/queue-registry.ts` — `OUTREACH_PHONE_ALLOCATOR`.
- `workers/outreach/src/workers/orchestration.ts` — `createPhoneAllocatorWorker`, `allocateNewWaPhoneWithMinimumQuota`, sticky helpers.
- `workers/outreach/src/workers/wa-phone-skip-locked-pick.ts` — (referință din orchestration).
- `workers/outreach/src/index.ts` — înregistrare cu Redis injectat.
- `workers/outreach/src/workers/orchestration.integration.test.ts` — export (L12–13).

## Instanțe v2

- **Catalog nodeKey:** `e2:outreach:phone-allocator`
- **OTel (v2):** `cognitive.e2.outreach.phone-allocator`

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI; fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e2:outreach:phone-allocator`; coadă `outreach:phone:allocator`. | v2 + catalog. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `pipeline-control`. | v2. | — |
| 3 | Rol declarat | Alocare / refolosire telefon + declanșare selector canal. | v2. | — |
| 4 | NeuronType + SOFAI | Catalog: `ProceduralNeuron`. | v2 tier 3. | — |
| 5 | Criticitate | Catalog / v2: `HIGH`. | v2. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e2:outreach:phone-allocator")` (L373) + `createWorker`. | Span v2. | Posibil span dublu cu fabrica. |
| 7 | Înveliș politică | Sticky + `forceReassign`; tranzacții SQL. | v2 HITL on anomaly — neexplicit aici. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI v2. | N/A |
| 9 | Guardrails | Status telefon ACTIVE din sticky path; pool epuizat → throw. | ADR-0055. | — |
| 10 | Escaladare HITL | Nu direct. | v2. | — |
| 11 | Micro-OODA | OBSERVE: DB journey + telefoane; ORIENT: sticky vs nou; DECIDE: tranzacție; ACT: enqueue selector. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Erori → throw (retry BullMQ). | v2. | — |
| 13 | Stack | BullMQ, Postgres, Redis (sticky), metrici contention. | v2 §2.3. | Teste: export smoke. |

### Mapare OTel

- **v2:** `cognitive.e2.outreach.phone-allocator`.
- **Cod:** `withCognitiveSpan("e2:outreach:phone-allocator")` — **aliniat** la `nodeKey` catalog.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
