<!-- neuron-contract:author-complete -->

# Neuron `negotiation:state:transition`

> **Status:** audit manual **2026-04-11**. **D19** actualizeaza `gold_negotiations.currentState`, se bazeaza pe trigger DB `validate_state_transition()` (eroare `FSM: tranzitie invalida` convertita in `InvalidFSMTransitionError`), apoi enfileaza `negotiation:history:log` si, pentru stari tinta in `STATES_NEEDING_RESERVATION`, `negotiation:items:update`.

## Metadata

| Camp | Valoare |
| --- | --- |
| v2_queue | `negotiation:state:transition` |
| etapa | E3 |
| familie (v2) | `negotiation` |
| contract_path | `contracts/neurons/E3/negotiation--state--transition.md` |

## Scop in context real

**v2** (L5257-5280): **ProceduralNeuron**, **CRITICAL**, tranzitie FSM B2B. **Repo:** `d19-negotiation-state-transition.ts` — update + catch FSM (L57-68), istoric (L72-83), items (L85-95). **Inregistrare:** `main.ts` L194. **Registry:** `E3_NEGOTIATION_STATE_TRANSITION` (`queue-registry.ts` L236). **Teste:** `d-workers.test.ts` (import D19).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L5257-5280.
- `packages/shared/src/cognitive-node-catalog.ts` — L1666-1673.
- `workers/shared/src/queue-registry.ts` — L236.
- `workers/e3-ai-sales/src/main.ts` — L194.
- `workers/e3-ai-sales/src/workers/d19-negotiation-state-transition.ts`.
- `workers/e3-ai-sales/src/__tests__/d-workers.test.ts`.

## Instante v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5276).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonica | `e3:negotiation:state-transition`, `negotiation:state:transition` (catalog L1667-1668). | v2 (L5274). | — |
| 2 | Etapa, familie, swimlane | E3; `negotiation-fsm` (catalog L1671). | v2 (L5260-5267). | — |
| 3 | Rol declarat | FSM + cozi auxiliare (D19 L4-8, L57-96). | v2 (L5271-5273). | — |
| 4 | NeuronType + SOFAI | `ProceduralNeuron` (catalog L1670). | v2 (L5265). | — |
| 5 | Criticitate | `CRITICAL` (catalog L1673). | v2 (L5268). | — |
| 6 | Invelis telemetrie | `createWorker` + `withCognitiveSpan`. | v2 `cognitive.e3.negotiation.state-transition` (L5279). | Partial aliniat (`cognitive.nodeKey` vs span v2). |
| 7 | Invelis politica | Validare DB (D19 L5-7, L62-67). | v2 HITL ireversibil (L5277). | HITL nu explicit in D19. |
| 8 | Rutare model (daca AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | `STATES_NEEDING_RESERVATION` + items (D19 L14, L85-95). | ADR-0007 tinta. | — |
| 10 | Escaladare HITL | Nu in D19. | v2 (L5277). | — |
| 11 | Micro-OODA | Update + enqueue (D19 L41-98). | v2 (L5275). | — |
| 12 | Tier + de-escaladare | Fara in D19. | v2 Tier 2 (L5269). | — |
| 13 | Stack (subset) | BullMQ, Drizzle, PostgreSQL trigger FSM. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e3.negotiation.state-transition`.
- **Cod:** `cognitive.nodeKey` `e3:negotiation:state-transition` — partial aliniat.

---
*Generator initial:* inlocuit prin audit manual.
