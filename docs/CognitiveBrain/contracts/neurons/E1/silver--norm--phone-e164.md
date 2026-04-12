<!-- neuron-contract:author-complete -->

# Neuron `silver:norm:phone-e164`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `silver:norm:phone-e164` |
| etapa | E1 |
| familie (v2, prima instanță) | `normalize` |
| contract_path | `contracts/neurons/E1/silver--norm--phone-e164.md` |
| ADR familie (indicativ) | [normalize](../../adr/families/e1/normalize.md) |

## Scop în context real

**v2:** un neuron **`silver:norm:phone-e164`**. **Cod:** două căi — **`normalize:phone`** (B3) și **`enrich:phone:normalize`** (H1), ambele procedurale E.164.

## Surse audit

- v2 (~L2941–2961).
- `cognitive-node-catalog.ts` — `e1:normalize:phone` (~L417–423), `e1:enrich:phone-normalize` (~L649–651).
- `queue-registry.ts` — ~L28, ~L57.
- `main.ts` — ~L123, ~L142.
- `b3-phone-normalizer.ts` — ~L104–106.
- `h1-phone-normalizer.ts` — ~L27–29.

## N/A pe criterii

- **Rând 8:** **N/A**.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Silver enrichment:** `enrich:phone:normalize` / `e1:enrich:phone-normalize` (`h1-phone-normalizer.ts` ~L27–29). **Bronz:** `normalize:phone` / `e1:normalize:phone` (`b3-phone-normalizer.ts` ~L104–106). | v2 `silver:norm:phone-e164`. | Două cozi. |
| 2 | Etapă, familie, swimlane | E1; catalog swimlane `normalization` pentru B3 și H1 (`cognitive-node-catalog.ts` ~L653–654). | v2. | — |
| 3 | Rol declarat | Ambele: normalizare E.164 procedurală (descrieri catalog). | v2. | — |
| 4 | NeuronType + SOFAI | `ProceduralNeuron`. | v2. | — |
| 5 | Criticitate | `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | `cognitive:e1:enrich:phone-normalize` și `cognitive:e1:normalize:phone`. | `cognitive.silver.norm.phone-e164`. | Fără span unic v2. |
| 7 | Înveliș politică | Tier 4 v2. | v2. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | B3/H1 deterministe. | ADR-0007. | — |
| 10 | Escaladare HITL | Nu citit în eșantion. | ADR-0008. | — |
| 11 | Micro-OODA | Număr → E.164 → persistare. | v2. | — |
| 12 | Tier + de-escaladare | N/A LLM. | v2. | — |
| 13 | Stack | BullMQ; registry ~L28, ~L57. | v2. | — |

### Mapare OTel

- **v2:** `cognitive.silver.norm.phone-e164`.
- **Cod:** **două** span-uri; niciunul = literal v2.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
