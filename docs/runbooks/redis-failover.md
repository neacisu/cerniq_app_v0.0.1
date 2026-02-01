# CERNIQ.APP — Redis Failover Runbook

> **Clasificare:** OPERAȚIONAL  
> **Versiune:** 1.0  
> **Data:** 1 Februarie 2026  
> **Referințe:** [ADR-0006 Redis 8.4.0](../adr/ADR%20Etapa%200/ADR-0006-Redis-8-4-0-cu-BullMQ-v5.md), [Backup Strategy](../infrastructure/backup-strategy.md)

---

## 📋 CUPRINS

1. [Overview](#1-overview)
2. [Diagnosticare Rapidă](#2-diagnosticare-rapidă)
3. [Scenarii de Failure](#3-scenarii-de-failure)
4. [Proceduri de Recovery](#4-proceduri-de-recovery)
5. [BullMQ Queue Recovery](#5-bullmq-queue-recovery)
6. [Monitoring și Prevention](#6-monitoring-și-prevention)

---

## 1. Overview

### 1.1 Configurație Redis CerniqAPP

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          REDIS 8.4.0 SETUP                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │                      REDIS CONTAINER                            │    │
│   │                                                                 │    │
│   │   Version: 8.4.0                                                │    │
│   │   Port: 6379 (internal)                                         │    │
│   │   Memory: 8GB maxmemory                                         │    │
│   │   Policy: noeviction                                            │    │
│   │                                                                 │    │
│   │   ┌─────────────────┐  ┌─────────────────┐                      │    │
│   │   │     AOF         │  │      RDB        │                      │    │
│   │   │  (everysec)     │  │  (daily 4AM)    │                      │    │
│   │   └─────────────────┘  └─────────────────┘                      │    │
│   │                                                                 │    │
│   └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │                    VOLUMES (Persistent)                         │    │
│   │   /data/redis-data  →  appendonly.aof, dump.rdb                 │    │
│   └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Redis Data Categories

| Categorie | Prefix | Persistență | Recovery Priority |
|-----------|--------|-------------|-------------------|
| BullMQ Queues | `bull:*` | AOF | Critical |
| Session Data | `session:*` | AOF | High |
| Rate Limiters | `ratelimit:*` | None | Low (reconstruct) |
| Cache | `cache:*` | None | Low (rebuild) |
| Pub/Sub Channels | `channel:*` | N/A | N/A |

### 1.3 Criticitate

| Impact | Description |
|--------|-------------|
| 🔴 **Critical** | Redis down = No job processing, sessions lost |
| 🟠 **High** | Data loss = Jobs may be lost, need requeue |
| 🟡 **Medium** | Degraded = Slow response, partial functionality |

---

## 2. Diagnosticare Rapidă

### 2.1 Health Check Script

```bash
#!/bin/bash
# Script: redis-health-check.sh

echo "🔴 Redis Health Check"
echo "====================="

# 1. Container status
echo -e "\n📦 Container Status:"
docker compose ps redis

# 2. Ping test
echo -e "\n🏓 Ping Test:"
docker compose exec redis redis-cli ping

# 3. Memory info
echo -e "\n💾 Memory Status:"
docker compose exec redis redis-cli info memory | grep -E "used_memory_human|maxmemory_human|mem_fragmentation"

# 4. Persistence status
echo -e "\n💿 Persistence Status:"
docker compose exec redis redis-cli info persistence | grep -E "aof_enabled|aof_last|rdb_last"

# 5. Connected clients
echo -e "\n👥 Connected Clients:"
docker compose exec redis redis-cli info clients | grep connected_clients

# 6. Key count
echo -e "\n🔑 Key Statistics:"
docker compose exec redis redis-cli info keyspace
```

### 2.2 Quick Diagnostic

```bash
# One-liner health check
docker compose exec redis redis-cli ping && \
docker compose exec redis redis-cli info memory | grep used_memory_human && \
echo "Redis OK"
```

### 2.3 Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                    REDIS ISSUE DECISION TREE                    │
└─────────────────────────────────────────────────────────────────┘

        [Redis Issue Detected]
               │
        ┌──────┴──────┐
        ▼             ▼
   [Container     [Container
     Down]        Running]
        │             │
        ▼             ▼
   Scenario A    ┌────┴────┐
   (Restart)     ▼         ▼
            [OOM         [Slow/
             Error]      Timeout]
                │         │
                ▼         ▼
            Scenario B  Scenario C
            (Memory)    (Performance)
```

---

## 3. Scenarii de Failure

### 3.1 Scenario A: Container Down

**Simptome:**
- Container în status "Exited" sau nu răspunde
- `redis-cli ping` timeout
- Workers aruncă `ECONNREFUSED`

**Diagnostic:**

```bash
# Check container status
docker compose ps redis

# Check logs
docker compose logs redis --tail=100

# Check if data volume exists
ls -la /data/redis-data/
```

**Cauze Posibile:**
- OOM killed (vezi Scenario B)
- Disk full
- Configuration error
- Docker daemon issue

---

### 3.2 Scenario B: Out of Memory (OOM)

**Simptome:**
- Container restart cu OOM în logs
- `maxmemory` reached
- Write commands fail cu `OOM command not allowed`

**Diagnostic:**

```bash
# Check memory usage
docker compose exec redis redis-cli info memory

# Dacă container down, verifică system logs
dmesg | grep -i "killed process" | tail -5

# Check memory config
docker compose exec redis redis-cli config get maxmemory
```

**Soluție Imediată:**

```bash
# 1. Dacă redis încă rulează - clear cache-ul non-esențial
docker compose exec redis redis-cli --scan --pattern 'cache:*' | xargs docker compose exec redis redis-cli DEL

# 2. Dacă OOM killed - restart cu memory config
docker compose restart redis

# 3. Verifică recovery
docker compose exec redis redis-cli info memory
```

**Soluție Permanentă:**

```bash
# Actualizează docker-compose.yml
# redis:
#   deploy:
#     resources:
#       limits:
#         memory: 10G  # Increase from 8G

docker compose up -d redis
```

---

### 3.3 Scenario C: Performance Degradation

**Simptome:**
- Response time crescut
- Workers timeout la Redis operations
- High CPU pe container Redis

**Diagnostic:**

```bash
# Check slow log
docker compose exec redis redis-cli slowlog get 10

# Check blocking commands
docker compose exec redis redis-cli client list | grep -E "cmd=brpop|cmd=blpop"

# Check memory fragmentation
docker compose exec redis redis-cli info memory | grep mem_fragmentation_ratio
```

**Soluție:**

```bash
# 1. Identifică clienti problematici
docker compose exec redis redis-cli client list

# 2. Kill blocked clients dacă necesar
docker compose exec redis redis-cli client kill ID <client-id>

# 3. Memory defragmentation (Redis 8+)
docker compose exec redis redis-cli memory doctor

# 4. Dacă fragmentation ratio > 1.5, consideră restart în maintenance window
docker compose restart redis
```

---

### 3.4 Scenario D: Data Corruption

**Simptome:**
- Redis crash la startup cu erori AOF/RDB
- `Bad file format reading the append only file`
- Erori de CRC în RDB

**Diagnostic:**

```bash
# Check AOF integrity
docker compose exec redis redis-check-aof /data/appendonly.aof

# Check RDB integrity
docker compose exec redis redis-check-rdb /data/dump.rdb
```

**Soluție:**

```bash
# 1. Fix AOF (removes corrupted commands at end)
docker compose exec redis redis-check-aof --fix /data/appendonly.aof

# 2. Dacă AOF ireparabil, restore din RDB
docker compose exec redis sh -c "rm /data/appendonly.aof && redis-server /etc/redis/redis.conf"

# 3. Dacă ambele corupte, restore din backup
# Vezi Secțiunea 4.3
```

---

## 4. Proceduri de Recovery

### 4.1 Simple Restart

```bash
#!/bin/bash
# Script: redis-restart.sh

echo "🔄 Restarting Redis..."

# 1. Graceful shutdown (saves data)
docker compose exec redis redis-cli shutdown save

# 2. Wait for container to stop
sleep 5

# 3. Start redis
docker compose up -d redis

# 4. Wait for startup
sleep 3

# 5. Verify
docker compose exec redis redis-cli ping
echo "✅ Redis restarted"
```

### 4.2 Recovery from AOF

```bash
#!/bin/bash
# Script: redis-recover-aof.sh
# Use when Redis won't start due to AOF issues

echo "🔧 Recovering Redis from AOF..."

# 1. Stop Redis
docker compose stop redis

# 2. Check AOF
docker run --rm -v /data/redis-data:/data redis:8.4.0 redis-check-aof /data/appendonly.aof

# 3. Fix if needed
read -p "Fix AOF? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  docker run --rm -v /data/redis-data:/data redis:8.4.0 redis-check-aof --fix /data/appendonly.aof
fi

# 4. Start Redis
docker compose up -d redis

# 5. Verify
sleep 3
docker compose exec redis redis-cli info keyspace
```

### 4.3 Full Recovery from Backup

```bash
#!/bin/bash
# Script: redis-full-restore.sh
# EMERGENCY: Restore from BorgBackup

echo "🚨 FULL REDIS RESTORE FROM BACKUP"
echo "=================================="

# 1. Stop Redis
docker compose stop redis

# 2. Backup current (corrupted) data
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mv /data/redis-data /data/redis-data-corrupted-$TIMESTAMP

# 3. Create fresh directory
mkdir -p /data/redis-data

# 4. List available backups
echo "Available backups:"
export BORG_PASSPHRASE="${BORG_PASSPHRASE}"
borg list ssh://u123456@u123456.your-storagebox.de:23/./backups/cerniq-postgres

# 5. Extract Redis data from latest backup
read -p "Enter backup name (e.g., daily-2026-01-31): " BACKUP_NAME

borg extract \
  ssh://u123456@u123456.your-storagebox.de:23/./backups/cerniq-redis::$BACKUP_NAME \
  --strip-components 2

# 6. Move to correct location
mv data/* /data/redis-data/

# 7. Set permissions
chown -R 999:999 /data/redis-data

# 8. Start Redis
docker compose up -d redis

# 9. Verify
sleep 5
docker compose exec redis redis-cli info keyspace
echo "✅ Redis restored from backup"
```

### 4.4 Emergency: Start Without Persistence

```bash
#!/bin/bash
# Script: redis-emergency-start.sh
# USE ONLY IN EMERGENCY - Starts Redis without data

echo "⚠️ EMERGENCY: Starting Redis without persistence data"
echo "This will lose all existing data!"
read -p "Continue? (type 'EMERGENCY' to confirm): " CONFIRM

if [[ $CONFIRM == "EMERGENCY" ]]; then
  # Stop redis
  docker compose stop redis
  
  # Backup corrupted data
  mv /data/redis-data /data/redis-data-backup-$(date +%Y%m%d_%H%M%S)
  
  # Create fresh directory
  mkdir -p /data/redis-data
  chown -R 999:999 /data/redis-data
  
  # Start fresh
  docker compose up -d redis
  
  echo "✅ Redis started fresh"
  echo "⚠️ BullMQ queues need to be reconstructed!"
  echo "Run: ./scripts/requeue-pending-jobs.sh"
else
  echo "Cancelled"
fi
```

---

## 5. BullMQ Queue Recovery

### 5.1 Impact Assessment After Redis Recovery

```bash
#!/bin/bash
# Script: bullmq-impact-assessment.sh

echo "📊 BullMQ Impact Assessment"
echo "============================"

docker compose exec api node -e "
const { Queue } = require('bullmq');
const Redis = require('ioredis');

(async () => {
  const redis = new Redis({ host: 'redis' });
  
  // Get all queue names
  const keys = await redis.keys('bull:*:meta');
  const queues = keys.map(k => k.split(':')[1]);
  
  console.log('Found queues:', queues.length);
  
  let totalWaiting = 0;
  let totalActive = 0;
  let totalFailed = 0;
  let totalDelayed = 0;
  
  for (const name of queues) {
    const q = new Queue(name, { connection: { host: 'redis' } });
    const counts = await q.getJobCounts();
    
    totalWaiting += counts.waiting || 0;
    totalActive += counts.active || 0;
    totalFailed += counts.failed || 0;
    totalDelayed += counts.delayed || 0;
    
    await q.close();
  }
  
  console.log('');
  console.log('Total Jobs:');
  console.log('  Waiting:', totalWaiting);
  console.log('  Active:', totalActive, '(may be stale after restart)');
  console.log('  Failed:', totalFailed);
  console.log('  Delayed:', totalDelayed);
  
  redis.disconnect();
})();
"
```

### 5.2 Clean Stale Active Jobs

După Redis restart, jobs în status "active" sunt stale și trebuie recuperate:

```bash
#!/bin/bash
# Script: bullmq-clean-stale.sh

echo "🧹 Cleaning stale active jobs..."

docker compose exec api node -e "
const { Queue } = require('bullmq');
const Redis = require('ioredis');

(async () => {
  const redis = new Redis({ host: 'redis' });
  const keys = await redis.keys('bull:*:meta');
  const queues = keys.map(k => k.split(':')[1]);
  
  for (const name of queues) {
    const q = new Queue(name, { connection: { host: 'redis' } });
    
    // Get stale active jobs
    const active = await q.getActive();
    
    if (active.length > 0) {
      console.log(\`Queue \${name}: \${active.length} stale active jobs\`);
      
      for (const job of active) {
        // Move back to waiting
        await job.moveToFailed(new Error('Recovered after Redis restart'), 'restart-recovery');
        await job.retry();
      }
    }
    
    await q.close();
  }
  
  redis.disconnect();
  console.log('✅ Stale jobs recovered');
})();
"
```

### 5.3 Reconstruct Queues (After Full Data Loss)

```bash
#!/bin/bash
# Script: bullmq-reconstruct.sh
# USE AFTER FULL REDIS DATA LOSS

echo "🔄 Reconstructing BullMQ queues from database..."

docker compose exec api node -e "
// This script queries PostgreSQL for pending operations
// and re-queues them in BullMQ

const { Queue } = require('bullmq');
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    host: 'postgres',
    database: 'cerniq',
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD
  });
  
  const connection = { host: 'redis' };
  
  // 1. Reconstruct pending enrichment jobs
  console.log('Reconstructing enrichment jobs...');
  const enrichQueue = new Queue('enrich:batch', { connection });
  
  const pendingEnrich = await pool.query(\`
    SELECT id, source_type, cui 
    FROM prospects 
    WHERE enrichment_status = 'pending' 
    LIMIT 1000
  \`);
  
  for (const row of pendingEnrich.rows) {
    await enrichQueue.add('enrich', { 
      prospectId: row.id,
      sourceType: row.source_type,
      cui: row.cui
    });
  }
  console.log('  Added:', pendingEnrich.rows.length);
  
  // 2. Reconstruct pending outreach jobs
  console.log('Reconstructing outreach jobs...');
  const outreachQueue = new Queue('outreach:send', { connection });
  
  const pendingOutreach = await pool.query(\`
    SELECT id, channel, prospect_id 
    FROM outreach_queue 
    WHERE status = 'pending' 
    LIMIT 1000
  \`);
  
  for (const row of pendingOutreach.rows) {
    await outreachQueue.add('send', {
      id: row.id,
      channel: row.channel,
      prospectId: row.prospect_id
    });
  }
  console.log('  Added:', pendingOutreach.rows.length);
  
  await enrichQueue.close();
  await outreachQueue.close();
  await pool.end();
  
  console.log('✅ Queue reconstruction complete');
})();
"
```

### 5.4 Verify Workers After Recovery

```bash
#!/bin/bash
# Script: verify-workers-after-redis-recovery.sh

echo "✓ Verifying workers after Redis recovery..."

# 1. Restart all workers to reconnect
echo "Restarting workers..."
docker compose restart worker-enrichment worker-outreach worker-ai worker-postsale worker-nurturing

# 2. Wait for startup
sleep 10

# 3. Verify connections
echo -e "\n📊 Worker Status:"
docker compose ps | grep worker

# 4. Check Redis connections
echo -e "\n🔗 Redis Client Connections:"
docker compose exec redis redis-cli client list | grep -c "worker"

# 5. Test job processing
echo -e "\n🧪 Testing job processing..."
docker compose exec api node -e "
const { Queue } = require('bullmq');
(async () => {
  const q = new Queue('test:health', { connection: { host: 'redis' } });
  
  const job = await q.add('health-check', { timestamp: Date.now() });
  console.log('Test job added:', job.id);
  
  // Wait for processing
  await new Promise(r => setTimeout(r, 5000));
  
  const state = await job.getState();
  console.log('Job state:', state);
  
  if (state === 'completed') {
    console.log('✅ Job processing working');
  } else {
    console.log('⚠️ Job not processed yet, check workers');
  }
  
  await q.close();
})();
"
```

---

## 6. Monitoring și Prevention

### 6.1 Key Metrics

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| Memory Used | < 70% | 70-85% | > 85% |
| Connected Clients | 10-100 | > 200 | > 500 |
| Evicted Keys | 0 | > 0 | > 100 |
| AOF Rewrite Time | < 10s | 10-60s | > 60s |
| Latency | < 1ms | 1-10ms | > 10ms |

### 6.2 Monitoring Script (Cron)

```bash
#!/bin/bash
# Script: redis-monitor.sh
# Add to crontab: */5 * * * * /opt/scripts/redis-monitor.sh

ALERT_EMAIL="devops@cerniq.app"
MEMORY_THRESHOLD=85

# Get memory percentage
MEM_USED=$(docker compose exec redis redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
MEM_MAX=$(docker compose exec redis redis-cli config get maxmemory | tail -1)

# Calculate percentage (simplified)
MEM_PCT=$(docker compose exec redis redis-cli info memory | grep used_memory: | cut -d: -f2 | tr -d '\r')
MEM_PCT=$((MEM_PCT * 100 / MEM_MAX))

if [ "$MEM_PCT" -gt "$MEMORY_THRESHOLD" ]; then
  echo "Redis memory at ${MEM_PCT}% - ALERT" | mail -s "Redis Memory Alert" $ALERT_EMAIL
fi

# Check if Redis responding
if ! docker compose exec redis redis-cli ping > /dev/null 2>&1; then
  echo "Redis not responding - CRITICAL" | mail -s "Redis Down Alert" $ALERT_EMAIL
fi
```

### 6.3 Prometheus Alerts

```yaml
# prometheus-alerts.yml
groups:
  - name: redis
    rules:
      - alert: RedisDown
        expr: redis_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis instance is down"
          
      - alert: RedisHighMemory
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage above 85%"
          
      - alert: RedisNoEviction
        expr: increase(redis_evicted_keys_total[1h]) > 0 and redis_config_maxmemory_policy == "noeviction"
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis evicting keys with noeviction policy"
```

### 6.4 Prevention Checklist

```markdown
## Daily
- [ ] Check memory usage < 70%
- [ ] Verify AOF sync is working
- [ ] Check connected clients count

## Weekly
- [ ] Review slow log for patterns
- [ ] Verify backup completion
- [ ] Check memory fragmentation

## Monthly
- [ ] Test restore from backup
- [ ] Review memory growth trend
- [ ] Update Redis if security patches available
```

---

## 📝 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                  REDIS TROUBLESHOOTING CHEAT SHEET              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Redis Down?                                                    │
│    docker compose logs redis --tail=50                          │
│    docker compose restart redis                                 │
│                                                                 │
│  OOM Error?                                                     │
│    docker compose exec redis redis-cli info memory              │
│    # Clear cache: redis-cli --scan --pattern 'cache:*' | DEL    │
│                                                                 │
│  AOF Corrupt?                                                   │
│    docker compose exec redis redis-check-aof --fix /data/aof    │
│                                                                 │
│  Full Restore?                                                  │
│    ./scripts/redis-full-restore.sh                              │
│                                                                 │
│  After Recovery - Clean BullMQ?                                 │
│    ./scripts/bullmq-clean-stale.sh                              │
│                                                                 │
│  Workers Not Connecting?                                        │
│    docker compose restart worker-*                              │
│                                                                 │
│  Memory Check:                                                  │
│    docker compose exec redis redis-cli info memory              │
│                                                                 │
│  Persistence Check:                                             │
│    docker compose exec redis redis-cli info persistence         │
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
