<!-- neuron-contract:author-complete -->

# Neuron `credit:reserve:hold`

> **Status:** audit manual **2026-04-13**. **v2** `credit:reserve:hold` → **runtime** **`credit:limit:reserve`** (D20): inserare `gold_credit_reservations` + increment `creditUsed`, idempotent per `orderId` (`d20-credit-limit-reserve.ts`).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `credit:reserve:hold` |
| etapa | E4 |
| familie (v2) | `credit` |
| contract_path | `contracts/neurons/E4/credit--reserve--hold.md` |
| ADR familie (indicativ) | [credit](../../adr/families/e4/credit.md) |

## Scop în context real

**v2** (L6832–6852). **Cod:** rezervare sumă cu TTL ore (env `CREDIT_RESERVATION_TTL_HOURS`, L28), legată de expirarea CRON `pipeline:reservation:expire` (d20 L11–12).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`credit:reserve:hold\`` (L6832–6852).
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:credit:limit-reserve` / `credit:limit:reserve` (L2413–2420).
- `workers/shared/src/queue-registry.ts` — `E4_CREDIT_LIMIT_RESERVE` (L393).
- `workers/e4-postsale/src/index.ts` — D20 (L290–295).
- `workers/e4-postsale/src/workers/d20-credit-limit-reserve.ts` — `withCognitiveSpan("e4:credit:limit:reserve", …)` (L42–44).
- `workers/e4-postsale/src/__tests__/c-workers.test.ts` — D20.
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L215–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6848).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`credit:limit:reserve`**, `e4:credit:limit-reserve` (L2414–2415); registry L393. **Fără** `credit:reserve:hold`. | v2 L6846. | Mapare semantică v2 → D20. |
| 2 | Etapă, familie, swimlane | `LimitNeuron`, `credit-decision` (L2416–2417). | v2 `CreditNeuron` inferat (L6839). | Divergență tip. |
| 3 | Rol declarat | INSERT rezervare + UPDATE `creditUsed` (d20 L4–7). | v2 descriere generică (L6843–6845). | — |
| 4 | NeuronType + SOFAI | `LimitNeuron` (L2416). | v2 `CreditNeuron` (L6839). | — |
| 5 | Criticitate | `CRITICAL` (L2420). | `HIGH` v2 (L6841). | Divergență. |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:credit:limit:reserve", …)` (L42–44). | v2 `cognitive.credit.reserve.hold` (L6851). | Span vs catalog `limit-reserve`. |
| 7 | Înveliș politică | Idempotency job (d20 L8–9). | v2 L6849. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | TTL configurabil (d20 L28). | NeMo destinație. | — |
| 10 | Escaladare HITL | — | v2 L6849. | — |
| 11 | Micro-OODA | După D19 APPROVED → rezervare fonduri. | v2 L6847. | — |
| 12 | Tier + de-escaladare | — | Tier 3 (L6842). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + Drizzle; legătură cu `pipeline:reservation:expire`. | — | — |

### Mapare OTel

- **v2:** `cognitive.credit.reserve.hold`.
- **Cod:** span `cognitive:e4:credit:limit:reserve`; catalog `e4:credit:limit-reserve`.
- **Stare:** **mapare semantică**; denumiri diferite.

---
*Generator inițial:* înlocuit prin audit manual.
