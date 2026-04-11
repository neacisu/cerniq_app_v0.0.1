# ADR-FAMILY-e3-product-search

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e3-product-search |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E3 |
| Familie | `product-search` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e3-product-search` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Cunoaștere produs + căutare hibridă (ingest, embed, chunk, index, categorii, variante, BM25, vector, RRF, filtre, cache).

## Dovezi confirmate în Cerniq

### Product (A1–A6)

| nodeKey | Coadă |
| --- | --- |
| `e3:product:ingest` | `product:ingest` |
| `e3:product:embed` | `product:embed` |
| `e3:product:chunk` | `product:chunk` |
| `e3:product:index-rebuild` | `product:index:rebuild` |
| `e3:product:category-sync` | `product:category:sync` |
| `e3:product:variant-process` | `product:variant:process` |

### Search (B7–B12)

| nodeKey | Coadă |
| --- | --- |
| `e3:search:query-rewrite` | `search:query:rewrite` |
| `e3:search:vector-execute` | `search:vector:execute` |
| `e3:search:bm25-execute` | `search:bm25:execute` |
| `e3:search:rrf-fuse` | `search:rrf:fuse` |
| `e3:search:filter-apply` | `search:filter:apply` |
| `e3:search:cache-manage` | `search:cache:manage` |

- Registry: toate `E3_PRODUCT_*`, `E3_SEARCH_*` — match.

### Export graf (v2)

- **10** neuroni; exemple incluzând `product:chunk:create`, `product:embedding:generate`, `product:stock:realtime-check`, `product:sync:shopify`.

### Reconciliere

| Observație |
| --- |
| Graf: `product:chunk:create`, `product:embedding:generate`, `product:sync:shopify`, `product:stock:realtime-check` — denumiri **diferite** de catalog (`product:chunk`, `product:embed`, fără `sync:shopify` explicit în registry la audit). |
| Stoc realtime în graf sub prefix `product:` — în registry E3 stoc este `stock:realtime:check` (familie `stock`). **Atribuire familie** în graf poate încrucișa subiectele. |

## Decizie de guvernanță familială

1. **Proprietar:** E3 Catalog + Search.
2. **Capabilitate:** RAG și ofertare corectă SKU.
3. **Telemetrie:** latență search, calitate retrieval.

## Limită evidență

- `product:sync:shopify`: **neconfirmat** în `QUEUES`; posibil integrare planificată.
