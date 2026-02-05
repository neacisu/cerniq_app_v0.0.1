#!/bin/bash
# =============================================================================
# OpenBao Backup Script
# =============================================================================
# Reference: ADR-0033 OpenBao Secrets Management
# Version: 1.0
# Created: 2026-02-05
# 
# This script:
#   1. Creates a snapshot of OpenBao Raft storage
#   2. Encrypts the snapshot with GPG
#   3. Uploads to Hetzner Storage Box
#   4. Cleans up old backups (retention: 30 days)
# 
# Schedule: Runs daily via cron
#   0 3 * * * /var/www/CerniqAPP/infra/scripts/openbao-backup.sh
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

BAO_ADDR="${BAO_ADDR:-http://127.0.0.1:64200}"
BAO_CONTAINER="${BAO_CONTAINER:-cerniq-openbao}"
SECRETS_DIR="/var/www/CerniqAPP/secrets"
BACKUP_DIR="/var/backups/openbao"
LOG_FILE="/var/log/cerniq/openbao-backup.log"

# Hetzner Storage Box configuration
STORAGE_BOX="${HETZNER_STORAGEBOX:-u502048@u502048.your-storagebox.de}"
STORAGE_BOX_PORT="${HETZNER_STORAGEBOX_PORT:-23}"
STORAGE_BOX_PATH="./backups/cerniq/openbao"

# Backup retention in days
RETENTION_DAYS=30

# =============================================================================
# Functions
# =============================================================================

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$1] $2" | tee -a "$LOG_FILE"
}

cleanup_temp() {
    rm -f "/tmp/openbao-snapshot-"* 2>/dev/null || true
}

# =============================================================================
# Pre-flight checks
# =============================================================================

mkdir -p "$BACKUP_DIR" "$(dirname "$LOG_FILE")"

log "INFO" "Starting OpenBao backup..."

# Get root token
if [[ ! -f "$SECRETS_DIR/openbao_root_token.txt" ]]; then
    log "ERROR" "Root token not found at $SECRETS_DIR/openbao_root_token.txt"
    exit 1
fi

ROOT_TOKEN=$(cat "$SECRETS_DIR/openbao_root_token.txt")
export BAO_TOKEN="$ROOT_TOKEN"

# Check if OpenBao is running and unsealed
SEAL_STATUS=$(docker exec "$BAO_CONTAINER" bao status -format=json 2>/dev/null || echo '{"sealed": true}')
IS_SEALED=$(echo "$SEAL_STATUS" | grep -o '"sealed":[^,]*' | cut -d: -f2 | tr -d ' ')

if [[ "$IS_SEALED" == "true" ]]; then
    log "ERROR" "OpenBao is sealed. Cannot create backup."
    exit 1
fi

# =============================================================================
# Create Raft Snapshot
# =============================================================================

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_FILE="/tmp/openbao-snapshot-${TIMESTAMP}.snap"

log "INFO" "Creating Raft snapshot..."

docker exec -e BAO_TOKEN="$BAO_TOKEN" "$BAO_CONTAINER" \
    bao operator raft snapshot save /tmp/snapshot.snap

docker cp "$BAO_CONTAINER:/tmp/snapshot.snap" "$SNAPSHOT_FILE"
docker exec "$BAO_CONTAINER" rm /tmp/snapshot.snap

SNAPSHOT_SIZE=$(du -h "$SNAPSHOT_FILE" | cut -f1)
log "INFO" "Snapshot created: $SNAPSHOT_SIZE"

# =============================================================================
# Encrypt Snapshot
# =============================================================================

log "INFO" "Encrypting snapshot..."

# Get backup passphrase
if [[ -f "$SECRETS_DIR/openbao_backup_passphrase.txt" ]]; then
    GPG_PASSPHRASE=$(cat "$SECRETS_DIR/openbao_backup_passphrase.txt")
else
    log "ERROR" "Backup passphrase not found. Run openbao-init.sh first."
    cleanup_temp
    exit 1
fi

ENCRYPTED_FILE="${SNAPSHOT_FILE}.gpg"

gpg --batch --yes --passphrase "$GPG_PASSPHRASE" \
    --symmetric --cipher-algo AES256 \
    -o "$ENCRYPTED_FILE" "$SNAPSHOT_FILE"

# Securely delete unencrypted snapshot
shred -u "$SNAPSHOT_FILE" 2>/dev/null || rm -f "$SNAPSHOT_FILE"

ENCRYPTED_SIZE=$(du -h "$ENCRYPTED_FILE" | cut -f1)
log "INFO" "Encrypted snapshot: $ENCRYPTED_SIZE"

# =============================================================================
# Upload to Hetzner Storage Box
# =============================================================================

log "INFO" "Uploading to Hetzner Storage Box..."

# Check for SSH key
if [[ ! -f "/root/.ssh/hetzner_storagebox" ]]; then
    log "WARNING" "SSH key for Hetzner Storage Box not found."
    log "INFO" "Saving backup locally to $BACKUP_DIR"
    mv "$ENCRYPTED_FILE" "$BACKUP_DIR/"
else
    # Create remote directory if not exists
    ssh -p "$STORAGE_BOX_PORT" -i /root/.ssh/hetzner_storagebox \
        "$STORAGE_BOX" "mkdir -p $STORAGE_BOX_PATH" 2>/dev/null || true
    
    # Upload
    REMOTE_FILE="$STORAGE_BOX_PATH/openbao-snapshot-${TIMESTAMP}.snap.gpg"
    
    scp -P "$STORAGE_BOX_PORT" -i /root/.ssh/hetzner_storagebox \
        "$ENCRYPTED_FILE" "$STORAGE_BOX:$REMOTE_FILE"
    
    if [[ $? -eq 0 ]]; then
        log "INFO" "Uploaded to: $STORAGE_BOX:$REMOTE_FILE"
        
        # Also save locally for redundancy
        cp "$ENCRYPTED_FILE" "$BACKUP_DIR/"
        
        # Clean up temp file
        rm -f "$ENCRYPTED_FILE"
    else
        log "ERROR" "Upload failed. Saving backup locally."
        mv "$ENCRYPTED_FILE" "$BACKUP_DIR/"
    fi
fi

# =============================================================================
# Cleanup Old Backups
# =============================================================================

log "INFO" "Cleaning up backups older than $RETENTION_DAYS days..."

# Local cleanup
find "$BACKUP_DIR" -name "openbao-snapshot-*.snap.gpg" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# Remote cleanup (Hetzner Storage Box)
if [[ -f "/root/.ssh/hetzner_storagebox" ]]; then
    ssh -p "$STORAGE_BOX_PORT" -i /root/.ssh/hetzner_storagebox \
        "$STORAGE_BOX" "find $STORAGE_BOX_PATH -name 'openbao-snapshot-*.snap.gpg' -mtime +$RETENTION_DAYS -delete" 2>/dev/null || true
fi

# =============================================================================
# Summary
# =============================================================================

# Count local backups
LOCAL_COUNT=$(find "$BACKUP_DIR" -name "openbao-snapshot-*.snap.gpg" 2>/dev/null | wc -l)

log "INFO" "Backup complete. Local backups: $LOCAL_COUNT"
log "INFO" "========================================="

# Clean exit
cleanup_temp
exit 0
