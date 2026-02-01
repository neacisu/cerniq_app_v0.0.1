# CERNIQ.APP — Worker Failure Runbook

> **Clasificare:** OPERAȚIONAL  
> **Versiune:** 1.0  
> **Data:** 1 Februarie 2026  
> **Referințe:** [Worker Queue Inventory](../specifications/worker-queue-inventory.md), [ADR-0006](../adr/ADR%20Etapa%200/ADR-0006-Redis-8-4-0-cu-BullMQ-v5.md)

---

## 📋 CUPRINS

1. [Overview](#1-overview)
2. [Diagnosticare Rapidă](#2-diagnosticare-rapidă)
3. [Scenarii Comune](#3-scenarii-comune)
4. [Proceduri de Recovery](#4-proceduri-de-recovery)
5. [Queue Management](#5-queue-management)
6. [Monitoring și Alerting](#6-monitoring-și-alerting)

---

## 1. Overview

### 1.1 Arhitectura Workers

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         BULLMQ WORKER ARCHITECTURE                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │                         Redis 8.4.0                             │    │
│   │                     (Queue Storage)                             │    │
│   │   maxmemory: 8GB | policy: noeviction | AOF: everysec           │    │
│   └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│         ┌────────────────────┼────────────────────┐                      │
│         ▼                    ▼                    ▼                      │
│   ┌───────────┐        ┌───────────┐        ┌───────────┐               │
│   │ worker-   │        │ worker-   │        │ worker-   │               │
│   │ enrichment│        │ outreach  │        │ ai        │               │
│   │ (58 jobs) │        │ (52 jobs) │        │ (78 jobs) │               │
│   └───────────┘        └───────────┘        └───────────┘               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

Total Workers: 313 (vezi worker-queue-inventory.md)
```

### 1.2 Categorii de Workers

| Container | Workers | Queues Principale | Criticitate |
|-----------|---------|-------------------|-------------|
| worker-enrichment | 58 | `enrich:*`, `validate:*`, `normalize:*` | Medium |
| worker-outreach | 52 | `outreach:*`, `sequence:*`, `quota:*` | High |
| worker-ai | 78 | `agent:*`, `rag:*`, `guardrail:*` | High |
| worker-postsale | 67 | `payment:*`, `invoice:*`, `logistics:*` | Critical |
| worker-nurturing | 58 | `campaign:*`, `segment:*`, `churn:*` | Medium |

---

## 2. Diagnosticare Rapidă

### 2.1 Quick Health Check

```bash
#!/bin/bash
# Script: worker-health-check.sh

echo "🔍 Worker Health Check"
echo "======================"

# 1. Container status
echo -e "\n📦 Container Status:"
docker compose ps | grep worker

# 2. Redis connectivity
echo -e "\n🔴 Redis Status:"
docker compose exec redis redis-cli ping

# 3. Queue overview
echo -e "\n📊 Queue Statistics:"
docker compose exec api node -e "
const { Queue } = require('bullmq');
const Redis = require('ioredis');

async function checkQueues() {
  const redis = new Redis({ host: 'redis', port: 6379 });
  const keys = await redis.keys('bull:*:id');
  const queues = [...new Set(keys.map(k => k.split(':')[1]))];
  
  console.log('Active queues:', queues.length);
  
  for (const name of queues.slice(0, 10)) {
    const q = new Queue(name, { connection: { host: 'redis' } });
    const counts = await q.getJobCounts();
    console.log(\`  \${name}: waiting=\${counts.waiting}, active=\${counts.active}, failed=\${counts.failed}\`);
    await q.close();
  }
  
  redis.disconnect();
}
checkQueues();
"

# 4. Failed jobs summary
echo -e "\n❌ Failed Jobs (last hour):"
docker compose exec redis redis-cli --scan --pattern 'bull:*:failed' | head -20
```

### 2.2 Identificare Problemă

```
┌─────────────────────────────────────────────────────────────────┐
│                    DECISION TREE                                │
└─────────────────────────────────────────────────────────────────┘

        [Worker Issues Detected]
               │
        ┌──────┴──────┐
        ▼             ▼
   [Container    [Jobs Not
    Down]        Processing]
        │             │
        ▼             ▼
   Scenario A    ┌────┴────┐
   (Restart)     ▼         ▼
            [Queue      [Jobs
             Paused]    Failing]
                │         │
                ▼         ▼
            Scenario B  Scenario C
            (Resume)    (Debug)
```

---

## 3. Scenarii Comune

### 3.1 Scenario A: Worker Container Down

**Simptome:**
- Container în status "Exited" sau "Restarting"
- Jobs se acumulează în queue (waiting ↑)
- Niciun job activ pentru queue-urile afectate

**Diagnostic:**

```bash
# Verificare status container
docker compose ps worker-enrichment worker-outreach worker-ai

# Verificare logs pentru eroare
docker compose logs worker-enrichment --tail=100

# Verificare resurse
docker stats --no-stream | grep worker
```

**Soluție:**

```bash
# Restart simplu
docker compose restart worker-enrichment

# Dacă persistent, rebuild
docker compose up -d --force-recreate worker-enrichment

# Verificare după restart
docker compose logs worker-enrichment --tail=20 -f
```

---

### 3.2 Scenario B: Queue Paused

**Simptome:**
- Container running dar jobs nu se procesează
- `waiting` jobs cresc, `active` = 0
- Nu sunt erori în logs

**Diagnostic:**

```bash
# Verificare stare queue
docker compose exec api node -e "
const { Queue } = require('bullmq');
(async () => {
  const q = new Queue('outreach:whatsapp:send', { connection: { host: 'redis' } });
  const isPaused = await q.isPaused();
  console.log('Queue paused:', isPaused);
  await q.close();
})();
"
```

**Soluție:**

```bash
# Resume queue
docker compose exec api node -e "
const { Queue } = require('bullmq');
(async () => {
  const q = new Queue('outreach:whatsapp:send', { connection: { host: 'redis' } });
  await q.resume();
  console.log('Queue resumed');
  await q.close();
})();
"

# Sau pentru toate queue-urile
docker compose exec api node -e "
const { Queue } = require('bullmq');
const Redis = require('ioredis');

(async () => {
  const redis = new Redis({ host: 'redis' });
  const keys = await redis.keys('bull:*:meta');
  const queues = keys.map(k => k.split(':')[1]);
  
  for (const name of queues) {
    const q = new Queue(name, { connection: { host: 'redis' } });
    if (await q.isPaused()) {
      await q.resume();
      console.log('Resumed:', name);
    }
    await q.close();
  }
  redis.disconnect();
})();
"
```

---

### 3.3 Scenario C: Jobs Failing

**Simptome:**
- Jobs în status "failed" cresc
- Erori repetitive în logs
- Poate afecta un anumit tip de job

**Diagnostic:**

```bash
# Verificare failed jobs cu detalii
docker compose exec api node -e "
const { Queue } = require('bullmq');
(async () => {
  const q = new Queue('outreach:whatsapp:send', { connection: { host: 'redis' } });
  const failed = await q.getFailed(0, 10);
  
  for (const job of failed) {
    console.log('---');
    console.log('Job ID:', job.id);
    console.log('Failed Reason:', job.failedReason);
    console.log('Attempts:', job.attemptsMade);
    console.log('Data:', JSON.stringify(job.data).slice(0, 200));
  }
  await q.close();
})();
"
```

**Cauze Comune și Soluții:**

| Eroare | Cauza | Soluție |
|--------|-------|---------|
| `ETIMEDOUT` | External API slow | Increase timeout, add retry |
| `ECONNREFUSED` | Service down | Check dependency health |
| `Rate limit exceeded` | API quota hit | Pause queue, wait |
| `Invalid data` | Bad job payload | Fix source, remove bad jobs |
| `OOM killed` | Memory exhausted | Increase limits, fix leak |

---

### 3.4 Scenario D: Rate Limit Hit (External APIs)

**Simptome:**
- Jobs fail cu "429 Too Many Requests"
- Specific pentru queue-uri cu external API calls

**Queues Afectate:**
- `enrich:anaf:*` - 1 req/sec
- `enrich:termene:*` - 20/min
- `outreach:whatsapp:send` - 200/day/phone
- `outreach:email:send` - 500/hour

**Soluție:**

```bash
# 1. Pause affected queue
docker compose exec api node -e "
const { Queue } = require('bullmq');
(async () => {
  const q = new Queue('enrich:anaf:tva', { connection: { host: 'redis' } });
  await q.pause();
  console.log('Queue paused - waiting for rate limit reset');
  await q.close();
})();
"

# 2. Wait pentru reset (verifică documentația API pentru window)
sleep 60  # Exemplu: 1 minut pentru ANAF

# 3. Resume cu concurrency redusă temporar
docker compose exec api node -e "
const { Queue, Worker } = require('bullmq');
(async () => {
  const q = new Queue('enrich:anaf:tva', { connection: { host: 'redis' } });
  await q.resume();
  console.log('Queue resumed');
  await q.close();
})();
"
```

---

## 4. Proceduri de Recovery

### 4.1 Restart All Workers

```bash
#!/bin/bash
# Script: restart-all-workers.sh

echo "🔄 Restarting all workers..."

# Graceful stop (permite finalizarea jobs active)
docker compose stop worker-enrichment worker-outreach worker-ai worker-postsale worker-nurturing

# Wait for graceful shutdown
sleep 10

# Start
docker compose up -d worker-enrichment worker-outreach worker-ai worker-postsale worker-nurturing

# Verify
sleep 5
docker compose ps | grep worker

echo "✅ All workers restarted"
```

### 4.2 Retry Failed Jobs

```bash
#!/bin/bash
# Script: retry-failed-jobs.sh
# Usage: ./retry-failed-jobs.sh [queue-name]

QUEUE_NAME="${1:-all}"

docker compose exec api node -e "
const { Queue } = require('bullmq');
const Redis = require('ioredis');

(async () => {
  const redis = new Redis({ host: 'redis' });
  
  let queues;
  if ('$QUEUE_NAME' === 'all') {
    const keys = await redis.keys('bull:*:meta');
    queues = keys.map(k => k.split(':')[1]);
  } else {
    queues = ['$QUEUE_NAME'];
  }
  
  for (const name of queues) {
    const q = new Queue(name, { connection: { host: 'redis' } });
    const failed = await q.getFailed();
    
    if (failed.length > 0) {
      console.log(\`Retrying \${failed.length} jobs in \${name}\`);
      for (const job of failed) {
        await job.retry();
      }
    }
    await q.close();
  }
  
  redis.disconnect();
  console.log('✅ Retry complete');
})();
"
```

### 4.3 Clear Stuck Jobs

```bash
#!/bin/bash
# Script: clear-stuck-jobs.sh
# WARNING: This removes jobs! Use with caution.

QUEUE_NAME="${1}"
if [ -z "$QUEUE_NAME" ]; then
  echo "Usage: $0 <queue-name>"
  exit 1
fi

echo "⚠️ This will remove stuck jobs from $QUEUE_NAME"
read -p "Continue? (y/N) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  docker compose exec api node -e "
  const { Queue } = require('bullmq');
  (async () => {
    const q = new Queue('$QUEUE_NAME', { connection: { host: 'redis' } });
    
    // Clean old completed jobs (older than 1 hour)
    await q.clean(3600000, 1000, 'completed');
    
    // Clean old failed jobs (older than 24 hours)
    await q.clean(86400000, 1000, 'failed');
    
    // Remove stuck active jobs (stalled > 30 min)
    const active = await q.getActive();
    for (const job of active) {
      const age = Date.now() - job.timestamp;
      if (age > 1800000) { // 30 minutes
        console.log('Removing stuck job:', job.id);
        await job.remove();
      }
    }
    
    await q.close();
    console.log('✅ Cleanup complete');
  })();
  "
fi
```

### 4.4 Drain Queue (Emergency)

```bash
#!/bin/bash
# Script: drain-queue.sh
# EMERGENCY: Removes ALL jobs from a queue

QUEUE_NAME="${1}"
if [ -z "$QUEUE_NAME" ]; then
  echo "Usage: $0 <queue-name>"
  exit 1
fi

echo "🚨 EMERGENCY: This will remove ALL jobs from $QUEUE_NAME"
echo "This action is IRREVERSIBLE!"
read -p "Type 'DRAIN' to confirm: " -r

if [[ $REPLY == "DRAIN" ]]; then
  docker compose exec api node -e "
  const { Queue } = require('bullmq');
  (async () => {
    const q = new Queue('$QUEUE_NAME', { connection: { host: 'redis' } });
    
    await q.pause();
    await q.drain();
    
    console.log('Queue drained');
    await q.close();
  })();
  "
  echo "✅ Queue $QUEUE_NAME drained"
else
  echo "Cancelled"
fi
```

---

## 5. Queue Management

### 5.1 Pause/Resume Individual Queues

```bash
# Pause
docker compose exec api npx bullmq pause outreach:whatsapp:send

# Resume  
docker compose exec api npx bullmq resume outreach:whatsapp:send

# Check status
docker compose exec api npx bullmq stats outreach:whatsapp:send
```

### 5.2 Priority Management

```bash
# View job priorities
docker compose exec api node -e "
const { Queue } = require('bullmq');
(async () => {
  const q = new Queue('outreach:whatsapp:send', { connection: { host: 'redis' } });
  const waiting = await q.getWaiting(0, 20);
  
  waiting.forEach(job => {
    console.log(\`ID: \${job.id}, Priority: \${job.opts.priority || 'normal'}\`);
  });
  
  await q.close();
})();
"
```

### 5.3 Move Jobs Between Queues

```bash
# Move failed to waiting (retry)
docker compose exec api node -e "
const { Queue } = require('bullmq');
(async () => {
  const q = new Queue('outreach:whatsapp:send', { connection: { host: 'redis' } });
  const failed = await q.getFailed(0, 100);
  
  console.log(\`Moving \${failed.length} failed jobs to waiting\`);
  
  for (const job of failed) {
    await job.retry();
  }
  
  await q.close();
})();
"
```

---

## 6. Monitoring și Alerting

### 6.1 Key Metrics to Watch

| Metric | Normal Range | Alert Threshold |
|--------|--------------|-----------------|
| `waiting` jobs | < 1000 | > 5000 |
| `active` jobs | 1-50 | > 100 |
| `failed` jobs | < 10/hour | > 50/hour |
| `delayed` jobs | < 500 | > 2000 |
| Processing rate | > 10 jobs/sec | < 1 job/sec |

### 6.2 Prometheus Metrics (if configured)

```bash
# Check BullMQ metrics endpoint
curl -s http://localhost:64000/metrics | grep bullmq
```

### 6.3 Alert Rules (SigNoz)

```yaml
# Example alert configuration
- alert: BullMQHighFailedJobs
  expr: bullmq_failed_total > 50
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High number of failed BullMQ jobs"
    
- alert: BullMQQueueBacklog
  expr: bullmq_waiting > 5000
  for: 10m
  labels:
    severity: critical
  annotations:
    summary: "BullMQ queue backlog is growing"
```

### 6.4 Log Patterns to Monitor

```bash
# Error patterns în worker logs
docker compose logs worker-outreach 2>&1 | grep -E "Error|FATAL|failed|timeout" | tail -20

# Job completion rate
docker compose logs worker-outreach 2>&1 | grep "completed" | wc -l
```

---

## 📝 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                  WORKER TROUBLESHOOTING CHEAT SHEET             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Container Down?                                                │
│    docker compose restart worker-<name>                         │
│                                                                 │
│  Queue Paused?                                                  │
│    docker compose exec api npx bullmq resume <queue>            │
│                                                                 │
│  Jobs Failing?                                                  │
│    docker compose logs worker-<name> --tail=100                 │
│    docker compose exec api npx bullmq stats <queue>             │
│                                                                 │
│  Retry Failed Jobs?                                             │
│    ./scripts/retry-failed-jobs.sh <queue-name>                  │
│                                                                 │
│  Rate Limited?                                                  │
│    docker compose exec api npx bullmq pause <queue>             │
│    # Wait for rate limit window reset                           │
│    docker compose exec api npx bullmq resume <queue>            │
│                                                                 │
│  Memory Issues?                                                 │
│    docker stats --no-stream | grep worker                       │
│    docker compose restart worker-<name>                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📝 Changelog

| Data | Versiune | Modificare |
|------|----------|------------|
| 2026-02-01 | 1.0 | Document inițial |

---

**Document Owner:** DevOps Team  
**Review Schedule:** Trimestrial  
**Next Review:** Mai 2026
