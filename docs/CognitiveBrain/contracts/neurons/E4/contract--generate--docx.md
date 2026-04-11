# Neuron `contract:generate:docx`

> **Status:** structură din v2 §6 (2026-04-11). Coloana «În cod (dovadă)» = **placeholder** până la research manual. După DOD, adăugați `<!-- neuron-contract:author-complete -->` ca să blocați regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `contract:generate:docx` |
| etapa | E4 |
| familie (v2, prima instanță) | `contracts` |
| contract_path | `contracts/neurons/E4/contract--generate--docx.md` |
| ADR familie (indicativ) | [contracts](../../adr/families/e4/contracts.md) |

## Scop în context real

**Scop declarat în v2:** Neuron operațional din E4, familia contracts. **Comportament în repo:** neaudit până la research manual (DOD 0): handler BullMQ/API, payload, teste — vezi `_CONTRACT_SCHEMA.md`. Acest text nu trebuie generat sau extins automat de scripturi; doar de autor după dovezi.

## Surse audit

- v2 §6: `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — linia ~6489 (`### NEURON`).
- Schema: [`_CONTRACT_SCHEMA.md`](_CONTRACT_SCHEMA.md).
- Checklist: [`CONTRACT_AUTHORING_CHECKLIST.md`](CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `contracts` (linia v2 ~6489)

- **Stage:** E4
- **Family:** contracts
- **Inferred neuron type:** ContractNeuron
- **Inferred criticality:** MEDIUM
- **Autonomy tier:** Tier 4 (fully autonomous)
- **Contract evidence status:** graph-export-grounded + architecture-enhanced. Neuron type inferred from family classification. Queue name from graph export (not yet reconciled with runtime registry).

### Extras câmpuri v2 (prima instanță)

- **OODA micro-cycle:** OBSERVE: receive contract trigger. ORIENT: select clauses per risk. DECIDE: generate/send/archive. ACT: DocuSign integration + audit trail.
- **Model routing:** Non-AI neuron — deterministic processing.
- **Guardrail/HITL policy:** No mandatory HITL. Audit log 90 days.
- **Prometheus metrics:** cerniq_neuron_fires_total{neuron_type="ContractNeuron",stage="E4",swimlane="contracts"}
- **OTel span name:** cognitive.contract.generate.docx

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. Indiciu mecanic (nu substituie citirea codului): registry literal `nu`; catalog `n(` `nodeKey`: `— (gap)`. | v2: `contract:generate:docx`; Catalog nodeKey (v2 bloc): `—` | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 2 | Etapă, familie, swimlane | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Etapă `E4`, familie `contracts`, swimlane `—` (v2). | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 3 | Rol declarat | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Funcție cognitivă: Neuron operațional din E4, familia contracts.; analogie: Cortex contractual — generare și execuție contracte digitale DocuSign | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 4 | NeuronType + SOFAI (`ContractNeuron`) | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Tip `ContractNeuron` — mapare SOFAI: vezi v2 §2.1; nu forțați System1/2 fără sursă suplimentară. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 5 | Criticitate | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | `MEDIUM` (v2). | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 6 | Înveliș telemetrie | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | OTel span (v2): `cognitive.contract.generate.docx`; mapare `cognitive.nodeKey` vs `cognitive.neuron.*`: vezi ADR-0003 + `withCognitiveSpan`. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 7 | Înveliș politică | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Autonomy tier (v2): `Tier 4 (fully autonomous)`; Guardrail/HITL policy (v2): No mandatory HITL. Audit log 90 days. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 8 | Rutare model (dacă AI) | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Non-AI neuron — deterministic processing. | N/A — Non-AI în v2 |
| 9 | Guardrails | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | NeMo / verificări deterministe; țintă ADR-0007; detaliu per-neuron numai cu cod. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 10 | Escaladare HITL | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Motor transversal: ADR-0008; cozi `human:*` / `hitl:*`: verificare registry la audit manual. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 11 | Micro-OODA | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | OBSERVE: receive contract trigger. ORIENT: select clauses per risk. DECIDE: generate/send/archive. ACT: DocuSign integration + audit trail. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 12 | Tier + de-escaladare | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | Trigger-e (încredere, 2σ, schemă API): invariant numai dacă apare în cod/test la audit. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |
| 13 | Stack v2 §2.3 (subset) | **TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script. | BullMQ, Kafka, SGLang, … — versiuni în v2 §2.3 + ADR-uri. | v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni. |

### Mapare OTel

- **v2 / plan:** pot menționa `cognitive.neuron.id`, `cognitive.processing.stage`, etc.
- **Cod:** `withCognitiveSpan` — `cognitive.nodeKey`, `cognitive.neuronType`, `cognitive.swimlane`, `cognitive.etapa`, `cognitive.function` (vezi `workers/shared/src/cognitive-helpers.ts`).
- **Stare la 2026-04-11:** neînchis până la research; marcați *aliniat* / *migrare planificată* cu dovezi în tabel.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
