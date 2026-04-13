<!-- neuron-contract:author-complete -->

# Neuron `referral:response:process`

> **Status:** audit manual **2026-04-13**. Graf v2 **`referral:response:process`** (L9088–9108) — **fără** coadă cu acest nume în registry. **Mapare semantică principală:** **`referral:consent:confirm`** — E27 [`e27-referral-consent-confirm.ts`](../../../../../workers/e5-nurturing/src/workers/e27-referral-consent-confirm.ts) procesează răspunsul referrer-ului (`consentGiven`), actualizează status și poate enque-ui E28. **Alternativ în lanț:** `referral:tracking:conversion` (E29) pentru „răspuns” în sens de conversie — aici prioritizăm E27 ca potrivire la „response” GDPR.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `referral:response:process` |
| coadă runtime (semantic) | `referral:consent:confirm` |
| etapa | E5 |
| familie (v2) | `referral` |
| contract_path | `contracts/neurons/E5/referral--response--process.md` |
| ADR familie (indicativ) | [referral](../../adr/families/e5/referral.md) |

## Scop în context real

Închidere buclă consimțământ: accept/declin/expirare și declanșare condiționată outreach.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L9088–9108.
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e5:referral:consent-confirm` (~L3002–3009).
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E5_REFERRAL_CONSENT_CONFIRM` (~L570).
- Handler: [`e27-referral-consent-confirm.ts`](../../../../../workers/e5-nurturing/src/workers/e27-referral-consent-confirm.ts) — `withCognitiveSpan("e5:referral:consent-confirm", …)` (~L58).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `referral` (L9088–9108)

- **Evidence status:** graph-export (L9108)
- **OTel (v2):** `cognitive.referral.response.process`

## N/A pe criterii

- **8 — Rutare model:** N/A — E27 determinist.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Graf `response:process` vs `consent:confirm`. | v2 L9102. | Denumire abstractizată în v2. |
| 2 | Etapă, familie, swimlane | ReflexNeuron, `referral-management` (catalog E27). | v2 E5. | — |
| 3 | Rol declarat | Procesare consent + enqueue E28 condiționat. | v2 L9099–9101. | — |
| 4 | NeuronType + SOFAI | ReflexNeuron catalog. | v2 ProceduralNeuron inferat. | Contradicție. |
| 5 | Criticitate | HIGH în catalog. | MEDIUM inferat v2. | — |
| 6 | Înveliș telemetrie | `e5:referral:consent-confirm`. | v2 L9107. | — |
| 7 | Înveliș politică | Expirare, idempotență pe status. | v2 L9105. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | Fără consent true → fără E28. | — | — |
| 10 | Escaladare HITL | — | v2 L9105. | — |
| 11 | Micro-OODA | Eveniment consent → UPDATE → side-effects. | v2 L9103. | — |
| 12 | Tier + de-escaladare | — | Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ DB 5. | — | — |

### Mapare OTel

- **v2:** `cognitive.referral.response.process`.
- **Cod:** `cognitive:e5:referral:consent-confirm`.

---
*Audit manual 2026-04-13.*
