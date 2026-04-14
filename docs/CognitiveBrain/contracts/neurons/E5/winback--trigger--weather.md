<!-- neuron-contract:author-complete -->

# Neuron `winback:trigger:weather`

> **Status:** audit manual **2026-04-13**. Graf v2 **`winback:trigger:weather`** (L9201–9220) — **fără** coadă `winback:trigger:weather` în registry. **Lanț operațional apropiat:** **`alerts:weather:monitor`** (J52) → **`alerts:weather:match`** (J53) → **`alerts:campaign:trigger`** (J55) — [`j52-alert-weather-monitor.ts`](../../../../../workers/e5-nurturing/src/workers/j52-alert-weather-monitor.ts), [`j53-alert-weather-match.ts`](../../../../../workers/e5-nurturing/src/workers/j53-alert-weather-match.ts), [`j55-alert-campaign-trigger.ts`](../../../../../workers/e5-nurturing/src/workers/j55-alert-campaign-trigger.ts). Span-uri: `e5:alert:weather-monitor`, `e5:alert:weather-match`, `e5:alert:campaign-trigger`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `winback:trigger:weather` |
| cozi runtime (lanț) | `alerts:weather:monitor` → `alerts:weather:match` → `alerts:campaign:trigger` |
| etapa | E5 |
| familie (v2) | `winback` |
| contract_path | `contracts/neurons/E5/winback--trigger--weather.md` |
| ADR familie (indicativ) | [winback](../../adr/families/e5/winback.md), [alerts](../../adr/families/e5/alerts.md) |

## Scop în context real

Declanșator meteo în sensul grafului winback; în cod este pipeline de **alerting + campanii**, nu o coadă winback dedicată.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L9201–9220.
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E5_ALERT_WEATHER_MONITOR`, `E5_ALERT_WEATHER_MATCH`, `E5_ALERT_CAMPAIGN_TRIGGER` (~L625–631).
- Handlers: J52, J53, J55 (căi de mai sus).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `winback` (L9201–9220)

- **Evidence status:** graph-export (L9220)
- **OTel (v2):** `cognitive.winback.trigger.weather`
- **Model routing (v2):** LLM (L9217) — handleri J52–J55: fără rutare LLM în traseul nominal citit.

## N/A pe criterii

- —

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Graf winback vs cozi `alerts:*`. | v2 L9215. | — |
| 2 | Etapă, familie, swimlane | Catalog J52/J53: `alerts-weather`. | v2 E5 `winback`. | — |
| 3 | Rol declarat | ANM → match județ → trigger campanie → outreach. | v2 L9212–9214. | — |
| 4 | NeuronType + SOFAI | ExecutiveNeuron v2; workeri alertă — Sensory/alt tip în catalog. | v2 ExecutiveNeuron. | — |
| 5 | Criticitate | — | MEDIUM inferat. | — |
| 6 | Înveliș telemetrie | Trei span-uri pe lanț (vezi antet). | v2 L9219. | Un OTel v2 vs trei în cod. |
| 7 | Înveliș politică | `doNotContact`, validări job. | v2 L9217. | — |
| 8 | Rutare model (dacă AI) | **Nu** pe traseul nominal citit. | v2 LLM. | Contradicție. |
| 9 | Guardrails | Filtru clienți, backoff enqueue. | — | — |
| 10 | Escaladare HITL | — | v2 L9217. | — |
| 11 | Micro-OODA | Observație alertă → orientare teritoriu → acțiune campanie. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Tier 4. | — | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E5. | — | — |

### Mapare OTel

- **v2:** `cognitive.winback.trigger.weather`.
- **Cod:** `cognitive:e5:alert:weather-monitor` → `cognitive:e5:alert:weather-match` → `cognitive:e5:alert:campaign-trigger` (lanț).

---
*Audit manual 2026-04-13.*
