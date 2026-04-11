# ADR-FAMILY-e5-graph-community

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e5-graph-community |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E5 |
| Familie | `graph-community` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e5-graph-community` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Graf relații clienți: construire muchii, comunități (Leiden), centralitate, KOL, clustere implicite.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e5:graph:build-relationships` | `graph:build:relationships` |
| `e5:community:detect-leiden` | `community:detect:leiden` |
| `e5:centrality:calculate` | `centrality:calculate` |
| `e5:kol:identify` | `kol:identify` |
| `e5:cluster:implicit-detect` | `cluster:implicit:detect` |

### Export graf (v2)

- **16** neuroni; exemple: `association:enrich:termene`, `association:members:link`, `association:pdf:ingest`, `graph:build:full`.

### Reconciliere

| Observație |
| --- |
| Graf amestecă prefix `association:*` cu `graph:*`; registry separă **association:** (scraping) de **graph:** / **community:**. Familia `graph-community` în v2 este **largă**; unele noduri pot aparține logic [`association-ingest`](./association-ingest.md). |
| `graph:build:full` (graf) vs `graph:build:relationships` (registry) — **nu** identice. |

## Aliniere cercetare

- Neo4j GDS / Leiden: recomandare în research base și v2 §0.3 — **nu** confirmă că toți algoritmii rulează în Neo4j vs subprocess (comentariu registry D21).

## Limită evidență

- Unde rulează Leiden (Neo4j vs Python): din implementare worker.
