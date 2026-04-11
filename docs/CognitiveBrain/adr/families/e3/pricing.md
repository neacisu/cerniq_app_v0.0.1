# ADR-FAMILY-e3-pricing

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e3-pricing |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E3 |
| Familie | `pricing` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e3-pricing` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Motor prețuri/discount: calcul, aplicare, aprobare, marjă, volum, verificare concurență.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e3:pricing:discount-calculate` | `pricing:discount:calculate` |
| `e3:pricing:discount-apply` | `pricing:discount:apply` |
| `e3:pricing:discount-approve` | `pricing:discount:approve` |
| `e3:pricing:margin-check` | `pricing:margin:check` |
| `e3:pricing:volume-calculate` | `pricing:volume:calculate` |
| `e3:pricing:competitor-check` | `pricing:competitor:check` |

- Registry: `E3_PRICING_*` — șase cozi.

### Export graf (v2)

- **3** neuroni; exemple: `pricing:competitor:check`, `pricing:discount:calculate`, `pricing:margin:check`.

### Reconciliere

- Runtime are **șase** cozi; graf enumeră **trei** — submulțime în export.

## Decizie de guvernanță familială

1. **Proprietar:** E3 Commercial.
2. **Capabilitate:** prețuri în limite marginale; escaladare discount (legat `e3:guardrail:discount-check` + HITL).
3. **Telemetrie:** **HIGH**/**CRITICAL** pe aprobări.

## Limită evidență

- Reguli prag discount din cod vs v2 ADR-0007 (exemple deterministe): comparare manuală.
