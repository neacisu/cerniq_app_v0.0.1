# ADR-FAMILY-e3-stock

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e3-stock |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E3 |
| Familie | `stock` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e3-stock` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Stoc și rezervări în timpul negocierii E3: verificare, creare/eliberare rezervare, sync ERP, alerte, reaprovizionare.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e3:stock:realtime-check` | `stock:realtime:check` |
| `e3:stock:reserve-create` | `stock:reserve:create` |
| `e3:stock:reserve-release` | `stock:reserve:release` |
| `e3:stock:sync-erp` | `stock:sync:erp` |
| `e3:stock:low-alert` | `stock:low:alert` |
| `e3:stock:replenish-request` | `stock:replenish:request` |

- Registry: `E3_STOCK_*` — șase cozi.

### Export graf (v2)

- **3** neuroni; exemple: `stock:reserve:create`, `stock:reserve:release`, `stock:sync:erp`.

### Reconciliere

- Graf: submulțime (3/6); celelalte cozi rămân în runtime.

## Decizie de guvernanță familială

1. **Proprietar:** E3 Supply.
2. **Capabilitate:** consistență stoc vs ofertă.
3. **Telemetrie:** **HIGH** pe rezervări și expirare (legat E4 `pipeline:reservation:expire`).

## Limită evidență

- Interacțiune E3 rezervare ↔ E4 deduct: flux end-to-end din cod.
