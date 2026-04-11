<!-- neuron-contract:author-complete -->

# Neuron `enrich:anaf:tva-status`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:anaf:tva-status` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--anaf--tva-status.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** + catalog: `e1:enrich:anaf-tva` / `enrich:anaf:tva-status`. **Execuție activă:** **D0**: `tvaActive`, `tvaIncasare`, `perioade_TVA`, `anafTvaSummary` în metadata (L191–194, L221, L241–246), sursa `anaf_tva` completată (L99–105). Procesor dedicat absent din `main.ts`. `d2-anaf-tva.ts` deprecat.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:anaf:tva-status\``.
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:enrich:anaf-tva` (L487–494).
- `workers/shared/src/queue-registry.ts` — `ENRICH_ANAF_TVA_STATUS`.
- `workers/enrichment/src/main.ts` — `enrich:anaf:full`.
- `workers/enrichment/src/workers/d0-anaf-full-fetch.ts` — logică TVA (L191–194, L221, L241–246).
- `workers/enrichment/src/workers/d2-anaf-tva.ts` — deprecat.

## Instanțe v2

- **Catalog nodeKey:** `e1:enrich:anaf-tva`
- **OTel span name (v2):** `cognitive.e1.enrich.anaf-tva` (v2 L1992)

## N/A pe criterii

- **Rând 8:** **N/A** — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Catalog `e1:enrich:anaf-tva`; execuție **D0** `e1:enrich:anaf-full-fetch`; fără procesor `enrich:anaf:tva-status` în `main.ts`. | v2 + catalog. | — |
| 2 | Etapă, familie, swimlane | E1; `enrichment-fiscal`. | v2. | — |
| 3 | Rol declarat | Catalog: statut plătitor TVA. D0: câmpuri TVA în `anafTva` metadata + log răspuns (L325 return include `tvaActive`). | v2. | — |
| 4 | NeuronType + SOFAI | `ToolNeuron`; System 1. | v2. | — |
| 5 | Criticitate | Facetă HIGH; D0 CRITICAL. | v2 HIGH. | — |
| 6 | Înveliș telemetrie | Span D0 unic `cognitive:e1:enrich:anaf-full-fetch`; nu span separat pentru facetă TVA. | v2 span facetă. | — |
| 7 | Înveliș politică | Cache/API; fără OPA; v2 HITL anomalii neobservat în D0. | v2 Tier 3. | — |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Persistare structurată; fără NeMo. | ADR-0007. | — |
| 10 | Escaladare HITL | D0 fără `createHitlApprovalTask`. | v2. | — |
| 11 | Micro-OODA | Extract TVA din record → metadata; GraphRAG lipsă. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Erori → throw. | v2. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Redis, HTTP ANAF, Postgres. | v2. | — |

### Mapare OTel

- **v2:** `cognitive.e1.enrich.anaf-tva`.
- **Cod:** `cognitive:e1:enrich:anaf-full-fetch`.
