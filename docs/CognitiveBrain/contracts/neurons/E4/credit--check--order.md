<!-- neuron-contract:author-complete -->

# Neuron `credit:check:order`

> **Status:** audit manual **2026-04-13**. **v2** `credit:check:order` (graph). **Runtime:** **`credit:limit:check`** (D19) — verificare `creditUsed` + `orderAmount` vs `creditLimit` la `order:created`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `credit:check:order` |
| etapa | E4 |
| familie (v2) | `credit` |
| contract_path | `contracts/neurons/E4/credit--check--order.md` |
| ADR familie (indicativ) | [credit](../../adr/families/e4/credit.md) |

## Scop în context real

**v2** (L6622–6642). **Cod:** `creditLimitCheckProcessor` citește `gold_credit_profiles`, compară suma comenzii cu limita, poate enfilea D20 la aprobare, loghează respingere fără blocare comandă (comentariu business L8–14) (`d19-credit-limit-check.ts`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`credit:check:order\`` (L6622–6642).
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:credit:limit-check` / `credit:limit:check` (L2404–2411).
- `workers/shared/src/queue-registry.ts` — `E4_CREDIT_LIMIT_CHECK` (L392).
- `workers/e4-postsale/src/index.ts` — D19 (L282–287).
- `workers/e4-postsale/src/workers/d19-credit-limit-check.ts` — `withCognitiveSpan("e4:credit:limit:check", …)` (L35–37).
- `workers/e4-postsale/src/__tests__/c-workers.test.ts` — `D19 — creditLimitCheckProcessor`.
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L215–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6638).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`credit:limit:check`**, `e4:credit:limit-check` (L2405–2406); registry L392. **Fără** `credit:check:order` în registry. | v2 L6636. | Nealiniere nume coadă v2 ↔ runtime. |
| 2 | Etapă, familie, swimlane | `LimitNeuron`, swimlane **`credit-decision`** (L2407–2410). | v2 familie `credit` (L6625). | v2 fără swimlane explicit în bloc; metrici `swimlane="credit"` (L6640). |
| 3 | Rol declarat | Verificare limită la creare comandă + enqueue rezervare (d19 antet). | v2 descriere generică scoring (L6633–6635). | — |
| 4 | NeuronType + SOFAI | **`LimitNeuron`** (L2407). | v2 `CreditNeuron` inferat (L6629). | **Divergență tip** catalog vs v2. |
| 5 | Criticitate | **`CRITICAL`** (L2411). | `HIGH` v2 (L6631). | Divergență. |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:credit:limit:check", …)` (L35–37). Catalog `e4:credit:limit-check`. | v2 `cognitive.credit.check.order` (L6641). | **Span vs catalog:** procesorul folosește `:` în segmente; `nodeKey` catalog folosește `-` — posibil fără atribute din catalog. |
| 7 | Înveliș politică | Comportament WARN la respingere (L8–14). | HITL anomalii v2 (L6639). | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Determinist SQL + metrici `e4CreditLimitChecksTotal` (import L20). | NeMo destinație. | — |
| 10 | Escaladare HITL | — | v2 L6639. | — |
| 11 | Micro-OODA | Profil → decizie APPROVED/REJECTED → coadă D20 condiționat. | v2 L6637. | — |
| 12 | Tier + de-escaladare | — | Tier 3 (L6632). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + Drizzle + observabilitate `@cerniq/observability`. | — | — |

### Mapare OTel

- **v2:** `cognitive.credit.check.order`.
- **Cod:** span `cognitive:e4:credit:limit:check`; catalog canonic `e4:credit:limit-check`.
- **Stare:** **mapare semantică** v2→D19; **denumiri OTel / registry** diferite de câmpul v2 `Confirmed queue`.

---
*Generator inițial:* înlocuit prin audit manual.
