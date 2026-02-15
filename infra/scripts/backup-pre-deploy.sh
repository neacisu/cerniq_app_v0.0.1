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
ENV_FILE="${ENV_FILE:-/run/cerniq/runtime-secrets/api/api.env}"
DOCKER_NET="${DOCKER_NET:-cerniq_backend}"

echo "Starting pre-deployment backup..."
echo "Timestamp: ${TIMESTAMP}"

# Create backup directory if not exists
mkdir -p "${BACKUP_DIR}"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "WARNING: OpenBao-rendered env file not found: $ENV_FILE"
    echo "Skipping backup."
    touch "${BACKUP_FILE}.skipped"
    exit 0
fi

echo "Creating DB backup via PgBouncer (DATABASE_URL from OpenBao)..."
docker run --rm \
  --network "$DOCKER_NET" \
  --env-file "$ENV_FILE" \
  postgres:18 \
  sh -lc 'exec pg_dump "$DATABASE_URL" --format=plain' \
  > "${BACKUP_FILE}" 2>/dev/null || {
    echo "WARNING: Database backup skipped (database may not exist yet)"
    touch "${BACKUP_FILE}.skipped"
}

if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
    gzip "${BACKUP_FILE}"
    echo "Backup created: ${BACKUP_FILE}.gz"
    echo "Size: $(du -h ${BACKUP_FILE}.gz | cut -f1)"
fi

# Cleanup old backups (keep last 5)
echo "Cleaning up old backups (keeping last 5)..."
ls -t "${BACKUP_DIR}"/pre_deploy_*.sql.gz 2>/dev/null | tail -n +6 | xargs -r rm -f

echo "Pre-deployment backup complete"
exit 0
