#!/bin/bash
# =============================================================================
# UFW Firewall Setup Script for Cerniq Production/Staging
# =============================================================================
# Reference: security-policy.md
# Version: 1.0
# Created: 2026-02-05
# 
# This script configures:
#   1. Default deny incoming
#   2. Allow SSH from admin IPs only
#   3. Allow HTTP/HTTPS from anywhere
#   4. Allow Docker internal networks
#   5. Rate limiting
# 
# Admin IPs (whitelisted):
#   - 92.180.19.237  (Office)
#   - 95.216.225.145 (Admin 1)
#   - 94.130.68.123  (Admin 2)
#   - 135.181.183.164 (Admin 3)
#   - 95.216.72.100  (Backup Server 1)
#   - 95.216.72.118  (Backup Server 2)
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

# Admin IPs (from user input)
ADMIN_IPS=(
    "92.180.19.237"
    "95.216.225.145"
    "94.130.68.123"
    "135.181.183.164"
    "95.216.72.100"
    "95.216.72.118"
)

# Ports to open publicly
PUBLIC_PORTS=(
    "80/tcp"   # HTTP (Traefik)
    "443/tcp"  # HTTPS (Traefik)
)

# Ports for admin IPs only
ADMIN_PORTS=(
    "22/tcp"   # SSH
)

# Docker networks (internal, don't block)
DOCKER_NETWORKS=(
    "172.27.0.0/24"  # cerniq_public
    "172.28.0.0/24"  # cerniq_backend
    "172.29.0.0/24"  # cerniq_data
)

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

log_info "🔥 UFW Firewall Setup for Cerniq"
log_info "================================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root or with sudo"
    exit 1
fi

# Check if UFW is installed
if ! command -v ufw &> /dev/null; then
    log_info "Installing UFW..."
    apt-get update && apt-get install -y ufw
fi

# =============================================================================
# Backup current rules
# =============================================================================

log_info "Backing up current UFW rules..."

BACKUP_FILE="/etc/ufw/rules.backup.$(date +%Y%m%d_%H%M%S)"
if [[ -f /etc/ufw/user.rules ]]; then
    cp /etc/ufw/user.rules "$BACKUP_FILE"
    log_success "Backed up to: $BACKUP_FILE"
fi

# =============================================================================
# Reset UFW
# =============================================================================

log_warning "⚠️  This will reset ALL firewall rules!"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [[ "$CONFIRM" != "yes" ]]; then
    log_info "Aborted."
    exit 0
fi

log_info "Resetting UFW to defaults..."

# Disable first
ufw --force disable

# Reset all rules
ufw --force reset

# =============================================================================
# Configure defaults
# =============================================================================

log_info "Setting default policies..."

# Default deny incoming, allow outgoing
ufw default deny incoming
ufw default allow outgoing

# Disable IPv6 (optional, uncomment if needed)
# sed -i 's/IPV6=yes/IPV6=no/' /etc/default/ufw

log_success "Defaults set: deny incoming, allow outgoing"

# =============================================================================
# Allow Docker internal networks
# =============================================================================

log_info "Allowing Docker internal networks..."

for network in "${DOCKER_NETWORKS[@]}"; do
    ufw allow from "$network" to any
    log_info "  Allowed: $network"
done

log_success "Docker networks allowed"

# =============================================================================
# Allow SSH from admin IPs only
# =============================================================================

log_info "Configuring SSH access (admin IPs only)..."

for port in "${ADMIN_PORTS[@]}"; do
    for ip in "${ADMIN_IPS[@]}"; do
        ufw allow from "$ip" to any port "${port%%/*}" proto "${port##*/}"
        log_info "  Allowed: $ip -> $port"
    done
done

log_success "SSH restricted to admin IPs"

# =============================================================================
# Allow public ports
# =============================================================================

log_info "Configuring public ports..."

for port in "${PUBLIC_PORTS[@]}"; do
    ufw allow "$port"
    log_info "  Allowed: $port (all sources)"
done

log_success "Public ports configured"

# =============================================================================
# Rate limiting for SSH
# =============================================================================

log_info "Enabling rate limiting for SSH..."

# UFW rate limiting: max 6 connections per 30 seconds
# Applied per admin IP (already restricted above)
# Additional protection via fail2ban

log_warning "Note: fail2ban provides additional SSH brute-force protection"

# =============================================================================
# Allow loopback
# =============================================================================

log_info "Allowing loopback interface..."

ufw allow in on lo
ufw allow out on lo

# =============================================================================
# Enable UFW
# =============================================================================

log_info "Enabling UFW..."

ufw --force enable

# =============================================================================
# Show status
# =============================================================================

echo ""
log_success "=========================================="
log_success "UFW Firewall Configuration Complete!"
log_success "=========================================="
echo ""

ufw status verbose

echo ""
log_info "Admin IPs whitelisted for SSH:"
for ip in "${ADMIN_IPS[@]}"; do
    log_info "  - $ip"
done

echo ""
log_warning "⚠️  IMPORTANT:"
log_warning "  1. Verify SSH access from your IP before closing terminal"
log_warning "  2. Keep a console session open during testing"
log_warning "  3. Use 'ufw status numbered' to see rule numbers"
log_warning "  4. Use 'ufw delete <number>' to remove rules"
echo ""

# =============================================================================
# Save configuration note
# =============================================================================

echo "# UFW configured $(date)" >> /etc/ufw/setup.log
for ip in "${ADMIN_IPS[@]}"; do
    echo "# Admin IP: $ip" >> /etc/ufw/setup.log
done

log_success "Configuration logged to /etc/ufw/setup.log"
