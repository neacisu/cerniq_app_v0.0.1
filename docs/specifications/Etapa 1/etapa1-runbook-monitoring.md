# CERNIQ.APP — ETAPA 1: RUNBOOK & MONITORING
## Operational Procedures, Dashboards & Alerting
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. RUNBOOK OVERVIEW

## 1.1 Purpose

Acest runbook documentează procedurile operaționale pentru Etapa 1 (Data Enrichment Pipeline):
- **Troubleshooting** - Diagnosticare și rezolvare probleme
- **Maintenance** - Proceduri de întreținere
- **Incident Response** - Răspuns la incidente
- **Scaling** - Proceduri de scalare

---

# 2. TROUBLESHOOTING PROCEDURES

## 2.1 Import Stuck in Processing

**Simptome:**
- Import status rămâne pe `processing` > 30 minute
- Progresul nu se actualizează
- No new bronze_contacts created

**Diagnostic:**

```bash
# 1. Check import status
SELECT id, status, progress_percent, total_rows, processed_rows, 
       error_message, started_at
FROM bronze_import_batches 
WHERE id = '<import_id>';

# 2. Check worker health
docker logs cerniq-workers --tail 100 | grep "csv\|xlsx"

# 3. Check Redis queue
redis-cli LLEN bull:bronze:ingest:csv:wait
redis-cli LLEN bull:bronze:ingest:csv:active
redis-cli LLEN bull:bronze:ingest:csv:failed

# 4. Check for stuck jobs
SELECT * FROM pg_stat_activity 
WHERE state = 'active' 
AND query LIKE '%bronze%';
```

**Rezolvare:**

```bash
# Option A: Restart stuck worker
docker restart cerniq-workers-ingest

# Option B: Manually fail and retry
redis-cli EVAL "
  local jobs = redis.call('LRANGE', 'bull:bronze:ingest:csv:active', 0, -1)
  for _, job in ipairs(jobs) do
    redis.call('LPUSH', 'bull:bronze:ingest:csv:wait', job)
  end
  redis.call('DEL', 'bull:bronze:ingest:csv:active')
  return #jobs
" 0

# Option C: Cancel import and allow retry
UPDATE bronze_import_batches 
SET status = 'cancelled', 
    error_message = 'Manually cancelled - stuck processing'
WHERE id = '<import_id>';
```

## 2.2 Enrichment Rate Limiting

**Simptome:**
- High number of jobs in delayed queue
- API timeout errors in logs
- Circuit breaker OPEN state

**Diagnostic:**

```bash
# Check rate limit status
redis-cli GET rate_limit:anaf:remaining
redis-cli GET rate_limit:termene:remaining

# Check circuit breaker state
redis-cli GET circuit:anaf:state
redis-cli GET circuit:termene:state

# Check delayed jobs
redis-cli ZCARD bull:silver:enrich:anaf-fiscal-status:delayed
```

**Rezolvare:**

```bash
# 1. Wait for rate limit reset (automatic)

# 2. If circuit breaker stuck OPEN, reset manually
redis-cli DEL circuit:anaf:state
redis-cli DEL circuit:anaf:failures

# 3. Reduce concurrency temporarily
# Edit worker config in docker-compose.yml:
# ANAF_CONCURRENCY=1
# TERMENE_CONCURRENCY=5

# 4. Restart workers
docker restart cerniq-workers-enrichment
```

## 2.3 HITL SLA Breach

**Simptome:**
- Alert: "HITL SLA Breach"
- Approval tasks with status='pending' and due_at < NOW()

**Diagnostic:**

```sql
-- Check breached tasks
SELECT id, approval_type, priority, due_at, 
       assigned_to, escalation_level,
       NOW() - due_at as overdue_by
FROM approval_tasks
WHERE status = 'pending'
  AND due_at < NOW()
ORDER BY due_at;

-- Check operator workload
SELECT u.name, COUNT(*) as pending_tasks,
       AVG(EXTRACT(EPOCH FROM (NOW() - at.created_at))/3600) as avg_wait_hours
FROM approval_tasks at
JOIN users u ON at.assigned_to = u.id
WHERE at.status IN ('pending', 'assigned')
GROUP BY u.id, u.name;
```

**Rezolvare:**

```bash
# 1. Trigger manual escalation
curl -X POST https://api.cerniq.app/api/v1/approvals/<task_id>/escalate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"escalateTo": "<manager_user_id>", "reason": "SLA breach - manual escalation"}'

# 2. Redistribute workload
UPDATE approval_tasks 
SET assigned_to = NULL, status = 'pending'
WHERE status = 'assigned' 
  AND assigned_to = '<overloaded_user_id>'
  AND due_at < NOW() + INTERVAL '2 hours';

# 3. Auto-approve low-risk items (if policy allows)
-- Only for specific approval types with high confidence
UPDATE approval_tasks 
SET status = 'approved',
    decision = 'approve',
    decision_reason = 'Auto-approved due to SLA breach',
    decided_at = NOW()
WHERE status = 'pending'
  AND approval_type = 'dedup_review'
  AND (metadata->>'confidence')::float >= 0.90
  AND due_at < NOW();
```

## 2.4 Quality Score Anomalies

**Simptome:**
- Companii cu quality score = 0 sau NULL
- Quality scores nu se actualizează
- Promotion pipeline blocat

**Diagnostic:**

```sql
-- Check companies without quality scores
SELECT COUNT(*) as count,
       enrichment_status,
       promotion_status
FROM silver_companies
WHERE total_quality_score IS NULL
  AND is_master_record = true
GROUP BY enrichment_status, promotion_status;

-- Check scoring worker health
SELECT queue_name, waiting, active, completed, failed
FROM bullmq_queue_stats
WHERE queue_name LIKE 'silver:score%';
```

**Rezolvare:**

```bash
# 1. Re-trigger scoring for affected companies
SELECT id INTO TEMP TABLE companies_to_score
FROM silver_companies
WHERE total_quality_score IS NULL
  AND enrichment_status = 'complete'
  AND is_master_record = true;

# Trigger via API or direct queue insert
curl -X POST https://api.cerniq.app/api/v1/internal/scoring/batch \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"query": "total_quality_score IS NULL AND enrichment_status = complete"}'

# 2. Force recalculation
UPDATE silver_companies
SET completeness_score = NULL,
    accuracy_score = NULL,
    freshness_score = NULL
WHERE total_quality_score IS NULL;

# Restart scoring workers
docker restart cerniq-workers-scoring
```

---

# 3. MAINTENANCE PROCEDURES

## 3.1 Daily Maintenance

```bash
#!/bin/bash
# /scripts/daily-maintenance.sh

# 1. Vacuum analyze tables
psql -h localhost -U cerniq -d cerniq_db << 'EOF'
VACUUM ANALYZE bronze_contacts;
VACUUM ANALYZE silver_companies;
VACUUM ANALYZE gold_companies;
VACUUM ANALYZE approval_tasks;
EOF

# 2. Clean old bronze data (> 30 days, promoted)
psql -h localhost -U cerniq -d cerniq_db << 'EOF'
DELETE FROM bronze_contacts
WHERE created_at < NOW() - INTERVAL '30 days'
  AND processing_status = 'promoted';
EOF

# 3. Archive enrichment logs (> 90 days)
psql -h localhost -U cerniq -d cerniq_db << 'EOF'
INSERT INTO silver_enrichment_log_archive
SELECT * FROM silver_enrichment_log
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM silver_enrichment_log
WHERE created_at < NOW() - INTERVAL '90 days';
EOF

# 4. Clean Redis expired keys
redis-cli --scan --pattern "cache:*" | xargs redis-cli DEL
redis-cli --scan --pattern "session:expired:*" | xargs redis-cli DEL

# 5. Rotate logs
logrotate /etc/logrotate.d/cerniq

echo "Daily maintenance completed at $(date)"
```

## 3.2 Weekly Maintenance

```bash
#!/bin/bash
# /scripts/weekly-maintenance.sh

# 1. Full vacuum
psql -h localhost -U cerniq -d cerniq_db << 'EOF'
VACUUM FULL bronze_contacts;
VACUUM FULL silver_enrichment_log;
EOF

# 2. Reindex if needed
psql -h localhost -U cerniq -d cerniq_db << 'EOF'
REINDEX TABLE CONCURRENTLY silver_companies;
REINDEX TABLE CONCURRENTLY gold_companies;
EOF

# 3. Update statistics
psql -h localhost -U cerniq -d cerniq_db << 'EOF'
ANALYZE;
EOF

# 4. Check for orphaned records
psql -h localhost -U cerniq -d cerniq_db << 'EOF'
-- Silver without valid Bronze source
SELECT COUNT(*) as orphan_silver
FROM silver_companies sc
WHERE sc.source_bronze_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM bronze_contacts bc 
    WHERE bc.id = sc.source_bronze_id
  );
EOF

# 5. Verify backups
/scripts/verify-backups.sh

echo "Weekly maintenance completed at $(date)"
```

## 3.3 Index Maintenance

```sql
-- Check index health
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Identify unused indexes
SELECT 
  indexrelid::regclass as index,
  relid::regclass as table,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelid NOT IN (SELECT conindid FROM pg_constraint);

-- Identify bloated indexes
SELECT 
  nspname || '.' || relname as index,
  pg_size_pretty(pg_relation_size(oid)) as size,
  100 - (100 * avg_leaf_density) as bloat_percent
FROM pgstatindex_all_indexes
WHERE avg_leaf_density < 0.9;
```

---

# 4. MONITORING CONFIGURATION

## 4.1 SigNoz Dashboard Configuration

```yaml
# sigNoz/dashboards/etapa1-overview.json
{
  "title": "Etapa 1 - Data Pipeline Overview",
  "panels": [
    {
      "title": "Pipeline Funnel",
      "type": "stat",
      "queries": [
        {
          "name": "Bronze Total",
          "query": "SELECT COUNT(*) FROM bronze_contacts WHERE tenant_id = $tenant_id"
        },
        {
          "name": "Silver Total",
          "query": "SELECT COUNT(*) FROM silver_companies WHERE tenant_id = $tenant_id AND is_master_record = true"
        },
        {
          "name": "Gold Total",
          "query": "SELECT COUNT(*) FROM gold_companies WHERE tenant_id = $tenant_id"
        }
      ]
    },
    {
      "title": "Enrichment Queue Depth",
      "type": "timeseries",
      "queries": [
        {
          "name": "ANAF Queue",
          "query": "sum(bullmq_queue_waiting{queue=~\".*anaf.*\"})"
        },
        {
          "name": "Termene Queue",
          "query": "sum(bullmq_queue_waiting{queue=~\".*termene.*\"})"
        }
      ]
    },
    {
      "title": "Quality Score Distribution",
      "type": "histogram",
      "queries": [
        {
          "query": "SELECT total_quality_score, COUNT(*) FROM silver_companies GROUP BY total_quality_score ORDER BY total_quality_score"
        }
      ]
    },
    {
      "title": "HITL Pending Tasks",
      "type": "gauge",
      "queries": [
        {
          "query": "SELECT COUNT(*) FROM approval_tasks WHERE status = 'pending'"
        }
      ],
      "thresholds": {
        "warning": 50,
        "critical": 100
      }
    }
  ]
}
```

## 4.2 Prometheus Metrics

```typescript
// packages/monitoring/src/metrics.ts

import { Counter, Histogram, Gauge, Registry } from 'prom-client';

export const registry = new Registry();

// Bronze metrics
export const bronzeContactsIngested = new Counter({
  name: 'cerniq_bronze_contacts_ingested_total',
  help: 'Total number of bronze contacts ingested',
  labelNames: ['tenant_id', 'source_type'],
  registers: [registry],
});

export const bronzeContactsPromoted = new Counter({
  name: 'cerniq_bronze_contacts_promoted_total',
  help: 'Total number of bronze contacts promoted to silver',
  labelNames: ['tenant_id'],
  registers: [registry],
});

export const bronzeProcessingDuration = new Histogram({
  name: 'cerniq_bronze_processing_duration_seconds',
  help: 'Duration of bronze contact processing',
  labelNames: ['source_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [registry],
});

// Silver metrics
export const silverEnrichmentDuration = new Histogram({
  name: 'cerniq_silver_enrichment_duration_seconds',
  help: 'Duration of silver company enrichment',
  labelNames: ['source'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
  registers: [registry],
});

export const silverEnrichmentErrors = new Counter({
  name: 'cerniq_silver_enrichment_errors_total',
  help: 'Total number of enrichment errors',
  labelNames: ['source', 'error_type'],
  registers: [registry],
});

export const silverQualityScore = new Histogram({
  name: 'cerniq_silver_quality_score',
  help: 'Distribution of silver company quality scores',
  buckets: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  registers: [registry],
});

// Gold metrics
export const goldCompaniesTotal = new Gauge({
  name: 'cerniq_gold_companies_total',
  help: 'Total number of gold companies',
  labelNames: ['tenant_id', 'current_state'],
  registers: [registry],
});

export const goldLeadScore = new Histogram({
  name: 'cerniq_gold_lead_score',
  help: 'Distribution of gold company lead scores',
  buckets: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  registers: [registry],
});

// HITL metrics
export const hitlTasksCreated = new Counter({
  name: 'cerniq_hitl_tasks_created_total',
  help: 'Total number of HITL tasks created',
  labelNames: ['approval_type', 'priority'],
  registers: [registry],
});

export const hitlTasksResolved = new Counter({
  name: 'cerniq_hitl_tasks_resolved_total',
  help: 'Total number of HITL tasks resolved',
  labelNames: ['approval_type', 'decision'],
  registers: [registry],
});

export const hitlResolutionTime = new Histogram({
  name: 'cerniq_hitl_resolution_time_seconds',
  help: 'Time to resolve HITL tasks',
  labelNames: ['approval_type', 'priority'],
  buckets: [60, 300, 900, 1800, 3600, 14400, 86400],
  registers: [registry],
});

export const hitlSlaBreach = new Counter({
  name: 'cerniq_hitl_sla_breach_total',
  help: 'Total number of HITL SLA breaches',
  labelNames: ['approval_type', 'priority'],
  registers: [registry],
});

// Worker metrics
export const workerJobsProcessed = new Counter({
  name: 'cerniq_worker_jobs_processed_total',
  help: 'Total number of worker jobs processed',
  labelNames: ['queue', 'status'],
  registers: [registry],
});

export const workerJobDuration = new Histogram({
  name: 'cerniq_worker_job_duration_seconds',
  help: 'Duration of worker jobs',
  labelNames: ['queue'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [registry],
});

export const workerQueueDepth = new Gauge({
  name: 'cerniq_worker_queue_depth',
  help: 'Current queue depth',
  labelNames: ['queue', 'state'],
  registers: [registry],
});
```

## 4.3 Alert Rules

```yaml
# prometheus/alerts/etapa1.yml

groups:
  - name: etapa1-pipeline
    rules:
      # Queue depth alerts
      - alert: HighQueueDepth
        expr: cerniq_worker_queue_depth{state="waiting"} > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High queue depth detected"
          description: "Queue {{ $labels.queue }} has {{ $value }} waiting jobs"

      - alert: CriticalQueueDepth
        expr: cerniq_worker_queue_depth{state="waiting"} > 5000
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Critical queue depth"
          description: "Queue {{ $labels.queue }} has {{ $value }} waiting jobs"

      # Enrichment errors
      - alert: HighEnrichmentErrorRate
        expr: |
          rate(cerniq_silver_enrichment_errors_total[5m]) 
          / rate(cerniq_silver_enrichment_duration_seconds_count[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High enrichment error rate"
          description: "Source {{ $labels.source }} error rate is {{ $value | humanizePercentage }}"

      # HITL SLA
      - alert: HITLSlaBreach
        expr: increase(cerniq_hitl_sla_breach_total[1h]) > 0
        labels:
          severity: warning
        annotations:
          summary: "HITL SLA breach detected"
          description: "{{ $value }} tasks breached SLA in the last hour"

      - alert: HITLBacklog
        expr: |
          count(approval_tasks{status="pending"}) > 100
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "HITL backlog growing"
          description: "{{ $value }} pending approval tasks"

      # Pipeline stalls
      - alert: EnrichmentStalled
        expr: |
          increase(cerniq_silver_enrichment_duration_seconds_count[30m]) == 0
          AND cerniq_worker_queue_depth{queue=~".*enrich.*",state="waiting"} > 0
        for: 15m
        labels:
          severity: critical
        annotations:
          summary: "Enrichment pipeline stalled"
          description: "No enrichments processed in 30 minutes with {{ $value }} jobs waiting"

      # Worker health
      - alert: WorkerDown
        expr: up{job="cerniq-workers"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Worker instance down"
          description: "Worker {{ $labels.instance }} is not responding"

      - alert: HighJobFailureRate
        expr: |
          rate(cerniq_worker_jobs_processed_total{status="failed"}[10m])
          / rate(cerniq_worker_jobs_processed_total[10m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High job failure rate"
          description: "Queue {{ $labels.queue }} failure rate is {{ $value | humanizePercentage }}"

  - name: etapa1-database
    rules:
      - alert: PostgresHighConnections
        expr: pg_stat_activity_count > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High PostgreSQL connections"
          description: "{{ $value }} active connections"

      - alert: SlowQueries
        expr: pg_stat_statements_mean_time_seconds > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow queries detected"
          description: "Mean query time is {{ $value }}s"
```

---

# 5. INCIDENT RESPONSE

## 5.1 Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **SEV1** | Complete outage | 15 min | Database down, all workers crashed |
| **SEV2** | Major degradation | 1 hour | >50% enrichment failures, HITL completely stalled |
| **SEV3** | Minor degradation | 4 hours | Single API source down, slow processing |
| **SEV4** | Cosmetic/minor | 24 hours | Dashboard issues, logging gaps |

## 5.2 Incident Response Template

```markdown
# Incident Report: [INCIDENT_ID]

## Summary
- **Severity:** SEV[1-4]
- **Status:** [Active/Mitigated/Resolved]
- **Start Time:** [timestamp]
- **End Time:** [timestamp]
- **Duration:** [duration]
- **Affected Services:** [list]

## Timeline
| Time | Event | Actor |
|------|-------|-------|
| HH:MM | Alert triggered | System |
| HH:MM | On-call acknowledged | [name] |
| HH:MM | Root cause identified | [name] |
| HH:MM | Fix deployed | [name] |
| HH:MM | Incident resolved | [name] |

## Root Cause
[Detailed description]

## Impact
- [X] bronze contacts affected
- [Y] silver companies delayed
- [Z] approval tasks breached SLA

## Resolution
[Steps taken to resolve]

## Action Items
- [ ] [Action item 1]
- [ ] [Action item 2]

## Lessons Learned
[What we learned and how to prevent recurrence]
```

## 5.3 Escalation Matrix

| Time Elapsed | Action |
|--------------|--------|
| 0 min | Alert fired, on-call paged |
| 15 min (SEV1) | Escalate to team lead |
| 30 min (SEV1) | Escalate to engineering manager |
| 1 hour (SEV1) | Executive notification |
| 1 hour (SEV2) | Escalate to team lead |
| 4 hours (SEV2) | Escalate to engineering manager |

---

# 6. CAPACITY PLANNING

## 6.1 Current Capacity Metrics

```sql
-- Daily ingestion capacity
SELECT 
  DATE(created_at) as date,
  COUNT(*) as contacts_ingested,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_seconds
FROM bronze_contacts
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Enrichment throughput
SELECT 
  source,
  DATE(created_at) as date,
  COUNT(*) as enrichments,
  AVG(duration_ms) as avg_duration_ms
FROM silver_enrichment_log
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY source, DATE(created_at)
ORDER BY date DESC, source;

-- HITL capacity
SELECT 
  DATE(created_at) as date,
  COUNT(*) as tasks_created,
  COUNT(*) FILTER (WHERE decided_at IS NOT NULL) as tasks_resolved,
  AVG(EXTRACT(EPOCH FROM (decided_at - created_at))/3600) 
    FILTER (WHERE decided_at IS NOT NULL) as avg_resolution_hours
FROM approval_tasks
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 6.2 Scaling Thresholds

| Metric | Warning | Critical | Scale Action |
|--------|---------|----------|--------------|
| Queue depth (waiting) | > 1000 | > 5000 | Add workers |
| Processing latency | > 5 min | > 15 min | Add workers |
| Database connections | > 60% | > 80% | Connection pooling |
| Memory usage | > 70% | > 85% | Add RAM |
| Disk usage | > 70% | > 85% | Archive data |

---

**Document generat:** 15 Ianuarie 2026
**Conformitate:** Master Spec v1.2
