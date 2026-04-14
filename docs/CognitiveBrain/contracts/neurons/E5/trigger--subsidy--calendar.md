<!-- neuron-contract:author-complete -->

# Neuron `trigger:subsidy:calendar`

> **Status:** audit manual **2026-04-13**. Graf v2 **`trigger:subsidy:calendar`** (L7534–7554) — **nu** există ca literal în registry. **Implementare apropiată:** **J54** — coadă **`alerts:apia:seasonal`**, `nodeKey` **`e5:alert:apia-seasonal`**, calendar static APIA în [`j54-alert-apia-seasonal.ts`](../../../../../workers/e5-nurturing/src/workers/j54-alert-apia-seasonal.ts), `withCognitiveSpan("e5:alert:apia-seasonal", …)`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `trigger:subsidy:calendar` |
| coadă runtime (semantic) | `alerts:apia:seasonal` |
| etapa | E5 |
| familie (v2) | `alerts` |
| contract_path | `contracts/neurons/E5/trigger--subsidy--calendar.md` |
| ADR familie (indicativ) | [alerts](../../adr/families/e5/alerts.md) |

## Scop în context real

**Graf:** trigger calendar subvenții. **Cod:** verificare ferestre deadline APIA (SAPS, plăți, contestații) și enqueue **`alerts:campaign:trigger`** (J55) per client eligibil.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L7534–7554.
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e5:alert:apia-seasonal` (~L3255–3262).
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E5_ALERT_APIA_SEASONAL` (~L628–629).
- Handler: [`j54-alert-apia-seasonal.ts`](../../../../../workers/e5-nurturing/src/workers/j54-alert-apia-seasonal.ts).
- ADR: [`adr/families/e5/alerts.md`](../../adr/families/e5/alerts.md) — tabel J54.
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `alerts` (v2 L7534–7554)

- **Confirmed queue field:** `trigger:subsidy:calendar`
- **Neuron type (inferat):** AlertNeuron
- **Evidence status:** graph-export (L7554)
- **OTel (v2):** `cognitive.trigger.subsidy.calendar`

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI în J54 (logică deterministă calendar).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Runtime: `alerts:apia:seasonal`. Graf: `trigger:subsidy:calendar`. | v2 L7548. | Două denumiri pentru același rol operațional. |
| 2 | Etapă, familie, swimlane | Catalog: etapa 5, swimlane `alerts-weather`. | v2 E5 `alerts`. | Swimlane diferită între catalog și etichetă familie graf. |
| 3 | Rol declarat | J54 antet: calendar APIA + enqueue J55 (~L1–14, ~L100+). | v2 L7546–7547. | — |
| 4 | NeuronType + SOFAI | Catalog: `SensoryNeuron`. | v2 AlertNeuron inferat. | Nealiniere tip între graf și catalog. |
| 5 | Criticitate | MEDIUM în catalog. | v2 HIGH inferat. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e5:alert:apia-seasonal", …)` (~L104). Span `cognitive:e5:alert:apia-seasonal`. | v2 L7553 — `cognitive.trigger.subsidy.calendar`. | Două convenții de nume span. |
| 7 | Înveliș politică | Calendar static în cod — modificare prin redeploy (comentariu J54 ~L26–27). | v2 L7551. | — |
| 8 | Rutare model (dacă AI) | **N/A** pentru J54. | v2 Non-AI. | — |
| 9 | Guardrails | Filtru `goldCompanies` (ex. doNotContact). | — | — |
| 10 | Escaladare HITL | Nu în J54 direct. | — | — |
| 11 | Micro-OODA | Verificare perioadă → select clienți → enqueue campanii. | v2 OODA L7549. | — |
| 12 | Tier + de-escaladare | Fără prag LLM. | v2 Tier 3. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E5 (Redis DB 5), Drizzle. | — | — |

### Mapare OTel

- **v2 (graf):** `cognitive.trigger.subsidy.calendar`.
- **Cod:** `cognitive:e5:alert:apia-seasonal` — aliniat catalogului `e5:alert:apia-seasonal`.

---
*Audit manual 2026-04-13.*
