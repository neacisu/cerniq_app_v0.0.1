<!-- neuron-contract:author-complete -->

# Neuron `alert:internal:insolvency-detected`

> **Status:** audit manual **2026-04-13**. **v2** — `alert:internal:insolvency-detected`. **Repo:** literal **absent** în TS/JS. I39–I44 oferă un singur strat de procesare peșase cozi agregate; **fără** legătură nominală cu insolvență în numele cozii.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `alert:internal:insolvency-detected` |
| etapa | E4 |
| familie (v2) | `alerts` |
| contract_path | `contracts/neurons/E4/alert--internal--insolvency-detected.md` |
| ADR familie (indicativ) | [alerts](../../adr/families/e4/alerts.md) |

## Scop în context real

**v2** (L6145–L6164): alertă internă la detectare insolvență. **Repo:** fluxuri credit/date financiare există în alte cozi E4 (ex. `credit:*`); **nu** s-a căutat în această revizie întreg lanțul producător → alertă — doar absența cozii `alert:internal:insolvency-detected` și a literalului în cod.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L6145–L6164.
- `workers/shared/src/queue-registry.ts` — L462–473.
- `packages/shared/src/cognitive-node-catalog.ts` — L2593–2647.
- `workers/e4-postsale/src/workers/i-alert-workers.ts` — L62–170.
- `workers/e4-postsale/src/index.ts` — L460–496.
- Căutare `alert:internal:insolvency-detected` — **0** (2026-04-13).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap**; alerte agregate `alert:*`. | L6159. | — |
| 2 | Etapă, familie, swimlane | Catalog alerte → `social-action`. | v2 `alerts` (L6163). | — |
| 3 | Rol declarat | Procesor alert generic. | Insolvență (v2). | Lanț trigger→alertă: neauditat în această sesiune. |
| 4 | NeuronType + SOFAI | `AlertNeuron`. | v2 L6152. | — |
| 5 | Criticitate | — | `HIGH` L6154. | — |
| 6 | Înveliș telemetrie | `cognitive:e4:alert:*`. | `cognitive.alert.internal.insolvency-detected` L6164. | — |
| 7 | Înveliș politică | `i-alert-workers.ts` L14–17. | v2 L6162. | — |
| 8 | Rutare model (dacă AI) | **N/A** | L6161. | — |
| 9 | Guardrails | Audit + metrică. | — | — |
| 10 | Escaladare HITL | — | v2 L6162. | — |
| 11 | Micro-OODA | Log + metrică. | v2 L6160. | — |
| 12 | Tier + de-escaladare | — | Tier 3 L6155. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ. | — | — |

### Mapare OTel

- **v2:** `cognitive.alert.internal.insolvency-detected` (L6164).
- **Cod:** fără mapare la coada v2.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
