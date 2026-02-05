#!/bin/bash
# =============================================================================
# OpenBao AppRole Authentication Setup Script
# =============================================================================
# Reference: ADR-0033 OpenBao Secrets Management
# Version: 1.0
# Created: 2026-02-05
# 
# This script configures:
#   1. AppRole auth method
#   2. Service roles (api, workers, cicd)
#   3. Role IDs and Secret IDs generation
#   4. Stores credentials in secrets directory
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

BAO_ADDR="${BAO_ADDR:-http://127.0.0.1:64200}"
BAO_CONTAINER="${BAO_CONTAINER:-cerniq-openbao}"
SECRETS_DIR="${CERNIQ_SECRETS_DIR:-/var/www/CerniqAPP/secrets}"

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

log_info "🔐 OpenBao AppRole Setup"
log_info "========================"

# Get root token
if [[ -f "$SECRETS_DIR/openbao_root_token.txt" ]]; then
    ROOT_TOKEN=$(cat "$SECRETS_DIR/openbao_root_token.txt")
    export BAO_TOKEN="$ROOT_TOKEN"
else
    log_error "Root token not found at $SECRETS_DIR/openbao_root_token.txt"
    exit 1
fi

# Helper function to run bao commands in container
bao_exec() {
    docker exec -e BAO_TOKEN="$BAO_TOKEN" "$BAO_CONTAINER" bao "$@"
}

# =============================================================================
# Enable AppRole Auth Method
# =============================================================================

log_info "Enabling AppRole auth method..."

bao_exec auth enable approle 2>/dev/null || \
    log_warning "AppRole may already be enabled"

log_success "AppRole auth method enabled"

# =============================================================================
# Create API Service Role
# =============================================================================

log_info "Creating API service role..."

bao_exec write auth/approle/role/api \
    token_policies="api-policy" \
    token_ttl=1h \
    token_max_ttl=4h \
    secret_id_ttl=720h \
    secret_id_num_uses=0 \
    token_num_uses=0 \
    token_type=service

log_success "API role created with policies: api-policy"

# =============================================================================
# Create Workers Service Role
# =============================================================================

log_info "Creating Workers service role..."

bao_exec write auth/approle/role/workers \
    token_policies="workers-policy" \
    token_ttl=1h \
    token_max_ttl=4h \
    secret_id_ttl=720h \
    secret_id_num_uses=0 \
    token_num_uses=0 \
    token_type=service

log_success "Workers role created with policies: workers-policy"

# =============================================================================
# Create CI/CD Role
# =============================================================================

log_info "Creating CI/CD role..."

bao_exec write auth/approle/role/cicd \
    token_policies="cicd-policy" \
    token_ttl=30m \
    token_max_ttl=1h \
    secret_id_ttl=24h \
    secret_id_num_uses=10 \
    token_num_uses=0 \
    token_type=service

log_success "CI/CD role created with policies: cicd-policy"

# =============================================================================
# Get Role IDs
# =============================================================================

log_info "Retrieving role IDs..."

# API role ID
API_ROLE_ID=$(bao_exec read -field=role_id auth/approle/role/api/role-id)
echo "$API_ROLE_ID" > "$SECRETS_DIR/api_role_id"
chmod 600 "$SECRETS_DIR/api_role_id"
log_success "API role_id saved to $SECRETS_DIR/api_role_id"

# Workers role ID
WORKERS_ROLE_ID=$(bao_exec read -field=role_id auth/approle/role/workers/role-id)
echo "$WORKERS_ROLE_ID" > "$SECRETS_DIR/workers_role_id"
chmod 600 "$SECRETS_DIR/workers_role_id"
log_success "Workers role_id saved to $SECRETS_DIR/workers_role_id"

# CI/CD role ID
CICD_ROLE_ID=$(bao_exec read -field=role_id auth/approle/role/cicd/role-id)
echo "$CICD_ROLE_ID" > "$SECRETS_DIR/cicd_role_id"
chmod 600 "$SECRETS_DIR/cicd_role_id"
log_success "CI/CD role_id saved to $SECRETS_DIR/cicd_role_id"

# =============================================================================
# Generate Secret IDs
# =============================================================================

log_info "Generating secret IDs..."

# API secret ID
API_SECRET_ID=$(bao_exec write -f -field=secret_id auth/approle/role/api/secret-id)
echo "$API_SECRET_ID" > "$SECRETS_DIR/api_secret_id"
chmod 600 "$SECRETS_DIR/api_secret_id"
log_success "API secret_id generated and saved"

# Workers secret ID
WORKERS_SECRET_ID=$(bao_exec write -f -field=secret_id auth/approle/role/workers/secret-id)
echo "$WORKERS_SECRET_ID" > "$SECRETS_DIR/workers_secret_id"
chmod 600 "$SECRETS_DIR/workers_secret_id"
log_success "Workers secret_id generated and saved"

# CI/CD secret ID
CICD_SECRET_ID=$(bao_exec write -f -field=secret_id auth/approle/role/cicd/secret-id)
echo "$CICD_SECRET_ID" > "$SECRETS_DIR/cicd_secret_id"
chmod 600 "$SECRETS_DIR/cicd_secret_id"
log_success "CI/CD secret_id generated and saved"

# =============================================================================
# Verify AppRole Login
# =============================================================================

log_info "Verifying AppRole login for API role..."

TEST_TOKEN=$(bao_exec write -field=token auth/approle/login \
    role_id="$API_ROLE_ID" \
    secret_id="$API_SECRET_ID")

if [[ -n "$TEST_TOKEN" ]]; then
    log_success "AppRole login verification successful!"
else
    log_error "AppRole login verification failed"
    exit 1
fi

# =============================================================================
# Summary
# =============================================================================

echo ""
log_success "=========================================="
log_success "AppRole Setup Complete!"
log_success "=========================================="
echo ""
log_info "Roles created:"
log_info "  - api:     token_ttl=1h, secret_id_ttl=30d"
log_info "  - workers: token_ttl=1h, secret_id_ttl=30d"
log_info "  - cicd:    token_ttl=30m, secret_id_ttl=24h"
echo ""
log_info "Credentials saved to $SECRETS_DIR/:"
log_info "  - api_role_id, api_secret_id"
log_info "  - workers_role_id, workers_secret_id"
log_info "  - cicd_role_id, cicd_secret_id"
echo ""
log_warning "⚠️  IMPORTANT:"
log_warning "  - role_id is static and can be stored in config"
log_warning "  - secret_id should be rotated monthly"
log_warning "  - Use openbao-rotate-static-secrets.sh for rotation"
echo ""
log_info "OpenBao agents can now authenticate using these credentials"
echo ""
