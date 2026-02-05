#!/bin/bash
# /var/www/CerniqAPP/infra/scripts/wal_archive.sh
# Archives WAL files to local staging and syncs to Hetzner Storage Box
# Reference: docs/infrastructure/backup-strategy.md §4.1
# Task: F0.7.1.T002

set -euo pipefail

WAL_PATH="$1"
WAL_FILE="$2"
LOCAL_ARCHIVE="/var/backups/cerniq/postgresql/wal_archive"
REMOTE_USER="u502048"
REMOTE_HOST="u502048.your-storagebox.de"
REMOTE_PATH="./backups/cerniq/postgres/wal_archive"
SSH_KEY="/root/.ssh/hetzner_storagebox"
LOG_FILE="/var/log/cerniq/wal_archive.log"

# Create directories if needed
mkdir -p "$LOCAL_ARCHIVE"
mkdir -p "$(dirname "$LOG_FILE")"

# Archive locally first (fast, reliable)
cp "$WAL_PATH" "$LOCAL_ARCHIVE/$WAL_FILE"

# Compress with zstd
zstd -q -T0 "$LOCAL_ARCHIVE/$WAL_FILE" -o "$LOCAL_ARCHIVE/${WAL_FILE}.zst"
rm "$LOCAL_ARCHIVE/$WAL_FILE"

# Sync to remote (async, in background)
rsync -az --timeout=30 -e "ssh -i $SSH_KEY -p 23 -o StrictHostKeyChecking=no" \
    "$LOCAL_ARCHIVE/${WAL_FILE}.zst" \
    "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/" \
    >> "$LOG_FILE" 2>&1 &

# Log success
echo "$(date -Iseconds) Archived: $WAL_FILE" >> "$LOG_FILE"

exit 0
