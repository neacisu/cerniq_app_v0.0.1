#!/bin/bash
# =============================================================================
# CERNIQ.APP — Remote Infrastructure Validation Script
# =============================================================================
# Purpose: Validate Docker infrastructure on remote servers
# Run: ./validate-infrastructure.sh [staging|production]
# CI: Called automatically after deployment
#
# Exit codes:
#   0 - All validations passed
#   1 - Validation failed
#
# Reference: E0-S2-PR01 F0.1 Docker Base + Validations
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ENVIRONMENT="${1:-staging}"
PASSED=0
FAILED=0
SKIPPED=0

# =============================================================================
# Helper Functions
# =============================================================================

log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    PASSED=$((PASSED + 1))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    FAILED=$((FAILED + 1))
}

log_skip() {
    echo -e "${YELLOW}[SKIP]${NC} $1"
    SKIPPED=$((SKIPPED + 1))
}

# =============================================================================
# F0.1.1.T001: Docker Engine Installation
# =============================================================================

echo ""
echo "=============================================="
echo "F0.1.1.T001: Docker Engine Installation"
echo "=============================================="

# Test: Docker Engine version 28.x+
log_test "Docker Engine version >= 28.x"
DOCKER_VERSION=$(docker version --format "{{.Server.Version}}" 2>/dev/null || echo "0.0.0")
DOCKER_MAJOR=$(echo "$DOCKER_VERSION" | cut -d. -f1)
if [[ "$DOCKER_MAJOR" -ge 28 ]]; then
    log_pass "Docker Engine $DOCKER_VERSION installed"
else
    log_fail "Docker Engine $DOCKER_VERSION < 28.x required"
fi

# Test: Docker Compose version
log_test "Docker Compose v2.20+"
COMPOSE_VERSION=$(docker compose version --short 2>/dev/null | sed 's/v//' || echo "0.0.0")
COMPOSE_MAJOR=$(echo "$COMPOSE_VERSION" | cut -d. -f1)
COMPOSE_MINOR=$(echo "$COMPOSE_VERSION" | cut -d. -f2)
if [[ "$COMPOSE_MAJOR" -ge 2 ]] && [[ "$COMPOSE_MINOR" -ge 20 || "$COMPOSE_MAJOR" -gt 2 ]]; then
    log_pass "Docker Compose v$COMPOSE_VERSION installed"
else
    log_fail "Docker Compose v$COMPOSE_VERSION < 2.20 required"
fi

# Test: Docker service running
log_test "Docker service is running"
if systemctl is-active docker &>/dev/null; then
    log_pass "Docker service is active"
else
    log_fail "Docker service is not running"
fi

# =============================================================================
# F0.1.1.T002: daemon.json Configuration
# =============================================================================

echo ""
echo "=============================================="
echo "F0.1.1.T002: daemon.json Configuration"
echo "=============================================="

DAEMON_FILE="/etc/docker/daemon.json"

# Test: daemon.json exists
log_test "daemon.json exists"
if [[ -f "$DAEMON_FILE" ]]; then
    log_pass "daemon.json exists at $DAEMON_FILE"
else
    log_fail "daemon.json not found at $DAEMON_FILE"
fi

# Test: Storage driver is overlay2
log_test "Storage driver is overlay2"
STORAGE_DRIVER=$(docker info --format '{{.Driver}}' 2>/dev/null || echo "unknown")
if [[ "$STORAGE_DRIVER" == "overlay2" ]]; then
    log_pass "Storage driver: overlay2"
else
    log_fail "Storage driver: $STORAGE_DRIVER (expected overlay2)"
fi

# Test: Live restore enabled
log_test "Live restore is enabled"
LIVE_RESTORE=$(docker info --format '{{.LiveRestoreEnabled}}' 2>/dev/null || echo "false")
if [[ "$LIVE_RESTORE" == "true" ]]; then
    log_pass "Live restore enabled"
else
    log_fail "Live restore disabled"
fi

# Test: Log driver is json-file
log_test "Log driver is json-file"
LOG_DRIVER=$(docker info --format '{{.LoggingDriver}}' 2>/dev/null || echo "unknown")
if [[ "$LOG_DRIVER" == "json-file" ]]; then
    log_pass "Log driver: json-file"
else
    log_fail "Log driver: $LOG_DRIVER (expected json-file)"
fi

# Test: Metrics endpoint configured
log_test "Metrics endpoint configured"
if [[ -f "$DAEMON_FILE" ]]; then
    METRICS=$(grep -o '"metrics-addr"' "$DAEMON_FILE" 2>/dev/null || echo "")
    if [[ -n "$METRICS" ]]; then
        log_pass "Metrics endpoint configured"
    else
        log_skip "Metrics endpoint not found in daemon.json"
    fi
else
    log_skip "Cannot check metrics - daemon.json missing"
fi

# =============================================================================
# F0.1.2.T001: Docker Networks
# =============================================================================

echo ""
echo "=============================================="
echo "F0.1.2.T001: Docker Networks"
echo "=============================================="

# Test: cerniq_public network exists
log_test "cerniq_public network exists"
if docker network inspect cerniq_public &>/dev/null; then
    log_pass "cerniq_public network exists"
else
    log_fail "cerniq_public network missing"
fi

# Test: cerniq_backend network exists
log_test "cerniq_backend network exists"
if docker network inspect cerniq_backend &>/dev/null; then
    log_pass "cerniq_backend network exists"
else
    log_fail "cerniq_backend network missing"
fi

# Test: cerniq_data network exists
log_test "cerniq_data network exists"
if docker network inspect cerniq_data &>/dev/null; then
    log_pass "cerniq_data network exists"
else
    log_fail "cerniq_data network missing"
fi

# Test: cerniq_public subnet is 172.29.10.0/24
log_test "cerniq_public subnet is 172.29.10.0/24"
PUBLIC_SUBNET=$(docker network inspect cerniq_public --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null || echo "")
if [[ "$PUBLIC_SUBNET" == "172.29.10.0/24" ]]; then
    log_pass "cerniq_public subnet: $PUBLIC_SUBNET"
else
    log_fail "cerniq_public subnet: $PUBLIC_SUBNET (expected 172.29.10.0/24)"
fi

# Test: cerniq_backend subnet is 172.29.20.0/24
log_test "cerniq_backend subnet is 172.29.20.0/24"
BACKEND_SUBNET=$(docker network inspect cerniq_backend --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null || echo "")
if [[ "$BACKEND_SUBNET" == "172.29.20.0/24" ]]; then
    log_pass "cerniq_backend subnet: $BACKEND_SUBNET"
else
    log_fail "cerniq_backend subnet: $BACKEND_SUBNET (expected 172.29.20.0/24)"
fi

# Test: cerniq_data subnet is 172.29.30.0/24
log_test "cerniq_data subnet is 172.29.30.0/24"
DATA_SUBNET=$(docker network inspect cerniq_data --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null || echo "")
if [[ "$DATA_SUBNET" == "172.29.30.0/24" ]]; then
    log_pass "cerniq_data subnet: $DATA_SUBNET"
else
    log_fail "cerniq_data subnet: $DATA_SUBNET (expected 172.29.30.0/24)"
fi

# Test: cerniq_public is NOT internal
log_test "cerniq_public is external (not internal)"
PUBLIC_INTERNAL=$(docker network inspect cerniq_public --format '{{.Internal}}' 2>/dev/null || echo "true")
if [[ "$PUBLIC_INTERNAL" == "false" ]]; then
    log_pass "cerniq_public is external"
else
    log_fail "cerniq_public is internal (should be external)"
fi

# Test: cerniq_backend is internal
log_test "cerniq_backend is internal"
BACKEND_INTERNAL=$(docker network inspect cerniq_backend --format '{{.Internal}}' 2>/dev/null || echo "false")
if [[ "$BACKEND_INTERNAL" == "true" ]]; then
    log_pass "cerniq_backend is internal"
else
    log_fail "cerniq_backend is not internal"
fi

# Test: cerniq_data is internal
log_test "cerniq_data is internal"
DATA_INTERNAL=$(docker network inspect cerniq_data --format '{{.Internal}}' 2>/dev/null || echo "false")
if [[ "$DATA_INTERNAL" == "true" ]]; then
    log_pass "cerniq_data is internal"
else
    log_fail "cerniq_data is not internal"
fi

# =============================================================================
# F0.1.1.T003: /opt/cerniq Directory Structure
# =============================================================================

echo ""
echo "=============================================="
echo "F0.1.1.T003: /opt/cerniq Directory Structure"
echo "=============================================="

# Test: /opt/cerniq exists
log_test "/opt/cerniq directory exists"
if [[ -d "/opt/cerniq" ]]; then
    log_pass "/opt/cerniq exists"
else
    log_fail "/opt/cerniq missing"
fi

# Test: /opt/cerniq/scripts exists
log_test "/opt/cerniq/scripts directory exists"
if [[ -d "/opt/cerniq/scripts" ]]; then
    log_pass "/opt/cerniq/scripts exists"
else
    log_fail "/opt/cerniq/scripts missing"
fi

# Test: /opt/cerniq/secrets exists
log_test "/opt/cerniq/secrets directory exists"
if [[ -d "/opt/cerniq/secrets" ]]; then
    log_pass "/opt/cerniq/secrets exists"
else
    log_fail "/opt/cerniq/secrets missing"
fi

# Test: /opt/cerniq/config exists
log_test "/opt/cerniq/config directory exists"
if [[ -d "/opt/cerniq/config" ]]; then
    log_pass "/opt/cerniq/config exists"
else
    log_fail "/opt/cerniq/config missing"
fi

# Test: docker-compose.yml exists
log_test "docker-compose.yml exists in /opt/cerniq"
if [[ -f "/opt/cerniq/docker-compose.yml" ]]; then
    log_pass "docker-compose.yml exists"
else
    log_fail "docker-compose.yml missing"
fi

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "=============================================="
echo "F0.2.1: External PostgreSQL (CT107) Connectivity"
echo "=============================================="

PG_HOST="${PG_HOST:-10.0.1.107}"
PG_PORT="${PG_PORT:-5432}"
PG_DB="${PG_DB:-cerniq}"
PG_USER="${PG_USER:-c3rn1q}"
PG_PASS_FILE="/opt/cerniq/secrets/postgres_password.txt"
PG_PASS=""
if [[ -f "$PG_PASS_FILE" ]]; then
    PG_PASS=$(cat "$PG_PASS_FILE")
else
    log_fail "Postgres password file not found at $PG_PASS_FILE"
fi

# Test: PostgreSQL CT107 is reachable from host
log_test "PostgreSQL CT107 reachable (${PG_HOST}:${PG_PORT})"
if timeout 5 bash -lc "cat < /dev/null > /dev/tcp/${PG_HOST}/${PG_PORT}" 2>/dev/null; then
    log_pass "PostgreSQL reachable at ${PG_HOST}:${PG_PORT}"
else
    log_fail "Cannot reach PostgreSQL at ${PG_HOST}:${PG_PORT}"
fi

# Test: PgBouncer container can reach external PostgreSQL
log_test "PgBouncer can reach external PostgreSQL"
if docker exec cerniq-pgbouncer pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" >/dev/null 2>&1; then
    log_pass "PgBouncer reaches external PostgreSQL"
else
    log_fail "PgBouncer cannot reach external PostgreSQL"
fi

echo ""
echo "=============================================="
echo "F0.2.2: PgBouncer Connection Pooling"
echo "=============================================="

# Test: PgBouncer container exists and is running
log_test "cerniq-pgbouncer container is running"
PGB_RUNNING=$(docker inspect -f '{{.State.Running}}' cerniq-pgbouncer 2>/dev/null || echo "false")
if [[ "$PGB_RUNNING" == "true" ]]; then
    log_pass "cerniq-pgbouncer is running"
else
    log_fail "cerniq-pgbouncer is not running"
fi

# Test: PgBouncer is healthy
log_test "cerniq-pgbouncer is healthy"
PGB_HEALTH=$(docker inspect -f '{{.State.Health.Status}}' cerniq-pgbouncer 2>/dev/null || echo "unhealthy")
if [[ "$PGB_HEALTH" == "healthy" ]]; then
    log_pass "cerniq-pgbouncer is healthy"
else
    log_fail "cerniq-pgbouncer is not healthy: $PGB_HEALTH"
fi

# Test: PgBouncer is accepting connections
log_test "PgBouncer is accepting connections"
PGB_READY=$(docker exec cerniq-pgbouncer pg_isready -h localhost -p 64033 -U c3rn1q 2>&1 || echo "failed")
if [[ "$PGB_READY" == *"accepting connections"* ]]; then
    log_pass "PgBouncer is accepting connections"
else
    log_fail "PgBouncer is not accepting connections"
fi

# =============================================================================
# F0.3.1: Redis 8.4.0 + BullMQ Configuration
# =============================================================================
# Reference: ADR-0006, etapa0-port-matrix.md
# =============================================================================

echo ""
echo "=============================================="
echo "F0.3.1: Redis 8.4.0 + BullMQ Setup"
echo "=============================================="

# Redis configuration (per ADR-0006, etapa0-port-matrix.md)
REDIS_PORT="64039"
REDIS_CONTAINER="cerniq-redis"
REDIS_PASS_FILE="/opt/cerniq/secrets/redis_password.txt"

# Get Redis password for auth
if [[ -f "$REDIS_PASS_FILE" ]]; then
    REDIS_PASS=$(cat "$REDIS_PASS_FILE")
    REDIS_AUTH="-a $REDIS_PASS"
else
    REDIS_AUTH=""
    log_skip "Redis password file not found at $REDIS_PASS_FILE"
fi

# Test: Redis container exists and is running
log_test "cerniq-redis container is running"
REDIS_RUNNING=$(docker inspect -f '{{.State.Running}}' $REDIS_CONTAINER 2>/dev/null || echo "false")
if [[ "$REDIS_RUNNING" == "true" ]]; then
    log_pass "cerniq-redis is running"
else
    log_fail "cerniq-redis is not running"
fi

# Test: Redis is healthy
log_test "cerniq-redis is healthy"
REDIS_HEALTH=$(docker inspect -f '{{.State.Health.Status}}' $REDIS_CONTAINER 2>/dev/null || echo "unhealthy")
if [[ "$REDIS_HEALTH" == "healthy" ]]; then
    log_pass "cerniq-redis is healthy"
else
    log_fail "cerniq-redis is not healthy: $REDIS_HEALTH"
fi

# Test: Redis responds to PING
log_test "Redis responds to PING on port $REDIS_PORT"
REDIS_PONG=$(docker exec $REDIS_CONTAINER redis-cli -p $REDIS_PORT $REDIS_AUTH ping 2>/dev/null || echo "")
if [[ "$REDIS_PONG" == "PONG" ]]; then
    log_pass "Redis responds: PONG"
else
    log_fail "Redis does not respond to PING"
fi

# Test: Redis version is 8.x
log_test "Redis version is 8.x"
REDIS_VERSION=$(docker exec $REDIS_CONTAINER redis-cli -p $REDIS_PORT $REDIS_AUTH INFO server 2>/dev/null | grep redis_version | cut -d: -f2 | tr -d '\r' || echo "0")
if [[ "$REDIS_VERSION" == 8.* ]]; then
    log_pass "Redis version: $REDIS_VERSION"
else
    log_fail "Redis version: $REDIS_VERSION (expected 8.x)"
fi

# Test: maxmemory-policy is noeviction (CRITICAL for BullMQ)
log_test "maxmemory-policy is noeviction (BullMQ CRITICAL)"
REDIS_POLICY=$(docker exec $REDIS_CONTAINER redis-cli -p $REDIS_PORT $REDIS_AUTH CONFIG GET maxmemory-policy 2>/dev/null | tail -1 || echo "")
if [[ "$REDIS_POLICY" == "noeviction" ]]; then
    log_pass "maxmemory-policy: noeviction"
else
    log_fail "maxmemory-policy: $REDIS_POLICY (MUST be noeviction for BullMQ!)"
fi

# Test: maxmemory is at least 8GB
log_test "maxmemory >= 8GB (per ADR-0006)"
REDIS_MAXMEM=$(docker exec $REDIS_CONTAINER redis-cli -p $REDIS_PORT $REDIS_AUTH CONFIG GET maxmemory 2>/dev/null | tail -1 || echo "0")
# 8GB = 8589934592 bytes
if [[ "$REDIS_MAXMEM" -ge 8000000000 ]]; then
    MAXMEM_GB=$((REDIS_MAXMEM / 1073741824))
    log_pass "maxmemory: ${MAXMEM_GB}GB"
else
    log_fail "maxmemory: $REDIS_MAXMEM bytes (expected >= 8GB)"
fi

# Test: appendonly is enabled
log_test "appendonly is enabled (persistence)"
REDIS_APPENDONLY=$(docker exec $REDIS_CONTAINER redis-cli -p $REDIS_PORT $REDIS_AUTH CONFIG GET appendonly 2>/dev/null | tail -1 || echo "")
if [[ "$REDIS_APPENDONLY" == "yes" ]]; then
    log_pass "appendonly: yes"
else
    log_fail "appendonly: $REDIS_APPENDONLY (expected yes)"
fi

# Test: notify-keyspace-events includes E (for BullMQ delayed jobs)
log_test "notify-keyspace-events configured for BullMQ"
REDIS_EVENTS=$(docker exec $REDIS_CONTAINER redis-cli -p $REDIS_PORT $REDIS_AUTH CONFIG GET notify-keyspace-events 2>/dev/null | tail -1 || echo "")
if [[ "$REDIS_EVENTS" == *"E"* ]]; then
    log_pass "notify-keyspace-events: $REDIS_EVENTS"
else
    log_fail "notify-keyspace-events: $REDIS_EVENTS (must include 'E' for BullMQ)"
fi

# Test: Redis on cerniq_data network
log_test "Redis on cerniq_data network (172.29.30.20)"
REDIS_DATA_IP=$(docker inspect -f '{{(index .NetworkSettings.Networks "cerniq_data").IPAddress}}' $REDIS_CONTAINER 2>/dev/null || echo "")
if [[ "$REDIS_DATA_IP" == "172.29.30.20" ]]; then
    log_pass "Redis on cerniq_data: $REDIS_DATA_IP"
else
    log_fail "Redis cerniq_data IP: $REDIS_DATA_IP (expected 172.29.30.20)"
fi

# Test: Redis on cerniq_backend network
log_test "Redis on cerniq_backend network (172.29.20.20)"
REDIS_BACKEND_IP=$(docker inspect -f '{{(index .NetworkSettings.Networks "cerniq_backend").IPAddress}}' $REDIS_CONTAINER 2>/dev/null || echo "")
if [[ "$REDIS_BACKEND_IP" == "172.29.20.20" ]]; then
    log_pass "Redis on cerniq_backend: $REDIS_BACKEND_IP"
else
    log_fail "Redis cerniq_backend IP: $REDIS_BACKEND_IP (expected 172.29.20.20)"
fi

# Test: Redis AUTH is required
log_test "Redis AUTH is enabled (security)"
REDIS_NOAUTH=$(docker exec $REDIS_CONTAINER redis-cli -p $REDIS_PORT ping 2>&1 || echo "")
if [[ "$REDIS_NOAUTH" == *"NOAUTH"* ]]; then
    log_pass "Redis requires authentication"
else
    log_fail "Redis does not require authentication (security risk!)"
fi

# =============================================================================
# F0.4.1: External Ingress Validation (Orchestrator Traefik)
# =============================================================================
# Internal Traefik was removed from the application stack. Ingress is validated
# by checking public domains routed by the orchestrator Traefik instance.
# =============================================================================

echo ""
echo "=============================================="
echo "F0.4.1: External Ingress Validation"
echo "=============================================="

# Test: External HTTPS endpoint (staging/production only)
if [[ "$ENVIRONMENT" == "staging" ]]; then
    log_test "staging.cerniq.app HTTPS responds"
    HTTPS_RESPONSE=$(curl -s -o /dev/null -w '%{http_code}' -k https://staging.cerniq.app 2>/dev/null || echo "000")
    if [[ "$HTTPS_RESPONSE" =~ ^(200|302|404)$ ]]; then
        log_pass "staging.cerniq.app HTTPS: $HTTPS_RESPONSE"
    else
        log_fail "staging.cerniq.app HTTPS not responding: $HTTPS_RESPONSE"
    fi
    
    log_test "HSTS header present on staging"
    HSTS_HEADER=$(curl -sI -k https://staging.cerniq.app 2>/dev/null | grep -i strict-transport-security || echo "")
    if [[ -n "$HSTS_HEADER" ]]; then
        log_pass "HSTS header present"
    else
        log_skip "HSTS header not found (may be added by external proxy)"
    fi
fi

if [[ "$ENVIRONMENT" == "production" ]]; then
    log_test "cerniq.app HTTPS responds"
    HTTPS_RESPONSE=$(curl -s -o /dev/null -w '%{http_code}' -k https://cerniq.app 2>/dev/null || echo "000")
    if [[ "$HTTPS_RESPONSE" =~ ^(200|302|404)$ ]]; then
        log_pass "cerniq.app HTTPS: $HTTPS_RESPONSE"
    else
        log_fail "cerniq.app HTTPS not responding: $HTTPS_RESPONSE"
    fi
fi

echo ""
echo "=============================================="
echo "VALIDATION SUMMARY"
echo "=============================================="
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "Passed:  ${GREEN}$PASSED${NC}"
echo -e "Failed:  ${RED}$FAILED${NC}"
echo -e "Skipped: ${YELLOW}$SKIPPED${NC}"
echo "=============================================="

# Output JSON for CI parsing
cat << EOF > /tmp/validation-results.json
{
  "environment": "$ENVIRONMENT",
  "timestamp": "$(date -Iseconds)",
  "results": {
    "passed": $PASSED,
    "failed": $FAILED,
    "skipped": $SKIPPED
  },
  "success": $([ "$FAILED" -eq 0 ] && echo "true" || echo "false")
}
EOF

echo ""
echo "Results saved to: /tmp/validation-results.json"

# Exit with error if any tests failed
if [[ "$FAILED" -gt 0 ]]; then
    echo -e "\n${RED}❌ VALIDATION FAILED${NC}"
    exit 1
else
    echo -e "\n${GREEN}✅ ALL VALIDATIONS PASSED${NC}"
    exit 0
fi
