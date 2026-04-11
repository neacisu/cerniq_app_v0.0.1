# ADR-FAMILY-e3-human

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e3-human |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E3 |
| Familie | `human` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e3-human` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

HITL pentru AI Sales: escaladare, takeover, aprobare decizie. v2 ADR-0008: convergență semantică cu motor polimorf de aprobări.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e3:human:escalate` | `human:escalate` |
| `e3:human:takeover` | `human:takeover` |
| `e3:human:approve` | `human:approve` |

- Registry: `E3_HUMAN_ESCALATE`, `E3_HUMAN_TAKEOVER`, `E3_HUMAN_APPROVE`.

### Export graf (v2)

- **2** neuroni; exemple: `human:notification:send`, `human:queue:prioritize`.

### Reconciliere

| Observație |
| --- |
| **Divergență majoră:** graf v2 listează cozi care **nu** există în `queue-registry.ts` pentru E3 la audit; catalog + registry folosesc `human:escalate`, `human:takeover`, `human:approve`. Graful exportat este **în urmă** sau grupat altfel față de runtime. |

## Decizie de guvernanță familială

1. **Proprietar:** E3 + HITL Platform.
2. **Capabilitate:** pauză sigură și reluare cu decizie umană.
3. **Telemetrie:** **CRITICAL**.

## Limită evidență

- Originea etichetelor `human:notification:send` din graf: export vechi sau planificare — **nu** runtime curent confirmat.
