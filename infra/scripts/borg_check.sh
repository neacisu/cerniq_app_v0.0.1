#!/bin/bash
# /var/www/CerniqAPP/infra/scripts/borg_check.sh
# Verify BorgBackup repository and archive integrity
# Reference: docs/infrastructure/backup-strategy.md §7 Verification
# Task: F0.7.2.T002

set -euo pipefail

# BorgBackup configuration
export BORG_REPO="ssh://u502048@u502048.your-storagebox.de:23/./backups/cerniq/borg"
export BORG_PASSPHRASE=$(cat /var/www/CerniqAPP/secrets/borg_passphrase.txt 2>/dev/null || cat /root/.borg_passphrase)
export BORG_RSH="ssh -i /root/.ssh/hetzner_storagebox -o StrictHostKeyChecking=no"

LOG_FILE="/var/log/cerniq/borg_check.log"
STATUS_FILE="/var/backups/cerniq/status/borg_check_last.json"

mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$STATUS_FILE")"

log() {
    echo "$(date -Iseconds) $1" | tee -a "$LOG_FILE"
}

# Parse arguments
FULL_CHECK=false
VERIFY_DATA=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --full)
            FULL_CHECK=true
            shift
            ;;
        --verify-data)
            VERIFY_DATA=true
            shift
            ;;
        -h|--help)
            cat << EOF
Usage: $0 [OPTIONS]

Verify BorgBackup repository integrity.

OPTIONS:
    --full          Run full repository check (slower but thorough)
    --verify-data   Verify actual data integrity (very slow, reads all data)
    -h, --help      Show this help message

EOF
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

log "Starting Borg integrity check"

# Get repository info first
log "Checking repository accessibility..."
REPO_INFO=$(borg info "$BORG_REPO" 2>&1)
if [[ $? -ne 0 ]]; then
    log "ERROR: Cannot access repository"
    echo "$REPO_INFO" >> "$LOG_FILE"
    
    # Write status file
    cat > "$STATUS_FILE" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "status": "ERROR",
    "message": "Cannot access repository",
    "repository": "$BORG_REPO"
}
EOF
    exit 1
fi

log "Repository accessible"

# Build check command
CHECK_CMD="borg check"
if $FULL_CHECK; then
    CHECK_CMD="$CHECK_CMD --repository-only"
    log "Running full repository check..."
elif $VERIFY_DATA; then
    CHECK_CMD="$CHECK_CMD --verify-data"
    log "Running data verification check (this may take a long time)..."
else
    CHECK_CMD="$CHECK_CMD --archives-only --last 3"
    log "Running quick check on last 3 archives..."
fi

# Run check
START_TIME=$(date +%s)
$CHECK_CMD "$BORG_REPO" 2>&1 | tee -a "$LOG_FILE"
CHECK_RC=${PIPESTATUS[0]}
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Get archive count and last backup time
ARCHIVE_COUNT=$(borg list --short "$BORG_REPO" 2>/dev/null | wc -l)
LAST_ARCHIVE=$(borg list --short "$BORG_REPO" 2>/dev/null | tail -1)
LAST_BACKUP_TIME=$(borg info "${BORG_REPO}::${LAST_ARCHIVE}" 2>/dev/null | grep "Time (start):" | cut -d: -f2- | xargs)

# Determine status
if [[ $CHECK_RC -eq 0 ]]; then
    STATUS="OK"
    MESSAGE="All checks passed"
    log "Integrity check PASSED"
elif [[ $CHECK_RC -eq 1 ]]; then
    STATUS="WARNING"
    MESSAGE="Check completed with warnings"
    log "WARNING: Integrity check had warnings"
else
    STATUS="ERROR"
    MESSAGE="Integrity check failed"
    log "ERROR: Integrity check FAILED with code $CHECK_RC"
fi

# Write status file
cat > "$STATUS_FILE" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "status": "$STATUS",
    "message": "$MESSAGE",
    "repository": "$BORG_REPO",
    "archive_count": $ARCHIVE_COUNT,
    "last_archive": "$LAST_ARCHIVE",
    "last_backup_time": "$LAST_BACKUP_TIME",
    "check_duration_seconds": $DURATION,
    "check_type": "$(if $VERIFY_DATA; then echo 'verify-data'; elif $FULL_CHECK; then echo 'full'; else echo 'quick'; fi)"
}
EOF

log "Status written to $STATUS_FILE"
log "Borg integrity check completed (duration: ${DURATION}s)"

exit $CHECK_RC
