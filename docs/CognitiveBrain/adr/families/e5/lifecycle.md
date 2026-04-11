# ADR-FAMILY-e5-lifecycle

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e5-lifecycle |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E5 |
| Familie | `lifecycle` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e5-lifecycle` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

FSM nurturing 7 stări (plan FAZA 9b): eveniment comandă livrată, evaluare stare, onboarding, tranziții, metrici, advocate.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e5:lifecycle:order-completed` | `lifecycle:order:completed` |
| `e5:lifecycle:state-evaluate` | `lifecycle:state:evaluate` |
| `e5:onboarding:sequence-start` | `onboarding:sequence:start` |
| `e5:onboarding:step-execute` | `onboarding:step:execute` |
| `e5:onboarding:complete-check` | `onboarding:complete:check` |
| `e5:state:transition-execute` | `state:transition:execute` |
| `e5:state:metrics-update` | `state:metrics:update` |
| `e5:state:advocate-promote` | `state:advocate:promote` |

### Export graf (v2)

- **9** neuroni; exemple prefix `nurturing:*` (ex. `nurturing:onboarding:complete`, `nurturing:nps:send`).

### Reconciliere

| Observație |
| --- |
| Runtime folosește `lifecycle:*`, `onboarding:*`, `state:*`; graf folosește `nurturing:*` pentru unele noduri — **aceeași etapă produs**, convenție de nume diferită. |

## Decizie de guvernanță familială

1. **Proprietar:** E5 Lifecycle.
2. **Capabilitate:** progres client post-livrare.
3. **Telemetrie:** **CRITICAL** pe tranziții de stare.

## Limită evidență

- Diagramă FSM cu stări numerotate vs cod: din aplicație.
