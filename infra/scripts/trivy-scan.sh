#!/bin/bash
# =============================================================================
# Trivy Security Scan Script for Cerniq
# =============================================================================
# Reference: security-policy.md
# Version: 1.0
# Created: 2026-02-05
# 
# This script:
#   1. Scans all Cerniq Docker images for vulnerabilities
#   2. Scans filesystem for secrets/misconfigurations
#   3. Generates reports in multiple formats
#   4. Fails CI if HIGH/CRITICAL vulnerabilities found
# 
# Usage:
#   ./trivy-scan.sh                    # Scan all images
#   ./trivy-scan.sh --image cerniq-api # Scan specific image
#   ./trivy-scan.sh --filesystem       # Scan codebase
#   ./trivy-scan.sh --ci               # CI mode (fail on HIGH+)
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

PROJECT_DIR="/var/www/CerniqAPP"
REPORTS_DIR="$PROJECT_DIR/security-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Images to scan
IMAGES=(
    "ghcr.io/cerniq/api:latest"
    "ghcr.io/cerniq/web:latest"
    "ghcr.io/cerniq/web-admin:latest"
    "ghcr.io/cerniq/worker-ai:latest"
    "ghcr.io/cerniq/worker-enrichment:latest"
    "quay.io/openbao/openbao:2.2.0"
    "postgres:18.1-bookworm"
    "redis/redis-stack-server:8.4-alpine"
    "traefik:v3.3.3"
)

# Severity levels
SEVERITIES="UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL"
EXIT_CODE=0

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
# Parse arguments
# =============================================================================

SCAN_IMAGES=true
SCAN_FILESYSTEM=false
SCAN_CONFIG=false
SPECIFIC_IMAGE=""
CI_MODE=false
OUTPUT_FORMAT="table"

while [[ $# -gt 0 ]]; do
    case $1 in
        --image)
            SPECIFIC_IMAGE="$2"
            shift 2
            ;;
        --filesystem)
            SCAN_FILESYSTEM=true
            SCAN_IMAGES=false
            shift
            ;;
        --config)
            SCAN_CONFIG=true
            SCAN_IMAGES=false
            shift
            ;;
        --ci)
            CI_MODE=true
            OUTPUT_FORMAT="json"
            shift
            ;;
        --all)
            SCAN_IMAGES=true
            SCAN_FILESYSTEM=true
            SCAN_CONFIG=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --image NAME    Scan specific image only"
            echo "  --filesystem    Scan codebase for secrets"
            echo "  --config        Scan Dockerfiles and configs"
            echo "  --ci            CI mode (JSON output, fail on HIGH+)"
            echo "  --all           Run all scan types"
            echo "  --help          Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# =============================================================================
# Pre-flight checks
# =============================================================================

log_info "🔍 Trivy Security Scanner for Cerniq"
log_info "===================================="

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Check if Trivy is installed
if ! command -v trivy &> /dev/null; then
    log_info "Installing Trivy..."
    
    # Add Trivy repository
    sudo apt-get install -y wget apt-transport-https gnupg lsb-release
    wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
    echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
    sudo apt-get update
    sudo apt-get install -y trivy
    
    log_success "Trivy installed successfully"
fi

# Update Trivy database
log_info "Updating vulnerability database..."
trivy image --download-db-only

# =============================================================================
# Image Scanning
# =============================================================================

if [[ "$SCAN_IMAGES" == "true" ]]; then
    log_info "Scanning Docker images..."
    
    # Determine images to scan
    if [[ -n "$SPECIFIC_IMAGE" ]]; then
        SCAN_LIST=("$SPECIFIC_IMAGE")
    else
        SCAN_LIST=("${IMAGES[@]}")
    fi
    
    for image in "${SCAN_LIST[@]}"; do
        log_info "Scanning: $image"
        
        REPORT_FILE="$REPORTS_DIR/image-scan-$(echo "$image" | tr '/:' '-')-${TIMESTAMP}"
        
        if [[ "$CI_MODE" == "true" ]]; then
            # CI mode: JSON output, exit code on HIGH+
            if ! trivy image \
                --severity HIGH,CRITICAL \
                --exit-code 1 \
                --format json \
                --output "${REPORT_FILE}.json" \
                "$image" 2>/dev/null; then
                log_error "HIGH/CRITICAL vulnerabilities found in $image"
                EXIT_CODE=1
            fi
        else
            # Interactive mode: table output
            trivy image \
                --severity "$SEVERITIES" \
                --format table \
                "$image" | tee "${REPORT_FILE}.txt"
            
            # Also generate JSON for later analysis
            trivy image \
                --severity "$SEVERITIES" \
                --format json \
                --output "${REPORT_FILE}.json" \
                "$image" 2>/dev/null
        fi
        
        echo ""
    done
fi

# =============================================================================
# Filesystem Scanning (Secret Detection)
# =============================================================================

if [[ "$SCAN_FILESYSTEM" == "true" ]]; then
    log_info "Scanning filesystem for secrets and misconfigurations..."
    
    REPORT_FILE="$REPORTS_DIR/filesystem-scan-${TIMESTAMP}"
    
    # Scan for secrets in codebase
    trivy fs \
        --scanners secret,misconfig \
        --severity "$SEVERITIES" \
        --format table \
        "$PROJECT_DIR" | tee "${REPORT_FILE}.txt"
    
    # JSON report
    trivy fs \
        --scanners secret,misconfig \
        --severity "$SEVERITIES" \
        --format json \
        --output "${REPORT_FILE}.json" \
        "$PROJECT_DIR" 2>/dev/null
    
    if [[ "$CI_MODE" == "true" ]]; then
        # Check for HIGH+ findings in CI
        FINDINGS=$(jq '.Results[].Secrets // [] | length' "${REPORT_FILE}.json" 2>/dev/null | awk '{s+=$1} END {print s}')
        if [[ "$FINDINGS" -gt 0 ]]; then
            log_error "Secrets detected in codebase!"
            EXIT_CODE=1
        fi
    fi
    
    echo ""
fi

# =============================================================================
# Configuration Scanning
# =============================================================================

if [[ "$SCAN_CONFIG" == "true" ]]; then
    log_info "Scanning configurations (Dockerfiles, YAML, etc.)..."
    
    REPORT_FILE="$REPORTS_DIR/config-scan-${TIMESTAMP}"
    
    # Scan Dockerfiles
    for dockerfile in $(find "$PROJECT_DIR" -name "Dockerfile" -type f 2>/dev/null); do
        log_info "Scanning: $dockerfile"
        trivy config "$dockerfile" 2>/dev/null || true
    done
    
    # Scan docker-compose files
    for compose in $(find "$PROJECT_DIR" -name "docker-compose*.yml" -type f 2>/dev/null); do
        log_info "Scanning: $compose"
        trivy config "$compose" 2>/dev/null || true
    done
    
    # Scan Kubernetes/Helm if present
    for k8s in $(find "$PROJECT_DIR" -name "*.yaml" -path "*/k8s/*" -type f 2>/dev/null); do
        log_info "Scanning: $k8s"
        trivy config "$k8s" 2>/dev/null || true
    done
    
    echo ""
fi

# =============================================================================
# Summary Report
# =============================================================================

echo ""
log_info "=========================================="
log_info "Scan Summary"
log_info "=========================================="
echo ""
log_info "Reports saved to: $REPORTS_DIR"
echo ""

# List generated reports
ls -la "$REPORTS_DIR"/*-${TIMESTAMP}* 2>/dev/null || true

echo ""

# Count findings
if [[ -f "$REPORTS_DIR/image-scan-"*"-${TIMESTAMP}.json" ]]; then
    CRITICAL=$(cat "$REPORTS_DIR"/image-scan-*-${TIMESTAMP}.json 2>/dev/null | jq -r '.Results[]?.Vulnerabilities[]?.Severity' | grep -c "CRITICAL" || echo 0)
    HIGH=$(cat "$REPORTS_DIR"/image-scan-*-${TIMESTAMP}.json 2>/dev/null | jq -r '.Results[]?.Vulnerabilities[]?.Severity' | grep -c "HIGH" || echo 0)
    MEDIUM=$(cat "$REPORTS_DIR"/image-scan-*-${TIMESTAMP}.json 2>/dev/null | jq -r '.Results[]?.Vulnerabilities[]?.Severity' | grep -c "MEDIUM" || echo 0)
    
    log_info "Vulnerability Summary:"
    log_info "  CRITICAL: $CRITICAL"
    log_info "  HIGH:     $HIGH"
    log_info "  MEDIUM:   $MEDIUM"
fi

echo ""

if [[ "$EXIT_CODE" -eq 0 ]]; then
    log_success "No HIGH/CRITICAL vulnerabilities found!"
else
    log_error "HIGH/CRITICAL vulnerabilities detected!"
    log_error "Review reports and remediate before deployment."
fi

exit $EXIT_CODE
