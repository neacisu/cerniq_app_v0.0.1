<!-- neuron-contract:author-complete -->

# Neuron `pipeline:ai-sales:cleanup`

> **Status:** audit manual **2026-04-11**. **v2:** E3 / `ops`, mentenanță pipeline ai-sales (curățare date vechi — din etichetă graf), `AutonomicNeuron`, Non-AI, span `cognitive.pipeline.ai-sales.cleanup`. **Repo:** fără catalog/registry/worker pentru `pipeline:ai-sales:cleanup`; `rg` pe `*.ts`/`*.yml` în repo **fără** literal — **gap runtime**. Documentația `docs/specifications/Etapa 3/etapa3-workers-overview.md` menționează coada și cron (L494, L865) ca **destinație**, nu ca implementare verificată în `workers/`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `pipeline:ai-sales:cleanup` |
| etapa | E3 |
| familie (v2) | `ops` |
| contract_path | `contracts/neurons/E3/pipeline--ai-sales--cleanup.md` |
| ADR familie (indicativ) | [ops](../../adr/families/e3/ops.md) |

## Scop în context real

**v2** (L5348–5368): neuron soluție în `ops` — etichetă `pipeline / ai-sales / cleanup`, **MEDIUM**, Tier 4, procesare deterministă, OODA generic cron/maintenance. **Contract evidence status:** export graf, *not yet reconciled with runtime registry*. **Repo:** nu s-a găsit `Worker`/`Queue` cu acest nume; ADR `ops` cere prudență la afirmații despre `pipeline:ai-sales:*`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L5348–5368.
- `docs/CognitiveBrain/adr/families/e3/ops.md`.
- `packages/shared/src/cognitive-node-catalog.ts` — fără intrare pentru această coadă.
- `workers/shared/src/queue-registry.ts` — fără literal.
- `rg` `pipeline:ai-sales:cleanup` pe `workers/`, `apps/`, `*.yml`: **0**.
- `docs/specifications/Etapa 3/etapa3-workers-overview.md` — L494, L865 (specificație).
- `docs/CognitiveBrain/NEURON_MATRIX.csv` — v2_line 5347; `queue_in_registry` = `no`.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5364).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** catalog + registry. | `pipeline:ai-sales:cleanup` (L5362). | v2 §2.4. |
| 2 | Etapă, familie, swimlane | **Neconectat.** | E3; `ops`; swimlane `ops` (L5366). | — |
| 3 | Rol declarat | **Lipsă handler**; spec: curățare date vechi (overview L494). | Scop generic ops (L5359–5361). | Spec ≠ cod runtime. |
| 4 | NeuronType + SOFAI | **Neconectat.** | `AutonomicNeuron` → System1. | — |
| 5 | Criticitate | **Neconectat.** | `MEDIUM` (L5357). | — |
| 6 | Înveliș telemetrie | **Lipsă** worker. | `cognitive.pipeline.ai-sales.cleanup` (L5367). | Doar destinație documentată. |
| 7 | Înveliș politică | **Lipsă.** | Tier 4; fără HITL obligatoriu (L5358, L5365). | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI (L5364). | — |
| 9 | Guardrails | **Lipsă.** | ADR-0007. | — |
| 10 | Escaladare HITL | **Lipsă** coadă. | v2 (L5365). | ADR-0008. |
| 11 | Micro-OODA | **Lipsă** cod. | OODA (L5363). | — |
| 12 | Tier + de-escaladare | **Lipsă.** | Tier 4 (L5358). | — |
| 13 | Stack | **Neaplicabil** până la worker. | BullMQ — destinație v2. | — |

### Mapare OTel

- **v2:** `cognitive.pipeline.ai-sales.cleanup`.
- **Cod:** `withCognitiveSpan` — `cognitive.nodeKey`, etc.
- **Stare 2026-04-11:** doar **destinație**.

---
*Generator inițial:* înlocuit prin audit manual.
