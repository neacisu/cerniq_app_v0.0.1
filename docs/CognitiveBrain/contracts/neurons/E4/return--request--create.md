<!-- neuron-contract:author-complete -->

# Neuron `return:request:create`

> **Status:** audit manual **2026-04-13**. **v2** (L7117–L7137): coadă **`return:request:create`**, `LogisticsNeuron` inferat. **Repo:** coadă implementată pentru inițiere retur este **`return:initiate`** (H37) — `E4_RETURN_INITIATE` (`queue-registry.ts` L453), **fără** `return:request:create` literal în registry/catalog.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `return:request:create` |
| etapa | E4 |
| familie (v2) | `logistics` |
| contract_path | `contracts/neurons/E4/return--request--create.md` |
| ADR familie (indicativ) | [logistics](../../adr/families/e4/logistics.md) |

## Scop în context real

**Cod (H37):** la retur, verifică comandă, `RETURN_PROCESSING`, audit `RETURN_INITIATED`, enqueue F30 (`stock:return`) și H38 (`return:process`) (`h37-return-initiate.ts` L1–13, L36–37). **Acest flux** este echivalent semantic unei „creări cerere retur”, dar identificatorul BullMQ este **`return:initiate`**, nu `return:request:create`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7117–L7137.
- `workers/shared/src/queue-registry.ts` — `E4_RETURN_INITIATE: "return:initiate"` (L453); **fără** `return:request:create`.
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:return:initiate` / `return:initiate`, `ReturnNeuron` (L2574–L2581).
- `workers/e4-postsale/src/workers/h37-return-initiate.ts` — `withCognitiveSpan("e4:return:initiate", …)` (L36–37).
- `workers/e4-postsale/src/index.ts` — H37 worker (L446–449).
- Căutare `return:request:create` în `*.{ts,tsx}` sub `workers/`, `packages/` — **0** (2026-04-13).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L7133).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`return:initiate`** / `e4:return:initiate`. | v2 **`return:request:create`** L7131. | Redenumire / mapare deschisă. |
| 2 | Etapă, familie, swimlane | Catalog `logistics` (L2579). | v2 `logistics` (L7120). | — |
| 3 | Rol declarat | Inițiere retur + cozi următoare. | Creare cerere retur (v2). | — |
| 4 | NeuronType + SOFAI | **`ReturnNeuron`**. | v2 **`LogisticsNeuron`** (L7124). | Contradicție. |
| 5 | Criticitate | **`HIGH`** (L2581). | v2 **`MEDIUM`** (L7126). | Contradicție. |
| 6 | Înveliș telemetrie | `cognitive:e4:return:initiate`. | v2 `cognitive.return.request.create` (L7136). | — |
| 7 | Înveliș politică | — | v2 L7135. | — |
| 8 | Rutare model (dacă AI) | **N/A** | L7133. | — |
| 9 | Guardrails | Verificări status `RETURNED` etc. în H37. | — | — |
| 10 | Escaladare HITL | — | v2 L7135. | — |
| 11 | Micro-OODA | H37 steps L7–12. | v2 OODA Sameday (L7130). | v2 OODA generic logistică. |
| 12 | Tier + de-escaladare | — | Tier 4 (L7127). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + `createQueue` din H37. | — | — |

### Mapare OTel

- **v2:** `cognitive.return.request.create` (L7136).
- **Cod:** `cognitive:e4:return:initiate`.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
