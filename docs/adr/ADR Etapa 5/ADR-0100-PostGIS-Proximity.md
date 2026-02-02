# ADR-0100: PostGIS for Geospatial Proximity

**Status:** Accepted  
**Date:** 2026-01-19  
**Context:** Strategia "Neighborhood Referral" necesită identificarea vecinilor geografici.

**Decision:** Utilizăm **PostGIS KNN queries** cu:

- GEOGRAPHY type pentru calcule geodezice precise
- GiST indexes pentru performanță
- `<->` operator pentru nearest neighbor optimizat

**Consequences:**

- (+) Queries rapide pentru proximity (<100ms pentru 10K records)
- (+) Acuratețe geodezică în zone rurale extinse
- (-) Complexity în index maintenance
