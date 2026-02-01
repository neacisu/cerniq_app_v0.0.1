# CERNIQ.APP — ETAPA 0: RUNBOOK OPERAȚIONAL

## Proceduri Standard de Operare pentru Infrastructură

### Versiunea 1.0 | 15 Ianuarie 2026

---

**DOCUMENT STATUS:** NORMATIV — Subordonat Master Spec v1.2  
**SCOPE:** Proceduri operaționale pentru startup, shutdown, troubleshooting  
**AUDIENȚĂ:** DevOps, Developers, On-call engineers

---

## CUPRINS

1. [Startup Procedures](#1-startup-procedures)
2. [Shutdown Procedures](#2-shutdown-procedures)
3. [Daily Operations](#3-daily-operations)
4. [Troubleshooting Guide](#4-troubleshooting-guide)
5. [Emergency Procedures](#5-emergency-procedures)
6. [Maintenance Windows](#6-maintenance-windows)

---

## 1. STARTUP PROCEDURES

## 1.1 Full Stack Startup (Cold Start)

Utilizează această procedură după un restart complet al serverului sau pentru prima pornire.

```bash
#!/bin/bash
# Full Stack Startup Script
# Location: /var/www/CerniqAPP/infra/scripts/startup.sh

set -e
cd /var/www/CerniqAPP/infra/docker

echo "=== CERNIQ.APP FULL STACK STARTUP ==="
echo "Started at: $(date)"

# 1. Verifică Docker daemon
echo "[1/7] Checking Docker daemon..."
if ! systemctl is-active --quiet docker; then
    echo "Starting Docker daemon..."
    sudo systemctl start docker
    sleep 5
fi
docker info > /dev/null 2>&1 || { echo "Docker not responding"; exit 1; }
echo "✓ Docker OK"

# 2. Verifică rețele Docker
echo "[2/7] Checking Docker networks..."
for net in cerniq_public cerniq_backend cerniq_data; do
    if ! docker network inspect $net > /dev/null 2>&1; then
        echo "ERROR: Network $net missing! Run network setup first."
        exit 1
    fi
done
echo "✓ Networks OK"

# 3. Pornește PostgreSQL (PRIMUL - alte servicii depind de el)
echo "[3/7] Starting PostgreSQL..."
docker compose up -d postgres
echo "Waiting for PostgreSQL to be healthy..."
timeout 120 bash -c 'until docker inspect --format="{{.State.Health.Status}}" cerniq-postgres 2>/dev/null | grep -q healthy; do sleep 2; done'
echo "✓ PostgreSQL healthy"

# 4. Pornește Redis
echo "[4/7] Starting Redis..."
docker compose up -d redis
echo "Waiting for Redis to be healthy..."
timeout 60 bash -c 'until docker inspect --format="{{.State.Health.Status}}" cerniq-redis 2>/dev/null | grep -q healthy; do sleep 2; done'
echo "✓ Redis healthy"

# 5. Pornește Observability Stack
echo "[5/7] Starting Observability (ClickHouse, SigNoz, OTel)..."
docker compose up -d clickhouse
sleep 10
docker compose up -d signoz otel-collector
echo "✓ Observability started"

# 6. Pornește Traefik
echo "[6/7] Starting Traefik..."
docker compose up -d traefik
sleep 5
echo "✓ Traefik started"

# 7. Pornește API și Workers
echo "[7/7] Starting API and Workers..."
docker compose up -d api
# docker compose up -d workers  # Uncomment when workers are ready
echo "✓ API started"

# Verificare finală
echo ""
echo "=== STARTUP COMPLETE ==="
echo "Finished at: $(date)"
docker compose ps
```

## 1.2 Startup Individual Services

### PostgreSQL Only

```bash
cd /var/www/CerniqAPP/infra/docker
docker compose up -d postgres
docker compose logs -f postgres  # Monitor until "ready to accept connections"
```

### Redis Only

```bash
cd /var/www/CerniqAPP/infra/docker
docker compose up -d redis
docker exec cerniq-redis redis-cli ping  # Should return PONG
```

### API Only (requires PostgreSQL + Redis)

```bash
cd /var/www/CerniqAPP/infra/docker
docker compose up -d api
curl http://localhost:64000/health/ready  # Check health
```

## 1.3 Post-Startup Verification Checklist

```bash
#!/bin/bash
# Post-Startup Verification
# Run after startup to ensure everything is working

echo "=== POST-STARTUP VERIFICATION ==="

# 1. All containers running
echo "Checking containers..."
EXPECTED_CONTAINERS="cerniq-postgres cerniq-redis cerniq-traefik cerniq-signoz cerniq-otel-collector"
for container in $EXPECTED_CONTAINERS; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        echo "✓ $container running"
    else
        echo "✗ $container NOT RUNNING"
    fi
done

# 2. Health checks
echo ""
echo "Checking health endpoints..."
curl -s http://localhost:64000/health/live | jq .
curl -s http://localhost:64000/health/ready | jq .

# 3. Database connectivity
echo ""
echo "Checking PostgreSQL..."
docker exec cerniq-postgres pg_isready -U cerniq -d cerniq_production

# 4. Redis connectivity
echo ""
echo "Checking Redis..."
docker exec cerniq-redis redis-cli ping

# 5. Traefik dashboard (if enabled)
echo ""
echo "Checking Traefik..."
curl -k -s -H "Host: traefik.cerniq.app" https://localhost:64443/api/overview | jq .entryPoints

echo ""
echo "=== VERIFICATION COMPLETE ==="
```

---

## 2. SHUTDOWN PROCEDURES

## 2.1 Graceful Full Stack Shutdown

```bash
#!/bin/bash
# Graceful Full Stack Shutdown
# Location: /var/www/CerniqAPP/infra/scripts/shutdown.sh

set -e
cd /var/www/CerniqAPP/infra/docker

echo "=== CERNIQ.APP GRACEFUL SHUTDOWN ==="
echo "Started at: $(date)"

# 1. Stop API first (stops accepting new requests)
echo "[1/5] Stopping API..."
docker compose stop api
echo "Waiting 30s for in-flight requests..."
sleep 30
echo "✓ API stopped"

# 2. Stop Workers (let them finish current jobs)
echo "[2/5] Stopping Workers..."
# docker compose stop workers
echo "Waiting 60s for jobs to complete..."
sleep 60
echo "✓ Workers stopped"

# 3. Stop Traefik
echo "[3/5] Stopping Traefik..."
docker compose stop traefik
echo "✓ Traefik stopped"

# 4. Stop Observability
echo "[4/5] Stopping Observability..."
docker compose stop otel-collector signoz clickhouse
echo "✓ Observability stopped"

# 5. Stop Data stores LAST
echo "[5/5] Stopping PostgreSQL and Redis..."
docker compose stop redis
docker compose stop postgres
echo "✓ Data stores stopped"

echo ""
echo "=== SHUTDOWN COMPLETE ==="
echo "Finished at: $(date)"
docker compose ps
```

## 2.2 Emergency Shutdown (Immediate)

**ATENȚIE:** Utilizează doar în caz de urgență! Poate cauza pierderi de date.

```bash
#!/bin/bash
# Emergency Shutdown - USE WITH CAUTION
cd /var/www/CerniqAPP/infra/docker

echo "!!! EMERGENCY SHUTDOWN !!!"
echo "This will immediately stop all containers!"
read -p "Are you sure? (type 'YES' to confirm): " confirm

if [ "$confirm" = "YES" ]; then
    docker compose down --timeout 10
    echo "All containers stopped"
else
    echo "Aborted"
fi
```

## 2.3 Shutdown Individual Services

### Stop API (Graceful)

```bash
# Signal graceful shutdown
docker kill --signal=SIGTERM cerniq-api
# Wait for graceful shutdown (max 30s)
sleep 30
# Force stop if still running
docker stop cerniq-api
```

### Stop PostgreSQL (Graceful)

```bash
# Checkpoint before shutdown
docker exec cerniq-postgres psql -U cerniq -c "CHECKPOINT;"
# Stop with longer timeout for WAL flush
docker stop --time 60 cerniq-postgres
```

### Stop Redis (Graceful)

```bash
# Trigger RDB save before shutdown
docker exec cerniq-redis redis-cli BGSAVE
sleep 5
docker stop cerniq-redis
```

---

## 3. DAILY OPERATIONS

## 3.1 Daily Health Check Script

```bash
#!/bin/bash
# Daily Health Check - Run via cron at 09:00
# Location: /var/www/CerniqAPP/infra/scripts/daily-health-check.sh

LOG_FILE="/var/log/cerniq/daily-health-$(date +%Y%m%d).log"
ALERT_EMAIL="alerts@cerniq.app"

exec > >(tee -a "$LOG_FILE") 2>&1
echo "=== DAILY HEALTH CHECK $(date) ==="

ISSUES=()

# 1. Container Status
echo "Checking containers..."
REQUIRED="cerniq-postgres cerniq-redis cerniq-traefik cerniq-api"
for c in $REQUIRED; do
    STATUS=$(docker inspect --format='{{.State.Status}}' $c 2>/dev/null || echo "missing")
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $c 2>/dev/null || echo "none")
    if [ "$STATUS" != "running" ]; then
        ISSUES+=("Container $c is $STATUS")
    elif [ "$HEALTH" = "unhealthy" ]; then
        ISSUES+=("Container $c is unhealthy")
    fi
    echo "$c: status=$STATUS health=$HEALTH"
done

# 2. Disk Usage
echo ""
echo "Checking disk usage..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 80 ]; then
    ISSUES+=("Disk usage at ${DISK_USAGE}%")
fi
echo "Disk: ${DISK_USAGE}%"

# 3. PostgreSQL
echo ""
echo "Checking PostgreSQL..."
PG_CONNECTIONS=$(docker exec cerniq-postgres psql -U cerniq -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')
PG_SIZE=$(docker exec cerniq-postgres psql -U cerniq -t -c "SELECT pg_size_pretty(pg_database_size('cerniq_production'));" 2>/dev/null | tr -d ' ')
echo "PostgreSQL connections: $PG_CONNECTIONS"
echo "PostgreSQL size: $PG_SIZE"

# 4. Redis Memory
echo ""
echo "Checking Redis..."
REDIS_MEM=$(docker exec cerniq-redis redis-cli INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
echo "Redis memory: $REDIS_MEM"

# 5. BullMQ Queue Depths
echo ""
echo "Checking BullMQ queues..."
docker exec cerniq-redis redis-cli KEYS "bull:*:waiting" | while read key; do
    DEPTH=$(docker exec cerniq-redis redis-cli LLEN "$key" 2>/dev/null)
    echo "$key: $DEPTH jobs"
    if [ "$DEPTH" -gt 1000 ]; then
        ISSUES+=("Queue $key has $DEPTH pending jobs")
    fi
done

# Report Issues
echo ""
if [ ${#ISSUES[@]} -gt 0 ]; then
    echo "!!! ISSUES FOUND !!!"
    for issue in "${ISSUES[@]}"; do
        echo "- $issue"
    done
    # Send alert email
    echo "${ISSUES[*]}" | mail -s "CERNIQ Daily Health: Issues Found" $ALERT_EMAIL
else
    echo "✓ All checks passed"
fi

echo "=== HEALTH CHECK COMPLETE ==="
```

## 3.2 Log Rotation

```bash
# /etc/logrotate.d/cerniq
/var/log/cerniq/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
```

## 3.3 Database Maintenance

### Weekly VACUUM ANALYZE

```bash
#!/bin/bash
# Run weekly via cron: 0 3 * * 0 (Sunday 3 AM)
docker exec cerniq-postgres psql -U cerniq -d cerniq_production -c "VACUUM ANALYZE;"
```

### Check for Long-Running Queries

```bash
docker exec cerniq-postgres psql -U cerniq -d cerniq_production -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
AND state != 'idle'
ORDER BY duration DESC;
"
```

---

## 4. TROUBLESHOOTING GUIDE

## 4.1 Container Won't Start

### Symptom: Container exits immediately

```bash
# Check logs for error
docker compose logs <service_name> --tail 100

# Check if port is in use
ss -tlnp | grep <port>

# Check if volume has correct permissions
ls -la /var/lib/docker/volumes/

# Check resource limits
docker stats --no-stream
```

### Symptom: Container stuck in "starting"

```bash
# Check health check command
docker inspect <container> | jq '.[0].State.Health'

# Increase start_period if needed
# Edit docker-compose.yml: start_period: 120s
```

## 4.2 PostgreSQL Issues

### Cannot Connect to Database

```bash
# 1. Check if container is running
docker ps | grep postgres

# 2. Check logs for errors
docker compose logs postgres --tail 50

# 3. Verify network connectivity
docker exec cerniq-api ping -c 3 postgres

# 4. Check max_connections
docker exec cerniq-postgres psql -U cerniq -c "SHOW max_connections;"
docker exec cerniq-postgres psql -U cerniq -c "SELECT count(*) FROM pg_stat_activity;"

# 5. Check pg_hba.conf if authentication fails
docker exec cerniq-postgres cat /var/lib/postgresql/data/pgdata/pg_hba.conf
```

### Database is Slow

```bash
# 1. Check for locks
docker exec cerniq-postgres psql -U cerniq -d cerniq_production -c "
SELECT blocked_locks.pid AS blocked_pid,
       blocking_locks.pid AS blocking_pid,
       blocked_activity.usename AS blocked_user,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
"

# 2. Check for missing indexes
docker exec cerniq-postgres psql -U cerniq -d cerniq_production -c "
SELECT schemaname, relname, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > 1000 AND idx_scan < 100
ORDER BY seq_scan DESC;
"

# 3. Run VACUUM if needed
docker exec cerniq-postgres psql -U cerniq -d cerniq_production -c "VACUUM ANALYZE;"
```

### Out of Disk Space

```bash
# 1. Check database size
docker exec cerniq-postgres psql -U cerniq -c "
SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname))
FROM pg_database ORDER BY pg_database_size(pg_database.datname) DESC;
"

# 2. Check table sizes
docker exec cerniq-postgres psql -U cerniq -d cerniq_production -c "
SELECT schemaname, relname, pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname))
FROM pg_stat_user_tables ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC LIMIT 10;
"

# 3. Clean up old WAL files (CAREFUL!)
docker exec cerniq-postgres psql -U cerniq -c "SELECT pg_switch_wal();"
# Then prune old files from pg_wal
```

## 4.3 Redis Issues

### Redis OOM (Out of Memory)

```bash
# 1. Check memory usage
docker exec cerniq-redis redis-cli INFO memory

# 2. Check what's using memory
docker exec cerniq-redis redis-cli --bigkeys

# 3. Check queue sizes
docker exec cerniq-redis redis-cli KEYS "bull:*" | head -20

# 4. Clear completed jobs (if too many)
docker exec cerniq-redis redis-cli KEYS "bull:*:completed" | xargs -r docker exec -i cerniq-redis redis-cli DEL
```

### BullMQ Jobs Stuck

```bash
# 1. Check failed jobs
docker exec cerniq-redis redis-cli LRANGE "bull:<queue>:failed" 0 10

# 2. Check stalled jobs
docker exec cerniq-redis redis-cli ZRANGE "bull:<queue>:stalled" 0 -1

# 3. Retry failed jobs (via BullMQ API)
# Or manually move from failed to waiting:
docker exec cerniq-redis redis-cli RPOPLPUSH "bull:<queue>:failed" "bull:<queue>:waiting"
```

## 4.4 Traefik Issues

### SSL Certificate Not Renewing

```bash
# 1. Check acme.json permissions
ls -la /var/www/CerniqAPP/infra/docker/acme.json
# Must be 600

# 2. Check Traefik logs for ACME errors
docker compose logs traefik | grep -i acme

# 3. Force certificate renewal
# Delete certificate from acme.json and restart Traefik
docker compose restart traefik
```

### Routes Not Working

```bash
# 1. Check Traefik dashboard
curl -k -H "Host: traefik.cerniq.app" https://localhost:64443/api/http/routers | jq .

# 2. Check if service is discovered
curl -k -H "Host: traefik.cerniq.app" https://localhost:64443/api/http/services | jq .

# 3. Verify labels on container
docker inspect <container> | jq '.[0].Config.Labels'
```

## 4.5 Network Issues

### Containers Cannot Communicate

```bash
# 1. Check if on same network
docker network inspect cerniq_backend

# 2. Test DNS resolution
docker exec cerniq-api nslookup postgres
docker exec cerniq-api nslookup redis

# 3. Test connectivity
docker exec cerniq-api ping -c 3 postgres
docker exec cerniq-api nc -zv redis 64039
```

---

## 5. EMERGENCY PROCEDURES

## 5.1 Database Corruption Recovery

```bash
#!/bin/bash
# EMERGENCY: Database Corruption Recovery
# Run only when database is corrupted!

echo "!!! DATABASE CORRUPTION RECOVERY !!!"
echo "This will restore from the latest backup."
read -p "Continue? (type 'RESTORE' to confirm): " confirm

if [ "$confirm" != "RESTORE" ]; then
    echo "Aborted"
    exit 1
fi

# 1. Stop all services
docker compose down

# 2. Backup corrupted data (just in case)
sudo mv /var/lib/docker/volumes/cerniq_postgres_data /var/lib/docker/volumes/cerniq_postgres_data_corrupted_$(date +%Y%m%d)

# 3. Restore from BorgBackup
export BORG_REPO="ssh://uXXXXXX@uXXXXXX.your-storagebox.de:22/./borg-repo"
export BORG_PASSPHRASE="<your-passphrase>"

# List available backups
borg list $BORG_REPO

# Restore latest (replace with specific archive if needed)
borg extract $BORG_REPO::$(borg list $BORG_REPO --last 1 --format '{archive}') var/backups/databases/

# 4. Restore PostgreSQL
docker compose up -d postgres
sleep 30
docker exec -i cerniq-postgres psql -U postgres < /var/backups/databases/pg_dumpall.sql

# 5. Verify
docker exec cerniq-postgres psql -U cerniq -d cerniq_production -c "SELECT count(*) FROM gold_companies;"

echo "Recovery complete. Verify data integrity before starting other services."
```

## 5.2 Complete System Recovery

```bash
#!/bin/bash
# EMERGENCY: Complete System Recovery from Scratch
# Use when server needs to be rebuilt

echo "=== COMPLETE SYSTEM RECOVERY ==="

# Prerequisites:
# - Fresh Ubuntu 24.04 server
# - SSH access to Hetzner Storage Box
# - BorgBackup passphrase

# 1. Install Docker (see F0.1.1.T001)
# 2. Configure daemon.json (see F0.1.1.T002)
# 3. Create networks (see F0.1.2.T001)

# 4. Clone/restore application code
# If git available:
git clone <repo-url> /var/www/CerniqAPP

# If restoring from backup:
export BORG_REPO="ssh://uXXXXXX@uXXXXXX.your-storagebox.de:22/./borg-repo"
borg extract $BORG_REPO::<archive> var/www/CerniqAPP

# 5. Restore secrets
mkdir -p /var/www/CerniqAPP/secrets
# Manually restore secrets from secure storage

# 6. Restore databases (see 5.1)

# 7. Start services (see 1.1)
```

## 5.3 Security Incident Response

```bash
#!/bin/bash
# EMERGENCY: Security Incident Response

echo "!!! SECURITY INCIDENT RESPONSE !!!"

# 1. Isolate the system
echo "Blocking external traffic..."
sudo ufw default deny incoming
sudo ufw allow from <your-ip> to any port 22

# 2. Capture evidence
echo "Capturing logs..."
mkdir -p /var/evidence/$(date +%Y%m%d)
docker compose logs > /var/evidence/$(date +%Y%m%d)/docker-logs.txt
cp /var/log/auth.log /var/evidence/$(date +%Y%m%d)/
cp /var/log/syslog /var/evidence/$(date +%Y%m%d)/

# 3. Stop compromised services
echo "Stopping services..."
docker compose down

# 4. Notify team
echo "Sending notification..."
# mail -s "SECURITY INCIDENT" team@cerniq.app < /dev/null

echo "System isolated. Begin forensic analysis."
```

---

## 6. MAINTENANCE WINDOWS

## 6.1 Scheduled Maintenance Template

```text
MAINTENANCE WINDOW TEMPLATE
===========================

Date: YYYY-MM-DD
Time: HH:MM - HH:MM UTC
Duration: X hours
Type: [Planned/Emergency]

SCOPE:
- [ ] PostgreSQL upgrade
- [ ] Redis update
- [ ] API deployment
- [ ] Infrastructure changes

PRE-MAINTENANCE:
- [ ] Notify stakeholders 48h in advance
- [ ] Create fresh backup
- [ ] Verify rollback procedure
- [ ] Prepare monitoring dashboards

DURING MAINTENANCE:
- [ ] Enable maintenance page
- [ ] Execute changes
- [ ] Run verification tests
- [ ] Monitor for issues

POST-MAINTENANCE:
- [ ] Disable maintenance page
- [ ] Run health checks
- [ ] Monitor metrics for 1 hour
- [ ] Send completion notification

ROLLBACK TRIGGERS:
- Health check failures
- Error rate > 5%
- Response time > 2s
- Data integrity issues
```

## 6.2 Maintenance Commands

### Enable Maintenance Mode

```bash
# Route all traffic to maintenance page via Traefik
docker exec cerniq-traefik touch /etc/traefik/maintenance.flag
# Or update Traefik config to redirect to maintenance page
```

### Disable Maintenance Mode

```bash
docker exec cerniq-traefik rm /etc/traefik/maintenance.flag
```

---

**Document generat:** 15 Ianuarie 2026  
**Sursă de adevăr:** Master Spec v1.2
