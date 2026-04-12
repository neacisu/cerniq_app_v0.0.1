<!-- neuron-contract:author-complete -->

# Neuron `pipeline:orchestrator:advance`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `pipeline:orchestrator:advance` |
| etapa | E1 |
| familie (v2, prima instanță) | `orchestrator` |
| contract_path | `contracts/neurons/E1/pipeline--orchestrator--advance.md` |
| ADR familie (indicativ) | [orchestrator](../../adr/families/e1/orchestrator.md) |

## Scop în context real

**v2** → **`pipeline:orchestrator:advance`**. **Cod:** același **`pipeline:orchestrate`**; semantica **advance** = `stage` **`post_enrichment`** și **`post_scoring`** în `p1-orchestrate.ts`.

## Surse audit

- v2 (~L2962–2983).
- `p1-orchestrate.ts` — `handlePostEnrichment`, `handlePostScoring`, procesor comun (~L150–194, ~L209–297).
- Catalog / main ca la contractul **start**.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** `pipeline:orchestrator:advance` literal. **Runtime:** același `pipeline:orchestrate` / `e1:pipeline:orchestrate`. | v2 advance. | — |
| 2 | Etapă, familie, swimlane | E1; `pipeline-control`. | v2. | — |
| 3 | Rol declarat | **Advance:** `post_enrichment` (dedup exact/fuzzy, complete enrichment) ~L150–179; `post_scoring` (completeness + rollup) ~L188–194. | v2 advance. | — |
| 4 | NeuronType + SOFAI | `ExecutiveNeuron`. | v2. | — |
| 5 | Criticitate | Catalog `CRITICAL` pentru `e1:pipeline:orchestrate`; v2 `HIGH`. | v2. | **Divergență**. |
| 6 | Înveliș telemetrie | `cognitive:e1:pipeline:orchestrate`. | `cognitive.pipeline.orchestrator.advance`. | — |
| 7 | Înveliș politică | Tier 3 v2. | v2. | — |
| 8 | Rutare model (dacă AI) | **În P1:** **N/A** la fel ca start; v2 pretinde LLM orchestrator — **divergență**. | v2. | — |
| 9 | Guardrails | Aceleași ca start. | ADR-0007. | — |
| 10 | Escaladare HITL | Nu în P1. | ADR-0008. | — |
| 11 | Micro-OODA | Handlers `post_enrichment` / `post_scoring`. | v2. | — |
| 12 | Tier + de-escaladare | N/A în P1. | v2. | — |
| 13 | Stack | BullMQ; observabilitate durată enrichment ~L162–167. | v2. | — |

### Mapare OTel

- **v2:** `cognitive.pipeline.orchestrator.advance`.
- **Cod:** `cognitive:e1:pipeline:orchestrate`.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
