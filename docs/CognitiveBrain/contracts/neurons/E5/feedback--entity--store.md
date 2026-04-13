<!-- neuron-contract:author-complete -->

# Neuron `feedback:entity:store`

> **Status:** audit manual **2026-04-13**. **v2** (L8008–L8028): coadă `feedback:entity:store`, `EmotionNeuron`, LLM (L8023–L8024). **Repo:** **fără** literal `feedback:entity:store` sau `feedback:extract:entities` în `workers/**/*.ts`. Catalogul E5 pentru feedback include **H45** ca **`feedback:satisfaction:track`** (`cognitive-node-catalog.ts` L3170–L3177) — `h45-feedback-satisfaction-track.ts` (trend NPS), **nu** extracție entități. Diagramele vechi menționează „H45: feedback:extract:entities” (`c4-components-etapa5.drawio`), dar **nu** există worker cu această coadă în repo. **Concluzie:** stocare entități extrase din feedback — **gap** față de v2.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `feedback:entity:store` |
| etapa | E5 |
| familie (v2) | `feedback` |
| contract_path | `contracts/neurons/E5/feedback--entity--store.md` |
| ADR familie (indicativ) | [feedback](../../adr/families/e5/feedback.md) |

## Scop în context real

**v2:** persistare entități structurate din mesaje (L8019–L8022). **Cod:** fără traseu dedicat; H45 urmărește trend satisfacție din răspunsuri NPS.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L8008–L8028.
- `workers/shared/src/queue-registry.ts` — `E5_FEEDBACK_SATISFACTION_TRACK` (L608); **fără** entity store.
- `packages/shared/src/cognitive-node-catalog.ts` — H45 `feedback:satisfaction:track` (L3170–L3177).
- `workers/e5-nurturing/src/workers/h45-feedback-satisfaction-track.ts` — coadă `feedback:satisfaction:track` (L30).
- `rg` — zero `feedback:entity:store` în `workers/`.
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- **L8008–L8028:** span `cognitive.feedback.entity.store` (L8027).

## N/A pe criterii

- —

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Lipsă** `feedback:entity:store`. | v2: `feedback:entity:store` (L8022). | — |
| 2 | Etapă, familie, swimlane | H45: `feedback-nps` (catalog L3175). | v2: `feedback` E5 (L8011). | — |
| 3 | Rol declarat | H45: trend satisfacție din istoric NPS (`h45` L7–9). | v2: stocare entități (L8019–L8021). | Neconcordanță. |
| 4 | NeuronType + SOFAI | H45: `EmotionNeuron` (catalog L3174). | v2: `EmotionNeuron` (L8015). | Tip comun, rol diferit. |
| 5 | Criticitate | H45: `MEDIUM` (L3176). | v2: `MEDIUM` (L8017). | — |
| 6 | Înveliș telemetrie | H45: `withCognitiveSpan` (vezi `h45` pentru string). | v2 span (L8027). | — |
| 7 | Înveliș politică | — | v2 Tier 4 (L8018), fără HITL obligatoriu (L8025). | — |
| 8 | Rutare model (dacă AI) | H45 **fără** LLM (SQL agregare). | v2: LLM (L8023–L8024). | — |
| 9 | Guardrails | Minim 2 răspunsuri pentru trend (`h45` L11–12). | v2 L8025. | — |
| 10 | Escaladare HITL | — | v2 L8025. | — |
| 11 | Micro-OODA | SELECT NPS → UPDATE trend. | v2 OODA (L8023). | — |
| 12 | Tier + de-escaladare | — | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E5, Postgres. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.feedback.entity.store`.
- **Cod:** fără span dedicat pentru entități; H45 folosește alt `nodeKey`.

---
*Audit manual 2026-04-13.*
