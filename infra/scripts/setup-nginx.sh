#!/bin/bash
# =============================================================================
# CERNIQ.APP — Nginx Setup Script for Production/Staging
# =============================================================================
# Usage: ./setup-nginx.sh [production|staging]
# Reference: ADR-0022 Port Allocation Strategy, F0.16 DNS Configuration
# =============================================================================

set -euo pipefail

ENVIRONMENT="${1:-staging}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration based on environment
if [[ "$ENVIRONMENT" == "production" ]]; then
    DOMAINS="cerniq.app www.cerniq.app api.cerniq.app admin.cerniq.app monitoring.cerniq.app signoz.cerniq.app traefik.cerniq.app"
    PRIMARY_DOMAIN="cerniq.app"
    NGINX_CONF="cerniq-production.conf"
elif [[ "$ENVIRONMENT" == "staging" ]]; then
    DOMAINS="staging.cerniq.app"
    PRIMARY_DOMAIN="staging.cerniq.app"
    NGINX_CONF="cerniq-staging.conf"
else
    log_error "Invalid environment: $ENVIRONMENT. Use 'production' or 'staging'"
    exit 1
fi

log_info "Setting up Nginx for $ENVIRONMENT environment"
log_info "Domains: $DOMAINS"

# Step 1: Install nginx and certbot
log_info "Step 1: Installing nginx and certbot..."
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx

# Step 2: Create certbot webroot directory
log_info "Step 2: Creating certbot webroot..."
mkdir -p /var/www/certbot

# Step 3: Stop nginx temporarily for initial cert
log_info "Step 3: Stopping nginx for certificate generation..."
systemctl stop nginx || true

# Step 4: Obtain Let's Encrypt certificate (standalone mode for initial setup)
log_info "Step 4: Obtaining Let's Encrypt certificate..."

# Build certbot command
CERTBOT_CMD="certbot certonly --standalone --non-interactive --agree-tos --email admin@cerniq.app"
for domain in $DOMAINS; do
    CERTBOT_CMD="$CERTBOT_CMD -d $domain"
done

# Expand to primary domain for cert-name
CERTBOT_CMD="$CERTBOT_CMD --cert-name $PRIMARY_DOMAIN"

log_info "Running: $CERTBOT_CMD"
eval $CERTBOT_CMD || {
    log_warn "Certbot failed. Certificate may already exist or DNS not propagated."
    log_warn "You can retry with: certbot certonly --nginx -d $PRIMARY_DOMAIN"
}

# Step 5: Copy nginx configuration
log_info "Step 5: Installing nginx configuration..."
NGINX_CONF_SRC="${SCRIPT_DIR}/../config/nginx/${NGINX_CONF}"
if [[ -f "$NGINX_CONF_SRC" ]]; then
    cp "$NGINX_CONF_SRC" /etc/nginx/sites-available/cerniq.conf
    ln -sf /etc/nginx/sites-available/cerniq.conf /etc/nginx/sites-enabled/cerniq.conf
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
else
    log_error "Nginx config not found: $NGINX_CONF_SRC"
    exit 1
fi

# Step 6: Test nginx configuration
log_info "Step 6: Testing nginx configuration..."
nginx -t || {
    log_error "Nginx configuration test failed!"
    exit 1
}

# Step 7: Start nginx
log_info "Step 7: Starting nginx..."
systemctl start nginx
systemctl enable nginx

# Step 8: Setup certbot auto-renewal
log_info "Step 8: Setting up certbot auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

# Step 9: Verify setup
log_info "Step 9: Verifying setup..."
systemctl status nginx --no-pager || true
curl -s -o /dev/null -w "%{http_code}" http://localhost/nginx-health || echo "Health check pending (Traefik not running)"

log_info "=========================================="
log_info "Nginx setup complete for $ENVIRONMENT!"
log_info "=========================================="
log_info "Next steps:"
log_info "1. Ensure DNS records point to this server"
log_info "2. Start Traefik on port 64080"
log_info "3. Test: curl -I https://$PRIMARY_DOMAIN"
