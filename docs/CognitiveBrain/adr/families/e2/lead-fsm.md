# ADR-FAMILY-e2-lead-fsm

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e2-lead-fsm |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E2 |
| Familie | `lead-fsm` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e2-lead-fsm` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Familia **lead-fsm** gestionează tranziții de stare lead, validare și alocare utilizator în pipeline-ul de outreach.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e2:lead:state-transition` | `lead:state:transition` |
| `e2:lead:state-validate` | `lead:state:validate` |
| `e2:lead:assign-user` | `lead:assign:user` |

- Registry: `LEAD_STATE_TRANSITION`, `LEAD_STATE_VALIDATE`, `LEAD_ASSIGN_USER`.

### Export graf (v2)

- **2** neuroni; exemple: `lead:assign:user`, `lead:state:transition`.

### Reconciliere

- Graf **nu** listează explicit `lead:state:validate` în exemplul v2; catalog + registry **confirmă** trei cozi — al treilea neuron este în runtime dar poate fi grupat altfel în export.

## Decizie de guvernanță familială

1. **Proprietar:** Outreach E2 / CRM.
2. **Capabilitate:** consistență FSM lead înainte de mesajare.
3. **Telemetrie:** **HIGH** pe tranziții interzise sau conflict concurrent.
4. **Anomalii:** stări blocate, dublă alocare.

## Limită evidență

- Diagramă FSM completă vs cod: **nu** în v2; din worker/DB.
