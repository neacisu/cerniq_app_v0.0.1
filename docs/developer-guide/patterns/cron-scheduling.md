# Cron Scheduling Pattern — Scheduled Tasks

**Priority:** MEDIUM | **Version:** 1.0 | **February 2026**

## Overview

This pattern defines scheduled tasks: use BullMQ repeatable jobs instead of system cron, job scheduling, idempotency, failure handling, and monitoring.

---

## 1. BullMQ Repeatable Jobs (NOT System Cron)

**Do not use** system cron or node-cron for application tasks. Use BullMQ repeatable jobs for:

- Centralized scheduling
- Visibility in Bull Board
- Retry and failure handling
- Same Redis/worker infrastructure

```typescript
import { Queue } from "bullmq";

const queue = new Queue("cerniq:scheduled:daily", { connection: redis });

await queue.add(
  "daily-report",
  {},
  {
    repeat: { cron: "0 8 * * *" }, // 08:00 daily
    jobId: "daily-report", // Idempotency: one job per type
  },
);
```

---

## 2. Job Scheduling

| Task          | Cron         | Queue             | Description           |
| ------------- | ------------ | ----------------- | --------------------- |
| Daily report  | 0 8 \* \* \* | scheduled:daily   | Aggregate metrics     |
| ANAF sync     | 0 2 \* \* \* | scheduled:anaf    | Sync fiscal data      |
| Cleanup temp  | 0 3 \* \* \* | scheduled:cleanup | Delete old temp files |
| Backup verify | 0 6 \* \* 0  | scheduled:backup  | Weekly backup check   |

Register all repeatable jobs at worker/API startup.

---

## 3. Idempotency

Use fixed `jobId` for repeatable jobs to prevent duplicates:

```typescript
await queue.add("task-name", data, {
  repeat: { cron: "0 8 * * *" },
  jobId: `scheduled:task-name:${dateString}`, // e.g. daily
});
```

Or use `repeat.jobId` (BullMQ) to deduplicate by pattern.

---

## 4. Failure Handling

- **Retries:** 3 attempts with exponential backoff
- **DLQ:** Move to dead-letter queue after max retries
- **Alerting:** Notify on repeated failures (e.g. same job fails 3 days in a row)

```typescript
worker.on("failed", async (job, err) => {
  if (job.attemptsMade >= job.opts.attempts) {
    await alerting.send("Scheduled job failed", {
      job: job.name,
      error: err.message,
    });
  }
});
```

---

## 5. Monitoring

- **Bull Board:** View repeatable jobs, next run time
- **Prometheus:** `bullmq_repeatable_jobs_count`, `bullmq_job_duration_seconds`
- **Logs:** Structured log on each run: `{ event: 'scheduled.run', job: 'daily-report', startedAt }`

---

## 6. Timezone

Cron expressions are in **server timezone** (UTC recommended). For Romanian local time (EET/EEST), use `Europe/Bucharest` in cron or adjust: `0 6 * * *` UTC = 08:00 EET (winter).

---

## 7. Scheduler Bootstrap

Register repeatable jobs once at startup (API or dedicated scheduler process):

```typescript
// bootstrap-scheduler.ts
const queues = [
  { name: "scheduled:daily", cron: "0 8 * * *", jobId: "daily-report" },
  { name: "scheduled:anaf", cron: "0 2 * * *", jobId: "anaf-sync" },
  { name: "scheduled:cleanup", cron: "0 3 * * *", jobId: "cleanup-temp" },
];

for (const q of queues) {
  const queue = new Queue(`cerniq:${q.name}`, { connection: redis });
  await queue.add(q.jobId, {}, { repeat: { cron: q.cron }, jobId: q.jobId });
}
```

---

## 8. Removing Repeatable Jobs

When deprecating a scheduled task:

```typescript
await queue.removeRepeatableByKey(repeatableJobKey);
```

List repeatable jobs: `queue.getRepeatableJobs()`.

---

## 9. Overlap Prevention

If a job runs longer than the repeat interval, BullMQ can start overlapping runs. Use `jobId` with date to allow only one run per day, or implement a lock in the worker:

```typescript
const lockKey = `cerniq:lock:scheduled:${job.name}`;
const acquired = await redis.set(lockKey, "1", "EX", 3600, "NX");
if (!acquired) return; // Skip, previous run still active
```

---

## 10. Related Documents

- `worker-pool-sizing.md` — Worker concurrency for scheduled queues
- `redis-db-separation.md` — Queue naming and prefix
- `docs/runbooks/worker-failure.md` — Incident response

---

## Checklist

- [ ] BullMQ repeatable jobs, no system cron
- [ ] Idempotent job IDs
- [ ] Failure handling and alerting
- [ ] Monitoring and logging
- [ ] Timezone considered
- [ ] Bootstrap at startup
- [ ] Overlap prevention for long jobs
