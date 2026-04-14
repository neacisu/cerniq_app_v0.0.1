<!-- neuron-contract:author-complete -->

# Neuron `association:sync:schedule`

> **Status:** audit manual **2026-04-13**. **v2** coadă `association:sync:schedule` (L8275–8295). **Cod:** **fără** literal în `queue-registry.ts` sau în `*.ts` (căutare: zero). Cozi E5 pentru asociații sunt G37–G42 (vezi `E5_ASSOCIATION_*` L592–602); **fără** `sync:schedule`. **Bootstrap:** G37–G42 **nu** sunt în `workers/e5-nurturing/src/index.ts` L68–91.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `association:sync:schedule` |
| etapa | E5 |
| familie (v2) | `graph-community` |
| contract_path | `contracts/neurons/E5/association--sync--schedule.md` |
| ADR familie (indicativ) | [graph-community](../../adr/families/e5/graph-community.md) |

## Scop în context real

**v2:** planificare sincronizare asociații. **Runtime:** **gap** — niciun worker/coadă cu acest nume; orchestrarea periodică (dacă există) trebuie căutată în alte servicii (cron, orchestrator), **nu** demonstrată aici.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — (L8275–8295).
- `workers/shared/src/queue-registry.ts` — L592–602, L1306–1323 (`association:*` fără `sync:schedule`).
- `workers/e5-nurturing/src/index.ts` — L68–91.
- `rg` `association:sync:schedule` în `*.ts`: **fără**.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8291).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Fără** intrare registry. | v2 L8289. | — |
| 2 | Etapă, familie, swimlane | — | v2 E5 / `graph-community` (L8277–8278). | — |
| 3 | Rol declarat | — | v2 generic (L8286–8288). | — |
| 4 | NeuronType + SOFAI | — | v2 `KnowledgeNeuron` (L8282). | — |
| 5 | Criticitate | — | v2 `MEDIUM` (L8284). | — |
| 6 | Înveliș telemetrie | — | v2 `cognitive.association.sync.schedule` (L8294). | — |
| 7 | Înveliș politică | — | v2 L8292–8293. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | NeMo destinație. | — |
| 10 | Escaladare HITL | — | v2 L8293. | — |
| 11 | Micro-OODA | — | v2 L8290. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8285). | — |
| 13 | Stack v2 §2.3 (subset) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.association.sync.schedule`.
- **Cod:** fără span verificat.

---
*Audit manual 2026-04-13; surse verificate în repo.*
