# ADR-0039: Quality Scoring Algorithm

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Contactele necesită scoring pentru prioritizare și progresie pipeline.

**Decision:** Multi-dimensional scoring 0-100:

```typescript
interface QualityScore {
  completenessScore: number;  // Câmpuri populate
  accuracyScore: number;      // Validări trecute
  freshnessScore: number;     // Recența datelor
  enrichmentScore: number;    // Surse externe validate
  
  totalScore: number;         // Weighted average
}

const WEIGHTS = {
  completeness: 0.30,
  accuracy: 0.35,
  freshness: 0.15,
  enrichment: 0.20,
};

// Threshold pentru progresie
const BRONZE_TO_SILVER = 40;
const SILVER_TO_GOLD = 70;
```

**Consequences:**

- (+) Progresie automată bazată pe quality
- (+) Prioritizare outreach
- (+) KPI tracking
