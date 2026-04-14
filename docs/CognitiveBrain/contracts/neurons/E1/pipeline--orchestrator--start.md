<!-- neuron-contract:author-complete -->

# Neuron `pipeline:orchestrator:start`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `pipeline:orchestrator:start` |
| etapa | E1 |
| familie (v2, prima instanță) | `orchestrator` |
| contract_path | `contracts/neurons/E1/pipeline--orchestrator--start.md` |
| ADR familie (indicativ) | [orchestrator](../../adr/families/e1/orchestrator.md) |

## Scop în context real

**v2** separă **start** și **advance** pentru orchestrator. **Cod:** un singur procesor **`pipelineOrchestratorProcessor`** pe coada **`pipeline:orchestrate`**, cu câmp **`stage`**. Acest contract acoperă semantica **start** prin handlerul **`post_validation`** (primul pas de orchestrare după validare).

## Surse audit

- v2 (~L2985–3005).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:pipeline:orchestrate` (~L899–905).
- `workers/enrichment/src/main.ts` — ~L168.
- `workers/enrichment/src/workers/p1-orchestrate.ts` — `stageHandlers`, `handlePostValidation` (~L84–147), procesor (~L209–297).

## N/A pe criterii

- **Fără** rând N/A obligatoriu suplimentar; rând 8 tratează absența LLM în P1.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** `pipeline:orchestrator:start` literal. **Runtime:** `pipeline:orchestrate`, `e1:pipeline:orchestrate` (`p1-orchestrate.ts` ~L209–212). | v2 start. | Un worker, trei `stage`. |
| 2 | Etapă, familie, swimlane | E1; catalog `pipeline-control` pentru orchestrate. | v2 orchestrator. | — |
| 3 | Rol declarat | **Start (mapare logică):** `post_validation` — enfilează cozi ANAF/Termene/ONRC, discover email, geocode, apia, scrape, `ai:structure:xai` (~L84–147). | v2 start DAG. | — |
| 4 | NeuronType + SOFAI | Catalog: `ExecutiveNeuron` pentru `e1:pipeline:orchestrate`. v2: `ExecutiveNeuron`. | v2. | — |
| 5 | Criticitate | Catalog `e1:pipeline:orchestrate`: `CRITICAL` (~L901–905). v2 antet orchestrator: `HIGH`. | v2. | **Divergență** criticitate catalog vs v2. |
| 6 | Înveliș telemetrie | `cognitive:e1:pipeline:orchestrate`. | `cognitive.pipeline.orchestrator.start`. | Sub-neuron v2 fără span. |
| 7 | Înveliș politică | v2 Tier 3; cod determinist fără OPA citit. | v2. | — |
| 8 | Rutare model (dacă AI) | **În P1:** **N/A** — fără apel LLM în `p1-orchestrate.ts` la audit; enfilează `ai:structure:xai` separat. v2 menționează rutare LLM pentru orchestrator — **destinație documentată / divergență**. | v2 §2.3 rutare. | Limită evidență: v2 vs cod. |
| 9 | Guardrails | Zod `orchestratorJobDataSchema`; metrici `silverEnrichmentErrorsTotal`. | ADR-0007. | — |
| 10 | Escaladare HITL | Nu direct în P1 citit. | ADR-0008. | — |
| 11 | Micro-OODA | Stage `post_validation` observă snapshot companie → decide cozi. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Fără prag încredere în P1. | v2. | — |
| 13 | Stack | BullMQ `addQueueJob`, Postgres `silverCompanies`. | v2. | — |

### Mapare OTel

- **v2:** `cognitive.pipeline.orchestrator.start`.
- **Cod:** `cognitive:e1:pipeline:orchestrate`.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
