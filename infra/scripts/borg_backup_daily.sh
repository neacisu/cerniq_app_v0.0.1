#!/bin/bash
# /var/www/CerniqAPP/infra/scripts/borg_backup_daily.sh
# Daily incremental backup to Hetzner Storage Box using BorgBackup
# Reference: docs/adr/ADR Etapa 0/ADR-0020-BorgBackup-cu-Hetzner-Storage-Box.md
# Task: F0.7.1.T002

set -euo pipefail

# BorgBackup configuration
export BORG_REPO="ssh://u502048@u502048.your-storagebox.de:23/./backups/cerniq/borg"
export BORG_PASSPHRASE=$(cat /var/www/CerniqAPP/secrets/borg_passphrase.txt 2>/dev/null || cat /root/.borg_passphrase)
export BORG_RSH="ssh -i /root/.ssh/hetzner_storagebox -o StrictHostKeyChecking=no"

ARCHIVE_NAME="cerniq-{now:%Y-%m-%d_%H%M%S}"
LOG_FILE="/var/log/cerniq/borg_backup.log"

# Directories to backup
BACKUP_SOURCES=(
    "/var/www/CerniqAPP"
    "/var/backups/cerniq/postgresql/daily"
    "/var/backups/cerniq/postgresql/critical"
    "/var/backups/cerniq/redis/hourly"
)

# Exclude patterns
EXCLUDES=(
    "*.pyc"
    "__pycache__"
    "node_modules"
    ".git"
    "*.log"
    ".env.local"
    "*.tmp"
    ".pnpm-store"
    "test-results"
)

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "$(date -Iseconds) $1" | tee -a "$LOG_FILE"
}

log "Starting Borg daily backup"

# Build exclude arguments
EXCLUDE_ARGS=""
for pattern in "${EXCLUDES[@]}"; do
    EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude '$pattern'"
done

# Build source list (only existing directories)
SOURCES=""
for src in "${BACKUP_SOURCES[@]}"; do
    if [[ -d "$src" ]]; then
        SOURCES="$SOURCES $src"
    else
        log "SKIP: Directory $src does not exist"
    fi
done

if [[ -z "$SOURCES" ]]; then
    log "ERROR: No backup sources found"
    exit 1
fi

# Create backup
log "Creating archive: $ARCHIVE_NAME"
eval borg create \
    --verbose \
    --filter AME \
    --list \
    --stats \
    --show-rc \
    --compression zstd,19 \
    --exclude-caches \
    $EXCLUDE_ARGS \
    "${BORG_REPO}::${ARCHIVE_NAME}" \
    $SOURCES 2>&1 | tee -a "$LOG_FILE"

BACKUP_RC=${PIPESTATUS[0]}

if [[ $BACKUP_RC -eq 0 ]]; then
    log "Backup completed successfully"
elif [[ $BACKUP_RC -eq 1 ]]; then
    log "Backup completed with warnings"
else
    log "ERROR: Backup failed with code $BACKUP_RC"
    exit $BACKUP_RC
fi

# Prune old backups according to retention policy
log "Pruning old archives..."
borg prune \
    --list \
    --show-rc \
    --keep-hourly 6 \
    --keep-daily 7 \
    --keep-weekly 4 \
    --keep-monthly 6 \
    "$BORG_REPO" 2>&1 | tee -a "$LOG_FILE"

PRUNE_RC=${PIPESTATUS[0]}

if [[ $PRUNE_RC -ne 0 ]]; then
    log "WARNING: Prune returned code $PRUNE_RC"
fi

# Compact repository to free space
log "Compacting repository..."
borg compact "$BORG_REPO" 2>&1 | tee -a "$LOG_FILE"

log "Borg daily backup completed"
