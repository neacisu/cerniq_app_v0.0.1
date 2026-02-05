#!/bin/bash
# /var/www/CerniqAPP/infra/scripts/redis_backup_aof.sh
# Daily Redis AOF backup with rewrite
# Reference: docs/infrastructure/backup-strategy.md §5.3
# Task: F0.7.1.T002

set -euo pipefail

BACKUP_DIR="/var/backups/cerniq/redis/aof"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/cerniq/redis_aof_backup.log"
CONTAINER="cerniq-redis"
OUTPUT_FILE="$BACKUP_DIR/appendonly_${TIMESTAMP}.aof"

# Hetzner Storage Box config
STORAGE_BOX="u502048@u502048.your-storagebox.de"
SSH_KEY="/root/.ssh/hetzner_storagebox"
REMOTE_DIR="./backups/cerniq/redis/aof"

mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "$(date -Iseconds) $1" >> "$LOG_FILE"
}

log "Starting Redis AOF backup"

# Check if Redis container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    log "WARNING: Container $CONTAINER not running, skipping backup"
    exit 0
fi

# Trigger BGREWRITEAOF to optimize AOF file
log "Triggering BGREWRITEAOF..."
docker exec "$CONTAINER" redis-cli BGREWRITEAOF >> "$LOG_FILE" 2>&1

# Wait for AOF rewrite to complete (max 120 seconds)
WAIT_COUNT=0
MAX_WAIT=120
while [[ $WAIT_COUNT -lt $MAX_WAIT ]]; do
    AOF_STATUS=$(docker exec "$CONTAINER" redis-cli INFO persistence 2>/dev/null | grep aof_rewrite_in_progress | cut -d: -f2 | tr -d '\r')
    
    if [[ "$AOF_STATUS" == "0" ]]; then
        log "BGREWRITEAOF completed"
        break
    fi
    
    sleep 1
    ((WAIT_COUNT++))
done

if [[ $WAIT_COUNT -ge $MAX_WAIT ]]; then
    log "WARNING: BGREWRITEAOF timeout, using existing AOF"
fi

# Check if AOF file exists (Redis 7.x uses appendonlydir)
AOF_EXISTS=$(docker exec "$CONTAINER" sh -c 'ls /data/appendonly.aof 2>/dev/null || ls /data/appendonlydir/*.aof 2>/dev/null | head -1' 2>/dev/null || echo "")

if [[ -n "$AOF_EXISTS" ]]; then
    # Copy AOF file(s) from container
    # Redis 7.x uses appendonlydir with multiple files
    if docker exec "$CONTAINER" test -d /data/appendonlydir 2>/dev/null; then
        # Redis 7.x multi-part AOF
        docker cp "${CONTAINER}:/data/appendonlydir" "$BACKUP_DIR/appendonlydir_${TIMESTAMP}" 2>> "$LOG_FILE"
        
        # Create tarball
        tar -czf "$BACKUP_DIR/appendonly_${TIMESTAMP}.tar.gz" \
            -C "$BACKUP_DIR" "appendonlydir_${TIMESTAMP}" 2>> "$LOG_FILE"
        rm -rf "$BACKUP_DIR/appendonlydir_${TIMESTAMP}"
        
        OUTPUT_FILE="$BACKUP_DIR/appendonly_${TIMESTAMP}.tar.gz"
    else
        # Legacy single-file AOF
        docker cp "${CONTAINER}:/data/appendonly.aof" "$OUTPUT_FILE" 2>> "$LOG_FILE"
        
        # Compress
        zstd -q -19 "$OUTPUT_FILE" -o "${OUTPUT_FILE}.zst" 2>> "$LOG_FILE"
        rm -f "$OUTPUT_FILE"
        OUTPUT_FILE="${OUTPUT_FILE}.zst"
    fi
    
    FILESIZE=$(stat -c%s "$OUTPUT_FILE" 2>/dev/null || echo "0")
    log "Backup created: $OUTPUT_FILE (${FILESIZE} bytes)"
    
    # Upload to Storage Box
    if [[ -f "$SSH_KEY" ]]; then
        REMOTE_FILE="$REMOTE_DIR/$(basename "$OUTPUT_FILE")"
        scp -P 23 -i "$SSH_KEY" -o StrictHostKeyChecking=no \
            "$OUTPUT_FILE" "${STORAGE_BOX}:${REMOTE_FILE}" 2>> "$LOG_FILE"
        
        if [[ $? -eq 0 ]]; then
            log "Upload successful: $REMOTE_FILE"
        else
            log "ERROR: Upload failed"
        fi
    fi
else
    log "WARNING: No AOF file found (AOF might be disabled)"
fi

# Keep only last 7 days locally
find "$BACKUP_DIR" -type f \( -name "appendonly_*.tar.gz" -o -name "appendonly_*.aof.zst" \) -mtime +7 -delete 2>/dev/null || true

log "Redis AOF backup completed"
