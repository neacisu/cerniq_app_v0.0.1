<!-- neuron-contract:author-complete -->

# Neuron `credit:data:fetch-anaf`

> **Status:** audit manual **2026-04-13**. **v2** și **runtime** aliniate: `credit:data:fetch-anaf` / `e4:credit:data-fetch-anaf`, worker **C14** (child Flow din C13).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `credit:data:fetch-anaf` |
| etapa | E4 |
| familie (v2) | `credit` |
| contract_path | `contracts/neurons/E4/credit--data--fetch-anaf.md` |
| ADR familie (indicativ) | [credit](../../adr/families/e4/credit.md) |

## Scop în context real

**v2** (L6644–6667). **Cod:** `creditDataFetchAnafProcessor` apelează `fetchAnafByCui` / `parseAnafForCredit`, actualizează profilul (copil Flow C13, paralel cu C15/C16) (`c14-credit-data-fetch-anaf.ts`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`credit:data:fetch-anaf\`` (L6644–6667).
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:credit:data-fetch-anaf` (L2357–2365).
- `workers/shared/src/queue-registry.ts` — `E4_CREDIT_DATA_FETCH_ANAF` (L387).
- `workers/e4-postsale/src/index.ts` — C14 (L242–247).
- `workers/e4-postsale/src/workers/c14-credit-data-fetch-anaf.ts` — `withCognitiveSpan("e4:credit:data:fetch-anaf", …)` (L41–43).
- `workers/e4-postsale/src/__tests__/c-workers.test.ts` — acoperire C14 (flow children).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L215–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6663).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e4:credit:data-fetch-anaf` / `credit:data:fetch-anaf` (L2358–2359); registry L387. | v2 L6661; `Catalog nodeKey` L6651. | — |
| 2 | Etapă, familie, swimlane | `CreditNeuron`, **`credit-decision`** (L2361–2362). | v2 L6654–6655. | — |
| 3 | Rol declarat | Fetch ANAF fiscal/TVA pentru scoring (c14 antet + L7–11). | v2 L6658–6660. | — |
| 4 | NeuronType + SOFAI | `CreditNeuron` (L2352). | v2 L6652. | — |
| 5 | Criticitate | `HIGH` (L2364). | `HIGH` v2 (L6655). | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:credit:data:fetch-anaf", …)` (L41–43). | v2 `cognitive.e4.credit.data-fetch-anaf` (L6666). | **Span vs catalog:** segmente `data:fetch` în span vs `data-fetch` în `nodeKey` — posibil lookup catalog incomplet. |
| 7 | Înveliș politică | — | HITL anomalii v2 (L6664). | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | `sanitizeCui` (import L17). | NeMo destinație. | — |
| 10 | Escaladare HITL | — | v2 L6664. | — |
| 11 | Micro-OODA | Child job → persistare componentă scor → C17 agregă. | v2 L6662. | — |
| 12 | Tier + de-escaladare | — | Tier 3 (L6656). | — |
| 13 | Stack v2 §2.3 (subset) | Client ANAF dedicat (`anaf-client.ts`), BullMQ Flow. | — | — |

### Mapare OTel

- **v2:** `cognitive.e4.credit.data-fetch-anaf`.
- **Cod:** span `cognitive:e4:credit:data:fetch-anaf`; catalog `e4:credit:data-fetch-anaf`.
- **Stare:** **parțial aliniat** (același job queue); verificare reconciliere șir `nodeKey` în `withCognitiveSpan` vs catalog pentru atribute span.

---
*Generator inițial:* înlocuit prin audit manual.
