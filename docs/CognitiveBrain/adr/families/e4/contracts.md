# ADR-FAMILY-e4-contracts

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e4-contracts |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E4 |
| Familie | `contracts` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e4-contracts` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Ciclu contract DocuSign: generare, clauze, trimitere envelope, polling status, procesare semnat.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e4:contract:generate` | `contract:generate` |
| `e4:contract:clauses-select` | `contract:clauses:select` |
| `e4:contract:docusign-send` | `contract:docusign:send` |
| `e4:contract:status-poll` | `contract:status:poll` |
| `e4:contract:signed-process` | `contract:signed:process` |

### Export graf (v2)

- **8** neuroni; exemple: `contract:archive:store`, `contract:clause:assemble`, `contract:generate:docx`, `contract:generate:notice`, `contract:sign:check-expiry`, `contract:sign:complete`.

### Reconciliere

- Runtime: 5 cozi; graf: denumiri extinse (`generate:docx`, `sign:complete` vs `signed-process`). **Mapare semantică** între etape, nu identitate string 1:1.

## Decizie de guvernanță familială

1. **Proprietar:** E4 Legal Ops.
2. **Capabilitate:** contracte executabile și arhivate.
3. **Telemetrie:** **HIGH** pe eșec DocuSign.

## Limită evidență

- Pași `archive:store` / `generate:notice`: în graf, **nu** ca literali separați în registry citit.
