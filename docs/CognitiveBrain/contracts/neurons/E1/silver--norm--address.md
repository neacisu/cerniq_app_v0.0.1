<!-- neuron-contract:author-complete -->

# Neuron `silver:norm:address`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `silver:norm:address` |
| etapa | E1 |
| familie (v2, prima instanță) | `normalize` |
| contract_path | `contracts/neurons/E1/silver--norm--address.md` |
| ADR familie (indicativ) | [normalize](../../adr/families/e1/normalize.md) |

## Scop în context real

**v2** folosește **`silver:norm:address`**. **Runtime:** coada **`normalize:address`**, procesor **`addressNormalizerProcessor`** (`b4-address-normalizer.ts`), span **`e1:normalize:address`**. Denumirea cozii din registry diferă de șirul v2.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`silver:norm:address\`` (~L2875–2895).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:normalize:address` (~L408–414).
- `workers/shared/src/queue-registry.ts` — `NORMALIZE_ADDRESS` (~L27).
- `workers/enrichment/src/main.ts` — `"normalize:address"` (~L124).
- `workers/enrichment/src/workers/b4-address-normalizer.ts` — `withCognitiveSpan("e1:normalize:address", …)` (~L88–90).

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `v2_queue` `silver:norm:address`; catalog `e1:normalize:address` / `normalize:address`; registry `QUEUES.NORMALIZE_ADDRESS`. | v2 canonic. | Denumire v2 ≠ `queueName`. |
| 2 | Etapă, familie, swimlane | E1; swimlane catalog `normalization`. | v2 normalize. | — |
| 3 | Rol declarat | Catalog: «Normalizare și standardizare adrese»; `b4-address-normalizer.ts`. | v2 procedural standardizare. | — |
| 4 | NeuronType + SOFAI | `ProceduralNeuron` în catalog și v2. | v2 §2.1. | — |
| 5 | Criticitate | `MEDIUM` (ambele). | v2. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e1:normalize:address", …)` → `cognitive:e1:normalize:address`. | `cognitive.silver.norm.address` în v2. | Nume span ≠ string punctat v2. |
| 7 | Înveliș politică | Tier 4 v2; fără Cedar în eșantionul citit. | v2. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Reguli deterministe mapare județ/stradă etc. în `b4-address-normalizer.ts`. | ADR-0007. | — |
| 10 | Escaladare HITL | Fără HITL obligatoriu în fluxul B4 citit. | ADR-0008. | — |
| 11 | Micro-OODA | Citire payload → reguli → scriere normalizat. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Fără prag LLM. | v2. | — |
| 13 | Stack | BullMQ `normalize:address`, Postgres bronze/silver conform procesorului. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.silver.norm.address`.
- **Cod:** `cognitive:e1:normalize:address`.
- **Stare:** **aliniat semantic**; **nealinat** literal punctat v2 vs `nodeKey`.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
