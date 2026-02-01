# CERNIQ.APP — ETAPA 4: RUNBOOK OPERATIONAL
## Ghid Operațional pentru Monitorizare Post-Vânzare
### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [Daily Operations](#1-daily)
2. [Health Checks](#2-health)
3. [Common Issues](#3-issues)
4. [Emergency Procedures](#4-emergency)
5. [Monitoring Commands](#5-commands)

---

## 1. Daily Operations {#1-daily}

### Morning Checklist (09:00)
```bash
# 1. Check worker health
curl http://localhost:64000/health/workers

# 2. Check queue depths
docker exec cerniq-redis redis-cli -a $REDIS_PASSWORD \
  KEYS "bull:*:waiting" | xargs -I {} redis-cli -a $REDIS_PASSWORD LLEN {}

# 3. Check overnight errors
docker logs cerniq-workers --since 12h 2>&1 | grep -i error | tail -50

# 4. Check Revolut balance
curl -s http://localhost:64000/api/v1/monitoring/revolut/balance

# 5. Check pending HITL tasks
curl -s http://localhost:64000/api/v1/monitoring/hitl/queue?status=PENDING
```

### Evening Checklist (18:00)
```bash
# 1. Verify daily summary email sent
docker logs cerniq-workers --since 1h | grep "daily:summary"

# 2. Check reconciliation status
curl -s http://localhost:64000/api/v1/monitoring/payments/reconciliation/summary

# 3. Check pending shipments
curl -s http://localhost:64000/api/v1/monitoring/shipments?status=PENDING_PICKUP
```

---

## 2. Health Checks {#2-health}

### Worker Health
```bash
# All workers status
curl http://localhost:64000/health/workers | jq

# Specific queue depth
docker exec cerniq-redis redis-cli -a $REDIS_PASSWORD \
  LLEN bull:revolut:webhook:ingest:waiting

# Failed jobs count
docker exec cerniq-redis redis-cli -a $REDIS_PASSWORD \
  ZCARD bull:revolut:webhook:ingest:failed
```

### External Services Health
```bash
# Revolut API
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $REVOLUT_API_KEY" \
  https://b2b.revolut.com/api/1.0/accounts

# Termene.ro
curl -s -o /dev/null -w "%{http_code}" \
  "https://api.termene.ro/api/v1/status"

# Sameday
curl -s -o /dev/null -w "%{http_code}" \
  -H "X-API-KEY: $SAMEDAY_API_KEY" \
  https://api.sameday.ro/api/client/profile
```

---

## 3. Common Issues {#3-issues}

### Issue: Webhook Not Processing
```bash
# Check webhook endpoint accessibility
curl -X POST http://localhost:64000/webhooks/revolut/business \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check queue
docker exec cerniq-redis redis-cli -a $REDIS_PASSWORD \
  LRANGE bull:revolut:webhook:ingest:waiting 0 -1

# Restart worker
docker compose restart cerniq-workers
```

### Issue: Payment Not Reconciled
```bash
# Find payment
psql -c "SELECT * FROM gold_payments WHERE reconciliation_status = 'UNMATCHED' ORDER BY created_at DESC LIMIT 10;"

# Check fuzzy match candidates
curl http://localhost:64000/api/v1/monitoring/payments/{paymentId}/candidates

# Force reconciliation
curl -X POST http://localhost:64000/api/v1/monitoring/payments/{paymentId}/reconcile \
  -H "Content-Type: application/json" \
  -d '{"invoiceId": "xxx"}'
```

### Issue: Credit Score Not Updating
```bash
# Check Termene.ro cache
psql -c "SELECT cui, fetched_at, expires_at FROM gold_termene_data WHERE cui = 'XXX';"

# Force refresh
curl -X POST http://localhost:64000/api/v1/monitoring/credit/profiles/{clientId}/refresh

# Check worker logs
docker logs cerniq-workers 2>&1 | grep "credit:score:calculate" | tail -20
```

### Issue: Contract Not Generated
```bash
# Check Python service
curl http://localhost:64095/health

# Check template exists
psql -c "SELECT * FROM gold_contract_templates WHERE is_active = true;"

# Retry generation
curl -X POST http://localhost:64000/api/v1/monitoring/contracts/{contractId}/regenerate
```

### Issue: HITL Task Stuck
```bash
# Find stuck tasks
psql -c "SELECT * FROM hitl_approvals WHERE status = 'PENDING' AND sla_deadline < NOW();"

# Force escalation
curl -X POST http://localhost:64000/api/v1/monitoring/hitl/tasks/{taskId}/escalate
```

---

## 4. Emergency Procedures {#4-emergency}

### Emergency: Stop All Processing
```bash
# Pause all queues
curl -X POST http://localhost:64000/admin/queues/pause-all

# Or manually
docker exec cerniq-redis redis-cli -a $REDIS_PASSWORD \
  KEYS "bull:*" | xargs -I {} redis-cli -a $REDIS_PASSWORD \
  SET {}:paused 1
```

### Emergency: Replay Failed Jobs
```bash
# Get failed jobs
docker exec cerniq-redis redis-cli -a $REDIS_PASSWORD \
  ZRANGE bull:revolut:webhook:ingest:failed 0 -1

# Retry all failed
curl -X POST http://localhost:64000/admin/queues/revolut:webhook:ingest/retry-all
```

### Emergency: Database Rollback
```bash
# Rollback last migration
npm run db:rollback

# Restore from backup
./scripts/restore-backup.sh etapa4 2026-01-19
```

---

## 5. Monitoring Commands {#5-commands}

### Queue Monitoring
```bash
# Real-time queue stats
watch -n 5 'curl -s http://localhost:64000/health/queues | jq'

# BullMQ Dashboard
# Access: http://localhost:64000/admin/bull-board
```

### Log Analysis
```bash
# Payment processing errors
docker logs cerniq-workers 2>&1 | grep -E "payment|reconcile" | grep -i error

# Credit scoring issues
docker logs cerniq-workers 2>&1 | grep "credit:score" | tail -100

# HITL activity
docker logs cerniq-workers 2>&1 | grep "hitl" | tail -50
```

### Database Queries
```bash
# Orders by status today
psql -c "SELECT status, count(*) FROM gold_orders WHERE created_at > CURRENT_DATE GROUP BY status;"

# Payments by reconciliation status
psql -c "SELECT reconciliation_status, count(*), sum(amount) FROM gold_payments GROUP BY reconciliation_status;"

# Credit profiles by tier
psql -c "SELECT risk_tier, count(*), avg(credit_score) FROM gold_credit_profiles GROUP BY risk_tier;"
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
