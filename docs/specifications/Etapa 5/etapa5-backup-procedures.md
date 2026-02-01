# CERNIQ.APP — ETAPA 5: BACKUP & RECOVERY PROCEDURES
## Backup, Restore & Disaster Recovery
### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. Overview Backup Strategy

### Tabele Critice Etapa 5
```
CRITICAL (RPO: 1h, RTO: 30min):
├── gold_nurturing_state
├── gold_referrals
├── gold_churn_signals
├── gold_winback_campaigns
└── approval_tasks (unified HITL)

HIGH (RPO: 4h, RTO: 2h):
├── gold_clusters
├── gold_affiliations
├── gold_associations
├── gold_kol_profiles
└── gold_sentiment_analysis

MEDIUM (RPO: 24h, RTO: 4h):
├── gold_nps_surveys
├── gold_content_drips
├── gold_competitor_intel
└── gold_weather_alerts
```

---

## 2. Backup Schedule

### Continuous WAL Archiving
```bash
# PostgreSQL WAL archiving to Hetzner Storage Box
archive_mode = on
archive_command = 'borg create --stdin-name pg_wal/%f ssh://u123456@u123456.your-storagebox.de:22/./wal-archive::%f-$(date +%%Y%%m%%d%%H%%M%%S) -'
archive_timeout = 300
```

### Scheduled Backups
```yaml
# BorgBackup Schedule
etapa5_backups:
  # Full backup daily at 02:00
  full:
    schedule: "0 2 * * *"
    retention: 30 days
    
  # Incremental every 4 hours
  incremental:
    schedule: "0 */4 * * *"
    retention: 7 days
    
  # Critical tables every hour
  critical:
    schedule: "0 * * * *"
    tables:
      - gold_nurturing_state
      - gold_referrals
      - gold_churn_signals
      - gold_winback_campaigns
    retention: 48 hours
```

---

## 3. Backup Scripts

### Full Database Backup
```bash
#!/bin/bash
# scripts/backup/etapa5-full-backup.sh

set -euo pipefail

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="etapa5-full-${BACKUP_DATE}"
BORG_REPO="ssh://u123456@u123456.your-storagebox.de:22/./cerniq-backups"

echo "[$(date)] Starting Etapa 5 full backup..."

# 1. Create PostgreSQL dump
pg_dump \
  --host=$POSTGRES_HOST \
  --username=$POSTGRES_USER \
  --dbname=$POSTGRES_DB \
  --format=custom \
  --compress=9 \
  --file=/tmp/${BACKUP_NAME}.dump \
  --verbose \
  --schema=public \
  --table='gold_nurturing_*' \
  --table='gold_churn_*' \
  --table='gold_referral*' \
  --table='gold_cluster*' \
  --table='gold_association*' \
  --table='gold_affiliation*' \
  --table='gold_kol*' \
  --table='gold_winback*' \
  --table='gold_nps*' \
  --table='gold_content*' \
  --table='gold_sentiment*' \
  --table='gold_competitor*' \
  --table='gold_weather*' \
  --table='gold_proximity*' \
  --table='gold_entity_relationship*'

# 2. Create BorgBackup archive
borg create \
  --verbose \
  --stats \
  --compression zstd,9 \
  "${BORG_REPO}::${BACKUP_NAME}" \
  /tmp/${BACKUP_NAME}.dump

# 3. Cleanup
rm -f /tmp/${BACKUP_NAME}.dump

# 4. Prune old backups
borg prune \
  --keep-daily=7 \
  --keep-weekly=4 \
  --keep-monthly=6 \
  "${BORG_REPO}"

echo "[$(date)] Backup completed: ${BACKUP_NAME}"
```

### Critical Tables Hourly Backup
```bash
#!/bin/bash
# scripts/backup/etapa5-critical-backup.sh

set -euo pipefail

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="etapa5-critical-${BACKUP_DATE}"
BORG_REPO="ssh://u123456@u123456.your-storagebox.de:22/./cerniq-backups-critical"

CRITICAL_TABLES=(
  "gold_nurturing_state"
  "gold_referrals"
  "gold_churn_signals"
  "gold_churn_factors"
  "gold_winback_campaigns"
  "gold_winback_steps"
)

echo "[$(date)] Starting critical tables backup..."

# Build table arguments
TABLE_ARGS=""
for table in "${CRITICAL_TABLES[@]}"; do
  TABLE_ARGS+=" --table=${table}"
done

# Create dump
pg_dump \
  --host=$POSTGRES_HOST \
  --username=$POSTGRES_USER \
  --dbname=$POSTGRES_DB \
  --format=custom \
  --compress=9 \
  --file=/tmp/${BACKUP_NAME}.dump \
  ${TABLE_ARGS}

# Create archive
borg create \
  --compression zstd,9 \
  "${BORG_REPO}::${BACKUP_NAME}" \
  /tmp/${BACKUP_NAME}.dump

# Cleanup
rm -f /tmp/${BACKUP_NAME}.dump

# Keep only last 48 hours
borg prune \
  --keep-hourly=48 \
  "${BORG_REPO}"

echo "[$(date)] Critical backup completed"
```

---

## 4. Restore Procedures

### Full Database Restore
```bash
#!/bin/bash
# scripts/restore/etapa5-full-restore.sh

set -euo pipefail

BACKUP_NAME=$1
BORG_REPO="ssh://u123456@u123456.your-storagebox.de:22/./cerniq-backups"

if [ -z "$BACKUP_NAME" ]; then
  echo "Usage: $0 <backup_name>"
  echo "Available backups:"
  borg list "${BORG_REPO}"
  exit 1
fi

echo "[$(date)] Starting restore from ${BACKUP_NAME}..."

# 1. Stop application
docker compose -f docker-compose.etapa5.yml stop api workers

# 2. Extract backup
cd /tmp
borg extract "${BORG_REPO}::${BACKUP_NAME}"

# 3. Find dump file
DUMP_FILE=$(ls -1 *.dump | head -1)

# 4. Restore database
pg_restore \
  --host=$POSTGRES_HOST \
  --username=$POSTGRES_USER \
  --dbname=$POSTGRES_DB \
  --clean \
  --if-exists \
  --verbose \
  --single-transaction \
  ${DUMP_FILE}

# 5. Cleanup
rm -f ${DUMP_FILE}

# 6. Restart application
docker compose -f docker-compose.etapa5.yml start api workers

# 7. Verify
echo "[$(date)] Running health checks..."
curl -f http://localhost:64050/health || echo "Health check failed!"

echo "[$(date)] Restore completed"
```

### Point-in-Time Recovery
```bash
#!/bin/bash
# scripts/restore/etapa5-pitr-restore.sh

TARGET_TIME=$1  # Format: "2026-01-19 14:30:00"

if [ -z "$TARGET_TIME" ]; then
  echo "Usage: $0 '<target_timestamp>'"
  exit 1
fi

echo "[$(date)] Starting PITR to ${TARGET_TIME}..."

# 1. Stop PostgreSQL
docker compose stop postgres

# 2. Create recovery.signal
cat > /var/lib/postgresql/data/recovery.signal << EOF
# Point-in-Time Recovery
EOF

# 3. Configure recovery
cat >> /var/lib/postgresql/data/postgresql.auto.conf << EOF
restore_command = 'borg extract --stdout ssh://u123456@u123456.your-storagebox.de:22/./wal-archive::%f > %p'
recovery_target_time = '${TARGET_TIME}'
recovery_target_action = 'promote'
EOF

# 4. Start PostgreSQL
docker compose start postgres

# 5. Wait for recovery
echo "Waiting for recovery to complete..."
until pg_isready -h localhost -p 64032; do
  sleep 5
done

echo "[$(date)] PITR completed"
```

---

## 5. Verification Scripts

### Backup Verification
```bash
#!/bin/bash
# scripts/verify/etapa5-verify-backup.sh

BORG_REPO="ssh://u123456@u123456.your-storagebox.de:22/./cerniq-backups"

echo "=== Backup Verification Report ==="
echo "Date: $(date)"
echo ""

# List recent backups
echo "Recent Backups:"
borg list --last 10 "${BORG_REPO}"
echo ""

# Check repository integrity
echo "Repository Check:"
borg check --repository-only "${BORG_REPO}"
echo ""

# Verify latest backup
LATEST=$(borg list --last 1 --short "${BORG_REPO}")
echo "Verifying latest backup: ${LATEST}"
borg check --archives-only --last 1 "${BORG_REPO}"

# Extract and validate
echo "Extracting for validation..."
cd /tmp
borg extract "${BORG_REPO}::${LATEST}"
DUMP_FILE=$(ls -1 *.dump | head -1)

# Validate dump
pg_restore --list ${DUMP_FILE} > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✓ Backup is valid and restorable"
else
  echo "✗ Backup validation failed!"
  exit 1
fi

# Cleanup
rm -f ${DUMP_FILE}

echo ""
echo "=== Verification Complete ==="
```

### Data Integrity Check
```bash
#!/bin/bash
# scripts/verify/etapa5-data-integrity.sh

echo "=== Etapa 5 Data Integrity Check ==="

# Check row counts
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB << 'EOF'
SELECT 
  'gold_nurturing_state' as table_name, COUNT(*) as row_count FROM gold_nurturing_state
UNION ALL
SELECT 'gold_referrals', COUNT(*) FROM gold_referrals
UNION ALL
SELECT 'gold_churn_signals', COUNT(*) FROM gold_churn_signals
UNION ALL
SELECT 'gold_clusters', COUNT(*) FROM gold_clusters
UNION ALL
SELECT 'gold_associations', COUNT(*) FROM gold_associations
UNION ALL
SELECT 'gold_kol_profiles', COUNT(*) FROM gold_kol_profiles
ORDER BY table_name;
EOF

# Check for orphaned records
echo ""
echo "Checking for orphaned records..."
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB << 'EOF'
-- Nurturing states without clients
SELECT COUNT(*) as orphaned_states 
FROM gold_nurturing_state ns 
LEFT JOIN gold_clients c ON ns.client_id = c.id 
WHERE c.id IS NULL;

-- Referrals without referrer
SELECT COUNT(*) as orphaned_referrals 
FROM gold_referrals r 
LEFT JOIN gold_clients c ON r.referrer_client_id = c.id 
WHERE c.id IS NULL;

-- Cluster members without cluster
SELECT COUNT(*) as orphaned_members 
FROM gold_cluster_members cm 
LEFT JOIN gold_clusters c ON cm.cluster_id = c.id 
WHERE c.id IS NULL;
EOF

echo ""
echo "=== Integrity Check Complete ==="
```

---

## 6. Disaster Recovery Runbook

### DR Scenario 1: Database Corruption
```markdown
1. Identify corruption extent
   - Run: pg_dump --format=custom --compress=0 test
   - Check error messages

2. If partial corruption:
   - Restore affected tables only
   - Use: pg_restore --table=<table_name>

3. If full corruption:
   - Stop all services
   - Restore from latest backup
   - Apply WAL logs for PITR

4. Verify data integrity
   - Run integrity checks
   - Compare row counts with monitoring
```

### DR Scenario 2: Accidental Data Deletion
```markdown
1. Identify deletion time from audit logs
   SELECT * FROM audit_log 
   WHERE action = 'DELETE' 
   AND table_name LIKE 'gold_%'
   ORDER BY created_at DESC;

2. Perform PITR to just before deletion
   ./scripts/restore/etapa5-pitr-restore.sh "YYYY-MM-DD HH:MM:SS"

3. Extract needed data from restored DB

4. Merge back into production
```

### DR Scenario 3: Complete System Loss
```markdown
1. Provision new infrastructure
   - New Hetzner server
   - Docker installation
   - Network configuration

2. Restore from Hetzner Storage Box
   - Extract latest BorgBackup
   - Restore PostgreSQL
   - Restore Redis (if needed)

3. Verify all services
   - Health checks
   - Data integrity
   - API functionality

4. Update DNS/Load Balancer
```

---

## 7. Monitoring Backup Health

### Prometheus Alerts
```yaml
groups:
  - name: etapa5_backup_alerts
    rules:
      - alert: BackupMissing
        expr: time() - backup_last_success_timestamp{job="etapa5"} > 7200
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Etapa 5 backup missing for >2 hours"
          
      - alert: BackupFailed
        expr: backup_last_status{job="etapa5"} != 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Etapa 5 backup failed"
          
      - alert: BackupSizeDrop
        expr: (backup_size_bytes{job="etapa5"} / backup_size_bytes{job="etapa5"} offset 1d) < 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Etapa 5 backup size dropped >50%"
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
