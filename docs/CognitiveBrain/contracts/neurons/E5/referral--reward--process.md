<!-- neuron-contract:author-complete -->

# Neuron `referral:reward:process`

> **Status:** audit manual **2026-04-13**. Graf v2 **`referral:reward:process`** (L9110–9130) — **fără** coadă unică cu acest nume. **Lanț runtime:** **`referral:reward:issue`** (E30) → **`referral:reward:notify`** (E31) — [`e30-referral-reward-issue.ts`](../../../../../workers/e5-nurturing/src/workers/e30-referral-reward-issue.ts), [`e31-referral-reward-notify.ts`](../../../../../workers/e5-nurturing/src/workers/e31-referral-reward-notify.ts). Declanșare tipică din E29 după conversie. Ambele cozi sunt în registry.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `referral:reward:process` |
| cozi runtime (lanț) | `referral:reward:issue` → `referral:reward:notify` |
| etapa | E5 |
| familie (v2) | `referral` |
| contract_path | `contracts/neurons/E5/referral--reward--process.md` |
| ADR familie (indicativ) | [referral](../../adr/families/e5/referral.md) |

## Scop în context real

Emitere și notificare recompensă referral după conversie; v2 agregă într-un singur nod conceptual „process”.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L9110–9130.
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e5:referral:reward-issue`, `e5:referral:reward-notify`.
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E5_REFERRAL_REWARD_ISSUE`, `E5_REFERRAL_REWARD_NOTIFY` (~L576–578).
- Handlers: E30, E31; consumator amonte: [`e29-referral-tracking-conversion.ts`](../../../../../workers/e5-nurturing/src/workers/e29-referral-tracking-conversion.ts).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `referral` (L9110–9130)

- **Evidence status:** graph-export (L9130)
- **OTel (v2):** `cognitive.referral.reward.process`

## N/A pe criterii

- **8 — Rutare model:** N/A — procesare deterministă în E30/E31 (fără LLM în antetele citite).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Graf agregat vs două cozi registry. | v2 L9124. | — |
| 2 | Etapă, familie, swimlane | `referral-management` în catalog pentru E30/E31. | v2 E5. | — |
| 3 | Rol declarat | Emitere credit/beneficiu + notificare canal. | v2 L9121–9123. | Detaliu business: citire completă E30/E31. |
| 4 | NeuronType + SOFAI | Tipuri din catalog per coadă. | v2 ProceduralNeuron inferat. | — |
| 5 | Criticitate | — | MEDIUM inferat. | — |
| 6 | Înveliș telemetrie | `e5:referral:reward-issue`, `e5:referral:reward-notify` (`withCognitiveSpan` în E30/E31). | v2 L9129. | Un singur OTel v2 pentru întreg lanțul. |
| 7 | Înveliș politică | — | v2 L9127. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L9127. | — |
| 11 | Micro-OODA | Conversie (E29) → issue → notify. | v2 L9125. | — |
| 12 | Tier + de-escaladare | — | Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ DB 5. | — | — |

### Mapare OTel

- **v2:** `cognitive.referral.reward.process`.
- **Cod:** `cognitive:e5:referral:reward-issue` și `cognitive:e5:referral:reward-notify` (două span-uri pentru același concept graf).

---
*Audit manual 2026-04-13.*
