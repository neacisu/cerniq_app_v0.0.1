#!/bin/bash
# /var/www/CerniqAPP/infra/scripts/redis_backup_hourly.sh
# Hourly Redis RDB snapshot backup
# Reference: docs/infrastructure/backup-strategy.md §5.2
# Task: F0.7.1.T002

set -euo pipefail

BACKUP_DIR="/var/backups/cerniq/redis/hourly"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/cerniq/redis_backup.log"
CONTAINER="cerniq-redis"
OUTPUT_FILE="$BACKUP_DIR/dump_${TIMESTAMP}.rdb"

# Hetzner Storage Box config
STORAGE_BOX="u502048@u502048.your-storagebox.de"
SSH_KEY="/root/.ssh/hetzner_storagebox"
REMOTE_DIR="./backups/cerniq/redis/hourly"

mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "$(date -Iseconds) $1" >> "$LOG_FILE"
}

log "Starting Redis hourly backup"

# Check if Redis container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    log "WARNING: Container $CONTAINER not running, skipping backup"
    exit 0
fi

# Trigger BGSAVE and wait for completion
log "Triggering BGSAVE..."
docker exec "$CONTAINER" redis-cli BGSAVE >> "$LOG_FILE" 2>&1

# Wait for BGSAVE to complete (max 60 seconds)
WAIT_COUNT=0
MAX_WAIT=60
while [[ $WAIT_COUNT -lt $MAX_WAIT ]]; do
    LASTSAVE=$(docker exec "$CONTAINER" redis-cli LASTSAVE 2>/dev/null | tr -d '\r')
    BG_STATUS=$(docker exec "$CONTAINER" redis-cli INFO persistence 2>/dev/null | grep rdb_bgsave_in_progress | cut -d: -f2 | tr -d '\r')
    
    if [[ "$BG_STATUS" == "0" ]]; then
        log "BGSAVE completed"
        break
    fi
    
    sleep 1
    ((WAIT_COUNT++))
done

if [[ $WAIT_COUNT -ge $MAX_WAIT ]]; then
    log "WARNING: BGSAVE timeout, using existing dump"
fi

# Copy dump.rdb from container
docker cp "${CONTAINER}:/data/dump.rdb" "$OUTPUT_FILE" 2>> "$LOG_FILE"

if [[ -f "$OUTPUT_FILE" ]]; then
    FILESIZE=$(stat -c%s "$OUTPUT_FILE" 2>/dev/null || echo "0")
    log "Backup created: $OUTPUT_FILE (${FILESIZE} bytes)"
    
    # Compress with zstd for better compression
    zstd -q -19 "$OUTPUT_FILE" -o "${OUTPUT_FILE}.zst" 2>> "$LOG_FILE"
    rm -f "$OUTPUT_FILE"
    
    # Upload compressed file to Storage Box
    if [[ -f "$SSH_KEY" ]]; then
        REMOTE_FILE="$REMOTE_DIR/dump_${TIMESTAMP}.rdb.zst"
        scp -P 23 -i "$SSH_KEY" -o StrictHostKeyChecking=no \
            "${OUTPUT_FILE}.zst" "${STORAGE_BOX}:${REMOTE_FILE}" 2>> "$LOG_FILE"
        
        if [[ $? -eq 0 ]]; then
            log "Upload successful: $REMOTE_FILE"
        else
            log "ERROR: Upload failed"
        fi
    fi
else
    log "ERROR: Failed to copy dump.rdb"
    exit 1
fi

# Keep only last 24 hours locally
find "$BACKUP_DIR" -type f -name "dump_*.rdb.zst" -mtime +1 -delete 2>/dev/null || true

log "Redis hourly backup completed"
