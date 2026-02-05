#!/bin/bash
# /var/www/CerniqAPP/infra/scripts/restore_table.sh
# Restore a single table from backup
# Reference: docs/runbooks/database-recovery.md §3.3
# Task: F0.7.1.T004

set -euo pipefail

LOG_FILE="/var/log/cerniq/restore_table.log"
CONTAINER="cerniq-postgres"
DB_USER="c3rn1q"
DB_NAME="cerniq"
BACKUP_DIR="/var/backups/cerniq/postgresql"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "$(date -Iseconds) $1" | tee -a "$LOG_FILE"
}

usage() {
    cat << EOF
Usage: $0 [OPTIONS] <table_name>

Restore a single table from backup.

OPTIONS:
    -f, --file FILE     Specific backup file to use (auto-detected if not specified)
    -l, --list          List available backups and tables
    --data-only         Restore data only (keep existing structure)
    --clean             Drop table before restore (default: merge data)
    --dry-run           Show what would be done
    -h, --help          Show this help message

EXAMPLES:
    $0 --list
    $0 approval_tasks
    $0 --file /path/to/backup.dump gold_companies
    $0 --data-only --clean financial_transactions

EOF
}

list_backups() {
    echo "=== Critical Table Backups (hourly) ==="
    ls -lh "$BACKUP_DIR/critical/"*.dump 2>/dev/null | tail -10 || echo "No critical backups found"
    
    echo ""
    echo "=== Daily Full Backups ==="
    ls -lh "$BACKUP_DIR/daily/"*.dump 2>/dev/null | tail -5 || echo "No daily backups found"
}

list_tables_in_backup() {
    local BACKUP_FILE="$1"
    echo "Tables in $BACKUP_FILE:"
    pg_restore --list "$BACKUP_FILE" 2>/dev/null | grep "TABLE DATA" | awk '{print "  - " $NF}'
}

# Parse arguments
TABLE_NAME=""
BACKUP_FILE=""
DATA_ONLY=false
CLEAN=false
DRY_RUN=false
ACTION="restore"

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--file)
            BACKUP_FILE="$2"
            shift 2
            ;;
        -l|--list)
            ACTION="list"
            shift
            ;;
        --data-only)
            DATA_ONLY=true
            shift
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        -*)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
        *)
            TABLE_NAME="$1"
            shift
            ;;
    esac
done

if [[ "$ACTION" == "list" ]]; then
    list_backups
    exit 0
fi

if [[ -z "$TABLE_NAME" ]]; then
    echo "ERROR: Table name required"
    usage
    exit 1
fi

log "Starting restore for table: $TABLE_NAME"

# Find backup file if not specified
if [[ -z "$BACKUP_FILE" ]]; then
    # First, check critical backups for this specific table
    CRITICAL_BACKUP=$(ls -t "$BACKUP_DIR/critical/${TABLE_NAME}_"*.dump 2>/dev/null | head -1)
    
    if [[ -n "$CRITICAL_BACKUP" && -f "$CRITICAL_BACKUP" ]]; then
        BACKUP_FILE="$CRITICAL_BACKUP"
        log "Using critical table backup: $BACKUP_FILE"
    else
        # Use latest daily full dump
        BACKUP_FILE=$(ls -t "$BACKUP_DIR/daily/"*.dump 2>/dev/null | head -1)
        log "Using daily full backup: $BACKUP_FILE"
    fi
fi

if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
    log "ERROR: No backup file found"
    exit 1
fi

# Verify table exists in backup
if ! pg_restore --list "$BACKUP_FILE" 2>/dev/null | grep -q "TABLE.*$TABLE_NAME"; then
    # Check if it's TABLE DATA
    if ! pg_restore --list "$BACKUP_FILE" 2>/dev/null | grep -q "TABLE DATA.*$TABLE_NAME"; then
        log "ERROR: Table $TABLE_NAME not found in backup"
        list_tables_in_backup "$BACKUP_FILE"
        exit 1
    fi
fi

log "Backup file: $BACKUP_FILE"
log "Table: $TABLE_NAME"
log "Data only: $DATA_ONLY"
log "Clean: $CLEAN"

if $DRY_RUN; then
    log "DRY RUN - would restore table $TABLE_NAME from $BACKUP_FILE"
    echo ""
    echo "Preview of restore command:"
    echo "pg_restore -U $DB_USER -d $DB_NAME --table=$TABLE_NAME $(if $DATA_ONLY; then echo '--data-only'; fi) $(if $CLEAN; then echo '--clean --if-exists'; fi) $BACKUP_FILE"
    exit 0
fi

# Create backup of current table state
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CURRENT_BACKUP="$BACKUP_DIR/critical/${TABLE_NAME}_pre_restore_${TIMESTAMP}.dump"

log "Backing up current table state to $CURRENT_BACKUP"
docker exec "$CONTAINER" pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --table="$TABLE_NAME" \
    --format=custom \
    > "$CURRENT_BACKUP" 2>> "$LOG_FILE" || true

# Build restore command
RESTORE_CMD="pg_restore -U $DB_USER -d $DB_NAME --table=$TABLE_NAME"

if $DATA_ONLY; then
    RESTORE_CMD="$RESTORE_CMD --data-only"
fi

if $CLEAN; then
    RESTORE_CMD="$RESTORE_CMD --clean --if-exists"
fi

RESTORE_CMD="$RESTORE_CMD --single-transaction"

# Execute restore
log "Executing restore..."

# Copy backup file to container temp
docker cp "$BACKUP_FILE" "${CONTAINER}:/tmp/restore_backup.dump"

# Run restore
docker exec "$CONTAINER" $RESTORE_CMD /tmp/restore_backup.dump 2>&1 | tee -a "$LOG_FILE"
RESTORE_RC=${PIPESTATUS[0]}

# Cleanup
docker exec "$CONTAINER" rm -f /tmp/restore_backup.dump

if [[ $RESTORE_RC -eq 0 ]]; then
    log "Table restore completed successfully"
    
    # Show row count
    ROW_COUNT=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM $TABLE_NAME" 2>/dev/null | xargs)
    log "Table $TABLE_NAME now has $ROW_COUNT rows"
else
    log "ERROR: Restore failed with code $RESTORE_RC"
    log "Previous table state saved at: $CURRENT_BACKUP"
    exit $RESTORE_RC
fi
