<!-- neuron-contract:author-complete -->

# Neuron `outreach:wa:reschedule`

> **Status:** audit manual **2026-04-11**. **Nu există worker / coadă** cu literalul `outreach:wa:reschedule` în `workers/` sau `queue-registry.ts`. Spec Etapa 2 o asociază cu `OUTSIDE_BUSINESS_HOURS` din quota guardian.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `outreach:wa:reschedule` |
| etapa | E2 |
| familie (v2) | `orchestrator` |
| contract_path | `contracts/neurons/E2/outreach--wa--reschedule.md` |
| ADR familie (indicativ) | [orchestrator](../../adr/families/e2/orchestrator.md) |

## Scop în context real

**v2:** neuron graf; queue ne-reconciliat cu registry. **Spec:** `docs/specifications/Etapa 2/etapa2-workers-triggers.md` (L18, L248) — pentru `reason=OUTSIDE_BUSINESS_HOURS` după `quota:guardian:check`, enqueue `outreach:wa:reschedule`. **Repo:** căutare `outreach:wa:reschedule` în `workers/` → **0**; în `whatsapp.ts`, `quotaGuardianCheck` cu `OUTSIDE_BUSINESS_HOURS` produce return `success: false`, `retryable: false` (L140–159), **fără** programare pe coadă reschedule.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`outreach:wa:reschedule\`` (L3864–3884).
- `docs/specifications/Etapa 2/etapa2-workers-triggers.md`.
- `docs/specifications/Etapa 2/etapa2-workers-A-quota-guardian.md` (L315).
- `workers/outreach/src/workers/whatsapp.ts` — `quotaGuardianCheck` outcome.
- `workers/shared/src/queue-registry.ts` — absență literal.
- `docs/CognitiveBrain/NEURON_MATRIX.csv` — fără `catalog_nodekey` pentru acest rând.

## Instanțe v2

- **Catalog nodeKey:** — **gap**.
- **OTel (v2):** `cognitive.outreach.wa.reschedule`

## N/A pe criterii

- Similar `outreach:wa:delay`: fără runtime, rândurile tehnice sunt în mare parte țintă + limită evidență.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap:** fără `QUEUES.*`, fără catalog `nodeKey`. | v2 `outreach:wa:reschedule`. | — |
| 2 | Etapă, familie, swimlane | — | v2 E2 orchestrator. | — |
| 3 | Rol declarat | **Lipsă worker**; spec: reprogramare în afara orelor. | v2 text generic. | — |
| 4 | NeuronType + SOFAI | — | v2 ExecutiveNeuron inferat. | — |
| 5 | Criticitate | — | v2 HIGH inferat. | — |
| 6 | Înveliș telemetrie | Fără worker. | `cognitive.outreach.wa.reschedule`. | — |
| 7 | Înveliș politică | — | v2. | — |
| 8 | Rutare model (dacă AI) | — | v2 declară LLM. | N/A pentru cod absent. |
| 9 | Guardrails | — | v2. | — |
| 10 | Escaladare HITL | — | v2. | — |
| 11 | Micro-OODA | — | v2. | Nu există OBSERVE/DECIDE pentru această coadă în repo. |
| 12 | Tier + de-escaladare | — | v2 tier 3. | — |
| 13 | Stack | Spec: BullMQ + quota Lua (București). | v2 §2.3. | Doar documentație Etapa 2. |

### Mapare OTel

- **v2:** `cognitive.outreach.wa.reschedule`.
- **Cod:** **lipsă** — migrare planificată dacă se implementează coada.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
