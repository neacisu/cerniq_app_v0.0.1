# ADR-0071: Hybrid Search cu pgvector + BM25 + RRF

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** Căutarea produselor necesită semantic search, exact match și cod exact. Un singur tip de search nu e suficient.

**Decision:** **Hybrid Search** combinând:

1. **Vector Search (pgvector):** Pentru similaritate semantică
2. **BM25 (pg_textsearch):** Pentru match exact keywords
3. **RRF (Reciprocal Rank Fusion):** Pentru combinare rezultate

**Implementation:** SQL function `hybrid_search()` cu:

- `vector_weight` ajustabil (default 0.5)
- RRF formula: `1.0 / (60 + rank)`
- FULL OUTER JOIN pentru combinare rezultate

**Consequences:**

- (+) Accuracy: Combină avantajele ambelor metode
- (+) Performance: <50ms cu indexare corectă
- (+) Flexibility: Weight ajustabil per use case
