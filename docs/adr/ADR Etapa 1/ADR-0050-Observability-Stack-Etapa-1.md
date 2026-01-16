# ADR-0050: Observability Stack Etapa 1

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Monitoring și debugging pentru 61 workeri.

**Decision:** SigNoz + custom metrics:

```typescript
// Custom metrics pentru Etapa 1
const metrics = {
  // Counters
  'etapa1.contacts.ingested': Counter,
  'etapa1.contacts.enriched': Counter,
  'etapa1.contacts.promoted': Counter,
  
  // Gauges
  'etapa1.queue.depth': Gauge,
  'etapa1.quality.average': Gauge,
  
  // Histograms
  'etapa1.enrichment.duration': Histogram,
  'etapa1.api.latency': Histogram,
};

// Alerting rules
const alerts = [
  { name: 'HighQueueDepth', condition: 'queue_depth > 10000', severity: 'warning' },
  { name: 'LowEnrichmentRate', condition: 'enriched_per_hour < 100', severity: 'critical' },
  { name: 'APIErrors', condition: 'error_rate > 5%', severity: 'critical' },
];
```

**Consequences:**

- (+) Visibility completă pipeline
- (+) Alerting proactiv
- (+) Debugging facilitat

---

**Document generat:** 15 Ianuarie 2026
**Total ADR-uri Etapa 1:** 20 (ADR-0031 → ADR-0050)
