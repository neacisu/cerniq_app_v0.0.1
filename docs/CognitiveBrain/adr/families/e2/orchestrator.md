# ADR-FAMILY-e2-orchestrator

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e2-orchestrator |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E2 |
| Familie | `orchestrator` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e2-orchestrator` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Familia **orchestrator** E2 coordonează rutarea outreach: dispatch, router, alocator telefon, selector canal.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e2:outreach:orchestrator-dispatch` | `outreach:orchestrator:dispatch` |
| `e2:outreach:orchestrator-router` | `outreach:orchestrator:router` |
| `e2:outreach:phone-allocator` | `outreach:phone:allocator` |
| `e2:outreach:channel-selector` | `outreach:channel:selector` |

- Registry: `OUTREACH_ORCHESTRATOR_DISPATCH`, `OUTREACH_ORCHESTRATOR_ROUTER`, `OUTREACH_PHONE_ALLOCATOR`, `OUTREACH_CHANNEL_SELECTOR`.

### Export graf (v2)

- **7** neuroni; exemple: `outreach:channel:selector`, `outreach:orchestrator:dispatch`, `outreach:orchestrator:router`, `outreach:phone:allocator`, `outreach:wa:delay`, `outreach:wa:reschedule`.

### Reconciliere

| Observație |
| --- |
| Graf v2: `outreach:wa:delay`, `outreach:wa:reschedule` — **nu** apar ca literali în `QUEUES` la secțiunea citată; posibil cozi dinamice / graf planificare / worker local. **Gap** față de registry static. |

## Decizie de guvernanță familială

1. **Proprietar:** Outreach Platform.
2. **Capabilitate:** rutare deterministă + fallback canal.
3. **Telemetrie:** **CRITICAL** pe dispatch/router (ExecutiveNeuron în catalog).
4. **Anomalii:** deadlock alocator, starvation canal.

## Limită evidență

- `outreach:wa:delay` / `outreach:wa:reschedule`: verificare în [workers/outreach/](../../../../workers/outreach/) sau generare dinamică.
