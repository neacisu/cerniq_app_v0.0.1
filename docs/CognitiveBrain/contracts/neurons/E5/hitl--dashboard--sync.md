<!-- neuron-contract:author-complete -->

# Neuron `hitl:dashboard:sync`

> **Status:** audit manual **2026-04-13**. **v2** (L8589–8609): `HumanNeuron`, coadă `hitl:dashboard:sync`, OTel `cognitive.hitl.dashboard.sync`. **Repo:** **fără** literal în registry/catalog/workers (căutare 2026-04-13). **Proximitate:** singurele cozi `hitl:*` E5 în `queue-registry.ts` sunt `hitl:winback:review` și `hitl:complaint:review`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `hitl:dashboard:sync` |
| etapa | E5 |
| familie (v2) | `hitl` |
| contract_path | `contracts/neurons/E5/hitl--dashboard--sync.md` |
| ADR familie (indicativ) | [hitl](../../adr/families/e5/hitl.md) |

## Scop în context real

**v2:** sincronizare date dashboard sub control uman (L8600–8602). **Cod:** niciun procesor dedicat identificat.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`hitl:dashboard:sync\`` (L8589–8609).
- `workers/shared/src/queue-registry.ts` — fără `hitl:dashboard:sync` (L639–643 pentru HITL E5).
- `packages/shared/src/cognitive-node-catalog.ts` — fără potrivire la audit.
- Căutare `hitl:dashboard:sync` în surse TypeScript — **0** rezultate (2026-04-13).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8605).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** — fără coadă runtime. | Confirmed queue (L8603). | v2 L8609 — nereconciliat cu registry. |
| 2 | Etapă, familie, swimlane | Neconectat. | E5, `hitl` (L8591–8592). | — |
| 3 | Rol declarat | Lipsă handler. | Operațional HITL (L8600–8602). | — |
| 4 | NeuronType + SOFAI | Neconectat. | `HumanNeuron` (L8596). | — |
| 5 | Criticitate | Neconectat. | `CRITICAL` (L8598). | — |
| 6 | Înveliș telemetrie | Lipsă procesor. | `cognitive.hitl.dashboard.sync` (L8608). | — |
| 7 | Înveliș politică | — | SLA 2h, HITL mandatory (L8606). | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI (L8605). | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L8606. | — |
| 11 | Micro-OODA | — | OODA LangGraph (L8604). | — |
| 12 | Tier + de-escaladare | — | Tier 2 (L8599). | — |
| 13 | Stack (subset plan v2) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.hitl.dashboard.sync` (L8608).
- **Cod:** —

---
*Revizuire manuală:* dovezi repo 2026-04-13.
