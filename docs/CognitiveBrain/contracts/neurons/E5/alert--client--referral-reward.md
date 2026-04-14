<!-- neuron-contract:author-complete -->

# Neuron `alert:client:referral-reward`

> **Status:** audit manual **2026-04-13**. v2 L7380–7400: **evidence graph-export** — coadă **`alert:client:referral-reward`** **nu** apare în [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) la audit. ADR [`e5/alerts.md`](../../adr/families/e5/alerts.md): graf `alert:client:*` vs registry `alerts:*` (vreme/APIA) — **fără mapare automată** în codul citit.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `alert:client:referral-reward` |
| etapa | E5 |
| familie (v2) | `alerts` |
| contract_path | `contracts/neurons/E5/alert--client--referral-reward.md` |
| ADR familie (indicativ) | [alerts](../../adr/families/e5/alerts.md), [referral](../../adr/families/e5/referral.md) |

## Scop în context real

**Graf:** alertă client pentru recompensă referral. **Runtime (dovadă):** fără worker sau coadă BullMQ cu acest literal în repo la audit; implementare viitoare sau consolidare sub altă coadă (ex. conținut/campanii) necesită cercetare suplimentară ghidată de produs.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L7380–7400.
- Registry: căutare literal — **0** în `queue-registry.ts`.
- ADR: [`adr/families/e5/alerts.md`](../../adr/families/e5/alerts.md) — reconciliere graf vs `alerts:*`.
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `alerts` (v2 L7380–7400)

- **Confirmed queue field:** `alert:client:referral-reward`
- **Neuron type (inferat):** AlertNeuron
- **Evidence status:** graph-export (L7400)
- **OTel (v2):** `cognitive.alert.client.referral-reward`

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI (v2).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap:** fără coadă/registry pentru literal. | v2 L7394. | — |
| 2 | Etapă, familie, swimlane | — | v2: E5, `alerts`; swimlane `alerts` în metrică. | — |
| 3 | Rol declarat | — | v2 L7392–7393. | — |
| 4 | NeuronType + SOFAI | — | v2 AlertNeuron inferat. | — |
| 5 | Criticitate | — | v2 HIGH inferat. | — |
| 6 | Înveliș telemetrie | — | v2 L7399. | — |
| 7 | Înveliș politică | — | v2 L7397. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L7397. | — |
| 11 | Micro-OODA | — | v2 L7395. | — |
| 12 | Tier + de-escaladare | — | v2 Tier 3. | — |
| 13 | Stack v2 §2.3 (subset) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.alert.client.referral-reward`.
- **Cod:** neimplementat ca coadă dedicată la audit.

---
*Audit manual 2026-04-13.*
