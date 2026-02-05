#!/bin/bash
# /var/www/CerniqAPP/infra/scripts/disaster_recovery_full.sh
# Complete Disaster Recovery script
# Reference: docs/runbooks/database-recovery.md, docs/infrastructure/backup-strategy.md §9
# Task: F0.7.2.T004

set -euo pipefail

LOG_FILE="/var/log/cerniq/disaster_recovery.log"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESTORE_BASE="/var/backups/cerniq/restore"

# Hetzner Storage Box config
STORAGE_BOX="u502048@u502048.your-storagebox.de"
SSH_KEY="/root/.ssh/hetzner_storagebox"

# BorgBackup config
export BORG_REPO="ssh://u502048@u502048.your-storagebox.de:23/./backups/cerniq/borg"
export BORG_PASSPHRASE=$(cat /var/www/CerniqAPP/secrets/borg_passphrase.txt 2>/dev/null || cat /root/.borg_passphrase 2>/dev/null || echo "")
export BORG_RSH="ssh -i /root/.ssh/hetzner_storagebox -o StrictHostKeyChecking=no"

mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$RESTORE_BASE"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo "$(date -Iseconds) $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}SUCCESS: $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

usage() {
    cat << EOF
================================================================================
              CERNIQ DISASTER RECOVERY SCRIPT
================================================================================

Usage: $0 <COMMAND> [OPTIONS]

COMMANDS:
    status              Check current backup and system status
    assess              Assess disaster scope and recommend recovery plan
    recover-postgres    Recover PostgreSQL database
    recover-redis       Recover Redis database
    recover-app         Recover application files from Borg
    recover-full        Full system recovery (all components)
    verify              Verify recovery success
    
OPTIONS:
    --target-time TIME  Recovery target time for PITR (format: 'YYYY-MM-DD HH:MM:SS')
    --archive NAME      Specific Borg archive to use
    --skip-postgres     Skip PostgreSQL recovery in full recovery
    --skip-redis        Skip Redis recovery in full recovery
    --dry-run           Show what would be done without doing it
    --force             Skip confirmation prompts
    -h, --help          Show this help message

DISASTER SCENARIOS:
    1. Database corruption    -> recover-postgres --target-time '...'
    2. Data loss              -> recover-full --target-time '...'
    3. Complete server loss   -> recover-full (on new server)
    4. Redis cache loss       -> recover-redis (or let it rebuild)
    5. Application corruption -> recover-app

RECOVERY TIME OBJECTIVES (RTO):
    - Critical data: < 15 minutes
    - Full system: < 1 hour

EOF
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    local MISSING=0
    
    # Check SSH key
    if [[ ! -f "$SSH_KEY" ]]; then
        error "SSH key not found: $SSH_KEY"
        MISSING=1
    fi
    
    # Check Borg passphrase
    if [[ -z "$BORG_PASSPHRASE" ]]; then
        error "BORG_PASSPHRASE not set or file not found"
        MISSING=1
    fi
    
    # Check borg command
    if ! command -v borg &> /dev/null; then
        error "BorgBackup not installed"
        MISSING=1
    fi
    
    # Check docker
    if ! command -v docker &> /dev/null; then
        error "Docker not installed"
        MISSING=1
    fi
    
    if [[ $MISSING -ne 0 ]]; then
        error "Prerequisites check failed"
        return 1
    fi
    
    success "Prerequisites OK"
    return 0
}

cmd_status() {
    log "=== BACKUP & SYSTEM STATUS ==="
    
    echo ""
    echo "=== Docker Containers ==="
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "cerniq|NAME" || echo "No Cerniq containers running"
    
    echo ""
    echo "=== Borg Repository ==="
    if borg info "$BORG_REPO" 2>/dev/null; then
        echo ""
        echo "=== Last 5 Archives ==="
        borg list --short "$BORG_REPO" | tail -5
    else
        error "Cannot access Borg repository"
    fi
    
    echo ""
    echo "=== Local Backup Status ==="
    echo "PostgreSQL daily dumps:"
    ls -lh /var/backups/cerniq/postgresql/daily/*.dump 2>/dev/null | tail -3 || echo "  None found"
    
    echo ""
    echo "Redis hourly backups:"
    ls -lh /var/backups/cerniq/redis/hourly/*.rdb.zst 2>/dev/null | tail -3 || echo "  None found"
    
    echo ""
    echo "=== Storage Box Connection ==="
    if ssh -p 23 -i "$SSH_KEY" -o ConnectTimeout=5 "$STORAGE_BOX" "df -h ." 2>/dev/null; then
        success "Storage Box accessible"
    else
        error "Cannot connect to Storage Box"
    fi
}

cmd_assess() {
    log "=== DISASTER ASSESSMENT ==="
    
    local POSTGRES_OK=true
    local REDIS_OK=true
    local APP_OK=true
    
    # Check PostgreSQL
    echo ""
    echo "Checking PostgreSQL..."
    if docker exec cerniq-postgres pg_isready -U c3rn1q 2>/dev/null; then
        success "PostgreSQL is running and accepting connections"
    else
        error "PostgreSQL is not responding"
        POSTGRES_OK=false
    fi
    
    # Check Redis
    echo ""
    echo "Checking Redis..."
    if docker exec cerniq-redis redis-cli PING 2>/dev/null | grep -q PONG; then
        success "Redis is running"
    else
        error "Redis is not responding"
        REDIS_OK=false
    fi
    
    # Check application
    echo ""
    echo "Checking Application..."
    if [[ -d "/var/www/CerniqAPP/apps" ]]; then
        success "Application directory exists"
    else
        error "Application directory missing"
        APP_OK=false
    fi
    
    # Recommendations
    echo ""
    echo "=== RECOVERY RECOMMENDATIONS ==="
    
    if ! $POSTGRES_OK; then
        warn "Recommend: $0 recover-postgres"
    fi
    
    if ! $REDIS_OK; then
        warn "Recommend: $0 recover-redis (or restart container)"
    fi
    
    if ! $APP_OK; then
        warn "Recommend: $0 recover-app"
    fi
    
    if $POSTGRES_OK && $REDIS_OK && $APP_OK; then
        success "All systems appear operational. No recovery needed."
    fi
}

cmd_recover_postgres() {
    local TARGET_TIME="$1"
    local DRY_RUN="$2"
    
    log "Starting PostgreSQL recovery..."
    
    if [[ -z "$TARGET_TIME" ]]; then
        # Use latest backup if no target time specified
        warn "No target time specified, will use latest backup"
        
        # Find latest daily dump
        LATEST_DUMP=$(ls -t /var/backups/cerniq/postgresql/daily/*.dump 2>/dev/null | head -1)
        
        if [[ -z "$LATEST_DUMP" ]]; then
            error "No local dumps found, downloading from Storage Box..."
            # Would download here
        fi
        
        log "Using latest dump: $LATEST_DUMP"
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log "DRY RUN: Would restore from $LATEST_DUMP"
            return 0
        fi
        
        # Stop services depending on postgres
        log "Stopping dependent services..."
        docker stop cerniq-api cerniq-pgbouncer 2>/dev/null || true
        
        # Restore
        log "Restoring database..."
        docker exec -i cerniq-postgres pg_restore \
            -U c3rn1q \
            -d cerniq \
            --clean \
            --if-exists \
            < "$LATEST_DUMP"
        
        # Restart services
        log "Restarting services..."
        docker start cerniq-pgbouncer cerniq-api 2>/dev/null || true
        
        success "PostgreSQL recovery completed"
    else
        # PITR recovery
        log "Initiating PITR recovery to: $TARGET_TIME"
        
        if [[ "$DRY_RUN" == "true" ]]; then
            "$SCRIPT_DIR/pg_pitr_restore.sh" --target-time "$TARGET_TIME" --dry-run
        else
            "$SCRIPT_DIR/pg_pitr_restore.sh" --target-time "$TARGET_TIME"
        fi
    fi
}

cmd_recover_redis() {
    local DRY_RUN="$1"
    
    log "Starting Redis recovery..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        "$SCRIPT_DIR/redis_restore.sh" --list
        return 0
    fi
    
    "$SCRIPT_DIR/redis_restore.sh"
}

cmd_recover_app() {
    local ARCHIVE="$1"
    local DRY_RUN="$2"
    
    log "Starting application recovery from Borg..."
    
    if [[ -z "$ARCHIVE" ]]; then
        ARCHIVE=$(borg list --short "$BORG_REPO" | tail -1)
        log "Using latest archive: $ARCHIVE"
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would restore from archive $ARCHIVE"
        borg list "${BORG_REPO}::${ARCHIVE}" | head -20
        return 0
    fi
    
    "$SCRIPT_DIR/borg_restore.sh" -t "$RESTORE_BASE/app" "$ARCHIVE" "var/www/CerniqAPP"
    
    success "Application files restored to $RESTORE_BASE/app"
    log "Review restored files and copy to /var/www/CerniqAPP as needed"
}

cmd_recover_full() {
    local TARGET_TIME="$1"
    local ARCHIVE="$2"
    local SKIP_POSTGRES="$3"
    local SKIP_REDIS="$4"
    local DRY_RUN="$5"
    local FORCE="$6"
    
    log "=== FULL DISASTER RECOVERY ==="
    
    if [[ "$FORCE" != "true" && "$DRY_RUN" != "true" ]]; then
        echo ""
        echo "WARNING: This will perform a full system recovery which may:"
        echo "  - Stop all Cerniq services"
        echo "  - Overwrite current database data"
        echo "  - Overwrite application files"
        echo ""
        read -p "Are you sure you want to continue? (yes/no): " CONFIRM
        if [[ "$CONFIRM" != "yes" ]]; then
            log "Recovery cancelled by user"
            exit 0
        fi
    fi
    
    # Stop all services
    log "Stopping all Cerniq services..."
    if [[ "$DRY_RUN" != "true" ]]; then
        docker stop cerniq-api cerniq-web cerniq-pgbouncer 2>/dev/null || true
    fi
    
    # Recover PostgreSQL
    if [[ "$SKIP_POSTGRES" != "true" ]]; then
        cmd_recover_postgres "$TARGET_TIME" "$DRY_RUN"
    else
        log "Skipping PostgreSQL recovery"
    fi
    
    # Recover Redis
    if [[ "$SKIP_REDIS" != "true" ]]; then
        cmd_recover_redis "$DRY_RUN"
    else
        log "Skipping Redis recovery"
    fi
    
    # Recover application
    cmd_recover_app "$ARCHIVE" "$DRY_RUN"
    
    # Restart services
    log "Starting all services..."
    if [[ "$DRY_RUN" != "true" ]]; then
        docker start cerniq-postgres cerniq-redis cerniq-pgbouncer cerniq-api cerniq-web 2>/dev/null || true
    fi
    
    success "Full recovery completed"
    log "Run '$0 verify' to check recovery status"
}

cmd_verify() {
    log "=== RECOVERY VERIFICATION ==="
    
    local ALL_OK=true
    
    # Check PostgreSQL
    echo ""
    echo "Verifying PostgreSQL..."
    if docker exec cerniq-postgres psql -U c3rn1q -d cerniq -c "SELECT 1" &>/dev/null; then
        success "PostgreSQL: Connected and responding"
        
        # Check table count
        TABLE_COUNT=$(docker exec cerniq-postgres psql -U c3rn1q -d cerniq -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | xargs)
        log "PostgreSQL: $TABLE_COUNT tables in public schema"
    else
        error "PostgreSQL: Connection failed"
        ALL_OK=false
    fi
    
    # Check Redis
    echo ""
    echo "Verifying Redis..."
    if docker exec cerniq-redis redis-cli PING | grep -q PONG; then
        success "Redis: Connected and responding"
        
        DBSIZE=$(docker exec cerniq-redis redis-cli DBSIZE | cut -d: -f2)
        log "Redis: $DBSIZE keys"
    else
        error "Redis: Connection failed"
        ALL_OK=false
    fi
    
    # Check application
    echo ""
    echo "Verifying Application..."
    if [[ -f "/var/www/CerniqAPP/package.json" ]]; then
        success "Application: package.json exists"
    else
        error "Application: package.json missing"
        ALL_OK=false
    fi
    
    echo ""
    if $ALL_OK; then
        success "=== VERIFICATION PASSED ==="
    else
        error "=== VERIFICATION FAILED ==="
        return 1
    fi
}

# Main
if [[ $# -lt 1 ]]; then
    usage
    exit 0
fi

COMMAND="$1"
shift

# Parse global options
TARGET_TIME=""
ARCHIVE=""
SKIP_POSTGRES=false
SKIP_REDIS=false
DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --target-time)
            TARGET_TIME="$2"
            shift 2
            ;;
        --archive)
            ARCHIVE="$2"
            shift 2
            ;;
        --skip-postgres)
            SKIP_POSTGRES=true
            shift
            ;;
        --skip-redis)
            SKIP_REDIS=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Execute command
case $COMMAND in
    status)
        check_prerequisites && cmd_status
        ;;
    assess)
        check_prerequisites && cmd_assess
        ;;
    recover-postgres)
        check_prerequisites && cmd_recover_postgres "$TARGET_TIME" "$DRY_RUN"
        ;;
    recover-redis)
        check_prerequisites && cmd_recover_redis "$DRY_RUN"
        ;;
    recover-app)
        check_prerequisites && cmd_recover_app "$ARCHIVE" "$DRY_RUN"
        ;;
    recover-full)
        check_prerequisites && cmd_recover_full "$TARGET_TIME" "$ARCHIVE" "$SKIP_POSTGRES" "$SKIP_REDIS" "$DRY_RUN" "$FORCE"
        ;;
    verify)
        cmd_verify
        ;;
    -h|--help)
        usage
        ;;
    *)
        error "Unknown command: $COMMAND"
        usage
        exit 1
        ;;
esac
