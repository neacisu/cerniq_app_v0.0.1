#!/bin/bash
# /var/www/CerniqAPP/infra/scripts/backup_restore_test.sh
# Automated backup restore test (run monthly)
# Reference: docs/infrastructure/backup-strategy.md §9 DR Testing
# Task: F0.7.2.T005

set -euo pipefail

LOG_FILE="/var/log/cerniq/restore_test.log"
TEST_DIR="/var/backups/cerniq/restore_test"
STATUS_FILE="/var/backups/cerniq/status/restore_test.json"

# BorgBackup configuration
export BORG_REPO="ssh://u502048@u502048.your-storagebox.de:23/./backups/cerniq/borg"
export BORG_PASSPHRASE=$(cat /var/www/CerniqAPP/secrets/borg_passphrase.txt 2>/dev/null || cat /root/.borg_passphrase 2>/dev/null || echo "")
export BORG_RSH="ssh -i /root/.ssh/hetzner_storagebox -o StrictHostKeyChecking=no"

# Storage Box
STORAGE_BOX="u502048@u502048.your-storagebox.de"
SSH_KEY="/root/.ssh/hetzner_storagebox"

mkdir -p "$TEST_DIR"
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$STATUS_FILE")"

log() {
    echo "$(date -Iseconds) $1" | tee -a "$LOG_FILE"
}

TESTS_PASSED=0
TESTS_FAILED=0
FAILURES=()

test_passed() {
    ((TESTS_PASSED++))
    log "PASS: $1"
}

test_failed() {
    ((TESTS_FAILED++))
    FAILURES+=("$1")
    log "FAIL: $1"
}

cleanup() {
    log "Cleaning up test artifacts..."
    rm -rf "$TEST_DIR"/* 2>/dev/null || true
}

trap cleanup EXIT

log "=========================================="
log "Starting Backup Restore Test"
log "=========================================="

START_TIME=$(date +%s)

# Test 1: Borg repository accessibility
log ""
log "Test 1: Borg repository accessibility"
if borg info "$BORG_REPO" > /dev/null 2>&1; then
    test_passed "Borg repository accessible"
else
    test_failed "Cannot access Borg repository"
fi

# Test 2: List Borg archives
log ""
log "Test 2: List Borg archives"
ARCHIVE_COUNT=$(borg list --short "$BORG_REPO" 2>/dev/null | wc -l || echo 0)
if [[ $ARCHIVE_COUNT -gt 0 ]]; then
    test_passed "Found $ARCHIVE_COUNT Borg archives"
else
    test_failed "No Borg archives found"
fi

# Test 3: Borg archive extraction (partial)
log ""
log "Test 3: Borg archive extraction (partial)"
LATEST_ARCHIVE=$(borg list --short "$BORG_REPO" 2>/dev/null | tail -1)
if [[ -n "$LATEST_ARCHIVE" ]]; then
    mkdir -p "$TEST_DIR/borg_extract"
    cd "$TEST_DIR/borg_extract"
    
    # Extract just package.json as a test (small file)
    if borg extract "${BORG_REPO}::${LATEST_ARCHIVE}" --strip-components 3 var/www/CerniqAPP/package.json 2>/dev/null; then
        if [[ -f "$TEST_DIR/borg_extract/package.json" ]]; then
            test_passed "Borg extraction working"
        else
            test_failed "Borg extraction completed but file not found"
        fi
    else
        test_failed "Borg extraction failed"
    fi
else
    test_failed "No archive to test extraction"
fi

# Test 4: PostgreSQL dump verification
log ""
log "Test 4: PostgreSQL dump verification"
LATEST_DUMP=$(ls -t /var/backups/cerniq/postgresql/daily/*.dump 2>/dev/null | head -1)
if [[ -n "$LATEST_DUMP" && -f "$LATEST_DUMP" ]]; then
    # Verify dump can be read
    if pg_restore --list "$LATEST_DUMP" > /dev/null 2>&1; then
        TABLE_COUNT=$(pg_restore --list "$LATEST_DUMP" 2>/dev/null | grep -c "TABLE DATA" || echo 0)
        test_passed "PostgreSQL dump valid ($TABLE_COUNT tables)"
    else
        test_failed "PostgreSQL dump invalid or corrupted"
    fi
else
    test_failed "No PostgreSQL dump found"
fi

# Test 5: Redis backup verification
log ""
log "Test 5: Redis backup verification"
LATEST_REDIS=$(ls -t /var/backups/cerniq/redis/hourly/*.rdb.zst 2>/dev/null | head -1)
if [[ -n "$LATEST_REDIS" && -f "$LATEST_REDIS" ]]; then
    # Verify can decompress
    if zstd -t "$LATEST_REDIS" 2>/dev/null; then
        test_passed "Redis backup valid (can decompress)"
    else
        test_failed "Redis backup corrupted"
    fi
else
    # Check for uncompressed
    LATEST_REDIS=$(ls -t /var/backups/cerniq/redis/hourly/*.rdb 2>/dev/null | head -1)
    if [[ -n "$LATEST_REDIS" && -f "$LATEST_REDIS" ]]; then
        test_passed "Redis backup found (uncompressed)"
    else
        test_failed "No Redis backup found"
    fi
fi

# Test 6: Storage Box connectivity
log ""
log "Test 6: Storage Box connectivity"
if ssh -p 23 -i "$SSH_KEY" -o ConnectTimeout=10 "$STORAGE_BOX" "ls ./backups/cerniq/ > /dev/null" 2>/dev/null; then
    test_passed "Storage Box accessible"
else
    test_failed "Storage Box not accessible"
fi

# Test 7: Download file from Storage Box
log ""
log "Test 7: Download file from Storage Box"
if ssh -p 23 -i "$SSH_KEY" "$STORAGE_BOX" "ls ./backups/cerniq/postgres/daily_dumps/*.dump" > /dev/null 2>&1; then
    REMOTE_FILE=$(ssh -p 23 -i "$SSH_KEY" "$STORAGE_BOX" "ls -t ./backups/cerniq/postgres/daily_dumps/*.dump | head -1" 2>/dev/null)
    if [[ -n "$REMOTE_FILE" ]]; then
        if scp -P 23 -i "$SSH_KEY" "${STORAGE_BOX}:${REMOTE_FILE}" "$TEST_DIR/remote_test.dump" 2>/dev/null; then
            if [[ -f "$TEST_DIR/remote_test.dump" ]]; then
                test_passed "Remote file download working"
            else
                test_failed "Download completed but file not found"
            fi
        else
            test_failed "Remote file download failed"
        fi
    else
        test_failed "No remote dumps to test"
    fi
else
    test_failed "No remote dumps available"
fi

# Test 8: Borg integrity check (quick)
log ""
log "Test 8: Borg integrity check (quick)"
if borg check --archives-only --last 1 "$BORG_REPO" 2>/dev/null; then
    test_passed "Borg integrity check passed"
else
    test_failed "Borg integrity check failed"
fi

# Calculate results
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

log ""
log "=========================================="
log "Test Results"
log "=========================================="
log "Passed: $TESTS_PASSED / $TOTAL_TESTS"
log "Failed: $TESTS_FAILED / $TOTAL_TESTS"
log "Duration: ${DURATION}s"

if [[ $TESTS_FAILED -gt 0 ]]; then
    log ""
    log "Failed tests:"
    for failure in "${FAILURES[@]}"; do
        log "  - $failure"
    done
fi

# Determine overall status
if [[ $TESTS_FAILED -eq 0 ]]; then
    OVERALL_STATUS="OK"
elif [[ $TESTS_FAILED -le 2 ]]; then
    OVERALL_STATUS="WARNING"
else
    OVERALL_STATUS="CRITICAL"
fi

# Write status file
cat > "$STATUS_FILE" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "status": "$OVERALL_STATUS",
    "tests_passed": $TESTS_PASSED,
    "tests_failed": $TESTS_FAILED,
    "tests_total": $TOTAL_TESTS,
    "duration_seconds": $DURATION,
    "failures": $(printf '%s\n' "${FAILURES[@]:-}" | jq -R -s -c 'split("\n") | map(select(. != ""))')
}
EOF

log ""
log "Status: $OVERALL_STATUS"
log "Results written to $STATUS_FILE"

# Exit code
if [[ "$OVERALL_STATUS" == "CRITICAL" ]]; then
    exit 2
elif [[ "$OVERALL_STATUS" == "WARNING" ]]; then
    exit 1
else
    exit 0
fi
