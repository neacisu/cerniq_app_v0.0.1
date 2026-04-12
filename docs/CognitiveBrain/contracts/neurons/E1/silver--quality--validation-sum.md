<!-- neuron-contract:author-complete -->

# Neuron `silver:quality:validation-sum`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `silver:quality:validation-sum` |
| etapa | E1 |
| familie (v2, prima instanță) | `quality` |
| contract_path | `contracts/neurons/E1/silver--quality--validation-sum.md` |
| ADR familie (indicativ) | [quality](../../adr/families/e1/quality.md) |

## Scop în context real

**v2** `silver:quality:validation-sum` — în cod, **aceeași rulare O2** calculează **totalul ponderat** al scorurilor de calitate (sumă de validare agregată).

## Surse audit

- v2 (~L3051–3071).
- `o2-quality-rollup.ts` — formula `total` ~L55–58, persistare ~L76–94.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** literal `silver:quality:validation-sum`. **Sumă ponderată:** aceeași rulare O2 — `total = round(completeness*0.4 + accuracy*0.35 + freshness*0.25)` ~L55–58. | v2 validation-sum. | Împărțit logic cu tier-assign. |
| 2 | Etapă, familie, swimlane | E1. | v2. | — |
| 3 | Rol declarat | Agregă scoruri parțiale într-un total numeric. | v2. | — |
| 4 | NeuronType + SOFAI | ProceduralNeuron în catalog pentru rollup; v2 PredictiveNeuron. | v2. | — |
| 5 | Criticitate | Catalog `LOW`; v2 `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | `cognitive:e1:aggregate:quality-rollup`. | `cognitive.silver.quality.validation-sum`. | — |
| 7 | Înveliș politică | Folosit pentru decizii eligibilitate în același job. | v2. | — |
| 8 | Rutare model (dacă AI) | **N/A**; v2 LLM — **divergență**. | v2. | — |
| 9 | Guardrails | Rotunjire `Math.round`. | ADR-0007. | — |
| 10 | Escaladare HITL | Indirect prin tier-assign din același job. | ADR-0008. | — |
| 11 | Micro-OODA | Sumă ponderată → persistare `totalQualityScore`. | v2. | — |
| 12 | Tier + de-escaladare | Legat de praguri tier. | v2. | — |
| 13 | Stack | Postgres `silverCompanies` câmpuri scor. | v2. | — |

### Mapare OTel

- **v2:** vezi bloc `### NEURON`.
- **Cod:** indicat în tabel.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
