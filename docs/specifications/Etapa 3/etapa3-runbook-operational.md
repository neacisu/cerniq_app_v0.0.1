# Etapa 3 - Runbook Operațional
## AI Sales Agent - Ghid Complet de Operare și Troubleshooting

**Versiune:** 1.0.0
**Ultima actualizare:** 2026-01-19
**Autor:** Cerniq Development Team
**Clasificare:** Document Operațional Intern

---

## Cuprins

1. [Introducere și Scop](#1-introducere-și-scop)
2. [Proceduri de Startup și Shutdown](#2-proceduri-de-startup-și-shutdown)
3. [Operațiuni Zilnice](#3-operațiuni-zilnice)
4. [Proceduri de Deployment](#4-proceduri-de-deployment)
5. [Troubleshooting Comun](#5-troubleshooting-comun)
6. [Proceduri de Escalare](#6-proceduri-de-escalare)
7. [Disaster Recovery](#7-disaster-recovery)
8. [Proceduri de Backup și Restore](#8-proceduri-de-backup-și-restore)
9. [Gestionarea Secretelor](#9-gestionarea-secretelor)
10. [Proceduri de Maintenance](#10-proceduri-de-maintenance)
11. [Gestionarea Incidentelor](#11-gestionarea-incidentelor)
12. [Comunicare și Notificări](#12-comunicare-și-notificări)
13. [Checklist-uri Operaționale](#13-checklist-uri-operaționale)
14. [Anexe și Referințe](#14-anexe-și-referințe)

---

## 1. Introducere și Scop

### 1.1 Scopul Documentului

Acest runbook operațional oferă instrucțiuni detaliate pentru operarea, mentenanța și troubleshooting-ul sistemului AI Sales Agent (Etapa 3). Documentul este destinat echipei de operațiuni și DevOps pentru gestionarea eficientă a platformei în producție.

### 1.2 Audiența Țintă

- **DevOps Engineers**: Responsabili pentru deployment, scaling și infrastructură
- **On-Call Engineers**: Personal de gardă pentru răspuns la incidente
- **System Administrators**: Gestionarea serverelor și serviciilor
- **Support Engineers**: Troubleshooting și asistență tehnică

### 1.3 Convenții Document

```
⚠️  ATENȚIE - Acțiune critică ce necesită verificare suplimentară
✅ CONFIRMARE - Acțiune completată cu succes
❌ EROARE - Acțiune eșuată, necesită investigare
🔄 ÎN PROGRES - Acțiune în desfășurare
📋 NOTĂ - Informație importantă de reținut
```

### 1.4 Contacte de Urgență

| Rol | Contact | Disponibilitate |
|-----|---------|-----------------|
| On-Call Primary | oncall-primary@cerniq.app | 24/7 |
| On-Call Secondary | oncall-secondary@cerniq.app | 24/7 |
| DevOps Lead | devops-lead@cerniq.app | L-V 09:00-18:00 |
| Security Team | security@cerniq.app | 24/7 |
| Management Escalation | escalation@cerniq.app | Critical only |

### 1.5 Sisteme și Servicii Acoperite

```yaml
# Componente Etapa 3
services:
  ai_agent:
    - ai-agent-core
    - negotiation-fsm
    - sentiment-intent
    - guardrails-engine
    - mcp-server
    
  fiscal_integration:
    - oblio-connector
    - efactura-spv
    - document-generator
    
  product_management:
    - product-knowledge
    - hybrid-search
    - pricing-discount
    - stock-inventory
    
  communication:
    - handover-channel
    - human-intervention
    
  infrastructure:
    - postgresql
    - redis
    - bullmq-workers
    - api-gateway
```

---

## 2. Proceduri de Startup și Shutdown

### 2.1 Startup Complet al Sistemului

#### 2.1.1 Pre-Startup Checklist

```bash
#!/bin/bash
# pre-startup-check.sh

echo "=== PRE-STARTUP CHECKLIST ==="

# 1. Verificare spațiu disk
echo "1. Checking disk space..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    echo "❌ CRITICAL: Disk usage at ${DISK_USAGE}%"
    exit 1
fi
echo "✅ Disk space OK (${DISK_USAGE}% used)"

# 2. Verificare memorie disponibilă
echo "2. Checking available memory..."
FREE_MEM=$(free -g | awk 'NR==2 {print $7}')
if [ "$FREE_MEM" -lt 10 ]; then
    echo "❌ CRITICAL: Less than 10GB free memory"
    exit 1
fi
echo "✅ Memory OK (${FREE_MEM}GB available)"

# 3. Verificare conectivitate rețea
echo "3. Checking network connectivity..."
if ! ping -c 1 8.8.8.8 > /dev/null 2>&1; then
    echo "❌ CRITICAL: No network connectivity"
    exit 1
fi
echo "✅ Network connectivity OK"

# 4. Verificare DNS
echo "4. Checking DNS resolution..."
if ! host api.anthropic.com > /dev/null 2>&1; then
    echo "❌ CRITICAL: DNS resolution failed"
    exit 1
fi
echo "✅ DNS resolution OK"

# 5. Verificare certificate SSL
echo "5. Checking SSL certificates..."
CERT_EXPIRY=$(echo | openssl s_client -servername cerniq.app -connect cerniq.app:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
CERT_DAYS=$(( ($(date -d "$CERT_EXPIRY" +%s) - $(date +%s)) / 86400 ))
if [ "$CERT_DAYS" -lt 7 ]; then
    echo "⚠️ WARNING: SSL certificate expires in ${CERT_DAYS} days"
fi
echo "✅ SSL certificates OK (${CERT_DAYS} days remaining)"

# 6. Verificare existență secrets
echo "6. Checking Docker secrets..."
REQUIRED_SECRETS="db_password redis_password anthropic_api_key openai_api_key anaf_certificate oblio_api_key"
for secret in $REQUIRED_SECRETS; do
    if [ ! -f "/run/secrets/${secret}" ] && ! docker secret ls | grep -q "$secret"; then
        echo "❌ CRITICAL: Missing secret: $secret"
        exit 1
    fi
done
echo "✅ All secrets present"

echo ""
echo "=== PRE-STARTUP CHECK COMPLETE ==="
echo "✅ System ready for startup"
```

#### 2.1.2 Procedura de Startup

```bash
#!/bin/bash
# startup-etapa3.sh

set -e

echo "========================================"
echo "ETAPA 3 - AI SALES AGENT STARTUP"
echo "Started at: $(date)"
echo "========================================"

# Setare variabile
COMPOSE_PROJECT_NAME="cerniq"
COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"
LOG_DIR="/var/log/cerniq/startup"

mkdir -p "$LOG_DIR"
STARTUP_LOG="$LOG_DIR/startup-$(date +%Y%m%d-%H%M%S).log"

exec > >(tee -a "$STARTUP_LOG") 2>&1

# Pasul 1: Infrastructure Services
echo ""
echo "=== STEP 1/6: Starting Infrastructure ==="
docker compose -f "$COMPOSE_FILE" up -d postgres redis

echo "Waiting for PostgreSQL to be ready..."
until docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U c3rn1q; do
    sleep 2
done
echo "✅ PostgreSQL ready"

echo "Waiting for Redis to be ready..."
until docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping | grep -q PONG; do
    sleep 2
done
echo "✅ Redis ready"

# Pasul 2: Run Database Migrations
echo ""
echo "=== STEP 2/6: Running Database Migrations ==="
docker compose -f "$COMPOSE_FILE" run --rm migration npm run migrate:up
echo "✅ Migrations complete"

# Pasul 3: Start Core Services
echo ""
echo "=== STEP 3/6: Starting Core Services ==="
docker compose -f "$COMPOSE_FILE" up -d \
    product-knowledge \
    hybrid-search \
    pricing-discount \
    stock-inventory
    
sleep 10

# Verify core services
for service in product-knowledge hybrid-search pricing-discount stock-inventory; do
    if docker compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
        echo "✅ $service started"
    else
        echo "❌ $service failed to start"
        exit 1
    fi
done

# Pasul 4: Start AI Services
echo ""
echo "=== STEP 4/6: Starting AI Services ==="
docker compose -f "$COMPOSE_FILE" up -d \
    guardrails-engine \
    sentiment-intent \
    ai-agent-core \
    negotiation-fsm \
    mcp-server

sleep 15

# Verify AI services
for service in guardrails-engine sentiment-intent ai-agent-core negotiation-fsm mcp-server; do
    if docker compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
        echo "✅ $service started"
    else
        echo "❌ $service failed to start"
        exit 1
    fi
done

# Pasul 5: Start Fiscal Integration
echo ""
echo "=== STEP 5/6: Starting Fiscal Integration ==="
docker compose -f "$COMPOSE_FILE" up -d \
    oblio-connector \
    efactura-spv \
    document-generator

sleep 10

# Verify fiscal services
for service in oblio-connector efactura-spv document-generator; do
    if docker compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
        echo "✅ $service started"
    else
        echo "❌ $service failed to start"
        exit 1
    fi
done

# Pasul 6: Start Communication Services
echo ""
echo "=== STEP 6/6: Starting Communication Services ==="
docker compose -f "$COMPOSE_FILE" up -d \
    handover-channel \
    human-intervention \
    api-gateway

sleep 10

# Final verification
echo ""
echo "=== FINAL VERIFICATION ==="
docker compose -f "$COMPOSE_FILE" ps

# Health check
echo ""
echo "=== HEALTH CHECK ==="
HEALTH_ENDPOINT="http://localhost:64000/health"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_ENDPOINT")

if [ "$HEALTH_STATUS" == "200" ]; then
    echo "✅ System health check passed"
else
    echo "⚠️ Health check returned: $HEALTH_STATUS"
fi

echo ""
echo "========================================"
echo "STARTUP COMPLETE"
echo "Finished at: $(date)"
echo "Log file: $STARTUP_LOG"
echo "========================================"
```

#### 2.1.3 Startup Individual Services

```bash
#!/bin/bash
# start-service.sh <service-name>

SERVICE=$1
COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"

if [ -z "$SERVICE" ]; then
    echo "Usage: $0 <service-name>"
    echo "Available services:"
    docker compose -f "$COMPOSE_FILE" config --services
    exit 1
fi

echo "Starting $SERVICE..."
docker compose -f "$COMPOSE_FILE" up -d "$SERVICE"

# Wait for service to be healthy
TIMEOUT=60
COUNTER=0
while [ $COUNTER -lt $TIMEOUT ]; do
    if docker compose -f "$COMPOSE_FILE" ps "$SERVICE" | grep -q "(healthy)"; then
        echo "✅ $SERVICE is healthy"
        exit 0
    fi
    sleep 1
    ((COUNTER++))
done

echo "⚠️ $SERVICE started but health check timeout after ${TIMEOUT}s"
docker compose -f "$COMPOSE_FILE" logs --tail=50 "$SERVICE"
```

### 2.2 Shutdown Complet al Sistemului

#### 2.2.1 Graceful Shutdown

```bash
#!/bin/bash
# shutdown-etapa3.sh

set -e

echo "========================================"
echo "ETAPA 3 - AI SALES AGENT SHUTDOWN"
echo "Started at: $(date)"
echo "========================================"

COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"
LOG_DIR="/var/log/cerniq/shutdown"

mkdir -p "$LOG_DIR"
SHUTDOWN_LOG="$LOG_DIR/shutdown-$(date +%Y%m%d-%H%M%S).log"

exec > >(tee -a "$SHUTDOWN_LOG") 2>&1

# Confirmare
read -p "⚠️  Are you sure you want to shutdown? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Shutdown cancelled"
    exit 0
fi

# Pasul 1: Notificare sistem
echo ""
echo "=== STEP 1/5: Sending shutdown notification ==="
curl -X POST "http://localhost:64000/api/v1/system/shutdown-notice" \
    -H "Content-Type: application/json" \
    -d '{"message": "System shutdown initiated", "delay_seconds": 60}' || true
echo "✅ Shutdown notice sent"

# Pasul 2: Drain queues
echo ""
echo "=== STEP 2/5: Draining queues ==="
docker compose -f "$COMPOSE_FILE" exec -T api-gateway \
    node -e "
    const { Queue } = require('bullmq');
    const queues = ['ai-conversation', 'negotiation', 'efactura', 'document-gen'];
    queues.forEach(async (name) => {
        const q = new Queue(name);
        await q.pause();
        console.log('Paused: ' + name);
    });
    " || true

echo "Waiting 30s for active jobs to complete..."
sleep 30
echo "✅ Queues drained"

# Pasul 3: Stop Communication Services
echo ""
echo "=== STEP 3/5: Stopping Communication Services ==="
docker compose -f "$COMPOSE_FILE" stop \
    api-gateway \
    human-intervention \
    handover-channel
echo "✅ Communication services stopped"

# Pasul 4: Stop Application Services
echo ""
echo "=== STEP 4/5: Stopping Application Services ==="
docker compose -f "$COMPOSE_FILE" stop \
    ai-agent-core \
    negotiation-fsm \
    sentiment-intent \
    guardrails-engine \
    mcp-server \
    oblio-connector \
    efactura-spv \
    document-generator \
    product-knowledge \
    hybrid-search \
    pricing-discount \
    stock-inventory
echo "✅ Application services stopped"

# Pasul 5: Stop Infrastructure
echo ""
echo "=== STEP 5/5: Stopping Infrastructure ==="

# Backup Redis state before stopping
echo "Creating Redis snapshot..."
docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli BGSAVE
sleep 5

docker compose -f "$COMPOSE_FILE" stop redis postgres
echo "✅ Infrastructure stopped"

echo ""
echo "========================================"
echo "SHUTDOWN COMPLETE"
echo "Finished at: $(date)"
echo "Log file: $SHUTDOWN_LOG"
echo "========================================"
```

#### 2.2.2 Emergency Shutdown

```bash
#!/bin/bash
# emergency-shutdown.sh
# ⚠️ USE ONLY IN EMERGENCIES - Does not wait for graceful shutdown

echo "⚠️  EMERGENCY SHUTDOWN INITIATED"
echo "This will forcefully stop all services!"
read -p "Type 'EMERGENCY' to confirm: " CONFIRM

if [ "$CONFIRM" != "EMERGENCY" ]; then
    echo "Emergency shutdown cancelled"
    exit 0
fi

COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"

# Force stop all containers
docker compose -f "$COMPOSE_FILE" kill

# Remove containers
docker compose -f "$COMPOSE_FILE" down --remove-orphans

echo "❌ EMERGENCY SHUTDOWN COMPLETE"
echo "⚠️ Data loss may have occurred. Check logs and database integrity."
```

### 2.3 Restart Procedures

#### 2.3.1 Restart Individual Service

```bash
#!/bin/bash
# restart-service.sh <service-name>

SERVICE=$1
COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"

if [ -z "$SERVICE" ]; then
    echo "Usage: $0 <service-name>"
    exit 1
fi

echo "Restarting $SERVICE..."

# Check for dependent services
case $SERVICE in
    "postgres")
        echo "⚠️ WARNING: Restarting PostgreSQL will affect all services!"
        read -p "Continue? (yes/no): " CONFIRM
        [ "$CONFIRM" != "yes" ] && exit 0
        ;;
    "redis")
        echo "⚠️ WARNING: Restarting Redis will affect queues and caching!"
        read -p "Continue? (yes/no): " CONFIRM
        [ "$CONFIRM" != "yes" ] && exit 0
        ;;
esac

# Graceful restart
docker compose -f "$COMPOSE_FILE" restart "$SERVICE"

# Wait and verify
sleep 10
if docker compose -f "$COMPOSE_FILE" ps "$SERVICE" | grep -q "Up"; then
    echo "✅ $SERVICE restarted successfully"
else
    echo "❌ $SERVICE failed to restart"
    docker compose -f "$COMPOSE_FILE" logs --tail=50 "$SERVICE"
    exit 1
fi
```

#### 2.3.2 Rolling Restart All Services

```bash
#!/bin/bash
# rolling-restart.sh

COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"

echo "=== ROLLING RESTART ==="
echo "This will restart services one by one without downtime"

# Service groups în ordinea de restart
GROUPS=(
    "product-knowledge hybrid-search pricing-discount stock-inventory"
    "guardrails-engine sentiment-intent"
    "ai-agent-core negotiation-fsm mcp-server"
    "oblio-connector efactura-spv document-generator"
    "handover-channel human-intervention"
    "api-gateway"
)

for group in "${GROUPS[@]}"; do
    echo ""
    echo "Restarting group: $group"
    for service in $group; do
        echo "  Restarting $service..."
        docker compose -f "$COMPOSE_FILE" restart "$service"
        
        # Wait for health check
        TIMEOUT=30
        COUNTER=0
        while [ $COUNTER -lt $TIMEOUT ]; do
            if docker compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
                echo "  ✅ $service restarted"
                break
            fi
            sleep 1
            ((COUNTER++))
        done
        
        if [ $COUNTER -eq $TIMEOUT ]; then
            echo "  ❌ $service restart failed"
            exit 1
        fi
    done
    
    # Wait between groups
    sleep 5
done

echo ""
echo "=== ROLLING RESTART COMPLETE ==="
```

---

## 3. Operațiuni Zilnice

### 3.1 Morning Health Check

```bash
#!/bin/bash
# daily-morning-check.sh
# Rulează la 08:00 zilnic

echo "========================================"
echo "DAILY MORNING HEALTH CHECK"
echo "Date: $(date)"
echo "========================================"

COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"
ALERT_EMAIL="ops@cerniq.app"
ISSUES=()

# 1. Service Status
echo ""
echo "=== SERVICE STATUS ==="
ALL_SERVICES=$(docker compose -f "$COMPOSE_FILE" config --services)
for service in $ALL_SERVICES; do
    STATUS=$(docker compose -f "$COMPOSE_FILE" ps "$service" --format "{{.State}}")
    if [ "$STATUS" != "running" ]; then
        ISSUES+=("Service $service is $STATUS")
        echo "❌ $service: $STATUS"
    else
        echo "✅ $service: running"
    fi
done

# 2. Disk Space
echo ""
echo "=== DISK SPACE ==="
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    ISSUES+=("Disk usage at ${DISK_USAGE}%")
    echo "⚠️ Disk usage: ${DISK_USAGE}% (WARNING)"
else
    echo "✅ Disk usage: ${DISK_USAGE}%"
fi

# 3. Database Status
echo ""
echo "=== DATABASE STATUS ==="
DB_CONNECTIONS=$(docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -t -c "SELECT count(*) FROM pg_stat_activity;")
echo "Active connections: $DB_CONNECTIONS"

DB_SIZE=$(docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -t -c "SELECT pg_size_pretty(pg_database_size('cerniq'));")
echo "Database size: $DB_SIZE"

# Check for long-running queries
LONG_QUERIES=$(docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';")
if [ "$LONG_QUERIES" -gt 0 ]; then
    ISSUES+=("$LONG_QUERIES long-running queries detected")
    echo "⚠️ Long-running queries: $LONG_QUERIES"
fi

# 4. Queue Status
echo ""
echo "=== QUEUE STATUS ==="
QUEUES=("ai-conversation" "negotiation" "efactura" "document-gen" "sentiment" "guardrails")
for queue in "${QUEUES[@]}"; do
    WAITING=$(docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli LLEN "bull:${queue}:wait" 2>/dev/null || echo "0")
    ACTIVE=$(docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli LLEN "bull:${queue}:active" 2>/dev/null || echo "0")
    FAILED=$(docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ZCARD "bull:${queue}:failed" 2>/dev/null || echo "0")
    
    echo "$queue: waiting=$WAITING active=$ACTIVE failed=$FAILED"
    
    if [ "$FAILED" -gt 100 ]; then
        ISSUES+=("Queue $queue has $FAILED failed jobs")
    fi
done

# 5. LLM API Status
echo ""
echo "=== LLM API STATUS ==="
# Check Anthropic
ANTHROPIC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://api.anthropic.com/v1/messages" -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2024-01-01" -d '{}' 2>/dev/null || echo "000")
if [ "$ANTHROPIC_STATUS" == "400" ] || [ "$ANTHROPIC_STATUS" == "401" ]; then
    echo "✅ Anthropic API: reachable"
else
    ISSUES+=("Anthropic API unreachable: $ANTHROPIC_STATUS")
    echo "❌ Anthropic API: $ANTHROPIC_STATUS"
fi

# 6. Overnight Errors
echo ""
echo "=== OVERNIGHT ERRORS ==="
SINCE="$(date -d '12 hours ago' --iso-8601=seconds)"
ERROR_COUNT=$(docker compose -f "$COMPOSE_FILE" logs --since="$SINCE" 2>&1 | grep -ci "error\|exception\|fatal" || true)
echo "Errors in last 12 hours: $ERROR_COUNT"
if [ "$ERROR_COUNT" -gt 100 ]; then
    ISSUES+=("High error count in logs: $ERROR_COUNT")
fi

# 7. HITL Pending Approvals
echo ""
echo "=== HITL PENDING APPROVALS ==="
HITL_CRITICAL=$(docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -t -c "
    SELECT count(*) FROM hitl_approvals 
    WHERE status = 'pending' 
    AND priority IN ('critical', 'high')
    AND created_at < NOW() - INTERVAL '2 hours';
")
echo "Critical/High priority pending > 2h: $HITL_CRITICAL"
if [ "$HITL_CRITICAL" -gt 0 ]; then
    ISSUES+=("$HITL_CRITICAL critical HITL approvals pending > 2h")
fi

# Summary
echo ""
echo "========================================"
if [ ${#ISSUES[@]} -eq 0 ]; then
    echo "✅ MORNING CHECK PASSED - No issues found"
else
    echo "⚠️ ISSUES FOUND: ${#ISSUES[@]}"
    for issue in "${ISSUES[@]}"; do
        echo "  - $issue"
    done
    
    # Send alert email
    {
        echo "Daily Morning Check - Issues Found"
        echo ""
        echo "Date: $(date)"
        echo ""
        echo "Issues:"
        for issue in "${ISSUES[@]}"; do
            echo "  - $issue"
        done
    } | mail -s "⚠️ [Cerniq] Morning Check Issues" "$ALERT_EMAIL"
fi
echo "========================================"
```

### 3.2 Queue Management Tasks

```bash
#!/bin/bash
# queue-management.sh

COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"

case "$1" in
    "status")
        echo "=== QUEUE STATUS ==="
        docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli KEYS "bull:*" | sort | uniq -c
        ;;
    
    "clean-failed")
        QUEUE=$2
        if [ -z "$QUEUE" ]; then
            echo "Usage: $0 clean-failed <queue-name>"
            exit 1
        fi
        
        echo "Cleaning failed jobs from $QUEUE..."
        FAILED_COUNT=$(docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ZCARD "bull:${QUEUE}:failed")
        docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli DEL "bull:${QUEUE}:failed"
        echo "✅ Cleaned $FAILED_COUNT failed jobs"
        ;;
    
    "retry-failed")
        QUEUE=$2
        if [ -z "$QUEUE" ]; then
            echo "Usage: $0 retry-failed <queue-name>"
            exit 1
        fi
        
        echo "Retrying failed jobs in $QUEUE..."
        # Move failed jobs back to waiting
        docker compose -f "$COMPOSE_FILE" exec -T api-gateway \
            node -e "
            const { Queue } = require('bullmq');
            const q = new Queue('$QUEUE');
            q.retryJobs().then(count => {
                console.log('Retried ' + count + ' jobs');
                process.exit(0);
            });
            "
        ;;
    
    "drain")
        QUEUE=$2
        if [ -z "$QUEUE" ]; then
            echo "Usage: $0 drain <queue-name>"
            exit 1
        fi
        
        echo "⚠️ Draining queue $QUEUE (removing all jobs)..."
        read -p "Confirm? (yes/no): " CONFIRM
        [ "$CONFIRM" != "yes" ] && exit 0
        
        docker compose -f "$COMPOSE_FILE" exec -T api-gateway \
            node -e "
            const { Queue } = require('bullmq');
            const q = new Queue('$QUEUE');
            q.drain().then(() => {
                console.log('Queue drained');
                process.exit(0);
            });
            "
        ;;
    
    "pause")
        QUEUE=$2
        docker compose -f "$COMPOSE_FILE" exec -T api-gateway \
            node -e "
            const { Queue } = require('bullmq');
            const q = new Queue('$QUEUE');
            q.pause().then(() => console.log('Queue paused'));
            "
        ;;
    
    "resume")
        QUEUE=$2
        docker compose -f "$COMPOSE_FILE" exec -T api-gateway \
            node -e "
            const { Queue } = require('bullmq');
            const q = new Queue('$QUEUE');
            q.resume().then(() => console.log('Queue resumed'));
            "
        ;;
    
    *)
        echo "Queue Management Commands:"
        echo "  $0 status                    - Show all queue status"
        echo "  $0 clean-failed <queue>      - Remove failed jobs"
        echo "  $0 retry-failed <queue>      - Retry failed jobs"
        echo "  $0 drain <queue>             - Remove all jobs"
        echo "  $0 pause <queue>             - Pause queue processing"
        echo "  $0 resume <queue>            - Resume queue processing"
        ;;
esac
```

### 3.3 Log Rotation și Cleanup

```bash
#!/bin/bash
# log-cleanup.sh
# Rulează zilnic la 03:00

LOG_DIR="/var/log/cerniq"
RETENTION_DAYS=30
ARCHIVE_DIR="/backup/logs"

echo "=== LOG CLEANUP STARTED ==="
echo "Date: $(date)"

# Compress logs older than 1 day
find "$LOG_DIR" -name "*.log" -mtime +1 ! -name "*.gz" -exec gzip {} \;

# Archive logs older than 7 days
find "$LOG_DIR" -name "*.log.gz" -mtime +7 -exec mv {} "$ARCHIVE_DIR/" \;

# Delete logs older than retention period
find "$LOG_DIR" -name "*.log.gz" -mtime +$RETENTION_DAYS -delete
find "$ARCHIVE_DIR" -name "*.log.gz" -mtime +90 -delete

# Clean Docker logs
docker system prune -f --filter "until=24h"

# Vacuum PostgreSQL logs
COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "VACUUM ANALYZE;"

echo "=== LOG CLEANUP COMPLETE ==="
```

---

## 4. Proceduri de Deployment

### 4.1 Pre-Deployment Checklist

```markdown
## Pre-Deployment Checklist

### Code Review
- [ ] PR approved by at least 2 reviewers
- [ ] All CI tests passing
- [ ] Security scan completed with no critical issues
- [ ] Code coverage >= 80%

### Documentation
- [ ] CHANGELOG updated
- [ ] API documentation updated (if applicable)
- [ ] Runbook updated (if needed)

### Database
- [ ] Migrations tested on staging
- [ ] Migration rollback script prepared
- [ ] Database backup created

### Testing
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing on staging
- [ ] Load test completed (if applicable)

### Infrastructure
- [ ] Docker images built and pushed
- [ ] Container registry accessible
- [ ] Sufficient resources available

### Communication
- [ ] Team notified of deployment window
- [ ] On-call engineer aware
- [ ] Stakeholders informed (for major releases)
```

### 4.2 Standard Deployment Procedure

```bash
#!/bin/bash
# deploy-etapa3.sh <version>

set -e

VERSION=$1
if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 v1.2.3"
    exit 1
fi

COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"
REGISTRY="ghcr.io/cerniq"
DEPLOY_LOG="/var/log/cerniq/deployments/deploy-$(date +%Y%m%d-%H%M%S).log"

mkdir -p /var/log/cerniq/deployments
exec > >(tee -a "$DEPLOY_LOG") 2>&1

echo "========================================"
echo "DEPLOYMENT: Etapa 3 $VERSION"
echo "Started: $(date)"
echo "========================================"

# Pre-deployment backup
echo ""
echo "=== STEP 1: Creating backup ==="
./backup-database.sh pre-deploy
echo "✅ Backup created"

# Pull new images
echo ""
echo "=== STEP 2: Pulling new images ==="
SERVICES=(
    "ai-agent-core"
    "negotiation-fsm"
    "sentiment-intent"
    "guardrails-engine"
    "mcp-server"
    "oblio-connector"
    "efactura-spv"
    "document-generator"
    "product-knowledge"
    "hybrid-search"
    "pricing-discount"
    "stock-inventory"
    "handover-channel"
    "human-intervention"
    "api-gateway"
)

for service in "${SERVICES[@]}"; do
    IMAGE="${REGISTRY}/${service}:${VERSION}"
    echo "Pulling $IMAGE..."
    docker pull "$IMAGE"
done
echo "✅ All images pulled"

# Run migrations
echo ""
echo "=== STEP 3: Running migrations ==="
docker compose -f "$COMPOSE_FILE" run --rm migration npm run migrate:up
echo "✅ Migrations complete"

# Rolling update
echo ""
echo "=== STEP 4: Rolling update ==="
for service in "${SERVICES[@]}"; do
    echo "Updating $service..."
    
    # Update service with zero-downtime
    docker compose -f "$COMPOSE_FILE" up -d --no-deps --scale "${service}=2" "$service"
    sleep 10
    
    # Check health
    if docker compose -f "$COMPOSE_FILE" ps "$service" | grep -q "(healthy)"; then
        # Scale back to 1
        docker compose -f "$COMPOSE_FILE" up -d --no-deps --scale "${service}=1" "$service"
        echo "  ✅ $service updated"
    else
        echo "  ❌ $service health check failed"
        echo "  Rolling back..."
        ./rollback-deployment.sh "$service"
        exit 1
    fi
done

# Verify deployment
echo ""
echo "=== STEP 5: Verification ==="

# Health check
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:64000/health")
if [ "$HEALTH_STATUS" != "200" ]; then
    echo "❌ Health check failed"
    exit 1
fi
echo "✅ Health check passed"

# Smoke tests
echo "Running smoke tests..."
npm run test:smoke 2>/dev/null || echo "Smoke tests skipped"

# Update version tag
echo "$VERSION" > /opt/cerniq/CURRENT_VERSION

echo ""
echo "========================================"
echo "DEPLOYMENT COMPLETE: $VERSION"
echo "Finished: $(date)"
echo "Log: $DEPLOY_LOG"
echo "========================================"
```

### 4.3 Rollback Procedure

```bash
#!/bin/bash
# rollback-deployment.sh [service]

SERVICE=$1
COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"
REGISTRY="ghcr.io/cerniq"
PREVIOUS_VERSION=$(cat /opt/cerniq/PREVIOUS_VERSION 2>/dev/null)

echo "========================================"
echo "ROLLBACK INITIATED"
echo "========================================"

if [ -z "$PREVIOUS_VERSION" ]; then
    echo "❌ No previous version found"
    echo "Manual intervention required"
    exit 1
fi

echo "Rolling back to: $PREVIOUS_VERSION"
read -p "Confirm rollback? (yes/no): " CONFIRM
[ "$CONFIRM" != "yes" ] && exit 0

if [ -n "$SERVICE" ]; then
    # Rollback single service
    echo "Rolling back $SERVICE to $PREVIOUS_VERSION..."
    IMAGE="${REGISTRY}/${SERVICE}:${PREVIOUS_VERSION}"
    docker pull "$IMAGE"
    docker compose -f "$COMPOSE_FILE" up -d --no-deps "$SERVICE"
else
    # Rollback all services
    SERVICES=$(docker compose -f "$COMPOSE_FILE" config --services | grep -v "postgres\|redis")
    
    for service in $SERVICES; do
        echo "Rolling back $service..."
        IMAGE="${REGISTRY}/${service}:${PREVIOUS_VERSION}"
        docker pull "$IMAGE"
        docker compose -f "$COMPOSE_FILE" up -d --no-deps "$service"
    done
fi

# Database rollback if needed
read -p "Rollback database migrations? (yes/no): " DB_ROLLBACK
if [ "$DB_ROLLBACK" == "yes" ]; then
    echo "Rolling back migrations..."
    docker compose -f "$COMPOSE_FILE" run --rm migration npm run migrate:rollback
fi

echo ""
echo "========================================"
echo "ROLLBACK COMPLETE"
echo "========================================"
```

### 4.4 Blue-Green Deployment

```bash
#!/bin/bash
# blue-green-deploy.sh <version>

VERSION=$1
COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"
CURRENT_ENV=$(cat /opt/cerniq/CURRENT_ENV 2>/dev/null || echo "blue")

if [ "$CURRENT_ENV" == "blue" ]; then
    NEW_ENV="green"
else
    NEW_ENV="blue"
fi

echo "========================================"
echo "BLUE-GREEN DEPLOYMENT"
echo "Current: $CURRENT_ENV -> New: $NEW_ENV"
echo "========================================"

# Deploy to new environment
echo "Deploying to $NEW_ENV environment..."
docker compose -f "$COMPOSE_FILE" -p "cerniq-${NEW_ENV}" up -d

# Wait for health
echo "Waiting for health check..."
sleep 30

HEALTH_PORT=$([[ "${NEW_ENV: -1}" = "1" ]] && echo "64001" || echo "64002")
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${HEALTH_PORT}/health")
if [ "$HEALTH_STATUS" != "200" ]; then
    echo "❌ New environment health check failed"
    docker compose -f "$COMPOSE_FILE" -p "cerniq-${NEW_ENV}" down
    exit 1
fi

# Switch traffic
echo "Switching traffic to $NEW_ENV..."
# Update Traefik routing
cat > /opt/cerniq/traefik/dynamic/routing.yml << EOF
http:
  routers:
    api:
      rule: "Host(\`api.cerniq.app\`)"
      service: api-${NEW_ENV}
  services:
    api-${NEW_ENV}:
      loadBalancer:
        servers:
          - url: "http://cerniq-${NEW_ENV}-api-gateway:64000"
EOF

# Verify switch
sleep 5
echo "Verifying traffic switch..."

# Stop old environment
echo "Stopping $CURRENT_ENV environment..."
docker compose -f "$COMPOSE_FILE" -p "cerniq-${CURRENT_ENV}" down

# Update current env marker
echo "$NEW_ENV" > /opt/cerniq/CURRENT_ENV
echo "$VERSION" > /opt/cerniq/CURRENT_VERSION

echo "========================================"
echo "BLUE-GREEN DEPLOYMENT COMPLETE"
echo "Active environment: $NEW_ENV"
echo "========================================"
```

---

## 5. Troubleshooting Comun

### 5.1 Probleme AI Agent Core

#### 5.1.1 Agent nu răspunde la mesaje

```bash
# Diagnostic
echo "=== AI AGENT DIAGNOSTIC ==="

# 1. Check service status
docker compose -f "$COMPOSE_FILE" ps ai-agent-core

# 2. Check logs
docker compose -f "$COMPOSE_FILE" logs --tail=100 ai-agent-core | grep -E "error|Error|ERROR"

# 3. Check queue
docker compose -f "$COMPOSE_FILE" exec redis redis-cli LLEN "bull:ai-conversation:wait"

# 4. Check LLM connectivity
curl -s -o /dev/null -w "%{http_code}" "https://api.anthropic.com/v1/messages" \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2024-01-01" \
    -d '{}'

# 5. Check guardrails service
curl -s "http://localhost:64000/health"
```

**Soluții comune:**

| Simptom | Cauză probabilă | Soluție |
|---------|-----------------|---------|
| Queue plină, processing=0 | Worker crashed | Restart ai-agent-core |
| LLM API 401 | API key invalid/expired | Verify ANTHROPIC_API_KEY |
| LLM API 429 | Rate limit exceeded | Check rate limits, reduce concurrency |
| Timeout errors | Network issues | Check connectivity, DNS |
| Memory exhausted | Large context | Increase container memory |

#### 5.1.2 Latență mare LLM

```bash
#!/bin/bash
# diagnose-llm-latency.sh

echo "=== LLM LATENCY DIAGNOSTIC ==="

# Check current metrics
curl -s "http://localhost:64090/api/v1/query?query=llm_request_duration_seconds_p95"

# Check concurrent requests
curl -s "http://localhost:64090/api/v1/query?query=llm_concurrent_requests"

# Check token usage
docker compose -f "$COMPOSE_FILE" logs --tail=50 ai-agent-core | grep "tokens"

# Recommended actions
echo ""
echo "Possible solutions:"
echo "1. Reduce max_tokens in requests"
echo "2. Enable caching for similar prompts"
echo "3. Use faster model (claude-3-haiku)"
echo "4. Increase worker concurrency"
echo "5. Check for prompt bloat"
```

### 5.2 Probleme Negociere FSM

#### 5.2.1 Negociere blocată în stare

```sql
-- Identificare negocieri blocate
SELECT 
    id,
    contact_id,
    current_state,
    updated_at,
    NOW() - updated_at as blocked_duration
FROM negotiations
WHERE current_state NOT IN ('completed', 'cancelled', 'failed')
AND updated_at < NOW() - INTERVAL '24 hours'
ORDER BY updated_at;

-- Verificare tranziții
SELECT 
    n.id,
    n.current_state,
    nt.from_state,
    nt.to_state,
    nt.trigger,
    nt.created_at
FROM negotiations n
LEFT JOIN negotiation_transitions nt ON n.id = nt.negotiation_id
WHERE n.id = '<negotiation_id>'
ORDER BY nt.created_at DESC
LIMIT 10;
```

```bash
#!/bin/bash
# fix-stuck-negotiation.sh <negotiation_id>

NEGOTIATION_ID=$1
COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"

# Get current state
CURRENT_STATE=$(docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -t -c "
    SELECT current_state FROM negotiations WHERE id = '$NEGOTIATION_ID';
")

echo "Negotiation: $NEGOTIATION_ID"
echo "Current state: $CURRENT_STATE"

# Options
echo ""
echo "Options:"
echo "1. Force transition to next state"
echo "2. Reset to initial state"
echo "3. Cancel negotiation"
echo "4. Manual HITL review"

read -p "Select option (1-4): " OPTION

case $OPTION in
    1)
        read -p "Enter target state: " TARGET_STATE
        docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
            UPDATE negotiations 
            SET current_state = '$TARGET_STATE', updated_at = NOW()
            WHERE id = '$NEGOTIATION_ID';
            
            INSERT INTO negotiation_transitions (negotiation_id, from_state, to_state, trigger, metadata)
            VALUES ('$NEGOTIATION_ID', '$CURRENT_STATE', '$TARGET_STATE', 'manual_intervention', 
                    '{\"reason\": \"Stuck state recovery\", \"operator\": \"$(whoami)\"}');
        "
        echo "✅ State updated to $TARGET_STATE"
        ;;
    2)
        docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
            UPDATE negotiations 
            SET current_state = 'initial', updated_at = NOW()
            WHERE id = '$NEGOTIATION_ID';
        "
        echo "✅ Reset to initial state"
        ;;
    3)
        docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
            UPDATE negotiations 
            SET current_state = 'cancelled', 
                cancellation_reason = 'Manual cancellation - stuck state',
                updated_at = NOW()
            WHERE id = '$NEGOTIATION_ID';
        "
        echo "✅ Negotiation cancelled"
        ;;
    4)
        docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
            INSERT INTO hitl_approvals (
                entity_type, entity_id, approval_type, priority, 
                context, status
            ) VALUES (
                'negotiation', '$NEGOTIATION_ID', 'stuck_recovery', 'high',
                '{\"current_state\": \"$CURRENT_STATE\", \"issue\": \"Stuck for >24h\"}',
                'pending'
            );
        "
        echo "✅ HITL approval created"
        ;;
esac
```

### 5.3 Probleme e-Factura SPV

#### 5.3.1 Erori de transmisie ANAF

```bash
#!/bin/bash
# diagnose-efactura.sh

echo "=== E-FACTURA DIAGNOSTIC ==="

COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"

# 1. Check service status
echo ""
echo "Service Status:"
docker compose -f "$COMPOSE_FILE" ps efactura-spv

# 2. Check certificate validity
echo ""
echo "Certificate Status:"
docker compose -f "$COMPOSE_FILE" exec -T efactura-spv openssl x509 -in /certs/anaf.crt -noout -dates

# 3. Check ANAF SPV connectivity
echo ""
echo "ANAF SPV Connectivity:"
curl -s -o /dev/null -w "%{http_code}" "https://api.anaf.ro/prod/FCTEL/rest/listaMesajeFactura"

# 4. Recent errors
echo ""
echo "Recent Errors:"
docker compose -f "$COMPOSE_FILE" logs --tail=50 efactura-spv | grep -i "error\|failed"

# 5. Pending invoices
echo ""
echo "Pending Invoices:"
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
    SELECT status, count(*) 
    FROM efactura_submissions 
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY status;
"
```

**Coduri de eroare ANAF comune:**

| Cod | Descriere | Soluție |
|-----|-----------|---------|
| E001 | Certificat invalid | Verifică/reînnoiește certificatul |
| E002 | Semnătură invalidă | Verifică semnarea XML |
| E003 | Format XML invalid | Validează XML contra schemei |
| E004 | CUI inexistent | Verifică datele companiei |
| E005 | Factură duplicată | Verifică ID unic factură |
| E006 | Timeout | Reîncearcă transmisia |

#### 5.3.2 Retry facturi eșuate

```bash
#!/bin/bash
# retry-failed-invoices.sh

COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"

# Get failed invoices
echo "Failed invoices in last 24h:"
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
    SELECT id, invoice_number, error_code, error_message, attempts
    FROM efactura_submissions
    WHERE status = 'failed'
    AND attempts < 3
    AND created_at > NOW() - INTERVAL '24 hours'
    LIMIT 20;
"

read -p "Retry all listed invoices? (yes/no): " CONFIRM
[ "$CONFIRM" != "yes" ] && exit 0

# Queue for retry
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
    UPDATE efactura_submissions
    SET status = 'pending_retry', 
        next_retry_at = NOW() + INTERVAL '5 minutes'
    WHERE status = 'failed'
    AND attempts < 3
    AND created_at > NOW() - INTERVAL '24 hours';
"

# Trigger processing
docker compose -f "$COMPOSE_FILE" exec -T api-gateway \
    node -e "
    const { Queue } = require('bullmq');
    const q = new Queue('efactura');
    q.add('process-retries', {});
    "

echo "✅ Retries queued"
```

### 5.4 Probleme HITL System

#### 5.4.1 Aprobări blocate

```sql
-- Find blocked approvals
SELECT 
    ha.id,
    ha.entity_type,
    ha.approval_type,
    ha.priority,
    ha.status,
    ha.created_at,
    NOW() - ha.created_at as pending_duration,
    u.email as assigned_to
FROM hitl_approvals ha
LEFT JOIN users u ON ha.assigned_to = u.id
WHERE ha.status = 'pending'
AND ha.created_at < NOW() - INTERVAL '4 hours'
ORDER BY 
    CASE ha.priority 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        ELSE 4 
    END,
    ha.created_at;

-- Check SLA breaches
SELECT 
    approval_type,
    priority,
    count(*) as breached_count,
    avg(EXTRACT(EPOCH FROM (NOW() - created_at))/3600)::numeric(10,2) as avg_hours_pending
FROM hitl_approvals
WHERE status = 'pending'
AND (
    (priority = 'critical' AND created_at < NOW() - INTERVAL '1 hour')
    OR (priority = 'high' AND created_at < NOW() - INTERVAL '4 hours')
    OR (priority = 'medium' AND created_at < NOW() - INTERVAL '8 hours')
    OR (priority = 'low' AND created_at < NOW() - INTERVAL '24 hours')
)
GROUP BY approval_type, priority;
```

```bash
#!/bin/bash
# escalate-hitl.sh

COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"

# Auto-escalate breached approvals
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
    UPDATE hitl_approvals
    SET 
        escalation_level = escalation_level + 1,
        escalated_at = NOW(),
        escalation_reason = 'SLA breach - auto-escalation'
    WHERE status = 'pending'
    AND escalation_level < 3
    AND (
        (priority = 'critical' AND created_at < NOW() - INTERVAL '1 hour')
        OR (priority = 'high' AND created_at < NOW() - INTERVAL '4 hours')
    );
"

# Notify escalation team
docker compose -f "$COMPOSE_FILE" exec -T api-gateway \
    node -e "
    const { sendSlackNotification } = require('./utils/notifications');
    sendSlackNotification({
        channel: '#hitl-escalations',
        message: 'HITL SLA breach - escalations created',
        priority: 'high'
    });
    "

echo "✅ Escalations processed"
```

### 5.5 Probleme Database

#### 5.5.1 Connection Pool Exhausted

```bash
#!/bin/bash
# diagnose-db-connections.sh

COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"

echo "=== DATABASE CONNECTION DIAGNOSTIC ==="

# Current connections
echo ""
echo "Current Connections:"
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
    SELECT 
        datname,
        usename,
        application_name,
        client_addr,
        state,
        count(*) as connections
    FROM pg_stat_activity
    WHERE datname = 'cerniq'
    GROUP BY datname, usename, application_name, client_addr, state
    ORDER BY connections DESC;
"

# Idle connections
echo ""
echo "Idle Connections (>5 minutes):"
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
    SELECT 
        pid,
        usename,
        application_name,
        state,
        state_change,
        NOW() - state_change as idle_duration
    FROM pg_stat_activity
    WHERE state = 'idle'
    AND state_change < NOW() - INTERVAL '5 minutes'
    ORDER BY state_change;
"

# Connection limits
echo ""
echo "Connection Limits:"
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
    SELECT 
        setting as max_connections,
        (SELECT count(*) FROM pg_stat_activity) as current_connections,
        setting::int - (SELECT count(*) FROM pg_stat_activity) as available
    FROM pg_settings 
    WHERE name = 'max_connections';
"
```

**Soluții:**

```bash
# Terminate idle connections
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE state = 'idle'
    AND state_change < NOW() - INTERVAL '10 minutes'
    AND pid <> pg_backend_pid();
"

# Increase max_connections (requires restart)
# Edit postgresql.conf: max_connections = 200

# Check application pool settings
# Verify each service has appropriate pool size
```

#### 5.5.2 Long Running Queries

```bash
#!/bin/bash
# kill-long-queries.sh

COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"

# List long-running queries
echo "Long Running Queries (>5 minutes):"
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
    SELECT 
        pid,
        usename,
        application_name,
        query_start,
        state,
        NOW() - query_start as duration,
        LEFT(query, 100) as query_preview
    FROM pg_stat_activity
    WHERE state = 'active'
    AND query_start < NOW() - INTERVAL '5 minutes'
    ORDER BY query_start;
"

read -p "Kill queries older than 5 minutes? (yes/no): " CONFIRM
if [ "$CONFIRM" == "yes" ]; then
    docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
        SELECT pg_cancel_backend(pid)
        FROM pg_stat_activity
        WHERE state = 'active'
        AND query_start < NOW() - INTERVAL '5 minutes'
        AND pid <> pg_backend_pid();
    "
    echo "✅ Long-running queries cancelled"
fi
```

#### 5.5.3 Database Lock Issues

```sql
-- Detect blocking queries
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_query,
    blocking_activity.query AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- Kill blocking query
SELECT pg_terminate_backend(<blocking_pid>);
```

### 5.6 Probleme Redis/Queue

#### 5.6.1 Redis Memory Full

```bash
#!/bin/bash
# diagnose-redis-memory.sh

COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"

echo "=== REDIS MEMORY DIAGNOSTIC ==="

# Memory info
docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli INFO memory

# Key count by pattern
echo ""
echo "Keys by Pattern:"
docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli --scan --pattern "bull:*" | cut -d: -f2 | sort | uniq -c | sort -rn | head -20

# Large keys
echo ""
echo "Large Keys:"
docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli --bigkeys

# Memory cleanup
echo ""
echo "Cleanup Options:"
echo "1. Clear completed jobs older than 24h"
echo "2. Clear all failed jobs"
echo "3. Flush cache keys"
echo "4. Manual key deletion"

read -p "Select option (1-4): " OPTION

case $OPTION in
    1)
        docker compose -f "$COMPOSE_FILE" exec -T api-gateway \
            node -e "
            const { Queue } = require('bullmq');
            const queues = ['ai-conversation', 'negotiation', 'efactura', 'document-gen'];
            queues.forEach(async (name) => {
                const q = new Queue(name);
                await q.clean(86400000, 1000, 'completed');
                console.log('Cleaned completed jobs from ' + name);
            });
            "
        ;;
    2)
        docker compose -f "$COMPOSE_FILE" exec -T api-gateway \
            node -e "
            const { Queue } = require('bullmq');
            const queues = ['ai-conversation', 'negotiation', 'efactura', 'document-gen'];
            queues.forEach(async (name) => {
                const q = new Queue(name);
                await q.clean(0, 1000, 'failed');
                console.log('Cleaned failed jobs from ' + name);
            });
            "
        ;;
    3)
        docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli KEYS "cache:*" | xargs -r redis-cli DEL
        echo "✅ Cache cleared"
        ;;
esac
```

### 5.7 Troubleshooting Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                    TROUBLESHOOTING DECISION TREE                 │
└─────────────────────────────────────────────────────────────────┘

User reports issue
        │
        ▼
┌───────────────────┐
│ Check Service     │
│ Status First      │
└───────────────────┘
        │
        ├── All services running? ──No──► Start/Restart services
        │                                 └─► Check logs for errors
        ▼
┌───────────────────┐
│ Check Health      │
│ Endpoints         │
└───────────────────┘
        │
        ├── Health OK? ──No──► Which component failing?
        │                      ├── Database ──► Check connections, disk
        │                      ├── Redis ──► Check memory, connectivity
        │                      ├── LLM API ──► Check keys, rate limits
        │                      └── External ──► Check ANAF, Oblio status
        ▼
┌───────────────────┐
│ Check Queues      │
└───────────────────┘
        │
        ├── Jobs stuck? ──Yes──► Check worker logs
        │                        └─► Restart workers
        ├── High fail rate? ──Yes──► Investigate failures
        │                            └─► Check dependencies
        ▼
┌───────────────────┐
│ Check Metrics     │
│ & Logs           │
└───────────────────┘
        │
        ├── Error spikes? ──Yes──► Correlate with changes
        │                          └─► Check recent deployments
        ├── Latency high? ──Yes──► Check resources
        │                          └─► Scale if needed
        ▼
┌───────────────────┐
│ Check Resources   │
└───────────────────┘
        │
        ├── CPU high? ──Yes──► Identify process
        │                      └─► Scale/optimize
        ├── Memory high? ──Yes──► Check for leaks
        │                         └─► Increase limits
        ├── Disk full? ──Yes──► Cleanup logs/temp
        │                       └─► Expand storage
        ▼
┌───────────────────┐
│ Escalate if       │
│ Unresolved        │
└───────────────────┘
```

---

## 6. Proceduri de Escalare

### 6.1 Matricea de Escalare

| Nivel | Timp | Responsabil | Acțiuni |
|-------|------|-------------|---------|
| L1 | 0-15 min | On-Call Engineer | Diagnostic inițial, runbook procedures |
| L2 | 15-60 min | DevOps Lead | Investigation avansată, fix sau workaround |
| L3 | 60+ min | Engineering Manager | Decizie asupra rollback, comunicare stakeholders |
| L4 | Critical | CTO/CEO | Incidente majore, impact business |

### 6.2 Criterii de Escalare

```yaml
escalation_triggers:
  immediate_l2:
    - Service outage affecting >10% users
    - Data corruption detected
    - Security incident
    - Database unavailable
    - LLM API quota exhausted
    
  immediate_l3:
    - Complete system outage
    - Financial transaction failures
    - GDPR breach suspected
    - e-Factura failures >50%
    
  immediate_l4:
    - Data breach confirmed
    - Legal compliance failure
    - Multiple system cascade failure
```

### 6.3 Procedura de Escalare

```bash
#!/bin/bash
# escalate-incident.sh <level> <incident_id>

LEVEL=$1
INCIDENT_ID=$2

case $LEVEL in
    "L2")
        # Notify DevOps Lead
        curl -X POST "$SLACK_WEBHOOK" -d "{
            \"channel\": \"#incidents\",
            \"text\": \"🚨 L2 Escalation: Incident $INCIDENT_ID escalated to DevOps Lead\",
            \"attachments\": [{
                \"color\": \"warning\",
                \"fields\": [
                    {\"title\": \"Incident\", \"value\": \"$INCIDENT_ID\", \"short\": true},
                    {\"title\": \"Level\", \"value\": \"L2\", \"short\": true}
                ]
            }]
        }"
        
        # Page DevOps Lead
        curl -X POST "https://api.pagerduty.com/incidents" \
            -H "Authorization: Token token=$PAGERDUTY_TOKEN" \
            -d "{
                \"incident\": {
                    \"type\": \"incident\",
                    \"title\": \"L2 Escalation: $INCIDENT_ID\",
                    \"service\": {\"id\": \"$DEVOPS_LEAD_SERVICE\", \"type\": \"service_reference\"},
                    \"urgency\": \"high\"
                }
            }"
        ;;
        
    "L3")
        # Notify management
        curl -X POST "$SLACK_WEBHOOK" -d "{
            \"channel\": \"#incidents-critical\",
            \"text\": \"🔴 L3 Escalation: Incident $INCIDENT_ID requires management attention\"
        }"
        
        # Email notification
        echo "L3 Escalation for Incident $INCIDENT_ID" | mail -s "🔴 Critical Incident" management@cerniq.app
        ;;
        
    "L4")
        # Full executive notification
        curl -X POST "$SLACK_WEBHOOK" -d "{
            \"channel\": \"#executive-alerts\",
            \"text\": \"🚨🚨 L4 CRITICAL: Incident $INCIDENT_ID - Executive attention required\"
        }"
        
        # Call bridge
        echo "Setting up emergency call bridge..."
        ;;
esac
```

---

## 7. Disaster Recovery

### 7.1 Disaster Recovery Plan

```yaml
disaster_recovery:
  rpo: 1 hour  # Maximum data loss acceptable
  rto: 4 hours # Maximum downtime acceptable
  
  scenarios:
    database_failure:
      probability: medium
      impact: critical
      recovery_procedure: restore_database_backup
      estimated_time: 30-60 minutes
      
    complete_server_failure:
      probability: low
      impact: critical
      recovery_procedure: provision_new_server
      estimated_time: 2-4 hours
      
    ransomware_attack:
      probability: low
      impact: critical
      recovery_procedure: clean_restore_from_offline
      estimated_time: 4-8 hours
      
    datacenter_outage:
      probability: very_low
      impact: critical
      recovery_procedure: failover_to_secondary
      estimated_time: 1-2 hours
```

### 7.2 Database Disaster Recovery

```bash
#!/bin/bash
# disaster-recovery-db.sh

echo "========================================"
echo "DATABASE DISASTER RECOVERY"
echo "========================================"

# Verify backup availability
echo "=== STEP 1: Verify Backups ==="
BACKUP_DIR="/backup/postgresql"
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ No local backup found"
    echo "Checking remote backup..."
    
    # Check Hetzner Storage Box
    REMOTE_BACKUP=$(ssh backup@backup.storage.box "ls -t /backups/cerniq/postgresql/*.sql.gz | head -1")
    
    if [ -z "$REMOTE_BACKUP" ]; then
        echo "❌ No remote backup found"
        echo "CRITICAL: Cannot proceed with recovery"
        exit 1
    fi
    
    echo "Found remote backup: $REMOTE_BACKUP"
    echo "Downloading..."
    scp "backup@backup.storage.box:$REMOTE_BACKUP" "$BACKUP_DIR/"
    LATEST_BACKUP="$BACKUP_DIR/$(basename $REMOTE_BACKUP)"
fi

echo "Using backup: $LATEST_BACKUP"
BACKUP_DATE=$(stat -c %y "$LATEST_BACKUP")
echo "Backup date: $BACKUP_DATE"

# Confirm recovery
echo ""
echo "⚠️ WARNING: This will replace all current data!"
read -p "Continue with recovery? (type 'RECOVER' to confirm): " CONFIRM
[ "$CONFIRM" != "RECOVER" ] && exit 0

# Stop services
echo ""
echo "=== STEP 2: Stop Services ==="
docker compose -f "$COMPOSE_FILE" stop api-gateway ai-agent-core negotiation-fsm
echo "✅ Services stopped"

# Restore database
echo ""
echo "=== STEP 3: Restore Database ==="
gunzip -c "$LATEST_BACKUP" | docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q
echo "✅ Database restored"

# Verify integrity
echo ""
echo "=== STEP 4: Verify Integrity ==="
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
    SELECT 
        schemaname,
        tablename,
        n_live_tup as row_count
    FROM pg_stat_user_tables
    ORDER BY n_live_tup DESC
    LIMIT 10;
"

# Restart services
echo ""
echo "=== STEP 5: Restart Services ==="
docker compose -f "$COMPOSE_FILE" up -d
echo "✅ Services restarted"

# Health check
echo ""
echo "=== STEP 6: Health Check ==="
sleep 30
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:64000/health")
if [ "$HEALTH" == "200" ]; then
    echo "✅ System healthy"
else
    echo "⚠️ Health check returned: $HEALTH"
fi

echo ""
echo "========================================"
echo "DISASTER RECOVERY COMPLETE"
echo "Data restored from: $BACKUP_DATE"
echo "========================================"
```

### 7.3 Full System Recovery

```bash
#!/bin/bash
# full-system-recovery.sh
# Use when entire server needs to be rebuilt

echo "========================================"
echo "FULL SYSTEM RECOVERY"
echo "========================================"

# This script assumes a fresh Ubuntu 24 server

# 1. Install Docker
apt-get update
apt-get install -y docker.io docker-compose-plugin

# 2. Create cerniq user
useradd -m -s /bin/bash cerniq
usermod -aG docker cerniq

# 3. Download configuration from backup
BACKUP_SERVER="backup.storage.box"
scp -r "backup@$BACKUP_SERVER:/backups/cerniq/config" /opt/cerniq/

# 4. Download Docker images or pull from registry
docker compose -f /opt/cerniq/docker-compose.etapa3.yml pull

# 5. Restore secrets
scp "backup@$BACKUP_SERVER:/backups/cerniq/secrets/*" /opt/cerniq/secrets/
chmod 600 /opt/cerniq/secrets/*

# 6. Restore database
./disaster-recovery-db.sh

# 7. Restore Redis state (if needed)
# Redis is ephemeral - queue jobs will be lost but will regenerate

# 8. Start services
docker compose -f /opt/cerniq/docker-compose.etapa3.yml up -d

# 9. Verify
sleep 60
./daily-morning-check.sh

echo "========================================"
echo "FULL SYSTEM RECOVERY COMPLETE"
echo "========================================"
```

---

## 8. Proceduri de Backup și Restore

### 8.1 Automated Backup Script

```bash
#!/bin/bash
# backup-all.sh
# Runs daily at 02:00

set -e

BACKUP_DATE=$(date +%Y%m%d)
BACKUP_DIR="/backup"
COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"
RETENTION_DAYS=30

echo "========================================"
echo "BACKUP STARTED: $BACKUP_DATE"
echo "========================================"

# 1. PostgreSQL Backup
echo ""
echo "=== PostgreSQL Backup ==="
PG_BACKUP="$BACKUP_DIR/postgresql/cerniq_${BACKUP_DATE}.sql.gz"
docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dumpall -U c3rn1q | gzip > "$PG_BACKUP"
echo "✅ PostgreSQL: $PG_BACKUP ($(du -h "$PG_BACKUP" | cut -f1))"

# 2. Redis Backup
echo ""
echo "=== Redis Backup ==="
docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli BGSAVE
sleep 5
REDIS_BACKUP="$BACKUP_DIR/redis/dump_${BACKUP_DATE}.rdb"
docker cp $(docker compose -f "$COMPOSE_FILE" ps -q redis):/data/dump.rdb "$REDIS_BACKUP"
echo "✅ Redis: $REDIS_BACKUP"

# 3. Configuration Backup
echo ""
echo "=== Configuration Backup ==="
CONFIG_BACKUP="$BACKUP_DIR/config/config_${BACKUP_DATE}.tar.gz"
tar -czf "$CONFIG_BACKUP" /opt/cerniq/*.yml /opt/cerniq/*.env /opt/cerniq/traefik/
echo "✅ Config: $CONFIG_BACKUP"

# 4. Logs Archive
echo ""
echo "=== Logs Archive ==="
LOGS_BACKUP="$BACKUP_DIR/logs/logs_${BACKUP_DATE}.tar.gz"
find /var/log/cerniq -name "*.log" -mtime -1 | tar -czf "$LOGS_BACKUP" -T -
echo "✅ Logs: $LOGS_BACKUP"

# 5. Upload to remote storage
echo ""
echo "=== Upload to Remote Storage ==="
rsync -avz --progress "$BACKUP_DIR/" "backup@backup.storage.box:/backups/cerniq/"
echo "✅ Remote backup complete"

# 6. Cleanup old backups
echo ""
echo "=== Cleanup Old Backups ==="
find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.rdb" -mtime +$RETENTION_DAYS -delete
echo "✅ Cleaned backups older than $RETENTION_DAYS days"

# 7. Verify backup integrity
echo ""
echo "=== Verify Backup Integrity ==="
gunzip -t "$PG_BACKUP" && echo "✅ PostgreSQL backup valid"

echo ""
echo "========================================"
echo "BACKUP COMPLETE"
echo "========================================"
```

### 8.2 Point-in-Time Recovery

```bash
#!/bin/bash
# point-in-time-recovery.sh <timestamp>
# Requires WAL archiving to be enabled

TARGET_TIME=$1

if [ -z "$TARGET_TIME" ]; then
    echo "Usage: $0 <timestamp>"
    echo "Example: $0 '2026-01-19 10:30:00'"
    exit 1
fi

echo "========================================"
echo "POINT-IN-TIME RECOVERY"
echo "Target: $TARGET_TIME"
echo "========================================"

# Stop PostgreSQL
docker compose -f "$COMPOSE_FILE" stop postgres

# Create recovery.conf
cat > /opt/cerniq/postgresql/recovery.conf << EOF
restore_command = 'cp /backup/postgresql/wal/%f %p'
recovery_target_time = '$TARGET_TIME'
recovery_target_action = 'promote'
EOF

# Copy latest base backup
# ... (implementation depends on backup strategy)

# Start PostgreSQL in recovery mode
docker compose -f "$COMPOSE_FILE" up -d postgres

echo "Waiting for recovery to complete..."
# Monitor recovery progress
# ...
```

---

## 9. Gestionarea Secretelor

> ⚠️ **IMPORTANT (Februarie 2026):** Acest runbook fost scris inițial pentru Docker secrets.
> **Management-ul secretelor a fost migrat la OpenBao** (vezi [ADR-0033](../../adr/ADR%20Etapa%200/ADR-0033-OpenBao-Secrets-Management.md)).
> 
> Pentru procedurile actualizate, consultă:
> - [openbao-setup-guide.md](../../infrastructure/openbao-setup-guide.md)
> - [secrets-rotation-procedure.md](../../infrastructure/secrets-rotation-procedure.md)
>
> Secțiunea de mai jos este păstrată ca **referință istorică**.

### 9.1 Secret Management Overview

```yaml
# DEPRECATED - Utilizați OpenBao pentru toate secretele
# Referință: docs/infrastructure/openbao-setup-guide.md
secrets_inventory:
  database:
    - name: db_password
      type: password
      rotation: 90 days
      storage: openbao  # Migrat de la docker_secret
      
  redis:
    - name: redis_password
      type: password
      rotation: 90 days
      storage: docker_secret
      
  llm_apis:
    - name: anthropic_api_key
      type: api_key
      rotation: on_demand
      storage: docker_secret
      
    - name: openai_api_key
      type: api_key
      rotation: on_demand
      storage: docker_secret
      
    - name: google_ai_api_key
      type: api_key
      rotation: on_demand
      storage: docker_secret
      
  external_apis:
    - name: anaf_certificate
      type: certificate
      rotation: yearly
      storage: docker_secret
      
    - name: oblio_api_key
      type: api_key
      rotation: on_demand
      storage: docker_secret
      
    - name: hunter_api_key
      type: api_key
      rotation: on_demand
      storage: docker_secret
      
    - name: termene_credentials
      type: credentials
      rotation: on_demand
      storage: docker_secret
      
  communication:
    - name: resend_api_key
      type: api_key
      rotation: on_demand
      storage: docker_secret
      
    - name: whatsapp_token
      type: token
      rotation: on_demand
      storage: docker_secret
```

### 9.2 Secret Rotation Procedure

```bash
#!/bin/bash
# rotate-secret.sh <secret_name>

SECRET_NAME=$1
COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"

if [ -z "$SECRET_NAME" ]; then
    echo "Usage: $0 <secret_name>"
    echo "Available secrets:"
    docker secret ls --format "{{.Name}}"
    exit 1
fi

echo "========================================"
echo "SECRET ROTATION: $SECRET_NAME"
echo "========================================"

# Backup current secret
echo "=== STEP 1: Backup Current Secret ==="
docker secret inspect "$SECRET_NAME" > "/backup/secrets/${SECRET_NAME}_$(date +%Y%m%d).json" 2>/dev/null
echo "✅ Backup created"

# Generate or input new secret
echo ""
echo "=== STEP 2: New Secret Value ==="
case $SECRET_NAME in
    "db_password"|"redis_password")
        NEW_VALUE=$(openssl rand -base64 32)
        echo "Generated new password"
        ;;
    *)
        read -sp "Enter new value for $SECRET_NAME: " NEW_VALUE
        echo ""
        ;;
esac

# Create new secret version
echo ""
echo "=== STEP 3: Create New Secret ==="
NEW_SECRET_NAME="${SECRET_NAME}_$(date +%Y%m%d)"
echo "$NEW_VALUE" | docker secret create "$NEW_SECRET_NAME" -
echo "✅ New secret created: $NEW_SECRET_NAME"

# Update service to use new secret
echo ""
echo "=== STEP 4: Update Services ==="

# Determine affected services
AFFECTED_SERVICES=""
case $SECRET_NAME in
    "db_password")
        AFFECTED_SERVICES="postgres api-gateway ai-agent-core negotiation-fsm"
        ;;
    "redis_password")
        AFFECTED_SERVICES="redis api-gateway ai-agent-core"
        ;;
    "anthropic_api_key")
        AFFECTED_SERVICES="ai-agent-core sentiment-intent guardrails-engine"
        ;;
    "anaf_certificate")
        AFFECTED_SERVICES="efactura-spv"
        ;;
    *)
        echo "Unknown service mapping for $SECRET_NAME"
        read -p "Enter affected services (space-separated): " AFFECTED_SERVICES
        ;;
esac

echo "Affected services: $AFFECTED_SERVICES"
read -p "Proceed with service update? (yes/no): " CONFIRM
[ "$CONFIRM" != "yes" ] && exit 0

# Rolling update of services
for service in $AFFECTED_SERVICES; do
    echo "Updating $service..."
    docker service update --secret-rm "$SECRET_NAME" --secret-add source="$NEW_SECRET_NAME",target="$SECRET_NAME" "$service"
done

# Verify
echo ""
echo "=== STEP 5: Verification ==="
sleep 30
./daily-morning-check.sh

# Cleanup old secret
echo ""
echo "=== STEP 6: Cleanup ==="
read -p "Remove old secret? (yes/no): " CLEANUP
if [ "$CLEANUP" == "yes" ]; then
    docker secret rm "$SECRET_NAME"
    docker secret create "$SECRET_NAME" - <<< "$NEW_VALUE"
    echo "✅ Secret $SECRET_NAME updated"
fi

echo ""
echo "========================================"
echo "SECRET ROTATION COMPLETE"
echo "========================================"
```

### 9.3 ANAF Certificate Management

```bash
#!/bin/bash
# manage-anaf-certificate.sh

echo "=== ANAF CERTIFICATE MANAGEMENT ==="

CERT_DIR="/opt/cerniq/certs"
CERT_FILE="$CERT_DIR/anaf.p12"

# Check current certificate
echo ""
echo "Current Certificate Status:"
if [ -f "$CERT_FILE" ]; then
    EXPIRY=$(openssl pkcs12 -in "$CERT_FILE" -nokeys -passin pass:$ANAF_CERT_PASSWORD 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
    DAYS_LEFT=$(( ($(date -d "$EXPIRY" +%s) - $(date +%s)) / 86400 ))
    
    echo "  Expires: $EXPIRY"
    echo "  Days remaining: $DAYS_LEFT"
    
    if [ "$DAYS_LEFT" -lt 30 ]; then
        echo "  ⚠️ WARNING: Certificate expires in less than 30 days!"
    fi
else
    echo "  ❌ Certificate file not found"
fi

# Options
echo ""
echo "Options:"
echo "1. Check certificate details"
echo "2. Install new certificate"
echo "3. Test ANAF connectivity"
echo "4. Export public key"

read -p "Select option (1-4): " OPTION

case $OPTION in
    1)
        openssl pkcs12 -in "$CERT_FILE" -nokeys -passin pass:$ANAF_CERT_PASSWORD 2>/dev/null | openssl x509 -text -noout
        ;;
    2)
        read -p "Path to new certificate (.p12): " NEW_CERT
        read -sp "Certificate password: " NEW_PASSWORD
        echo ""
        
        # Validate new certificate
        if openssl pkcs12 -in "$NEW_CERT" -passin pass:$NEW_PASSWORD -noout 2>/dev/null; then
            cp "$NEW_CERT" "$CERT_FILE"
            echo "$NEW_PASSWORD" | docker secret create anaf_cert_password_new -
            echo "✅ New certificate installed"
            echo "⚠️ Restart efactura-spv service to apply"
        else
            echo "❌ Invalid certificate or password"
        fi
        ;;
    3)
        echo "Testing ANAF SPV connectivity..."
        curl -s --cert "$CERT_FILE" --cert-type P12 --pass "$ANAF_CERT_PASSWORD" \
            "https://api.anaf.ro/prod/FCTEL/rest/listaMesajeFactura" \
            -H "Content-Type: application/json" \
            -d '{"zile": 1}'
        ;;
    4)
        openssl pkcs12 -in "$CERT_FILE" -clcerts -nokeys -passin pass:$ANAF_CERT_PASSWORD | openssl x509 -out "$CERT_DIR/anaf_public.crt"
        echo "✅ Public key exported to $CERT_DIR/anaf_public.crt"
        ;;
esac
```

---

## 10. Proceduri de Maintenance

### 10.1 Scheduled Maintenance Window

```bash
#!/bin/bash
# maintenance-mode.sh <enable|disable>

ACTION=$1
COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"

case $ACTION in
    "enable")
        echo "=== ENABLING MAINTENANCE MODE ==="
        
        # 1. Show maintenance page
        echo "Enabling maintenance page..."
        cp /opt/cerniq/traefik/maintenance.html /opt/cerniq/traefik/index.html
        docker compose -f "$COMPOSE_FILE" exec -T traefik traefik reload
        
        # 2. Pause queues
        echo "Pausing queues..."
        docker compose -f "$COMPOSE_FILE" exec -T api-gateway \
            node -e "
            const { Queue } = require('bullmq');
            const queues = ['ai-conversation', 'negotiation', 'efactura', 'document-gen'];
            queues.forEach(async (name) => {
                const q = new Queue(name);
                await q.pause();
            });
            "
        
        # 3. Drain active connections
        echo "Draining active connections..."
        sleep 30
        
        # 4. Send notifications
        echo "Sending maintenance notifications..."
        curl -X POST "$SLACK_WEBHOOK" -d "{
            \"text\": \"🔧 Maintenance mode ENABLED - System is undergoing maintenance\"
        }"
        
        echo "✅ Maintenance mode enabled"
        ;;
        
    "disable")
        echo "=== DISABLING MAINTENANCE MODE ==="
        
        # 1. Resume queues
        echo "Resuming queues..."
        docker compose -f "$COMPOSE_FILE" exec -T api-gateway \
            node -e "
            const { Queue } = require('bullmq');
            const queues = ['ai-conversation', 'negotiation', 'efactura', 'document-gen'];
            queues.forEach(async (name) => {
                const q = new Queue(name);
                await q.resume();
            });
            "
        
        # 2. Remove maintenance page
        echo "Removing maintenance page..."
        rm /opt/cerniq/traefik/index.html
        docker compose -f "$COMPOSE_FILE" exec -T traefik traefik reload
        
        # 3. Health check
        echo "Running health check..."
        sleep 10
        HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:64000/health")
        
        if [ "$HEALTH" == "200" ]; then
            echo "✅ System healthy"
        else
            echo "⚠️ Health check returned: $HEALTH"
        fi
        
        # 4. Send notifications
        curl -X POST "$SLACK_WEBHOOK" -d "{
            \"text\": \"✅ Maintenance complete - System is back online\"
        }"
        
        echo "✅ Maintenance mode disabled"
        ;;
        
    *)
        echo "Usage: $0 <enable|disable>"
        ;;
esac
```

### 10.2 Database Maintenance

```bash
#!/bin/bash
# db-maintenance.sh
# Run weekly during low-traffic hours

COMPOSE_FILE="/opt/cerniq/docker-compose.etapa3.yml"

echo "========================================"
echo "DATABASE MAINTENANCE"
echo "Started: $(date)"
echo "========================================"

# 1. Vacuum and Analyze
echo ""
echo "=== VACUUM ANALYZE ==="
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
    VACUUM (VERBOSE, ANALYZE);
"

# 2. Reindex
echo ""
echo "=== REINDEX ==="
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
    REINDEX DATABASE cerniq;
"

# 3. Update statistics
echo ""
echo "=== UPDATE STATISTICS ==="
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
    ANALYZE;
"

# 4. Check for bloat
echo ""
echo "=== BLOAT CHECK ==="
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
    SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as total_size,
        pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) as table_size,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename) - pg_relation_size(schemaname || '.' || tablename)) as index_size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
    LIMIT 20;
"

# 5. Archive old data
echo ""
echo "=== ARCHIVE OLD DATA ==="
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
    -- Archive conversations older than 90 days
    INSERT INTO conversations_archive 
    SELECT * FROM conversations 
    WHERE created_at < NOW() - INTERVAL '90 days'
    ON CONFLICT DO NOTHING;
    
    DELETE FROM conversations 
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND id IN (SELECT id FROM conversations_archive);
    
    -- Archive audit logs older than 180 days
    INSERT INTO audit_logs_archive 
    SELECT * FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '180 days'
    ON CONFLICT DO NOTHING;
    
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '180 days'
    AND id IN (SELECT id FROM audit_logs_archive);
"

# 6. Report
echo ""
echo "=== MAINTENANCE REPORT ==="
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
    SELECT 
        'Tables' as type, count(*) as count 
    FROM pg_tables WHERE schemaname = 'public'
    UNION ALL
    SELECT 
        'Indexes' as type, count(*) as count 
    FROM pg_indexes WHERE schemaname = 'public'
    UNION ALL
    SELECT 
        'Database Size' as type, 
        pg_size_pretty(pg_database_size('cerniq'))::text as count;
"

echo ""
echo "========================================"
echo "DATABASE MAINTENANCE COMPLETE"
echo "Finished: $(date)"
echo "========================================"
```

### 10.3 Container Maintenance

```bash
#!/bin/bash
# container-maintenance.sh

echo "=== CONTAINER MAINTENANCE ==="

# 1. Prune unused images
echo ""
echo "Pruning unused images..."
docker image prune -af --filter "until=168h"

# 2. Prune unused volumes
echo ""
echo "Pruning unused volumes..."
docker volume prune -f

# 3. Prune unused networks
echo ""
echo "Pruning unused networks..."
docker network prune -f

# 4. Clear build cache
echo ""
echo "Clearing build cache..."
docker builder prune -af --filter "until=168h"

# 5. Report disk usage
echo ""
echo "Docker disk usage:"
docker system df

echo ""
echo "✅ Container maintenance complete"
```

---

## 11. Gestionarea Incidentelor

### 11.1 Incident Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     INCIDENT LIFECYCLE                          │
└─────────────────────────────────────────────────────────────────┘

Detection              Triage               Resolution            Closure
    │                    │                      │                    │
    ▼                    ▼                      ▼                    ▼
┌─────────┐        ┌─────────┐           ┌─────────┐         ┌─────────┐
│ Alert   │───────▶│ Assess  │──────────▶│ Fix     │────────▶│ Review  │
│ Received│        │ Impact  │           │ Issue   │         │ & Close │
└─────────┘        └─────────┘           └─────────┘         └─────────┘
     │                  │                     │                    │
     ▼                  ▼                     ▼                    ▼
 - Monitor          - Severity           - Investigate        - Post-mortem
 - PagerDuty        - Assign             - Implement fix      - Documentation
 - User report      - Communicate        - Verify             - Improvements
```

### 11.2 Incident Response Template

```markdown
# Incident Report: INC-XXXX

## Summary
- **Date/Time**: 
- **Duration**: 
- **Severity**: P1/P2/P3/P4
- **Impact**: 

## Timeline
| Time | Event |
|------|-------|
| HH:MM | Alert triggered |
| HH:MM | Engineer responded |
| HH:MM | Root cause identified |
| HH:MM | Fix implemented |
| HH:MM | Verified resolved |

## Root Cause
[Description of root cause]

## Resolution
[What was done to resolve]

## Impact
- Users affected: 
- Duration: 
- Financial impact: 

## Action Items
- [ ] Item 1
- [ ] Item 2

## Lessons Learned
- 
```

### 11.3 Incident Command Script

```bash
#!/bin/bash
# incident-commander.sh

echo "========================================"
echo "INCIDENT COMMANDER CONSOLE"
echo "========================================"

# Create incident
create_incident() {
    INCIDENT_ID="INC-$(date +%Y%m%d%H%M)"
    echo "Created incident: $INCIDENT_ID"
    
    mkdir -p "/var/log/cerniq/incidents/$INCIDENT_ID"
    
    cat > "/var/log/cerniq/incidents/$INCIDENT_ID/report.md" << EOF
# Incident Report: $INCIDENT_ID

## Summary
- **Date/Time**: $(date)
- **Duration**: TBD
- **Severity**: TBD
- **Impact**: TBD

## Timeline
| Time | Event |
|------|-------|
| $(date +%H:%M) | Incident created |

## Root Cause
TBD

## Resolution
TBD
EOF

    export CURRENT_INCIDENT=$INCIDENT_ID
    echo "Incident file: /var/log/cerniq/incidents/$INCIDENT_ID/report.md"
}

# Add timeline entry
add_timeline() {
    if [ -z "$CURRENT_INCIDENT" ]; then
        echo "No active incident. Create one first."
        return
    fi
    
    read -p "Event description: " EVENT
    echo "| $(date +%H:%M) | $EVENT |" >> "/var/log/cerniq/incidents/$CURRENT_INCIDENT/report.md"
    echo "Timeline entry added"
}

# Capture system state
capture_state() {
    if [ -z "$CURRENT_INCIDENT" ]; then
        echo "No active incident. Create one first."
        return
    fi
    
    STATE_DIR="/var/log/cerniq/incidents/$CURRENT_INCIDENT/state_$(date +%H%M)"
    mkdir -p "$STATE_DIR"
    
    echo "Capturing system state..."
    
    # Service status
    docker compose -f "$COMPOSE_FILE" ps > "$STATE_DIR/services.txt"
    
    # Recent logs
    docker compose -f "$COMPOSE_FILE" logs --tail=500 > "$STATE_DIR/logs.txt" 2>&1
    
    # Queue status
    docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli INFO > "$STATE_DIR/redis.txt"
    
    # Database status
    docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U c3rn1q -c "
        SELECT * FROM pg_stat_activity;
    " > "$STATE_DIR/db_activity.txt"
    
    echo "State captured to: $STATE_DIR"
}

# Interactive menu
while true; do
    echo ""
    echo "Commands:"
    echo "  1. Create incident"
    echo "  2. Add timeline entry"
    echo "  3. Capture system state"
    echo "  4. View current incident"
    echo "  5. Close incident"
    echo "  q. Quit"
    
    read -p "Select: " CMD
    
    case $CMD in
        1) create_incident ;;
        2) add_timeline ;;
        3) capture_state ;;
        4) 
            if [ -n "$CURRENT_INCIDENT" ]; then
                cat "/var/log/cerniq/incidents/$CURRENT_INCIDENT/report.md"
            else
                echo "No active incident"
            fi
            ;;
        5)
            if [ -n "$CURRENT_INCIDENT" ]; then
                add_timeline "Incident closed"
                unset CURRENT_INCIDENT
                echo "Incident closed"
            fi
            ;;
        q) exit 0 ;;
    esac
done
```

---

## 12. Comunicare și Notificări

### 12.1 Notification Configuration

```yaml
# notification-config.yml

channels:
  slack:
    webhook_url: "${SLACK_WEBHOOK_URL}"
    channels:
      critical: "#incidents-critical"
      warning: "#incidents"
      info: "#ops-notifications"
      deployments: "#deployments"
      
  email:
    smtp_host: "smtp.resend.com"
    smtp_port: 443
    from: "ops@cerniq.app"
    recipients:
      critical:
        - oncall@cerniq.app
        - management@cerniq.app
      warning:
        - devops@cerniq.app
      info:
        - team@cerniq.app
        
  pagerduty:
    api_key: "${PAGERDUTY_API_KEY}"
    services:
      critical: "P123456"
      high: "P234567"
      
  sms:
    provider: "twilio"
    from: "+40700000000"
    recipients:
      critical:
        - "+40700000001"
        - "+40700000002"

notification_rules:
  - name: "System Down"
    condition: "service_status == 'down'"
    severity: "critical"
    channels: ["slack", "pagerduty", "sms", "email"]
    
  - name: "High Error Rate"
    condition: "error_rate > 5%"
    severity: "warning"
    channels: ["slack", "email"]
    
  - name: "Deployment"
    condition: "event_type == 'deployment'"
    severity: "info"
    channels: ["slack"]
```

### 12.2 Notification Scripts

```bash
#!/bin/bash
# notify.sh <severity> <message>

SEVERITY=$1
MESSAGE=$2

send_slack() {
    local CHANNEL=$1
    local MSG=$2
    local COLOR=$3
    
    curl -X POST "$SLACK_WEBHOOK" -d "{
        \"channel\": \"$CHANNEL\",
        \"attachments\": [{
            \"color\": \"$COLOR\",
            \"text\": \"$MSG\",
            \"footer\": \"Cerniq Ops | $(date)\",
            \"mrkdwn_in\": [\"text\"]
        }]
    }"
}

send_email() {
    local TO=$1
    local SUBJECT=$2
    local BODY=$3
    
    curl -X POST "https://api.resend.com/emails" \
        -H "Authorization: Bearer $RESEND_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"from\": \"ops@cerniq.app\",
            \"to\": \"$TO\",
            \"subject\": \"$SUBJECT\",
            \"text\": \"$BODY\"
        }"
}

send_pagerduty() {
    local SERVICE=$1
    local TITLE=$2
    
    curl -X POST "https://api.pagerduty.com/incidents" \
        -H "Authorization: Token token=$PAGERDUTY_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"incident\": {
                \"type\": \"incident\",
                \"title\": \"$TITLE\",
                \"service\": {\"id\": \"$SERVICE\", \"type\": \"service_reference\"},
                \"urgency\": \"high\"
            }
        }"
}

case $SEVERITY in
    "critical")
        send_slack "#incidents-critical" "🔴 CRITICAL: $MESSAGE" "danger"
        send_email "oncall@cerniq.app" "🔴 CRITICAL: Cerniq Alert" "$MESSAGE"
        send_pagerduty "$PAGERDUTY_CRITICAL_SERVICE" "$MESSAGE"
        ;;
    "warning")
        send_slack "#incidents" "⚠️ WARNING: $MESSAGE" "warning"
        send_email "devops@cerniq.app" "⚠️ WARNING: Cerniq Alert" "$MESSAGE"
        ;;
    "info")
        send_slack "#ops-notifications" "ℹ️ INFO: $MESSAGE" "good"
        ;;
esac
```

### 12.3 Status Page Updates

```bash
#!/bin/bash
# update-status-page.sh <component> <status> [message]

COMPONENT=$1
STATUS=$2
MESSAGE=$3

# Status page API (example: Statuspage.io)
STATUS_PAGE_API="https://api.statuspage.io/v1"
PAGE_ID="${STATUSPAGE_PAGE_ID}"
API_KEY="${STATUSPAGE_API_KEY}"

# Map component to ID
case $COMPONENT in
    "api") COMPONENT_ID="abc123" ;;
    "ai-agent") COMPONENT_ID="def456" ;;
    "efactura") COMPONENT_ID="ghi789" ;;
    "database") COMPONENT_ID="jkl012" ;;
    *) echo "Unknown component: $COMPONENT"; exit 1 ;;
esac

# Map status
case $STATUS in
    "operational") STATUS_CODE="operational" ;;
    "degraded") STATUS_CODE="degraded_performance" ;;
    "partial") STATUS_CODE="partial_outage" ;;
    "major") STATUS_CODE="major_outage" ;;
    *) echo "Unknown status: $STATUS"; exit 1 ;;
esac

# Update component status
curl -X PATCH "$STATUS_PAGE_API/pages/$PAGE_ID/components/$COMPONENT_ID" \
    -H "Authorization: OAuth $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"component\": {\"status\": \"$STATUS_CODE\"}}"

# Create incident if not operational
if [ "$STATUS" != "operational" ] && [ -n "$MESSAGE" ]; then
    curl -X POST "$STATUS_PAGE_API/pages/$PAGE_ID/incidents" \
        -H "Authorization: OAuth $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"incident\": {
                \"name\": \"$MESSAGE\",
                \"status\": \"investigating\",
                \"impact_override\": \"minor\",
                \"component_ids\": [\"$COMPONENT_ID\"],
                \"body\": \"We are investigating an issue with $COMPONENT.\"
            }
        }"
fi

echo "Status page updated: $COMPONENT -> $STATUS"
```

---

## 13. Checklist-uri Operaționale

### 13.1 Daily Operations Checklist

```markdown
## Daily Operations Checklist

### Morning (08:00)
- [ ] Review overnight alerts in Slack
- [ ] Check PagerDuty for unacknowledged incidents
- [ ] Run morning health check script
- [ ] Review queue depths and failed jobs
- [ ] Check HITL pending approvals
- [ ] Verify backup completion from previous night

### Midday (12:00)
- [ ] Review error logs for anomalies
- [ ] Check LLM API usage and quotas
- [ ] Monitor e-Factura submission status
- [ ] Review active negotiations count

### Evening (18:00)
- [ ] Review daily metrics dashboard
- [ ] Check disk space and resource usage
- [ ] Verify scheduled jobs ran successfully
- [ ] Handoff notes to on-call if needed
```

### 13.2 Weekly Operations Checklist

```markdown
## Weekly Operations Checklist

### Monday
- [ ] Review previous week's incidents
- [ ] Check certificate expiration dates
- [ ] Review security scan results
- [ ] Update on-call rotation

### Wednesday
- [ ] Run database maintenance
- [ ] Review performance metrics trends
- [ ] Check backup integrity
- [ ] Review API rate limits usage

### Friday
- [ ] Generate weekly operations report
- [ ] Review pending HITL approvals
- [ ] Check for pending updates/patches
- [ ] Prepare weekend on-call briefing
```

### 13.3 Deployment Checklist

```markdown
## Deployment Checklist

### Pre-Deployment
- [ ] Code review completed and approved
- [ ] All CI/CD tests passing
- [ ] Security scan completed
- [ ] Staging deployment verified
- [ ] Database migrations tested
- [ ] Rollback plan prepared
- [ ] Communication sent to team

### During Deployment
- [ ] Pre-deployment backup created
- [ ] Maintenance mode enabled (if needed)
- [ ] Images pulled successfully
- [ ] Migrations applied
- [ ] Services updated
- [ ] Health checks passing
- [ ] Smoke tests passed

### Post-Deployment
- [ ] All services running
- [ ] No new errors in logs
- [ ] Metrics within normal range
- [ ] User-facing functionality verified
- [ ] Deployment logged
- [ ] Team notified of completion
```

### 13.4 Incident Response Checklist

```markdown
## Incident Response Checklist

### Detection (0-5 minutes)
- [ ] Alert acknowledged
- [ ] Initial assessment performed
- [ ] Severity determined
- [ ] Incident created in tracking system
- [ ] Incident commander assigned

### Triage (5-15 minutes)
- [ ] Impact scope determined
- [ ] Affected services identified
- [ ] Initial communication sent
- [ ] Relevant team members notified
- [ ] War room/channel created if needed

### Investigation (15+ minutes)
- [ ] System state captured
- [ ] Logs analyzed
- [ ] Recent changes reviewed
- [ ] Root cause hypothesized
- [ ] Fix or workaround identified

### Resolution
- [ ] Fix implemented
- [ ] Fix verified in production
- [ ] All systems healthy
- [ ] Monitoring confirms resolution
- [ ] Status page updated

### Closure
- [ ] Final communication sent
- [ ] Incident report completed
- [ ] Post-mortem scheduled (P1/P2)
- [ ] Action items created
- [ ] Lessons learned documented
```

### 13.5 On-Call Handoff Checklist

```markdown
## On-Call Handoff Checklist

### Outgoing On-Call
- [ ] Document any ongoing issues
- [ ] Note any expected alerts
- [ ] List pending deployments
- [ ] Highlight any known risks
- [ ] Update runbooks if needed
- [ ] Brief incoming on-call

### Incoming On-Call
- [ ] Verify access to all systems
- [ ] Confirm PagerDuty notifications working
- [ ] Review ongoing issues from previous shift
- [ ] Check scheduled maintenance windows
- [ ] Verify escalation contacts are current
- [ ] Test alert response path
```

---

## 14. Anexe și Referințe

### 14.1 Documente Conexe

| Document | Descriere | Locație |
|----------|-----------|---------|
| Master Specification | Specificație generală sistem | `/mnt/project/__Cerniq_Master_Spec_Normativ_Complet.md` |
| Monitoring Runbook | Proceduri monitoring | `etapa3-runbook-monitoring.md` |
| Infrastructure Docs | Documentație infrastructură | `/mnt/project/CERNIQ_APP_Infrastructure_Documentation.md` |
| Backup Strategy | Strategie backup | `/mnt/project/backup-strategy.md` |
| Coding Standards | Standarde dezvoltare | `/mnt/project/coding-standards.md` |

### 14.2 Comenzi Utile Rapide

```bash
# Status rapid
docker compose -f /opt/cerniq/docker-compose.etapa3.yml ps

# Logs unui serviciu
docker compose -f /opt/cerniq/docker-compose.etapa3.yml logs -f <service>

# Restart un serviciu
docker compose -f /opt/cerniq/docker-compose.etapa3.yml restart <service>

# Conexiune PostgreSQL
docker compose -f /opt/cerniq/docker-compose.etapa3.yml exec -it postgres psql -U c3rn1q

# Conexiune Redis
docker compose -f /opt/cerniq/docker-compose.etapa3.yml exec -it redis redis-cli

# Queue status
docker compose -f /opt/cerniq/docker-compose.etapa3.yml exec redis redis-cli KEYS "bull:*"

# Health check
curl -s http://localhost:64000/health | jq

# Recent errors
docker compose logs --since="1h" 2>&1 | grep -i error

# Disk usage
df -h / /var/lib/docker /backup
```

### 14.3 Resurse Externe

- **Docker Documentation**: https://docs.docker.com/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Redis Documentation**: https://redis.io/docs/
- **BullMQ Documentation**: https://docs.bullmq.io/
- **Anthropic API Documentation**: https://docs.anthropic.com/
- **ANAF SPV Documentation**: https://www.anaf.ro/anaf/internet/ANAF/despre_anaf/declaratii_electronice/

### 14.4 Changelog

| Versiune | Data | Modificări |
|----------|------|------------|
| 1.0.0 | 2026-01-19 | Versiune inițială completă |

---

**Document generat pentru Cerniq App - Etapa 3**
**Ultima actualizare: 2026-01-19**
