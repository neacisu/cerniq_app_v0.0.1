# ADR-FAMILY-e3-ops

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e3-ops |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E3 |
| Familie | `ops` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e3-ops` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Operațiuni de platformă pentru AI Sales: health, metrici, curățare, rapoarte — conform **etichetelor din exportul de graf** v2.

## Dovezi confirmate în Cerniq

### Registry / catalog

- Căutare în [queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) pentru exemple v2 (`pipeline:ai-sales:*`, `backup:conversations:export`, `metrics:llm-usage:aggregate`, `report:conversion:analyze`) la momentul auditului: **fără** potriviri.

### Export graf (v2)

- **7** neuroni; exemple: `backup:conversations:export`, `metrics:llm-usage:aggregate`, `pipeline:ai-sales:cleanup`, `pipeline:ai-sales:health`, `pipeline:ai-sales:metrics`, `report:conversion:analyze`.

## Reconciliere

| Concluzie |
| --- |
| Familia `ops` este **vizibilă în graf** dar **nu** are cozi canonice enumerate în `QUEUES` la acest audit — **gap major** între planificare/topologie și registry runtime. |

## Decizie de guvernanță familială

1. **Proprietar:** Platform E3 (până la înregistrare cozi).
2. **Capabilitate:** observabilitate și mentenanță coadă AI Sales — **de implementat sau de aliniat graf**.
3. **Telemetrie:** când cozile există, aliniere la Grafana/Prometheus (v2 §0.1).

## Limită evidență

- Orice afirmație despre handler-e `pipeline:ai-sales:*` este **neconfirmată** în registry; necesită fie adăugare în `queue-registry.ts`, fie actualizare graf.
