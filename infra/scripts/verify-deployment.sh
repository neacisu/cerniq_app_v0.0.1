#!/bin/bash
# =============================================================================
# CERNIQ.APP — Deployment Verification Script
# =============================================================================
# Purpose: Run smoke tests to verify all services are healthy after deployment
# Usage: ./verify-deployment.sh [--strict]
#        --strict: Exit with code 1 if any check fails
#
# Reference: ADR-0107 CI/CD Pipeline Strategy
# Created: 2026-02-05
# =============================================================================

set -euo pipefail

# Source environment detection
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/detect-environment.sh" ]; then
  source "$SCRIPT_DIR/detect-environment.sh"
else
  CERNIQ_ENV="${CERNIQ_ENV:-staging}"
fi

# Configuration
STRICT_MODE="${1:-}"
FAILED=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}  CERNIQ DEPLOYMENT VERIFICATION${NC}"
  echo -e "${BLUE}  Environment: ${CERNIQ_ENV}${NC}"
  echo -e "${BLUE}  Date: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
}

check_pass() {
  echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
  echo -e "${RED}❌ $1${NC}"
  FAILED=$((FAILED + 1))
}

check_warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
  WARNINGS=$((WARNINGS + 1))
}

# =============================================================================
# Service Health Checks
# =============================================================================

check_postgresql() {
  echo -n "  PostgreSQL:     "
  if docker exec cerniq-postgres pg_isready -U cerniq -d cerniq >/dev/null 2>&1; then
    check_pass "HEALTHY"
    return 0
  else
    check_fail "NOT RESPONDING"
    return 1
  fi
}

check_pgbouncer() {
  echo -n "  PgBouncer:      "
  if docker exec cerniq-pgbouncer psql -h 127.0.0.1 -p 6432 -U cerniq -d cerniq -c 'SELECT 1' >/dev/null 2>&1; then
    check_pass "HEALTHY"
    return 0
  else
    check_warn "NOT READY (may still be initializing)"
    return 0  # Don't fail for PgBouncer
  fi
}

check_redis() {
  echo -n "  Redis:          "
  local REDIS_PASS
  REDIS_PASS=$(cat /opt/cerniq/secrets/redis_password.txt 2>/dev/null || echo "")
  
  if [ -z "$REDIS_PASS" ]; then
    check_warn "PASSWORD FILE NOT FOUND"
    return 0
  fi
  
  if docker exec cerniq-redis redis-cli -p 64039 -a "$REDIS_PASS" PING 2>/dev/null | grep -q PONG; then
    check_pass "HEALTHY"
    return 0
  else
    check_fail "NOT RESPONDING"
    return 1
  fi
}

check_traefik() {
  echo -n "  Traefik:        "
  if curl -sf http://127.0.0.1:64081/ping >/dev/null 2>&1; then
    check_pass "HEALTHY"
    return 0
  else
    check_fail "NOT RESPONDING"
    return 1
  fi
}

check_openbao() {
  echo -n "  OpenBao:        "
  local BAO_STATUS
  BAO_STATUS=$(docker exec cerniq-openbao bao status -format=json 2>/dev/null || echo '{}')
  
  if echo "$BAO_STATUS" | jq -e '.initialized == true' >/dev/null 2>&1; then
    local SEALED
    SEALED=$(echo "$BAO_STATUS" | jq -r '.sealed')
    if [ "$SEALED" == "false" ]; then
      check_pass "HEALTHY (unsealed)"
      return 0
    else
      check_warn "SEALED (needs manual unseal)"
      echo "         Run: /opt/cerniq/scripts/openbao-init.sh --unseal"
      return 0  # Don't fail for sealed OpenBao in production
    fi
  else
    check_fail "NOT INITIALIZED"
    return 1
  fi
}

check_openbao_agents() {
  echo -n "  OpenBao Agents: "
  local API_RUNNING WORKERS_RUNNING
  
  API_RUNNING=$(docker ps --filter "name=cerniq-openbao-agent-api" --filter "status=running" -q)
  WORKERS_RUNNING=$(docker ps --filter "name=cerniq-openbao-agent-workers" --filter "status=running" -q)
  
  if [ -n "$API_RUNNING" ] && [ -n "$WORKERS_RUNNING" ]; then
    check_pass "BOTH RUNNING"
    return 0
  elif [ -n "$API_RUNNING" ] || [ -n "$WORKERS_RUNNING" ]; then
    check_warn "PARTIALLY RUNNING"
    return 0
  else
    check_warn "NOT RUNNING (may be waiting for credentials)"
    return 0
  fi
}

# =============================================================================
# Security Checks
# =============================================================================

check_ufw() {
  echo -n "  UFW Firewall:   "
  if sudo ufw status 2>/dev/null | grep -q "Status: active"; then
    check_pass "ACTIVE"
    return 0
  else
    check_warn "INACTIVE"
    return 0
  fi
}

check_fail2ban() {
  echo -n "  fail2ban:       "
  if sudo systemctl is-active fail2ban >/dev/null 2>&1; then
    check_pass "ACTIVE"
    return 0
  else
    check_warn "INACTIVE"
    return 0
  fi
}

# =============================================================================
# Container Status
# =============================================================================

check_containers() {
  echo -e "\n${BLUE}📊 Container Status${NC}"
  docker ps --filter "name=cerniq" --format 'table {{.Names}}\t{{.Status}}\t{{.Health}}' | sort
  echo ""
}

# =============================================================================
# Main
# =============================================================================

main() {
  print_header
  
  check_containers
  
  echo -e "${BLUE}🔍 Core Services Health Checks${NC}"
  check_postgresql
  check_pgbouncer
  check_redis
  check_traefik
  check_openbao
  check_openbao_agents
  
  echo ""
  echo -e "${BLUE}🔐 Security Services${NC}"
  check_ufw
  check_fail2ban
  
  echo ""
  echo -e "${BLUE}========================================${NC}"
  
  if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL HEALTH CHECKS PASSED${NC}"
    if [ $WARNINGS -gt 0 ]; then
      echo -e "${YELLOW}   ($WARNINGS warnings - review above)${NC}"
    fi
    echo -e "${BLUE}========================================${NC}"
    exit 0
  else
    echo -e "${RED}❌ $FAILED HEALTH CHECK(S) FAILED${NC}"
    if [ $WARNINGS -gt 0 ]; then
      echo -e "${YELLOW}   ($WARNINGS additional warnings)${NC}"
    fi
    echo -e "${BLUE}========================================${NC}"
    
    if [ "$STRICT_MODE" == "--strict" ]; then
      exit 1
    else
      echo -e "${YELLOW}Run with --strict to exit with error code on failures${NC}"
      exit 0
    fi
  fi
}

main "$@"
