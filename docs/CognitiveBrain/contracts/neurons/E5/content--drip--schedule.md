<!-- neuron-contract:author-complete -->

# Neuron `content:drip:schedule`

> **Status:** audit manual **2026-04-13**. **v2** (L7807–L7830): `content:drip:schedule`, catalog `e5:content:drip-schedule`, `ProceduralNeuron`, swimlane `content-drip`. **Repo:** `E5_CONTENT_DRIP_SCHEDULE` în `queue-registry.ts` (L616), catalog (`cognitive-node-catalog.ts` L3199–L3206), worker **I48** `i48-content-drip-schedule.ts` — `withCognitiveSpan("e5:content:drip-schedule", …)` (L69), enfilează **`content:drip:execute`** (I49) pentru clienți eligibili.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `content:drip:schedule` |
| etapa | E5 |
| familie (v2) | `content` |
| contract_path | `contracts/neurons/E5/content--drip--schedule.md` |
| ADR familie (indicativ) | [content](../../adr/families/e5/content.md) |

## Scop în context real

Planificare zilnică (cron) a pașilor drip și propagare către execuție (I49); vezi antet I48 în `i48-content-drip-schedule.ts`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7807–L7830.
- `workers/shared/src/queue-registry.ts` — `E5_CONTENT_DRIP_SCHEDULE` (L616).
- `packages/shared/src/cognitive-node-catalog.ts` — `e5:content:drip-schedule` (L3199–L3206).
- `workers/e5-nurturing/src/workers/i48-content-drip-schedule.ts` — procesor + lanț I49 (L32–33, L69, L133).
- `workers/e5-nurturing/src/__tests__/feedback-content-compliance.test.ts` — constantă coadă (L405).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- **L7807–L7830:** catalog-grounded, metrici cu `neuron_id="e5:content:drip-schedule"` (L7828), span `cognitive.e5.content.drip-schedule` (L7829).

## N/A pe criterii

- **8 — Rutare model:** N/A — I48 fără LLM (non-AI în v2 L7825).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Registry + catalog + I48: **`content:drip:schedule`**. | v2 L7824. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapă `5`, `content-drip` (L3204). | v2: E5, `content`, swimlane `content-drip` (L7821). | — |
| 3 | Rol declarat | „Planificare drip I48…” (catalog L3202). | v2 descriere (L7818–L7820). | — |
| 4 | NeuronType + SOFAI | `ProceduralNeuron` (catalog L3203). | v2 L7815. | — |
| 5 | Criticitate | Catalog: `MEDIUM` (L3205). | v2 L7819. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e5:content:drip-schedule", …)` (`i48` L69). | v2 span L7829. | Notație puncte vs `:` în span. |
| 7 | Înveliș politică | Concurrency din registry (metadata cozi I48). | v2 HITL la eșecuri repetate (L7826). | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 non-AI L7825. | — |
| 9 | Guardrails | Eligibilitate clienți + enqueue controlat către I49 (`i48`). | v2 L7826. | — |
| 10 | Escaladare HITL | Nu direct din I48; escaladări în alte cozi dacă eșec livrare downstream. | v2 L7826. | — |
| 11 | Micro-OODA | Cron → SELECT eligibili → ADD `content:drip:execute`. | v2 OODA (L7823). | — |
| 12 | Tier + de-escaladare | Retry BullMQ standard. | v2 Tier 4 (L7820). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ Redis DB 5, Postgres (`goldContentDrips`, etc.). | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e5.content.drip-schedule`.
- **Cod:** `cognitive:e5:content:drip-schedule`.

---
*Audit manual 2026-04-13.*
