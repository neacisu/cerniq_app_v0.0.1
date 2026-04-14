<!-- neuron-contract:author-complete -->

# Neuron `hitl:approval:contract-clause`

> **Status:** audit manual **2026-04-13**. **v2** definește coadă `hitl:approval:contract-clause` (HumanNeuron inferat, *not yet reconciled with runtime registry*, L6899). **Repo:** **fără** intrare în `cognitive-node-catalog.ts`, **fără** constantă în `queue-registry.ts`, **fără** literal în `workers/**/*.ts` (căutare `hitl:approval:contract-clause`). **Proximitate:** flux contracte DocuSign G32–G36 și selecție clauze `g33-contract-clauses-select.ts` — **fără** dovadă că echivalează acest neuron HITL granular.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `hitl:approval:contract-clause` |
| etapa | E4 |
| familie (v2) | `hitl` |
| contract_path | `contracts/neurons/E4/hitl--approval--contract-clause.md` |
| ADR familie (indicativ) | [hitl](../../adr/families/e4/hitl.md) |

## Scop în context real

**v2** (L6879–L6899): aprobare umană pentru clauze contract, OODA HITL, OTel `cognitive.hitl.approval.contract-clause`. **Cod:** niciun procesor BullMQ dedicat la data auditului; pattern-ul HITL E4 pentru neuroni implementați este `approvalService.createTask` în `k-hitl-workers.ts` (K48–K53) — **nu** include `contract-clause`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`hitl:approval:contract-clause\`` (L6879–L6899).
- `packages/shared/src/cognitive-node-catalog.ts` — fără `hitl:approval:contract-clause` / `e4:hitl:*clause*` la audit.
- `workers/shared/src/queue-registry.ts` — fără coadă literală.
- Căutare `hitl:approval:contract-clause` în `*.{ts,tsx,js,mjs}` — **0** rezultate (2026-04-13).
- Referință arhitectură HITL implementată: `workers/e4-postsale/src/workers/k-hitl-workers.ts` (K48–K53), `workers/e4-postsale/src/index.ts` (L523–565).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6895).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap:** fără registry / catalog / worker pentru coada v2. | `Confirmed queue field` (L6893). | v2 L6899 — nereconciliat cu registry. |
| 2 | Etapă, familie, swimlane | Neconectat. | E4, `hitl`, metrică swimlane `hitl` (L6897). | Catalog HITL implementat folosește `human-oversight-e4` (ex. K49). |
| 3 | Rol declarat | Lipsă handler. | Aprobare clauze (v2 L6890–6892). | — |
| 4 | NeuronType + SOFAI | Neconectat. | `HumanNeuron` inferat (L6886). | — |
| 5 | Criticitate | Neconectat. | `CRITICAL` inferat (L6888). | — |
| 6 | Înveliș telemetrie | Lipsă procesor. | `cognitive.hitl.approval.contract-clause` (L6898). | Prefix OTel diferit de `cognitive:e4:…` folosit în K48–K53. |
| 7 | Înveliș politică | — | HITL mandatory, SLA 2h (L6896). | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L6896. | — |
| 11 | Micro-OODA | — | v2 L6894. | LangGraph în v2: neverificat pentru acest neuron (lipsă cod). |
| 12 | Tier + de-escaladare | — | Tier 2 (L6889). | — |
| 13 | Stack (subset plan v2) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.hitl.approval.contract-clause` (L6898).
- **Cod:** neemise — fără worker.

---
*Generator inițial (hydrate):* înlocuit prin audit manual.
