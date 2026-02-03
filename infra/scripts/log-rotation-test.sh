#!/bin/bash
# ============================================================================
# log-rotation-test.sh - Docker Log Rotation Validation Script
# ============================================================================
# Part of: Cerniq.app Infrastructure
# Purpose: Validates Docker log rotation configuration (ADR-0015)
# Usage: ./log-rotation-test.sh [--full]
# Exit codes: 0 = passed, 1 = warnings, 2 = critical failure
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Expected values from ADR-0015
EXPECTED_LOG_DRIVER="json-file"
EXPECTED_MAX_SIZE="50m"
EXPECTED_MAX_FILE="5"

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

# ============================================================================
# Check Functions
# ============================================================================

check_daemon_json_exists() {
    log_section "Daemon Configuration File"
    
    local daemon_file="/etc/docker/daemon.json"
    
    if [[ -f "$daemon_file" ]]; then
        log_success "daemon.json exists at $daemon_file"
        return 0
    else
        log_warning "daemon.json not found at $daemon_file"
        log_info "Template available at: infra/config/docker/daemon.json"
        return 1
    fi
}

check_log_driver() {
    log_section "Log Driver Configuration"
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon not accessible"
        return 1
    fi
    
    local log_driver
    log_driver=$(docker info --format '{{.LoggingDriver}}' 2>/dev/null)
    
    if [[ "$log_driver" == "$EXPECTED_LOG_DRIVER" ]]; then
        log_success "Log driver: $log_driver"
        return 0
    else
        log_warning "Log driver is '$log_driver', expected '$EXPECTED_LOG_DRIVER'"
        return 1
    fi
}

check_log_opts() {
    log_section "Log Options (max-size, max-file)"
    
    local daemon_file="/etc/docker/daemon.json"
    
    if [[ ! -f "$daemon_file" ]]; then
        log_warning "Cannot check log-opts: daemon.json not found"
        return 1
    fi
    
    # Check max-size
    if grep -q '"max-size"' "$daemon_file"; then
        local max_size
        max_size=$(grep -o '"max-size"[[:space:]]*:[[:space:]]*"[^"]*"' "$daemon_file" | cut -d'"' -f4)
        
        if [[ "$max_size" == "$EXPECTED_MAX_SIZE" ]]; then
            log_success "max-size: $max_size"
        else
            log_warning "max-size is '$max_size', expected '$EXPECTED_MAX_SIZE'"
        fi
    else
        log_warning "max-size not configured in daemon.json"
    fi
    
    # Check max-file
    if grep -q '"max-file"' "$daemon_file"; then
        local max_file
        max_file=$(grep -o '"max-file"[[:space:]]*:[[:space:]]*"[^"]*"' "$daemon_file" | cut -d'"' -f4)
        
        if [[ "$max_file" == "$EXPECTED_MAX_FILE" ]]; then
            log_success "max-file: $max_file"
        else
            log_warning "max-file is '$max_file', expected '$EXPECTED_MAX_FILE'"
        fi
    else
        log_warning "max-file not configured in daemon.json"
    fi
    
    return 0
}

check_container_log_sizes() {
    log_section "Current Container Log Sizes"
    
    if ! docker ps -q &> /dev/null; then
        log_info "No running containers to check"
        return 0
    fi
    
    local total_size=0
    local container_count=0
    local max_allowed=$((50 * 1024 * 1024 * 5))  # 250MB per container
    
    for container_id in $(docker ps -q 2>/dev/null); do
        local name
        name=$(docker inspect --format='{{.Name}}' "$container_id" 2>/dev/null | tr -d '/')
        
        local log_path
        log_path=$(docker inspect --format='{{.LogPath}}' "$container_id" 2>/dev/null)
        
        if [[ -z "$log_path" ]] || [[ ! -f "$log_path" ]]; then
            continue
        fi
        
        # Get total size of all log files for this container
        local container_dir
        container_dir=$(dirname "$log_path")
        
        local size=0
        for log_file in "$container_dir"/*.log*; do
            if [[ -f "$log_file" ]]; then
                local file_size
                file_size=$(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null || echo 0)
                size=$((size + file_size))
            fi
        done
        
        local size_mb=$((size / 1024 / 1024))
        total_size=$((total_size + size))
        ((container_count++))
        
        if [[ $size -gt $max_allowed ]]; then
            log_warning "$name: ${size_mb}MB (exceeds 250MB limit!)"
        elif [[ $size -gt $((max_allowed * 80 / 100)) ]]; then
            log_warning "$name: ${size_mb}MB (approaching 250MB limit)"
        else
            log_success "$name: ${size_mb}MB"
        fi
    done
    
    if [[ $container_count -gt 0 ]]; then
        local total_mb=$((total_size / 1024 / 1024))
        echo ""
        log_info "Total log storage: ${total_mb}MB across $container_count containers"
    else
        log_info "No container logs to measure"
    fi
    
    return 0
}

check_log_rotation_working() {
    log_section "Log Rotation Verification"
    
    # Find any container with rotated logs
    local has_rotation=false
    
    for container_dir in /var/lib/docker/containers/*/; do
        if [[ -d "$container_dir" ]]; then
            local rotated_logs
            rotated_logs=$(find "$container_dir" -name "*.log.[0-9]" 2>/dev/null | wc -l)
            
            if [[ $rotated_logs -gt 0 ]]; then
                has_rotation=true
                break
            fi
        fi
    done
    
    if $has_rotation; then
        log_success "Log rotation is working (found rotated log files)"
    else
        log_info "No rotated logs found yet (rotation occurs when logs reach max-size)"
    fi
    
    return 0
}

check_disk_space() {
    log_section "Docker Disk Space"
    
    local docker_root="/var/lib/docker"
    
    if [[ ! -d "$docker_root" ]]; then
        log_warning "Docker root directory not found at $docker_root"
        return 1
    fi
    
    # Get disk usage
    local disk_info
    disk_info=$(df -BG "$docker_root" 2>/dev/null | tail -1)
    
    local total
    total=$(echo "$disk_info" | awk '{print $2}' | tr -d 'G')
    local used
    used=$(echo "$disk_info" | awk '{print $3}' | tr -d 'G')
    local avail
    avail=$(echo "$disk_info" | awk '{print $4}' | tr -d 'G')
    local percent
    percent=$(echo "$disk_info" | awk '{print $5}' | tr -d '%')
    
    if [[ $percent -lt 70 ]]; then
        log_success "Disk usage: ${percent}% (${used}GB of ${total}GB used, ${avail}GB free)"
    elif [[ $percent -lt 85 ]]; then
        log_warning "Disk usage: ${percent}% (${used}GB of ${total}GB used, ${avail}GB free)"
    else
        log_error "Disk usage critical: ${percent}% (${used}GB of ${total}GB used, ${avail}GB free)"
    fi
    
    return 0
}

run_full_test() {
    log_section "Full Log Rotation Test (--full)"
    
    log_info "This test creates a temporary container and generates logs to verify rotation"
    
    # Create test container
    local test_container="cerniq-log-test-$$"
    
    log_info "Creating test container: $test_container"
    docker run -d --name "$test_container" \
        --log-driver json-file \
        --log-opt max-size=1m \
        --log-opt max-file=3 \
        busybox:1.36 sh -c 'while true; do echo "Log test line $(date)"; sleep 0.01; done' \
        &> /dev/null
    
    log_info "Generating logs (this may take a minute)..."
    sleep 30
    
    # Check if rotation occurred
    local container_id
    container_id=$(docker inspect --format='{{.Id}}' "$test_container" 2>/dev/null)
    local log_dir="/var/lib/docker/containers/$container_id"
    
    local rotated_count=0
    if [[ -d "$log_dir" ]]; then
        rotated_count=$(find "$log_dir" -name "*.log.[0-9]" 2>/dev/null | wc -l)
    fi
    
    # Cleanup
    docker stop "$test_container" &> /dev/null || true
    docker rm "$test_container" &> /dev/null || true
    
    if [[ $rotated_count -gt 0 ]]; then
        log_success "Log rotation working! Created $rotated_count rotated files"
    else
        log_warning "No rotation detected in test window (may need more logs)"
    fi
    
    return 0
}

# ============================================================================
# Main
# ============================================================================

main() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║        Cerniq.app Log Rotation Validation                     ║${NC}"
    echo -e "${BLUE}║        Based on ADR-0015                                       ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    
    local full_test=false
    if [[ "${1:-}" == "--full" ]]; then
        full_test=true
    fi
    
    # Run checks
    check_daemon_json_exists || true
    check_log_driver || true
    check_log_opts || true
    check_container_log_sizes || true
    check_log_rotation_working || true
    check_disk_space || true
    
    if $full_test; then
        run_full_test || true
    fi
    
    # Summary
    log_section "Summary"
    
    if [[ $ERRORS -eq 0 ]] && [[ $WARNINGS -eq 0 ]]; then
        echo -e "${GREEN}All log rotation checks passed!${NC}"
        exit 0
    elif [[ $ERRORS -eq 0 ]]; then
        echo -e "${YELLOW}Checks completed with $WARNINGS warning(s).${NC}"
        exit 1
    else
        echo -e "${RED}Checks completed with $ERRORS error(s) and $WARNINGS warning(s).${NC}"
        exit 2
    fi
}

main "$@"
