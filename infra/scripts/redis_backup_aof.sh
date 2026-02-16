#!/bin/bash
# /var/www/CerniqAPP/infra/scripts/redis_backup_aof.sh
# Daily Redis AOF backup with rewrite
# Reference: docs/infrastructure/backup-strategy.md §5.3
# Task: F0.7.1.T002
#
# NOTE: PostgreSQL runs natively on CT107 (10.0.1.107:5432), NOT in a Docker container.
# Redis runs on the orchestrator (10.0.0.2:6379), accessed via HAProxy VIP 10.0.1.10:6379.

set -euo pipefail

BACKUP_DIR="/var/backups/cerniq/redis/aof"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/cerniq/redis_aof_backup.log"
REDIS_HOST="10.0.1.10"
REDIS_PORT="6379"
ORCHESTRATOR_HOST="10.0.0.2"
REDIS_DATA_DIR="/var/lib/redis/data"
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

# Check if Redis is reachable via HAProxy VIP
if ! redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" PING >/dev/null 2>&1; then
    log "WARNING: Redis not reachable at ${REDIS_HOST}:${REDIS_PORT}, skipping backup"
    exit 0
fi

# Trigger BGREWRITEAOF to optimize AOF file
log "Triggering BGREWRITEAOF..."
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGREWRITEAOF >> "$LOG_FILE" 2>&1

# Wait for AOF rewrite to complete (max 120 seconds)
WAIT_COUNT=0
MAX_WAIT=120
while [[ $WAIT_COUNT -lt $MAX_WAIT ]]; do
    AOF_STATUS=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO persistence 2>/dev/null | grep aof_rewrite_in_progress | cut -d: -f2 | tr -d '\r')
    
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

# Check if AOF files exist on the orchestrator
AOF_EXISTS=$(ssh "root@${ORCHESTRATOR_HOST}" "ls ${REDIS_DATA_DIR}/appendonly.aof 2>/dev/null || ls ${REDIS_DATA_DIR}/appendonlydir/*.aof 2>/dev/null | head -1" 2>/dev/null || echo "")

if [[ -n "$AOF_EXISTS" ]]; then
    # Copy AOF file(s) from the orchestrator
    # Redis 7.x+ uses appendonlydir with multiple files
    if ssh "root@${ORCHESTRATOR_HOST}" "test -d ${REDIS_DATA_DIR}/appendonlydir" 2>/dev/null; then
        # Redis 7.x+ multi-part AOF
        scp -r "root@${ORCHESTRATOR_HOST}:${REDIS_DATA_DIR}/appendonlydir" \
            "$BACKUP_DIR/appendonlydir_${TIMESTAMP}" 2>> "$LOG_FILE"
        
        # Create tarball
        tar -czf "$BACKUP_DIR/appendonly_${TIMESTAMP}.tar.gz" \
            -C "$BACKUP_DIR" "appendonlydir_${TIMESTAMP}" 2>> "$LOG_FILE"
        rm -rf "$BACKUP_DIR/appendonlydir_${TIMESTAMP}"
        
        OUTPUT_FILE="$BACKUP_DIR/appendonly_${TIMESTAMP}.tar.gz"
    else
        # Legacy single-file AOF
        scp "root@${ORCHESTRATOR_HOST}:${REDIS_DATA_DIR}/appendonly.aof" \
            "$OUTPUT_FILE" 2>> "$LOG_FILE"
        
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
    log "WARNING: No AOF file found on orchestrator (AOF might be disabled)"
fi

# Keep only last 7 days locally
find "$BACKUP_DIR" -type f \( -name "appendonly_*.tar.gz" -o -name "appendonly_*.aof.zst" \) -mtime +7 -delete 2>/dev/null || true

log "Redis AOF backup completed"
