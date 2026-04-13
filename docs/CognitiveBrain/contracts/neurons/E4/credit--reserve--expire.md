<!-- neuron-contract:author-complete -->

# Neuron `credit:reserve:expire`

> **Status:** audit manual **2026-04-13**. **v2** `credit:reserve:expire` → **runtime** **`pipeline:reservation:expire`** (CRON ~15 min): expiră rezervări `ACTIVE` cu `expiresAt < now` și scade `creditUsed` (`reservation-expire.ts`).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `credit:reserve:expire` |
| etapa | E4 |
| familie (v2) | `credit` |
| contract_path | `contracts/neurons/E4/credit--reserve--expire.md` |
| ADR familie (indicativ) | [credit](../../adr/families/e4/credit.md) |

## Scop în context real

**v2** (L6810–6830). **Cod:** `reservationExpireProcessor` procesează batch max 200 rezervări expirate (L24–37). Coada este **pipeline** transversal, nu `credit:*` literal.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`credit:reserve:expire\`` (L6810–6830).
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:pipeline:reservation-expire` / `pipeline:reservation:expire` (L2744–2751).
- `workers/shared/src/queue-registry.ts` — `E4_RESERVATION_EXPIRE` (L397–398).
- `workers/e4-postsale/src/index.ts` — worker CRON (L314–319); enqueue coadă (L601+).
- `workers/e4-postsale/src/workers/reservation-expire.ts` — `withCognitiveSpan("e4:reservation:expire", …)` (L19–21).
- `workers/e4-postsale/src/__tests__/c-workers.test.ts` — `reservation-expire CRON`.
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L215–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6826).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`pipeline:reservation:expire`**, `e4:pipeline:reservation-expire` (L2745–2746). **Fără** `credit:reserve:expire` în registry. | v2 L6824. | Prefix `pipeline:` vs familie `credit` în v2. |
| 2 | Etapă, familie, swimlane | `MaintenanceNeuron`, swimlane **`pipeline-control`** (L2748–2749). | v2 familie `credit` (L6813). | Swimlane diferită. |
| 3 | Rol declarat | Expirare persistentă DB, fără TTL Redis (fișier L7–8; registry L397). | v2 descriere generică (L6821–6823). | — |
| 4 | NeuronType + SOFAI | `MaintenanceNeuron` (L2748). | v2 `CreditNeuron` inferat (L6817). | **Divergență tip**. |
| 5 | Criticitate | `MEDIUM` (L2751). | `HIGH` v2 (L6819). | Divergență. |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:reservation:expire", …)` (L19–21). | v2 `cognitive.credit.reserve.expire` (L6829). | **Triplu gap:** span **`e4:reservation:expire`** nu apare în catalog; catalog folosește **`e4:pipeline:reservation-expire`**. |
| 7 | Înveliș politică | Concurrency 1 pe worker (index L315–318). | v2 L6827. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Batch limit 200 (L37). | NeMo țintă. | — |
| 10 | Escaladare HITL | — | v2 L6827. | — |
| 11 | Micro-OODA | Scan expirări → update status + decrement utilizat. | v2 L6825. | — |
| 12 | Tier + de-escaladare | — | Tier 3 (L6820). | — |
| 13 | Stack v2 §2.3 (subset) | Postgres + BullMQ repeatable job. | — | — |

### Mapare OTel

- **v2:** `cognitive.credit.reserve.expire`.
- **Cod:** span `cognitive:e4:reservation:expire` (hardcodat în procesor); catalog canonic `e4:pipeline:reservation-expire` pentru coada `pipeline:reservation:expire`.
- **Stare:** **nealiniat** — reconciliere `nodeKey` span ↔ catalog necesară pentru atribute OTel consistente.

---
*Generator inițial:* înlocuit prin audit manual.
