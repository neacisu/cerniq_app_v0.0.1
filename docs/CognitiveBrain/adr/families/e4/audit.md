# ADR-FAMILY-e4-audit

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e4-audit |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E4 |
| Familie | `audit` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e4-audit` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Lanț de audit hash și conformitate post-vânzare (scriere log, verificare lanț, anonimizare GDPR).

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e4:audit:log-write` | `audit:log:write` |
| `e4:audit:chain-verify` | `audit:chain:verify` |
| `e4:audit:data-anonymize` | `audit:data:anonymize` |

- Registry: `E4_AUDIT_*`; comentarii cron pentru J46/J47.

### Export graf (v2)

- **3** neuroni; exemple: `audit:compliance:check`, `audit:data:anonymize`, `audit:log:write`.

### Reconciliere

- Graf: `audit:compliance:check` — **lipsește** din `QUEUES` la audit; registry are `audit:chain:verify` ca verificare integritate. Posibil același rol sub alt nume sau nod neimplementat.

## Decizie de guvernanță familială

1. **Proprietar:** E4 Compliance.
2. **Capabilitate:** probitate date și retention.
3. **Telemetrie:** eșec verificare lanț = **CRITICAL**.

## Limită evidență

- Mapare `compliance:check` ↔ `chain:verify`: confirmare din cod worker.
