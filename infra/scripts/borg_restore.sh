#!/bin/bash
# /var/www/CerniqAPP/infra/scripts/borg_restore.sh
# Restore from BorgBackup archive
# Reference: docs/runbooks/database-recovery.md
# Task: F0.7.1.T004

set -euo pipefail

# BorgBackup configuration
export BORG_REPO="ssh://u502048@u502048.your-storagebox.de:23/./backups/cerniq/borg"
export BORG_PASSPHRASE=$(cat /var/www/CerniqAPP/secrets/borg_passphrase.txt 2>/dev/null || cat /root/.borg_passphrase)
export BORG_RSH="ssh -i /root/.ssh/hetzner_storagebox -o StrictHostKeyChecking=no"

LOG_FILE="/var/log/cerniq/borg_restore.log"
RESTORE_DIR="/var/backups/cerniq/restore"

usage() {
    cat << EOF
Usage: $0 [OPTIONS] <archive_name> [path_to_restore]

Restore files from a BorgBackup archive.

OPTIONS:
    -l, --list          List available archives
    -i, --info NAME     Show info about specific archive
    -d, --dry-run       Show what would be extracted without extracting
    -t, --target DIR    Restore to specific directory (default: $RESTORE_DIR)
    -h, --help          Show this help message

EXAMPLES:
    $0 --list                                 # List all archives
    $0 cerniq-2025-01-15_020000              # Restore entire archive
    $0 cerniq-2025-01-15_020000 var/www      # Restore only var/www path
    $0 -t /tmp/restore cerniq-latest         # Restore to specific directory

EOF
}

log() {
    echo "$(date -Iseconds) $1" | tee -a "$LOG_FILE"
}

mkdir -p "$(dirname "$LOG_FILE")"

# Parse arguments
DRY_RUN=false
ACTION="restore"
TARGET_DIR="$RESTORE_DIR"
ARCHIVE=""
RESTORE_PATH=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -l|--list)
            ACTION="list"
            shift
            ;;
        -i|--info)
            ACTION="info"
            ARCHIVE="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -t|--target)
            TARGET_DIR="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        -*)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
        *)
            if [[ -z "$ARCHIVE" ]]; then
                ARCHIVE="$1"
            else
                RESTORE_PATH="$1"
            fi
            shift
            ;;
    esac
done

case $ACTION in
    list)
        log "Listing archives in $BORG_REPO"
        borg list --short "$BORG_REPO"
        ;;
    
    info)
        if [[ -z "$ARCHIVE" ]]; then
            echo "ERROR: Archive name required for --info"
            exit 1
        fi
        log "Showing info for archive: $ARCHIVE"
        borg info "${BORG_REPO}::${ARCHIVE}"
        ;;
    
    restore)
        if [[ -z "$ARCHIVE" ]]; then
            echo "ERROR: Archive name required"
            usage
            exit 1
        fi
        
        mkdir -p "$TARGET_DIR"
        cd "$TARGET_DIR"
        
        log "Restoring archive: $ARCHIVE"
        log "Target directory: $TARGET_DIR"
        log "Path filter: ${RESTORE_PATH:-<entire archive>}"
        
        if $DRY_RUN; then
            log "DRY RUN - showing what would be extracted:"
            borg list "${BORG_REPO}::${ARCHIVE}" ${RESTORE_PATH:+| grep "$RESTORE_PATH"}
        else
            log "Starting extraction..."
            
            if [[ -n "$RESTORE_PATH" ]]; then
                borg extract \
                    --verbose \
                    --list \
                    "${BORG_REPO}::${ARCHIVE}" \
                    "$RESTORE_PATH" 2>&1 | tee -a "$LOG_FILE"
            else
                borg extract \
                    --verbose \
                    --list \
                    "${BORG_REPO}::${ARCHIVE}" 2>&1 | tee -a "$LOG_FILE"
            fi
            
            if [[ $? -eq 0 ]]; then
                log "Restore completed successfully to $TARGET_DIR"
                echo ""
                echo "Restored files are in: $TARGET_DIR"
                ls -la "$TARGET_DIR"
            else
                log "ERROR: Restore failed"
                exit 1
            fi
        fi
        ;;
esac
