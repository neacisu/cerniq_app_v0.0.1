#!/bin/bash
# ============================================================================
# check-docker.sh - Docker Environment Validation Script
# ============================================================================
# Part of: Cerniq.app Infrastructure
# Purpose: Validates Docker installation meets ADR-0015 requirements
# Usage: ./check-docker.sh [--strict]
# Exit codes: 0 = all checks passed, 1 = warnings only, 2 = critical failure
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Required versions (from ADR-0015)
REQUIRED_DOCKER_VERSION="29.1.0"
REQUIRED_COMPOSE_VERSION="2.40.0"

# Counters
WARNINGS=0
ERRORS=0

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
    ((WARNINGS++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((ERRORS++))
}

log_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Version comparison (returns 0 if $1 >= $2)
version_gte() {
    [ "$(printf '%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

# ============================================================================
# Check Functions
# ============================================================================

check_docker_installed() {
    log_section "Docker Engine Check"
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        return 1
    fi
    
    # Check if Docker is from official repository (not snap)
    if command -v snap &> /dev/null && snap list docker &> /dev/null; then
        log_error "Docker installed via snap - must use official Docker repository"
        log_info "See: https://docs.docker.com/engine/install/ubuntu/"
        return 1
    fi
    
    log_success "Docker is installed from official repository"
    return 0
}

check_docker_version() {
    local docker_version
    docker_version=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "0.0.0")
    
    log_info "Docker version: $docker_version (required: >= $REQUIRED_DOCKER_VERSION)"
    
    if version_gte "$docker_version" "$REQUIRED_DOCKER_VERSION"; then
        log_success "Docker version meets requirements"
        return 0
    else
        log_error "Docker version $docker_version is below required $REQUIRED_DOCKER_VERSION"
        return 1
    fi
}

check_docker_compose() {
    log_section "Docker Compose Check"
    
    # Check for plugin-based compose (docker compose) NOT standalone docker-compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose plugin not installed"
        log_info "Install with: sudo apt install docker-compose-plugin"
        return 1
    fi
    
    local compose_version
    compose_version=$(docker compose version --short 2>/dev/null | sed 's/^v//')
    
    log_info "Docker Compose version: $compose_version (required: >= $REQUIRED_COMPOSE_VERSION)"
    
    if version_gte "$compose_version" "$REQUIRED_COMPOSE_VERSION"; then
        log_success "Docker Compose version meets requirements"
        return 0
    else
        log_warning "Docker Compose version $compose_version is below recommended $REQUIRED_COMPOSE_VERSION"
        return 0
    fi
}

check_docker_daemon_running() {
    log_section "Docker Daemon Status"
    
    if docker info &> /dev/null; then
        log_success "Docker daemon is running"
        return 0
    else
        log_error "Docker daemon is not running or not accessible"
        log_info "Try: sudo systemctl start docker"
        return 1
    fi
}

check_daemon_config() {
    log_section "Docker Daemon Configuration (ADR-0015)"
    
    local daemon_file="/etc/docker/daemon.json"
    local config_template="infra/config/docker/daemon.json"
    
    if [[ ! -f "$daemon_file" ]]; then
        log_warning "No daemon.json found at $daemon_file"
        log_info "Apply template with: sudo cp $config_template $daemon_file && sudo systemctl restart docker"
        return 0
    fi
    
    # Check storage driver
    local storage_driver
    storage_driver=$(docker info --format '{{.Driver}}' 2>/dev/null)
    if [[ "$storage_driver" == "overlay2" ]]; then
        log_success "Storage driver: overlay2"
    else
        log_warning "Storage driver is '$storage_driver', expected 'overlay2'"
    fi
    
    # Check log driver
    local log_driver
    log_driver=$(docker info --format '{{.LoggingDriver}}' 2>/dev/null)
    if [[ "$log_driver" == "json-file" ]]; then
        log_success "Log driver: json-file"
    else
        log_warning "Log driver is '$log_driver', expected 'json-file'"
    fi
    
    # Check live-restore
    local live_restore
    live_restore=$(docker info --format '{{.LiveRestoreEnabled}}' 2>/dev/null)
    if [[ "$live_restore" == "true" ]]; then
        log_success "Live restore: enabled"
    else
        log_warning "Live restore is disabled (expected: enabled)"
    fi
    
    # Check metrics endpoint
    if grep -q '"metrics-addr"' "$daemon_file" 2>/dev/null; then
        local metrics_addr
        metrics_addr=$(grep -o '"metrics-addr"[[:space:]]*:[[:space:]]*"[^"]*"' "$daemon_file" | cut -d'"' -f4)
        if [[ "$metrics_addr" == "0.0.0.0:64093" ]]; then
            log_success "Metrics endpoint: $metrics_addr"
        else
            log_warning "Metrics endpoint is '$metrics_addr', expected '0.0.0.0:64093'"
        fi
    else
        log_warning "Metrics endpoint not configured"
    fi
    
    return 0
}

check_networks() {
    log_section "Docker Networks Check"
    
    local networks=("cerniq_public" "cerniq_backend" "cerniq_data")
    local subnets=("172.27.0.0/24" "172.28.0.0/24" "172.29.0.0/24")
    local internal=("false" "true" "true")
    
    for i in "${!networks[@]}"; do
        local net="${networks[$i]}"
        local expected_subnet="${subnets[$i]}"
        local expected_internal="${internal[$i]}"
        
        if docker network inspect "$net" &> /dev/null; then
            local subnet
            subnet=$(docker network inspect "$net" --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null)
            local is_internal
            is_internal=$(docker network inspect "$net" --format '{{.Internal}}' 2>/dev/null)
            
            if [[ "$subnet" == "$expected_subnet" ]]; then
                log_success "Network $net: subnet $subnet"
            else
                log_warning "Network $net has subnet '$subnet', expected '$expected_subnet'"
            fi
            
            if [[ "$is_internal" == "$expected_internal" ]]; then
                log_success "Network $net: internal=$is_internal"
            else
                log_warning "Network $net has internal='$is_internal', expected '$expected_internal'"
            fi
        else
            log_info "Network $net not created yet (will be created by docker compose)"
        fi
    done
    
    return 0
}

check_port_conflicts() {
    log_section "Port Availability Check (ADR-0022)"
    
    # Cerniq ports range
    local ports=(64000 64010 64011 64032 64039 64042 64070 64071 64080 64081 64082 64083 64093)
    
    for port in "${ports[@]}"; do
        if ss -tuln 2>/dev/null | grep -q ":${port} "; then
            local process
            process=$(ss -tulnp 2>/dev/null | grep ":${port} " | awk '{print $NF}' | head -1)
            log_warning "Port $port is in use by: $process"
        else
            log_success "Port $port is available"
        fi
    done
    
    return 0
}

check_user_permissions() {
    log_section "User Permissions Check"
    
    if groups | grep -q docker; then
        log_success "Current user is in docker group"
    else
        log_warning "Current user is not in docker group"
        log_info "Add with: sudo usermod -aG docker \$USER"
    fi
    
    return 0
}

check_system_resources() {
    log_section "System Resources (ADR-0027)"
    
    # Check RAM (expected 128GB for production)
    local total_ram_kb
    total_ram_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    local total_ram_gb=$((total_ram_kb / 1024 / 1024))
    
    if [[ $total_ram_gb -ge 128 ]]; then
        log_success "RAM: ${total_ram_gb}GB (meets 128GB requirement)"
    elif [[ $total_ram_gb -ge 64 ]]; then
        log_warning "RAM: ${total_ram_gb}GB (staging acceptable, production needs 128GB)"
    else
        log_warning "RAM: ${total_ram_gb}GB (minimum recommended: 64GB)"
    fi
    
    # Check CPU cores (expected 20 for production)
    local cpu_cores
    cpu_cores=$(nproc)
    
    if [[ $cpu_cores -ge 20 ]]; then
        log_success "CPU: $cpu_cores cores (meets 20 cores requirement)"
    elif [[ $cpu_cores -ge 8 ]]; then
        log_warning "CPU: $cpu_cores cores (staging acceptable, production needs 20)"
    else
        log_warning "CPU: $cpu_cores cores (minimum recommended: 8)"
    fi
    
    # Check disk space
    local disk_free
    disk_free=$(df -BG /var/lib/docker 2>/dev/null | tail -1 | awk '{print $4}' | tr -d 'G')
    
    if [[ -n "$disk_free" ]] && [[ $disk_free -ge 100 ]]; then
        log_success "Docker disk space: ${disk_free}GB free"
    elif [[ -n "$disk_free" ]]; then
        log_warning "Docker disk space: ${disk_free}GB free (recommended: 100GB+)"
    else
        log_info "Could not determine Docker disk space"
    fi
    
    return 0
}

# ============================================================================
# Main
# ============================================================================

main() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Cerniq.app Docker Environment Validation               ║${NC}"
    echo -e "${BLUE}║       Based on ADR-0015, ADR-0022, ADR-0027                   ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    
    local strict_mode=false
    if [[ "${1:-}" == "--strict" ]]; then
        strict_mode=true
        log_info "Running in strict mode"
    fi
    
    # Run all checks
    check_docker_installed || true
    check_docker_version || true
    check_docker_compose || true
    check_docker_daemon_running || true
    check_daemon_config || true
    check_networks || true
    check_port_conflicts || true
    check_user_permissions || true
    check_system_resources || true
    
    # Summary
    log_section "Summary"
    
    if [[ $ERRORS -eq 0 ]] && [[ $WARNINGS -eq 0 ]]; then
        echo -e "${GREEN}All checks passed! Docker environment is ready.${NC}"
        exit 0
    elif [[ $ERRORS -eq 0 ]]; then
        echo -e "${YELLOW}Checks completed with $WARNINGS warning(s).${NC}"
        if $strict_mode; then
            exit 1
        else
            exit 0
        fi
    else
        echo -e "${RED}Checks completed with $ERRORS error(s) and $WARNINGS warning(s).${NC}"
        exit 2
    fi
}

main "$@"
