#!/bin/bash
# =============================================================================
# OpenBao Static Secrets Rotation Script
# =============================================================================
# Reference: ADR-0033 OpenBao Secrets Management
# Version: 1.0
# Created: 2026-02-05
# 
# This script rotates:
#   1. Redis master password (quarterly)
#   2. JWT signing secret (quarterly)
#   3. AppRole secret_ids (monthly)
# 
# Usage:
#   ./openbao-rotate-static-secrets.sh           # Interactive mode
#   ./openbao-rotate-static-secrets.sh --redis   # Rotate Redis only
#   ./openbao-rotate-static-secrets.sh --jwt     # Rotate JWT only
#   ./openbao-rotate-static-secrets.sh --approle # Rotate AppRole only
#   ./openbao-rotate-static-secrets.sh --emergency # Rotate ALL immediately
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

BAO_ADDR="${BAO_ADDR:-http://127.0.0.1:64200}"
BAO_CONTAINER="${BAO_CONTAINER:-cerniq-openbao}"
REDIS_CONTAINER="${REDIS_CONTAINER:-cerniq-redis}"
SECRETS_DIR="/var/www/CerniqAPP/secrets"
LOG_FILE="/var/log/cerniq/secrets-rotation.log"

# =============================================================================
# Colors for output
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" >> "$LOG_FILE"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $1" >> "$LOG_FILE"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $1" >> "$LOG_FILE"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" >> "$LOG_FILE"; }

# =============================================================================
# Pre-flight checks
# =============================================================================

mkdir -p "$(dirname "$LOG_FILE")"

log_info "🔄 OpenBao Static Secrets Rotation"
log_info "==================================="

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
# Parse arguments
# =============================================================================

ROTATE_REDIS=false
ROTATE_JWT=false
ROTATE_APPROLE=false
EMERGENCY_MODE=false
INTERACTIVE=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --redis)
            ROTATE_REDIS=true
            INTERACTIVE=false
            shift
            ;;
        --jwt)
            ROTATE_JWT=true
            INTERACTIVE=false
            shift
            ;;
        --approle)
            ROTATE_APPROLE=true
            INTERACTIVE=false
            shift
            ;;
        --emergency)
            EMERGENCY_MODE=true
            ROTATE_REDIS=true
            ROTATE_JWT=true
            ROTATE_APPROLE=true
            INTERACTIVE=false
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --redis      Rotate Redis password only"
            echo "  --jwt        Rotate JWT secret only"
            echo "  --approle    Rotate AppRole secret_ids only"
            echo "  --emergency  Rotate ALL secrets immediately"
            echo "  --help       Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# =============================================================================
# Interactive mode
# =============================================================================

if [[ "$INTERACTIVE" == "true" ]]; then
    echo ""
    log_warning "⚠️  This script will rotate secrets. Services may need restart."
    echo ""
    echo "Select secrets to rotate:"
    echo "  1) Redis password (requires service restart)"
    echo "  2) JWT secret (invalidates all sessions)"
    echo "  3) AppRole secret_ids (agents will re-authenticate)"
    echo "  4) ALL (emergency rotation)"
    echo "  5) Exit"
    echo ""
    read -p "Enter choice [1-5]: " CHOICE
    
    case $CHOICE in
        1) ROTATE_REDIS=true ;;
        2) ROTATE_JWT=true ;;
        3) ROTATE_APPROLE=true ;;
        4) ROTATE_REDIS=true; ROTATE_JWT=true; ROTATE_APPROLE=true ;;
        5) log_info "Exiting."; exit 0 ;;
        *) log_error "Invalid choice"; exit 1 ;;
    esac
fi

# =============================================================================
# Emergency mode warning
# =============================================================================

if [[ "$EMERGENCY_MODE" == "true" ]]; then
    log_warning "🚨 EMERGENCY MODE - All secrets will be rotated!"
    log_warning "This will invalidate all active sessions and require service restarts."
    
    if [[ "$INTERACTIVE" == "true" ]]; then
        read -p "Are you sure? (yes/no): " CONFIRM
        if [[ "$CONFIRM" != "yes" ]]; then
            log_info "Aborting."
            exit 0
        fi
    fi
fi

# =============================================================================
# Get current secrets
# =============================================================================

log_info "Reading current secrets from OpenBao..."

CURRENT_CONFIG=$(bao_exec kv get -format=json secret/cerniq/api/config)
PG_USER=$(echo "$CURRENT_CONFIG" | jq -r '.data.data.pg_user')
PG_PASSWORD=$(echo "$CURRENT_CONFIG" | jq -r '.data.data.pg_password')
CURRENT_REDIS=$(echo "$CURRENT_CONFIG" | jq -r '.data.data.redis_password')
CURRENT_JWT=$(echo "$CURRENT_CONFIG" | jq -r '.data.data.jwt_secret')

# =============================================================================
# Rotate Redis Password
# =============================================================================

if [[ "$ROTATE_REDIS" == "true" ]]; then
    log_info "🔑 Rotating Redis password..."
    
    # Generate new password
    NEW_REDIS_PASS=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)
    
    # Update in OpenBao (versioning automatic)
    bao_exec kv patch secret/cerniq/api/config \
        redis_password="$NEW_REDIS_PASS"
    
    log_success "Redis password updated in OpenBao"
    
    # Update Redis CONFIG (if Redis is running)
    if docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
        # Get current Redis password from secrets file
        OLD_REDIS_PASS=$(cat "$SECRETS_DIR/redis_password.txt" 2>/dev/null || echo "$CURRENT_REDIS")
        
        # Update Redis config
        docker exec "$REDIS_CONTAINER" redis-cli -p 64039 -a "$OLD_REDIS_PASS" CONFIG SET requirepass "$NEW_REDIS_PASS" 2>/dev/null || \
            log_warning "Could not update Redis CONFIG. Manual restart may be needed."
        
        # Update local secrets file
        echo "$NEW_REDIS_PASS" > "$SECRETS_DIR/redis_password.txt"
        chmod 600 "$SECRETS_DIR/redis_password.txt"
        
        log_success "Redis password rotated. Services will pick up new password via Agent."
    else
        log_warning "Redis container not running. Update local secrets file manually."
    fi
fi

# =============================================================================
# Rotate JWT Secret
# =============================================================================

if [[ "$ROTATE_JWT" == "true" ]]; then
    log_info "🔑 Rotating JWT secret..."
    log_warning "⚠️  This will invalidate ALL active user sessions!"
    
    # Generate new JWT secret
    NEW_JWT_SECRET=$(openssl rand -base64 96)
    
    # Update in OpenBao
    bao_exec kv patch secret/cerniq/api/config \
        jwt_secret="$NEW_JWT_SECRET"
    
    log_success "JWT secret updated in OpenBao"
    log_warning "All users will need to re-authenticate"
fi

# =============================================================================
# Rotate AppRole Secret IDs
# =============================================================================

if [[ "$ROTATE_APPROLE" == "true" ]]; then
    log_info "🔑 Rotating AppRole secret_ids..."
    
    # Rotate API secret_id
    NEW_API_SECRET=$(bao_exec write -f -field=secret_id auth/approle/role/api/secret-id)
    echo "$NEW_API_SECRET" > "$SECRETS_DIR/api_secret_id"
    chmod 600 "$SECRETS_DIR/api_secret_id"
    log_success "API secret_id rotated"
    
    # Rotate Workers secret_id
    NEW_WORKERS_SECRET=$(bao_exec write -f -field=secret_id auth/approle/role/workers/secret-id)
    echo "$NEW_WORKERS_SECRET" > "$SECRETS_DIR/workers_secret_id"
    chmod 600 "$SECRETS_DIR/workers_secret_id"
    log_success "Workers secret_id rotated"
    
    # Rotate CI/CD secret_id
    NEW_CICD_SECRET=$(bao_exec write -f -field=secret_id auth/approle/role/cicd/secret-id)
    echo "$NEW_CICD_SECRET" > "$SECRETS_DIR/cicd_secret_id"
    chmod 600 "$SECRETS_DIR/cicd_secret_id"
    log_success "CI/CD secret_id rotated"
    
    log_info "OpenBao agents will re-authenticate automatically"
fi

# =============================================================================
# Verify changes
# =============================================================================

log_info "Verifying secret versions..."

VERSION_INFO=$(bao_exec kv metadata get -format=json secret/cerniq/api/config)
CURRENT_VERSION=$(echo "$VERSION_INFO" | jq -r '.data.current_version')

log_success "Current secret version: $CURRENT_VERSION"

# =============================================================================
# Summary
# =============================================================================

echo ""
log_success "=========================================="
log_success "Secrets Rotation Complete!"
log_success "=========================================="
echo ""
log_info "Rotated:"
[[ "$ROTATE_REDIS" == "true" ]] && log_info "  ✓ Redis password"
[[ "$ROTATE_JWT" == "true" ]] && log_info "  ✓ JWT secret"
[[ "$ROTATE_APPROLE" == "true" ]] && log_info "  ✓ AppRole secret_ids"
echo ""
log_info "OpenBao Agents will automatically receive updated secrets"
log_info "within their template refresh interval (default: 5 minutes)"
echo ""

if [[ "$ROTATE_JWT" == "true" ]]; then
    log_warning "⚠️  All user sessions have been invalidated"
fi

if [[ "$ROTATE_REDIS" == "true" ]]; then
    log_warning "⚠️  If Redis CONFIG update failed, restart Redis container"
fi

echo ""
log_info "Rotation logged to: $LOG_FILE"
echo ""
