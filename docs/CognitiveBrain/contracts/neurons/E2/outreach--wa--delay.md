<!-- neuron-contract:author-complete -->

# Neuron `outreach:wa:delay`

> **Status:** audit manual **2026-04-11**. **Nu există worker / coadă BullMQ** cu acest literal în `workers/`; specificația Etapa 2 descrie trimitere la această coadă la depășire cotă; trimiterea WA efectivă amână prin **jitter în-proces** în `createWaWorker`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `outreach:wa:delay` |
| etapa | E2 |
| familie (v2) | `orchestrator` |
| contract_path | `contracts/neurons/E2/outreach--wa--delay.md` |
| ADR familie (indicativ) | [orchestrator](../../adr/families/e2/orchestrator.md) |

## Scop în context real

**v2:** neuron graf, câmp `outreach:wa:delay`, evidence status: ne-reconciliat cu registry. **Specificație:** `docs/specifications/Etapa 2/etapa2-workers-triggers.md` (L17, L232) și `etapa2-workers-A-quota-guardian.md` (L314) — la `quota:guardian:check` cu `QUOTA_EXCEEDED`, enqueue `outreach:wa:delay`. **Repo (audit `workers/`):** `rg 'outreach:wa:delay'` → **0 potriviri**; nu apare în `workers/shared/src/queue-registry.ts`. **Comportament apropiat:** `quotaGuardianCheck` în `whatsapp.ts` (L134–160): dacă nu e `allowed` și motiv `QUOTA_EXCEEDED`, worker-ul returnează eșec fără re-enqueue pe coadă delay; **nu** s-a găsit legătura cod ↔ coadă `outreach:wa:delay`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`outreach:wa:delay\`` (L3842–3862).
- `docs/specifications/Etapa 2/etapa2-workers-triggers.md` — mapare trigger → coadă.
- `docs/specifications/Etapa 2/etapa2-workers-A-quota-guardian.md` — referință coadă.
- `workers/outreach/src/workers/whatsapp.ts` — `quotaGuardianCheck`, fără literal `outreach:wa:delay`.
- `workers/shared/src/queue-registry.ts` — absență literal.
- `packages/shared/src/cognitive-node-catalog.ts` — fără `nodeKey` pentru `outreach:wa:delay` (vezi `NEURON_MATRIX.csv`).

## Instanțe v2

- **Catalog nodeKey:** — **gap** (matrice: câmpuri catalog goale).
- **OTel (v2):** `cognitive.outreach.wa.delay`

## N/A pe criterii

- **Rând 6–12 (parțial):** fără handler runtime — multe celule devin «destinație v2 / spec» vs «lipsă în cod».

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap:** `outreach:wa:delay` nu e în `QUEUES`; fără `nodeKey` catalog la audit. | v2 queue field. | — |
| 2 | Etapă, familie, swimlane | — | v2 E2 orchestrator; swimlane `orchestrator` în bloc v2. | — |
| 3 | Rol declarat | **Lipsă worker**; spec: amânare la cotă depășită. | v2 operational purpose generic. | Implementare planificată vs reală nealiniate. |
| 4 | NeuronType + SOFAI | — | v2: `ExecutiveNeuron` inferat. | — |
| 5 | Criticitate | — | v2: `HIGH` inferat. | — |
| 6 | Înveliș telemetrie | Fără worker → fără `withCognitiveSpan` pentru această coadă. | OTel `cognitive.outreach.wa.delay`. | — |
| 7 | Înveliș politică | — | v2 guardrail/HITL. | — |
| 8 | Rutare model (dacă AI) | — | v2 LLM routing declarat. | Niciun apel LLM pentru această coadă (inexistentă). |
| 9 | Guardrails | — | v2. | — |
| 10 | Escaladare HITL | — | v2. | — |
| 11 | Micro-OODA | Jitter pre-send în `createWaWorker` (`applyJitter` + `sleep`, L193–195) — **nu** echivalent documentar cu coadă `outreach:wa:delay`. | v2 OODA. | Posibilă funcție parțială în alt neuron (`wa:send:*`). |
| 12 | Tier + de-escaladare | — | v2 tier 3. | — |
| 13 | Stack | Spec: BullMQ + `quota:guardian:check`. | v2 §2.3. | **Dovadă:** doar docs, nu cod worker. |

### Mapare OTel

- **v2:** `cognitive.outreach.wa.delay`.
- **Cod:** **neimplementat** pentru coada nominală — fără mapare `cognitive.nodeKey` la runtime; atribute reale doar dacă se introduce worker dedicat.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
