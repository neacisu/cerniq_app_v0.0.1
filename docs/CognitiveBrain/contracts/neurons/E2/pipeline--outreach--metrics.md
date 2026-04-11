# Neuron `pipeline:outreach:metrics`

> **Status:** structură din v2 §6 (2026-04-11). Coloana «În cod (dovadă)» = **placeholder** până la research manual. După DOD, adăugați `<!-- neuron-contract:author-complete -->` ca să blocați regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `pipeline:outreach:metrics` |
| etapa | E2 |
| familie (v2, prima instanță) | `monitoring` |
| contract_path | `contracts/neurons/E2/pipeline--outreach--metrics.md` |
| ADR familie (indicativ) | [monitoring](../../adr/families/e2/monitoring.md) |

## Scop în context real

**Scop declarat în v2:** Colectare și agregare metrici outreach. **Comportament în repo:** neaudit până la research manual (DOD 0): handler BullMQ/API, payload, teste — vezi `_CONTRACT_SCHEMA.md`. Acest text nu trebuie generat sau extins automat de scripturi; doar de autor după dovezi.

## Surse audit

- v2 §6: `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — linia ~3716 (`### NEURON`).
- Schema: [`_CONTRACT_SCHEMA.md`](_CONTRACT_SCHEMA.md).
- Checklist: [`CONTRACT_AUTHORING_CHECKLIST.md`](CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `monitoring` (linia v2 ~3716)

- **Stage:** E2
- **Family:** monitoring
- **Catalog nodeKey:** e2:pipeline:outreach-metrics
- **Neuron type:** AttentionNeuron
- **Swimlane:** pipeline-control
- **Criticality:** MEDIUM
- **Autonomy tier:** Tier 4 (fully autonomous)
- **Contract evidence status:** catalog-grounded + research-enhanced, cross-referenced with `cognitive-node-catalog.ts`.

### Extras câmpuri v2 (prima instanță)

- **OODA micro-cycle:** OBSERVE: poll metrics/health endpoints. ORIENT: compare against baseline thresholds. DECIDE: normal/warning/critical. ACT: emit alert or trigger corrective action.
- **Model routing:** Non-AI neuron — deterministic processing, no LLM routing required.
- **Guardrail/HITL policy:** HITL on repeated failure (3+ consecutive errors). SLA: 8h. Audit log retained 90 days.
- **Prometheus metrics:** cerniq_neuron_fires_total{neuron_type="AttentionNeuron",stage="E2",swimlane="pipeline-control"}, cerniq_neuron_duration_seconds{neuron_id="e2:pipeline:outreach-metrics"}, cerniq_neuron_confidence{neuron_id="e2:pipeline:outreach-metrics"}
- **OTel span name:** cognitive.e2.pipeline.outreach-metrics

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. Indiciu mecanic (nu substituie citirea codului): registry literal `da`; catalog `n(` `nodeKey`: `e2:pipeline:outreach-metrics`. | v2: `pipeline:outreach:metrics`; Catalog nodeKey (v2 bloc): `e2:pipeline:outreach-metrics` | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 2 | Etapă, familie, swimlane | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Etapă `E2`, familie `monitoring`, swimlane `pipeline-control` (v2). | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 3 | Rol declarat | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Funcție cognitivă: Colectare și agregare metrici outreach; analogie: Formațiune reticulară — vigilență și detectare anomalii | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 4 | NeuronType + SOFAI (`AttentionNeuron`) | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Tip `AttentionNeuron` — mapare SOFAI: vezi v2 §2.1; nu forțați System1/2 fără sursă suplimentară. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 5 | Criticitate | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | `MEDIUM` (v2). | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 6 | Înveliș telemetrie | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | OTel span (v2): `cognitive.e2.pipeline.outreach-metrics`; mapare `cognitive.nodeKey` vs `cognitive.neuron.*`: vezi ADR-0003 + `withCognitiveSpan`. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 7 | Înveliș politică | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Autonomy tier (v2): `Tier 4 (fully autonomous)`; Guardrail/HITL policy (v2): HITL on repeated failure (3+ consecutive errors). SLA: 8h. Audit log retained 90 days. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 8 | Rutare model (dacă AI) | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Non-AI neuron — deterministic processing, no LLM routing required. | N/A — Non-AI în v2 |
| 9 | Guardrails | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | NeMo / verificări deterministe; țintă ADR-0007; detaliu per-neuron numai cu cod. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 10 | Escaladare HITL | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Motor transversal: ADR-0008; cozi `human:*` / `hitl:*`: verificare registry la audit manual. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 11 | Micro-OODA | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | OBSERVE: poll metrics/health endpoints. ORIENT: compare against baseline thresholds. DECIDE: normal/warning/critical. ACT: emit alert or trigger corrective action. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 12 | Tier + de-escaladare | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Trigger-e (încredere, 2σ, schemă API): invariant numai dacă apare în cod/test la audit. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 13 | Stack v2 §2.3 (subset) | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | BullMQ, Kafka, SGLang, … — versiuni în v2 §2.3 + ADR-uri. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |

### Mapare OTel

- **v2 / plan:** pot menționa `cognitive.neuron.id`, `cognitive.processing.stage`, etc.
- **Cod:** `withCognitiveSpan` — `cognitive.nodeKey`, `cognitive.neuronType`, `cognitive.swimlane`, `cognitive.etapa`, `cognitive.function` (vezi `workers/shared/src/cognitive-helpers.ts`).
- **Stare la 2026-04-11:** neînchis până la research; marcați *aliniat* / *migrare planificată* cu dovezi în tabel.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
