<!-- neuron-contract:author-complete -->

# Neuron `lead:assign:user`

> **Status:** audit manual **2026-04-11**. Worker determinist: actualizează `assigned_to_user` pe `lead_journey` (opțional flag human-controlled).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `lead:assign:user` |
| etapa | E2 |
| familie (v2) | `lead-fsm` |
| contract_path | `contracts/neurons/E2/lead--assign--user.md` |
| ADR familie (indicativ) | [lead-fsm](../../adr/families/e2/lead-fsm.md) |

## Scop în context real

**v2 + catalog:** `ExecutiveNeuron`, asignare lead, swimlane `human-oversight`; v2 include **Model routing** LLM (vllm/SGLang) — **nu** apare în implementare. **Repo:** `createLeadAssignUserWorker` în `workers/outreach/src/workers/lead-assign-user.ts` (L26–99) pe `QUEUES.LEAD_ASSIGN_USER`: verifică existența journey, `update` `assignedToUser`, opțional `isHumanControlled` + `requiresHumanReview` dacă `setHumanControlled === true`. `withCognitiveSpan("e2:lead:assign-user")`. Comentariu fișier: coada era în registry fără consumator înainte de acest worker. Test registry: `lead-assign-user.test.ts`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`lead:assign:user\`` (L3492–3515).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:lead:assign-user` (L1302–1309).
- `workers/shared/src/queue-registry.ts` — `LEAD_ASSIGN_USER` (L153, L824).
- `workers/outreach/src/workers/lead-assign-user.ts` — worker + tipuri.
- `workers/outreach/src/workers/lead-assign-user.test.ts`.
- `workers/outreach/src/index.ts` — `createLeadAssignUserWorker` (L209).

## Instanțe v2

- **Catalog nodeKey:** `e2:lead:assign-user`
- **OTel (v2):** `cognitive.e2.lead.assign-user`

## N/A pe criterii

- **Rând 8:** nu este N/A pe întreg rândul — v2 menționează rutare LLM, **codul** nu apelează LLM; coloana *Limită evidență* explică divergența.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:lead:assign-user`**, `createLeadAssignUserWorker`, coadă `lead:assign:user`. | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `human-oversight`. | v2 familie `lead-fsm`. | — |
| 3 | Rol declarat | Persistență proprietar journey (și opțional mod HITL). | v2. | — |
| 4 | NeuronType + SOFAI | **Catalog:** `ExecutiveNeuron`. | v2. | — |
| 5 | Criticitate | **Catalog:** `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e2:lead:assign-user")` (L30). | v2 `cognitive.e2.lead.assign-user`. | Punct vs `cognitive.e2.lead.assign-user` (v2 folosește puncte). |
| 7 | Înveliș politică | Throw dacă journey lipsă; update condiționat tenant+journey. | v2 Tier 4 + HITL la eșecuri repetate. | — |
| 8 | Rutare model (dacă AI) | **Fără** apel LLM în worker. | v2 descrie PRIMARY vllm/SGLang — **nu** reflectă codul. | Divergență v2 §2.4; rând marcat N/A pentru *comportament cod*. |
| 9 | Guardrails | Logging + `enrichError`. | ADR-0007. | — |
| 10 | Escaladare HITL | Opțional `setHumanControlled` aliniază cu ADR-0064 parțial. | v2. | — |
| 11 | Micro-OODA | Validare journey → update câmpuri. | v2 OODA orchestrare + LLM — **parțial** față de cod. | — |
| 12 | Tier + de-escaladare | Eșec → throw (retry BullMQ). | v2. | — |
| 13 | Stack | BullMQ, Postgres. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.lead.assign-user`.
- **Cod:** `withCognitiveSpan("e2:lead:assign-user")` — **aliniat** semantic (separator `:` vs `.` în string).

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
