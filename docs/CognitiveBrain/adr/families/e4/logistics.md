# ADR-FAMILY-e4-logistics

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e4-logistics |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E4 |
| Familie | `logistics` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e4-logistics` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Livrări Sameday, stoc Oblio E4, retururi: AWB, polling, COD, pickup, deduct, return, inițiere/procesare retur.

## Dovezi confirmate în Cerniq

### Sameday

| nodeKey | Coadă |
| --- | --- |
| `e4:sameday:awb-create` | `sameday:awb:create` |
| `e4:sameday:status-poll` | `sameday:status:poll` |
| `e4:sameday:status-process` | `sameday:status:process` |
| `e4:sameday:cod-process` | `sameday:cod:process` |
| `e4:sameday:return-initiate` | `sameday:return:initiate` |
| `e4:sameday:pickup-schedule` | `sameday:pickup:schedule` |

### Stoc E4 (Oblio sync, deduct, return, alert)

| nodeKey | Coadă |
| --- | --- |
| `e4:stock:sync-oblio` | `stock:sync:oblio` |
| `e4:stock:deduct` | `stock:deduct` |
| `e4:stock:return` | `stock:return` |
| `e4:stock:low-alert` | `stock:low:alert` |

### Retururi (H37–H38)

| nodeKey | Coadă |
| --- | --- |
| `e4:return:initiate` | `return:initiate` |
| `e4:return:process` | `return:process` |

### Export graf (v2)

- **12** neuroni; exemple: `return:process:stock`, `return:request:create`, `sameday:*`.

### Reconciliere

- Graf: `return:request:create`, `return:process:stock` vs runtime `return:initiate`, `return:process` — **mapare semantică**, string diferit.

## Decizie de guvernanță familială

1. **Proprietar:** E4 Logistics.
2. **Capabilitate:** livrare și retur cu urmărire status.
3. **Telemetrie:** **HIGH** pe eșec AWB și COD.

## Limită evidență

- Legătura exactă între denumiri `return:*` din graf și cozile registry: confirmare în worker.
