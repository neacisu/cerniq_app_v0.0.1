<!-- neuron-contract:author-complete -->

# Neuron `alert:internal:credit-blocked`

> **Status:** audit manual **2026-04-13**. **v2** — coadă `alert:internal:credit-blocked`. **Repo:** literal **absent** din registry/catalog/workers (`rg` în `*.{ts,tsx,js,mjs}`). **Există** `alert:credit` (I41) ca rută generică pentru tematică credit — **nu** echivalență nominală cu coada v2 granulară.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `alert:internal:credit-blocked` |
| etapa | E4 |
| familie (v2) | `alerts` |
| contract_path | `contracts/neurons/E4/alert--internal--credit-blocked.md` |
| ADR familie (indicativ) | [alerts](../../adr/families/e4/alerts.md) |

## Scop în context real

**v2** (L6101–L6120): alertă internă blocare credit. **Repo:** I41 folosește `withCognitiveSpan("e4:alert:credit", …)` (`i-alert-workers.ts` L152); poate servi scenarii credit, dar **nu** documentează `alert:internal:credit-blocked` ca nume de coadă sau `alertType` obligatoriu. Fără dovada că producătorii de job emit explicit acest identificator v2.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L6101–L6120.
- `workers/shared/src/queue-registry.ts` — `E4_ALERT_CREDIT: "alert:credit"` (L467); **fără** `alert:internal:credit-blocked`.
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:alert:credit` (L2612–2619).
- `workers/e4-postsale/src/workers/i-alert-workers.ts` — `alertCreditProcessor` (L149–152).
- `workers/e4-postsale/src/index.ts` — worker I41 (L474–477).
- Căutare `alert:internal:credit-blocked` — **0** în TS/JS (2026-04-13).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** nominal; există doar `alert:credit`. | v2 queue L6115. | Semantic apropiat ≠ identitate canonică. |
| 2 | Etapă, familie, swimlane | `e4:alert:credit` → `social-action`. | v2 `alerts` (L6119). | — |
| 3 | Rol declarat | I41: alertă credit generică. | Blocare credit internă (v2). | Mapare funcțională neexplicită în cod. |
| 4 | NeuronType + SOFAI | `AlertNeuron` (catalog I41). | v2 L6108. | — |
| 5 | Criticitate | Catalog I41: `HIGH`. | v2 `HIGH` L6110. | — |
| 6 | Înveliș telemetrie | Span `cognitive:e4:alert:credit`. | v2 `cognitive.alert.internal.credit-blocked` L6120. | Denumiri OTel diferite. |
| 7 | Înveliș politică | `i-alert-workers.ts` L14–17. | v2 L6118. | — |
| 8 | Rutare model (dacă AI) | **N/A** | L6117. | — |
| 9 | Guardrails | Audit + metrică. | — | — |
| 10 | Escaladare HITL | — | v2 L6118. | — |
| 11 | Micro-OODA | Log + metrică. | v2 L6116. | — |
| 12 | Tier + de-escaladare | — | Tier 3 L6111. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ. | — | — |

### Mapare OTel

- **v2:** `cognitive.alert.internal.credit-blocked` (L6120).
- **Cod:** `cognitive:e4:alert:credit` pentru I41 — **nu** spanul nominal v2.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
