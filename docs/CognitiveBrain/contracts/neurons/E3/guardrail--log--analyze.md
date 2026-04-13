<!-- neuron-contract:author-complete -->

# Neuron `guardrail:log:analyze`

> **Status:** audit manual **2026-04-11**. **Gap runtime:** la căutare în repo (`grep` pe `guardrail:log:analyze` / `log:analyze` în `*.ts`/`*.js`) **nu există** procesor BullMQ, literal `QUEUES`, sau `nodeKey` în `cognitive-node-catalog.ts`. v2 marchează **graph-export-grounded**, coadă ne-reconciliată cu registry (L5087–5089).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `guardrail:log:analyze` |
| etapa | E3 |
| familie (v2) | `guardrails` |
| contract_path | `contracts/neurons/E3/guardrail--log--analyze.md` |
| ADR familie (indicativ) | [guardrails](../../adr/families/e3/guardrails.md) |

## Scop în context real

**v2** (L5069–5089): neuron **issue** din export graf, tip/criticitate inferate, **GuardrailNeuron** presupus, coadă confirmată `guardrail:log:analyze`, OODA cu NeMo + verificări deterministe. **Comportament în repo la audit:** **lipsă** handler și **lipsă** intrare `QUEUES` în `workers/shared/src/queue-registry.ts` (verificat prin `grep` pe `log:analyze`). **ADR** [`guardrails.md`](../../adr/families/e3/guardrails.md) notează explicit că `guardrail:log:analyze` **nu** apare ca literal în registry la audit ADR.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L5069–5089.
- `workers/shared/src/queue-registry.ts` — fără `guardrail:log:analyze` la `grep`.
- `packages/shared/src/cognitive-node-catalog.ts` — fără `guardrail:log` la `grep`.
- `docs/CognitiveBrain/adr/families/e3/guardrails.md` — gap graf ↔ registry.
- Căutare repo: `grep` `guardrail:log:analyze|log:analyze` în `*.{ts,js}` — zero rezultate (2026-04-11).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5085); fără cod de rutare.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap:** fără `nodeKey` în catalog; fără coadă în registry la audit. | v2 câmp coadă (L5083). | v2 §2.4 — implementare absentă. |
| 2 | Etapă, familie, swimlane | — | E3, guardrails; v2 swimlane `guardrails` în metrici (L5087). | — |
| 3 | Rol declarat | — | v2: operațional guardrails (L5080–5082). | — |
| 4 | NeuronType + SOFAI | — | v2 inferat GuardrailNeuron (L5076). | — |
| 5 | Criticitate | — | v2 inferat CRITICAL (L5078). | — |
| 6 | Înveliș telemetrie | — | v2 `cognitive.guardrail.log.analyze` (L5088). | Fără worker — span neemise. |
| 7 | Înveliș politică | — | v2 HITL mandatory (L5086). | — |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | — | NeMo + determinist (L5084). | — |
| 10 | Escaladare HITL | — | v2 (L5086). | — |
| 11 | Micro-OODA | — | v2 (L5084). | — |
| 12 | Tier + de-escaladare | — | v2 Tier 2 (L5079). | — |
| 13 | Stack (subset) | — | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.guardrail.log.analyze` (fără prefix `e3.` în blocul v2 L5088).
- **Cod:** **neimplementat** la audit — fără `cognitive.nodeKey` canonic.

---
*Generator inițial:* înlocuit prin audit manual.
