# ADR-FAMILY-e2-quota

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e2-quota |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E2 |
| Familie | `quota` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e2-quota` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

**Quota Guardian** și verificarea orelor de program pentru limitarea trimiterilor outreach.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e2:quota:guardian-check` | `quota:guardian:check` |
| `e2:quota:guardian-increment` | `quota:guardian:increment` |
| `e2:quota:guardian-reset` | `quota:guardian:reset` |
| `e2:quota:business-hours` | `quota:business-hours:check` |

- Registry: `QUOTA_GUARDIAN_*`, `QUOTA_BUSINESS_HOURS_CHECK`.

### Export graf (v2)

- **4** neuroni; exemple aliniate cu registry.

## Decizie de guvernanță familială

1. **Proprietar:** Outreach Platform.
2. **Capabilitate:** respectare limite zilnice și ferestre de trimitere.
3. **Telemetrie:** **HIGH** pe încălcări cotă.
4. **Guardrail:** depășire cotă → blocare sau defer — comportament din worker.

## Limită evidență

- Persistența contoarelor (Redis key design): din implementare worker.
