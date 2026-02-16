#!/bin/bash
# =============================================================================
# CERNIQ.APP — Deployment Verification Script
# =============================================================================
# Purpose: Run smoke tests to verify all services are healthy after deployment
# Usage: ./verify-deployment.sh [--strict]
#        --strict: Exit with code 1 if any check fails
#
# NOTE: PostgreSQL runs natively on CT107 (10.0.1.107:5432), NOT in a Docker container.
# Redis runs on the orchestrator (10.0.0.2:6379), accessed via HAProxy VIP 10.0.1.10:6379.
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
PG_PASS_FILE="/opt/cerniq/secrets/postgres_password.txt"
PG_PASS=""
if [ -f "$PG_PASS_FILE" ]; then
  PG_PASS=$(cat "$PG_PASS_FILE")
fi

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
  if PGPASSWORD="$PG_PASS" pg_isready -h 10.0.1.107 -p 5432 -U c3rn1q -d cerniq >/dev/null 2>&1; then
    check_pass "HEALTHY (CT107 10.0.1.107:5432)"
    return 0
  else
    check_fail "NOT RESPONDING (CT107 10.0.1.107:5432)"
    return 1
  fi
}

check_pgbouncer() {
  echo -n "  PgBouncer:      "
  if docker exec -e PGPASSWORD="$PG_PASS" cerniq-pgbouncer \
    psql -h 127.0.0.1 -p 64033 -U c3rn1q -d cerniq -c 'SELECT 1' >/dev/null 2>&1; then
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
  
  if redis-cli -h 10.0.1.10 -p 6379 -a "$REDIS_PASS" PING 2>/dev/null | grep -q PONG; then
    check_pass "HEALTHY (HAProxy VIP 10.0.1.10:6379)"
    return 0
  else
    check_fail "NOT RESPONDING (HAProxy VIP 10.0.1.10:6379)"
    return 1
  fi
}

check_ingress() {
  local ingress_url
  if [ "$CERNIQ_ENV" = "production" ]; then
    ingress_url="https://cerniq.app"
  else
    ingress_url="https://staging.cerniq.app"
  fi

  echo -n "  Ingress:        "
  if curl -skf "$ingress_url" >/dev/null 2>&1; then
    check_pass "HEALTHY ($ingress_url)"
    return 0
  else
    check_fail "NOT RESPONDING ($ingress_url)"
    return 1
  fi
}

check_openbao() {
  echo -n "  OpenBao:        "
  # OpenBao server is centralized on orchestrator and exposed via Traefik.
  # We do not rely on a local "cerniq-openbao" container on CTs.
  local BAO_ADDR="${OPENBAO_ADDR:-https://s3cr3ts.neanelu.ro}"
  if curl -sk "${BAO_ADDR}/v1/sys/health" | python3 -c 'import sys,json; j=json.load(sys.stdin); print(\"initialized=%s sealed=%s\"%(j.get(\"initialized\"), j.get(\"sealed\")))' >/tmp/openbao_health.txt 2>/dev/null; then
    if grep -q "initialized=True sealed=False" /tmp/openbao_health.txt; then
      check_pass "HEALTHY (unsealed)"
      rm -f /tmp/openbao_health.txt || true
      return 0
    fi
    # Don't hard-fail on sealed/standby here; agents can still render depending on setup.
    check_warn "CHECK (${BAO_ADDR})"
    rm -f /tmp/openbao_health.txt || true
    return 0
  fi
  check_warn "UNREACHABLE (${BAO_ADDR})"
  rm -f /tmp/openbao_health.txt || true
  return 0
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
  docker ps --filter "name=cerniq" --format 'table {{.Names}}\t{{.Status}}' | sort
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
  check_ingress
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
