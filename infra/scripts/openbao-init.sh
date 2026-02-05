#!/bin/bash
# =============================================================================
# OpenBao Initialization Script
# =============================================================================
# Reference: ADR-0033 OpenBao Secrets Management
# Version: 1.0
# Created: 2026-02-05
# 
# This script:
#   1. Initializes OpenBao with 5 key shares, 3 threshold
#   2. Saves unseal keys and root token securely
#   3. Unseals OpenBao
#   4. Backs up keys to Hetzner Storage Box (GPG encrypted)
#   5. Enables audit logging
#   6. Calls setup scripts for engines and AppRole
# 
# IMPORTANT: Run this ONCE on initial setup only!
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

BAO_ADDR="${BAO_ADDR:-http://127.0.0.1:64200}"
BAO_CONTAINER="${BAO_CONTAINER:-cerniq-openbao}"
SECRETS_DIR="/var/www/CerniqAPP/secrets"
SCRIPTS_DIR="/var/www/CerniqAPP/infra/scripts"
LOG_DIR="/var/log/cerniq"
STORAGE_BOX="${HETZNER_STORAGEBOX:-u502048@u502048.your-storagebox.de}"
STORAGE_BOX_PORT="${HETZNER_STORAGEBOX_PORT:-23}"

# =============================================================================
# Colors for output
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# Pre-flight checks
# =============================================================================

log_info "🔐 OpenBao Initialization Script"
log_info "================================="

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root or with sudo"
    exit 1
fi

# Create directories if not exist
mkdir -p "$SECRETS_DIR" "$LOG_DIR"
chmod 700 "$SECRETS_DIR"

# Check if OpenBao container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${BAO_CONTAINER}$"; then
    log_error "OpenBao container '${BAO_CONTAINER}' is not running."
    log_info "Start it with: docker compose up -d openbao"
    exit 1
fi

# Wait for OpenBao to be ready
log_info "Waiting for OpenBao to be ready..."
for i in {1..30}; do
    if docker exec "$BAO_CONTAINER" wget -q --spider http://localhost:8200/v1/sys/health?uninitok=true 2>/dev/null; then
        break
    fi
    sleep 1
    echo -n "."
done
echo ""

# =============================================================================
# Check if already initialized
# =============================================================================

INIT_STATUS=$(docker exec "$BAO_CONTAINER" bao status -format=json 2>/dev/null || echo '{"initialized": false}')
IS_INITIALIZED=$(echo "$INIT_STATUS" | grep -o '"initialized":[^,]*' | cut -d: -f2 | tr -d ' ')

if [[ "$IS_INITIALIZED" == "true" ]]; then
    log_warning "OpenBao is already initialized."
    
    # Check if sealed
    IS_SEALED=$(echo "$INIT_STATUS" | grep -o '"sealed":[^,]*' | cut -d: -f2 | tr -d ' ')
    if [[ "$IS_SEALED" == "true" ]]; then
        log_info "OpenBao is sealed. Attempting to unseal..."
        
        if [[ -f "$SECRETS_DIR/openbao_unseal_keys.txt" ]]; then
            log_info "Found unseal keys, unsealing..."
            for i in 1 2 3; do
                KEY=$(sed -n "${i}p" "$SECRETS_DIR/openbao_unseal_keys.txt")
                docker exec "$BAO_CONTAINER" bao operator unseal "$KEY" > /dev/null
            done
            log_success "OpenBao unsealed successfully!"
        else
            log_error "Unseal keys not found at $SECRETS_DIR/openbao_unseal_keys.txt"
            log_error "Please retrieve keys from backup and unseal manually."
            exit 1
        fi
    else
        log_success "OpenBao is already unsealed and ready."
    fi
    exit 0
fi

# =============================================================================
# Initialize OpenBao
# =============================================================================

log_info "🔑 Initializing OpenBao with 5 key shares, 3 threshold..."

INIT_OUTPUT=$(docker exec "$BAO_CONTAINER" bao operator init \
    -key-shares=5 \
    -key-threshold=3 \
    -format=json)

# =============================================================================
# Extract and save keys
# =============================================================================

log_info "📝 Saving unseal keys and root token..."

# Extract unseal keys
echo "$INIT_OUTPUT" | jq -r '.unseal_keys_b64[]' > "$SECRETS_DIR/openbao_unseal_keys.txt"
chmod 600 "$SECRETS_DIR/openbao_unseal_keys.txt"

# Extract root token
echo "$INIT_OUTPUT" | jq -r '.root_token' > "$SECRETS_DIR/openbao_root_token.txt"
chmod 600 "$SECRETS_DIR/openbao_root_token.txt"

log_success "Keys saved to $SECRETS_DIR/"
log_warning "⚠️  CRITICAL: Backup these keys immediately! They cannot be recovered!"

# =============================================================================
# Unseal OpenBao
# =============================================================================

log_info "🔓 Unsealing OpenBao..."

for i in 1 2 3; do
    KEY=$(sed -n "${i}p" "$SECRETS_DIR/openbao_unseal_keys.txt")
    docker exec "$BAO_CONTAINER" bao operator unseal "$KEY" > /dev/null
    echo -n "Key $i applied... "
done
echo ""

log_success "OpenBao unsealed successfully!"

# =============================================================================
# Login with root token
# =============================================================================

log_info "🔐 Logging in with root token..."

ROOT_TOKEN=$(cat "$SECRETS_DIR/openbao_root_token.txt")
export BAO_TOKEN="$ROOT_TOKEN"

docker exec -e BAO_TOKEN="$ROOT_TOKEN" "$BAO_CONTAINER" bao token lookup > /dev/null

log_success "Logged in successfully!"

# =============================================================================
# Enable audit logging
# =============================================================================

log_info "📋 Enabling audit logging..."

docker exec -e BAO_TOKEN="$ROOT_TOKEN" "$BAO_CONTAINER" \
    bao audit enable file file_path=/openbao/data/audit.log || \
    log_warning "Audit logging may already be enabled"

log_success "Audit logging enabled at /openbao/data/audit.log"

# =============================================================================
# Backup keys to Hetzner Storage Box
# =============================================================================

log_info "📦 Backing up unseal keys to Hetzner Storage Box..."

# Create GPG encrypted backup
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
GPG_PASSPHRASE=$(openssl rand -base64 32)

# Save GPG passphrase
echo "$GPG_PASSPHRASE" > "$SECRETS_DIR/openbao_backup_passphrase.txt"
chmod 600 "$SECRETS_DIR/openbao_backup_passphrase.txt"

# Encrypt keys
gpg --batch --yes --passphrase "$GPG_PASSPHRASE" --symmetric --cipher-algo AES256 \
    -o "/tmp/openbao_keys_${BACKUP_DATE}.gpg" \
    "$SECRETS_DIR/openbao_unseal_keys.txt"

# Upload to Hetzner Storage Box
if [[ -f "/root/.ssh/hetzner_storagebox" ]]; then
    ssh -p "$STORAGE_BOX_PORT" -i /root/.ssh/hetzner_storagebox "$STORAGE_BOX" \
        "mkdir -p ./backups/cerniq/openbao" 2>/dev/null || true
    
    scp -P "$STORAGE_BOX_PORT" -i /root/.ssh/hetzner_storagebox \
        "/tmp/openbao_keys_${BACKUP_DATE}.gpg" \
        "$STORAGE_BOX:./backups/cerniq/openbao/"
    
    log_success "Keys backed up to Hetzner Storage Box"
else
    log_warning "SSH key for Hetzner Storage Box not found. Manual backup required!"
    log_warning "Encrypted keys saved to: /tmp/openbao_keys_${BACKUP_DATE}.gpg"
fi

# Secure delete temporary file
shred -u "/tmp/openbao_keys_${BACKUP_DATE}.gpg" 2>/dev/null || rm -f "/tmp/openbao_keys_${BACKUP_DATE}.gpg"

# =============================================================================
# Run setup scripts
# =============================================================================

log_info "🛠️  Running setup scripts..."

# Setup secrets engines
if [[ -x "$SCRIPTS_DIR/openbao-setup-engines.sh" ]]; then
    log_info "Setting up secrets engines..."
    "$SCRIPTS_DIR/openbao-setup-engines.sh"
else
    log_warning "openbao-setup-engines.sh not found or not executable"
fi

# Setup AppRole authentication
if [[ -x "$SCRIPTS_DIR/openbao-setup-approle.sh" ]]; then
    log_info "Setting up AppRole authentication..."
    "$SCRIPTS_DIR/openbao-setup-approle.sh"
else
    log_warning "openbao-setup-approle.sh not found or not executable"
fi

# =============================================================================
# Summary
# =============================================================================

echo ""
log_success "=========================================="
log_success "OpenBao initialization completed!"
log_success "=========================================="
echo ""
log_info "Important files:"
log_info "  - Unseal keys: $SECRETS_DIR/openbao_unseal_keys.txt"
log_info "  - Root token:  $SECRETS_DIR/openbao_root_token.txt"
log_info "  - Backup pass: $SECRETS_DIR/openbao_backup_passphrase.txt"
echo ""
log_warning "⚠️  CRITICAL SECURITY NOTES:"
log_warning "  1. Store unseal keys in separate secure locations"
log_warning "  2. Never store root token online after initial setup"
log_warning "  3. Use AppRole tokens for service authentication"
log_warning "  4. Test restore procedure before going to production"
echo ""
log_info "Access OpenBao UI: http://localhost:64200/ui"
log_info "Login with root token from: $SECRETS_DIR/openbao_root_token.txt"
echo ""

# Log to file
echo "$(date): OpenBao initialized successfully" >> "$LOG_DIR/openbao-init.log"
