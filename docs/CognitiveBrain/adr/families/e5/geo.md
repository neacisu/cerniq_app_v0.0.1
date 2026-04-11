# ADR-FAMILY-e5-geo

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e5-geo |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E5 |
| Familie | `geo` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e5-geo` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Analiză geografică PostGIS: proximitate, vecini, teritorii, acoperire, catchment.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e5:geo:proximity-calculate` | `geo:proximity:calculate` |
| `e5:geo:neighbor-identify` | `geo:neighbor:identify` |
| `e5:geo:territory-calculate` | `geo:territory:calculate` |
| `e5:geo:coverage-analyze` | `geo:coverage:analyze` |
| `e5:geo:catchment-build` | `geo:catchment:build` |

### Export graf (v2)

- **5** neuroni; exemple: `geo:cluster:analyze`, `geo:delivery:optimize`, `geo:neighbor:find`, `geo:territory:map`, `geo:weather:correlate`.

### Reconciliere

- Denumiri graf (`neighbor:find`, `territory:map`) vs runtime (`neighbor:identify`, `territory:calculate`) — **similare, non-identice**.
- `geo:weather:correlate` în graf — **nu** în lista de cozi geo din registry; posibil apartenență la altă familie sau nod planificat.

## Aliniere cercetare

- Algoritmi Leiden/PageRank în [cerniq_nuronal_research_base.md](../../cerniq_nuronal_research_base.md) privesc **graph-community**; geo rămâne PostGIS conform comentariilor registry.

## Limită evidență

- Query-uri SQL exacte: din worker Python/TS.
