# Etapa 1 – Data Enrichment Pipeline: Deployment Runbook

> **Reference:** E1.S4.PR8.001  
> **Last updated:** 2026-03-01  
> **Owner:** Platform Engineering

---

## Table of Contents

1. [Pre-deployment Checklist](#1-pre-deployment-checklist)
2. [Deployment Steps](#2-deployment-steps)
3. [Health Checks](#3-health-checks)
4. [Monitoring](#4-monitoring)
5. [Troubleshooting](#5-troubleshooting)
6. [Rollback Procedure](#6-rollback-procedure)
7. [Scaling Guidelines](#7-scaling-guidelines)

---

## 1. Pre-deployment Checklist

### 1.1 Environment Variables

Verify **all** required environment variables are set before deploying. Missing or invalid values will cause startup failures.

| Variable | Description | Example |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/cerniq` |
| `REDIS_URL` | Redis connection string | `redis://host:6379` |
| `JWT_SECRET` | Secret for JWT token signing | (min 32 characters) |
| `ANAF_API_URL` | ANAF public API base URL | `https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva` |
| `TERMENE_API_KEY` | Termene.ro API key | |
| `ONRC_API_KEY` | ONRC API key | |
| `HUNTER_API_KEY` | Hunter.io email verification key | |
| `ZEROBOUNCE_API_KEY` | ZeroBounce email validation key | |
| `XAI_API_KEY` | xAI (Grok) API key for AI enrichment | |
| `HLR_API_KEY` | HLR Lookup phone validation key | |
| `BING_API_KEY` | Bing Search API key | |
| `NOMINATIM_USER_AGENT` | User-Agent for Nominatim geocoding | `CerniqApp/1.0 (contact@cerniq.ro)` |

Quick validation command:

```bash
for var in DATABASE_URL REDIS_URL JWT_SECRET ANAF_API_URL TERMENE_API_KEY \
  ONRC_API_KEY HUNTER_API_KEY ZEROBOUNCE_API_KEY XAI_API_KEY HLR_API_KEY \
  BING_API_KEY NOMINATIM_USER_AGENT; do
  if [ -z "${!var}" ]; then
    echo "MISSING: $var"
  else
    echo "OK:      $var"
  fi
done
```

### 1.2 Database Readiness

```bash
# Run pending migrations
pnpm db:migrate

# Verify required PostgreSQL extensions
psql "$DATABASE_URL" -c "SELECT extname FROM pg_extension WHERE extname IN ('pgcrypto','pg_trgm','postgis');"
```

Expected output should include at minimum `pgcrypto` and `pg_trgm`. `postgis` is required only if geospatial features are enabled.

### 1.3 Redis Connectivity

```bash
redis-cli -u "$REDIS_URL" PING
# Expected: PONG
```

### 1.4 Build Verification

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Ensure all tests pass and the build completes without errors before proceeding.

---

## 2. Deployment Steps

### 2.1 Standard Deployment (Docker Compose)

```bash
# 1. Pull latest images / rebuild
docker compose -f infra/docker/docker-compose.yml build

# 2. Run database migrations
pnpm db:migrate

# 3. Deploy services (zero-downtime with Traefik)
docker compose -f infra/docker/docker-compose.yml up -d

# 4. Verify all containers are running
docker compose -f infra/docker/docker-compose.yml ps
```

### 2.2 Manual / Bare-metal Deployment

```bash
# 1. Build all packages
pnpm build

# 2. Run database migrations
pnpm db:migrate

# 3. Start the API server
pnpm --filter @cerniq/api start

# 4. Start enrichment workers
pnpm --filter @cerniq/enrichment-workers start

# 5. Verify health endpoints
curl -sf http://localhost:3000/health && echo "API OK" || echo "API FAILED"
curl -sf http://localhost:9090/health && echo "Workers OK" || echo "Workers FAILED"
```

### 2.3 CI/CD Deployment (GitHub Actions)

The pipeline is defined in `.github/workflows/deploy.yml`. On merge to `main`:

1. Runs lint, type-check, and tests
2. Builds Docker images
3. Pushes images to container registry
4. Triggers deployment via SSH / Docker Compose on the target server
5. Runs post-deployment health checks

---

## 3. Health Checks

### 3.1 API Server

| Endpoint | Port | Expected Response |
| --- | --- | --- |
| `GET /health` | 3000 | `200 OK` with `{ "status": "ok" }` |

```bash
curl -sf http://localhost:3000/health | jq .
```

### 3.2 Enrichment Workers

| Endpoint | Port | Expected Response |
| --- | --- | --- |
| `GET /health` | 9090 | `200 OK` with `{ "status": "ok", "queues": {...} }` |
| `GET /metrics` | 9090 | Prometheus text format |

```bash
curl -sf http://localhost:9090/health | jq .
curl -sf http://localhost:9090/metrics | head -20
```

### 3.3 Redis

```bash
redis-cli -u "$REDIS_URL" PING
# Expected: PONG

redis-cli -u "$REDIS_URL" INFO memory | grep used_memory_human
```

### 3.4 PostgreSQL

```bash
psql "$DATABASE_URL" -c "SELECT 1 AS connectivity_check;"
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();"
```

### 3.5 Automated Health Check Script

```bash
#!/usr/bin/env bash
set -euo pipefail

FAIL=0

check() {
  if eval "$2" > /dev/null 2>&1; then
    echo "✓ $1"
  else
    echo "✗ $1"
    FAIL=1
  fi
}

check "API /health"           "curl -sf http://localhost:3000/health"
check "Workers /health"       "curl -sf http://localhost:9090/health"
check "Redis PING"            "redis-cli -u $REDIS_URL PING"
check "PostgreSQL SELECT 1"   "psql $DATABASE_URL -c 'SELECT 1' -t -q"

exit $FAIL
```

---

## 4. Monitoring

### 4.1 Prometheus Metrics

The workers expose a `/metrics` endpoint (port 9090) in Prometheus text format.

**Key metrics to monitor:**

| Metric | Type | Description |
| --- | --- | --- |
| `worker_jobs_processed_total` | Counter | Total jobs processed (by queue, status) |
| `worker_jobs_failed_total` | Counter | Total failed jobs (by queue, error type) |
| `worker_job_duration_seconds` | Histogram | Job processing duration |
| `circuit_breaker_state` | Gauge | Circuit breaker state (0=closed, 1=half-open, 2=open) |
| `queue_waiting_count` | Gauge | Jobs waiting in queue |
| `queue_active_count` | Gauge | Jobs currently being processed |
| `api_request_duration_seconds` | Histogram | API endpoint response times |

### 4.2 Grafana Dashboards

The pre-configured dashboard is located at:

```text
infra/config/grafana/dashboards/etapa1-overview.json
```

Import it into Grafana via **Dashboards → Import → Upload JSON file**.

Panels include:

- Job throughput (processed/min by queue)
- Error rate and failure breakdown
- Queue depth over time
- Circuit breaker state timeline
- API response time percentiles
- SLA compliance tracking

### 4.3 Alert Rules

Alert rules are defined in `infra/config/prometheus/infra-cerniq-alerts.yml`.

| Alert | Condition | Severity |
| --- | --- | --- |
| **HighErrorRate** | `rate(worker_jobs_failed_total[5m]) > 0.1` | critical |
| **QueueBacklog** | `queue_waiting_count > 1000` for 10 min | warning |
| **SLABreach** | Pending approval tasks past `due_at` | critical |
| **CircuitBreakerOpen** | `circuit_breaker_state == 2` for 5 min | warning |
| **WorkerDown** | Workers `/health` unreachable for 2 min | critical |
| **HighMemoryUsage** | Redis `used_memory` > 80% of `maxmemory` | warning |

---

## 5. Troubleshooting

### 5.1 Queue Backlog

**Symptoms:** `queue_waiting_count` growing, jobs taking longer to process.

**Diagnosis:**

```bash
# Check Redis memory usage
redis-cli -u "$REDIS_URL" INFO memory

# Check queue status via API
curl -sf http://localhost:3000/enrichment/queues | jq .

# Check active/waiting counts per queue
redis-cli -u "$REDIS_URL" KEYS "bull:*:waiting" | while read key; do
  echo "$key: $(redis-cli -u "$REDIS_URL" LLEN "$key")"
done
```

**Resolution:**

1. Increase worker concurrency in `workers/enrichment/src/queue-registry.ts`
2. Scale workers horizontally (add more instances)
3. Check if an external API is rate-limiting (causing retries to pile up)
4. If Redis memory is high, check for stuck/stale jobs and clean them

### 5.2 Worker Failures

**Symptoms:** `worker_jobs_failed_total` increasing, jobs landing in DLQ.

**Diagnosis:**

```bash
# Check worker logs
docker logs cerniq-workers --tail 200

# Check Dead Letter Queue
redis-cli -u "$REDIS_URL" LLEN "bull:<queue-name>:failed"

# Check pipeline_errors table
psql "$DATABASE_URL" -c "
  SELECT error_type, count(*), max(created_at)
  FROM gold.pipeline_errors
  GROUP BY error_type
  ORDER BY count DESC
  LIMIT 20;
"
```

**Resolution:**

1. Identify the error pattern (API timeout, validation error, DB constraint)
2. Fix the root cause (API key, schema mismatch, data issue)
3. Retry failed jobs via the BullMQ dashboard or API
4. If a specific job is poison (always fails), remove it from the queue

### 5.3 Database Issues

**Symptoms:** Slow API responses, connection timeouts, migration failures.

**Diagnosis:**

```bash
# Check active connections
psql "$DATABASE_URL" -c "
  SELECT state, count(*)
  FROM pg_stat_activity
  WHERE datname = current_database()
  GROUP BY state;
"

# Check slow queries (requires pg_stat_statements extension)
psql "$DATABASE_URL" -c "
  SELECT query, calls, total_exec_time::int AS total_ms,
         (total_exec_time / calls)::int AS avg_ms
  FROM pg_stat_statements
  ORDER BY total_exec_time DESC
  LIMIT 10;
"

# Check table bloat
psql "$DATABASE_URL" -c "
  SELECT schemaname, relname, n_dead_tup, last_vacuum, last_autovacuum
  FROM pg_stat_user_tables
  WHERE n_dead_tup > 10000
  ORDER BY n_dead_tup DESC;
"
```

**Resolution:**

1. If connections are exhausted, check for connection leaks; restart workers if needed
2. Run `VACUUM ANALYZE` on tables with high dead tuple counts
3. Add missing indexes for slow queries
4. For migration failures, check the `drizzle` migration journal at `packages/db/drizzle/meta/_journal.json`

### 5.4 External API Issues

**Symptoms:** Circuit breaker opening, enrichment jobs failing with timeout/HTTP errors.

**Diagnosis:**

```bash
# Check circuit breaker states in metrics
curl -sf http://localhost:9090/metrics | grep circuit_breaker

# Test API connectivity manually
curl -sf https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva -X POST \
  -H "Content-Type: application/json" -d '{"cui":[12345678]}'
```

**Rate limits by provider:**

| Provider | Rate Limit | Notes |
| --- | --- | --- |
| Nominatim | 1 req/s | Strict; requires valid User-Agent |
| ANAF | ~10 req/s | Batch up to 500 CUIs per request |
| Hunter.io | 15 req/s | Key-based, check dashboard for quota |
| ZeroBounce | Varies | Credit-based, check remaining credits |
| Bing Search | 3 req/s | Tier-dependent |
| Termene.ro | 5 req/s | Check contract limits |

**Resolution:**

1. Wait for the circuit breaker to transition to half-open (automatic after timeout)
2. Verify API keys are valid and have remaining quota
3. Adjust rate limiting in `workers/enrichment/src/` if hitting provider limits
4. Use fallback providers if the primary is down

### 5.5 HITL SLA Breach

**Symptoms:** Approval tasks exceeding their SLA deadline.

**Diagnosis:**

```bash
# Find breached tasks
psql "$DATABASE_URL" -c "
  SELECT id, entity_type, entity_id, status, assigned_to, due_at,
         NOW() - due_at AS overdue_by
  FROM approval_tasks
  WHERE status = 'pending' AND due_at < NOW()
  ORDER BY due_at ASC;
"

# Count by assignee
psql "$DATABASE_URL" -c "
  SELECT assigned_to, count(*)
  FROM approval_tasks
  WHERE status = 'pending'
  GROUP BY assigned_to
  ORDER BY count DESC;
"
```

**Resolution:**

1. Escalate overdue tasks: `pnpm worker:hitl-escalation`
2. Reassign tasks to available operators with lower workload
3. If the issue is systemic (too many tasks), increase the number of operators
4. Adjust SLA thresholds if they are unrealistic for the current volume

---

## 6. Rollback Procedure

### 6.1 Preparation

Before rolling back, document:

- The current deployed version (git SHA / Docker image tag)
- The version to roll back to
- Any migrations that were applied in the current deployment

### 6.2 Steps

```bash
# 1. Stop workers first (drain gracefully)
docker compose -f infra/docker/docker-compose.yml stop cerniq-workers

# 2. Wait for active jobs to complete (check queue active count)
redis-cli -u "$REDIS_URL" KEYS "bull:*:active" | while read key; do
  count=$(redis-cli -u "$REDIS_URL" LLEN "$key")
  echo "$key: $count active jobs"
done

# 3. Stop the API server
docker compose -f infra/docker/docker-compose.yml stop cerniq-api

# 4. Revert database migrations (if applicable)
# Option A: Drizzle rollback (if supported)
pnpm db:rollback

# Option B: Manual SQL rollback
psql "$DATABASE_URL" -f packages/db/drizzle/rollback/<migration-name>.sql

# 5. Deploy the previous Docker image
docker compose -f infra/docker/docker-compose.yml up -d \
  --pull always \
  -e API_IMAGE=registry.cerniq.ro/api:<previous-tag> \
  -e WORKER_IMAGE=registry.cerniq.ro/workers:<previous-tag>

# 6. Verify health
curl -sf http://localhost:3000/health && echo "API OK"
curl -sf http://localhost:9090/health && echo "Workers OK"
```

### 6.3 Post-rollback Verification

1. Run the health check script (Section 3.5)
2. Verify no orphaned jobs in Redis queues
3. Check application logs for errors
4. Notify the team about the rollback and its reason

---

## 7. Scaling Guidelines

### 7.1 Enrichment Workers (Horizontal)

BullMQ distributes jobs across all connected workers automatically. To scale:

```bash
# Scale via Docker Compose
docker compose -f infra/docker/docker-compose.yml up -d --scale cerniq-workers=3
```

**Guidelines:**

- Each worker instance processes jobs from all queues
- Safe to add/remove instances at any time (BullMQ handles distribution)
- Monitor `queue_waiting_count` — scale up when consistently > 500
- Scale down when `queue_active_count` is consistently low across instances

### 7.2 API Server (Horizontal)

Traefik load balances across API instances automatically.

```bash
docker compose -f infra/docker/docker-compose.yml up -d --scale cerniq-api=2
```

**Guidelines:**

- Stateless by design; safe to scale horizontally
- JWT validation is done locally (no shared session state)
- Monitor `api_request_duration_seconds` p99 — scale up when > 2s

### 7.3 Redis

| Volume | Recommendation |
| --- | --- |
| < 10k jobs/hour | Single Redis instance (default) |
| 10k–100k jobs/hour | Redis with AOF persistence, dedicated host |
| > 100k jobs/hour | Redis Cluster (3+ nodes) |

**Memory guidelines:**

- Set `maxmemory` to 80% of available RAM
- Use `maxmemory-policy allkeys-lru` only if BullMQ data loss is acceptable
- Monitor `used_memory` vs `maxmemory` ratio

### 7.4 PostgreSQL

| Scenario | Recommendation |
| --- | --- |
| High read load (dashboards) | Add read replicas; route dashboard queries to replicas |
| High write load (imports) | Optimize batch inserts, partition large tables |
| Connection exhaustion | Use PgBouncer as connection pooler |
| Large dataset (>10M rows) | Partition bronze/silver tables by `tenant_id` or `created_at` |

```bash
# Check current connection usage vs limit
psql "$DATABASE_URL" -c "
  SELECT max_conn, used, max_conn - used AS available
  FROM (SELECT count(*) AS used FROM pg_stat_activity) t,
       (SELECT setting::int AS max_conn FROM pg_settings WHERE name = 'max_connections') s;
"
```

---

## Appendix A: Key File Locations

| Component | Path |
| --- | --- |
| API server | `apps/api/` |
| Web frontend | `apps/web/` |
| Enrichment workers | `workers/enrichment/` |
| Database schemas | `packages/db/src/schemas/` |
| Migrations | `packages/db/drizzle/` |
| Docker Compose | `infra/docker/docker-compose.yml` |
| Prometheus alerts | `infra/config/prometheus/infra-cerniq-alerts.yml` |
| Grafana dashboard | `infra/config/grafana/dashboards/etapa1-overview.json` |
| CI/CD pipeline | `.github/workflows/deploy.yml` |
| OpenBao secrets template | `infra/config/openbao/templates/workers-env.tpl` |

## Appendix B: Useful Commands Quick Reference

```bash
# View worker logs in real-time
docker logs -f cerniq-workers

# Check all queue sizes at a glance
curl -sf http://localhost:3000/enrichment/queues | jq '.queues[] | {name, waiting, active, failed}'

# Force-retry all failed jobs in a queue
curl -X POST http://localhost:3000/enrichment/queues/<queue-name>/retry-all

# Check migration status
pnpm db:migrate --dry-run

# Seed database (development/staging only)
pnpm db:seed

# Run a specific worker in isolation (debugging)
pnpm --filter @cerniq/enrichment-workers start --queue <queue-name>
```
