#!/bin/bash
# =============================================================================
# Environment Detection Script for Cerniq
# =============================================================================
# Reference: E0-S4-PR02 Security Hardening
# Version: 1.0
# Created: 2026-02-05
#
# This script detects the current environment (staging/production) and exports
# environment-specific variables for use by other scripts.
#
# Detection priority:
#   1. CERNIQ_ENV explicit variable (highest priority)
#   2. CI/CD environment (GITHUB_ACTIONS, DEPLOY_ENVIRONMENT)
#   3. Hostname detection (production vs staging servers)
#   4. Docker container detection (neanelu_traefik = staging)
#   5. Filesystem detection (/opt/cerniq on production)
#   6. Default to staging (safest fallback)
#
# Usage:
#   source /var/www/CerniqAPP/infra/scripts/detect-environment.sh
#   echo "Environment: $CERNIQ_ENV"
# =============================================================================

# Prevent multiple sourcing
if [[ -n "${CERNIQ_ENV_DETECTED:-}" ]]; then
    return 0 2>/dev/null || exit 0
fi

# =============================================================================
# Server Configuration
# =============================================================================

# Staging server (Hetzner neanelu)
STAGING_HOSTNAME="Ubuntu-2404-noble-amd64-base"
STAGING_IP="135.181.183.164"
STAGING_WORKSPACE="/var/www/CerniqAPP"
STAGING_DEPLOY_DIR="/opt/cerniq"

# Production server (Hetzner erp)
PRODUCTION_HOSTNAME="erp"
PRODUCTION_IP="95.216.225.145"
PRODUCTION_WORKSPACE="/var/www/CerniqAPP"
PRODUCTION_DEPLOY_DIR="/opt/cerniq"

# Admin IPs per environment
STAGING_ADMIN_IPS="92.180.19.237 95.216.225.145 94.130.68.123 135.181.183.164 95.216.72.100 95.216.72.118"
PRODUCTION_ADMIN_IPS="92.180.19.237 95.216.225.145"

# =============================================================================
# Environment Detection
# =============================================================================

detect_environment() {
    local detected="staging"  # Default fallback
    local detection_method="default"

    # 1. Explicit CERNIQ_ENV variable (highest priority)
    if [[ -n "${CERNIQ_ENV:-}" ]]; then
        detected="$CERNIQ_ENV"
        detection_method="CERNIQ_ENV variable"
    
    # 2. CI/CD environment detection
    elif [[ -n "${DEPLOY_ENVIRONMENT:-}" ]]; then
        detected="$DEPLOY_ENVIRONMENT"
        detection_method="DEPLOY_ENVIRONMENT"
    elif [[ -n "${GITHUB_ACTIONS:-}" ]] && [[ -n "${GITHUB_REF:-}" ]]; then
        if [[ "$GITHUB_REF" == "refs/heads/main" ]]; then
            detected="production"
            detection_method="GitHub Actions (main branch)"
        else
            detected="staging"
            detection_method="GitHub Actions (non-main branch)"
        fi
    
    # 3. Hostname detection
    elif [[ "$(hostname)" == "$PRODUCTION_HOSTNAME" ]]; then
        detected="production"
        detection_method="hostname ($PRODUCTION_HOSTNAME)"
    elif [[ "$(hostname)" == "$STAGING_HOSTNAME" ]]; then
        detected="staging"
        detection_method="hostname ($STAGING_HOSTNAME)"
    
    # 4. IP address detection
    elif ip addr 2>/dev/null | grep -q "$PRODUCTION_IP"; then
        detected="production"
        detection_method="IP address ($PRODUCTION_IP)"
    elif ip addr 2>/dev/null | grep -q "$STAGING_IP"; then
        detected="staging"
        detection_method="IP address ($STAGING_IP)"
    
    # 5. Docker container detection (staging uses neanelu_traefik)
    elif docker ps --format '{{.Names}}' 2>/dev/null | grep -q "neanelu_traefik"; then
        detected="staging"
        detection_method="Docker container (neanelu_traefik)"
    
    # 6. Filesystem detection
    elif [[ -f "/etc/cerniq/production" ]]; then
        detected="production"
        detection_method="filesystem marker (/etc/cerniq/production)"
    elif [[ -f "/etc/cerniq/staging" ]]; then
        detected="staging"
        detection_method="filesystem marker (/etc/cerniq/staging)"
    fi

    # Normalize to lowercase
    detected=$(echo "$detected" | tr '[:upper:]' '[:lower:]')

    # Validate
    if [[ "$detected" != "staging" && "$detected" != "production" ]]; then
        echo "WARNING: Invalid environment '$detected', defaulting to staging" >&2
        detected="staging"
        detection_method="validation fallback"
    fi

    echo "$detected:$detection_method"
}

# =============================================================================
# Export Environment Variables
# =============================================================================

_result=$(detect_environment)
export CERNIQ_ENV="${_result%%:*}"
export CERNIQ_ENV_DETECTION_METHOD="${_result#*:}"
export CERNIQ_ENV_DETECTED="true"

# Set environment-specific variables
if [[ "$CERNIQ_ENV" == "production" ]]; then
    export CERNIQ_SERVER_IP="$PRODUCTION_IP"
    export CERNIQ_HOSTNAME="$PRODUCTION_HOSTNAME"
    export CERNIQ_WORKSPACE="$PRODUCTION_WORKSPACE"
    export CERNIQ_DEPLOY_DIR="$PRODUCTION_DEPLOY_DIR"
    export CERNIQ_SECRETS_DIR="$PRODUCTION_DEPLOY_DIR/secrets"
    export CERNIQ_ADMIN_IPS="$PRODUCTION_ADMIN_IPS"
    export CERNIQ_OPENBAO_AUTO_UNSEAL="false"
    export CERNIQ_LOG_LEVEL="info"
else
    export CERNIQ_SERVER_IP="$STAGING_IP"
    export CERNIQ_HOSTNAME="$STAGING_HOSTNAME"
    export CERNIQ_WORKSPACE="$STAGING_WORKSPACE"
    export CERNIQ_DEPLOY_DIR="$STAGING_DEPLOY_DIR"
    export CERNIQ_SECRETS_DIR="$STAGING_WORKSPACE/secrets"
    export CERNIQ_ADMIN_IPS="$STAGING_ADMIN_IPS"
    export CERNIQ_OPENBAO_AUTO_UNSEAL="true"
    export CERNIQ_LOG_LEVEL="debug"
fi

# =============================================================================
# Helper Functions
# =============================================================================

# Print environment info (for debugging)
cerniq_env_info() {
    echo "╔════════════════════════════════════════════════════════════════════════╗"
    echo "║  Cerniq Environment Detection                                         ║"
    echo "╠════════════════════════════════════════════════════════════════════════╣"
    printf "║  Environment:     %-54s ║\n" "$CERNIQ_ENV"
    printf "║  Detection:       %-54s ║\n" "$CERNIQ_ENV_DETECTION_METHOD"
    printf "║  Server IP:       %-54s ║\n" "$CERNIQ_SERVER_IP"
    printf "║  Workspace:       %-54s ║\n" "$CERNIQ_WORKSPACE"
    printf "║  Secrets Dir:     %-54s ║\n" "$CERNIQ_SECRETS_DIR"
    printf "║  Auto-Unseal:     %-54s ║\n" "$CERNIQ_OPENBAO_AUTO_UNSEAL"
    echo "╚════════════════════════════════════════════════════════════════════════╝"
}

# Check if running in production
is_production() {
    [[ "$CERNIQ_ENV" == "production" ]]
}

# Check if running in staging
is_staging() {
    [[ "$CERNIQ_ENV" == "staging" ]]
}

# Require confirmation for production actions
require_production_confirmation() {
    local action="${1:-this action}"
    if is_production; then
        echo ""
        echo "⚠️  WARNING: You are about to perform '$action' in PRODUCTION!"
        echo ""
        read -p "Type 'PRODUCTION' to confirm: " confirmation
        if [[ "$confirmation" != "PRODUCTION" ]]; then
            echo "❌ Aborted."
            return 1
        fi
    fi
    return 0
}

# =============================================================================
# Auto-display if run directly (not sourced)
# =============================================================================

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    cerniq_env_info
fi
