<!-- neuron-contract:author-complete -->

# Neuron `winback:trigger:subsidy`

> **Status:** audit manual **2026-04-13**. Graf v2 **`winback:trigger:subsidy`** (L9179–9199) — **fără** coadă BullMQ cu acest nume. **Lanț operațional apropiat (alerte APIA → outreach):** **`alerts:apia:seasonal`** — J54 [`j54-alert-apia-seasonal.ts`](../../../../../workers/e5-nurturing/src/workers/j54-alert-apia-seasonal.ts), `withCognitiveSpan("e5:alert:apia-seasonal", …)`, apoi enqueue **`alerts:campaign:trigger`** (J55) pentru clienți eligibili — vezi și neuronul `trigger:subsidy:calendar`. **Nu** înseamnă automat enqueue direct `winback:campaign:create`; legătura cu winback este **contextuală** (retenție/recuperare), nu o coadă `winback:trigger:*`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `winback:trigger:subsidy` |
| coadă runtime (aprox.) | `alerts:apia:seasonal` (+ `alerts:campaign:trigger`) |
| etapa | E5 |
| familie (v2) | `winback` |
| contract_path | `contracts/neurons/E5/winback--trigger--subsidy.md` |
| ADR familie (indicativ) | [winback](../../adr/families/e5/winback.md), [alerts](../../adr/families/e5/alerts.md) |

## Scop în context real

Declanșator conceptual „subsidy” în subgraph winback v2; implementarea monitorizată este în familia alertelor APIA + campanii.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L9179–9199.
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E5_ALERT_APIA_SEASONAL`, `E5_ALERT_CAMPAIGN_TRIGGER`.
- Handlers: [`j54-alert-apia-seasonal.ts`](../../../../../workers/e5-nurturing/src/workers/j54-alert-apia-seasonal.ts), [`j55-alert-campaign-trigger.ts`](../../../../../workers/e5-nurturing/src/workers/j55-alert-campaign-trigger.ts).
- Contract înrudit: [`trigger--subsidy--calendar.md`](./trigger--subsidy--calendar.md).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `winback` (L9179–9199)

- **Evidence status:** graph-export (L9199)
- **OTel (v2):** `cognitive.winback.trigger.subsidy`
- **Model routing (v2):** LLM (L9195) — J54/J55 citite: logică deterministă + template-uri (J55); **fără** rutare LLM obligatorie pe traseul nominal citit.

## N/A pe criterii

- —

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Graf `winback:trigger:subsidy` absent din `QUEUES`. | v2 L9193. | Mapare pe alerte, nu pe winback queue. |
| 2 | Etapă, familie, swimlane | J54 catalog: `alerts-weather` / SensoryNeuron. | v2 E5 `winback`. | Familie diferită între graf și worker. |
| 3 | Rol declarat | J54: ferestre APIA → J55 per client. | v2 L9190–9192. | — |
| 4 | NeuronType + SOFAI | ExecutiveNeuron v2 vs SensoryNeuron J54 catalog. | v2 ExecutiveNeuron. | Contradicție. |
| 5 | Criticitate | MEDIUM J54. | MEDIUM v2. | — |
| 6 | Înveliș telemetrie | `e5:alert:apia-seasonal`; J55 `e5:alert:campaign-trigger`. | v2 L9198. | Span ≠ prefix `winback`. |
| 7 | Înveliș politică | Filtru `goldCompanies` în J54. | v2 L9196. | — |
| 8 | Rutare model (dacă AI) | Traseu citit: fără LLM obligatoriu. | v2 LLM. | Contradicție v2 vs cod. |
| 9 | Guardrails | `doNotContact`, idempotență jobId. | — | — |
| 10 | Escaladare HITL | — | v2 L9196. | — |
| 11 | Micro-OODA | Calendar → match clienți → campanie → outreach. | v2 OODA orchestrare. | — |
| 12 | Tier + de-escaladare | Tier 4 v2. | — | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E5. | — | — |

### Mapare OTel

- **v2:** `cognitive.winback.trigger.subsidy`.
- **Cod (aprox.):** `cognitive:e5:alert:apia-seasonal` și `cognitive:e5:alert:campaign-trigger` pe lanțul APIA.

---
*Audit manual 2026-04-13.*
