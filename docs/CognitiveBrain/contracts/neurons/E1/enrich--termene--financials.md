<!-- neuron-contract:author-complete -->

# Neuron `enrich:termene:financials`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:termene:financials` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--termene--financials.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** înregistrează `enrich:termene:financials` (ToolNeuron, Non-AI, span `cognitive.enrich.termene.financials`). **Nu** există coadă BullMQ, `nodeKey` sau client API separat pentru acest literal. **Aceeași capacitate operațională** ca «bilanț / indicatori financiari din Termene» este implementată o singură dată ca **`enrich:termene:balance`** → `e1:enrich:termene-balance` → endpoint **`/firme/{cui}/bilant`** (`getTermeneBalance`, `e1-termene-balance.ts`). **Contractul `enrich--termene--balance-sheet`** documentează același handler. **Concluzie:** «financials» v2 este **neinstanțiat ca unitate separată**; datele disponibile provin din fluxul **balance**; granularitatea v2 (balance-sheet vs financials) **nu** se reflectă în două cozi distincte.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:termene:financials\`` (~L2479–2498).
- `packages/shared/src/cognitive-node-catalog.ts` — **fără** intrare pentru `enrich:termene:financials`; există doar cele patru cozi Termene: balance, risk, dosare, actionari (~L524–560).
- `workers/shared/src/queue-registry.ts` — aceleași patru chei (~L44–47).
- `workers/enrichment/src/main.ts` — **fără** `enrich:termene:financials` (~L129–132).
- `workers/enrichment/src/lib/termene-api-client.ts` — patru funcții exportate; **fără** `financials` dedicat (~L159–173).
- `workers/enrichment/src/workers/e1-termene-balance.ts` — sursa unică pentru date `/bilant` (~L48–104).
- `rg` literal `enrich:termene:financials` — v2, matrice, specificații; **fără** procesor TS.

## Instanțe v2

- **OTel v2:** `cognitive.enrich.termene.financials`.
- **Cod:** acoperire indirectă prin `e1:enrich:termene-balance` (aceeași sursă ca `balance-sheet` v2).

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** `enrich:termene:financials`. Cel mai apropiat runtime: `e1:enrich:termene-balance` (partajat cu alt neuron v2). | v2 queue financials. | Două neuroni v2 → o coadă. |
| 2 | Etapă, familie, swimlane | Prin balance: E1, `enrichment-external`. | v2 E1 enrichment. | — |
| 3 | Rol declarat | Catalog descrie bilanț la balance; «financials» v2 fără descriere distinctă în cod. | v2 text generic enrichment. | — |
| 4 | NeuronType + SOFAI | Prin balance: `ToolNeuron`. | v2 ToolNeuron. | — |
| 5 | Criticitate | Prin balance: catalog `HIGH`; v2 `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | Span real `e1:enrich:termene-balance`; v2 `cognitive.enrich.termene.financials`. | ADR-0003. | Nealinat. |
| 7 | Înveliș politică | Politici ale procesorului balance (fără HITL). | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Cele ale fluxului balance. | ADR-0007. | — |
| 10 | Escaladare HITL | Fără în balance. | ADR-0008. | — |
| 11 | Micro-OODA | Identic flux balance. | v2 OODA generic. | — |
| 12 | Tier + de-escaladare | Fără prag explicit în balance. | v2 §2.2. | — |
| 13 | Stack | BullMQ + Termene bilant + Postgres. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.enrich.termene.financials` — **fără** handler dedicat.
- **Cod:** telemetrie pe `e1:enrich:termene-balance` când rulează orchestrarea Termene.
- **Stare:** **nealinat**; unificare naming în fază 2 recomandată.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
