#!/bin/bash
# ============================================================================
# Cerniq.app PostgreSQL Validation Script
# ============================================================================
# Reference: etapa0-plan-implementare-complet-v2.md F0.2.2.T003
# Usage: ./validate-postgres.sh
# ============================================================================

set -euo pipefail

CONTAINER_NAME="cerniq-postgres"
DB_USER="cerniq"
DB_NAME="cerniq"
DB_HOST="localhost"
DB_PORT="64032"

# Common psql command with correct port (Cerniq uses 64xxx range per ADR-0022 "Port Allocation Strategy")
PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== CERNIQ POSTGRESQL VALIDATION ==="
echo "Date: $(date)"
echo ""

# 1. Container status
echo "1. Container Status:"
STATUS=$(docker inspect --format='{{.State.Status}}' $CONTAINER_NAME 2>/dev/null || echo "not_found")
HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "unknown")
echo "   Status: $STATUS"
echo "   Health: $HEALTH"

if [ "$STATUS" != "running" ]; then
    echo -e "   ${RED}❌ FAIL: Container not running${NC}"
    exit 1
fi

if [ "$HEALTH" != "healthy" ]; then
    echo -e "   ${YELLOW}⚠️ WARNING: Container not healthy yet${NC}"
else
    echo -e "   ${GREEN}✅ PASS${NC}"
fi
echo ""

# 2. PostgreSQL version
echo "2. PostgreSQL Version:"
VERSION=$(docker exec $CONTAINER_NAME $PSQL_CMD -t -c "SELECT version();" 2>/dev/null | head -1 | xargs)
echo "   $VERSION"
if [[ "$VERSION" == *"PostgreSQL 1"* ]]; then
    echo -e "   ${GREEN}✅ PASS: PostgreSQL detected${NC}"
else
    echo -e "   ${YELLOW}⚠️ WARNING: Version check${NC}"
fi
echo ""

# 3. Extensions
echo "3. Required Extensions:"
EXTENSIONS=$(docker exec $CONTAINER_NAME $PSQL_CMD -t -c "SELECT extname FROM pg_extension ORDER BY extname;")
REQUIRED=("pg_stat_statements" "pg_trgm" "vector" "postgis" "postgis_topology")
ALL_EXT_OK=true
for ext in "${REQUIRED[@]}"; do
    if echo "$EXTENSIONS" | grep -q "$ext"; then
        echo -e "   ${GREEN}✅ $ext${NC}"
    else
        echo -e "   ${RED}❌ $ext MISSING${NC}"
        ALL_EXT_OK=false
    fi
done
echo ""

# 4. Schemas
echo "4. Medallion Schemas:"
SCHEMAS=$(docker exec $CONTAINER_NAME $PSQL_CMD -t -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('bronze', 'silver', 'gold', 'approval', 'audit');")
REQUIRED_SCHEMAS=("bronze" "silver" "gold" "approval" "audit")
ALL_SCHEMA_OK=true
for schema in "${REQUIRED_SCHEMAS[@]}"; do
    if echo "$SCHEMAS" | grep -q "$schema"; then
        echo -e "   ${GREEN}✅ $schema${NC}"
    else
        echo -e "   ${RED}❌ $schema MISSING${NC}"
        ALL_SCHEMA_OK=false
    fi
done
echo ""

# 5. Memory settings
echo "5. Memory Configuration:"
docker exec $CONTAINER_NAME $PSQL_CMD -t -c "
SELECT 
    name, 
    setting,
    unit
FROM pg_settings 
WHERE name IN ('shared_buffers', 'effective_cache_size', 'work_mem', 'maintenance_work_mem')
ORDER BY name;
" 2>/dev/null | grep -v "^$"
echo ""

# 6. WAL configuration
echo "6. WAL Configuration:"
docker exec $CONTAINER_NAME $PSQL_CMD -t -c "
SELECT 
    name, 
    setting
FROM pg_settings 
WHERE name IN ('wal_level', 'archive_mode', 'max_wal_size', 'wal_compression')
ORDER BY name;
" 2>/dev/null | grep -v "^$"
echo ""

# 7. io_method (PostgreSQL 18)
echo "7. PostgreSQL 18 AIO:"
IO_METHOD=$(docker exec $CONTAINER_NAME $PSQL_CMD -t -c "SHOW io_method;" 2>/dev/null | xargs || echo "not_available")
echo "   io_method: $IO_METHOD"
if [ "$IO_METHOD" == "io_uring" ]; then
    echo -e "   ${GREEN}✅ PASS: io_uring enabled${NC}"
else
    echo -e "   ${YELLOW}⚠️ io_uring not available (fallback ok)${NC}"
fi
echo ""

# 8. Connection info
echo "8. Connection Statistics:"
docker exec $CONTAINER_NAME $PSQL_CMD -t -c "
SELECT 
    datname,
    numbackends as connections,
    xact_commit as commits,
    xact_rollback as rollbacks
FROM pg_stat_database 
WHERE datname = '$DB_NAME';
" 2>/dev/null | grep -v "^$"
echo ""

# 9. pg_stat_statements
echo "9. pg_stat_statements:"
STAT_COUNT=$(docker exec $CONTAINER_NAME $PSQL_CMD -t -c "SELECT count(*) FROM pg_stat_statements;" 2>/dev/null | xargs || echo "0")
echo "   Tracked queries: $STAT_COUNT"
if [ "$STAT_COUNT" -gt 0 ] 2>/dev/null; then
    echo -e "   ${GREEN}✅ PASS${NC}"
else
    echo -e "   ${YELLOW}⚠️ No queries tracked yet (normal if fresh start)${NC}"
fi
echo ""

# 10. WAL Archive directory
echo "10. WAL Archive:"
WAL_COUNT=$(docker exec $CONTAINER_NAME ls -la /var/lib/postgresql/wal_archive/ 2>/dev/null | wc -l || echo "0")
echo "   Files in archive: $((WAL_COUNT - 3))"
echo ""

# Summary
echo "=== VALIDATION SUMMARY ==="
PASS_COUNT=0
FAIL_COUNT=0

if [ "$STATUS" == "running" ]; then PASS_COUNT=$((PASS_COUNT+1)); else FAIL_COUNT=$((FAIL_COUNT+1)); fi
if [ "$ALL_EXT_OK" == "true" ]; then PASS_COUNT=$((PASS_COUNT+1)); else FAIL_COUNT=$((FAIL_COUNT+1)); fi
if [ "$ALL_SCHEMA_OK" == "true" ]; then PASS_COUNT=$((PASS_COUNT+1)); else FAIL_COUNT=$((FAIL_COUNT+1)); fi

echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "Failed: ${RED}$FAIL_COUNT${NC}"
echo "=== VALIDATION COMPLETE ==="

if [ "$FAIL_COUNT" -gt 0 ]; then
    exit 1
fi
exit 0
