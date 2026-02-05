#!/bin/bash
# /var/www/CerniqAPP/infra/scripts/pg_basebackup_weekly.sh
# Weekly physical base backup for PITR
# Reference: docs/infrastructure/backup-strategy.md §4.4
# Task: F0.7.1.T002

set -euo pipefail

BACKUP_DIR="/var/backups/cerniq/postgresql/basebackup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/cerniq/basebackup.log"
CONTAINER="cerniq-postgres"
DB_USER="cerniq"
OUTPUT_DIR="$BACKUP_DIR/base_${TIMESTAMP}"

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

# Check if PostgreSQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    log "ERROR: Container $CONTAINER not running"
    exit 1
fi

# Create base backup directory
mkdir -p "$OUTPUT_DIR"

# Run pg_basebackup from container
# Use tar format for portability and compression
docker exec "$CONTAINER" pg_basebackup \
    -U "$DB_USER" \
    -D /tmp/basebackup_temp \
    --format=tar \
    --gzip \
    --compress=9 \
    --checkpoint=fast \
    --label="weekly_backup_${TIMESTAMP}" \
    --progress \
    --verbose 2>> "$LOG_FILE"

# Copy backup from container to host
docker cp "${CONTAINER}:/tmp/basebackup_temp/." "$OUTPUT_DIR/" 2>> "$LOG_FILE"

# Cleanup temp dir in container
docker exec "$CONTAINER" rm -rf /tmp/basebackup_temp 2>/dev/null || true

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
