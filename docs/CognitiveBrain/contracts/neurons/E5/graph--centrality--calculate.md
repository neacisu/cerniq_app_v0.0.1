# Neuron `graph:centrality:calculate`

> **Status:** structură din v2 §6 (2026-04-11). Coloana «În cod (dovadă)» = **placeholder** până la research manual. După DOD, adăugați `<!-- neuron-contract:author-complete -->` ca să blocați regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `graph:centrality:calculate` |
| etapa | E5 |
| familie (v2, prima instanță) | `graph-community` |
| contract_path | `contracts/neurons/E5/graph--centrality--calculate.md` |
| ADR familie (indicativ) | [graph-community](../../adr/families/e5/graph-community.md) |

## Scop în context real

**Scop declarat în v2:** Calcul centralitate D22 — degree/betweenness/pagerank per nod din graph. **Comportament în repo:** neaudit până la research manual (DOD 0): handler BullMQ/API, payload, teste — vezi `_CONTRACT_SCHEMA.md`. Acest text nu trebuie generat sau extins automat de scripturi; doar de autor după dovezi.

## Surse audit

- v2 §6: `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — linia ~8340 (`### NEURON`).
- Schema: [`_CONTRACT_SCHEMA.md`](_CONTRACT_SCHEMA.md).
- Checklist: [`CONTRACT_AUTHORING_CHECKLIST.md`](CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `graph-community` (linia v2 ~8340)

- **Stage:** E5
- **Family:** graph-community
- **Catalog nodeKey:** e5:centrality:calculate
- **Neuron type:** KnowledgeNeuron
- **Swimlane:** graph-community
- **Criticality:** MEDIUM
- **Autonomy tier:** Tier 4 (fully autonomous)
- **Contract evidence status:** catalog-grounded + research-enhanced, cross-referenced with `cognitive-node-catalog.ts`.

### Extras câmpuri v2 (prima instanță)

- **OODA micro-cycle:** OBSERVE: receive storage/retrieval request. ORIENT: query Neo4j/PostgreSQL. DECIDE: cache strategy (Redis TTL). ACT: persist/retrieve knowledge artifacts.
- **Model routing:** Non-AI neuron — deterministic processing, no LLM routing required.
- **Guardrail/HITL policy:** HITL on repeated failure (3+ consecutive errors). SLA: 8h. Audit log retained 90 days.
- **Prometheus metrics:** cerniq_neuron_fires_total{neuron_type="KnowledgeNeuron",stage="E5",swimlane="graph-community"}, cerniq_neuron_duration_seconds{neuron_id="e5:centrality:calculate"}, cerniq_neuron_confidence{neuron_id="e5:centrality:calculate"}
- **OTel span name:** cognitive.e5.centrality.calculate

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. Indiciu mecanic (nu substituie citirea codului): registry literal `nu`; catalog `n(` `nodeKey`: `— (gap)`. | v2: `graph:centrality:calculate`; Catalog nodeKey (v2 bloc): `e5:centrality:calculate` | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 2 | Etapă, familie, swimlane | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Etapă `E5`, familie `graph-community`, swimlane `graph-community` (v2). | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 3 | Rol declarat | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Funcție cognitivă: Calcul centralitate D22 — degree/betweenness/pagerank per nod din graph; analogie: Hipocamp — stocare și recuperare cunoștințe | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 4 | NeuronType + SOFAI (`KnowledgeNeuron`) | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Tip `KnowledgeNeuron` — mapare SOFAI: vezi v2 §2.1; nu forțați System1/2 fără sursă suplimentară. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 5 | Criticitate | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | `MEDIUM` (v2). | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 6 | Înveliș telemetrie | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | OTel span (v2): `cognitive.e5.centrality.calculate`; mapare `cognitive.nodeKey` vs `cognitive.neuron.*`: vezi ADR-0003 + `withCognitiveSpan`. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 7 | Înveliș politică | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Autonomy tier (v2): `Tier 4 (fully autonomous)`; Guardrail/HITL policy (v2): HITL on repeated failure (3+ consecutive errors). SLA: 8h. Audit log retained 90 days. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 8 | Rutare model (dacă AI) | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Non-AI neuron — deterministic processing, no LLM routing required. | N/A — Non-AI în v2 |
| 9 | Guardrails | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | NeMo / verificări deterministe; țintă ADR-0007; detaliu per-neuron numai cu cod. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 10 | Escaladare HITL | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Motor transversal: ADR-0008; cozi `human:*` / `hitl:*`: verificare registry la audit manual. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 11 | Micro-OODA | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | OBSERVE: receive storage/retrieval request. ORIENT: query Neo4j/PostgreSQL. DECIDE: cache strategy (Redis TTL). ACT: persist/retrieve knowledge artifacts. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 12 | Tier + de-escaladare | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Trigger-e (încredere, 2σ, schemă API): invariant numai dacă apare în cod/test la audit. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 13 | Stack v2 §2.3 (subset) | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | BullMQ, Kafka, SGLang, … — versiuni în v2 §2.3 + ADR-uri. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |

### Mapare OTel

- **v2 / plan:** pot menționa `cognitive.neuron.id`, `cognitive.processing.stage`, etc.
- **Cod:** `withCognitiveSpan` — `cognitive.nodeKey`, `cognitive.neuronType`, `cognitive.swimlane`, `cognitive.etapa`, `cognitive.function` (vezi `workers/shared/src/cognitive-helpers.ts`).
- **Stare la 2026-04-11:** neînchis până la research; marcați *aliniat* / *migrare planificată* cu dovezi în tabel.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
