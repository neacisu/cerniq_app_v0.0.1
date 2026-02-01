# CERNIQ.APP — ETAPA 0: BACKUP & RESTORE PROCEDURES

## Quick-Start Scripts pentru Backup și Disaster Recovery

### Versiunea 1.1 | 18 Ianuarie 2026

> **📖 Document de Referință Canonic:**  
> Pentru strategia completă de backup (data tiers, RPO/RTO details, WAL archiving complet, disaster recovery procedures), consultați:  
> **[`docs/infrastructure/backup-strategy.md`](../../infrastructure/backup-strategy.md)** (69KB, 2100+ linii)
>
> **Scopul acestui document:** Scripturi practice și proceduri quick-start pentru operațiuni zilnice de backup și restore în Etapa 0.

---

## 1. STRATEGIE BACKUP

## 1.1 RPO/RTO Objectives

| Data Type | RPO | RTO | Strategy |
| --------- | --- | --- | -------- |
| PostgreSQL Financial | 0 | 15 min | Streaming replication |
| PostgreSQL HITL/Approval | 1 min | 15 min | WAL archiving |
| PostgreSQL Gold Layer | 15 min | 30 min | WAL archiving |
| Redis Active Jobs | 1 sec | 5 min | AOF + RDB |
| Application Code | N/A | 30 min | Git |
| Uploaded Files | 1 hour | 1 hour | BorgBackup |

## 1.2 Backup Schedule

| Backup Type | Schedule | Retention |
| ----------- | -------- | --------- |
| PostgreSQL WAL | Continuous | 7 days |
| PostgreSQL Full Dump | Daily 02:00 | 30 days |
| Redis RDB | Every 15 min | 7 days |
| BorgBackup Full | Daily 03:00 | GFS (7D/4W/6M/2Y) |

---

## 2. BORGBACKUP SETUP

## 2.1 Inițializare Repository

```bash
#!/bin/bash
# Initialize BorgBackup with Hetzner Storage Box
# Location: /var/www/CerniqAPP/infra/scripts/borg-init.sh

# Hetzner Storage Box credentials
STORAGE_BOX_USER="uXXXXXX"
STORAGE_BOX_HOST="${STORAGE_BOX_USER}.your-storagebox.de"
BORG_REPO="ssh://${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}:22/./borg-cerniq"

# Generate passphrase (SAVE THIS SECURELY!)
BORG_PASSPHRASE=$(openssl rand -base64 32)
echo "CRITICAL: Save this passphrase securely!"
echo "Passphrase: $BORG_PASSPHRASE"
echo "$BORG_PASSPHRASE" > /var/www/CerniqAPP/secrets/borg_passphrase
chmod 600 /var/www/CerniqAPP/secrets/borg_passphrase

# Setup SSH key for Storage Box
ssh-keygen -t ed25519 -f ~/.ssh/storagebox_ed25519 -N ""
cat ~/.ssh/storagebox_ed25519.pub
echo "Add this public key to Hetzner Storage Box authorized_keys"

# Test connection (port 23!)
ssh -p 22 ${STORAGE_BOX_USER}@${STORAGE_BOX_HOST} ls

# Initialize Borg repository
export BORG_PASSPHRASE
export BORG_RSH="ssh -i ~/.ssh/storagebox_ed25519 -p 22"
borg init --encryption=repokey $BORG_REPO

echo "BorgBackup repository initialized at $BORG_REPO"
```

## 2.2 Script Backup Zilnic

```bash
#!/bin/bash
# Daily backup script
# Location: /var/www/CerniqAPP/infra/scripts/backup-daily.sh
# Cron: 0 3 * * * /var/www/CerniqAPP/infra/scripts/backup-daily.sh

set -e
exec 2>&1 | tee -a /var/log/cerniq/backup-$(date +%Y%m%d).log

echo "=== CERNIQ DAILY BACKUP $(date) ==="

# Configuration
export BORG_REPO="ssh://uXXXXXX@uXXXXXX.your-storagebox.de:22/./borg-cerniq"
export BORG_PASSPHRASE=$(cat /var/www/CerniqAPP/secrets/borg_passphrase)
export BORG_RSH="ssh -i ~/.ssh/storagebox_ed25519 -p 22"

BACKUP_NAME="cerniq-$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/var/backups/cerniq"
mkdir -p $BACKUP_DIR

# 1. PostgreSQL dump
echo "[1/4] Dumping PostgreSQL..."
docker exec cerniq-postgres pg_dumpall -U cerniq > $BACKUP_DIR/pg_dumpall.sql
docker exec cerniq-postgres pg_dump -U cerniq -Fc cerniq_production > $BACKUP_DIR/cerniq_production.dump
echo "PostgreSQL dump complete: $(du -h $BACKUP_DIR/pg_dumpall.sql | cut -f1)"

# 2. Redis RDB snapshot
echo "[2/4] Snapshotting Redis..."
docker exec cerniq-redis redis-cli BGSAVE
sleep 5
docker cp cerniq-redis:/data/dump.rdb $BACKUP_DIR/redis-dump.rdb
echo "Redis snapshot complete: $(du -h $BACKUP_DIR/redis-dump.rdb | cut -f1)"

# 3. Create Borg backup
echo "[3/4] Creating Borg backup..."
borg create --verbose --stats --compression zstd:6 \
    $BORG_REPO::$BACKUP_NAME \
    /var/www/CerniqAPP \
    $BACKUP_DIR \
    --exclude '/var/www/CerniqAPP/node_modules' \
    --exclude '/var/www/CerniqAPP/.git' \
    --exclude '*.log' \
    --exclude '__pycache__'

# 4. Prune old backups (GFS retention)
echo "[4/4] Pruning old backups..."
borg prune --verbose --stats \
    --keep-daily=7 \
    --keep-weekly=4 \
    --keep-monthly=6 \
    --keep-yearly=2 \
    $BORG_REPO

# Cleanup local dumps
rm -f $BACKUP_DIR/pg_dumpall.sql $BACKUP_DIR/cerniq_production.dump

echo "=== BACKUP COMPLETE ==="
borg info $BORG_REPO::$BACKUP_NAME
```

## 2.3 Systemd Timer

```ini
# /etc/systemd/system/cerniq-backup.service
[Unit]
Description=Cerniq Daily Backup
After=docker.service

[Service]
Type=oneshot
ExecStart=/var/www/CerniqAPP/infra/scripts/backup-daily.sh
User=root

# /etc/systemd/system/cerniq-backup.timer
[Unit]
Description=Run Cerniq Backup Daily at 3 AM

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
# Enable timer
sudo systemctl daemon-reload
sudo systemctl enable cerniq-backup.timer
sudo systemctl start cerniq-backup.timer
```

---

## 3. POSTGRESQL WAL ARCHIVING

## 3.1 Configurare postgresql.conf

```conf
# WAL Archiving for PITR
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/wal_archive/%f && cp %p /var/lib/postgresql/wal_archive/%f'
archive_timeout = 300

# WAL settings
wal_level = replica
max_wal_senders = 3
wal_keep_size = 1GB
```

## 3.2 Docker Volume pentru WAL

```yaml
services:
  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data/pgdata
      - postgres_wal:/var/lib/postgresql/wal_archive
```

---

## 4. RESTORE PROCEDURES

## 4.1 List Available Backups

```bash
#!/bin/bash
# List available Borg backups

export BORG_REPO="ssh://uXXXXXX@uXXXXXX.your-storagebox.de:22/./borg-cerniq"
export BORG_PASSPHRASE=$(cat /var/www/CerniqAPP/secrets/borg_passphrase)
export BORG_RSH="ssh -i ~/.ssh/storagebox_ed25519 -p 22"

echo "Available backups:"
borg list $BORG_REPO

echo ""
echo "Latest backup details:"
borg info $BORG_REPO::$(borg list $BORG_REPO --last 1 --format '{archive}')
```

## 4.2 Restore PostgreSQL

```bash
#!/bin/bash
# Restore PostgreSQL from backup
# Usage: ./restore-postgres.sh [archive-name]

set -e

ARCHIVE=${1:-$(borg list $BORG_REPO --last 1 --format '{archive}')}
RESTORE_DIR="/tmp/restore-$(date +%s)"

echo "=== POSTGRESQL RESTORE ==="
echo "Archive: $ARCHIVE"
echo "Restore dir: $RESTORE_DIR"

# 1. Stop services that use database
echo "[1/5] Stopping dependent services..."
docker compose stop api workers

# 2. Extract backup
echo "[2/5] Extracting backup..."
mkdir -p $RESTORE_DIR
cd $RESTORE_DIR
borg extract $BORG_REPO::$ARCHIVE var/backups/cerniq/

# 3. Stop PostgreSQL
echo "[3/5] Stopping PostgreSQL..."
docker compose stop postgres

# 4. Restore database
echo "[4/5] Restoring database..."
docker compose up -d postgres
sleep 30

# Drop and recreate database
docker exec cerniq-postgres psql -U postgres -c "DROP DATABASE IF EXISTS cerniq_production;"
docker exec cerniq-postgres psql -U postgres -c "CREATE DATABASE cerniq_production OWNER cerniq;"

# Restore from dump
docker exec -i cerniq-postgres psql -U cerniq -d cerniq_production < \
    $RESTORE_DIR/var/backups/cerniq/pg_dumpall.sql

# 5. Verify and restart
echo "[5/5] Verifying restore..."
docker exec cerniq-postgres psql -U cerniq -d cerniq_production \
    -c "SELECT count(*) FROM gold_companies;"

# Start services
docker compose up -d api workers

# Cleanup
rm -rf $RESTORE_DIR

echo "=== RESTORE COMPLETE ==="
```

## 4.3 Point-in-Time Recovery (PITR)

```bash
#!/bin/bash
# PITR to specific timestamp
# Usage: ./pitr-restore.sh "2026-01-15 10:30:00"

TARGET_TIME=$1

if [ -z "$TARGET_TIME" ]; then
    echo "Usage: $0 'YYYY-MM-DD HH:MM:SS'"
    exit 1
fi

echo "=== POINT-IN-TIME RECOVERY ==="
echo "Target time: $TARGET_TIME"

# 1. Stop PostgreSQL
docker compose stop postgres

# 2. Backup current data (just in case)
sudo mv /var/lib/docker/volumes/cerniq_postgres_data \
    /var/lib/docker/volumes/cerniq_postgres_data_before_pitr

# 3. Restore base backup
borg extract $BORG_REPO::$(borg list $BORG_REPO --last 1 --format '{archive}') \
    var/lib/docker/volumes/cerniq_postgres_data

# 4. Create recovery.signal and configure
cat > /var/lib/docker/volumes/cerniq_postgres_data/_data/recovery.signal << EOF
# PostgreSQL recovery configuration
EOF

cat >> /var/lib/docker/volumes/cerniq_postgres_data/_data/postgresql.auto.conf << EOF
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
recovery_target_time = '$TARGET_TIME'
recovery_target_action = 'promote'
EOF

# 5. Start PostgreSQL (will enter recovery mode)
docker compose up -d postgres

echo "PostgreSQL will recover to $TARGET_TIME"
echo "Monitor with: docker compose logs -f postgres"
```

## 4.4 Restore Redis

```bash
#!/bin/bash
# Restore Redis from backup

ARCHIVE=${1:-$(borg list $BORG_REPO --last 1 --format '{archive}')}
RESTORE_DIR="/tmp/restore-redis-$(date +%s)"

echo "=== REDIS RESTORE ==="

# 1. Stop Redis
docker compose stop redis

# 2. Extract backup
mkdir -p $RESTORE_DIR
cd $RESTORE_DIR
borg extract $BORG_REPO::$ARCHIVE var/backups/cerniq/redis-dump.rdb

# 3. Replace current RDB
docker cp $RESTORE_DIR/var/backups/cerniq/redis-dump.rdb cerniq-redis:/data/dump.rdb

# 4. Start Redis
docker compose up -d redis

# 5. Verify
sleep 5
docker exec cerniq-redis redis-cli INFO keyspace

# Cleanup
rm -rf $RESTORE_DIR

echo "=== REDIS RESTORE COMPLETE ==="
```

---

## 5. DISASTER RECOVERY CHECKLIST

## 5.1 Pre-Disaster Preparedness

- [ ] BorgBackup passphrase stored in separate secure location
- [ ] SSH keys for Storage Box backed up separately
- [ ] Hetzner Storage Box credentials documented
- [ ] Recovery procedures tested quarterly
- [ ] Team trained on recovery procedures
- [ ] Monitoring alerts for backup failures

## 5.2 Recovery Checklist

1. [ ] Assess damage scope
2. [ ] Notify stakeholders
3. [ ] Provision new server (if needed)
4. [ ] Install Docker and dependencies
5. [ ] Restore secrets from secure backup
6. [ ] Clone application code from Git
7. [ ] Restore PostgreSQL from Borg backup
8. [ ] Restore Redis (or accept job replay)
9. [ ] Start services in order
10. [ ] Verify data integrity
11. [ ] Run health checks
12. [ ] Update DNS (if server changed)
13. [ ] Monitor for 24 hours
14. [ ] Post-mortem documentation

---

## 6. VERIFICATION COMMANDS

```bash
# Verify backup integrity
borg check $BORG_REPO

# Test restore to /dev/null (dry run)
borg extract --dry-run $BORG_REPO::latest

# Compare backup with current
borg diff $BORG_REPO::previous-backup $BORG_REPO::latest

# Show backup stats
borg info $BORG_REPO
```

---

**Document generat:** 15 Ianuarie 2026
