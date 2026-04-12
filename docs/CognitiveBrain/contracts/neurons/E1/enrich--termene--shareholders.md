<!-- neuron-contract:author-complete -->

# Neuron `enrich:termene:shareholders`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:termene:shareholders` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--termene--shareholders.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** folosește `enrich:termene:shareholders` (span `cognitive.enrich.termene.shareholders`). **Runtime:** coada **`enrich:termene:actionari`** — `e1:enrich:termene-actionari`, procesor `termeneAssociatesProcessor` în `e4-termene-associates.ts` (log «e4-termene-associates»). Apelează `getTermeneActionari` → `/firme/{cui}/actionari`, integrează contacte silver via `upsertSilverContact`. **Concluzie:** «shareholders» v2 = **acționariat Termene**, implementat ca **`actionari`** în cod (limbaj românesc în registry).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:termene:shareholders\`` (~L2545–2564).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:enrich:termene-actionari` (~L552–559).
- `workers/shared/src/queue-registry.ts` — `ENRICH_TERMENE_ACTIONARI` (~L47).
- `workers/enrichment/src/main.ts` — `"enrich:termene:actionari"` (~L132).
- `workers/enrichment/src/workers/p1-orchestrate.ts` (~L114).
- `workers/enrichment/src/lib/termene-api-client.ts` — `getTermeneActionari` (~L171–173).
- `workers/enrichment/src/workers/e4-termene-associates.ts` — `withCognitiveSpan("e1:enrich:termene-actionari", …)` (~L21–24); `upsertSilverContact` (~L7).
- `workers/enrichment/src/lib/termene-api-client.test.ts` — actionari (~L99+).

## Instanțe v2

- **OTel v2:** `cognitive.enrich.termene.shareholders`.
- **OTel cod:** `e1:enrich:termene-actionari`.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** literal `enrich:termene:shareholders`. Runtime: `e1:enrich:termene-actionari` ↔ `enrich:termene:actionari`. | v2 shareholders. | EN «shareholders» vs RO «actionari». |
| 2 | Etapă, familie, swimlane | Catalog: E1, `enrichment-external`. | v2 E1 enrichment. | — |
| 3 | Rol declarat | «Extragere structură acționariat de la Termene.ro». | v2. | — |
| 4 | NeuronType + SOFAI | `ToolNeuron`. | v2 ToolNeuron. | — |
| 5 | Criticitate | Catalog `HIGH`; v2 `MEDIUM`. | v2. | Divergență. |
| 6 | Înveliș telemetrie | Span `e1:enrich:termene-actionari` vs v2 `cognitive.enrich.termene.shareholders`. | ADR-0003. | Nealinat literal. |
| 7 | Înveliș politică | API Termene + upsert contacte; fără HITL în handler. | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Validare CUI, logging. | ADR-0007. | — |
| 10 | Escaladare HITL | Fără. | ADR-0008. | — |
| 11 | Micro-OODA | Fetch actionari → normalizare → DB silver. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Fără prag explicit. | v2 §2.2. | — |
| 13 | Stack | BullMQ, HTTP Termene, Postgres. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.enrich.termene.shareholders`.
- **Cod:** `e1:enrich:termene-actionari`.
- **Stare:** **nealinat** (nume).

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
