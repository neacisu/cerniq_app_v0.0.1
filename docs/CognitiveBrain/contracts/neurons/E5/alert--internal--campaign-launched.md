<!-- neuron-contract:author-complete -->

# Neuron `alert:internal:campaign-launched`

> **Status:** audit manual **2026-04-13**. v2 L7424–7444 — **`alert:internal:campaign-launched`** graph-export; **fără** literal în `queue-registry.ts`. Registry E5 are `alerts:campaign:trigger` (J55) — **semantic apropiat** („trigger campanie”) dar **nu** identitate string 1:1 (vezi ADR alerts).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `alert:internal:campaign-launched` |
| etapa | E5 |
| familie (v2) | `alerts` |
| contract_path | `contracts/neurons/E5/alert--internal--campaign-launched.md` |
| ADR familie (indicativ) | [alerts](../../adr/families/e5/alerts.md) |

## Scop în context real

Notificare internă lansare campanie (graf). **Cod:** nu există coadă cu acest nume; lanțul J54→J55 folosește `alerts:campaign:trigger` pentru execuție campanie, nu pentru „launched” intern explicit.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L7424–7444.
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E5_ALERT_CAMPAIGN_TRIGGER: "alerts:campaign:trigger"` (~L630–631).
- ADR: [`adr/families/e5/alerts.md`](../../adr/families/e5/alerts.md).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `alerts` (v2 L7424–7444)

- **Confirmed queue field:** `alert:internal:campaign-launched`
- **Evidence status:** graph-export (L7444)
- **OTel (v2):** `cognitive.alert.internal.campaign-launched`

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Graf: `alert:internal:campaign-launched`. Runtime apropiat: `alerts:campaign:trigger`. | v2 L7438. | Mapare semantică, nu egalitate. |
| 2 | Etapă, familie, swimlane | — | v2 E5 `alerts`. | — |
| 3 | Rol declarat | — | v2 L7436–7437. | — |
| 4 | NeuronType + SOFAI | — | AlertNeuron inferat. | — |
| 5 | Criticitate | — | HIGH inferat. | — |
| 6 | Înveliș telemetrie | — | v2 L7443. | — |
| 7 | Înveliș politică | — | v2 L7441. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L7441. | — |
| 11 | Micro-OODA | — | v2 L7439. | — |
| 12 | Tier + de-escaladare | — | Tier 3. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ `alerts:*` pentru familia înregistrată. | — | — |

### Mapare OTel

- **v2:** `cognitive.alert.internal.campaign-launched`.
- **Cod:** pentru J55 vezi `e5:alert:campaign-trigger` în catalog; span dedicat graf: neimplementat.

---
*Audit manual 2026-04-13.*
