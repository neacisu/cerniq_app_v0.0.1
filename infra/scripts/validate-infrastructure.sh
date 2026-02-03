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

# Test: cerniq_public subnet is 172.27.0.0/24
log_test "cerniq_public subnet is 172.27.0.0/24"
PUBLIC_SUBNET=$(docker network inspect cerniq_public --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null || echo "")
if [[ "$PUBLIC_SUBNET" == "172.27.0.0/24" ]]; then
    log_pass "cerniq_public subnet: $PUBLIC_SUBNET"
else
    log_fail "cerniq_public subnet: $PUBLIC_SUBNET (expected 172.27.0.0/24)"
fi

# Test: cerniq_backend subnet is 172.28.0.0/24
log_test "cerniq_backend subnet is 172.28.0.0/24"
BACKEND_SUBNET=$(docker network inspect cerniq_backend --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null || echo "")
if [[ "$BACKEND_SUBNET" == "172.28.0.0/24" ]]; then
    log_pass "cerniq_backend subnet: $BACKEND_SUBNET"
else
    log_fail "cerniq_backend subnet: $BACKEND_SUBNET (expected 172.28.0.0/24)"
fi

# Test: cerniq_data subnet is 172.29.0.0/24
log_test "cerniq_data subnet is 172.29.0.0/24"
DATA_SUBNET=$(docker network inspect cerniq_data --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null || echo "")
if [[ "$DATA_SUBNET" == "172.29.0.0/24" ]]; then
    log_pass "cerniq_data subnet: $DATA_SUBNET"
else
    log_fail "cerniq_data subnet: $DATA_SUBNET (expected 172.29.0.0/24)"
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
echo "F0.2.1: PostgreSQL 18.1 + PostGIS + pgvector"
echo "=============================================="

# Test: PostgreSQL container exists and is running
log_test "cerniq-postgres container is running"
PG_RUNNING=$(docker inspect -f '{{.State.Running}}' cerniq-postgres 2>/dev/null || echo "false")
if [[ "$PG_RUNNING" == "true" ]]; then
    log_pass "cerniq-postgres is running"
else
    log_fail "cerniq-postgres is not running"
fi

# Test: PostgreSQL is healthy
log_test "cerniq-postgres is healthy"
PG_HEALTH=$(docker inspect -f '{{.State.Health.Status}}' cerniq-postgres 2>/dev/null || echo "unhealthy")
if [[ "$PG_HEALTH" == "healthy" ]]; then
    log_pass "cerniq-postgres is healthy"
else
    log_fail "cerniq-postgres is not healthy: $PG_HEALTH"
fi

# Test: PostgreSQL version is 18.x
log_test "PostgreSQL version is 18.x"
PG_VERSION=$(docker exec cerniq-postgres psql -U c3rn1q -d cerniq -t -c "SHOW server_version;" 2>/dev/null | tr -d ' ' || echo "0")
if [[ "$PG_VERSION" == 18.* ]]; then
    log_pass "PostgreSQL version: $PG_VERSION"
else
    log_fail "PostgreSQL version: $PG_VERSION (expected 18.x)"
fi

# Test: pgvector extension is installed
log_test "pgvector extension (0.8.1) installed"
PGVECTOR=$(docker exec cerniq-postgres psql -U c3rn1q -d cerniq -t -c "SELECT extversion FROM pg_extension WHERE extname = 'vector';" 2>/dev/null | tr -d ' ' || echo "")
if [[ "$PGVECTOR" == "0.8.1" ]]; then
    log_pass "pgvector version: $PGVECTOR"
else
    log_fail "pgvector version: $PGVECTOR (expected 0.8.1)"
fi

# Test: PostGIS extension is installed
log_test "PostGIS extension (3.6.1) installed"
POSTGIS=$(docker exec cerniq-postgres psql -U c3rn1q -d cerniq -t -c "SELECT extversion FROM pg_extension WHERE extname = 'postgis';" 2>/dev/null | tr -d ' ' || echo "")
if [[ "$POSTGIS" == "3.6.1" ]]; then
    log_pass "PostGIS version: $POSTGIS"
else
    log_fail "PostGIS version: $POSTGIS (expected 3.6.1)"
fi

# Test: pg_stat_statements is enabled
log_test "pg_stat_statements extension enabled"
PGSTAT=$(docker exec cerniq-postgres psql -U c3rn1q -d cerniq -t -c "SELECT extname FROM pg_extension WHERE extname = 'pg_stat_statements';" 2>/dev/null | tr -d ' ' || echo "")
if [[ "$PGSTAT" == "pg_stat_statements" ]]; then
    log_pass "pg_stat_statements is enabled"
else
    log_fail "pg_stat_statements is not enabled"
fi

# Test: WAL level is replica for PITR
log_test "WAL level is replica (PITR)"
WAL_LEVEL=$(docker exec cerniq-postgres psql -U c3rn1q -d cerniq -t -c "SHOW wal_level;" 2>/dev/null | tr -d ' ' || echo "")
if [[ "$WAL_LEVEL" == "replica" ]]; then
    log_pass "WAL level: $WAL_LEVEL"
else
    log_fail "WAL level: $WAL_LEVEL (expected replica)"
fi

# Test: Archive mode is on
log_test "Archive mode is on"
ARCHIVE_MODE=$(docker exec cerniq-postgres psql -U c3rn1q -d cerniq -t -c "SHOW archive_mode;" 2>/dev/null | tr -d ' ' || echo "")
if [[ "$ARCHIVE_MODE" == "on" ]]; then
    log_pass "Archive mode: $ARCHIVE_MODE"
else
    log_fail "Archive mode: $ARCHIVE_MODE (expected on)"
fi

# Test: Medallion schemas exist
log_test "Medallion schemas exist (bronze, silver, gold)"
SCHEMAS=$(docker exec cerniq-postgres psql -U c3rn1q -d cerniq -t -c "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name IN ('bronze', 'silver', 'gold', 'approval', 'audit');" 2>/dev/null | tr -d ' ' || echo "0")
if [[ "$SCHEMAS" -ge 5 ]]; then
    log_pass "Medallion schemas: $SCHEMAS found"
else
    log_fail "Medallion schemas: only $SCHEMAS found (expected 5)"
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
PGB_READY=$(docker exec cerniq-pgbouncer pg_isready -h localhost -p 5432 -U c3rn1q 2>&1 || echo "failed")
if [[ "$PGB_READY" == *"accepting connections"* ]]; then
    log_pass "PgBouncer is accepting connections"
else
    log_fail "PgBouncer is not accepting connections"
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
