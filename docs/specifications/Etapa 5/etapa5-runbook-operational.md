# CERNIQ.APP — ETAPA 5: RUNBOOK OPERAȚIONAL
## Operations Guide pentru Nurturing Agentic
### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. Health Checks

### 1.1 Service Health Endpoints

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| API Server | `GET /health` | `{"status": "healthy"}` |
| Redis | `GET /health/redis` | `{"connected": true}` |
| PostgreSQL | `GET /health/db` | `{"connected": true}` |
| Python Graph | `GET /graph/health` | `{"status": "ok"}` |
| LLM Service | `GET /health/llm` | `{"available": true}` |

### 1.2 Queue Health

```bash
# Check all Etapa 5 queues
curl -s http://localhost:3000/api/admin/queues/etapa5 | jq '.queues[] | {name, waiting, active, failed}'

# Expected output:
# lifecycle: waiting < 100, failed = 0
# churn: waiting < 50, failed < 5
# sentiment: waiting < 200, failed < 10
# geospatial: waiting < 20, failed = 0
# graph: waiting < 5, failed = 0
# referral: waiting < 50, failed < 5
# winback: waiting < 30, failed < 3
# association: waiting < 10, failed = 0
# feedback: waiting < 100, failed < 5
# content: waiting < 200, failed < 10
# alerts: waiting < 10, failed = 0
# compliance: waiting < 20, failed = 0
# hitl: waiting < 50, failed = 0
```

### 1.3 Cron Jobs Status

```bash
# Verify cron jobs running
cat > /tmp/check_crons.sh << 'EOF'
#!/bin/bash
echo "=== Checking Etapa 5 Cron Jobs ==="

# Check last execution times
psql -c "
SELECT 
  job_name,
  last_run_at,
  next_run_at,
  status,
  CASE 
    WHEN last_run_at < NOW() - INTERVAL '2 days' THEN 'STALE'
    ELSE 'OK'
  END as health
FROM cron_job_status 
WHERE job_name LIKE 'e5_%'
ORDER BY next_run_at;
"
EOF
chmod +x /tmp/check_crons.sh
```

---

## 2. Common Operations

### 2.1 Manual State Transition

```bash
# Force client to specific state (emergency use only)
curl -X PATCH "http://localhost:3000/api/v1/nurturing/clients/{clientId}/state" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "newState": "AT_RISK",
    "reason": "Manual intervention by ops team",
    "bypassRules": true
  }'
```

### 2.2 Re-process Churn Score

```bash
# Recalculate churn score for specific client
curl -X POST "http://localhost:3000/api/v1/nurturing/churn/recalculate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "clientId": "uuid-here"
  }'
```

### 2.3 Trigger Graph Rebuild

```bash
# Force graph rebuild (off-hours only)
curl -X POST "http://localhost:3000/api/v1/nurturing/graph/rebuild" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "scope": "FULL",
    "reason": "Manual rebuild requested"
  }'
```

### 2.4 Cancel Win-Back Campaign

```bash
# Cancel active campaign
curl -X POST "http://localhost:3000/api/v1/nurturing/winback/campaigns/{campaignId}/cancel" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "reason": "Client requested no contact"
  }'
```

---

## 3. Troubleshooting

### 3.1 High Churn Score Queue Backlog

**Symptoms**: `churn` queue waiting > 100

**Diagnosis**:
```bash
# Check worker status
curl http://localhost:3000/api/admin/workers/churn | jq '.workers'

# Check recent errors
psql -c "SELECT * FROM worker_errors WHERE queue = 'churn' ORDER BY created_at DESC LIMIT 10"
```

**Resolution**:
1. Scale churn workers: `docker-compose scale churn-worker=3`
2. Check LLM rate limits if sentiment backlog
3. Review recent deployments

### 3.2 Sentiment Analysis Failures

**Symptoms**: `sentiment` queue failed > 10

**Diagnosis**:
```bash
# Check LLM API status
curl http://localhost:3000/health/llm

# Check rate limit status
redis-cli GET "anthropic:rate_limit:remaining"

# Review failed jobs
curl http://localhost:3000/api/admin/queues/sentiment/failed | jq '.[0:5]'
```

**Resolution**:
1. If rate limited: Wait for reset, reduce concurrency
2. If API down: Enable fallback (rule-based)
3. If bad responses: Check prompt template

### 3.3 PostGIS Query Timeouts

**Symptoms**: `geospatial` queue timeouts

**Diagnosis**:
```bash
# Check active queries
psql -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
         FROM pg_stat_activity 
         WHERE state = 'active' AND query LIKE '%ST_%'
         ORDER BY duration DESC LIMIT 5"
```

**Resolution**:
1. Kill long queries: `SELECT pg_terminate_backend(pid)`
2. Check GiST index health: `REINDEX INDEX idx_*_geo`
3. Reduce proximity radius

### 3.4 HITL SLA Breaches

**Symptoms**: Multiple SLA breaches in dashboard

> **NOTĂ:** HITL folosește tabela unificată `approval_tasks`. Filtrați cu `pipeline_stage='E5'` pentru Etapa 5.

**Diagnosis**:
```bash
psql -c "
SELECT 
  approval_type,
  COUNT(*) as breached,
  AVG(EXTRACT(EPOCH FROM (decided_at - due_at))/3600) as avg_hours_over
FROM approval_tasks
WHERE pipeline_stage = 'E5'
  AND decided_at > due_at  -- SLA breached = resolved after deadline
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY approval_type
"
```

**Resolution**:
1. Review assignment rules in `approval_type_configs`
2. Add more operators
3. Adjust SLA times in `approval_type_configs` if consistently breached

---

## 4. Monitoring Alerts

### 4.1 Alert Configuration (Grafana)

```yaml
# alerts/etapa5-alerts.yaml
groups:
  - name: etapa5-nurturing
    rules:
      - alert: HighChurnQueueBacklog
        expr: bullmq_queue_waiting{queue="churn"} > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Churn queue backlog high"
          
      - alert: SentimentWorkerDown
        expr: bullmq_workers_active{queue="sentiment"} == 0
        for: 5m
        labels:
          severity: critical
          
      - alert: HITLSLABreaches
        expr: rate(hitl_sla_breached_total[1h]) > 0.1
        for: 30m
        labels:
          severity: warning
          
      - alert: ChurnRiskCritical
        expr: count(nurturing_client_churn_score > 80) > 10
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Multiple clients at critical churn risk"
          
      - alert: GraphBuildFailed
        expr: increase(graph_build_failures_total[24h]) > 0
        labels:
          severity: warning
```

### 4.2 Dashboard Metrics

```promql
# Key metrics to monitor

# Queue health
sum(bullmq_queue_waiting{queue=~"lifecycle|churn|sentiment|referral"}) by (queue)

# Worker throughput
sum(rate(bullmq_jobs_completed_total{queue=~".*"}[5m])) by (queue)

# Churn distribution
histogram_quantile(0.95, nurturing_client_churn_score_bucket)

# HITL performance
avg(hitl_task_resolution_time_seconds) by (task_type)

# Referral conversion
sum(referral_status{status="CONVERTED"}) / sum(referral_status) * 100

# NPS trend
avg(nps_score) by (nps_category)
```

---

## 5. Maintenance Procedures

### 5.1 Weekly Maintenance (Sunday 02:00)

```bash
#!/bin/bash
# weekly-maintenance-e5.sh

echo "=== Etapa 5 Weekly Maintenance ==="

# 1. Vacuum analyze geospatial tables
psql -c "VACUUM ANALYZE gold_proximity_scores, gold_clusters, gold_entity_relationships"

# 2. Refresh materialized views
psql -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cluster_territories"

# 3. Clean old audit logs (> 90 days)
psql -c "DELETE FROM gold_nurturing_actions WHERE created_at < NOW() - INTERVAL '90 days'"

# 4. Clean expired referrals
psql -c "UPDATE gold_referrals SET status = 'EXPIRED' WHERE expires_at < NOW() AND status = 'PENDING_CONSENT'"

# 5. Archive resolved HITL tasks (Unified approval_tasks)
# NOTĂ: Arhivarea task-urilor HITL se face centralizat pentru toate etapele.
# Pentru E5-specific, filtrăm cu pipeline_stage='E5'.
psql -c "
INSERT INTO approval_tasks_archive 
SELECT * FROM approval_tasks 
WHERE pipeline_stage = 'E5'
  AND status IN ('approved', 'rejected', 'expired')
  AND decided_at < NOW() - INTERVAL '30 days'
"

psql -c "
DELETE FROM approval_tasks 
WHERE pipeline_stage = 'E5'
  AND status IN ('approved', 'rejected', 'expired')
  AND decided_at < NOW() - INTERVAL '30 days'
"

echo "=== Maintenance Complete ==="
```

### 5.2 Monthly Maintenance (1st of month)

```bash
#!/bin/bash
# monthly-maintenance-e5.sh

echo "=== Etapa 5 Monthly Maintenance ==="

# 1. Reindex spatial indexes
psql -c "REINDEX INDEX CONCURRENTLY idx_clusters_territory"
psql -c "REINDEX INDEX CONCURRENTLY idx_proximity_anchor_geo"

# 2. Update statistics
psql -c "ANALYZE gold_nurturing_state, gold_churn_signals, gold_referrals"

# 3. Partition management for actions table
NEXT_MONTH=$(date -d "+1 month" +%Y_%m)
psql -c "
CREATE TABLE IF NOT EXISTS gold_nurturing_actions_${NEXT_MONTH} 
PARTITION OF gold_nurturing_actions_partitioned 
FOR VALUES FROM ('$(date -d "+1 month" +%Y-%m-01)') 
TO ('$(date -d "+2 month" +%Y-%m-01)')
"

# 4. Regenerate KOL scores
curl -X POST http://localhost:3000/api/v1/nurturing/kol/identify \
  -H "Authorization: Bearer $ADMIN_TOKEN"

echo "=== Monthly Maintenance Complete ==="
```

---

## 6. Disaster Recovery

### 6.1 Restore Nurturing State

```bash
# Restore from backup
borg extract /backup/repo::etapa5-{date} home/claude/db-dumps/

# Restore specific tables
pg_restore -d cerniq -t gold_nurturing_state backup.dump
pg_restore -d cerniq -t gold_churn_signals backup.dump
pg_restore -d cerniq -t gold_referrals backup.dump
```

### 6.2 Queue Recovery

```bash
# Clear failed jobs and retry
curl -X POST http://localhost:3000/api/admin/queues/churn/retry-all

# Clear stuck jobs
curl -X POST http://localhost:3000/api/admin/queues/churn/clean \
  -d '{"grace": 3600, "status": "stalled"}'
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
