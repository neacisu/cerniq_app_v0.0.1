# ADR-FAMILY-e3-negotiation

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e3-negotiation |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E3 |
| Familie | `negotiation` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e3-negotiation` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

FSM negociere B2B: tranziții, istoric, linii, reminder, expirare, închidere, redeschidere, abandon.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e3:negotiation:state-transition` | `negotiation:state:transition` |
| `e3:negotiation:history-log` | `negotiation:history:log` |
| `e3:negotiation:items-update` | `negotiation:items:update` |
| `e3:negotiation:reminder-send` | `negotiation:reminder:send` |
| `e3:negotiation:expire-check` | `negotiation:expire:check` |
| `e3:negotiation:close-execute` | `negotiation:close:execute` |
| `e3:negotiation:reopen-request` | `negotiation:reopen:request` |
| `e3:negotiation:abandon-process` | `negotiation:abandon:process` |

- Registry: `E3_NEGOTIATION_*` — opt cozi.

### Export graf (v2)

- **4** neuroni; exemple: `negotiation:expire:check`, `negotiation:reminder:send`, `negotiation:state:transition`, `negotiation:summary:generate`.

### Reconciliere

- `negotiation:summary:generate` în graf — **lipsește** din `QUEUES` la audit; catalog **nu** conține acest literal în blocul D19–D26 citat. **Gap** planificare vs implementare registry.

## Decizie de guvernanță familială

1. **Proprietar:** E3 Sales Logic.
2. **Capabilitate:** consistență stări negociere și închidere comandă.
3. **Telemetrie:** **CRITICAL** pe `close-execute`.

## Limită evidență

- Diagramă FSM completă vs cod: din aplicație.
