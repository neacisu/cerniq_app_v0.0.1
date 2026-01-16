# ADR-0040: Pipeline Orchestration

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** 61 de workeri trebuie orchestrați cu dependențe și paralelism.

**Decision:** Event-driven orchestration cu BullMQ:

```typescript
// Pipeline stages
const PIPELINE_STAGES = [
  'INGEST',      // A: Bronze ingestion
  'NORMALIZE',   // B: Normalization
  'VALIDATE',    // C: CUI validation
  'ENRICH',      // D-L: External enrichment (parallel)
  'DEDUPE',      // M: Deduplication
  'SCORE',       // N: Quality scoring
  'AGGREGATE',   // O: Aggregation
  'PROMOTE',     // P: Layer promotion
];

// Event-driven triggers
worker.on('completed', async (job, result) => {
  const nextQueues = TRIGGER_MAP[job.queue.name];
  for (const queue of nextQueues) {
    await queue.add(job.data.entityId, {
      ...job.data,
      previousStage: job.queue.name,
    });
  }
});
```

**Consequences:**

- (+) Loose coupling între workeri
- (+) Paralelism maxim pentru enrichment
- (+) Replay și recovery easy
