<!-- neuron-contract:author-complete -->

# Neuron `sameday:cod:process`

> **Status:** audit manual **2026-04-13**. **v2** (L7164–L7187): coadă `sameday:cod:process`, `LogisticsNeuron`, `HIGH`. **Repo:** **E25** — `E4_SAMEDAY_COD_PROCESS` (`queue-registry.ts` L412), worker `index.ts` L348–353 (`samedayCodProcessProcessor`). **Fără** `withCognitiveSpan` în `e25-sameday-cod-process.ts` (căutare `withCognitiveSpan` — 0).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `sameday:cod:process` |
| etapa | E4 |
| familie (v2) | `logistics` |
| contract_path | `contracts/neurons/E4/sameday--cod--process.md` |
| ADR familie (indicativ) | [logistics](../../adr/families/e4/logistics.md) |

## Scop în context real

**v2:** procesare COD la DELIVERED (L7178–L7179). **index.ts** L348: enqueue din E24 la DELIVERED (comentariu). Detaliu handler: `e25-sameday-cod-process.ts` (ne citit integral în această sesiune dincolo de absența `withCognitiveSpan`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7164–L7187.
- `workers/shared/src/queue-registry.ts` — L412.
- `packages/shared/src/cognitive-node-catalog.ts` — L2460–L2467.
- `workers/e4-postsale/src/workers/e25-sameday-cod-process.ts` — absență `withCognitiveSpan` (verificare `rg`).
- `workers/e4-postsale/src/index.ts` — E25 L348–353.
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L7183).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Coadă + `e4:sameday:cod-process`. | v2 L7181. | — |
| 2 | Etapă, familie, swimlane | `logistics` (L2464). | v2 L7174. | — |
| 3 | Rol declarat | Procesare COD (plan E25). | v2 L7178–L7179. | — |
| 4 | NeuronType + SOFAI | `LogisticsNeuron`. | v2 L7172. | — |
| 5 | Criticitate | `HIGH` (L2466). | v2 L7175. | — |
| 6 | Înveliș telemetrie | Fără `withCognitiveSpan` în E25. | v2 `cognitive.e4.sameday.cod-process` (L7186). | Gap span cognitiv. |
| 7 | Înveliș politică | — | v2 L7184. | — |
| 8 | Rutare model (dacă AI) | **N/A** | L7183. | — |
| 9 | Guardrails | — | — | Detaliu handler: citire extinsă opțională. |
| 10 | Escaladare HITL | — | v2 L7184. | — |
| 11 | Micro-OODA | — | v2 L7182. | — |
| 12 | Tier + de-escaladare | — | Tier 3 (L7176). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ. | — | — |

### Mapare OTel

- **v2:** `cognitive.e4.sameday.cod-process` (L7186).
- **Cod:** span cognitiv standard **neobservat** în fișierul procesorului E25.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
