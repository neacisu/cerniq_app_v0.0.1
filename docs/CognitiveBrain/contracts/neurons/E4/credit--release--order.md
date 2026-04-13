<!-- neuron-contract:author-complete -->

# Neuron `credit:release:order`

> **Status:** audit manual **2026-04-13**. **v2** `credit:release:order` → **runtime** **`credit:limit:release`** (D21): eliberare rezervare credit la `order:paid` / `order:cancelled`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `credit:release:order` |
| etapa | E4 |
| familie (v2) | `credit` |
| contract_path | `contracts/neurons/E4/credit--release--order.md` |
| ADR familie (indicativ) | [credit](../../adr/families/e4/credit.md) |

## Scop în context real

**v2** (L6788–6808). **Cod:** `creditLimitReleaseProcessor` actualizează rezervări și `creditUsed` conform trigger (`d21-credit-limit-release.ts`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`credit:release:order\`` (L6788–6808).
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:credit:limit-release` / `credit:limit:release` (L2422–2429).
- `workers/shared/src/queue-registry.ts` — `E4_CREDIT_LIMIT_RELEASE` (L394).
- `workers/e4-postsale/src/index.ts` — D21 (L298–303).
- `workers/e4-postsale/src/workers/d21-credit-limit-release.ts` — `withCognitiveSpan("e4:credit:limit:release", …)` (L37–39).
- `workers/e4-postsale/src/__tests__/c-workers.test.ts` — D21.
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L215–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6804).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`credit:limit:release`**, `e4:credit:limit-release` (L2423–2424); registry L394. **Fără** `credit:release:order`. | v2 L6802. | Mapare semantică v2 → D21. |
| 2 | Etapă, familie, swimlane | `LimitNeuron`, `credit-decision` (L2425–2426). | v2 `CreditNeuron` inferat (L6795). | Divergență tip. |
| 3 | Rol declarat | USED vs RELEASED + ajustare `creditUsed` (d21 antet L7–10). | v2 descriere generică (L6799–6801). | — |
| 4 | NeuronType + SOFAI | `LimitNeuron` (L2425). | v2 `CreditNeuron` (L6795). | — |
| 5 | Criticitate | `HIGH` (L2429). | `HIGH` v2 (L6797). | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:credit:limit:release", …)` (L37–39). | v2 `cognitive.credit.release.order` (L6807). | Span cu `:` vs catalog `limit-release`. |
| 7 | Înveliș politică | Idempotency early return (d21 L10). | v2 L6805. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Tranzacții SQL explicite în procesor. | NeMo țintă. | — |
| 10 | Escaladare HITL | — | v2 L6805. | — |
| 11 | Micro-OODA | Eveniment plată/anulare → eliberare limită. | v2 L6803. | — |
| 12 | Tier + de-escaladare | — | Tier 3 (L6798). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + Drizzle. | — | — |

### Mapare OTel

- **v2:** `cognitive.credit.release.order`.
- **Cod:** span `cognitive:e4:credit:limit:release`; catalog `e4:credit:limit-release`.
- **Stare:** **mapare semantică**; denumiri diferite.

---
*Generator inițial:* înlocuit prin audit manual.
