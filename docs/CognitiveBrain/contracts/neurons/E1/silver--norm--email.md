<!-- neuron-contract:author-complete -->

# Neuron `silver:norm:email`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `silver:norm:email` |
| etapa | E1 |
| familie (v2, prima instanță) | `normalize` |
| contract_path | `contracts/neurons/E1/silver--norm--email.md` |
| ADR familie (indicativ) | [normalize](../../adr/families/e1/normalize.md) |

## Scop în context real

**v2** `silver:norm:email` ↔ runtime **`normalize:email`** (`b2-email-normalizer.ts`, span `e1:normalize:email`).

## Surse audit

- v2 (~L2919–2939).
- `packages/shared/src/cognitive-node-catalog.ts` ~L426–431.
- `workers/shared/src/queue-registry.ts` ~L29.
- `workers/enrichment/src/main.ts` ~L122.
- `workers/enrichment/src/workers/b2-email-normalizer.ts` ~L172–174.

## N/A pe criterii

- **Rând 8:** **N/A**.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `silver:norm:email` v2; `e1:normalize:email` / `normalize:email`; `NORMALIZE_EMAIL`. | v2. | — |
| 2 | Etapă, familie, swimlane | E1; `normalization`. | v2. | — |
| 3 | Rol declarat | `b2-email-normalizer.ts` — lowercase/trim (catalog). | v2. | — |
| 4 | NeuronType + SOFAI | `ProceduralNeuron`. | v2. | — |
| 5 | Criticitate | `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e1:normalize:email", …)` (~L172–174). | `cognitive.silver.norm.email`. | — |
| 7 | Înveliș politică | Tier 4. | v2. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Validări email în B2. | ADR-0007. | — |
| 10 | Escaladare HITL | Nu citit în B2. | ADR-0008. | — |
| 11 | Micro-OODA | Determinist. | v2. | — |
| 12 | Tier + de-escaladare | N/A LLM. | v2. | — |
| 13 | Stack | BullMQ `normalize:email`. | v2. | — |

### Mapare OTel

- **v2:** `cognitive.silver.norm.email`.
- **Cod:** `cognitive:e1:normalize:email`.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
