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
RENDERED_SECRETS_DIR="${RENDERED_SECRETS_DIR:-/opt/cerniq/runtime-secrets}"
LOG_FILE="/var/log/cerniq/secrets-rotation.log"
REDIS_ORCHESTRATOR_ALIAS="${REDIS_ORCHESTRATOR_ALIAS:-orchestrator}"
REDIS_CONTAINER_NAME="${REDIS_CONTAINER_NAME:-redis-shared}"
HEALTH_ENDPOINTS="${HEALTH_ENDPOINTS:-http://localhost:64010/health/ready http://localhost:64080/health/live}"
REDIS_ADMIN_URL="${REDIS_ADMIN_URL:-}"

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
    merged_json="$(python3 -c "
import json, sys
existing = json.loads(sys.argv[1])
updates  = json.loads(sys.argv[2])
data = existing.get('data') or {}
data.update(updates)
print(json.dumps(data))
" "$existing_json" "$updates_json")"

    # Write merged KV v1 secret (silent).
    curl -sS -X POST "${BAO_ADDR}/v1/${secret_path}" \
        -H "X-Vault-Token: ${BAO_TOKEN}" \
        -H "Content-Type: application/json" \
        --data "$merged_json" >/dev/null
}

sha256_hex() {
    python3 -c "import hashlib,sys; print(hashlib.sha256(sys.argv[1].encode()).hexdigest())" "$1"
}

redis_cli_admin() {
    if [[ -z "$REDIS_ADMIN_URL" ]]; then
        log_error "REDIS_ADMIN_URL is required for ACL operations (ACL SETUSER/CONFIG REWRITE)."
        log_error "Set REDIS_ADMIN_URL to an admin Redis user with +acl and +config permissions."
        exit 1
    fi
    ssh "$REDIS_ORCHESTRATOR_ALIAS" \
      "docker exec $REDIS_CONTAINER_NAME redis-cli --no-auth-warning -u '$REDIS_ADMIN_URL' $*"
}

wait_for_secret_render() {
    local expected_password="$1"
    local timeout_seconds="${2:-60}"
    local start_epoch now
    start_epoch="$(date +%s)"

    while true; do
        now="$(date +%s)"
        if (( now - start_epoch > timeout_seconds )); then
            log_warning "Timed out waiting for rendered secret files to include new Redis password."
            return 1
        fi

        local api_env workers_env api_ok workers_ok
        api_env="$RENDERED_SECRETS_DIR/api/api.env"
        workers_env="$RENDERED_SECRETS_DIR/workers/workers.env"
        api_ok=false
        workers_ok=false

        if [[ -f "$api_env" ]] && [[ -f "$workers_env" ]]; then
            if grep -q "REDIS_PASSWORD=$expected_password" "$api_env" && grep -q "REDIS_PASSWORD=$expected_password" "$workers_env"; then
                api_ok=true
                workers_ok=true
            fi
        fi

        if [[ "$api_ok" == "true" && "$workers_ok" == "true" ]]; then
            log_success "Rendered secrets picked up new Redis password."
            return 0
        fi

        sleep 2
    done
}

wait_for_health_endpoints() {
    local timeout_seconds="${1:-30}"
    local start_epoch now
    start_epoch="$(date +%s)"

    while true; do
        now="$(date +%s)"
        if (( now - start_epoch > timeout_seconds )); then
            log_warning "Timed out waiting for health endpoints."
            return 1
        fi

        local all_ok=true
        for endpoint in $HEALTH_ENDPOINTS; do
            if ! curl -fsS --max-time 5 "$endpoint" >/dev/null; then
                all_ok=false
                break
            fi
        done

        if [[ "$all_ok" == "true" ]]; then
            log_success "Health endpoints are passing after secret rotation."
            return 0
        fi

        sleep 2
    done
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
    read -rp "Enter choice [1-5]: " CHOICE
    
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
        read -rp "Are you sure? (yes/no): " CONFIRM
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
# shellcheck disable=SC2034
CURRENT_REDIS=$(echo "$CURRENT_CONFIG" | jq -r '.data.redis_password')
# shellcheck disable=SC2034
CURRENT_JWT=$(echo "$CURRENT_CONFIG" | jq -r '.data.jwt_secret')

# =============================================================================
# Rotate Redis Password
# =============================================================================

if [[ "$ROTATE_REDIS" == "true" ]]; then
    log_info "🔑 Rotating Redis password..."
    log_warning "NOTE: Redis is shared on the orchestrator. Applying dual-password transition for zero downtime."

    local_current_hash="$(sha256_hex "$CURRENT_REDIS")"

    # Generate new password
    NEW_REDIS_PASS=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)
    local_new_hash="$(sha256_hex "$NEW_REDIS_PASS")"

    # Step 1: Allow both old and new passwords on Redis user cerniq.
    log_info "Step 1/6: applying dual-password ACL window for user cerniq..."
    redis_cli_admin \
      "ACL SETUSER cerniq on #$local_current_hash #$local_new_hash ~cerniq:* &cerniq:* +@all -acl -config -shutdown" >/dev/null

    # Step 2: Update in OpenBao KV v1 (merge write) so agents render new password.
    log_info "Step 2/6: writing new Redis password to OpenBao KV..."
    kv1_merge_write "secret/cerniq/api/config" "$(printf '{"redis_password":%s}' "$(python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$NEW_REDIS_PASS")")"

    # Step 3: Wait for OpenBao templates to re-render secret files.
    log_info "Step 3/6: waiting for rendered secret files..."
    wait_for_secret_render "$NEW_REDIS_PASS" 60 || true

    # Step 4: Wait for app health checks to recover with new credentials.
    log_info "Step 4/6: waiting for health endpoints..."
    wait_for_health_endpoints 30 || true

    # Step 5: Remove old password, keep only new password.
    log_info "Step 5/6: removing old password from Redis ACL..."
    redis_cli_admin \
      "ACL SETUSER cerniq on #$local_new_hash ~cerniq:* &cerniq:* +@all -acl -config -shutdown" >/dev/null

    # Step 6: Persist ACL update to disk.
    log_info "Step 6/6: persisting Redis ACL with CONFIG REWRITE..."
    redis_cli_admin "CONFIG REWRITE" >/dev/null

    log_success "Redis password rotation completed with dual-password transition."
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
