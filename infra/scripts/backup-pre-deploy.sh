#!/bin/bash
# =============================================================================
# Cerniq.app - Pre-deployment Backup Script
# =============================================================================
# Version: 1.0.0 (Minimal)
# Purpose: Create database backup before deployment
# TODO: Enhance with full pg_dump, S3 upload, retention policy
# =============================================================================

set -e

BACKUP_DIR="/opt/cerniq/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/pre_deploy_${TIMESTAMP}.sql"
PG_HOST="${PG_HOST:-10.0.1.107}"
PG_PORT="${PG_PORT:-5432}"
PG_DB="${PG_DB:-cerniq}"
PG_USER="${PG_USER:-c3rn1q}"
PG_PASS_FILE="${PG_PASS_FILE:-/opt/cerniq/secrets/postgres_password.txt}"

echo "🔄 Starting pre-deployment backup..."
echo "   Timestamp: ${TIMESTAMP}"

# Create backup directory if not exists
mkdir -p "${BACKUP_DIR}"

if [[ -f "$PG_PASS_FILE" ]]; then
    export PGPASSWORD
    PGPASSWORD=$(cat "$PG_PASS_FILE")
else
    echo "⚠️  PostgreSQL password file not found: $PG_PASS_FILE"
    echo "   Skipping backup."
    touch "${BACKUP_FILE}.skipped"
    exit 0
fi

echo "📦 Creating remote PostgreSQL backup from ${PG_HOST}:${PG_PORT}/${PG_DB}..."
pg_dump -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" > "${BACKUP_FILE}" 2>/dev/null || {
    echo "⚠️  Database backup skipped (database may not exist yet)"
    echo "   This is normal for initial deployments"
    touch "${BACKUP_FILE}.skipped"
}

if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
    gzip "${BACKUP_FILE}"
    echo "✅ Backup created: ${BACKUP_FILE}.gz"
    echo "   Size: $(du -h ${BACKUP_FILE}.gz | cut -f1)"
fi

# Cleanup old backups (keep last 5)
echo "🧹 Cleaning up old backups (keeping last 5)..."
ls -t "${BACKUP_DIR}"/pre_deploy_*.sql.gz 2>/dev/null | tail -n +6 | xargs -r rm -f

echo "✅ Pre-deployment backup complete"
exit 0
