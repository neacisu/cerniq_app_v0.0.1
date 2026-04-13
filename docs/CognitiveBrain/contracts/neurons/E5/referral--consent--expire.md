<!-- neuron-contract:author-complete -->

# Neuron `referral:consent:expire`

> **Status:** audit manual **2026-04-13**. **v2** (L8931–L8951): coadă `referral:consent:expire`, familie `referral`, OTel `cognitive.referral.consent.expire`. **Repo:** **fără** această coadă în `queue-registry.ts`; există `referral:consent:request` / `referral:consent:confirm` (L568–L570) — **fără** variantă `expire`. **Căutare** `referral:consent:expire` în `workers/**/*.ts` — **0** (2026-04-13). **Posibil viitor:** politici GDPR/retention (ex. `E5_COMPLIANCE_DATA_RETENTION`) — **nu** dovedesc același neuron.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `referral:consent:expire` |
| etapa | E5 |
| familie (v2) | `referral` |
| contract_path | `contracts/neurons/E5/referral--consent--expire.md` |
| ADR familie (indicativ) | [referral](../../adr/families/e5/referral.md) |

## Scop în context real

**v2:** expirare/consolidare consent referral (L8942–L8944). **Cod:** neimplementat sub acest nume de coadă.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`referral:consent:expire\`` (L8931–L8951).
- `workers/shared/src/queue-registry.ts` — `E5_REFERRAL_CONSENT_REQUEST`, `E5_REFERRAL_CONSENT_CONFIRM` (L568–L570); fără `expire`.
- `packages/shared/src/cognitive-node-catalog.ts` — fără `consent-expire` / `consent:expire` la audit.
- Căutare literală în TypeScript — **0** fișiere (2026-04-13).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8947).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** — fără coadă runtime. | Confirmed queue v2 (L8945). | v2 L8950 — nereconciliat. |
| 2 | Etapă, familie, swimlane | Neconectat. | E5, `referral` (L8933–L8949). | — |
| 3 | Rol declarat | Lipsă handler. | Expirare consent (L8942–L8944). | — |
| 4 | NeuronType + SOFAI | Neconectat. | `ProceduralNeuron` (L8938). | — |
| 5 | Criticitate | Neconectat. | `MEDIUM` (L8940). | — |
| 6 | Înveliș telemetrie | Lipsă. | `cognitive.referral.consent.expire` (L8950). | — |
| 7 | Înveliș politică | — | No mandatory HITL (L8948). | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI (L8947). | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L8948. | — |
| 11 | Micro-OODA | — | OODA generic (L8946). | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8941). | — |
| 13 | Stack (subset plan v2) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.referral.consent.expire` (L8950).
- **Cod:** —

---
*Revizuire manuală:* dovezi repo 2026-04-13.
