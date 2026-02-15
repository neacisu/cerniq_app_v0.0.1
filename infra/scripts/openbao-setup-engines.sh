#!/bin/bash
# =============================================================================
# OpenBao Engines Setup (Cerniq-only, additive)
# =============================================================================
# - DO NOT modify shared KV mounts (secret/) or global PKI/Transit paths.
# - Enable ONLY Cerniq-isolated mounts and apply Cerniq policies from repo.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/detect-environment.sh" ]]; then
  # shellcheck disable=SC1091
  source "${SCRIPT_DIR}/detect-environment.sh"
fi

BAO_ADDR="${BAO_ADDR:-https://s3cr3ts.neanelu.ro}"
SECRETS_DIR="${CERNIQ_SECRETS_DIR:-/opt/cerniq/secrets}"
CONFIG_DIR="${CERNIQ_WORKSPACE:-/var/www/CerniqAPP}/infra/config/openbao"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

log_info "🔧 OpenBao Engines Setup (Cerniq-only)"
log_info "======================================"

if [[ -z "${BAO_TOKEN:-}" ]]; then
  if [[ -f "$SECRETS_DIR/openbao_root_token.txt" ]]; then
    export BAO_TOKEN
    BAO_TOKEN="$(cat "$SECRETS_DIR/openbao_root_token.txt")"
  else
    log_error "BAO_TOKEN not set and root token file missing at $SECRETS_DIR/openbao_root_token.txt"
    exit 1
  fi
fi

bao_exec() {
  BAO_ADDR="$BAO_ADDR" BAO_TOKEN="$BAO_TOKEN" bao "$@"
}

log_info "📁 Pre-check shared KV mount (secret/)..."
if ! bao_exec secrets list 2>/dev/null | grep -q '^secret/'; then
  log_error "KV mount secret/ not found. This is shared infra; do NOT auto-enable here."
  exit 1
fi
log_success "KV mount secret/ present (left untouched)"

log_info "🗄️  Enabling DB engine at cerniq-db/ (isolated)..."
bao_exec secrets enable -path=cerniq-db database 2>/dev/null || \
  log_warning "cerniq-db mount may already be enabled"
log_success "DB engine ready at cerniq-db/"

log_info "📋 Applying policies from repo (Cerniq-only)..."
if [[ -d "$CONFIG_DIR/policies" ]]; then
  for policy_file in "$CONFIG_DIR/policies"/*.hcl; do
    [[ -f "$policy_file" ]] || continue
    policy_name="$(basename "$policy_file" .hcl)"
    log_info "Applying policy: $policy_name"
    bao_exec policy write "$policy_name" "$policy_file" >/dev/null
  done
  log_success "Policies applied"
else
  log_warning "Policy directory not found: $CONFIG_DIR/policies (skipping)"
fi

echo ""
log_success "=========================================="
log_success "Engines Setup Complete (Cerniq-only)"
log_success "=========================================="
echo ""
log_info "Next steps:"
log_info "  - Run ./openbao-setup-database.sh to configure cerniq-db/config/cerniq-postgres"
log_info "  - Run ./openbao-setup-approle.sh to (re)create AppRoles and save role_id/secret_id"
echo ""
