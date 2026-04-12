<!-- neuron-contract:author-complete -->

# Neuron `enrich:termene:risk-score`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:termene:risk-score` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--termene--risk-score.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** definește `enrich:termene:risk-score` (span `cognitive.enrich.termene.risk-score`). **Runtime:** **`enrich:termene:risk`** — `e1:enrich:termene-risk`, procesor `termeneRiskProcessor` în `e2-termene-risk.ts` (service log «e2-termene-risk», `etapa` job `e1`). Apelează `getTermeneRisk` → API `/firme/{cui}/scor-risc`, mapează categorie risc din scor numeric. **Concluzie:** acoperire semantică directă; **diferență de nume** între v2 «risk-score» și registry «risk».

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:termene:risk-score\`` (~L2523–2542).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:enrich:termene-risk` (~L534–541).
- `workers/shared/src/queue-registry.ts` — `ENRICH_TERMENE_RISK` (~L45).
- `workers/enrichment/src/main.ts` — `"enrich:termene:risk"` (~L130).
- `workers/enrichment/src/workers/p1-orchestrate.ts` (~L112).
- `workers/enrichment/src/lib/termene-api-client.ts` — `getTermeneRisk` (~L163–165).
- `workers/enrichment/src/workers/e2-termene-risk.ts` — `withCognitiveSpan("e1:enrich:termene-risk", …)` (~L26–29); `mapRiskCategory` (~L20–24).
- `workers/enrichment/src/lib/termene-api-client.test.ts` — risk (~L64–68).

## Instanțe v2

- **OTel v2:** `cognitive.enrich.termene.risk-score`.
- **OTel cod:** `e1:enrich:termene-risk`.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** literal `enrich:termene:risk-score`. Runtime: `e1:enrich:termene-risk` ↔ `enrich:termene:risk`. | v2 risk-score. | Nume v2 ≠ registry. |
| 2 | Etapă, familie, swimlane | Catalog: E1, `enrichment-external`. | v2 E1 enrichment. | — |
| 3 | Rol declarat | «Evaluare scor risc de la Termene.ro». | v2. | — |
| 4 | NeuronType + SOFAI | `ToolNeuron`. | v2 ToolNeuron. | — |
| 5 | Criticitate | Catalog `HIGH`; v2 `MEDIUM`. | v2. | Divergență. |
| 6 | Înveliș telemetrie | Span `e1:enrich:termene-risk` vs v2 `cognitive.enrich.termene.risk-score`. | ADR-0003. | Nealinat literal. |
| 7 | Înveliș politică | API Termene; fără HITL în handler. | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Validare CUI, logging. | ADR-0007. | — |
| 10 | Escaladare HITL | Fără. | ADR-0008. | — |
| 11 | Micro-OODA | Fetch scor → categorie → persistare silver. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Fără prag încredere explicit. | v2 §2.2. | — |
| 13 | Stack | BullMQ, HTTP Termene, Postgres. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.enrich.termene.risk-score`.
- **Cod:** `e1:enrich:termene-risk`.
- **Stare:** **nealinat** (nume).

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
