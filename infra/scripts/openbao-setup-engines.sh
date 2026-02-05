#!/bin/bash
# =============================================================================
# OpenBao Secrets Engines Setup Script
# =============================================================================
# Reference: ADR-0033 OpenBao Secrets Management
# Version: 1.0
# Created: 2026-02-05
# 
# This script configures:
#   1. KV v2 secrets engine at secret/
#   2. Database secrets engine for PostgreSQL
#   3. PKI secrets engine for internal certificates
#   4. Transit secrets engine for encryption
#   5. Initial secrets population
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
CONFIG_DIR="${CERNIQ_WORKSPACE:-/var/www/CerniqAPP}/infra/config/openbao"

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

log_info "🔧 OpenBao Secrets Engines Setup"
log_info "================================="

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
# 1. KV Secrets Engine (v2)
# =============================================================================

log_info "📁 Setting up KV v2 secrets engine..."

# Enable KV v2 at secret/
bao_exec secrets enable -version=2 -path=secret kv 2>/dev/null || \
    log_warning "KV engine may already be enabled"

log_success "KV v2 engine enabled at secret/"

# Generate strong secrets (512-bit equivalent)
log_info "🔑 Generating strong secrets..."

PG_PASSWORD=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)
REDIS_PASSWORD=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)
JWT_SECRET=$(openssl rand -base64 96)

# Read existing postgres password if exists (for migration)
if [[ -f "$SECRETS_DIR/postgres_password.txt" ]]; then
    EXISTING_PG_PASS=$(cat "$SECRETS_DIR/postgres_password.txt" | tr -d '\n')
    log_info "Using existing PostgreSQL password from secrets file"
    PG_PASSWORD="$EXISTING_PG_PASS"
fi

# Read existing redis password if exists (for migration)
if [[ -f "$SECRETS_DIR/redis_password.txt" ]]; then
    EXISTING_REDIS_PASS=$(cat "$SECRETS_DIR/redis_password.txt" | tr -d '\n')
    log_info "Using existing Redis password from secrets file"
    REDIS_PASSWORD="$EXISTING_REDIS_PASS"
fi

# Create API config secrets
log_info "📝 Creating API configuration secrets..."

bao_exec kv put secret/cerniq/api/config \
    pg_user="c3rn1q" \
    pg_password="$PG_PASSWORD" \
    redis_password="$REDIS_PASSWORD" \
    jwt_secret="$JWT_SECRET"

log_success "API secrets created at secret/cerniq/api/config"

# Create Workers config secrets
log_info "📝 Creating Workers configuration secrets..."

bao_exec kv put secret/cerniq/workers/config \
    worker_concurrency="10" \
    max_retries="3"

log_success "Workers secrets created at secret/cerniq/workers/config"

# Create shared external API keys (placeholders)
log_info "📝 Creating shared external API secrets (placeholders)..."

bao_exec kv put secret/cerniq/shared/external \
    anaf_client_id="PLACEHOLDER_ANAF_CLIENT_ID" \
    anaf_client_secret="PLACEHOLDER_ANAF_CLIENT_SECRET" \
    resend_api_key="PLACEHOLDER_RESEND_API_KEY" \
    hunter_api_key="PLACEHOLDER_HUNTER_API_KEY" \
    termene_api_key="PLACEHOLDER_TERMENE_API_KEY"

log_success "Shared external secrets created (update with real keys later)"

# Create CI/CD secrets (placeholders)
log_info "📝 Creating CI/CD deployment secrets (placeholders)..."

bao_exec kv put secret/cerniq/ci/deploy \
    ghcr_token="PLACEHOLDER_GHCR_TOKEN" \
    ssh_key="PLACEHOLDER_SSH_KEY"

log_success "CI/CD secrets created at secret/cerniq/ci/deploy"

# =============================================================================
# 2. Database Secrets Engine (Dynamic PostgreSQL)
# =============================================================================

log_info "🗄️  Setting up Database secrets engine..."

# Enable database secrets engine
bao_exec secrets enable database 2>/dev/null || \
    log_warning "Database engine may already be enabled"

# Note: Database connection will be configured after OpenBao vault user is created in PostgreSQL
# The actual configuration happens in a separate step after init.sql runs
log_warning "Database engine enabled. Configure connection after PostgreSQL vault user is created:"
log_info "  Run: ./openbao-setup-database.sh after PostgreSQL is initialized with vault user"

log_success "Database engine enabled at database/"

# =============================================================================
# 3. PKI Secrets Engine (Internal TLS)
# =============================================================================

log_info "🔏 Setting up PKI secrets engine..."

# Enable root PKI
bao_exec secrets enable -path=pki pki 2>/dev/null || \
    log_warning "PKI engine may already be enabled"

# Configure max TTL (10 years)
bao_exec secrets tune -max-lease-ttl=87600h pki

# Generate root CA
log_info "Generating root CA..."
bao_exec write -format=json pki/root/generate/internal \
    common_name="Cerniq Internal Root CA" \
    issuer_name="cerniq-root-ca" \
    ttl=87600h > /dev/null

# Configure CA and CRL URLs
bao_exec write pki/config/urls \
    issuing_certificates="http://openbao:8200/v1/pki/ca" \
    crl_distribution_points="http://openbao:8200/v1/pki/crl"

log_success "Root PKI configured"

# Enable intermediate PKI for service certificates
bao_exec secrets enable -path=pki_int pki 2>/dev/null || \
    log_warning "Intermediate PKI may already be enabled"

bao_exec secrets tune -max-lease-ttl=43800h pki_int

# Generate intermediate CSR
log_info "Generating intermediate CA..."
CSR_OUTPUT=$(bao_exec write -format=json pki_int/intermediate/generate/internal \
    common_name="Cerniq Intermediate CA" \
    issuer_name="cerniq-intermediate")

CSR=$(echo "$CSR_OUTPUT" | jq -r '.data.csr')

# Sign intermediate with root
SIGNED_OUTPUT=$(bao_exec write -format=json pki/root/sign-intermediate \
    csr="$CSR" \
    format=pem_bundle \
    ttl=43800h)

INT_CERT=$(echo "$SIGNED_OUTPUT" | jq -r '.data.certificate')

# Set signed certificate
bao_exec write pki_int/intermediate/set-signed certificate="$INT_CERT"

# Create role for service certificates
bao_exec write pki_int/roles/service-cert \
    allowed_domains="cerniq.local,cerniq.app,localhost" \
    allow_subdomains=true \
    allow_localhost=true \
    max_ttl=720h \
    generate_lease=true

log_success "Intermediate PKI configured with service-cert role"

# =============================================================================
# 4. Transit Secrets Engine (Encryption)
# =============================================================================

log_info "🔐 Setting up Transit secrets engine..."

# Enable transit engine
bao_exec secrets enable transit 2>/dev/null || \
    log_warning "Transit engine may already be enabled"

# Create key for PII encryption (auto-rotate every 90 days)
bao_exec write -f transit/keys/pii \
    type=aes256-gcm96 \
    auto_rotate_period=90d

# Create key for general encryption
bao_exec write -f transit/keys/general \
    type=aes256-gcm96

log_success "Transit engine configured with 'pii' and 'general' keys"

# =============================================================================
# 5. Apply Policies
# =============================================================================

log_info "📋 Applying policies..."

# Apply policies from files
for policy_file in "$CONFIG_DIR/policies"/*.hcl; do
    if [[ -f "$policy_file" ]]; then
        policy_name=$(basename "$policy_file" .hcl)
        log_info "Applying policy: $policy_name"
        
        # Copy policy file to container and apply
        docker cp "$policy_file" "$BAO_CONTAINER:/tmp/${policy_name}.hcl"
        bao_exec policy write "$policy_name" "/tmp/${policy_name}.hcl"
        docker exec "$BAO_CONTAINER" rm "/tmp/${policy_name}.hcl"
    fi
done

log_success "All policies applied"

# =============================================================================
# Summary
# =============================================================================

echo ""
log_success "=========================================="
log_success "Secrets Engines Setup Complete!"
log_success "=========================================="
echo ""
log_info "Configured engines:"
log_info "  - KV v2 at secret/"
log_info "  - Database at database/ (needs connection config)"
log_info "  - PKI at pki/ and pki_int/"
log_info "  - Transit at transit/"
echo ""
log_info "Next steps:"
log_info "  1. Create vault user in PostgreSQL (init.sql)"
log_info "  2. Run openbao-setup-database.sh to configure dynamic credentials"
log_info "  3. Run openbao-setup-approle.sh for service authentication"
log_info "  4. Update placeholder API keys in secret/cerniq/shared/external"
echo ""
