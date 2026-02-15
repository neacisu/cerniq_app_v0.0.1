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

BAO_ADDR="${BAO_ADDR:-https://s3cr3ts.neanelu.ro}"
SECRETS_DIR="${SECRETS_DIR:-/opt/cerniq/secrets}"
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

# Helper function to run bao commands against orchestrator OpenBao
bao_exec() {
    BAO_ADDR="$BAO_ADDR" BAO_TOKEN="$BAO_TOKEN" bao "$@"
}

kv1_merge_write() {
    # KV v1 doesn't support `kv patch`. We read existing data and write back the
    # full merged document via the HTTP API.
    #
    # Usage: kv1_merge_write "secret/cerniq/api/config" '{"key":"value"}'
    local secret_path="$1"
    local updates_json="$2"

    local existing_json merged_json
    existing_json="$(bao_exec kv get -format=json "$secret_path")"
    merged_json="$(python3 - <<'PY' <<EOF\n$existing_json\nEOF\n$updates_json\nPY\nimport json,sys\nexisting=json.loads(sys.stdin.readline())\nupdates=json.loads(sys.stdin.read() or '{}')\ndata=existing.get('data') or {}\ndata.update(updates)\nprint(json.dumps(data))\nPY\n)"

    # Write merged KV v1 secret (silent).
    curl -sS -X POST "${BAO_ADDR}/v1/${secret_path}" \\\n+        -H \"X-Vault-Token: ${BAO_TOKEN}\" \\\n+        -H \"Content-Type: application/json\" \\\n+        --data \"$merged_json\" >/dev/null
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
CURRENT_REDIS=$(echo "$CURRENT_CONFIG" | jq -r '.data.redis_password')
CURRENT_JWT=$(echo "$CURRENT_CONFIG" | jq -r '.data.jwt_secret')

# =============================================================================
# Rotate Redis Password
# =============================================================================

if [[ "$ROTATE_REDIS" == "true" ]]; then
    log_info "🔑 Rotating Redis password..."
    log_warning "NOTE: Redis is shared on the orchestrator. Rotating the password requires updating BOTH:"
    log_warning "  - OpenBao KV (so apps pick it up via agents)"
    log_warning "  - Redis ACL/user password on orchestrator (otherwise apps will fail)"
    
    # Generate new password
    NEW_REDIS_PASS=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)
    
    # Update in OpenBao KV v1 (merge write)
    kv1_merge_write "secret/cerniq/api/config" "$(printf '{"redis_password":%s}' "$(python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$NEW_REDIS_PASS")")"
    
    log_success "Redis password updated in OpenBao"
    log_warning "ACTION REQUIRED: update Redis user/ACL on orchestrator for user 'cerniq' to the new password."
fi

# =============================================================================
# Rotate JWT Secret
# =============================================================================

if [[ "$ROTATE_JWT" == "true" ]]; then
    log_info "🔑 Rotating JWT secret..."
    log_warning "⚠️  This will invalidate ALL active user sessions!"
    
    # Generate new JWT secret
    NEW_JWT_SECRET=$(openssl rand -base64 96)
    
    # Update in OpenBao KV v1 (merge write)
    kv1_merge_write "secret/cerniq/api/config" "$(printf '{"jwt_secret":%s}' "$(python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$NEW_JWT_SECRET")")"
    
    log_success "JWT secret updated in OpenBao"
    log_warning "All users will need to re-authenticate"
fi

# =============================================================================
# Rotate AppRole Secret IDs
# =============================================================================

if [[ "$ROTATE_APPROLE" == "true" ]]; then
    log_info "🔑 Rotating AppRole secret_ids..."
    
    # Rotate API secret_id
    NEW_API_SECRET=$(bao_exec write -f -field=secret_id auth/approle/role/cerniq-api/secret-id)
    echo "$NEW_API_SECRET" > "$SECRETS_DIR/api_secret_id"
    chmod 600 "$SECRETS_DIR/api_secret_id"
    log_success "API secret_id rotated"
    
    # Rotate Workers secret_id
    NEW_WORKERS_SECRET=$(bao_exec write -f -field=secret_id auth/approle/role/cerniq-workers/secret-id)
    echo "$NEW_WORKERS_SECRET" > "$SECRETS_DIR/workers_secret_id"
    chmod 600 "$SECRETS_DIR/workers_secret_id"
    log_success "Workers secret_id rotated"
    
    # Rotate CI/CD secret_id
    NEW_CICD_SECRET=$(bao_exec write -f -field=secret_id auth/approle/role/cerniq-cicd/secret-id)
    echo "$NEW_CICD_SECRET" > "$SECRETS_DIR/cicd_secret_id"
    chmod 600 "$SECRETS_DIR/cicd_secret_id"
    log_success "CI/CD secret_id rotated"

    # Rotate Infra secret_id (PgBouncer auth_query agent)
    NEW_INFRA_SECRET=$(bao_exec write -f -field=secret_id auth/approle/role/cerniq-infra/secret-id)
    echo "$NEW_INFRA_SECRET" > "$SECRETS_DIR/infra_secret_id"
    chmod 600 "$SECRETS_DIR/infra_secret_id"
    log_success "Infra secret_id rotated"
    
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
