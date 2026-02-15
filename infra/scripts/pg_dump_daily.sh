#!/bin/bash
# /var/www/CerniqAPP/infra/scripts/pg_dump_daily.sh
# Daily full database dump with compression
# Reference: docs/infrastructure/backup-strategy.md §4.3
# Task: F0.7.1.T002

set -euo pipefail

BACKUP_DIR="/var/backups/cerniq/postgresql/daily"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/cerniq/daily_dump.log"
OUTPUT_FILE="$BACKUP_DIR/cerniq_full_${TIMESTAMP}.dump"

# New infra: PostgreSQL is external (CT107). We authenticate via OpenBao dynamic
# DB creds rendered into an env-file (contains DATABASE_URL pointing to PgBouncer).
ENV_FILE="${ENV_FILE:-/run/cerniq/runtime-secrets/api/api.env}"
DOCKER_NET="${DOCKER_NET:-cerniq_backend}"

# Hetzner Storage Box config
STORAGE_BOX="u502048@u502048.your-storagebox.de"
SSH_KEY="/root/.ssh/hetzner_storagebox"
REMOTE_DIR="./backups/cerniq/postgres/daily_dumps"

mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "$(date -Iseconds) $1" >> "$LOG_FILE"
}

log "Starting daily full backup"

if [[ ! -f "$ENV_FILE" ]]; then
    log "ERROR: env file missing (OpenBao rendered): $ENV_FILE"
    exit 1
fi

# Create full dump with custom format (best compression) using DATABASE_URL.
# We run tooling in a throwaway postgres image on the Cerniq docker network so
# it can resolve `pgbouncer:64033`.
docker run --rm \
    --network "$DOCKER_NET" \
    --env-file "$ENV_FILE" \
    postgres:18 \
    sh -lc 'exec pg_dump "$DATABASE_URL" --format=custom --compress=9 --verbose' \
    > "$OUTPUT_FILE" 2>> "$LOG_FILE"

FILESIZE=$(stat -c%s "$OUTPUT_FILE" 2>/dev/null || echo "0")
log "Dump created: $OUTPUT_FILE (${FILESIZE} bytes)"

# Verify dump integrity
docker run --rm \
    -v "$OUTPUT_FILE:/dump:ro" \
    postgres:18 \
    pg_restore --list /dump >/dev/null 2>&1 \
  && log "Dump verified OK" \
  || log "WARNING: Dump verification failed"

# Upload to Hetzner Storage Box
if [[ -f "$SSH_KEY" ]]; then
    log "Uploading to Hetzner Storage Box..."
    
    REMOTE_FILE="$REMOTE_DIR/cerniq_full_${TIMESTAMP}.dump"
    
    scp -P 23 -i "$SSH_KEY" -o StrictHostKeyChecking=no \
        "$OUTPUT_FILE" "${STORAGE_BOX}:${REMOTE_FILE}" 2>> "$LOG_FILE"
    
    if [[ $? -eq 0 ]]; then
        log "Upload successful: $REMOTE_FILE"
    else
        log "ERROR: Upload failed"
    fi
else
    log "WARNING: SSH key not found, skipping remote upload"
fi

# Keep only last 7 days locally
find "$BACKUP_DIR" -type f -name "cerniq_full_*.dump" -mtime +7 -delete 2>/dev/null || true

log "Daily backup completed"
