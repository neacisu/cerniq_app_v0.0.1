# ADR-0039: Geocoding Strategy

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Adresele trebuie geocodate pentru proximity queries și zone agricole.

**Decision:**

1. **Primary:** Nominatim self-hosted (50 req/sec)
2. **Fallback:** Google Maps API (pentru adrese ambigue)
3. **PostGIS** pentru storage și queries spațiale

```sql
-- Spatial index pentru proximity queries
CREATE INDEX idx_gold_companies_geo 
ON gold_companies USING GIST (location_geography);

-- Query proximitate
SELECT * FROM gold_companies 
WHERE ST_DWithin(
  location_geography, 
  ST_GeographyFromText('POINT(26.1025 44.4268)'),
  50000  -- 50km radius
);
```

**Consequences:**

- (+) Queries spațiale performante
- (+) Zone agricole și clustering
- (-) Geocoding accuracy variabilă
