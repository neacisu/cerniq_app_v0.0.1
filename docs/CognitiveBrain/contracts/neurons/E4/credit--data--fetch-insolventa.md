<!-- neuron-contract:author-complete -->

# Neuron `credit:data:fetch-insolventa`

> **Status:** audit manual **2026-04-13**. **v2** `credit:data:fetch-insolventa` **nu** are coadă sau `nodeKey` dedicat. Date despre **proceduri de insolvență** sunt incluse în **`credit:data:fetch-bpi`** (C16): `proceduri_insolventa_active` / `proceduri_insolventa_inchise` (`c16` L37–41, L44–47).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `credit:data:fetch-insolventa` |
| etapa | E4 |
| familie (v2) | `credit` |
| contract_path | `contracts/neurons/E4/credit--data--fetch-insolventa.md` |
| ADR familie (indicativ) | [credit](../../adr/families/e4/credit.md) |

## Scop în context real

**v2** (L6716–6736). **Cod:** acoperire **parțială** prin același worker ca dosare/BPI; fără job separat doar pentru insolvență.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`credit:data:fetch-insolventa\`` (L6716–6736).
- `packages/shared/src/cognitive-node-catalog.ts` — doar `e4:credit:data-fetch-bpi` (L2375–2383); text catalog menționează BPI / insolvență (L2378).
- `workers/shared/src/queue-registry.ts` — fără `credit:data:fetch-insolventa`.
- `workers/e4-postsale/src/workers/c16-credit-data-fetch-bpi.ts` — structuri insolvență (L37–47).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6732).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** pentru coada v2. Date insolvență în **C16** / `e4:credit:data-fetch-bpi`. | v2 L6730. | Nealiniere registry: un singur worker agregat. |
| 2 | Etapă, familie, swimlane | Prin C16: swimlane `credit-decision` (catalog L2380). | v2 L6719–6725. | — |
| 3 | Rol declarat | Numărare proceduri active/închise + rezolvare status BPI (c16 L44–47). | v2 descriere generică (L6727–6729). | — |
| 4 | NeuronType + SOFAI | `CreditNeuron` pe coada BPI (L2371). | v2 `CreditNeuron` inferat (L6723). | — |
| 5 | Criticitate | `HIGH` pe BPI (L2382). | `HIGH` v2 (L6725). | — |
| 6 | Înveliș telemetrie | Span C16: `cognitive:e4:credit:data:fetch-bpi`. | v2 `cognitive.credit.data.fetch-insolventa` (L6735). | Fără span dedicat insolvență. |
| 7 | Înveliș politică | — | v2 L6733. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Aceleași ca C16 (client Termene, validări). | NeMo țintă. | — |
| 10 | Escaladare HITL | — | v2 L6733. | — |
| 11 | Micro-OODA | Componentă scor din date BPI → C17. | v2 L6731. | — |
| 12 | Tier + de-escaladare | — | Tier 3 (L6726). | — |
| 13 | Stack v2 §2.3 (subset) | Termene API, BullMQ. | — | — |

### Mapare OTel

- **v2:** `cognitive.credit.data.fetch-insolventa`.
- **Cod:** **nu există** span separat; acoperit indirect de `cognitive:e4:credit:data:fetch-bpi`.
- **Stare:** **parțial acoperit** în C16; reconciliere v2 necesară dacă se dorește coadă dedicată.

---
*Generator inițial:* înlocuit prin audit manual.
