# ADR-FAMILY-e5-alerts

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e5-alerts |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E5 |
| Familie | `alerts` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e5-alerts` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Alerte nurturing legate de vreme, sezonalitate APIA și declanșare campanii (E5 FAZA J52–J55 în comentarii registry).

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e5:alert:weather-monitor` | `alerts:weather:monitor` |
| `e5:alert:weather-match` | `alerts:weather:match` |
| `e5:alert:apia-seasonal` | `alerts:apia:seasonal` |
| `e5:alert:campaign-trigger` | `alerts:campaign:trigger` |

- Registry: `E5_ALERT_*` — prefix **`alerts:`** (plural).

### Export graf (v2)

- **8** neuroni; exemple: `alert:client:referral-reward`, `alert:internal:churn-daily`, `alert:internal:competitor-price`, etc.

### Reconciliere

| Observație |
| --- |
| Graf: prefix `alert:client:` / `alert:internal:` — registry E5 folosește **`alerts:`** pentru vreme/APIA — **familii diferite de alertă** în același stadiu de documentare; nu presupunem identitate fără mapare în cod. |

## Decizie de guvernanță familială

1. **Proprietar:** E5 Lifecycle Marketing.
2. **Capabilitate:** trigger-uri contextuale (agri).
3. **Telemetrie:** **MEDIUM**/**HIGH** după impact business.

## Limită evidență

- Cum se îmbină nodurile `alert:internal:*` din graf cu cozile `alerts:*` din registry: **neclar** fără export sau cod.
