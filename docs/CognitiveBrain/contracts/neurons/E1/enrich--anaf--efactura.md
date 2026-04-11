<!-- neuron-contract:author-complete -->

# Neuron `enrich:anaf:efactura`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:anaf:efactura` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--anaf--efactura.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** + catalog: `e1:enrich:anaf-efactura` / `enrich:anaf:efactura` — verificare statut e-Factura. **Execuție activă:** doar prin **D0** pe `enrich:anaf:full`: `efacturaStatus` din `date_generale.statusRO_e_Factura`, perioade `inregistrare_RO_e_Factura`, metadata `anafEfactura` (L196–201, L222–223, L244–245). Procesor dedicat lipsește din `main.ts`. Sursa `anaf_efactura` marcată completă după succes (L99–105, L311–314).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:anaf:efactura\``.
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:enrich:anaf-efactura` (L496–503).
- `workers/shared/src/queue-registry.ts` — `ENRICH_ANAF_EFACTURA`.
- `workers/enrichment/src/main.ts` — doar `enrich:anaf:full`.
- `workers/enrichment/src/workers/d0-anaf-full-fetch.ts` — extragere e-Factura (L196–201, L222–246).
- `workers/enrichment/src/workers/d3-anaf-efactura.ts` — `@deprecated` către D0.

## Instanțe v2

- **Catalog nodeKey:** `e1:enrich:anaf-efactura`
- **Neuron type:** ToolNeuron; **Swimlane:** `enrichment-fiscal`; **Criticality:** HIGH
- **OTel span name (v2):** `cognitive.e1.enrich.anaf-efactura`

## N/A pe criterii

- **Rând 8:** **N/A** — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Catalog `e1:enrich:anaf-efactura`; execuție **D0** `e1:enrich:anaf-full-fetch`; fără procesor `enrich:anaf:efactura` în `main.ts`. | v2 + catalog. | Idem CAEN: coadă legacy posibil neconsumată. |
| 2 | Etapă, familie, swimlane | E1; `enrichment-fiscal` (catalog). | v2. | — |
| 3 | Rol declarat | Catalog: verificare e-Factura. D0: `anafEfacturaSummary` + patch metadata (L222–223, L244–245). | v2. | — |
| 4 | NeuronType + SOFAI | `ToolNeuron`; System 1. | v2. | — |
| 5 | Criticitate | Facetă HIGH; D0 CRITICAL. | v2 HIGH. | — |
| 6 | Înveliș telemetrie | Span D0 `cognitive:e1:enrich:anaf-full-fetch`; nu span `cognitive.e1.enrich.anaf-efactura` separat. | v2 span facetă. | — |
| 7 | Înveliș politică | Fără OPA în D0; v2 Tier 3 + HITL anomalii — neobservat în D0 (L1–349). | v2. | Tensiune v2 vs D0. |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Persistare structurată JSON în metadata; fără NeMo. | ADR-0007. | — |
| 10 | Escaladare HITL | D0 fără `createHitlApprovalTask`. | v2 HITL anomalii. | — |
| 11 | Micro-OODA | Extract status + perioade → merge metadata; GraphRAG lipsă. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Erori ANAF → catch/throw (L336–345). | v2 Tier 3. | Fără praguri LLM. |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Redis, HTTP ANAF, Postgres. | v2. | — |

### Mapare OTel

- **v2:** `cognitive.e1.enrich.anaf-efactura`.
- **Cod:** `cognitive:e1:enrich:anaf-full-fetch`.
