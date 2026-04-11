# ADR-FAMILY-e2-sequences

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e2-sequences |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E2 |
| Familie | `sequences` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e2-sequences` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Secvențe de follow-up programate pentru outreach (BullMQ delayed jobs / pași).

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e2:sequence:schedule-followup` | `sequence:schedule:followup` |
| `e2:sequence:stop` | `sequence:stop` |
| `e2:sequence:advance` | `sequence:advance` |
| `e2:sequence:create` | `sequence:create` |

- Registry: `SEQUENCE_*` — patru cozi.

### Export graf (v2)

- **1** neuron în export; exemplu: `sequence:schedule:followup` **doar**.

### Reconciliere

| Observație |
| --- |
| Runtime + catalog au **4** cozi secvență; graf export enumeră **1** — exportul este **submulțime** sau grupare diferită. |

## Decizie de guvernanță familială

1. **Proprietar:** Outreach E2.
2. **Capabilitate:** cadence follow-up fără spam.
3. **Telemetrie:** **MEDIUM**; erori de scheduling monitorizate.

## Limită evidență

- Model de date „sequence” vs job BullMQ: din worker.
