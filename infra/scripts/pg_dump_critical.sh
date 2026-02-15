#!/bin/bash
# /var/www/CerniqAPP/infra/scripts/pg_dump_critical.sh
# Hourly backup of critical tables only
# Reference: docs/infrastructure/backup-strategy.md §4.2
# Task: F0.7.1.T002

set -euo pipefail

CRITICAL_TABLES=(
    "approval_tasks"
    "approval_audit_log"
    "gold_companies"
    "gold_contacts"
    "financial_transactions"
    "e_factura_submissions"
)

BACKUP_DIR="/var/backups/cerniq/postgresql/critical"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/cerniq/critical_backup.log"
ENV_FILE="${ENV_FILE:-/run/cerniq/runtime-secrets/api/api.env}"
DOCKER_NET="${DOCKER_NET:-cerniq_backend}"

mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

echo "$(date -Iseconds) Starting critical tables backup" >> "$LOG_FILE"

# New infra: DB access via OpenBao-rendered env (DATABASE_URL via PgBouncer).
if [[ ! -f "$ENV_FILE" ]]; then
    echo "$(date -Iseconds) ERROR: env file missing: $ENV_FILE (skipping backup)" >> "$LOG_FILE"
    exit 0
fi

for TABLE in "${CRITICAL_TABLES[@]}"; do
    OUTPUT_FILE="$BACKUP_DIR/${TABLE}_${TIMESTAMP}.dump"
    
    # Check if table exists before backup
    if docker run --rm \
        --network "$DOCKER_NET" \
        --env-file "$ENV_FILE" \
        postgres:18 \
        sh -lc "exec psql \"\$DATABASE_URL\" -Atqc \"SELECT to_regclass('public.${TABLE}') IS NOT NULL;\"" \
        | tr -d '\r' | grep -q '^t$'; then

        docker run --rm \
            --network "$DOCKER_NET" \
            --env-file "$ENV_FILE" \
            postgres:18 \
            sh -lc "exec pg_dump \"\$DATABASE_URL\" --table=public.${TABLE} --format=custom --compress=9" \
            > "$OUTPUT_FILE" 2>> "$LOG_FILE"
        
        echo "$(date -Iseconds) Backed up: $TABLE -> $OUTPUT_FILE" >> "$LOG_FILE"
    else
        echo "$(date -Iseconds) SKIP: Table $TABLE does not exist (yet)" >> "$LOG_FILE"
    fi
done

# Keep only last 24 hours of critical backups locally
find "$BACKUP_DIR" -type f -name "*.dump" -mtime +1 -delete 2>/dev/null || true

echo "$(date -Iseconds) Critical tables backup completed" >> "$LOG_FILE"
