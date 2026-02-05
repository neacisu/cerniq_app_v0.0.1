#!/bin/bash
# /var/www/CerniqAPP/infra/scripts/backup_health_check.sh
# Check backup health status and generate alerts
# Reference: docs/infrastructure/backup-strategy.md §8 Monitoring
# Task: F0.7.2.T003

set -euo pipefail

# BorgBackup configuration
export BORG_REPO="ssh://u502048@u502048.your-storagebox.de:23/./backups/cerniq/borg"
export BORG_PASSPHRASE=$(cat /var/www/CerniqAPP/secrets/borg_passphrase.txt 2>/dev/null || cat /root/.borg_passphrase 2>/dev/null || echo "")
export BORG_RSH="ssh -i /root/.ssh/hetzner_storagebox -o StrictHostKeyChecking=no"

STATUS_DIR="/var/backups/cerniq/status"
LOG_FILE="/var/log/cerniq/backup_health.log"

# Alert thresholds
MAX_BORG_AGE_HOURS=26        # Alert if last Borg backup > 26 hours old
MAX_PG_DUMP_AGE_HOURS=26     # Alert if last pg_dump > 26 hours old
MAX_REDIS_AGE_HOURS=2        # Alert if last Redis backup > 2 hours old
MIN_BORG_ARCHIVES=3          # Alert if less than 3 archives exist

mkdir -p "$STATUS_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "$(date -Iseconds) $1" | tee -a "$LOG_FILE"
}

ISSUES=()
WARNINGS=()
STATUS="OK"

# Helper function to check file age in hours
file_age_hours() {
    local FILE="$1"
    if [[ -f "$FILE" ]]; then
        local NOW=$(date +%s)
        local MTIME=$(stat -c %Y "$FILE")
        echo $(( (NOW - MTIME) / 3600 ))
    else
        echo "999999"
    fi
}

log "Starting backup health check"

# 1. Check Borg repository accessibility
log "Checking Borg repository..."
if BORG_INFO=$(borg info "$BORG_REPO" 2>&1); then
    log "Borg repository accessible"
    
    # Check archive count
    ARCHIVE_COUNT=$(borg list --short "$BORG_REPO" 2>/dev/null | wc -l)
    if [[ $ARCHIVE_COUNT -lt $MIN_BORG_ARCHIVES ]]; then
        WARNINGS+=("Borg: Only $ARCHIVE_COUNT archives (minimum: $MIN_BORG_ARCHIVES)")
    fi
    
    # Check last archive age
    LAST_ARCHIVE=$(borg list --short --sort-by timestamp "$BORG_REPO" 2>/dev/null | tail -1)
    if [[ -n "$LAST_ARCHIVE" ]]; then
        LAST_ARCHIVE_TIME=$(borg info "${BORG_REPO}::${LAST_ARCHIVE}" 2>/dev/null | grep "Time (start):" | cut -d: -f2- | xargs)
        LAST_ARCHIVE_EPOCH=$(date -d "$LAST_ARCHIVE_TIME" +%s 2>/dev/null || echo 0)
        CURRENT_EPOCH=$(date +%s)
        AGE_HOURS=$(( (CURRENT_EPOCH - LAST_ARCHIVE_EPOCH) / 3600 ))
        
        if [[ $AGE_HOURS -gt $MAX_BORG_AGE_HOURS ]]; then
            ISSUES+=("Borg: Last backup is ${AGE_HOURS} hours old (max: $MAX_BORG_AGE_HOURS)")
            STATUS="CRITICAL"
        fi
    else
        ISSUES+=("Borg: No archives found")
        STATUS="CRITICAL"
    fi
else
    ISSUES+=("Borg: Cannot access repository")
    STATUS="CRITICAL"
fi

# 2. Check PostgreSQL daily dumps
log "Checking PostgreSQL dumps..."
LATEST_PG_DUMP=$(ls -t /var/backups/cerniq/postgresql/daily/*.dump 2>/dev/null | head -1)
if [[ -n "$LATEST_PG_DUMP" && -f "$LATEST_PG_DUMP" ]]; then
    AGE=$(file_age_hours "$LATEST_PG_DUMP")
    if [[ $AGE -gt $MAX_PG_DUMP_AGE_HOURS ]]; then
        ISSUES+=("PostgreSQL: Last dump is ${AGE} hours old (max: $MAX_PG_DUMP_AGE_HOURS)")
        STATUS="CRITICAL"
    else
        log "PostgreSQL dump OK (${AGE}h old)"
    fi
else
    WARNINGS+=("PostgreSQL: No daily dumps found locally")
fi

# 3. Check Redis backups
log "Checking Redis backups..."
LATEST_REDIS=$(ls -t /var/backups/cerniq/redis/hourly/*.rdb.zst 2>/dev/null | head -1)
if [[ -n "$LATEST_REDIS" && -f "$LATEST_REDIS" ]]; then
    AGE=$(file_age_hours "$LATEST_REDIS")
    if [[ $AGE -gt $MAX_REDIS_AGE_HOURS ]]; then
        WARNINGS+=("Redis: Last backup is ${AGE} hours old (max: $MAX_REDIS_AGE_HOURS)")
    else
        log "Redis backup OK (${AGE}h old)"
    fi
else
    WARNINGS+=("Redis: No hourly backups found locally")
fi

# 4. Check Storage Box connectivity and space
log "Checking Storage Box..."
if STORAGE_INFO=$(ssh -p 23 -i /root/.ssh/hetzner_storagebox -o ConnectTimeout=10 u502048@u502048.your-storagebox.de "df -h ." 2>&1); then
    # Parse disk usage
    USED_PERCENT=$(echo "$STORAGE_INFO" | tail -1 | awk '{print $5}' | tr -d '%')
    if [[ $USED_PERCENT -gt 90 ]]; then
        ISSUES+=("Storage Box: ${USED_PERCENT}% full (critical)")
        STATUS="CRITICAL"
    elif [[ $USED_PERCENT -gt 80 ]]; then
        WARNINGS+=("Storage Box: ${USED_PERCENT}% full")
    else
        log "Storage Box OK (${USED_PERCENT}% used)"
    fi
else
    ISSUES+=("Storage Box: Cannot connect")
    STATUS="CRITICAL"
fi

# 5. Check Borg integrity status file
if [[ -f "$STATUS_DIR/borg_check_last.json" ]]; then
    BORG_CHECK_STATUS=$(grep '"status"' "$STATUS_DIR/borg_check_last.json" | cut -d'"' -f4)
    if [[ "$BORG_CHECK_STATUS" != "OK" ]]; then
        WARNINGS+=("Borg: Last integrity check status: $BORG_CHECK_STATUS")
    fi
fi

# Generate status report
log ""
log "=== BACKUP HEALTH STATUS: $STATUS ==="

if [[ ${#ISSUES[@]} -gt 0 ]]; then
    log "CRITICAL ISSUES:"
    for issue in "${ISSUES[@]}"; do
        log "  - $issue"
    done
fi

if [[ ${#WARNINGS[@]} -gt 0 ]]; then
    log "WARNINGS:"
    for warning in "${WARNINGS[@]}"; do
        log "  - $warning"
    done
fi

if [[ ${#ISSUES[@]} -eq 0 && ${#WARNINGS[@]} -eq 0 ]]; then
    log "All backup systems operational"
fi

# Write status file for monitoring exporters
cat > "$STATUS_DIR/backup_health.json" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "status": "$STATUS",
    "issues_count": ${#ISSUES[@]},
    "warnings_count": ${#WARNINGS[@]},
    "issues": $(printf '%s\n' "${ISSUES[@]:-}" | jq -R -s -c 'split("\n") | map(select(. != ""))'),
    "warnings": $(printf '%s\n' "${WARNINGS[@]:-}" | jq -R -s -c 'split("\n") | map(select(. != ""))'),
    "checks": {
        "borg_accessible": $(if echo "$BORG_INFO" | grep -q "Repository"; then echo "true"; else echo "false"; fi),
        "storage_box_connected": $(if [[ -n "$STORAGE_INFO" ]]; then echo "true"; else echo "false"; fi),
        "pg_dump_recent": $([[ -n "$LATEST_PG_DUMP" && $(file_age_hours "$LATEST_PG_DUMP") -le $MAX_PG_DUMP_AGE_HOURS ]] && echo "true" || echo "false"),
        "redis_backup_recent": $([[ -n "$LATEST_REDIS" && $(file_age_hours "$LATEST_REDIS") -le $MAX_REDIS_AGE_HOURS ]] && echo "true" || echo "false")
    }
}
EOF

log "Status written to $STATUS_DIR/backup_health.json"

# Exit with appropriate code for monitoring systems
if [[ "$STATUS" == "CRITICAL" ]]; then
    exit 2
elif [[ ${#WARNINGS[@]} -gt 0 ]]; then
    exit 1
else
    exit 0
fi
