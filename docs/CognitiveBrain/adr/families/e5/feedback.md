# ADR-FAMILY-e5-feedback

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e5-feedback |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E5 |
| Familie | `feedback` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e5-feedback` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

NPS, satisfacție, plângeri, rapoarte periodice.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e5:feedback:nps-send` | `feedback:nps:send` |
| `e5:feedback:nps-process` | `feedback:nps:process` |
| `e5:feedback:satisfaction-track` | `feedback:satisfaction:track` |
| `e5:feedback:complaint-route` | `feedback:complaint:route` |
| `e5:feedback:report-generate` | `feedback:report:generate` |

### Export graf (v2)

- **6** neuroni; exemple: `feedback:competitor:log`, `feedback:conversation:analyze`, `feedback:entity:store`, `feedback:nps:aggregate`, `feedback:sentiment:analyze`, `feedback:writeback:crm`.

### Reconciliere

- Graf: cozi suplimentare față de registry (aggregate, sentiment, crm) — **nu** toate în `QUEUES` la audit ca liste separate; posibil denumiri planificare sau mapare în alt modul.

## Decizie de guvernanță familială

1. **Proprietar:** E5 CX.
2. **Capabilitate:** închidere buclă feedback.
3. **Telemetrie:** NPS și plângeri = **HIGH**.

## Limită evidență

- Mapare 6 noduri graf ↔ 5 cozi registry: detaliu în worker.
