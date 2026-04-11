# ADR-FAMILY-e5-compliance

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e5-compliance |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E5 |
| Familie | `compliance` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e5-compliance` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Conformitate GDPR, concurență și păstrare date în campaniile de nurturing.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e5:compliance:gdpr-check` | `compliance:gdpr:check` |
| `e5:compliance:competition-law` | `compliance:competition:law` |
| `e5:compliance:data-retention` | `compliance:data:retention` |

### Export graf (v2)

- **4** neuroni; exemple: `compliance:audit:generate`, `compliance:consent:check`, `compliance:data:anonymize`, `compliance:optout:process`.

### Reconciliere

- Graf: `compliance:consent:check`, `compliance:optout:process`, `compliance:audit:generate` — **nu** în cei trei literali registry de mai sus; partial overlap cu `gdpr-check` / `data-retention`. **Mapare deschisă.**

## Decizie de guvernanță familială

1. **Proprietar:** E5 Legal / DPO.
2. **Capabilitate:** campanii în limite legale.
3. **Telemetrie:** evenimente audit compliance.

## Limită evidență

- Implementare completă a celor 4 noduri din graf comparativ cu cele trei cozi din registry: audit worker.
