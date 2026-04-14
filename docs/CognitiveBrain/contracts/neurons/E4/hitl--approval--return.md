<!-- neuron-contract:author-complete -->

# Neuron `hitl:approval:return`

> **Status:** audit manual **2026-04-13**. **v2** definește `hitl:approval:return` (*not yet reconciled*, L6996). **Repo:** **fără** catalog, registry sau worker pentru această coadă. **Proximitate:** `return:initiate` / `return:process` (H37–H38) — **fără** enqueue `hitl:approval:return` găsit la audit.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `hitl:approval:return` |
| etapa | E4 |
| familie (v2) | `hitl` |
| contract_path | `contracts/neurons/E4/hitl--approval--return.md` |
| ADR familie (indicativ) | [hitl](../../adr/families/e4/hitl.md) |

## Scop în context real

**v2** (L6976–L6996): aprobare retur, HumanNeuron inferat, OTel `cognitive.hitl.approval.return`. **Cod:** niciun `hitl:approval:return` în sursele căutate; HITL E4 documentat = K48–K53 în `k-hitl-workers.ts`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`hitl:approval:return\`` (L6976–L6996).
- `packages/shared/src/cognitive-node-catalog.ts` — fără intrare.
- `workers/shared/src/queue-registry.ts` — fără coadă.
- Căutare `hitl:approval:return` în `*.{ts,tsx,js,mjs}` — **0** rezultate (2026-04-13).
- HITL E4 implementat: `workers/e4-postsale/src/workers/k-hitl-workers.ts`, `index.ts` L523–565.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6992).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** — fără `nodeKey` / coadă runtime. | v2 `Confirmed queue field` (L6990). | L6996 — nereconciliat. |
| 2 | Etapă, familie, swimlane | Neconectat. | E4 / `hitl` / metrică swimlane `hitl` (L6994). | — |
| 3 | Rol declarat | Lipsă handler. | v2 L6987–6989. | — |
| 4 | NeuronType + SOFAI | Neconectat. | `HumanNeuron` inferat (L6983). | — |
| 5 | Criticitate | Neconectat. | `CRITICAL` inferat (L6985). | — |
| 6 | Înveliș telemetrie | Lipsă worker. | `cognitive.hitl.approval.return` (L6995). | — |
| 7 | Înveliș politică | — | v2 L6993. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L6993. | — |
| 11 | Micro-OODA | — | v2 L6991. | — |
| 12 | Tier + de-escaladare | — | Tier 2 (L6986). | — |
| 13 | Stack (subset plan v2) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.hitl.approval.return` (L6995).
- **Cod:** neimplementat.

---
*Generator inițial (hydrate):* înlocuit prin audit manual.
