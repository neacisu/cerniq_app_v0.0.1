<!-- neuron-contract:author-complete -->

# Neuron `lead:state:transition`

> **Status:** audit manual **2026-04-11**. Executor FSM: validare tranziție, update journey, eveniment gold, efecte secundare (ex. stop secvență la `WARM_REPLY`).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `lead:state:transition` |
| etapa | E2 |
| familie (v2) | `lead-fsm` |
| contract_path | `contracts/neurons/E2/lead--state--transition.md` |
| ADR familie (indicativ) | [lead-fsm](../../adr/families/e2/lead-fsm.md) |

## Scop în context real

**v2 + catalog:** `ProceduralNeuron`, tranziție FSM, non-AI în v2. **Repo:** `createStateTransitionWorker` în `workers/outreach/src/workers/lead-fsm.ts` (L78–275) pe `QUEUES.LEAD_STATE_TRANSITION`: citește `lead_journey`, `validateTransition(currentState, newState)` — invalid → log, `auditWriter` 409, metrică `fsmTransitions` către `INVALID`, return fără throw; valid → update `currentState`, `previousState`, `stateChangedAt`, `convertedAt` dacă `CONVERTED`, insert `goldLeadJourney` eveniment `FSM_STATE_TRANSITION`, `fsmTransitions.inc`, audit200; dacă `newState === WARM_REPLY` enfilează `sequence:stop` (`LEAD_REPLIED`). `withCognitiveSpan("e2:lead:state-transition")`. ADR-0062 în antet fișier. Enfilează din `email.ts`, `webhooks.ts`, `outreach` API etc.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`lead:state:transition\`` (L3517–3540).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:lead:state-transition` (L1284–1291).
- `workers/shared/src/queue-registry.ts` — `LEAD_STATE_TRANSITION` (L151, L822).
- `workers/outreach/src/workers/lead-fsm.ts` — `StateTransitionJobData`, `createStateTransitionWorker`.
- `workers/outreach/src/index.ts` — L207.
- `workers/outreach/src/workers/email.ts` — `createQueue(LEAD_STATE_TRANSITION)` (ex. L126).

## Instanțe v2

- **Catalog nodeKey:** `e2:lead:state-transition`
- **OTel (v2):** `cognitive.e2.lead.state-transition`

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI (v2 + cod).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:lead:state-transition`**, `createStateTransitionWorker`. | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `pipeline-control`. | v2. | — |
| 3 | Rol declarat | Aplicare tranziție FSM + audit + gold event + side effects. | v2. | — |
| 4 | NeuronType + SOFAI | **Catalog:** `ProceduralNeuron`. | v2. | — |
| 5 | Criticitate | **Catalog:** `HIGH`. | v2. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e2:lead:state-transition")` (L84). | v2 span. | — |
| 7 | Înveliș politică | Respingere moale tranziții invalide (fără throw); invariant dură la stări necanonice după validare. | v2 HITL policy. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | `validateTransition` + `isLeadJourneyFsmStateValue`; metrici Prometheus `fsmTransitions`. | ADR-0007. | — |
| 10 | Escaladare HITL | Nu direct; poate interacționa cu fluxuri care duc la `human:review:queue`. | v2. | — |
| 11 | Micro-OODA | OBSERVE journey; ORIENT reguli FSM; DECIDE accept/reject; ACT update + events. | v2 OODA determinist. | — |
| 12 | Tier + de-escaladare | Invalid → fără retry prin throw; erori invariant → throw. | v2 Tier 3. | — |
| 13 | Stack | BullMQ, Postgres, `fsmTransitions` din worker-shared, coadă `sequence:stop`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.lead.state-transition`.
- **Cod:** `withCognitiveSpan("e2:lead:state-transition")` — **aliniat**.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
