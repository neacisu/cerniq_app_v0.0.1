#!/bin/bash
# /var/www/CerniqAPP/infra/scripts/pg_basebackup_weekly.sh
# Weekly physical base backup for PITR
# Reference: docs/infrastructure/backup-strategy.md §4.4
# Task: F0.7.1.T002

set -euo pipefail

BACKUP_DIR="/var/backups/cerniq/postgresql/basebackup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/cerniq/basebackup.log"
OUTPUT_DIR="$BACKUP_DIR/base_${TIMESTAMP}"

# New infra note:
# - PostgreSQL runs on CT107 (postgres-main), not as a local docker container.
# - Physical basebackups (PITR) must be executed on CT107 (or a host that has
#   direct access to the PostgreSQL data directory and replication privileges).
PG_HOST="${PG_HOST:-127.0.0.1}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${PG_USER:-postgres}"

# Hetzner Storage Box config
STORAGE_BOX="u502048@u502048.your-storagebox.de"
SSH_KEY="/root/.ssh/hetzner_storagebox"
REMOTE_DIR="./backups/cerniq/postgres/basebackups"

mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "$(date -Iseconds) $1" >> "$LOG_FILE"
}

log "Starting weekly base backup"

if ! command -v pg_basebackup >/dev/null 2>&1; then
    log "ERROR: pg_basebackup not found. This script must run on CT107 (postgres-main)."
    exit 1
fi

# Create base backup directory
mkdir -p "$OUTPUT_DIR"

# Run pg_basebackup locally (expected on CT107). Use tar format for portability.
# We default to running as the local postgres superuser.
sudo -u postgres pg_basebackup \
    -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" \
    -D "$OUTPUT_DIR" \
    --format=tar \
    --gzip \
    --compress=9 \
    --checkpoint=fast \
    --label="weekly_backup_${TIMESTAMP}" \
    --progress \
    --verbose 2>> "$LOG_FILE"

# Calculate total size
TOTAL_SIZE=$(du -sh "$OUTPUT_DIR" 2>/dev/null | cut -f1)
log "Base backup created: $OUTPUT_DIR ($TOTAL_SIZE)"

# Upload to Hetzner Storage Box
if [[ -f "$SSH_KEY" ]]; then
    log "Uploading to Hetzner Storage Box..."
    
    ARCHIVE_NAME="base_${TIMESTAMP}.tar.gz"
    ARCHIVE_PATH="$BACKUP_DIR/$ARCHIVE_NAME"
    
    # Create single archive of the base backup
    tar -czf "$ARCHIVE_PATH" -C "$BACKUP_DIR" "base_${TIMESTAMP}" 2>> "$LOG_FILE"
    
    scp -P 23 -i "$SSH_KEY" -o StrictHostKeyChecking=no \
        "$ARCHIVE_PATH" "${STORAGE_BOX}:${REMOTE_DIR}/${ARCHIVE_NAME}" 2>> "$LOG_FILE"
    
    if [[ $? -eq 0 ]]; then
        log "Upload successful: ${REMOTE_DIR}/${ARCHIVE_NAME}"
        rm -f "$ARCHIVE_PATH"  # Remove local archive after upload
    else
        log "ERROR: Upload failed"
    fi
else
    log "WARNING: SSH key not found, skipping remote upload"
fi

# Keep only last 4 weekly backups locally
find "$BACKUP_DIR" -maxdepth 1 -type d -name "base_*" -mtime +28 -exec rm -rf {} \; 2>/dev/null || true

log "Weekly base backup completed"
