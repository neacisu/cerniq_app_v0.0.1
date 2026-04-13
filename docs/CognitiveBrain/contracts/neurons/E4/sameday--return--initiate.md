<!-- neuron-contract:author-complete -->

# Neuron `sameday:return:initiate`

> **Status:** audit manual **2026-04-13**. **v2** (L7214–L7237): coadă `sameday:return:initiate`, `LogisticsNeuron`, `HIGH`. **Repo:** **E26** — `E4_SAMEDAY_RETURN_INITIATE` (`queue-registry.ts` L414), worker `index.ts` L356–361; comentariu: enqueue din E24 la `DELIVERY_FAILED` (L356). **Fără** `withCognitiveSpan` în `e26-sameday-return-initiate.ts`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `sameday:return:initiate` |
| etapa | E4 |
| familie (v2) | `logistics` |
| contract_path | `contracts/neurons/E4/sameday--return--initiate.md` |
| ADR familie (indicativ) | [logistics](../../adr/families/e4/logistics.md) |

## Scop în context real

**v2:** inițiere returnare la 3×DELIVERY_FAILED (L7228–L7229). **Notă:** există și flux separat **H37** `return:initiate` pentru retur comandă — **nu** confundat cu E26 fără citire încrucișată completă a producătorilor de job.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7214–L7237.
- `workers/shared/src/queue-registry.ts` — L414.
- `packages/shared/src/cognitive-node-catalog.ts` — L2469–L2476.
- `workers/e4-postsale/src/workers/e26-sameday-return-initiate.ts` — header worker E26; fără `withCognitiveSpan` (`rg`).
- `workers/e4-postsale/src/index.ts` — E26 L356–361.
- `workers/e4-postsale/src/workers/e24-sameday-status-process.ts` — referință enqueue return (ex. L141 în sesiune anterioară — verificare lanț E24→E26 recomandată).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L7233).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Coadă + `e4:sameday:return-initiate`. | v2 L7231. | — |
| 2 | Etapă, familie, swimlane | `logistics` (L2473). | v2 L7224. | — |
| 3 | Rol declarat | Return AWB Sameday (E26). | v2 L7228–L7229. | — |
| 4 | NeuronType + SOFAI | `LogisticsNeuron`. | v2 L7222. | — |
| 5 | Criticitate | `HIGH` (L2475). | v2 L7225. | — |
| 6 | Înveliș telemetrie | Fără `withCognitiveSpan` în E26. | v2 `cognitive.e4.sameday.return-initiate` (L7236). | Gap span. |
| 7 | Înveliș politică | — | v2 L7234. | — |
| 8 | Rutare model (dacă AI) | **N/A** | L7233. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L7234. | — |
| 11 | Micro-OODA | — | v2 L7232. | — |
| 12 | Tier + de-escaladare | — | Tier 3 (L7226). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ. | — | — |

### Mapare OTel

- **v2:** `cognitive.e4.sameday.return-initiate` (L7236).
- **Cod:** span cognitiv standard neobservat în E26.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
