<!-- neuron-contract:author-complete -->

# Neuron `churn:behavior:detect`

> **Status:** audit manual **2026-04-13**. v2 L7600–7623: **Confirmed queue field** graf `churn:behavior:detect`, dar catalog + registry folosesc **`decay:behavior:detect`**, `nodeKey` **`e5:decay:behavior-detect`**, worker B14 [`b14-decay-behavior-detect.ts`](../../../../../workers/e5-nurturing/src/workers/b14-decay-behavior-detect.ts). **Prioritate dovezi runtime:** `decay:behavior:detect`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (etichetă graf) | `churn:behavior:detect` |
| coadă BullMQ | `decay:behavior:detect` |
| etapa | E5 |
| familie (v2) | `churn` |
| contract_path | `contracts/neurons/E5/churn--behavior--detect.md` |
| ADR familie (indicativ) | [churn](../../adr/families/e5/churn.md) |

## Scop în context real

Detectare pattern „behavioral decay” (frecvență comenzi + engagement) — descriere catalog B14; procesor cu `withCognitiveSpan("e5:decay:behavior-detect", …)`.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L7600–7623 (atenție: câmp „Confirmed queue” vs catalog).
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e5:decay:behavior-detect` / `decay:behavior:detect` (~L2879–2886).
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E5_DECAY_BEHAVIOR_DETECT` (~L540).
- Handler: [`b14-decay-behavior-detect.ts`](../../../../../workers/e5-nurturing/src/workers/b14-decay-behavior-detect.ts).
- Teste: [`churn-detection.test.ts`](../../../../../workers/e5-nurturing/src/__tests__/churn-detection.test.ts) — enumeră cozi.
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `churn` (v2 L7600–7623)

- **Catalog nodeKey:** `e5:decay:behavior-detect`
- **Neuron type:** PredictiveNeuron
- **Swimlane:** `churn-detection`
- **Criticitate:** HIGH
- **Model routing (v2):** vLLM + SGLang structured (L7619)
- **OTel (v2):** `cognitive.e5.decay.behavior-detect`
- **Evidence status:** catalog-grounded (L7623)

## N/A pe criterii

- — (AI: da în v2; verificați implementarea LLM în B14 complet).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Coadă: `decay:behavior:detect`. Graf: `churn:behavior:detect`. | v2 L7617 vs L7607. | **Nealiniere** între „Confirmed queue” graf și catalog. |
| 2 | Etapă, familie, swimlane | Etapa 5, `churn-detection`. | v2 E5 churn. | — |
| 3 | Rol declarat | Catalog + antet B14. | v2 L7614–7616. | — |
| 4 | NeuronType + SOFAI | PredictiveNeuron. | v2 L7608. | — |
| 5 | Criticitate | HIGH. | v2 L7611. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e5:decay:behavior-detect", …)` (B14 ~L63). | v2 L7621–7622. | Aliniat catalog. |
| 7 | Înveliș politică | — | v2 L7620. | — |
| 8 | Rutare model (dacă AI) | Verificare în corpul B14 pentru apeluri LLM. | v2 L7619. | Audit antet + span; detaliu model: citire completă B14. |
| 9 | Guardrails | — | v2 HITL confidence. | — |
| 10 | Escaladare HITL | — | v2 L7620. | — |
| 11 | Micro-OODA | — | v2 L7618. | — |
| 12 | Tier + de-escaladare | — | v2 Tier 3. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E5, Redis DB 5. | — | — |

### Mapare OTel

- **v2:** `cognitive.e5.decay.behavior-detect`.
- **Cod:** `cognitive:e5:decay:behavior-detect` — concordant cu `withCognitiveSpan`.

---
*Audit manual 2026-04-13.*
