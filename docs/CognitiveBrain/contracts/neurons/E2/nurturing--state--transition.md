<!-- neuron-contract:author-complete -->

# Neuron `nurturing:state:transition`

> **Status:** audit manual **2026-04-13**. **v2** (L8884–L8908): coadă `nurturing:state:transition`, etapă **E2**, catalog `e2:lead:state-transition`, coadă canonică plan/catalog **`lead:state:transition`**, OTel `cognitive.e2.lead.state-transition`. **Repo:** worker **#35** în `workers/outreach/src/workers/lead-fsm.ts`, `withCognitiveSpan("e2:lead:state-transition", …)` (L84), coadă `QUEUES.LEAD_STATE_TRANSITION` (`queue-registry.ts` L151, L822). **Bootstrap:** `workers/outreach/src/index.ts` — `registerCognitiveWorkerEtapa(2)` (L27), `createStateTransitionWorker()` (L207). **Inconsistență v2:** descriere „din E5” (L8897) vs **Stage E2** (L8886).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `nurturing:state:transition` |
| etapa | E2 |
| familie (v2) | `lifecycle` |
| contract_path | `contracts/neurons/E2/nurturing--state--transition.md` |
| ADR familie (indicativ) | [lead-fsm](../../adr/families/e2/lead-fsm.md) |

## Scop în context real

**Cod:** executor FSM pentru `leadJourney` — validare tranziție (`validateTransition`), actualizare stare, efecte secundare (ex. oprire secvență prin coadă `SEQUENCE_STOP` L79), audit logging (L73+). **v2:** transformare deterministă payload → următoarea coadă (L8901–L8903).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`nurturing:state:transition\`` (L8884–L8908).
- `workers/shared/src/queue-registry.ts` — `LEAD_STATE_TRANSITION: "lead:state:transition"` (L151); config L822.
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:lead:state-transition` (L1284–L1292).
- `workers/outreach/src/workers/lead-fsm.ts` — `createStateTransitionWorker` (L78+).
- `workers/outreach/src/index.ts` — L27, L207.
- `workers/outreach/src/workers/lead-fsm-worker.test.ts` — teste worker.
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- — (contract path sub E2; denumirea `nurturing:*` este etichetă graf, nu coadă BullMQ.)

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8903).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `lead:state:transition` + `e2:lead:state-transition`; v2 `nurturing:state:transition`. | Confirmed queue v2 (L8901). | Nume coadă v2 ≠ runtime. |
| 2 | Etapă, familie, swimlane | Catalog etapa 2, `pipeline-control` (L1288–L1289). | v2 E2, `lifecycle`, swimlane `pipeline-control` (L8886–L8895). | Text v2 „E5” la L8897 — eronat față de Stage. |
| 3 | Rol declarat | Tranziție stare journey lead (lead-fsm). | Tranziție FSM lead (L8898–L8900). | — |
| 4 | NeuronType + SOFAI | `ProceduralNeuron` (L1287). | `ProceduralNeuron` v2 (L8892). | Aliniat. |
| 5 | Criticitate | `HIGH` catalog (L1291). | `HIGH` v2 (L8895). | Aliniat. |
| 6 | Înveliș telemetrie | Span `cognitive:e2:lead:state-transition`. | `cognitive.e2.lead.state-transition` (L8907). | Aliniat (segmente). |
| 7 | Înveliș politică | `fsmTransitions` / validare (import L17). | HITL anomaly, SLA 4h (L8904). | HITL din v2 neexpandat în handler citit. |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI (L8903). | — |
| 9 | Guardrails | `validateTransition`, stări valide (lead-fsm L102+). | — | — |
| 10 | Escaladare HITL | Nu explicit în worker; erori log + throw. | v2 L8904. | — |
| 11 | Micro-OODA | Observare journey → validare → UPDATE → side effects. | OODA determinist (L8901–L8903). | — |
| 12 | Tier + de-escaladare | Concurrency 50 (registry L822). | Tier 3 v2 (L8896). | — |
| 13 | Stack (subset plan v2) | BullMQ outreach, Redis conform serviciu. | — | — |

### Mapare OTel

- **v2:** `cognitive.e2.lead.state-transition` (L8907).
- **Cod:** `cognitive:e2:lead:state-transition`.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
