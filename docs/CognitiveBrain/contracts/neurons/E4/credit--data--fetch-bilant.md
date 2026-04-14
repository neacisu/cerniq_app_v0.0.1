<!-- neuron-contract:author-complete -->

# Neuron `credit:data:fetch-bilant`

> **Status:** audit manual **2026-04-13**. **v2** și **runtime** aliniate pe coadă: `credit:data:fetch-bilant`, worker **C15** (child Flow C13).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `credit:data:fetch-bilant` |
| etapa | E4 |
| familie (v2) | `credit` |
| contract_path | `contracts/neurons/E4/credit--data--fetch-bilant.md` |
| ADR familie (indicativ) | [credit](../../adr/families/e4/credit.md) |

## Scop în context real

**v2** (L6669–6692). **Cod:** `creditDataFetchBilantProcessor` — date bilanț Termene.ro pentru componente scor (`c15-credit-data-fetch-bilant.ts`, `withCognitiveSpan` L39–41).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`credit:data:fetch-bilant\`` (L6669–6692).
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:credit:data-fetch-bilant` (L2366–2374).
- `workers/shared/src/queue-registry.ts` — `E4_CREDIT_DATA_FETCH_BILANT` (L388).
- `workers/e4-postsale/src/index.ts` — C15 (L250–255).
- `workers/e4-postsale/src/workers/c15-credit-data-fetch-bilant.ts`.
- `workers/e4-postsale/src/__tests__/c-workers.test.ts` — flow C15.
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L215–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6688).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e4:credit:data-fetch-bilant` / `credit:data:fetch-bilant` (L2367–2368); registry L388. | v2 L6686; L6676. | — |
| 2 | Etapă, familie, swimlane | `CreditNeuron`, `credit-decision` (L2370–2371). | v2 L6679–6680. | — |
| 3 | Rol declarat | Fetch bilanț 3 ani CA / profit / equity (catalog L2369; c15). | v2 L6683–6685. | — |
| 4 | NeuronType + SOFAI | `CreditNeuron` (L2371). | v2 L6677. | — |
| 5 | Criticitate | `HIGH` (L2373). | `HIGH` v2 (L6680). | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:credit:data:fetch-bilant", …)` (L39–41). | v2 `cognitive.e4.credit.data-fetch-bilant` (L6691). | **Span vs catalog:** aceeași tensiune `:` (span) vs `-` (`nodeKey`). |
| 7 | Înveliș politică | — | v2 L6689. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Integrare Termene deterministă în procesor. | NeMo destinație. | — |
| 10 | Escaladare HITL | — | v2 L6689. | — |
| 11 | Micro-OODA | Child paralel în Flow C13 → date pentru C17. | v2 L6687. | — |
| 12 | Tier + de-escaladare | — | Tier 3 (L6681). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ Flow + Drizzle. | — | — |

### Mapare OTel

- **v2:** `cognitive.e4.credit.data-fetch-bilant`.
- **Cod:** span `cognitive:e4:credit:data:fetch-bilant`; catalog `e4:credit:data-fetch-bilant`.
- **Stare:** **parțial aliniat** (coadă BullMQ = v2); reconciliere `nodeKey` span recomandată pentru atribute catalog.

---
*Generator inițial:* înlocuit prin audit manual.
