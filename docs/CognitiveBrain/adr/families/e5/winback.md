# ADR-FAMILY-e5-winback

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e5-winback |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E5 |
| Familie | `winback` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e5-winback` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Campanii win-back: creare, pași, oferte LLM, urmărire rezultat, escaladare HITL.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e5:winback:campaign-create` | `winback:campaign:create` |
| `e5:winback:step-execute` | `winback:step:execute` |
| `e5:winback:offer-generate` | `winback:offer:generate` |
| `e5:winback:result-track` | `winback:result:track` |
| `e5:winback:escalate-hitl` | `winback:escalate:hitl` |

### Export graf (v2)

- **4** neuroni; exemple: `winback:campaign:enroll`, `winback:step:execute`, `winback:trigger:subsidy`, `winback:trigger:weather`.

### Reconciliere

- Graf: `campaign:enroll`, `trigger:subsidy`, `trigger:weather` — **nu** în `QUEUES` ca literali separați; runtime are `campaign:create` vs `enroll` — **denumiri diferite**.
- v2 ADR-0008 citează `e5:winback:escalate-hitl` — aliniat cu `winback:escalate:hitl` în registry.

## Decizie de guvernanță familială

1. **Proprietar:** E5 Retention.
2. **Capabilitate:** recuperare clienți AT_RISK/CHURNED.
3. **Telemetrie:** conversie winback și cost ofertă.

## Limită evidență

- Triggere subsidy/weather: implementare vs planificare pură — din worker.
