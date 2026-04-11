# ADR-FAMILY-e2-monitoring

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e2-monitoring |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E2 |
| Familie | `monitoring` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e2-monitoring` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Familia **monitoring** (în sensul graf v2 pentru E2) grupează **monitorizare** canale (telefon, email, cotă) și **alerte** asociate (bounce, offline, banned). În catalog, `e2:monitor:*` și `e2:alert:*` sunt neuroni distincți dar același swimlane operațional.

## Dovezi confirmate în Cerniq

### Monitorizare (catalog + registry)

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e2:monitor:phone-health` | `monitor:phone:health` |
| `e2:monitor:email-deliverability` | `monitor:email:deliverability` |
| `e2:monitor:quota-usage` | `monitor:quota:usage` |

### Alerte (registry suplimentar față de v2 list)

| nodeKey | Coadă BullMQ | Notă registry |
| --- | --- | --- |
| `e2:alert:phone-offline` | `alert:phone:offline` | — |
| `e2:alert:phone-banned` | `alert:phone:banned` | notificare vs `phone:quarantine:trigger` |
| `e2:alert:bounce-high` | `alert:bounce:high` | — |

- Registry: `PHONE_QUARANTINE` = `phone:quarantine:trigger` (acțiune DB + realocare) — **nu** în lista scurtă v2 dar parte din același perimetru operațional.

### Export graf (v2)

- **8** neuroni; exemple: `alert:bounce:high`, `alert:phone:banned`, `alert:phone:offline`, `monitor:email:deliverability`, `monitor:phone:health`, `monitor:quota:usage`.

### Reconciliere

- Coerență bună între v2 exemple și registry pentru monitor + alerte listate; `phone:quarantine:trigger` este extensie documentată în registry.

## Decizie de guvernanță familială

1. **Proprietar:** Outreach SRE + Platform.
2. **Capabilitate:** sănătate canale înainte de scalare campanii.
3. **Telemetrie:** metrici Prometheus / Loki conform lanțului din v2 §0.1.
4. **Anomalii:** quarantine în masă, fals pozitiv banned.

## Limită evidență

- Legătura cauzală exactă alertă → acțiune automată vs HITL: din cod worker.
