# ADR-FAMILY-e4-alerts

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e4-alerts |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E4 |
| Familie | `alerts` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e4-alerts` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

AlertNeuron post-vânzare: notificări pe evenimente plată, livrare, credit, contract, stoc, dispatch.

## Dovezi confirmate în Cerniq

### Registry + catalog

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e4:alert:payment` | `alert:payment` |
| `e4:alert:delivery` | `alert:delivery` |
| `e4:alert:credit` | `alert:credit` |
| `e4:alert:contract` | `alert:contract` |
| `e4:alert:stock` | `alert:stock` |
| `e4:alert:dispatch` | `alert:dispatch` |

### Export graf (v2)

- **19** neuroni; exemple pattern `alert:client:*` (ex. `alert:client:delivered`, `alert:client:delivery-failed`).

### Reconciliere

| Observație |
| --- |
| Prefix graf **`alert:client:`** vs runtime **`alert:`** fără `client` — **denumiri diferite** pentru același rol operațional presupus; mapare exactă necesită cod sau export actualizat. |
| Număr 19 (graf) vs 6 (registry listate) — graf mai granular sau include variante. |

## Decizie de guvernanță familială

1. **Proprietar:** E4 Post-Sale Ops.
2. **Capabilitate:** vizibilitate incidente critice.
3. **Telemetrie:** corelare cu Loki/Alertmanager (infra v2 §0.1).

## Limită evidență

- Lista completă 19 noduri din export: din fișier graf, nu reprodus aici.
