#!/bin/bash
# /var/www/CerniqAPP/infra/scripts/redis_restore.sh
# Restore Redis from backup
# Reference: docs/runbooks/database-recovery.md
# Task: F0.7.1.T004

set -euo pipefail

LOG_FILE="/var/log/cerniq/redis_restore.log"
CONTAINER="cerniq-redis"
BACKUP_DIR="/var/backups/cerniq/redis"

# Hetzner Storage Box config
STORAGE_BOX="u502048@u502048.your-storagebox.de"
SSH_KEY="/root/.ssh/hetzner_storagebox"
REMOTE_RDB_DIR="./backups/cerniq/redis/hourly"
REMOTE_AOF_DIR="./backups/cerniq/redis/aof"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "$(date -Iseconds) $1" | tee -a "$LOG_FILE"
}

usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Restore Redis from backup.

OPTIONS:
    -l, --list              List available backups
    -f, --file FILE         Restore from specific local file
    -r, --remote FILE       Download and restore from Storage Box
    --type rdb|aof          Backup type (default: rdb)
    --dry-run               Show what would be done
    -h, --help              Show this help message

EXAMPLES:
    $0 --list
    $0 --file /var/backups/cerniq/redis/hourly/dump_20250115_140000.rdb.zst
    $0 --remote dump_20250115_140000.rdb.zst
    $0 --type aof --remote appendonly_20250115_020000.tar.gz

WARNING: This will STOP Redis and REPLACE data!

EOF
}

list_backups() {
    echo "=== Local RDB backups ==="
    ls -la "$BACKUP_DIR/hourly/"*.rdb.zst 2>/dev/null || echo "No local RDB backups"
    
    echo ""
    echo "=== Local AOF backups ==="
    ls -la "$BACKUP_DIR/aof/"* 2>/dev/null || echo "No local AOF backups"
    
    echo ""
    echo "=== Remote RDB backups (Storage Box) ==="
    ssh -p 23 -i "$SSH_KEY" "$STORAGE_BOX" "ls -la $REMOTE_RDB_DIR/" 2>/dev/null || echo "Cannot access remote"
    
    echo ""
    echo "=== Remote AOF backups (Storage Box) ==="
    ssh -p 23 -i "$SSH_KEY" "$STORAGE_BOX" "ls -la $REMOTE_AOF_DIR/" 2>/dev/null || echo "Cannot access remote"
}

# Parse arguments
ACTION="restore"
BACKUP_FILE=""
REMOTE_FILE=""
BACKUP_TYPE="rdb"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -l|--list)
            ACTION="list"
            shift
            ;;
        -f|--file)
            BACKUP_FILE="$2"
            shift 2
            ;;
        -r|--remote)
            REMOTE_FILE="$2"
            shift 2
            ;;
        --type)
            BACKUP_TYPE="$2"
            shift 2
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
    list_backups
    exit 0
fi

# Determine backup file
if [[ -n "$REMOTE_FILE" ]]; then
    log "Downloading backup from Storage Box: $REMOTE_FILE"
    
    RESTORE_DIR="/var/backups/cerniq/restore/redis"
    mkdir -p "$RESTORE_DIR"
    
    if [[ "$BACKUP_TYPE" == "rdb" ]]; then
        REMOTE_PATH="$REMOTE_RDB_DIR/$REMOTE_FILE"
    else
        REMOTE_PATH="$REMOTE_AOF_DIR/$REMOTE_FILE"
    fi
    
    BACKUP_FILE="$RESTORE_DIR/$REMOTE_FILE"
    
    if ! $DRY_RUN; then
        scp -P 23 -i "$SSH_KEY" "${STORAGE_BOX}:${REMOTE_PATH}" "$BACKUP_FILE"
    fi
fi

if [[ -z "$BACKUP_FILE" ]]; then
    # Use latest local backup
    if [[ "$BACKUP_TYPE" == "rdb" ]]; then
        BACKUP_FILE=$(ls -t "$BACKUP_DIR/hourly/"*.rdb.zst 2>/dev/null | head -1)
    else
        BACKUP_FILE=$(ls -t "$BACKUP_DIR/aof/"* 2>/dev/null | head -1)
    fi
fi

if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
    log "ERROR: No backup file found or specified"
    exit 1
fi

log "Restoring from: $BACKUP_FILE"

if $DRY_RUN; then
    log "DRY RUN - would restore from $BACKUP_FILE"
    exit 0
fi

# Step 1: Stop Redis
log "Stopping Redis container..."
docker stop "$CONTAINER"

# Step 2: Decompress if needed
RESTORE_FILE="$BACKUP_FILE"
if [[ "$BACKUP_FILE" == *.zst ]]; then
    log "Decompressing backup..."
    RESTORE_FILE="${BACKUP_FILE%.zst}"
    zstd -d -f "$BACKUP_FILE" -o "$RESTORE_FILE"
fi

if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
    log "Extracting AOF archive..."
    EXTRACT_DIR=$(dirname "$BACKUP_FILE")/extract_$$
    mkdir -p "$EXTRACT_DIR"
    tar -xzf "$BACKUP_FILE" -C "$EXTRACT_DIR"
    # Find the AOF files
    RESTORE_FILE=$(find "$EXTRACT_DIR" -name "*.aof" -type f | head -1)
fi

# Step 3: Copy to Redis data directory
log "Copying backup to Redis data directory..."

if [[ "$BACKUP_TYPE" == "rdb" ]]; then
    docker cp "$RESTORE_FILE" "${CONTAINER}:/data/dump.rdb"
else
    # Handle AOF files
    if [[ -d "$EXTRACT_DIR" ]]; then
        # Redis 7.x multi-part AOF
        docker exec "$CONTAINER" rm -rf /data/appendonlydir 2>/dev/null || true
        docker cp "$EXTRACT_DIR/appendonlydir_"*/ "${CONTAINER}:/data/appendonlydir"
    else
        docker cp "$RESTORE_FILE" "${CONTAINER}:/data/appendonly.aof"
    fi
fi

# Step 4: Fix permissions
docker exec "$CONTAINER" chown redis:redis /data/* 2>/dev/null || true

# Step 5: Start Redis
log "Starting Redis container..."
docker start "$CONTAINER"

# Step 6: Wait for Redis to be ready
sleep 2
REDIS_PING=$(docker exec "$CONTAINER" redis-cli PING 2>/dev/null || echo "FAIL")

if [[ "$REDIS_PING" == "PONG" ]]; then
    log "Redis restore completed successfully"
    
    # Show info
    DBSIZE=$(docker exec "$CONTAINER" redis-cli DBSIZE | cut -d: -f2)
    log "Database size: $DBSIZE keys"
else
    log "ERROR: Redis failed to start after restore"
    exit 1
fi

# Cleanup
rm -rf "$EXTRACT_DIR" 2>/dev/null || true
