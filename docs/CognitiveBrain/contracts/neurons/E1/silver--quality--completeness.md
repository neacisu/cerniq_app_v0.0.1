<!-- neuron-contract:author-complete -->

# Neuron `silver:quality:completeness`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `silver:quality:completeness` |
| etapa | E1 |
| familie (v2, prima instanță) | `quality` |
| contract_path | `contracts/neurons/E1/silver--quality--completeness.md` |
| ADR familie (indicativ) | [quality](../../adr/families/e1/quality.md) |

## Scop în context real

**v2** `silver:quality:completeness` ↔ **`score:completeness`** / **`e1:score:completeness`**. Implementare **deterministă** (ponderi câmp), fără LLM în N1 — divergență față de «model routing» din v2.

## Surse audit

- v2 (~L3007–3027).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:score:completeness` (~L850–856).
- `workers/enrichment/src/main.ts` — ~L163.
- `workers/enrichment/src/workers/n1-score-completeness.ts` — `FIELD_WEIGHTS`, `withCognitiveSpan("e1:score:completeness", …)` (~L56–58).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `silver:quality:completeness` v2; runtime `score:completeness` / `e1:score:completeness`. | v2. | — |
| 2 | Etapă, familie, swimlane | E1; swimlane catalog `dedup-scoring`. | v2 quality. | — |
| 3 | Rol declarat | `n1-score-completeness.ts` — scor ponderat câmpuri (`FIELD_WEIGHTS`, ~L21–47). | v2 completeness. | — |
| 4 | NeuronType + SOFAI | Catalog + v2: `PredictiveNeuron` (clasificare); implementare **deterministă** fără LLM în N1. | v2. | — |
| 5 | Criticitate | `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | `cognitive:e1:score:completeness` (~L56–58). | `cognitive.silver.quality.completeness`. | — |
| 7 | Înveliș politică | Tier 4 v2. | v2. | — |
| 8 | Rutare model (dacă AI) | **N/A** în N1 la audit (fără apel LLM). v2 menționează vLLM — **destinație documentată / divergență**. | v2. | Limită evidență v2 vs cod. |
| 9 | Guardrails | Clamp 0–100; persistare scor. | ADR-0007. | — |
| 10 | Escaladare HITL | Nu direct în N1. | ADR-0008. | — |
| 11 | Micro-OODA | Citire companie → ponderi → scor. | v2. | — |
| 12 | Tier + de-escaladare | N/A LLM. | v2. | — |
| 13 | Stack | BullMQ `score:completeness`, Postgres. | v2. | — |

### Mapare OTel

- **v2:** vezi bloc `### NEURON`.
- **Cod:** indicat în tabel.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
