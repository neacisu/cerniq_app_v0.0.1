# ADR-FAMILY-e4-hitl

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e4-hitl |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E4 |
| Familie | `hitl` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e4-hitl` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

HITL E4: aprobări credit, rambursări mari, investigare plăți, rezolvare task, escaladare SLA. v2 ADR-0008: convergență semantică cu motorul unificat.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e4:hitl:credit-override` | `hitl:approval:credit-override` |
| `e4:hitl:credit-limit` | `hitl:approval:credit-limit` |
| `e4:hitl:refund-large` | `hitl:approval:refund-large` |
| `e4:hitl:payment-investigation` | `hitl:investigation:payment` |
| `e4:hitl:task-resolve` | `hitl:task:resolve` |
| `e4:hitl:escalation-overdue` | `hitl:escalation:overdue` |

### Export graf (v2)

- **9** neuroni; exemple: `hitl:approval:contract-clause`, `hitl:approval:return`, plus cele de mai sus.

### Reconciliere

- Graf: `hitl:approval:return`, `hitl:approval:contract-clause` — **nu** în tabelul registry extras; posibil încă neînregistrate sau denumiri graf.

## Decizie de guvernanță familială

1. **Proprietar:** E4 + HITL.
2. **Capabilitate:** control financiar pentru decizii cu impact mare.
3. **Telemetrie:** **CRITICAL**; SLA din comentarii registry (ex. 4h/8h).

## Limită evidență

- Mapare completă 9 noduri graf ↔ `QUEUES`: fișier registry integral + export graf.
