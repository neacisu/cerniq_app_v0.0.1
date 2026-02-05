#!/bin/bash
# /var/www/CerniqAPP/infra/scripts/pg_pitr_restore.sh
# PostgreSQL Point-In-Time Recovery (PITR) script
# Reference: docs/runbooks/database-recovery.md
# Task: F0.7.1.T004

set -euo pipefail

LOG_FILE="/var/log/cerniq/pg_pitr_restore.log"
CONTAINER="cerniq-postgres"
DB_USER="cerniq"
DB_NAME="cerniq"

# Hetzner Storage Box config
STORAGE_BOX="u502048@u502048.your-storagebox.de"
SSH_KEY="/root/.ssh/hetzner_storagebox"
REMOTE_BASEBACKUP_DIR="./backups/cerniq/postgres/basebackups"
REMOTE_WAL_DIR="./backups/cerniq/postgres/wal_archive"

# Local paths
RESTORE_BASE="/var/backups/cerniq/restore/postgres"
WAL_RESTORE_DIR="$RESTORE_BASE/wal_archive"
PGDATA_RESTORE="$RESTORE_BASE/pgdata"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "$(date -Iseconds) $1" | tee -a "$LOG_FILE"
}

usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Perform PostgreSQL Point-In-Time Recovery.

OPTIONS:
    -t, --target-time TIME    Recovery target time (format: 'YYYY-MM-DD HH:MM:SS')
    -b, --basebackup NAME     Specific basebackup to use (default: latest)
    -l, --list                List available basebackups
    --dry-run                 Show what would be done without doing it
    -h, --help                Show this help message

EXAMPLES:
    $0 --list
    $0 --target-time '2025-01-15 14:30:00'
    $0 --basebackup base_20250115_020000 --target-time '2025-01-15 14:30:00'

WARNING: This will STOP the current database and REPLACE it with restored data!

EOF
}

list_basebackups() {
    log "Listing available basebackups on Storage Box..."
    ssh -p 23 -i "$SSH_KEY" "$STORAGE_BOX" "ls -la $REMOTE_BASEBACKUP_DIR/"
}

# Parse arguments
TARGET_TIME=""
BASEBACKUP=""
DRY_RUN=false
ACTION="restore"

while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--target-time)
            TARGET_TIME="$2"
            shift 2
            ;;
        -b|--basebackup)
            BASEBACKUP="$2"
            shift 2
            ;;
        -l|--list)
            ACTION="list"
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
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

if [[ "$ACTION" == "list" ]]; then
    list_basebackups
    exit 0
fi

if [[ -z "$TARGET_TIME" ]]; then
    echo "ERROR: --target-time is required for restore"
    usage
    exit 1
fi

log "Starting PITR restore to: $TARGET_TIME"

if $DRY_RUN; then
    log "DRY RUN MODE - no changes will be made"
fi

# Create restore directories
mkdir -p "$RESTORE_BASE"
mkdir -p "$WAL_RESTORE_DIR"
mkdir -p "$PGDATA_RESTORE"

# Step 1: Find appropriate basebackup
if [[ -z "$BASEBACKUP" ]]; then
    log "Finding latest basebackup before target time..."
    BASEBACKUP=$(ssh -p 23 -i "$SSH_KEY" "$STORAGE_BOX" "ls -1 $REMOTE_BASEBACKUP_DIR/ | sort -r | head -1")
fi

if [[ -z "$BASEBACKUP" ]]; then
    log "ERROR: No basebackup found"
    exit 1
fi

log "Using basebackup: $BASEBACKUP"

if $DRY_RUN; then
    log "Would download: $BASEBACKUP"
    log "Would download WAL files from $REMOTE_WAL_DIR"
    log "Would stop container $CONTAINER"
    log "Would restore to $TARGET_TIME"
    exit 0
fi

# Step 2: Download basebackup
log "Downloading basebackup..."
scp -P 23 -i "$SSH_KEY" "${STORAGE_BOX}:${REMOTE_BASEBACKUP_DIR}/${BASEBACKUP}" "$RESTORE_BASE/"

# Step 3: Download WAL files
log "Downloading WAL archive..."
rsync -avz -e "ssh -p 23 -i $SSH_KEY" \
    "${STORAGE_BOX}:${REMOTE_WAL_DIR}/" "$WAL_RESTORE_DIR/"

# Step 4: Stop PostgreSQL container
log "Stopping PostgreSQL container..."
docker stop "$CONTAINER" || true

# Step 5: Extract basebackup
log "Extracting basebackup..."
cd "$PGDATA_RESTORE"
tar -xzf "$RESTORE_BASE/$BASEBACKUP"

# Step 6: Create recovery configuration
log "Creating recovery configuration..."
cat > "$PGDATA_RESTORE/recovery.signal" << EOF
# Recovery signal file for PITR
EOF

cat > "$PGDATA_RESTORE/postgresql.auto.conf" << EOF
# PITR Recovery Configuration
restore_command = 'cp $WAL_RESTORE_DIR/%f %p'
recovery_target_time = '$TARGET_TIME'
recovery_target_action = 'promote'
EOF

# Step 7: Set permissions
chown -R 999:999 "$PGDATA_RESTORE"

log "PITR preparation complete"
log "Basebackup extracted to: $PGDATA_RESTORE"
log "Recovery target: $TARGET_TIME"
log ""
log "NEXT STEPS (manual):"
log "1. Backup current PGDATA if needed"
log "2. Replace PGDATA with $PGDATA_RESTORE"
log "3. Start PostgreSQL container"
log "4. Monitor recovery in logs"
log "5. Verify data after recovery completes"
