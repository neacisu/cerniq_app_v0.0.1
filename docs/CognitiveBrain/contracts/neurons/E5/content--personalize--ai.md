<!-- neuron-contract:author-complete -->

# Neuron `content:personalize:ai`

> **Status:** audit manual **2026-04-13**. **v2** (L7854–L7874): coadă `content:personalize:ai`, `ProceduralNeuron`, mențiuni rutare LLM (L7868–L7869). **Repo:** **nu** există literal `content:personalize:ai` în registry. Pasul I50 implementat ca **`content:template:render`** — `E5_CONTENT_TEMPLATE_RENDER` (`queue-registry.ts` L620), catalog `e5:content:template-render` (`cognitive-node-catalog.ts` L3217–L3224), worker `i50-content-template-render.ts` — comentariu explicit **„NU genera conținut cu LLM”** (L13–15), `withCognitiveSpan("e5:content:template-render", …)` (L102). **Concluzie:** personalizarea este **deterministă (șabloane + interpolare)**; eticheta v2 „AI” nu reflectă implementarea curentă.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `content:personalize:ai` |
| coadă runtime | `content:template:render` |
| etapa | E5 |
| familie (v2) | `content` |
| contract_path | `contracts/neurons/E5/content--personalize--ai.md` |
| ADR familie (indicativ) | [content](../../adr/families/e5/content.md) |

## Scop în context real

Randare template cu variabile client (`{{clientName}}`, …) și dispatch către orchestrator outreach — vezi `i50-content-template-render.ts`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7854–L7874.
- `workers/shared/src/queue-registry.ts` — `E5_CONTENT_TEMPLATE_RENDER` (L620).
- `packages/shared/src/cognitive-node-catalog.ts` — `e5:content:template-render` (L3217–L3224).
- `workers/e5-nurturing/src/workers/i50-content-template-render.ts` — fără LLM (L13–15, L102).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- **L7854–L7874:** `content:personalize:ai`, rutare LLM în v2 (L7868–L7869), span `cognitive.content.personalize.ai` (L7873).

## N/A pe criterii

- —

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`content:template:render`** + `e5:content:template-render`. | v2: `content:personalize:ai` (L7868). | Nume coadă diferit; fără „ai” în literal. |
| 2 | Etapă, familie, swimlane | Catalog: etapă 5, `content-drip` (L3222–L3223). | v2: E5, `content` (L7857–L7858). | — |
| 3 | Rol declarat | „Render template I50 — personalizare conținut cu date client” (catalog L3220). | v2: personalizare AI (L7861–L7863). | Implementare fără LLM. |
| 4 | NeuronType + SOFAI | `DeliberativeNeuron` (catalog L3221). | v2: `ProceduralNeuron` (L7859). | Tip diferit. |
| 5 | Criticitate | Catalog: `LOW` (L3223). | v2: `MEDIUM` (L7863). | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e5:content:template-render", …)` (L102). | v2 span `cognitive.content.personalize.ai` (L7873). | — |
| 7 | Înveliș politică | Concurrency 10 (antet I50 L4). | v2 Tier 4 (L7864), fără HITL obligatoriu (L7870). | — |
| 8 | Rutare model (dacă AI) | **Fără LLM** în I50 (L13–15). | v2: PRIMARY vllm-fast-14b + fallback (L7868–L7869). | **Divergență majoră** v2 ↔ cod. |
| 9 | Guardrails | Variabile permise limitate (antet I50 L7–10). | v2 L7870. | — |
| 10 | Escaladare HITL | Nu în I50; downstream orchestrator. | v2 L7870. | — |
| 11 | Micro-OODA | Template → interpolare → enqueue dispatch. | v2 OODA (L7867). | — |
| 12 | Tier + de-escaladare | — | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Postgres, fără apel inference în I50. | v2 §2.3 (SGLang etc.). | Stack AI din v2 nefolosit în I50. |

### Mapare OTel

- **v2:** `cognitive.content.personalize.ai`.
- **Cod:** `cognitive:e5:content:template-render`.

---
*Audit manual 2026-04-13.*
