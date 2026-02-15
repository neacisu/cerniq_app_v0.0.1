#!/bin/bash
# ============================================================================
# Cerniq.app PostgreSQL Validation Script
# ============================================================================
# Reference: etapa0-plan-implementare-complet-v2.md F0.2.2.T003
# Usage: ./validate-postgres.sh
# ============================================================================

set -euo pipefail

# New infra: PostgreSQL is external on CT107; clients authenticate via PgBouncer
# using OpenBao dynamic DB creds rendered into an env file (DATABASE_URL).
ENV_FILE="${ENV_FILE:-/run/cerniq/runtime-secrets/api/api.env}"
DOCKER_NET="${DOCKER_NET:-cerniq_backend}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== CERNIQ POSTGRESQL VALIDATION ==="
echo "Date: $(date)"
echo ""

if [[ ! -f "$ENV_FILE" ]]; then
    echo -e "   ${RED}❌ FAIL: env file missing: $ENV_FILE${NC}"
    exit 1
fi

run_psql() {
    docker run --rm \
        --network "$DOCKER_NET" \
        --env-file "$ENV_FILE" \
        postgres:18 \
        sh -lc 'exec psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atqc "$1"' -- "$1"
}

# 1. Connectivity (via PgBouncer)
echo "1. Connectivity (PgBouncer + dynamic creds):"
if docker run --rm --network "$DOCKER_NET" --env-file "$ENV_FILE" postgres:18 sh -lc 'pg_isready -d "$DATABASE_URL" >/dev/null 2>&1'; then
    echo -e "   ${GREEN}✅ PASS${NC}"
else
    echo -e "   ${RED}❌ FAIL: pg_isready failed${NC}"
    exit 1
fi
echo ""

# 2. PostgreSQL version
echo "2. PostgreSQL Version:"
VERSION="$(run_psql "SELECT version();")"
echo "   $VERSION"
if [[ "$VERSION" == *"PostgreSQL 1"* ]]; then
    echo -e "   ${GREEN}✅ PASS: PostgreSQL detected${NC}"
else
    echo -e "   ${YELLOW}⚠️ WARNING: Version check${NC}"
fi
echo ""

# 3. Extensions
echo "3. Required Extensions:"
EXTENSIONS="$(run_psql "SELECT extname FROM pg_extension ORDER BY extname;")"
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
SCHEMAS="$(run_psql "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('bronze', 'silver', 'gold', 'approval', 'audit');")"
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
run_psql "SELECT name, setting, unit FROM pg_settings WHERE name IN ('shared_buffers','effective_cache_size','work_mem','maintenance_work_mem') ORDER BY name;" | grep -v "^$"
echo ""

# 6. WAL configuration
echo "6. WAL Configuration:"
run_psql "SELECT name, setting FROM pg_settings WHERE name IN ('wal_level','archive_mode','max_wal_size','wal_compression') ORDER BY name;" | grep -v "^$"
echo ""

# 7. Connection info
echo "7. Connection Statistics:"
run_psql "SELECT datname, numbackends, xact_commit, xact_rollback FROM pg_stat_database WHERE datname = current_database();" | grep -v "^$"
echo ""

# 8. pg_stat_statements
echo "8. pg_stat_statements:"
STAT_COUNT="$(run_psql "SELECT count(*) FROM pg_stat_statements;" | xargs || echo "0")"
echo "   Tracked queries: $STAT_COUNT"
if [ "$STAT_COUNT" -gt 0 ] 2>/dev/null; then
    echo -e "   ${GREEN}✅ PASS${NC}"
else
    echo -e "   ${YELLOW}⚠️ No queries tracked yet (normal if fresh start)${NC}"
fi
echo ""

# Summary
echo "=== VALIDATION SUMMARY ==="
PASS_COUNT=0
FAIL_COUNT=0

PASS_COUNT=$((PASS_COUNT+1)) # connectivity already enforced above
if [ "$ALL_EXT_OK" == "true" ]; then PASS_COUNT=$((PASS_COUNT+1)); else FAIL_COUNT=$((FAIL_COUNT+1)); fi
if [ "$ALL_SCHEMA_OK" == "true" ]; then PASS_COUNT=$((PASS_COUNT+1)); else FAIL_COUNT=$((FAIL_COUNT+1)); fi

echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "Failed: ${RED}$FAIL_COUNT${NC}"
echo "=== VALIDATION COMPLETE ==="

if [ "$FAIL_COUNT" -gt 0 ]; then
    exit 1
fi
exit 0
