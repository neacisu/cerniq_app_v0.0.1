<!-- neuron-contract:author-complete -->

# Neuron `pipeline:ai-sales:metrics`

> **Status:** audit manual **2026-04-11**. **v2:** E3 / `ops`, colectare metrici pipeline ai-sales, `AutonomicNeuron`, Non-AI, span `cognitive.pipeline.ai-sales.metrics`. **Repo:** gap — fără registry/worker; căutare în cod **fără** literal. **Spec:** `etapa3-workers-overview.md` L493, L860.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `pipeline:ai-sales:metrics` |
| etapa | E3 |
| familie (v2) | `ops` |
| contract_path | `contracts/neurons/E3/pipeline--ai-sales--metrics.md` |
| ADR familie (indicativ) | [ops](../../adr/families/e3/ops.md) |

## Scop în context real

**v2** (L5392–5412): neuron `ops` pentru metrici pipeline ai-sales, **MEDIUM**, Tier 4, pattern export graf / registry nereconciliat. **Repo:** nu s-a identificat handler pentru `pipeline:ai-sales:metrics`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L5392–5412.
- `docs/CognitiveBrain/adr/families/e3/ops.md`.
- `packages/shared/src/cognitive-node-catalog.ts` — fără potrivire.
- `workers/shared/src/queue-registry.ts` — fără literal.
- Căutare `pipeline:ai-sales:metrics` în `workers/`, `apps/`: **0**.
- `docs/specifications/Etapa 3/etapa3-workers-overview.md` — L493, L860.
- `docs/CognitiveBrain/NEURON_MATRIX.csv` — v2_line 5391.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5408).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap.** | L5406. | v2 §2.4. |
| 2 | Etapă, familie, swimlane | **Neconectat.** | E3; `ops`; swimlane `ops` (L5410). | — |
| 3 | Rol declarat | **Lipsă handler**; spec: colectare metrici (L493). | L5403–5405. | — |
| 4 | NeuronType + SOFAI | **Neconectat.** | `AutonomicNeuron`. | — |
| 5 | Criticitate | **Neconectat.** | `MEDIUM` (L5401). | — |
| 6 | Înveliș telemetrie | **Lipsă** worker. | `cognitive.pipeline.ai-sales.metrics` (L5411). | Doar destinație documentată. |
| 7 | Înveliș politică | **Lipsă.** | Tier 4; L5409. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI (L5408). | — |
| 9 | Guardrails | **Lipsă.** | ADR-0007. | — |
| 10 | Escaladare HITL | **Lipsă.** | L5409. | ADR-0008. |
| 11 | Micro-OODA | **Lipsă.** | L5407. | — |
| 12 | Tier + de-escaladare | **Lipsă.** | Tier 4 (L5402). | — |
| 13 | Stack | **Neaplicabil** până la worker. | BullMQ — destinație v2. | — |

### Mapare OTel

- **v2:** `cognitive.pipeline.ai-sales.metrics`.
- **Cod:** `withCognitiveSpan` — la implementare.
- **Stare:** **destinație** (2026-04-11).

---
*Generator inițial:* înlocuit prin audit manual.
