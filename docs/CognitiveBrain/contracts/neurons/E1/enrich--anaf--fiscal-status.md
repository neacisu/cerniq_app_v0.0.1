<!-- neuron-contract:author-complete -->

# Neuron `enrich:anaf:fiscal-status`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:anaf:fiscal-status` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--anaf--fiscal-status.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** + catalog: `e1:enrich:anaf-fiscal` / `enrich:anaf:fiscal-status` — stare fiscală ANAF. **Execuție activă:** **D0** pe `enrich:anaf:full`: `denumire`, `adresa`, `statusFirma` din `mapStatus(dg?.stare_inregistrare)`, `anafFiscalSummary` (L185–189, L212–219, L227–250), sursa `anaf_fiscal` marcată completă (L99–105). Procesor dedicat absent din `main.ts`. `d1-anaf-fiscal.ts` marcat `@deprecated`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:anaf:fiscal-status\``.
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:enrich:anaf-fiscal` (L478–485).
- `workers/shared/src/queue-registry.ts` — `ENRICH_ANAF_FISCAL_STATUS`.
- `workers/enrichment/src/main.ts` — `enrich:anaf:full` singur pentru ANAF.
- `workers/enrichment/src/workers/d0-anaf-full-fetch.ts` — câmpuri fiscale identitate (L185–220, L227–250).
- `workers/enrichment/src/workers/d1-anaf-fiscal.ts` — antet deprecare.

## Instanțe v2

- **Catalog nodeKey:** `e1:enrich:anaf-fiscal`
- **OTel span name (v2):** `cognitive.e1.enrich.anaf-fiscal`

## N/A pe criterii

- **Rând 8:** **N/A** — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Catalog `e1:enrich:anaf-fiscal`; rulare efectivă prin D0 `e1:enrich:anaf-full-fetch`; fără procesor dedicat în `main.ts`. | v2 + catalog. | — |
| 2 | Etapă, familie, swimlane | E1; `enrichment-fiscal`. | v2. | — |
| 3 | Rol declarat | Catalog: verificare stare fiscală. D0: `statusFirma` + rezumat fiscal în metadata. | v2. | — |
| 4 | NeuronType + SOFAI | `ToolNeuron`; System 1. | v2. | — |
| 5 | Criticitate | Facetă HIGH; D0 CRITICAL. | v2 HIGH. | — |
| 6 | Înveliș telemetrie | Span D0 unic; nu `cognitive.e1.enrich.anaf-fiscal` separat. | v2 span. | — |
| 7 | Înveliș politică | Cache/API; fără OPA; v2 HITL anomalii neobservat în D0. | v2 Tier 3. | — |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | `mapStatus` determinist (L85–92); fără NeMo. | ADR-0007. | — |
| 10 | Escaladare HITL | D0 fără `createHitlApprovalTask` (L1–349). | v2. | — |
| 11 | Micro-OODA | Extract fiscal din `date_generale` → update silver + metadata; GraphRAG lipsă. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Erori → throw după log. | v2. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Redis, HTTP ANAF, Postgres. | v2. | — |

### Mapare OTel

- **v2:** `cognitive.e1.enrich.anaf-fiscal`.
- **Cod:** `cognitive:e1:enrich:anaf-full-fetch`.
