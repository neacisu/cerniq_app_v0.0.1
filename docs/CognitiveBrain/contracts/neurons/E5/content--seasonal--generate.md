<!-- neuron-contract:author-complete -->

# Neuron `content:seasonal:generate`

> **Status:** audit manual **2026-04-13**. **v2** (L7876–L7896): coadă `content:seasonal:generate`, familia `content`, E5, non-AI generic (L7892). **Repo:** **fără** literal `content:seasonal:generate` în `queue-registry.ts`. În domeniul **sezonier agricol / alerte**, există **`alerts:apia:seasonal`** (J54) — `E5_ALERT_APIA_SEASONAL` (`queue-registry.ts` L629), catalog `e5:alert:apia-seasonal` (`cognitive-node-catalog.ts` L3255–L3262), worker `j54-alert-apia-seasonal.ts`, `withCognitiveSpan("e5:alert:apia-seasonal", …)` (L104). **Concluzie:** „seasonal” din v2 (content marketing generic) **nu** are worker dedicat; cel mai apropiat pas operațional sezonier în E5 este **alertarea APIA**, nu generarea de conținut editorial.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `content:seasonal:generate` |
| etapa | E5 |
| familie (v2) | `content` |
| mapare operațională (parțială) | `alerts:apia:seasonal` (J54) |
| contract_path | `contracts/neurons/E5/content--seasonal--generate.md` |
| ADR familie (indicativ) | [content](../../adr/families/e5/content.md) |

## Scop în context real

**v2:** generare/transformare conținut sezonier (L7876–L7891). **J54:** detectare evenimente subvenții/programe APIA active și notificări — semantică **alertă**, nu „content asset generation”.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7876–L7896.
- `workers/shared/src/queue-registry.ts` — `E5_ALERT_APIA_SEASONAL` (L629); **fără** `content:seasonal`.
- `packages/shared/src/cognitive-node-catalog.ts` — `e5:alert:apia-seasonal` (L3255–L3262).
- `workers/e5-nurturing/src/workers/j54-alert-apia-seasonal.ts` — coadă + span (L22, L104).
- `rg` — zero potriviri `content:seasonal:generate` în `workers/*.ts`.
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- **L7876–L7896:** `ProceduralNeuron`, span `cognitive.content.seasonal.generate` (L7895).

## N/A pe criterii

- **8 — Rutare model:** N/A pentru v2 bloc (L7892); J54 fără LLM în implementarea citită.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Lipsă** `content:seasonal:generate`. Apropiere: **`alerts:apia:seasonal`**. | v2: `content:seasonal:generate` (L7890). | Familie/colectare diferită (content vs alerts). |
| 2 | Etapă, familie, swimlane | J54: swimlane `alerts-weather` (catalog L3260). | v2: familie `content` (L7878). | — |
| 3 | Rol declarat | „Alertă APIA sezonală J54…” (catalog L3258). | v2: content sezonier (L7886–L7888). | Scop produs diferit. |
| 4 | NeuronType + SOFAI | `SensoryNeuron` (catalog L3259). | v2: `ProceduralNeuron` (L7879). | — |
| 5 | Criticitate | Catalog J54: `MEDIUM` (L3262). | v2: `MEDIUM` (L7883). | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e5:alert:apia-seasonal", …)` (`j54` L104). | v2 span `cognitive.content.seasonal.generate` (L7895). | — |
| 7 | Înveliș politică | Cron daily, concurrency 1 (`j54` L4–5). | v2 Tier 4 (L7884), fără HITL obligatoriu (L7893). | — |
| 8 | Rutare model (dacă AI) | **N/A** în J54 citit. | v2 non-AI (L7892). | — |
| 9 | Guardrails | Logică evenimente APIA + log (`j54`). | v2 L7893. | — |
| 10 | Escaladare HITL | Lanț posibil spre campanii (J55) — în afara acestui contract. | v2 L7893. | — |
| 11 | Micro-OODA | Polling/SELECT evenimente → enqueue notificări. | v2 OODA (L7891). | — |
| 12 | Tier + de-escaladare | — | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E5, Postgres. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.content.seasonal.generate`.
- **Cod (aproximare):** `cognitive:e5:alert:apia-seasonal`.

---
*Audit manual 2026-04-13.*
