# Worker Pool Sizing — BullMQ Configuration Guide

**Priority:** BLOCKER | **Version:** 1.0 | **February 2026**

## Overview

This guide defines BullMQ worker configuration for Cerniq: concurrency, Redis memory, backpressure, graceful shutdown, rate limiting, and monitoring. All queues use the `cerniq:` prefix.

---

## 1. Concurrency per Queue Type

### IO-Bound (External API Calls)

Higher concurrency; workers spend most time waiting on network.

| Queue Type         | Concurrency | Example                 |
| ------------------ | ----------- | ----------------------- |
| ANAF/Termene       | 2–3         | `enrich:anaf:tva`       |
| Hunter/Resend      | 5–10        | `discover:email:hunter` |
| Webhook ingestion  | 10          | `ingest:webhook`        |
| Normalize/Validate | 20          | `normalize:cui`         |

### CPU-Bound (Heavy Computation)

Lower concurrency; avoid starving CPU.

| Queue Type     | Concurrency | Example       |
| -------------- | ----------- | ------------- |
| AI scoring     | 2–3         | `ai:score`    |
| Dedup fuzzy    | 3–5         | `dedup:fuzzy` |
| PDF generation | 2           | `doc:pdf`     |

### Hybrid

| Queue Type             | Concurrency | Notes                  |
| ---------------------- | ----------- | ---------------------- |
| Pipeline orchestration | 3           | Coordinates other jobs |
| CSV/Excel parse        | 5           | Mix of IO and CPU      |

---

## 2. Redis Memory Estimation

- **Per job:** ~1–5 KB (payload + metadata)
- **1000 jobs:** ~5 MB
- **Active workers:** Each worker holds 1+ job in memory

Formula: `(avg_job_size * backlog) + (workers * concurrency * avg_job_size)`

Example: 10 workers × 5 concurrency × 3 KB ≈ 150 KB per queue type. With 50 queue types: ~7.5 MB for active jobs. Add 2–3× for backlog spikes.

**Recommendation:** Reserve at least 256 MB Redis for Cerniq keys (shared Redis instance).

---

## 3. Backpressure Handling

When Redis or downstream is overloaded:

```typescript
const worker = new Worker("cerniq:queue:enrich", processor, {
  concurrency: 5,
  limiter: { max: 10, duration: 60000 }, // 10 jobs/min
});

// Pause when Redis memory high (monitor via Prometheus)
if (redisMemoryUsage > threshold) {
  await worker.pause();
}
```

Use `limiter` option for rate-limited queues (ANAF, Hunter).

---

## 4. Graceful Shutdown

Workers must drain in-flight jobs before exit:

```typescript
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, draining worker");
  await worker.close();
  process.exit(0);
});
```

BullMQ `worker.close()` waits for current jobs to finish (respect `stallInterval`). Set Docker `stop_grace_period` to 60s+ for workers.

---

## 5. Rate Limiting per Queue

```typescript
const worker = new Worker("cerniq:enrich:anaf:tva", processor, {
  concurrency: 3,
  limiter: {
    max: 60, // 60 jobs
    duration: 60000, // per minute (1 req/sec effective with batching)
  },
});
```

Align with external API limits (ANAF: 1 req/sec, Hunter: 50/min).

---

## 6. Prometheus Metrics

Expose BullMQ metrics for monitoring:

- `bullmq_queue_waiting_count`
- `bullmq_queue_active_count`
- `bullmq_queue_completed_total`
- `bullmq_queue_failed_total`
- `bullmq_job_duration_seconds`

Use `@bull-board/api` or custom Prometheus exporter. Dashboards: queue depth, throughput, failure rate.

---

## 7. Prefix Convention

All Cerniq keys use `cerniq:` prefix:

- Queues: `cerniq:enrich:anaf:tva`, `cerniq:ingest:webhook`
- Keys: `cerniq:bull:queue-name:...`

This isolates Cerniq from other projects on shared Redis.

---

## 8. Worker Startup Order

Start workers after Redis and DB are ready. Use health check before processing. Consider dependency order: enrichment workers may depend on normalize workers completing.

---

## 9. Related Documents

- `redis-db-separation.md` — Prefix and queue naming
- `docs/specifications/worker-queue-inventory.md` — Full queue list
- `docs/runbooks/worker-failure.md` — Incident response

---

## Checklist

- [ ] Concurrency set per queue type (IO vs CPU)
- [ ] Redis memory estimated and monitored
- [ ] Backpressure/limiter for rate-limited queues
- [ ] Graceful shutdown implemented
- [ ] Prometheus metrics exposed
- [ ] `cerniq:` prefix used
