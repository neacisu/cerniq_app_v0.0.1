<!-- neuron-contract:author-complete -->

# Neuron `referral:potential:tag`

> **Status:** audit manual **2026-04-13**. Graf v2 **`referral:potential:tag`** (L9022–9042) — **nu** există coadă cu acest nume în registry. **Mapare semantică rezonabilă (parțială):** **`referral:detect`** — E25 [`e25-referral-detect.ts`](../../../../../workers/e5-nurturing/src/workers/e25-referral-detect.ts) creează înregistrări `gold_referrals` cu status `PENDING_CONSENT` („potențial” în pipeline). **Nu** este echivalență 1:1 cu eticheta graf „tag” izolată.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `referral:potential:tag` |
| coadă runtime (semantic) | `referral:detect` |
| etapa | E5 |
| familie (v2) | `referral` |
| contract_path | `contracts/neurons/E5/referral--potential--tag.md` |
| ADR familie (indicativ) | [referral](../../adr/families/e5/referral.md) |

## Scop în context real

v2: etichetare potențial referral. Cod: detectare din mesaj + inserție referral + lanț spre E26.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L9022–9042.
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e5:referral:detect` (~L2983+).
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E5_REFERRAL_DETECT` (~L566).
- Handler: [`e25-referral-detect.ts`](../../../../../workers/e5-nurturing/src/workers/e25-referral-detect.ts) — `withCognitiveSpan("e5:referral:detect", …)` (verificare în fișier).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `referral` (L9022–9042)

- **Evidence status:** graph-export (L9042)
- **OTel (v2):** `cognitive.referral.potential.tag`

## N/A pe criterii

- — (rând 8: E25 folosește LLM — vezi handler).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Graf ≠ `referral:detect`; runtime pentru „tag” = detect. | v2 L9036. | Două denumiri. |
| 2 | Etapă, familie, swimlane | Catalog: `referral-management`. | v2 E5. | — |
| 3 | Rol declarat | E25: detectare mențiune + INSERT referral. | v2 L9033–9035. | — |
| 4 | NeuronType + SOFAI | Catalog: tip pentru `referral:detect` (verificare catalog). | v2 ProceduralNeuron inferat. | Tip catalog poate diferi de inferat v2. |
| 5 | Criticitate | — | MEDIUM inferat. | — |
| 6 | Înveliș telemetrie | Span `e5:referral:detect` pe E25. | v2 L9041. | Span diferit de eticheta OTel v2 pentru `potential.tag`. |
| 7 | Înveliș politică | Cooldown 30 zile, GDPR în comentarii E25. | v2 L9039. | — |
| 8 | Rutare model (dacă AI) | LLM `detectReferralMention` în E25. | v2 Non-AI pentru nodul `potential:tag`. | Contradicție între granularitatea v2 și implementare. |
| 9 | Guardrails | Validări DB + cooldown. | — | — |
| 10 | Escaladare HITL | — | v2 L9039. | — |
| 11 | Micro-OODA | Mesaj → LLM → persist → E26. | v2 L9037. | — |
| 12 | Tier + de-escaladare | — | Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E5, apel LLM extern documentat în E25. | — | — |

### Mapare OTel

- **v2:** `cognitive.referral.potential.tag`.
- **Cod (detect):** `cognitive:e5:referral:detect` — dacă se adoptă maparea semantică de mai sus.

---
*Audit manual 2026-04-13.*
