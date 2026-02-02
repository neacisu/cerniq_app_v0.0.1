# ADR-0105: KOL Identification via Graph Centrality

**Status:** Accepted  
**Date:** 2026-01-19  
**Context:** Identificarea Key Opinion Leaders necesită metrici de influență.

**Decision:** **Multi-metric centrality scoring**:

| Metric | Weight | Purpose |
| ------ | ------ | ------- |
| Degree centrality | 0.3 | Connections count |
| Betweenness | 0.3 | Bridge between communities |
| Eigenvector | 0.2 | Connection to important nodes |
| PageRank | 0.2 | Influence propagation |

**Formula:** `KOL_Score = 0.3×degree + 0.3×betweenness + 0.2×eigenvector + 0.2×pagerank`

**Consequences:**

- (+) Identificare obiectivă a influencers
- (-) Requires graph building first
- (-) May miss offline influence
