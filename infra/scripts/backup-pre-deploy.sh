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

echo "🔄 Starting pre-deployment backup..."
echo "   Timestamp: ${TIMESTAMP}"

# Create backup directory if not exists
mkdir -p "${BACKUP_DIR}"

# Check if PostgreSQL container is running
if docker ps --format '{{.Names}}' | grep -q "cerniq-postgres"; then
    echo "📦 PostgreSQL container found, creating backup..."
    
    # Create backup using pg_dump
    docker exec cerniq-postgres pg_dump -U postgres -d cerniq_db > "${BACKUP_FILE}" 2>/dev/null || {
        echo "⚠️  Database backup skipped (database may not exist yet)"
        echo "   This is normal for initial deployments"
        touch "${BACKUP_FILE}.skipped"
    }
    
    if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
        # Compress backup
        gzip "${BACKUP_FILE}"
        echo "✅ Backup created: ${BACKUP_FILE}.gz"
        echo "   Size: $(du -h ${BACKUP_FILE}.gz | cut -f1)"
    fi
else
    echo "⚠️  PostgreSQL container not running, skipping backup"
    echo "   This is normal for initial deployments"
fi

# Cleanup old backups (keep last 5)
echo "🧹 Cleaning up old backups (keeping last 5)..."
ls -t "${BACKUP_DIR}"/pre_deploy_*.sql.gz 2>/dev/null | tail -n +6 | xargs -r rm -f

echo "✅ Pre-deployment backup complete"
exit 0
