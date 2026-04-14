<!-- neuron-contract:author-complete -->

# Neuron `referral:request:prepare`

> **Status:** audit manual **2026-04-13**. Graf v2 **`referral:request:prepare`** (L9044–9064) — **fără** coadă dedicată în registry. **Mapare operațională:** pașii de pregătire + trimitere către prospect sunt **combinați** în **`referral:outreach:prospect`** — E28 [`e28-referral-outreach-prospect.ts`](../../../../../workers/e5-nurturing/src/workers/e28-referral-outreach-prospect.ts), `withCognitiveSpan("e5:referral:outreach-prospect", …)`, catalog `e5:referral:outreach-prospect`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `referral:request:prepare` |
| coadă runtime (semantic) | `referral:outreach:prospect` |
| etapa | E5 |
| familie (v2) | `referral` |
| contract_path | `contracts/neurons/E5/referral--request--prepare.md` |
| ADR familie (indicativ) | [referral](../../adr/families/e5/referral.md) |

## Scop în context real

v2 separă „prepare” de „send”; în cod, outreach-ul post-GDPR este un singur worker cu înregistrare acțiune și enqueue E29.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L9044–9064.
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e5:referral:outreach-prospect`.
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E5_REFERRAL_OUTREACH_PROSPECT` (~L572).
- Handler: [`e28-referral-outreach-prospect.ts`](../../../../../workers/e5-nurturing/src/workers/e28-referral-outreach-prospect.ts).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `referral` (L9044–9064)

- **Evidence status:** graph-export (L9064)
- **OTel (v2):** `cognitive.referral.request.prepare`

## N/A pe criterii

- **8 — Rutare model:** N/A pentru E28 (determinist; fără LLM în fișierul citit).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Graf granular vs coadă `referral:outreach:prospect`. | v2 L9058. | Granularitate v2 ≠ atomicitate cod. |
| 2 | Etapă, familie, swimlane | MotorNeuron, `referral-management` (catalog E28). | v2 E5 `referral`. | — |
| 3 | Rol declarat | Guard GDPR + acțiune + delay E29. | v2 L9055–9057. | — |
| 4 | NeuronType + SOFAI | MotorNeuron (catalog). | v2 ProceduralNeuron inferat. | **Contradicție** tip v2 vs catalog. |
| 5 | Criticitate | — | MEDIUM inferat. | — |
| 6 | Înveliș telemetrie | `e5:referral:outreach-prospect` în E28. | v2 L9063. | Nume span ≠ OTel v2 pentru `prepare`. |
| 7 | Înveliș politică | Fără consent activ → throw (E28). | v2 L9061. | — |
| 8 | Rutare model (dacă AI) | **N/A** E28. | Non-AI. | — |
| 9 | Guardrails | Status `ACTIVE` + `consentGiven=true`. | — | — |
| 10 | Escaladare HITL | — | v2 L9061. | — |
| 11 | Micro-OODA | Validare → acțiune → coadă tracking. | v2 L9059. | — |
| 12 | Tier + de-escaladare | — | Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ DB 5. | — | — |

### Mapare OTel

- **v2:** `cognitive.referral.request.prepare`.
- **Cod (E28):** `cognitive:e5:referral:outreach-prospect`.

---
*Audit manual 2026-04-13.*
