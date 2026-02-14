#!/bin/bash
# =============================================================================
# OpenBao Database Secrets Engine Setup Script
# =============================================================================
# Reference: ADR-0033 OpenBao Secrets Management
# Version: 1.0
# Created: 2026-02-05
# 
# This script configures OpenBao Database secrets engine for dynamic
# PostgreSQL credentials. Run AFTER PostgreSQL is initialized with the
# cerniq_vault user from init.sql.
# 
# Prerequisites:
#   1. OpenBao initialized and unsealed
#   2. PostgreSQL running with cerniq_vault user created
#   3. Root token available
# =============================================================================

set -euo pipefail

# =============================================================================
# Environment Detection
# =============================================================================
# Source environment detection to get CERNIQ_ENV and related variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/detect-environment.sh" ]]; then
    source "${SCRIPT_DIR}/detect-environment.sh"
else
    echo "ERROR: detect-environment.sh not found at ${SCRIPT_DIR}"
    exit 1
fi

# =============================================================================
# Configuration (environment-aware)
# =============================================================================

BAO_ADDR="${BAO_ADDR:-https://s3cr3ts.neanelu.ro}"
SECRETS_DIR="${CERNIQ_SECRETS_DIR:-/var/www/CerniqAPP/secrets}"

# PostgreSQL connection details
PG_HOST="${PG_HOST:-10.0.1.107}"
PG_PORT="${PG_PORT:-5432}"
PG_DATABASE="${PG_DATABASE:-cerniq}"
PG_VAULT_USER="${PG_VAULT_USER:-cerniq_vault}"

# =============================================================================
# Colors for output
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# Pre-flight checks
# =============================================================================

log_info "🗄️  OpenBao Database Engine Setup"
log_info "=================================="

# Get root token
if [[ -f "$SECRETS_DIR/openbao_root_token.txt" ]]; then
    ROOT_TOKEN=$(cat "$SECRETS_DIR/openbao_root_token.txt")
    export BAO_TOKEN="$ROOT_TOKEN"
else
    log_error "Root token not found at $SECRETS_DIR/openbao_root_token.txt"
    exit 1
fi

# Get vault user password (either from STDIN or prompt)
if [[ -n "${PG_VAULT_PASSWORD:-}" ]]; then
    VAULT_PASS="$PG_VAULT_PASSWORD"
else
    log_info "Enter password for PostgreSQL vault user (cerniq_vault):"
    read -s VAULT_PASS
fi

# Helper function to run bao commands against orchestrator OpenBao
bao_exec() {
    BAO_ADDR="$BAO_ADDR" BAO_TOKEN="$BAO_TOKEN" bao "$@"
}

# =============================================================================
# Configure Database Connection
# =============================================================================

log_info "Configuring PostgreSQL connection..."

# Configure connection to PostgreSQL
bao_exec write database/config/cerniq-postgres \
    plugin_name=postgresql-database-plugin \
    allowed_roles="api-dynamic,workers-dynamic,readonly-dynamic" \
    connection_url="postgresql://{{username}}:{{password}}@${PG_HOST}:${PG_PORT}/${PG_DATABASE}?sslmode=require" \
    username="${PG_VAULT_USER}" \
    password="${VAULT_PASS}"

log_success "Database connection configured"

# =============================================================================
# Rotate Vault User Password
# =============================================================================

log_info "Rotating vault user password (removing initial password)..."

bao_exec write -force database/rotate-root/cerniq-postgres

log_success "Vault user password rotated (now managed by OpenBao)"
log_warning "⚠️  The initial vault_initial_password_change_me is no longer valid"

# =============================================================================
# Create Dynamic Credential Roles
# =============================================================================

log_info "Creating dynamic credential roles..."

# API role - full access to all schemas
bao_exec write database/roles/api-dynamic \
    db_name=cerniq-postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}' INHERIT IN ROLE c3rn1q; GRANT USAGE ON ALL SCHEMAS IN DATABASE cerniq TO \"{{name}}\";" \
    revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="4h"

log_success "api-dynamic role created (1h default TTL)"

# Workers role - full access to all schemas
bao_exec write database/roles/workers-dynamic \
    db_name=cerniq-postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}' INHERIT IN ROLE c3rn1q; GRANT USAGE ON ALL SCHEMAS IN DATABASE cerniq TO \"{{name}}\";" \
    revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="4h"

log_success "workers-dynamic role created (1h default TTL)"

# Readonly role - for monitoring/reporting
bao_exec write database/roles/readonly-dynamic \
    db_name=cerniq-postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}' INHERIT; GRANT CONNECT ON DATABASE cerniq TO \"{{name}}\"; GRANT USAGE ON ALL SCHEMAS IN DATABASE cerniq TO \"{{name}}\"; GRANT SELECT ON ALL TABLES IN SCHEMA public, bronze, silver, gold, approval, audit TO \"{{name}}\";" \
    revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="30m" \
    max_ttl="1h"

log_success "readonly-dynamic role created (30m default TTL)"

# =============================================================================
# Test Dynamic Credential Generation
# =============================================================================

log_info "Testing dynamic credential generation..."

TEST_CREDS=$(bao_exec read -format=json database/creds/api-dynamic)

TEST_USER=$(echo "$TEST_CREDS" | jq -r '.data.username')
TEST_TTL=$(echo "$TEST_CREDS" | jq -r '.lease_duration')

log_success "Test credential generated: $TEST_USER (TTL: ${TEST_TTL}s)"

# =============================================================================
# Summary
# =============================================================================

echo ""
log_success "=========================================="
log_success "Database Engine Setup Complete!"
log_success "=========================================="
echo ""
log_info "Configured roles:"
log_info "  - api-dynamic     (1h TTL, full access)"
log_info "  - workers-dynamic (1h TTL, full access)"
log_info "  - readonly-dynamic (30m TTL, SELECT only)"
echo ""
log_info "Usage in templates:"
log_info "  {{ with secret \"database/creds/api-dynamic\" }}"
log_info "  DATABASE_URL=postgresql://{{ .Data.username }}:{{ .Data.password }}@..."
log_info "  {{ end }}"
echo ""
log_info "Test credential generated successfully. Database engine is operational."
echo ""
