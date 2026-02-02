# ADR-0050: Enrichment Priority Queue

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Unele contacte sunt mai importante și trebuie enriched prioritar.

**Decision:** Priority scoring pentru queue ordering:

```typescript
// Priority factors
const PRIORITY_WEIGHTS = {
  sourceQuality: 0.3,    // Import vs scrape
  dataCompleteness: 0.2, // Câmpuri populate
  businessSize: 0.3,     // Cifră afaceri estimată
  recentActivity: 0.2,   // Last interaction
};

// BullMQ priority (lower = higher priority)
const jobPriority = Math.floor((1 - normalizedScore) * 100);

await queue.add('enrich', data, { priority: jobPriority });
```

**Consequences:**

- (+) High-value contacts processed first
- (+) Better resource utilization
- (-) Low-priority poate stagna
