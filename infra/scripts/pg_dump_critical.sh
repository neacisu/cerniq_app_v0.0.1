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
CONTAINER="cerniq-postgres"
DB_USER="cerniq"
DB_NAME="cerniq"

mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

echo "$(date -Iseconds) Starting critical tables backup" >> "$LOG_FILE"

# Check if PostgreSQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "$(date -Iseconds) ERROR: Container $CONTAINER not running, skipping backup" >> "$LOG_FILE"
    exit 0
fi

for TABLE in "${CRITICAL_TABLES[@]}"; do
    OUTPUT_FILE="$BACKUP_DIR/${TABLE}_${TIMESTAMP}.dump"
    
    # Check if table exists before backup
    if docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 FROM $TABLE LIMIT 1" > /dev/null 2>&1; then
        docker exec "$CONTAINER" pg_dump \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --table="$TABLE" \
            --format=custom \
            --compress=9 \
            > "$OUTPUT_FILE" 2>> "$LOG_FILE"
        
        echo "$(date -Iseconds) Backed up: $TABLE -> $OUTPUT_FILE" >> "$LOG_FILE"
    else
        echo "$(date -Iseconds) SKIP: Table $TABLE does not exist (yet)" >> "$LOG_FILE"
    fi
done

# Keep only last 24 hours of critical backups locally
find "$BACKUP_DIR" -type f -name "*.dump" -mtime +1 -delete 2>/dev/null || true

echo "$(date -Iseconds) Critical tables backup completed" >> "$LOG_FILE"
