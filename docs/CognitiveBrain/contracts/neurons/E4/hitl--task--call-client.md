<!-- neuron-contract:author-complete -->

# Neuron `hitl:task:call-client`

> **Status:** audit manual **2026-04-13**. **v2** definește `hitl:task:call-client` (*not yet reconciled*, L7068). **Repo:** **fără** catalog, registry sau worker pentru această coadă. **Neuron HITL task** implementat în E4: **`hitl:task:resolve`** (`e4:hitl:task-resolve`, K52) — **altă coadă**; nu echivalează „call client” fără dovadă suplimentară.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `hitl:task:call-client` |
| etapa | E4 |
| familie (v2) | `hitl` |
| contract_path | `contracts/neurons/E4/hitl--task--call-client.md` |
| ADR familie (indicativ) | [hitl](../../adr/families/e4/hitl.md) |

## Scop în context real

**v2** (L7048–L7068): task HITL uman, OTel `cognitive.hitl.task.call-client`. **Cod:** căutare literală negativă; pentru rezolvare task-uri există `hitlTaskResolveProcessor` pe coada `hitl:task:resolve` (`k-hitl-workers.ts` L367–440, `index.ts` L553–557).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`hitl:task:call-client\`` (L7048–L7068).
- `packages/shared/src/cognitive-node-catalog.ts` — fără `hitl:task:call-client`; există `e4:hitl:task-resolve` / `hitl:task:resolve` (L2715–2722).
- `workers/shared/src/queue-registry.ts` — `E4_HITL_TASK_RESOLVE: "hitl:task:resolve"` (L501); **fără** `call-client`.
- Căutare `hitl:task:call-client` în `*.{ts,tsx,js,mjs}` — **0** rezultate (2026-04-13).
- Worker înrudit (rezolvare): `workers/e4-postsale/src/workers/k-hitl-workers.ts` (K52), `k52-hitl-task-resolve.ts` (re-export).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L7064).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** pentru `hitl:task:call-client`. Implementat separat: `hitl:task:resolve` (registry L501). | v2 coadă L7062. | L7068 — nereconciliat. |
| 2 | Etapă, familie, swimlane | K52: etapă 4, swimlane catalog `human-oversight-e4` pentru `hitl:task:resolve`. | v2 familie `hitl`, swimlane `hitl` în metrică (L7066). | — |
| 3 | Rol declarat | Lipsă handler pentru call-client. K52: `approvalService.decide` + audit (k-hitl L398–426). | v2 L7059–7061. | Funcții diferite. |
| 4 | NeuronType + SOFAI | `HumanNeuron` pentru `hitl:task:resolve` (catalog L2719). | `HumanNeuron` inferat v2 (L7055). | — |
| 5 | Criticitate | Neconectat pentru call-client. K52: `MEDIUM` (catalog L2722). | `CRITICAL` inferat v2 (L7057). | — |
| 6 | Înveliș telemetrie | K52: `withCognitiveSpan("e4:hitl:task:resolve", …)` (L392–394) → span `cognitive:e4:hitl:task:resolve`; catalog `e4:hitl:task-resolve` (cratimă) — **divergență** față de `nodeKey` catalog. | v2 `cognitive.hitl.task.call-client` (L7067). | call-client: fără span. |
| 7 | Înveliș politică | — | v2 L7065. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | K52 finalizează decizii pe task existent. | v2 L7065. | — |
| 11 | Micro-OODA | — | v2 L7063. | — |
| 12 | Tier + de-escaladare | — | Tier 2 v2 (L7058). | — |
| 13 | Stack (subset plan v2) | BullMQ E4 pentru K52. | — | — |

### Mapare OTel

- **v2:** `cognitive.hitl.task.call-client` (L7067).
- **Cod:** neemise pentru call-client; pentru `hitl:task:resolve` vezi `cognitive:e4:hitl:task:resolve` (prim argument K52) vs `e4:hitl:task-resolve` în catalog.

---
*Generator inițial (hydrate):* înlocuit prin audit manual.
