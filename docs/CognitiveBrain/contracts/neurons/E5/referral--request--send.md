<!-- neuron-contract:author-complete -->

# Neuron `referral:request:send`

> **Status:** audit manual **2026-04-13**. Graf v2 **`referral:request:send`** (L9066–9086) — **fără** coadă separată în registry. **Același traseu ca `referral:request:prepare`:** execuție în **`referral:outreach:prospect`** — E28 [`e28-referral-outreach-prospect.ts`](../../../../../workers/e5-nurturing/src/workers/e28-referral-outreach-prospect.ts). Trimiterea efectivă către prospect este modelată în interiorul E28 (înregistrare acțiune `REFERRAL_OUTREACH`).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `referral:request:send` |
| coadă runtime (semantic) | `referral:outreach:prospect` |
| etapa | E5 |
| familie (v2) | `referral` |
| contract_path | `contracts/neurons/E5/referral--request--send.md` |
| ADR familie (indicativ) | [referral](../../adr/families/e5/referral.md) |

## Scop în context real

v2: emiterea cererii/reach-out către prospect după etapa de pregătire. Cod: nu există „send” ca job distinct de „prepare”.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L9066–9086.
- Handler: [`e28-referral-outreach-prospect.ts`](../../../../../workers/e5-nurturing/src/workers/e28-referral-outreach-prospect.ts).
- Producător: [`e27-referral-consent-confirm.ts`](../../../../../workers/e5-nurturing/src/workers/e27-referral-consent-confirm.ts) (enqueue E28 când `consentGiven=true`).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `referral` (L9066–9086)

- **Evidence status:** graph-export (L9086)
- **OTel (v2):** `cognitive.referral.request.send`

## N/A pe criterii

- **8 — Rutare model:** N/A — E28 determinist.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Graf `send` vs coadă `outreach:prospect`. | v2 L9080. | — |
| 2 | Etapă, familie, swimlane | E28: `referral-management`. | v2 E5. | — |
| 3 | Rol declarat | Outreach după confirmare consimțământ. | v2 L9077–9079. | — |
| 4 | NeuronType + SOFAI | MotorNeuron (catalog E28). | v2 ProceduralNeuron inferat. | Contradicție. |
| 5 | Criticitate | — | MEDIUM inferat. | — |
| 6 | Înveliș telemetrie | `e5:referral:outreach-prospect`. | v2 L9085. | — |
| 7 | Înveliș politică | Guard strict GDPR în E28. | v2 L9083. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L9083. | — |
| 11 | Micro-OODA | — | v2 L9081. | — |
| 12 | Tier + de-escaladare | — | Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ DB 5. | — | — |

### Mapare OTel

- **v2:** `cognitive.referral.request.send`.
- **Cod:** `cognitive:e5:referral:outreach-prospect`.

---
*Audit manual 2026-04-13.*
