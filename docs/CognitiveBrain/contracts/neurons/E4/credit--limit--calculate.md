<!-- neuron-contract:author-complete -->

# Neuron `credit:limit:calculate`

> **Status:** audit manual **2026-04-13**. **v2** și **runtime** aliniate: `credit:limit:calculate`, worker **C18**; include prag HITL >50K RON (`c18` antet L3–8).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `credit:limit:calculate` |
| etapa | E4 |
| familie (v2) | `credit` |
| contract_path | `contracts/neurons/E4/credit--limit--calculate.md` |
| ADR familie (indicativ) | [credit](../../adr/families/e4/credit.md) |

## Scop în context real

**v2** (L6738–6761). **Cod:** `creditLimitCalculateProcessor` mapează `riskTier` → limită, actualizează profil, creează task aprobare peste prag (`approvalService`, `c18-credit-limit-calculate.ts`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`credit:limit:calculate\`` (L6738–6761).
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:credit:limit-calculate` (L2393–2401).
- `workers/shared/src/queue-registry.ts` — `E4_CREDIT_LIMIT_CALCULATE` (L391).
- `workers/e4-postsale/src/index.ts` — C18 (L274–279).
- `workers/e4-postsale/src/workers/c18-credit-limit-calculate.ts` — `withCognitiveSpan("e4:credit:limit:calculate", …)` (L43–45).
- `workers/e4-postsale/src/__tests__/c-workers.test.ts` — C18.
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L215–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6757).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e4:credit:limit-calculate` / `credit:limit:calculate` (L2394–2395); registry L391. | v2 L6755; L6745. | — |
| 2 | Etapă, familie, swimlane | `CreditNeuron`, `credit-decision` (L2397–2398). | v2 L6748–6749. | — |
| 3 | Rol declarat | Limită din tier + HITL peste prag (c18 L3–8, L40+). | v2 L6752–6754. | SLA în cod: 4h CFO (c18 L7–8) vs v2 guardrail 2h în bloc (L6758) — verificare reconciliere operațională. |
| 4 | NeuronType + SOFAI | `CreditNeuron` (L2397). | v2 L6746. | — |
| 5 | Criticitate | `CRITICAL` (L2400). | `CRITICAL` v2 (L6749). | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:credit:limit:calculate", …)` (L43–45). | v2 `cognitive.e4.credit.limit-calculate` (L6760). | **Span vs catalog:** `limit:calculate` în span vs `limit-calculate` în `nodeKey`. |
| 7 | Înveliș politică | HITL prin `approvalService` (c18). | v2 HITL obligatoriu acțiuni ireversibile (L6758). | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Prag `HITL_THRESHOLD_RON` din engine (import L23–27). | NeMo țintă. | — |
| 10 | Escaladare HITL | Task aprobare în cod (c18). | v2 L6758. | — |
| 11 | Micro-OODA | Scor + tier → limită → persistare + opțional HITL. | v2 L6756. | — |
| 12 | Tier + de-escaladare | — | Tier 2 (L6750). | — |
| 13 | Stack v2 §2.3 (subset) | Drizzle + serviciu aprobare în `@cerniq/db`. | — | — |

### Mapare OTel

- **v2:** `cognitive.e4.credit.limit-calculate`.
- **Cod:** span `cognitive:e4:credit:limit:calculate`; catalog `e4:credit:limit-calculate`.
- **Stare:** **parțial aliniat** (aceeași coadă); normalizare `nodeKey` în span recomandată.

---
*Generator inițial:* înlocuit prin audit manual.
