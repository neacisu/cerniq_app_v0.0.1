<!-- neuron-contract:author-complete -->

# Neuron `silver:norm:company-name`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `silver:norm:company-name` |
| etapa | E1 |
| familie (v2, prima instanță) | `normalize` |
| contract_path | `contracts/neurons/E1/silver--norm--company-name.md` |
| ADR familie (indicativ) | [normalize](../../adr/families/e1/normalize.md) |

## Scop în context real

**v2** → **`silver:norm:company-name`**. **Cod:** **`normalize:name`** / **`e1:normalize:name`** în `b1-name-normalizer.ts`.

## Surse audit

- v2 — `### NEURON \`silver:norm:company-name\`` (~L2897–2917).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:normalize:name` (~L398–405).
- `workers/shared/src/queue-registry.ts` — `NORMALIZE_NAME` (~L26).
- `workers/enrichment/src/main.ts` — ~L121.
- `workers/enrichment/src/workers/b1-name-normalizer.ts` — ~L194–196.

## N/A pe criterii

- **Rând 8:** **N/A**.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `silver:norm:company-name` v2; catalog `e1:normalize:name` / `normalize:name`; registry `NORMALIZE_NAME`. | v2. | — |
| 2 | Etapă, familie, swimlane | E1; `normalization`. | v2. | — |
| 3 | Rol declarat | `b1-name-normalizer.ts` — normalizare nume companie/persoană (catalog). | v2 company-name. | — |
| 4 | NeuronType + SOFAI | `ProceduralNeuron`. | v2. | — |
| 5 | Criticitate | `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e1:normalize:name", …)` (~L194–196). | `cognitive.silver.norm.company-name`. | Nume span ≠ v2. |
| 7 | Înveliș politică | Tier 4 v2. | v2. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Reguli deterministe în B1. | ADR-0007. | — |
| 10 | Escaladare HITL | Nu în B1 la audit rapid. | ADR-0008. | — |
| 11 | Micro-OODA | Input → reguli → output normalizat. | v2. | — |
| 12 | Tier + de-escaladare | Fără LLM. | v2. | — |
| 13 | Stack | BullMQ `normalize:name`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.silver.norm.company-name`.
- **Cod:** `cognitive:e1:normalize:name`.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
