# CERNIQ.APP — Database Recovery Runbook

> **Clasificare:** OPERAȚIONAL CRITIC  
> **Versiune:** 1.0  
> **Data:** 1 Februarie 2026  
> **Referințe:** [Backup Strategy](../infrastructure/backup-strategy.md), [ADR-0004](../adr/ADR%20Etapa%200/ADR-0004-PostgreSQL-18-1-cu-PostGIS.md)

---

## 📋 CUPRINS

1. [Overview](#1-overview)
2. [Scenarii de Recovery](#2-scenarii-de-recovery)
3. [Proceduri de Restore](#3-proceduri-de-restore)
4. [Point-in-Time Recovery (PITR)](#4-point-in-time-recovery-pitr)
5. [Verificare Post-Restore](#5-verificare-post-restore)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Overview

### 1.1 Arhitectura Backup PostgreSQL 18.1

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    PostgreSQL 18.1 Backup Layers                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Layer 1: WAL Archiving (Continuous)                                    │
│   ├── RPO: 1 minute                                                      │
│   ├── Location: /var/lib/postgresql/wal_archive                          │
│   └── Pushed to: Hetzner Storage Box (hourly)                            │
│                                                                          │
│   Layer 2: BorgBackup Daily Snapshots                                    │
│   ├── RPO: 24 hours                                                      │
│   ├── Tool: pg_dump --format=custom                                      │
│   └── Location: Hetzner Storage Box                                      │
│                                                                          │
│   Layer 3: Weekly Full Backups                                           │
│   ├── Tool: pg_basebackup                                                │
│   └── Retention: 4 weeks                                                 │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Recovery Time Objectives

| Data Tier | RPO | RTO | Metodă |
|-----------|-----|-----|--------|
| Financial (e-Factura) | 0 | 15 min | WAL + PITR |
| HITL/Approvals | 1 min | 15 min | WAL + PITR |
| Gold Layer | 15 min | 30 min | WAL + PITR |
| Silver Layer | 1 hour | 1 hour | pg_dump restore |
| Bronze Layer | 4 hours | 4 hours | pg_dump restore |

---

## 2. Scenarii de Recovery

### 2.1 Arbore de Decizie

```
┌─────────────────────────────────────────────────────────────────┐
│                    CE S-A ÎNTÂMPLAT?                            │
└─────────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   [Container         [Data             [Hardware
    Crash]            Corruption]        Failure]
        │                  │                  │
        ▼                  ▼                  ▼
   Scenario A         Scenario B         Scenario C
   (Restart)          (PITR)             (Full Restore)
```

### 2.2 Scenario A: Container Crash (Cel mai comun)

**Simptome:**
- Container `postgres` în status "Exited"
- API returnează "Connection refused"
- Datele pe disk sunt intacte

**Soluție:** Restart simplu

```bash
# 1. Verificare status
docker compose -f /var/www/CerniqAPP/infra/docker/docker-compose.yml ps postgres

# 2. Verificare logs pentru cauză
docker compose logs postgres --tail=100

# 3. Restart
docker compose up -d postgres

# 4. Verificare health
docker compose exec postgres pg_isready -U c3rn1q
# Output expected: /var/run/postgresql:5432 - accepting connections

# 5. Verificare conexiuni
docker compose exec postgres psql -U c3rn1q -c "SELECT count(*) FROM pg_stat_activity;"
```

**Timp estimat:** 2-5 minute

---

### 2.3 Scenario B: Data Corruption / Accidental Delete

**Simptome:**
- Query-uri returnează date incorecte
- Tabele lipsă sau corupte
- Erori de tip "invalid page header"

**Soluție:** Point-in-Time Recovery (PITR)

➡️ Vezi [Secțiunea 4: PITR](#4-point-in-time-recovery-pitr)

---

### 2.4 Scenario C: Hardware Failure / Full Restore

**Simptome:**
- Server complet indisponibil
- Disk failure
- Necesită setup pe hardware nou

**Soluție:** Full restore din BorgBackup

➡️ Vezi [Secțiunea 3.3: Full Restore](#33-full-restore-din-borgbackup)

---

## 3. Proceduri de Restore

### 3.1 Pre-Restore Checklist

- [ ] Confirmat că backup-ul există și este valid
- [ ] Spațiu pe disk suficient (2x database size)
- [ ] Aplicația oprită sau în maintenance mode
- [ ] Notificat echipa despre downtime
- [ ] Salvat starea curentă (dacă posibil)

### 3.2 Restore Tabel Individual

**Când:** Ștergere accidentală a unui tabel specific

```bash
# 1. Identificare backup disponibil
borg list ssh://u123456@u123456.your-storagebox.de:23/./cerniq-backup

# Output exemplu:
# cerniq-2026-02-01T02:00  Sun, 2026-02-01 02:00:00
# cerniq-2026-01-31T02:00  Sat, 2026-01-31 02:00:00

# 2. Extrage doar pg_dump din backup
borg extract ssh://u123456@u123456.your-storagebox.de:23/./cerniq-backup::cerniq-2026-02-01T02:00 \
  var/backups/postgresql/cerniq_daily.dump

# 3. Restore doar tabelul specific
pg_restore --host=localhost --port=64032 --username=cerniq \
  --dbname=cerniq --table=gold_companies --data-only \
  /tmp/cerniq_daily.dump

# SAU pentru schema + data:
pg_restore --host=localhost --port=64032 --username=cerniq \
  --dbname=cerniq --table=gold_companies --clean \
  /tmp/cerniq_daily.dump
```

### 3.3 Full Restore din BorgBackup

**Când:** Disaster recovery, hardware nou

```bash
#!/bin/bash
# Script: restore-database-full.sh

set -e

# Variables
BORG_REPO="ssh://u123456@u123456.your-storagebox.de:23/./cerniq-backup"
BACKUP_NAME="${1:-latest}"  # Use 'latest' or specific name
RESTORE_DIR="/tmp/db-restore-$(date +%Y%m%d-%H%M%S)"

echo "🔄 Starting full database restore..."
echo "📦 Backup: $BACKUP_NAME"

# 1. Stop application services (keep postgres running for now)
echo "⏹️ Stopping application services..."
docker compose stop api worker-enrichment worker-outreach worker-ai

# 2. List available backups
echo "📋 Available backups:"
borg list $BORG_REPO --short | head -10

# 3. Extract backup
echo "📥 Extracting backup..."
mkdir -p $RESTORE_DIR
cd $RESTORE_DIR

if [ "$BACKUP_NAME" = "latest" ]; then
  BACKUP_NAME=$(borg list $BORG_REPO --short | head -1)
fi

borg extract $BORG_REPO::$BACKUP_NAME var/backups/postgresql/

# 4. Verify dump file
DUMP_FILE="$RESTORE_DIR/var/backups/postgresql/cerniq_daily.dump"
if [ ! -f "$DUMP_FILE" ]; then
  echo "❌ Dump file not found!"
  exit 1
fi

echo "✅ Dump file found: $(ls -lh $DUMP_FILE)"

# 5. Stop postgres, backup current data
echo "⏹️ Stopping PostgreSQL..."
docker compose stop postgres

echo "💾 Backing up current data directory..."
CURRENT_DATA="/var/lib/docker/volumes/cerniq_postgres_data/_data"
if [ -d "$CURRENT_DATA" ]; then
  mv "$CURRENT_DATA" "${CURRENT_DATA}.old.$(date +%Y%m%d-%H%M%S)"
fi

# 6. Start fresh postgres
echo "🚀 Starting fresh PostgreSQL..."
docker compose up -d postgres
sleep 10

# Wait for postgres to be ready
for i in {1..30}; do
  if docker compose exec postgres pg_isready -U c3rn1q; then
    break
  fi
  echo "Waiting for PostgreSQL... ($i/30)"
  sleep 2
done

# 7. Restore database
echo "🔄 Restoring database..."
docker compose exec -T postgres pg_restore \
  --username=cerniq \
  --dbname=cerniq \
  --verbose \
  --clean \
  --if-exists \
  < "$DUMP_FILE"

# 8. Verify restore
echo "✅ Verifying restore..."
docker compose exec postgres psql -U c3rn1q -c "
SELECT 
  'gold_companies' as table_name, count(*) as rows FROM gold_companies
UNION ALL
SELECT 'gold_contacts', count(*) FROM gold_contacts
UNION ALL
SELECT 'approval_tasks', count(*) FROM approval_tasks;
"

# 9. Restart application services
echo "🚀 Restarting application services..."
docker compose up -d api worker-enrichment worker-outreach worker-ai

# 10. Cleanup
echo "🧹 Cleanup..."
rm -rf $RESTORE_DIR

echo "✅ Database restore complete!"
echo "⚠️ IMPORTANT: Verify application functionality manually!"
```

**Timp estimat:** 15-45 minute (depinde de size)

---

## 4. Point-in-Time Recovery (PITR)

### 4.1 Când să folosești PITR

- Ștergere accidentală de date
- Corruption cauzată de bad query
- Necesitate de a reveni la un moment specific în timp

### 4.2 Verificare WAL Archive

```bash
# Verificare WAL-uri arhivate local
ls -la /var/lib/postgresql/wal_archive/

# Verificare ultimul WAL
ls -la /var/lib/postgresql/wal_archive/ | tail -5

# Verificare pe Storage Box
borg list ssh://u123456@u123456.your-storagebox.de:23/./cerniq-wal
```

### 4.3 Procedura PITR

```bash
#!/bin/bash
# Script: pitr-restore.sh
# Usage: ./pitr-restore.sh "2026-02-01 14:30:00"

TARGET_TIME="${1}"

if [ -z "$TARGET_TIME" ]; then
  echo "Usage: $0 'YYYY-MM-DD HH:MM:SS'"
  exit 1
fi

echo "🕐 Point-in-Time Recovery to: $TARGET_TIME"

# 1. Stop all services
echo "⏹️ Stopping all services..."
docker compose down

# 2. Backup current data
echo "💾 Backing up current state..."
CURRENT_DATA="/var/lib/docker/volumes/cerniq_postgres_data/_data"
mv "$CURRENT_DATA" "${CURRENT_DATA}.pre-pitr.$(date +%Y%m%d-%H%M%S)"

# 3. Restore base backup
echo "📥 Restoring base backup..."
RESTORE_DIR="/var/lib/docker/volumes/cerniq_postgres_data/_data"
mkdir -p $RESTORE_DIR

# Extract latest base backup
borg extract ssh://u123456@u123456.your-storagebox.de:23/./cerniq-backup::$(borg list ssh://u123456@u123456.your-storagebox.de:23/./cerniq-backup --short | head -1) \
  --strip-components=4 \
  var/lib/postgresql/data

# 4. Configure recovery
echo "⚙️ Configuring recovery..."
cat > "$RESTORE_DIR/postgresql.auto.conf" << EOF
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
recovery_target_time = '$TARGET_TIME'
recovery_target_action = 'promote'
EOF

# Create recovery signal file
touch "$RESTORE_DIR/recovery.signal"

# 5. Set correct permissions
chown -R 999:999 $RESTORE_DIR

# 6. Start PostgreSQL
echo "🚀 Starting PostgreSQL in recovery mode..."
docker compose up -d postgres

# 7. Monitor recovery
echo "👀 Monitoring recovery progress..."
for i in {1..60}; do
  if docker compose exec postgres psql -U c3rn1q -c "SELECT pg_is_in_recovery();" 2>/dev/null | grep -q 'f'; then
    echo "✅ Recovery complete!"
    break
  fi
  echo "Recovery in progress... ($i/60)"
  sleep 10
done

# 8. Verify
echo "🔍 Verifying data at target time..."
docker compose exec postgres psql -U c3rn1q -c "
SELECT 
  (SELECT count(*) FROM gold_companies) as companies,
  (SELECT count(*) FROM approval_tasks) as tasks,
  (SELECT max(updated_at) FROM gold_companies) as last_update;
"

echo "✅ PITR complete to $TARGET_TIME"
echo "⚠️ IMPORTANT: Verify data integrity before resuming operations!"
```

---

## 5. Verificare Post-Restore

### 5.1 Checklist Verificare

```bash
#!/bin/bash
# Script: verify-restore.sh

echo "🔍 Post-Restore Verification"
echo "============================"

# 1. Conexiune
echo -n "1. Database connection: "
if docker compose exec postgres pg_isready -U c3rn1q > /dev/null 2>&1; then
  echo "✅ OK"
else
  echo "❌ FAILED"
  exit 1
fi

# 2. Schema integrity
echo -n "2. Schema integrity: "
TABLES=$(docker compose exec postgres psql -U c3rn1q -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
if [ "$TABLES" -gt 50 ]; then
  echo "✅ OK ($TABLES tables)"
else
  echo "⚠️ WARNING: Only $TABLES tables found"
fi

# 3. Critical tables have data
echo "3. Critical tables data:"
docker compose exec postgres psql -U c3rn1q -c "
SELECT 
  'gold_companies' as table_name, count(*) as rows FROM gold_companies
UNION ALL SELECT 'gold_contacts', count(*) FROM gold_contacts
UNION ALL SELECT 'approval_tasks', count(*) FROM approval_tasks
UNION ALL SELECT 'audit_log', count(*) FROM audit_log;
"

# 4. Extensions
echo -n "4. Required extensions: "
EXTENSIONS=$(docker compose exec postgres psql -U c3rn1q -t -c "SELECT count(*) FROM pg_extension WHERE extname IN ('pgvector', 'postgis', 'pg_trgm');")
if [ "$EXTENSIONS" -eq 3 ]; then
  echo "✅ OK (pgvector, postgis, pg_trgm)"
else
  echo "⚠️ WARNING: Some extensions missing"
fi

# 5. Foreign keys
echo -n "5. Foreign key constraints: "
FK_COUNT=$(docker compose exec postgres psql -U c3rn1q -t -c "SELECT count(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY';")
echo "✅ $FK_COUNT constraints"

# 6. Indexes
echo -n "6. Indexes: "
IDX_COUNT=$(docker compose exec postgres psql -U c3rn1q -t -c "SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';")
echo "✅ $IDX_COUNT indexes"

# 7. RLS Policies
echo -n "7. RLS policies: "
RLS_COUNT=$(docker compose exec postgres psql -U c3rn1q -t -c "SELECT count(*) FROM pg_policies;")
echo "✅ $RLS_COUNT policies"

echo ""
echo "============================"
echo "Verification complete!"
```

### 5.2 Application-Level Verification

```bash
# 1. API Health
curl -s http://localhost:64000/health | jq .

# 2. Database connectivity from API
curl -s http://localhost:64000/health/db | jq .

# 3. Run critical query
curl -s http://localhost:64000/api/v1/companies?limit=5 | jq .

# 4. Check BullMQ can connect to DB
docker compose exec api npx bullmq stats
```

---

## 6. Troubleshooting

### 6.1 Erori Comune

#### "FATAL: data directory has wrong ownership"

```bash
# Fix permissions
sudo chown -R 999:999 /var/lib/docker/volumes/cerniq_postgres_data/_data
```

#### "could not connect to server: Connection refused"

```bash
# Verificare port binding
docker compose ps postgres
netstat -tlnp | grep 64032

# Verificare logs
docker compose logs postgres --tail=50
```

#### "pg_restore: error: could not execute query: ERROR: relation already exists"

```bash
# Folosește --clean flag
pg_restore --clean --if-exists ...

# Sau drop database first
docker compose exec postgres psql -U c3rn1q -c "DROP DATABASE cerniq; CREATE DATABASE cerniq;"
```

#### "invalid page header in block X"

```bash
# Database corruption - necesită restore complet
# NU încercați pg_resetwal decât ca ultimă soluție

# 1. Oprire imediată
docker compose stop postgres

# 2. Full restore
./scripts/restore-database-full.sh latest
```

### 6.2 Performance Post-Restore

```bash
# După restore, rulează ANALYZE pentru statistici actualizate
docker compose exec postgres psql -U c3rn1q -c "ANALYZE VERBOSE;"

# Reindex dacă necesar
docker compose exec postgres psql -U c3rn1q -c "REINDEX DATABASE cerniq;"

# Verificare vacuum
docker compose exec postgres psql -U c3rn1q -c "
SELECT schemaname, relname, last_vacuum, last_autovacuum 
FROM pg_stat_user_tables 
ORDER BY last_autovacuum DESC NULLS LAST 
LIMIT 10;
"
```

---

## 📝 Changelog

| Data | Versiune | Modificare |
|------|----------|------------|
| 2026-02-01 | 1.0 | Document inițial |

---

**Document Owner:** DevOps Team  
**Review Schedule:** Trimestrial  
**Next Review:** Mai 2026
