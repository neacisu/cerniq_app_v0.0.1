<!-- neuron-contract:author-complete -->

# Neuron `pipeline:ai-sales:health`

> **Status:** audit manual **2026-04-11**. **v2:** E3 / `ops`, verificare sănătate pipeline ai-sales (etichetă graf), `AutonomicNeuron`, Non-AI, span `cognitive.pipeline.ai-sales.health`. **Repo:** gap — fără catalog, registry, worker; căutare în cod sursă **fără** literal. **Spec:** `etapa3-workers-overview.md` L492, L855 (cron — documentație, neconfirmată în workers).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `pipeline:ai-sales:health` |
| etapa | E3 |
| familie (v2) | `ops` |
| contract_path | `contracts/neurons/E3/pipeline--ai-sales--health.md` |
| ADR familie (indicativ) | [ops](../../adr/families/e3/ops.md) |

## Scop în context real

**v2** (L5370–5390): neuron `ops` pentru health-check pipeline ai-sales, **MEDIUM**, Tier 4, Non-AI, același pattern evidence «not yet reconciled with runtime registry». **Repo:** la audit nu există implementare BullMQ pentru `pipeline:ai-sales:health`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L5370–5390.
- `docs/CognitiveBrain/adr/families/e3/ops.md`.
- `packages/shared/src/cognitive-node-catalog.ts` — fără potrivire.
- `workers/shared/src/queue-registry.ts` — fără literal.
- Căutare `pipeline:ai-sales:health` în `workers/`, `apps/`: **0** rezultate.
- `docs/specifications/Etapa 3/etapa3-workers-overview.md` — L492, L855.
- `docs/CognitiveBrain/NEURON_MATRIX.csv` — v2_line 5369.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5386).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap.** | Coadă L5384. | v2 §2.4. |
| 2 | Etapă, familie, swimlane | **Neconectat.** | E3; `ops`; swimlane `ops` (L5388). | — |
| 3 | Rol declarat | **Lipsă handler**; spec: verificare sănătate (overview L492). | Ops generic (L5381–5383). | — |
| 4 | NeuronType + SOFAI | **Neconectat.** | `AutonomicNeuron`. | — |
| 5 | Criticitate | **Neconectat.** | `MEDIUM` (L5379). | — |
| 6 | Înveliș telemetrie | **Lipsă** worker. | `cognitive.pipeline.ai-sales.health` (L5389). | Doar destinație documentată. |
| 7 | Înveliș politică | **Lipsă.** | Tier 4; policy L5387. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI (L5386). | — |
| 9 | Guardrails | **Lipsă.** | ADR-0007. | — |
| 10 | Escaladare HITL | **Lipsă.** | L5387. | ADR-0008. |
| 11 | Micro-OODA | **Lipsă.** | L5385. | — |
| 12 | Tier + de-escaladare | **Lipsă.** | Tier 4 (L5380). | — |
| 13 | Stack | **Neaplicabil** până la worker. | BullMQ — destinație v2. | — |

### Mapare OTel

- **v2:** `cognitive.pipeline.ai-sales.health`.
- **Cod:** `withCognitiveSpan` — convenție atribute reale la implementare.
- **Stare:** **destinație** (2026-04-11).

---
*Generator inițial:* înlocuit prin audit manual.
