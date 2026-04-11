# ADR-FAMILY-e5-hitl

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e5-hitl |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E5 |
| Familie | `hitl` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e5-hitl` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

HITL E5: review winback și plângeri (comentarii registry). v2 ADR-0008: convergență semantică.

## Dovezi confirmate în Cerniq

| Constantă | Coadă BullMQ |
| --- | --- |
| `E5_HITL_WINBACK_REVIEW` | `hitl:winback:review` |
| `E5_HITL_COMPLAINT_REVIEW` | `hitl:complaint:review` |

### Export graf (v2)

- **6** neuroni; exemple: `hitl:dashboard:metrics`, `hitl:dashboard:sync`, `hitl:task:create`, `hitl:task:expire-check`, `hitl:task:nps-followup`, `hitl:task:resolve`.

### Reconciliere

| Observație |
| --- |
| Registry la audit: **2** cozi `hitl:*` E5; graf: **6** `hitl:task:*` / dashboard — **gap** (dashboard/task poate fi UI-only sau cozi neînregistrate încă). |

## Decizie de guvernanță familială

1. **Proprietar:** E5 + HITL Platform.
2. **Capabilitate:** revizuire umană pentru winback și plângeri.
3. **Telemetrie:** **CRITICAL**.

## Limită evidență

- Mapare task-uri graf ↔ cozi BullMQ: audit complet `queue-registry.ts` + worker E5.
