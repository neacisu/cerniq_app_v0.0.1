#!/bin/bash
# /var/www/CerniqAPP/infra/scripts/check_storagebox_space.sh
# Check Hetzner Storage Box space and cleanup if needed
# Reference: docs/infrastructure/backup-strategy.md §6 Retention
# Task: F0.7.2.T003

set -euo pipefail

STORAGE_BOX="u502048@u502048.your-storagebox.de"
SSH_KEY="/root/.ssh/hetzner_storagebox"
LOG_FILE="/var/log/cerniq/storagebox_space.log"
STATUS_FILE="/var/backups/cerniq/status/storagebox_space.json"

# Thresholds
WARNING_PERCENT=80
CRITICAL_PERCENT=90
CLEANUP_PERCENT=85  # Auto-cleanup old files when above this

mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$STATUS_FILE")"

log() {
    echo "$(date -Iseconds) $1" | tee -a "$LOG_FILE"
}

log "Checking Storage Box space"

# Get disk usage
DISK_INFO=$(ssh -p 23 -i "$SSH_KEY" -o ConnectTimeout=10 "$STORAGE_BOX" "df -h ." 2>&1)

if [[ $? -ne 0 ]]; then
    log "ERROR: Cannot connect to Storage Box"
    cat > "$STATUS_FILE" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "status": "ERROR",
    "message": "Cannot connect to Storage Box"
}
EOF
    exit 2
fi

# Parse space info
TOTAL=$(echo "$DISK_INFO" | tail -1 | awk '{print $2}')
USED=$(echo "$DISK_INFO" | tail -1 | awk '{print $3}')
AVAIL=$(echo "$DISK_INFO" | tail -1 | awk '{print $4}')
PERCENT=$(echo "$DISK_INFO" | tail -1 | awk '{print $5}' | tr -d '%')

log "Storage Box: $USED used of $TOTAL ($PERCENT%)"

# Determine status
STATUS="OK"
MESSAGE="Space usage normal"

if [[ $PERCENT -ge $CRITICAL_PERCENT ]]; then
    STATUS="CRITICAL"
    MESSAGE="Storage space critically low"
elif [[ $PERCENT -ge $WARNING_PERCENT ]]; then
    STATUS="WARNING"
    MESSAGE="Storage space getting low"
fi

# Auto-cleanup if above threshold
if [[ $PERCENT -ge $CLEANUP_PERCENT ]]; then
    log "Running automatic cleanup (${PERCENT}% used, threshold: ${CLEANUP_PERCENT}%)"
    
    # Remote cleanup: delete old pg_dump files (keep last 14 days)
    log "Cleaning old PostgreSQL daily dumps..."
    ssh -p 23 -i "$SSH_KEY" "$STORAGE_BOX" \
        "find ./backups/cerniq/postgres/daily_dumps -type f -name '*.dump' -mtime +14 -delete" 2>> "$LOG_FILE" || true
    
    # Remote cleanup: delete old WAL files (keep last 7 days)
    log "Cleaning old WAL archives..."
    ssh -p 23 -i "$SSH_KEY" "$STORAGE_BOX" \
        "find ./backups/cerniq/postgres/wal_archive -type f -mtime +7 -delete" 2>> "$LOG_FILE" || true
    
    # Remote cleanup: delete old Redis hourly backups (keep last 7 days)
    log "Cleaning old Redis hourly backups..."
    ssh -p 23 -i "$SSH_KEY" "$STORAGE_BOX" \
        "find ./backups/cerniq/redis/hourly -type f -mtime +7 -delete" 2>> "$LOG_FILE" || true
    
    # Remote cleanup: delete old Redis AOF backups (keep last 30 days)
    log "Cleaning old Redis AOF backups..."
    ssh -p 23 -i "$SSH_KEY" "$STORAGE_BOX" \
        "find ./backups/cerniq/redis/aof -type f -mtime +30 -delete" 2>> "$LOG_FILE" || true
    
    # Note: Borg prune is handled by borg_backup_daily.sh
    
    log "Cleanup complete. Rechecking space..."
    
    # Recheck
    DISK_INFO=$(ssh -p 23 -i "$SSH_KEY" "$STORAGE_BOX" "df -h .")
    PERCENT=$(echo "$DISK_INFO" | tail -1 | awk '{print $5}' | tr -d '%')
    AVAIL=$(echo "$DISK_INFO" | tail -1 | awk '{print $4}')
    
    log "After cleanup: ${PERCENT}% used, $AVAIL available"
fi

# Get detailed breakdown
BREAKDOWN=$(ssh -p 23 -i "$SSH_KEY" "$STORAGE_BOX" "du -sh ./backups/cerniq/*" 2>/dev/null || echo "N/A")

# Write status file
cat > "$STATUS_FILE" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "status": "$STATUS",
    "message": "$MESSAGE",
    "total": "$TOTAL",
    "used": "$USED",
    "available": "$AVAIL",
    "percent_used": $PERCENT,
    "thresholds": {
        "warning": $WARNING_PERCENT,
        "critical": $CRITICAL_PERCENT,
        "auto_cleanup": $CLEANUP_PERCENT
    }
}
EOF

log "Status: $STATUS - $MESSAGE"

# Exit code for monitoring
if [[ "$STATUS" == "CRITICAL" ]]; then
    exit 2
elif [[ "$STATUS" == "WARNING" ]]; then
    exit 1
else
    exit 0
fi
