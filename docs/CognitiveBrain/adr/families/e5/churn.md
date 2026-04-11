# ADR-FAMILY-e5-churn

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e5-churn |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E5 |
| Familie | `churn` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e5-churn` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Detecție și scoring churn, escaladare risc, sentiment, agregare, decay comportamental.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e5:churn:signal-detect` | `churn:signal:detect` |
| `e5:churn:score-calculate` | `churn:score:calculate` |
| `e5:churn:risk-escalate` | `churn:risk:escalate` |
| `e5:sentiment:analyze` | `sentiment:analyze` |
| `e5:sentiment:aggregate` | `sentiment:aggregate` |
| `e5:decay:behavior-detect` | `decay:behavior:detect` |

### Export graf (v2)

- **6** neuroni; exemple: `churn:alert:escalate`, `churn:behavior:detect`, `churn:recovery:*`, `churn:sentiment:analyze`, `churn:signal:create`.

### Reconciliere

- Graf: prefix `churn:` pentru sentiment/signal vs runtime `sentiment:analyze` **fără** prefix `churn:` — **grupare diferită** în export.
- `churn:risk:escalate` (registry) vs `churn:alert:escalate` (graf) — denumire apropiată, **nu** identică.

## Decizie de guvernanță familială

1. **Proprietar:** E5 Retention.
2. **Capabilitate:** intervenție înainte de pierdere client.
3. **Telemetrie:** **CRITICAL** pe escaladări; v2 menționează SLA pentru risc (comentariu registry B11).

## Limită evidență

- Cozi `churn:recovery:*` din graf: **nu** în `QUEUES` citit.
