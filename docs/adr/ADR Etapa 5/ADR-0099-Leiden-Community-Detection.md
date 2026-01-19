# ADR-0099: NetworkX/Leiden for Community Detection

**Status:** Accepted  
**Date:** 2026-01-19  
**Context:** Identificarea clusterelor implicite necesită graph algorithms.

**Decision:** **Python service cu NetworkX + Leiden algorithm**:

- Leiden preferat Louvain (garantează comunități conectate)
- cdlib pentru implementare
- Scheduled batch processing (nu real-time)

**Consequences:**

- (+) Detectează clustere non-evidente
- (-) CPU intensive - rulează ca batch job
- (-) Necesită Python 3.14 free-threading
