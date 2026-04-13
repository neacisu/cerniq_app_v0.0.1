<!-- neuron-contract:author-complete -->

# Neuron `compliance:consent:check`

> **Status:** audit manual **2026-04-13**. **v2** (L7738–L7758): coadă `compliance:consent:check`, `ComplianceNeuron`. **Repo:** **nu** există literalul în `queue-registry.ts`; echivalent operațional principal: **`compliance:gdpr:check`** (K56) — `E5_COMPLIANCE_GDPR_CHECK` (L634), worker `k56-compliance-gdpr-check.ts`, `withCognitiveSpan("e5:compliance:gdpr-check", …)` (L102), verificare `goldReferrals` cu `consentGiven=false` pentru statusuri ACTIVE/CONVERTED. **Flux consent referral:** `referral:consent:request` / `referral:consent:confirm` (E26/E27, L568–L570) — complementar, nu înlocuitor pentru „check” agregat din v2.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `compliance:consent:check` |
| etapa | E5 |
| familie (v2) | `compliance` |
| coadă runtime (mapare) | `compliance:gdpr:check` (+ cozi `referral:consent:*` pentru ciclul consent) |
| contract_path | `contracts/neurons/E5/compliance--consent--check.md` |
| ADR familie (indicativ) | [compliance](../../adr/families/e5/compliance.md) |

## Scop în context real

**v2:** verificare conformitate + log audit (L7753). **K56:** detectare violări consimțământ referral + INSERT `goldNurturingActions` tip `COMPLIANCE_VIOLATION` (L81–88 în `k56`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7738–L7758.
- `workers/shared/src/queue-registry.ts` — `E5_COMPLIANCE_GDPR_CHECK` (L634); `E5_REFERRAL_CONSENT_*` (L568–L570).
- `packages/shared/src/cognitive-node-catalog.ts` — `e5:compliance:gdpr-check` (L3275–L3282).
- `workers/e5-nurturing/src/workers/k56-compliance-gdpr-check.ts` — logica consent/violations (L33, L102+).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- **L7738–L7758:** `compliance:consent:check`, span `cognitive.compliance.consent.check`, non-AI (L7754).

## N/A pe criterii

- **8 — Rutare model:** N/A — K56 fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`compliance:gdpr:check`** în registry + worker K56; **fără** `compliance:consent:check` literal. | v2: `compliance:consent:check`. | Denumire graf ≠ coadă BullMQ. |
| 2 | Etapă, familie, swimlane | Catalog K56: etapă `5`, swimlane `audit-compliance` (L3280). | v2: E5, `compliance`. | — |
| 3 | Rol declarat | „Verificare GDPR K56 — consent activ…” (catalog L3278). | v2: audit + conformitate (L7749–L7752). | Scope K56 focalizat pe referral. |
| 4 | NeuronType + SOFAI | `ComplianceNeuron` (catalog L3279). | v2: `ComplianceNeuron` (L7745). | — |
| 5 | Criticitate | Catalog: `CRITICAL` (L3282). | v2: `MEDIUM` (L7747). | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e5:compliance:gdpr-check", …)` (`k56` L102). | v2: `cognitive.compliance.consent.check` (L7757). | Nume span diferit. |
| 7 | Înveliș politică | Worker: severitate CRITICAL, concurrency 1 (`k56` L4–5). | v2 Tier 4 (L7748), fără HITL obligatoriu (L7755). | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 non-AI (L7754). | — |
| 9 | Guardrails | Enum statusuri referral, canal `IN_APP` pentru audit (L35–37, L84–86 `k56`). | v2: audit90 zile (L7755). | — |
| 10 | Escaladare HITL | Log CRITICAL + acțiuni audit; fără enqueue HITL direct în K56. | v2: escaladare în OODA (L7753). | — |
| 11 | Micro-OODA | SELECT violations → log → INSERT audit (`k56`). | v2 OODA (L7753). | — |
| 12 | Tier + de-escaladare | Job opțional `tenantId` (`k56` L45–47). | v2 Tier 4 (L7748). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Drizzle/`@cerniq/db`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.compliance.consent.check`.
- **Cod:** `cognitive:e5:compliance:gdpr-check`.

---
*Audit manual 2026-04-13.*
