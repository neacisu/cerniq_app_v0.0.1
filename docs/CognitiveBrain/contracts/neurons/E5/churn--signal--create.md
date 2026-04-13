<!-- neuron-contract:author-complete -->

# Neuron `churn:signal:create`

> **Status:** audit manual **2026-04-13**. **v2** (L7694–L7714): coadă nominală `churn:signal:create`, `PredictiveNeuron`, churn/recovery. **Repo:** implementarea etapei 5 folosește **`churn:signal:detect`** (B9) — înregistrare `E5_CHURN_SIGNAL_DETECT` în `queue-registry.ts` (L530), catalog `e5:churn:signal-detect` / `churn:signal:detect` (`cognitive-node-catalog.ts` L2834–L2841), worker `b9-churn-signal-detect.ts` cu `withCognitiveSpan("e5:churn:signal-detect", …)` (L42). **Concluzie:** numele v2 „create” nu apare ca literal BullMQ; semantica „creare înregistrări semnal churn” este acoperită de B9 (INSERT `gold_churn_signals` + lanț B10).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `churn:signal:create` |
| etapa | E5 |
| familie (v2) | `churn` |
| coadă runtime (canonică) | `churn:signal:detect` |
| contract_path | `contracts/neurons/E5/churn--signal--create.md` |
| ADR familie (indicativ) | [churn](../../adr/families/e5/churn.md) |

## Scop în context real

**v2:** predicție / detecție semnale churn (OODA: features → scor → clasificare). **Cod B9:** detectare **deterministă** (8 semnale), fără LLM, apoi enqueue `churn:score:calculate`. Produceri incl. H44 (detractor → `churn:signal:detect` — vezi comentariu `h44-feedback-nps-process.ts`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7694–L7714.
- `workers/shared/src/queue-registry.ts` — `E5_CHURN_SIGNAL_DETECT` (L530).
- `packages/shared/src/cognitive-node-catalog.ts` — `e5:churn:signal-detect` (L2834–L2841).
- `workers/e5-nurturing/src/workers/b9-churn-signal-detect.ts` — procesor, span (L42).
- `workers/e5-nurturing/src/__tests__/churn-detection.test.ts` — aserțiuni coadă (ex. L450).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- **L7694–L7714:** Stage E5, family `churn`, `PredictiveNeuron`, câmp coadă v2 `churn:signal:create`, span v2 `cognitive.churn.signal.create`, status export „not yet reconciled with runtime registry”.

## N/A pe criterii

- **8 — Rutare model:** N/A pentru **B9** — fără LLM (antet worker L7–8); v2 menționează vLLM pentru acest bloc — **divergență v2 ↔ cod** pe rutare model.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Registry + catalog + worker: **`churn:signal:detect`** (nu literal `churn:signal:create`). | v2: `churn:signal:create`. | Redenumire graf vs registry. |
| 2 | Etapă, familie, swimlane | Catalog: etapă `5`, swimlane `churn-detection` (L2839). | v2: familie `churn`, E5. | — |
| 3 | Rol declarat | „Detectare semnale churn B9 — rule-based” (catalog L2837). | v2: detecție churn și recuperare (L7705–L7707). | Recuperare = lanț downstream (B10–B11), nu în B9. |
| 4 | NeuronType + SOFAI | `PredictiveNeuron` (catalog L2838). | v2: `PredictiveNeuron` (L7701). | — |
| 5 | Criticitate | Catalog: `HIGH` (L2841). | v2: `MEDIUM` (L7703). | Neconcordanță criticitate. |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e5:churn:signal-detect", …)` → span `cognitive:e5:churn:signal-detect`. | v2: `cognitive.churn.signal.create` (L7713). | Prefix `e5:` și nume diferit față de v2. |
| 7 | Înveliș politică | Concurrency / severitate din registry (metadate cozi E5). | v2 Tier 4, fără HITL obligatoriu (L7704, L7711). | — |
| 8 | Rutare model (dacă AI) | **N/A** (B9 fără LLM). | v2: PRIMARY vllm-fast-14b (L7710). | Text v2 posibil șablon; nu reflectă B9. |
| 9 | Guardrails | Logică deterministă `computeSignalStrengths` (B9). | v2: audit log 90 zile (L7711). | — |
| 10 | Escaladare HITL | B11 / cozi `hitl:*` în lanț churn (nu în B9 direct). | v2: „No mandatory HITL” (L7711). | HITL apare la risc ridicat după scor. |
| 11 | Micro-OODA | OBSERVE context job → ORIENT reguli → DECIDE semnale → ACT insert + enqueue B10. | v2 OODA generic (L7709). | — |
| 12 | Tier + de-escaladare | Retry BullMQ standard; fără prag confidență LLM (non-AI). | v2 Tier 4 (L7704). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Redis DB 5, Postgres (`gold_churn_signals`). | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.churn.signal.create`.
- **Cod:** `cognitive:e5:churn:signal-detect` (primul argument `withCognitiveSpan`).

---
*Audit manual 2026-04-13.*
