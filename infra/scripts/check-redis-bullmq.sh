#!/bin/bash
# =============================================================================
# CERNIQ.APP — Redis BullMQ Compatibility Checker
# =============================================================================
# Reference: ADR-0006, etapa0-plan-implementare-complet-v2.md, etapa0-port-matrix.md
# Usage: ./check-redis-bullmq.sh
# Exit codes: 0 = OK, 1 = FAIL
#
# NOTE: PostgreSQL runs natively on CT107 (10.0.1.107:5432), NOT in a Docker container.
# Redis runs on the orchestrator (10.0.0.2:6379), accessed via HAProxy VIP 10.0.1.10:6379.
# =============================================================================

set -e

REDIS_HOST="${REDIS_HOST:-10.0.1.10}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASS_FILE="/var/www/CerniqAPP/secrets/redis_password.txt"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=============================================="
echo "🔍 Redis BullMQ Compatibility Check"
echo "=============================================="
echo "Host: $REDIS_HOST (HAProxy VIP)"
echo "Port: $REDIS_PORT"
echo "Date: $(date)"
echo ""

# Check if Redis is reachable
if ! redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" PING >/dev/null 2>&1; then
    echo -e "${RED}❌ FAIL: Redis not reachable at ${REDIS_HOST}:${REDIS_PORT}${NC}"
    exit 1
fi

# Get Redis password
if [ -f "$REDIS_PASS_FILE" ]; then
    REDIS_PASS=$(cat "$REDIS_PASS_FILE")
    AUTH_ARG="-a $REDIS_PASS"
else
    echo -e "${YELLOW}⚠️  WARNING: No password file found at $REDIS_PASS_FILE${NC}"
    AUTH_ARG=""
fi

# Function to get Redis config
get_config() {
    # shellcheck disable=SC2086
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $AUTH_ARG CONFIG GET "$1" 2>/dev/null | tail -1
}

ERRORS=0

# Check 1: maxmemory-policy MUST be noeviction
echo -n "1. maxmemory-policy = noeviction ... "
POLICY=$(get_config "maxmemory-policy")
if [ "$POLICY" == "noeviction" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAIL (got: $POLICY)${NC}"
    echo -e "${RED}   CRITICAL: BullMQ jobs will be LOST if Redis evicts keys!${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check 2: appendonly MUST be yes
echo -n "2. appendonly = yes (persistence) ... "
AOF=$(get_config "appendonly")
if [ "$AOF" == "yes" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAIL (got: $AOF)${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check 3: notify-keyspace-events MUST include Ex
echo -n "3. notify-keyspace-events contains 'Ex' ... "
EVENTS=$(get_config "notify-keyspace-events")
if [[ "$EVENTS" == *"E"* ]] && [[ "$EVENTS" == *"x"* ]]; then
    echo -e "${GREEN}✅ OK ($EVENTS)${NC}"
else
    echo -e "${RED}❌ FAIL (got: $EVENTS)${NC}"
    echo -e "${RED}   Required for BullMQ delayed jobs!${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check 4: maxmemory is set
echo -n "4. maxmemory is configured ... "
MAXMEM=$(get_config "maxmemory")
if [ "$MAXMEM" != "0" ] && [ -n "$MAXMEM" ]; then
    # Convert to human readable
    MAXMEM_GB=$(echo "scale=2; $MAXMEM / 1024 / 1024 / 1024" | bc 2>/dev/null || echo "N/A")
    echo -e "${GREEN}✅ OK (${MAXMEM_GB}GB)${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: maxmemory not set (using all available RAM)${NC}"
fi

# Check 5: Ping test
echo -n "5. Redis responds to PING ... "
# shellcheck disable=SC2086
PONG=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $AUTH_ARG ping 2>/dev/null)
if [ "$PONG" == "PONG" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAIL${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check 6: AUTH is enabled
echo -n "6. AUTH is enabled (security) ... "
NOAUTH=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>&1)
if [[ "$NOAUTH" == *"NOAUTH"* ]]; then
    echo -e "${GREEN}✅ OK (AUTH required)${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: AUTH not enabled${NC}"
fi

# Check 7: Redis version
echo -n "7. Redis version check ... "
# shellcheck disable=SC2086
VERSION=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $AUTH_ARG INFO server 2>/dev/null | grep redis_version | cut -d: -f2 | tr -d '\r')
if [[ "$VERSION" == 8.* ]]; then
    echo -e "${GREEN}✅ OK (v$VERSION)${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: Expected Redis 8.x, got v$VERSION${NC}"
fi

# Check 8: Redis connectivity latency
echo -n "8. Redis latency check ... "
# shellcheck disable=SC2086
LATENCY=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $AUTH_ARG --latency -i 1 2>/dev/null | head -1 || echo "")
if [[ -n "$LATENCY" ]]; then
    echo -e "${GREEN}✅ OK ($LATENCY)${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: Could not measure latency${NC}"
fi

echo ""
echo "=============================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All BullMQ compatibility checks PASSED${NC}"
    echo "=============================================="
    exit 0
else
    echo -e "${RED}❌ $ERRORS check(s) FAILED${NC}"
    echo "=============================================="
    exit 1
fi
