#!/bin/bash
# /var/www/CerniqAPP/infra/scripts/cleanup_wal_archive.sh
# Clean up old WAL archive files locally and remotely
# Reference: docs/infrastructure/backup-strategy.md §6.2
# Task: F0.7.2.T003

set -euo pipefail

LOG_FILE="/var/log/cerniq/wal_cleanup.log"
LOCAL_WAL_DIR="/var/backups/cerniq/postgresql/wal_archive"

# Hetzner Storage Box
STORAGE_BOX="u502048@u502048.your-storagebox.de"
SSH_KEY="/root/.ssh/hetzner_storagebox"
REMOTE_WAL_DIR="./backups/cerniq/postgres/wal_archive"

# Retention (days)
LOCAL_RETENTION_DAYS=2    # Keep 2 days locally (48h PITR window)
REMOTE_RETENTION_DAYS=7   # Keep 7 days on Storage Box

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "$(date -Iseconds) $1" | tee -a "$LOG_FILE"
}

log "Starting WAL archive cleanup"

# Count files before cleanup
LOCAL_BEFORE=$(find "$LOCAL_WAL_DIR" -type f 2>/dev/null | wc -l || echo 0)
log "Local WAL files before: $LOCAL_BEFORE"

# Clean local WAL archive
if [[ -d "$LOCAL_WAL_DIR" ]]; then
    log "Cleaning local WAL archive (retention: ${LOCAL_RETENTION_DAYS} days)..."
    
    # Delete files older than retention period
    DELETED_COUNT=$(find "$LOCAL_WAL_DIR" -type f -mtime +${LOCAL_RETENTION_DAYS} -delete -print 2>/dev/null | wc -l || echo 0)
    
    log "Deleted $DELETED_COUNT local WAL files"
    
    # Remove empty directories
    find "$LOCAL_WAL_DIR" -type d -empty -delete 2>/dev/null || true
fi

LOCAL_AFTER=$(find "$LOCAL_WAL_DIR" -type f 2>/dev/null | wc -l || echo 0)
log "Local WAL files after: $LOCAL_AFTER"

# Calculate local disk space
LOCAL_SIZE=$(du -sh "$LOCAL_WAL_DIR" 2>/dev/null | cut -f1 || echo "0")
log "Local WAL archive size: $LOCAL_SIZE"

# Clean remote WAL archive
if [[ -f "$SSH_KEY" ]]; then
    log "Cleaning remote WAL archive (retention: ${REMOTE_RETENTION_DAYS} days)..."
    
    REMOTE_BEFORE=$(ssh -p 23 -i "$SSH_KEY" "$STORAGE_BOX" \
        "find $REMOTE_WAL_DIR -type f 2>/dev/null | wc -l" 2>/dev/null || echo "N/A")
    log "Remote WAL files before: $REMOTE_BEFORE"
    
    # Delete old files on remote
    ssh -p 23 -i "$SSH_KEY" "$STORAGE_BOX" \
        "find $REMOTE_WAL_DIR -type f -mtime +${REMOTE_RETENTION_DAYS} -delete" 2>> "$LOG_FILE"
    
    REMOTE_AFTER=$(ssh -p 23 -i "$SSH_KEY" "$STORAGE_BOX" \
        "find $REMOTE_WAL_DIR -type f 2>/dev/null | wc -l" 2>/dev/null || echo "N/A")
    log "Remote WAL files after: $REMOTE_AFTER"
    
    REMOTE_SIZE=$(ssh -p 23 -i "$SSH_KEY" "$STORAGE_BOX" \
        "du -sh $REMOTE_WAL_DIR 2>/dev/null | cut -f1" 2>/dev/null || echo "N/A")
    log "Remote WAL archive size: $REMOTE_SIZE"
else
    log "WARNING: SSH key not found, skipping remote cleanup"
fi

log "WAL archive cleanup completed"
