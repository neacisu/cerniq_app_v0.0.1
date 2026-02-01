# CERNIQ.APP — BACKUP & DISASTER RECOVERY STRATEGY

## B2B Sales Automation Platform pentru Piața Agricolă Românească

**Versiune:** 1.0  
**Data:** 12 Ianuarie 2026  
**Sursă de Adevăr:** `Cerniq_Master_Spec_Normativ_Complet.md` v1.2  
**Infrastructură:** Hetzner Bare Metal (20 cores Intel, 128GB RAM, NVMe SSD)  
**Destinație Backup:** Hetzner Storage Box (SSH/rsync/BorgBackup pe port 23)

---

## CUPRINS

1. [Executive Summary](#1-executive-summary)
2. [Recovery Objectives (RPO/RTO)](#2-recovery-objectives-rporto)
3. [Backup Architecture Overview](#3-backup-architecture-overview)
4. [PostgreSQL 18.1 Backup Strategy](#4-postgresql-181-backup-strategy)
5. [Redis 8.4.0 Persistence & Backup](#5-redis-840-persistence--backup)
6. [Application & Configuration Backup](#6-application--configuration-backup)
7. [BorgBackup Integration](#7-borgbackup-integration)
8. [Hetzner Storage Box Configuration](#8-hetzner-storage-box-configuration)
9. [Retention Policies](#9-retention-policies)
10. [Disaster Recovery Procedures](#10-disaster-recovery-procedures)
11. [Monitoring & Alerting](#11-monitoring--alerting)
12. [Testing & Validation](#12-testing--validation)
13. [Compliance & Audit](#13-compliance--audit)
14. [Scripts & Automation](#14-scripts--automation)
15. [Checklist & Runbooks](#15-checklist--runbooks)

---

## 1. Executive Summary

## 1.1 Scopul Documentului

Acest document definește strategia completă de backup și disaster recovery pentru platforma Cerniq.app, asigurând:

- **Zero Data Loss** pentru date critice de business (tranzacții, facturi, aprobări HITL)
- **Recuperare rapidă** în caz de dezastru (RTO < 4 ore pentru sisteme critice)
- **Conformitate regulatorie** cu GDPR, e-Factura (10 ani retenție), și Legea 190/2018
- **Audit trail complet** pentru toate operațiunile de backup/restore

## 1.2 Principii Fundamentale

| Principiu | Implementare |
| --------- | ------------ |
| **3-2-1-1-0 Rule** | 3 copii, 2 tipuri media, 1 offsite (Hetzner Storage Box), 1 immutable, 0 erori la restore test |
| **Defense in Depth** | Multiple straturi: persistence locală + backup logic + backup fizic + offsite |
| **Encrypt at Rest** | Toate backup-urile criptate cu AES-256 (BorgBackup repokey) |
| **Immutability** | BorgBackup append-only mode pentru protecție ransomware |
| **Automated Testing** | Restore tests săptămânale automatizate |

## 1.3 Componente Critice

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CERNIQ.APP DATA TIERS                                │
└─────────────────────────────────────────────────────────────────────────────┘

TIER 1 - CRITICAL (RPO: 1 min, RTO: 15 min)
├── PostgreSQL: approval_tasks, gold_companies, gold_contacts
├── PostgreSQL: financial_data (e-Factura, tranzacții)
└── Redis: BullMQ active jobs (queue state)

TIER 2 - IMPORTANT (RPO: 15 min, RTO: 1 hour)
├── PostgreSQL: silver_companies, silver_contacts
├── PostgreSQL: audit_logs, approval_audit_log
└── Redis: BullMQ completed jobs (statistics)

TIER 3 - STANDARD (RPO: 1 hour, RTO: 4 hours)
├── PostgreSQL: bronze_raw_ingestion
├── Application configs, Docker volumes
└── SigNoz observability data
```

---

## 2. Recovery Objectives (RPO/RTO)

## 2.1 Definiții

- **RPO (Recovery Point Objective)**: Cantitatea maximă de date ce pot fi pierdute, măsurată în timp
- **RTO (Recovery Time Objective)**: Timpul maxim acceptabil de downtime până la restaurare

## 2.2 Obiective per Componentă

| Componentă | RPO | RTO | Strategie | Prioritate |
| ---------- | --- | --- | --------- | ---------- |
| **PostgreSQL - Financial** | 0 (sync) | 15 min | WAL streaming + PITR | P0 |
| **PostgreSQL - HITL/Approval** | 1 min | 15 min | WAL archiving continuu | P0 |
| **PostgreSQL - Gold Layer** | 15 min | 30 min | WAL archiving | P1 |
| **PostgreSQL - Silver Layer** | 1 hour | 1 hour | pg_dump incremental | P2 |
| **PostgreSQL - Bronze Layer** | 4 hours | 4 hours | pg_dump daily | P3 |
| **Redis - Active Jobs** | 1 sec | 5 min | AOF everysec + RDB | P0 |
| **Redis - Statistics** | 1 hour | 1 hour | RDB snapshots | P2 |
| **Docker Configs** | 24 hours | 1 hour | BorgBackup daily | P2 |
| **Application Code** | N/A | 30 min | Git + Docker images | P1 |
| **SSL Certificates** | 24 hours | 1 hour | BorgBackup | P2 |

## 2.3 Business Impact Analysis

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DOWNTIME COST ANALYSIS                                 │
└─────────────────────────────────────────────────────────────────────────────┘

TIER 1 - CRITICAL SYSTEMS DOWN
├── e-Factura submission blocked → 15% invoice penalty per ANAF
├── HITL approvals blocked → Sales pipeline frozen
├── BullMQ jobs lost → Outreach campaigns disrupted
└── Estimated cost: €5,000/hour

TIER 2 - IMPORTANT SYSTEMS DOWN  
├── Data enrichment paused → Lead quality degradation
├── Audit logs unavailable → Compliance risk
└── Estimated cost: €1,000/hour

TIER 3 - STANDARD SYSTEMS DOWN
├── New data ingestion paused → Backlog accumulation
├── Observability gaps → Troubleshooting difficulty
└── Estimated cost: €200/hour
```

---

## 3. Backup Architecture Overview

## 3.1 Diagrama Arhitecturii

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKUP ARCHITECTURE                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                    HETZNER BARE METAL SERVER                               │
│                    (Production Environment)                                │
│                                                                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  PostgreSQL 18  │  │   Redis 8.4.0   │  │  Docker Volumes │             │
│  │                 │  │                 │  │                 │             │
│  │  ┌───────────┐  │  │  ┌───────────┐  │  │  /var/lib/      │             │
│  │  │ WAL Files │  │  │  │ AOF + RDB │  │  │    docker/      │             │
│  │  └─────┬─────┘  │  │  └─────┬─────┘  │  │    volumes/     │             │
│  └────────┼────────┘  └────────┼────────┘  └────────┬────────┘             │
│           │                    │                    │                      │
│           ▼                    ▼                    ▼                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LOCAL BACKUP STAGING                             │   │
│  │                    /var/backups/cerniq/                             │   │
│  │                                                                     │   │
│  │  postgresql/          redis/              configs/                  │   │
│  │  ├── base/            ├── dump.rdb        ├── docker/               │   │
│  │  ├── wal_archive/     └── appendonly.aof  ├── traefik/              │   │
│  │  └── daily_dumps/                         └── nginx/                │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │                                         │
│                                  │ BorgBackup                              │
│                                  │ (encrypted, deduplicated)               │
│                                  ▼                                         │
└──────────────────────────────────┼─────────────────────────────────────────┘
                                   │
                                   │ SSH (port 23)
                                   │ rsync + encryption
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HETZNER STORAGE BOX (Offsite)                            │
│                    uXXXXXX.your-storagebox.de                               │
│                                                                             │
│  /backups/                                                                  │
│  ├── borg-repo/                 # BorgBackup repository (encrypted)         │
│  │   ├── data/                  # Deduplicated chunks                       │
│  │   ├── config                 # Repository config                         │
│  │   └── README                 # Repository info                           │
│  │                                                                          │
│  ├── postgresql/                # WAL archive (continuous)                  │
│  │   ├── wal_archive/           # WAL segments                              │
│  │   └── basebackups/           # Weekly base backups                       │
│  │                                                                          │
│  └── redis/                     # Redis snapshots                           │
│      └── daily/                 # Daily RDB copies                          │
│                                                                             │
│  Retention: Daily 7d, Weekly 4w, Monthly 3m, Yearly 10y (financial)         │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Fluxuri de Backup

### Flux Continuu (Real-time)

```text
PostgreSQL WAL → archive_command → /var/backups/cerniq/postgresql/wal_archive/
                                 → rsync → Hetzner Storage Box
Redis AOF → appendfsync everysec → /var/lib/redis/appendonly.aof
```

### Flux Periodic (Scheduled)

```text
Hourly:  Redis RDB snapshot → rsync to Hetzner
Daily:   pg_dump parallel → BorgBackup → Hetzner
Weekly:  pg_basebackup full → Hetzner
Monthly: Full system backup → BorgBackup (long-term retention)
```

---

## 4. PostgreSQL 18.1 Backup Strategy

## 4.1 Configurare WAL Archiving

PostgreSQL 18.1 introduce îmbunătățiri semnificative pentru backup, inclusiv async I/O subsystem și incremental backups native.

### postgresql.conf - Backup Settings

```ini
# =============================================================================
# PostgreSQL 18.1 BACKUP CONFIGURATION
# Optimized for Cerniq.app on Hetzner (128GB RAM, NVMe SSD)
# =============================================================================

# ------------------------------------------------------------------------------
# WAL ARCHIVING (Continuous for PITR)
# ------------------------------------------------------------------------------
wal_level = replica                    # Required for archiving and replication
archive_mode = on                      # Enable WAL archiving
archive_command = '/usr/local/bin/wal_archive.sh %p %f'
archive_timeout = 60                   # Force archive every 60s even if not full

# WAL sizing for high-throughput
max_wal_size = 4GB                     # Allow more WAL before checkpoint
min_wal_size = 1GB                     # Keep minimum for recovery
wal_keep_size = 2GB                    # Keep WAL for slow standby

# WAL performance
wal_buffers = 64MB                     # Write-heavy optimization
wal_writer_delay = 200ms               # Default, adjust if needed
wal_compression = zstd                 # PostgreSQL 18 supports zstd

# Checkpointing (balance between recovery time and I/O)
checkpoint_timeout = 15min             # More frequent for lower RPO
checkpoint_completion_target = 0.9     # Spread checkpoint I/O
checkpoint_warning = 30s               # Warn if checkpoints too frequent

# ------------------------------------------------------------------------------
# BACKUP OPTIMIZATION
# ------------------------------------------------------------------------------
# Parallel backup support (PostgreSQL 18)
max_parallel_workers = 16              # For parallel pg_dump
max_worker_processes = 20              # Total workers

# Data integrity
full_page_writes = on                  # Required for PITR
data_checksums = on                    # PostgreSQL 18 default ON for new clusters

# Summarization for incremental backups
summarize_wal = on                     # PostgreSQL 18: enable for pg_basebackup --incremental
```

### wal_archive.sh - WAL Archive Script

```bash
#!/bin/bash
# /usr/local/bin/wal_archive.sh
# Archives WAL files to local staging and syncs to Hetzner Storage Box

set -euo pipefail

WAL_PATH="$1"
WAL_FILE="$2"
LOCAL_ARCHIVE="/var/backups/cerniq/postgresql/wal_archive"
REMOTE_HOST="uXXXXXX@uXXXXXX.your-storagebox.de"
REMOTE_PATH="/backups/postgresql/wal_archive"
LOG_FILE="/var/log/cerniq/wal_archive.log"

# Create directories if needed
mkdir -p "$LOCAL_ARCHIVE"
mkdir -p "$(dirname "$LOG_FILE")"

# Archive locally first (fast, reliable)
cp "$WAL_PATH" "$LOCAL_ARCHIVE/$WAL_FILE"

# Compress with zstd (PostgreSQL 18 native support)
zstd -q -T0 "$LOCAL_ARCHIVE/$WAL_FILE" -o "$LOCAL_ARCHIVE/${WAL_FILE}.zst"
rm "$LOCAL_ARCHIVE/$WAL_FILE"

# Sync to remote (async, in background)
rsync -az --timeout=30 -e 'ssh -p23 -o StrictHostKeyChecking=no' \
    "$LOCAL_ARCHIVE/${WAL_FILE}.zst" \
    "${REMOTE_HOST}:${REMOTE_PATH}/" \
    >> "$LOG_FILE" 2>&1 &

# Log success
echo "$(date -Iseconds) Archived: $WAL_FILE" >> "$LOG_FILE"

exit 0
```

## 4.2 Backup Types și Schedule

### Base Backup (pg_basebackup)

```bash
#!/bin/bash
# /usr/local/bin/pg_basebackup_weekly.sh
# Weekly full base backup with incremental support

set -euo pipefail

BACKUP_DIR="/var/backups/cerniq/postgresql/basebackups"
BACKUP_NAME="base_$(date +%Y%m%d_%H%M%S)"
REMOTE_HOST="uXXXXXX@uXXXXXX.your-storagebox.de"
MANIFEST_DIR="/var/backups/cerniq/postgresql/manifests"

mkdir -p "$BACKUP_DIR" "$MANIFEST_DIR"

# Check for previous backup manifest (for incremental)
PREV_MANIFEST=$(ls -t "$MANIFEST_DIR"/*.manifest 2>/dev/null | head -1 || echo "")

if [[ -n "$PREV_MANIFEST" ]]; then
    echo "Creating incremental backup based on: $PREV_MANIFEST"
    pg_basebackup \
        -h /var/run/postgresql \
        -U postgres \
        -D "$BACKUP_DIR/$BACKUP_NAME" \
        --incremental="$PREV_MANIFEST" \
        --checkpoint=fast \
        --wal-method=stream \
        --format=tar \
        --gzip \
        --progress \
        --verbose \
        --manifest-checksums=SHA256 \
        2>&1 | tee -a /var/log/cerniq/basebackup.log
else
    echo "Creating full base backup (no previous manifest)"
    pg_basebackup \
        -h /var/run/postgresql \
        -U postgres \
        -D "$BACKUP_DIR/$BACKUP_NAME" \
        --checkpoint=fast \
        --wal-method=stream \
        --format=tar \
        --gzip \
        --progress \
        --verbose \
        --manifest-checksums=SHA256 \
        2>&1 | tee -a /var/log/cerniq/basebackup.log
fi

# Copy manifest for next incremental
cp "$BACKUP_DIR/$BACKUP_NAME/backup_manifest" "$MANIFEST_DIR/${BACKUP_NAME}.manifest"

# Sync to Hetzner Storage Box
rsync -avz --progress -e 'ssh -p23' \
    "$BACKUP_DIR/$BACKUP_NAME" \
    "${REMOTE_HOST}:/backups/postgresql/basebackups/"

echo "Base backup completed: $BACKUP_NAME"
```

### Logical Backup (pg_dump) - Daily

```bash
#!/bin/bash
# /usr/local/bin/pg_dump_daily.sh
# Daily logical backup with parallel jobs

set -euo pipefail

BACKUP_DIR="/var/backups/cerniq/postgresql/daily_dumps"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
JOBS=8  # Parallel jobs (adjust based on CPU)

mkdir -p "$BACKUP_DIR"

# Full cluster dump (all databases)
pg_dumpall \
    -h /var/run/postgresql \
    -U postgres \
    --clean \
    --if-exists \
    | zstd -T0 -19 > "$BACKUP_DIR/cluster_${TIMESTAMP}.sql.zst"

# Individual database dumps (for faster selective restore)
for DB in cerniq_production cerniq_audit; do
    pg_dump \
        -h /var/run/postgresql \
        -U postgres \
        -d "$DB" \
        --format=directory \
        --jobs=$JOBS \
        --compress=zstd:9 \
        --file="$BACKUP_DIR/${DB}_${TIMESTAMP}" \
        2>&1 | tee -a /var/log/cerniq/pg_dump.log
done

# Cleanup old dumps (keep 7 days locally)
find "$BACKUP_DIR" -type f -mtime +7 -delete
find "$BACKUP_DIR" -type d -empty -delete

echo "Daily dump completed: $TIMESTAMP"
```

### Table-Specific Backup (Critical Tables)

```bash
#!/bin/bash
# /usr/local/bin/pg_dump_critical.sh
# Hourly backup of critical tables only

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

mkdir -p "$BACKUP_DIR"

for TABLE in "${CRITICAL_TABLES[@]}"; do
    pg_dump \
        -h /var/run/postgresql \
        -U postgres \
        -d cerniq_production \
        --table="$TABLE" \
        --format=custom \
        --compress=9 \
        --file="$BACKUP_DIR/${TABLE}_${TIMESTAMP}.dump"
done

# Keep only last 24 hours of critical backups locally
find "$BACKUP_DIR" -type f -mtime +1 -delete
```

## 4.3 Point-in-Time Recovery (PITR)

### Recovery Configuration

```ini
# postgresql.auto.conf pentru recovery
# Creat automat de pg_basebackup sau manual pentru restore

restore_command = 'zstd -d -q /var/backups/cerniq/postgresql/wal_archive/%f.zst -o %p || cp /var/backups/cerniq/postgresql/wal_archive/%f %p'
recovery_target_time = '2026-01-12 14:30:00+02'  # Optional: specific point
recovery_target_action = 'promote'                # Become primary after recovery
```

### PITR Restore Procedure

```bash
#!/bin/bash
# /usr/local/bin/pg_pitr_restore.sh
# Point-in-Time Recovery procedure

set -euo pipefail

# Parameters
TARGET_TIME="${1:-}"  # Optional: '2026-01-12 14:30:00+02'
BASE_BACKUP="${2:-latest}"  # Backup to restore from

PGDATA="/var/lib/postgresql/18/main"
BACKUP_DIR="/var/backups/cerniq/postgresql"
WAL_ARCHIVE="$BACKUP_DIR/wal_archive"

echo "=== PITR RESTORE STARTING ==="
echo "Target time: ${TARGET_TIME:-'latest available'}"
echo "Base backup: $BASE_BACKUP"

# 1. Stop PostgreSQL
systemctl stop postgresql

# 2. Backup current data (just in case)
mv "$PGDATA" "${PGDATA}.old.$(date +%s)"

# 3. Restore base backup
if [[ "$BASE_BACKUP" == "latest" ]]; then
    BASE_BACKUP=$(ls -td "$BACKUP_DIR/basebackups"/base_* | head -1)
fi

echo "Restoring from: $BASE_BACKUP"
mkdir -p "$PGDATA"

# Handle incremental backups (PostgreSQL 18)
if [[ -f "$BASE_BACKUP/backup_manifest" ]]; then
    # Check if incremental
    if grep -q "Incremental" "$BASE_BACKUP/backup_manifest"; then
        echo "Combining incremental backups..."
        pg_combinebackup "$BASE_BACKUP" -o "$PGDATA"
    else
        tar -xzf "$BASE_BACKUP/base.tar.gz" -C "$PGDATA"
    fi
else
    tar -xzf "$BASE_BACKUP/base.tar.gz" -C "$PGDATA"
fi

# 4. Configure recovery
cat > "$PGDATA/postgresql.auto.conf" << EOF
restore_command = 'zstd -d -q ${WAL_ARCHIVE}/%f.zst -o %p || cp ${WAL_ARCHIVE}/%f %p'
recovery_target_action = 'promote'
EOF

if [[ -n "$TARGET_TIME" ]]; then
    echo "recovery_target_time = '$TARGET_TIME'" >> "$PGDATA/postgresql.auto.conf"
fi

# 5. Create recovery signal file
touch "$PGDATA/recovery.signal"

# 6. Fix permissions
chown -R postgres:postgres "$PGDATA"
chmod 700 "$PGDATA"

# 7. Start PostgreSQL (will enter recovery mode)
systemctl start postgresql

echo "=== PITR RESTORE INITIATED ==="
echo "Monitor with: tail -f /var/log/postgresql/postgresql-18-main.log"
```

---

## 5. Redis 8.4.0 Persistence & Backup

## 5.1 Hybrid Persistence Configuration

Pentru BullMQ workloads, configurăm **AOF + RDB hybrid** pentru durabilitate maximă cu recovery rapid.

### redis.conf - Persistence Settings

```ini
# =============================================================================
# Redis 8.4.0 PERSISTENCE CONFIGURATION
# Optimized for BullMQ job queues on Cerniq.app
# =============================================================================

# ------------------------------------------------------------------------------
# RDB SNAPSHOTS (Point-in-time recovery)
# ------------------------------------------------------------------------------
# Save after 900 seconds if at least 1 key changed
save 900 1
# Save after 300 seconds if at least 10 keys changed
save 300 10
# Save after 60 seconds if at least 10000 keys changed
save 60 10000

# RDB file settings
dbfilename dump.rdb
dir /var/lib/redis

# Use LZF compression (fast, moderate ratio)
rdbcompression yes
rdbchecksum yes

# Stop writes if RDB save fails (data integrity)
stop-writes-on-bgsave-error yes

# ------------------------------------------------------------------------------
# AOF PERSISTENCE (Durability)
# ------------------------------------------------------------------------------
appendonly yes
appendfilename "appendonly.aof"
appenddirname "appendonlydir"

# Hybrid AOF (RDB preamble + AOF tail)
# Faster recovery than pure AOF
aof-use-rdb-preamble yes

# Sync policy: everysec = max 1 second data loss
# Options: always (safest, slowest), everysec (balanced), no (fastest, unsafe)
appendfsync everysec

# Don't block main thread during rewrite
no-appendfsync-on-rewrite no

# Auto-rewrite when AOF grows
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Load truncated AOF on recovery
aof-load-truncated yes

# Enable AOF timestamp annotations (Redis 7+)
aof-timestamp-enabled yes

# ------------------------------------------------------------------------------
# LAZY FREEING (Prevent blocking on large deletes)
# ------------------------------------------------------------------------------
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes
replica-lazy-flush yes
lazyfree-lazy-user-del yes
lazyfree-lazy-user-flush yes

# Active defragmentation (reduce memory fragmentation)
activedefrag yes
active-defrag-ignore-bytes 100mb
active-defrag-threshold-lower 10
active-defrag-threshold-upper 100
active-defrag-cycle-min 1
active-defrag-cycle-max 25

# ------------------------------------------------------------------------------
# MEMORY (BullMQ specific)
# ------------------------------------------------------------------------------
maxmemory 80gb
maxmemory-policy noeviction    # CRITICAL: Jobs cannot be evicted

# BullMQ keyspace notifications
notify-keyspace-events Ex
```

## 5.2 Redis Backup Scripts

### Hourly RDB Backup

```bash
#!/bin/bash
# /usr/local/bin/redis_backup_hourly.sh
# Hourly Redis RDB backup to Hetzner Storage Box

set -euo pipefail

REDIS_CLI="redis-cli"
BACKUP_DIR="/var/backups/cerniq/redis"
REDIS_DATA="/var/lib/redis"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REMOTE_HOST="uXXXXXX@uXXXXXX.your-storagebox.de"

mkdir -p "$BACKUP_DIR"

# Trigger BGSAVE
echo "Triggering Redis BGSAVE..."
$REDIS_CLI BGSAVE

# Wait for BGSAVE to complete
while [[ $($REDIS_CLI LASTSAVE) == $($REDIS_CLI LASTSAVE) ]]; do
    sleep 1
done
sleep 2  # Extra wait for file sync

# Copy RDB file
cp "$REDIS_DATA/dump.rdb" "$BACKUP_DIR/redis_${TIMESTAMP}.rdb"

# Compress with zstd
zstd -q -T0 -19 "$BACKUP_DIR/redis_${TIMESTAMP}.rdb"
rm "$BACKUP_DIR/redis_${TIMESTAMP}.rdb"

# Sync to Hetzner
rsync -az -e 'ssh -p23' \
    "$BACKUP_DIR/redis_${TIMESTAMP}.rdb.zst" \
    "${REMOTE_HOST}:/backups/redis/hourly/"

# Cleanup old local backups (keep 48 hours)
find "$BACKUP_DIR" -name "redis_*.rdb.zst" -mtime +2 -delete

echo "Redis backup completed: redis_${TIMESTAMP}.rdb.zst"
```

### AOF Backup (Daily)

```bash
#!/bin/bash
# /usr/local/bin/redis_backup_aof.sh
# Daily AOF backup (for complete transaction log)

set -euo pipefail

REDIS_DATA="/var/lib/redis"
AOF_DIR="$REDIS_DATA/appendonlydir"
BACKUP_DIR="/var/backups/cerniq/redis/aof"
TIMESTAMP=$(date +%Y%m%d)
REMOTE_HOST="uXXXXXX@uXXXXXX.your-storagebox.de"

mkdir -p "$BACKUP_DIR"

# Trigger AOF rewrite to compact
redis-cli BGREWRITEAOF

# Wait for rewrite
while [[ $(redis-cli INFO persistence | grep aof_rewrite_in_progress | cut -d: -f2 | tr -d '\r') == "1" ]]; do
    sleep 5
done

# Archive AOF directory
tar -czf "$BACKUP_DIR/aof_${TIMESTAMP}.tar.gz" -C "$REDIS_DATA" appendonlydir/

# Sync to Hetzner
rsync -az -e 'ssh -p23' \
    "$BACKUP_DIR/aof_${TIMESTAMP}.tar.gz" \
    "${REMOTE_HOST}:/backups/redis/aof/"

# Cleanup (keep 7 days)
find "$BACKUP_DIR" -name "aof_*.tar.gz" -mtime +7 -delete

echo "AOF backup completed: aof_${TIMESTAMP}.tar.gz"
```

## 5.3 Redis Recovery Procedure

```bash
#!/bin/bash
# /usr/local/bin/redis_restore.sh
# Redis restore from backup

set -euo pipefail

BACKUP_FILE="${1:-}"
RESTORE_TYPE="${2:-rdb}"  # rdb or aof
REDIS_DATA="/var/lib/redis"

if [[ -z "$BACKUP_FILE" ]]; then
    echo "Usage: $0 <backup_file> [rdb|aof]"
    echo "Example: $0 /var/backups/cerniq/redis/redis_20260112.rdb.zst rdb"
    exit 1
fi

echo "=== REDIS RESTORE STARTING ==="
echo "Backup: $BACKUP_FILE"
echo "Type: $RESTORE_TYPE"

# 1. Stop Redis
systemctl stop redis

# 2. Backup current data
mv "$REDIS_DATA" "${REDIS_DATA}.old.$(date +%s)"
mkdir -p "$REDIS_DATA"

# 3. Restore based on type
if [[ "$RESTORE_TYPE" == "rdb" ]]; then
    if [[ "$BACKUP_FILE" == *.zst ]]; then
        zstd -d -q "$BACKUP_FILE" -o "$REDIS_DATA/dump.rdb"
    else
        cp "$BACKUP_FILE" "$REDIS_DATA/dump.rdb"
    fi
elif [[ "$RESTORE_TYPE" == "aof" ]]; then
    tar -xzf "$BACKUP_FILE" -C "$REDIS_DATA"
fi

# 4. Fix permissions
chown -R redis:redis "$REDIS_DATA"
chmod 750 "$REDIS_DATA"

# 5. Validate before starting
if [[ "$RESTORE_TYPE" == "rdb" ]]; then
    redis-check-rdb "$REDIS_DATA/dump.rdb"
elif [[ "$RESTORE_TYPE" == "aof" ]]; then
    redis-check-aof --fix "$REDIS_DATA/appendonlydir/appendonly.aof.1.incr.aof"
fi

# 6. Start Redis
systemctl start redis

# 7. Verify
sleep 2
redis-cli PING && echo "Redis restored successfully!"
redis-cli INFO keyspace
```

---

## 6. Application & Configuration Backup

## 6.1 Docker Configuration Backup

```bash
#!/bin/bash
# /usr/local/bin/backup_docker_configs.sh
# Backup Docker configurations and volumes

set -euo pipefail

BACKUP_DIR="/var/backups/cerniq/configs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR/docker"

# Docker daemon config
cp /etc/docker/daemon.json "$BACKUP_DIR/docker/"

# Docker Compose files
for COMPOSE_DIR in /opt/cerniq/*/; do
    if [[ -f "${COMPOSE_DIR}docker-compose.yml" ]]; then
        SERVICE_NAME=$(basename "$COMPOSE_DIR")
        mkdir -p "$BACKUP_DIR/docker/$SERVICE_NAME"
        cp "${COMPOSE_DIR}docker-compose.yml" "$BACKUP_DIR/docker/$SERVICE_NAME/"
        cp "${COMPOSE_DIR}.env" "$BACKUP_DIR/docker/$SERVICE_NAME/" 2>/dev/null || true
    fi
done

# Named volumes list
docker volume ls --format '{{.Name}}' > "$BACKUP_DIR/docker/volumes_list.txt"

# Running containers state
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' > "$BACKUP_DIR/docker/containers_state.txt"

echo "Docker configs backed up to: $BACKUP_DIR/docker"
```

## 6.2 Traefik & SSL Certificates

```bash
#!/bin/bash
# /usr/local/bin/backup_traefik.sh
# Backup Traefik configuration and Let's Encrypt certificates

set -euo pipefail

BACKUP_DIR="/var/backups/cerniq/configs/traefik"
TIMESTAMP=$(date +%Y%m%d)

mkdir -p "$BACKUP_DIR"

# Traefik static config
cp /opt/cerniq/traefik/traefik.yml "$BACKUP_DIR/"

# Dynamic configs
cp -r /opt/cerniq/traefik/dynamic/ "$BACKUP_DIR/" 2>/dev/null || true

# ACME/Let's Encrypt certificates (CRITICAL)
cp /opt/cerniq/traefik/acme.json "$BACKUP_DIR/acme_${TIMESTAMP}.json"
chmod 600 "$BACKUP_DIR/acme_${TIMESTAMP}.json"

echo "Traefik config backed up"
```

## 6.3 Environment Variables & Secrets

```bash
#!/bin/bash
# /usr/local/bin/backup_secrets.sh
# Backup environment files (encrypted)

set -euo pipefail

BACKUP_DIR="/var/backups/cerniq/secrets"
TIMESTAMP=$(date +%Y%m%d)
GPG_RECIPIENT="admin@cerniq.app"  # GPG key for encryption

mkdir -p "$BACKUP_DIR"

# Collect all .env files
find /opt/cerniq -name ".env*" -type f | while read ENV_FILE; do
    REL_PATH=${ENV_FILE#/opt/cerniq/}
    BACKUP_FILE="$BACKUP_DIR/${REL_PATH//\//_}_${TIMESTAMP}.gpg"
    gpg --encrypt --recipient "$GPG_RECIPIENT" --output "$BACKUP_FILE" "$ENV_FILE"
done

# Backup HashiCorp Vault tokens (if using)
if [[ -f /root/.vault-token ]]; then
    gpg --encrypt --recipient "$GPG_RECIPIENT" \
        --output "$BACKUP_DIR/vault_token_${TIMESTAMP}.gpg" \
        /root/.vault-token
fi

echo "Secrets backed up (encrypted) to: $BACKUP_DIR"
```

---

## 7. BorgBackup Integration

## 7.1 BorgBackup Configuration

BorgBackup oferă **deduplicare și criptare** pentru backup-uri eficiente și sigure.

### Inițializare Repository

```bash
#!/bin/bash
# /usr/local/bin/borg_init.sh
# Initialize BorgBackup repository on Hetzner Storage Box

set -euo pipefail

BORG_REPO="ssh://uXXXXXX@uXXXXXX.your-storagebox.de:23/./backups/borg-repo"
export BORG_PASSPHRASE="$(cat /root/.borg_passphrase)"

# Initialize with repokey encryption (key stored in repo, encrypted with passphrase)
borg init \
    --encryption=repokey-blake2 \
    --remote-path=borg-1.4 \
    "$BORG_REPO"

# Export key for safekeeping (store securely!)
borg key export "$BORG_REPO" /root/borg_key_backup.txt
echo "IMPORTANT: Store /root/borg_key_backup.txt securely (offline)!"
echo "Without both passphrase AND key, backups cannot be restored!"
```

### Daily Backup Script

```bash
#!/bin/bash
# /usr/local/bin/borg_backup_daily.sh
# Daily incremental backup with BorgBackup

set -euo pipefail

BORG_REPO="ssh://uXXXXXX@uXXXXXX.your-storagebox.de:23/./backups/borg-repo"
export BORG_PASSPHRASE="$(cat /root/.borg_passphrase)"
export BORG_RSH="ssh -p 23"

ARCHIVE_NAME="cerniq-$(hostname)-$(date +%Y%m%d_%H%M%S)"

echo "=== BORG BACKUP STARTING: $ARCHIVE_NAME ==="

# Create backup
borg create \
    --remote-path=borg-1.4 \
    --verbose \
    --filter AME \
    --list \
    --stats \
    --show-rc \
    --compression zstd,19 \
    --exclude-caches \
    --exclude '/var/backups/cerniq/postgresql/wal_archive/*' \
    --exclude '/var/lib/docker/overlay2/*' \
    --exclude '/var/lib/docker/containers/*/logs/*' \
    --exclude '*.log' \
    --exclude '*.tmp' \
    --exclude 'node_modules' \
    --exclude '__pycache__' \
    --exclude '.git' \
    "${BORG_REPO}::${ARCHIVE_NAME}" \
    /opt/cerniq \
    /var/backups/cerniq \
    /etc/docker \
    /etc/postgresql \
    /etc/redis \
    /root/.ssh \
    2>&1 | tee -a /var/log/cerniq/borg_backup.log

# Prune old backups
echo "=== PRUNING OLD BACKUPS ==="
borg prune \
    --remote-path=borg-1.4 \
    --list \
    --show-rc \
    --keep-daily=7 \
    --keep-weekly=4 \
    --keep-monthly=6 \
    --keep-yearly=10 \
    "$BORG_REPO"

# Compact repository (remove deleted data)
borg compact \
    --remote-path=borg-1.4 \
    "$BORG_REPO"

# Verify last backup
echo "=== VERIFYING BACKUP ==="
borg check \
    --remote-path=borg-1.4 \
    --last 1 \
    "$BORG_REPO"

echo "=== BORG BACKUP COMPLETED ==="
```

## 7.2 BorgBackup Restore

```bash
#!/bin/bash
# /usr/local/bin/borg_restore.sh
# Restore files from BorgBackup

set -euo pipefail

BORG_REPO="ssh://uXXXXXX@uXXXXXX.your-storagebox.de:23/./backups/borg-repo"
export BORG_PASSPHRASE="$(cat /root/.borg_passphrase)"
export BORG_RSH="ssh -p 23"

# List available archives
list_archives() {
    echo "Available backups:"
    borg list --remote-path=borg-1.4 "$BORG_REPO"
}

# Restore specific archive
restore_archive() {
    ARCHIVE="$1"
    RESTORE_DIR="${2:-/tmp/borg_restore}"
    
    mkdir -p "$RESTORE_DIR"
    cd "$RESTORE_DIR"
    
    echo "Restoring $ARCHIVE to $RESTORE_DIR..."
    borg extract \
        --remote-path=borg-1.4 \
        --verbose \
        "${BORG_REPO}::${ARCHIVE}"
    
    echo "Restore completed to: $RESTORE_DIR"
}

# Restore specific path from archive
restore_path() {
    ARCHIVE="$1"
    PATH_TO_RESTORE="$2"
    RESTORE_DIR="${3:-/tmp/borg_restore}"
    
    mkdir -p "$RESTORE_DIR"
    cd "$RESTORE_DIR"
    
    echo "Restoring $PATH_TO_RESTORE from $ARCHIVE..."
    borg extract \
        --remote-path=borg-1.4 \
        --verbose \
        "${BORG_REPO}::${ARCHIVE}" \
        "$PATH_TO_RESTORE"
    
    echo "Restore completed to: $RESTORE_DIR"
}

# Mount archive for browsing
mount_archive() {
    ARCHIVE="$1"
    MOUNT_POINT="${2:-/mnt/borg}"
    
    mkdir -p "$MOUNT_POINT"
    borg mount \
        --remote-path=borg-1.4 \
        "${BORG_REPO}::${ARCHIVE}" \
        "$MOUNT_POINT"
    
    echo "Archive mounted at: $MOUNT_POINT"
    echo "Use 'borg umount $MOUNT_POINT' when done"
}

# Main
case "${1:-help}" in
    list)
        list_archives
        ;;
    restore)
        restore_archive "$2" "${3:-}"
        ;;
    restore-path)
        restore_path "$2" "$3" "${4:-}"
        ;;
    mount)
        mount_archive "$2" "${3:-}"
        ;;
    *)
        echo "Usage: $0 {list|restore <archive> [dest]|restore-path <archive> <path> [dest]|mount <archive> [mountpoint]}"
        ;;
esac
```

---

## 8. Hetzner Storage Box Configuration

## 8.1 Setup SSH Access

```bash
#!/bin/bash
# /usr/local/bin/setup_hetzner_storagebox.sh
# Configure SSH access to Hetzner Storage Box

set -euo pipefail

STORAGE_BOX_USER="uXXXXXX"
STORAGE_BOX_HOST="${STORAGE_BOX_USER}.your-storagebox.de"

# Generate SSH key if not exists
if [[ ! -f ~/.ssh/id_ed25519_storagebox ]]; then
    ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_storagebox -N "" -C "cerniq-backup@$(hostname)"
fi

# Add to SSH config
cat >> ~/.ssh/config << EOF

Host storagebox
    HostName ${STORAGE_BOX_HOST}
    User ${STORAGE_BOX_USER}
    Port 23
    IdentityFile ~/.ssh/id_ed25519_storagebox
    StrictHostKeyChecking accept-new
EOF

# Upload public key (manual step required via SFTP or Hetzner Robot)
echo "=== MANUAL STEP REQUIRED ==="
echo "1. Copy this public key:"
cat ~/.ssh/id_ed25519_storagebox.pub
echo ""
echo "2. Add to Storage Box via:"
echo "   - Hetzner Robot > Storage Box > SSH Keys, OR"
echo "   - SFTP: put key in .ssh/authorized_keys"
echo ""
echo "3. Enable SSH access in Hetzner Robot"
```

## 8.2 Directory Structure

```bash
#!/bin/bash
# /usr/local/bin/setup_storagebox_dirs.sh
# Create backup directory structure on Hetzner Storage Box

STORAGE_BOX="uXXXXXX@uXXXXXX.your-storagebox.de"

ssh -p 23 "$STORAGE_BOX" << 'EOF'
mkdir -p backups/postgresql/wal_archive
mkdir -p backups/postgresql/basebackups
mkdir -p backups/postgresql/daily_dumps
mkdir -p backups/redis/hourly
mkdir -p backups/redis/aof
mkdir -p backups/configs
mkdir -p backups/borg-repo
echo "Directory structure created!"
ls -la backups/
EOF
```

## 8.3 Storage Box Monitoring

```bash
#!/bin/bash
# /usr/local/bin/check_storagebox_space.sh
# Monitor Storage Box disk usage

STORAGE_BOX="uXXXXXX@uXXXXXX.your-storagebox.de"
THRESHOLD_PERCENT=80

USAGE=$(ssh -p 23 "$STORAGE_BOX" df -h . | tail -1 | awk '{print $5}' | tr -d '%')

if [[ $USAGE -gt $THRESHOLD_PERCENT ]]; then
    echo "WARNING: Storage Box usage at ${USAGE}% (threshold: ${THRESHOLD_PERCENT}%)"
    # Send alert (integrate with your alerting system)
    # curl -X POST "https://alerts.cerniq.app/webhook" -d "message=Storage Box usage critical: ${USAGE}%"
fi

echo "Storage Box usage: ${USAGE}%"
```

---

## 9. Retention Policies

## 9.1 Policy Overview

Policile de retenție sunt aliniate cu cerințele legale românești și Master Spec v1.2.

| Categorie | Retenție | Bază Legală | Implementare |
| --------- | -------- | ----------- | ------------ |
| **Financial Data** | 10 ani | Legea 82/1991 (contabilitate) | Borg yearly + archive |
| **e-Factura** | 10 ani | ANAF requirements | Borg yearly |
| **Approval Decisions** | 7 ani | Business records | Borg + archive |
| **Communication Logs** | 2 ani | Business operations | Borg monthly |
| **PII Containing** | 3 ani | GDPR consent + legal | Auto-anonymize |
| **Access Logs** | 1 an | Security/GDPR Art.6(1)(f) | Rotate + archive |
| **WAL Archives** | 30 zile | Operational PITR | Auto-prune |
| **RDB Snapshots** | 7 zile local, 30 zile remote | Operational | Auto-prune |

## 9.2 Cleanup Scripts

### PostgreSQL WAL Cleanup

```bash
#!/bin/bash
# /usr/local/bin/cleanup_wal_archive.sh
# Cleanup old WAL files based on oldest needed backup

WAL_ARCHIVE="/var/backups/cerniq/postgresql/wal_archive"
BASEBACKUP_DIR="/var/backups/cerniq/postgresql/basebackups"
RETENTION_DAYS=30

# Find oldest base backup we want to keep
OLDEST_BACKUP=$(ls -td "$BASEBACKUP_DIR"/base_* | tail -1)

if [[ -n "$OLDEST_BACKUP" && -f "$OLDEST_BACKUP/backup_manifest" ]]; then
    # Get start WAL from manifest
    START_WAL=$(grep -oP 'Start-WAL:\s+\K[0-9A-F]+' "$OLDEST_BACKUP/backup_manifest" || echo "")
    
    if [[ -n "$START_WAL" ]]; then
        echo "Keeping WAL files from: $START_WAL"
        # Remove older WAL files
        for WAL_FILE in "$WAL_ARCHIVE"/*.zst; do
            WAL_NAME=$(basename "$WAL_FILE" .zst)
            if [[ "$WAL_NAME" < "$START_WAL" ]]; then
                echo "Removing old WAL: $WAL_FILE"
                rm "$WAL_FILE"
            fi
        done
    fi
fi

# Also remove any WAL older than retention period
find "$WAL_ARCHIVE" -name "*.zst" -mtime +$RETENTION_DAYS -delete
```

### Redis Backup Cleanup

```bash
#!/bin/bash
# /usr/local/bin/cleanup_redis_backups.sh
# Cleanup Redis backups based on retention

LOCAL_DIR="/var/backups/cerniq/redis"
REMOTE_HOST="uXXXXXX@uXXXXXX.your-storagebox.de"

# Local: keep 2 days
find "$LOCAL_DIR" -name "redis_*.rdb.zst" -mtime +2 -delete

# Remote: cleanup via SSH
ssh -p 23 "$REMOTE_HOST" << 'EOF'
# Hourly: keep 7 days
find backups/redis/hourly -name "*.rdb.zst" -mtime +7 -delete

# AOF: keep 30 days
find backups/redis/aof -name "*.tar.gz" -mtime +30 -delete
EOF
```

## 9.3 GDPR Anonymization Integration

Din Master Spec v1.2 Secțiunea 7.7:

```sql
-- Periodic GDPR cleanup (integrate with cron)
DO $$
DECLARE
    policy RECORD;
    rows_affected INTEGER;
BEGIN
    FOR policy IN 
        SELECT category, retention_days 
        FROM audit_retention_policies
        WHERE category = 'pii_containing'
    LOOP
        -- Anonymize old PII data
        UPDATE approval_audit_log
        SET 
            actor_email = 'ANONYMIZED',
            source_ip = '0.0.0.0'::INET,
            user_agent = 'ANONYMIZED'
        WHERE contains_pii = TRUE
            AND event_timestamp < NOW() - (policy.retention_days || ' days')::INTERVAL
            AND actor_email != 'ANONYMIZED';
        
        GET DIAGNOSTICS rows_affected = ROW_COUNT;
        RAISE NOTICE 'Anonymized % PII records older than % days', 
            rows_affected, policy.retention_days;
    END LOOP;
END;
$$;
```

---

## 10. Disaster Recovery Procedures

## 10.1 Scenarii de Disaster

| Scenariu | Severitate | RPO Țintă | RTO Țintă | Procedură |
| -------- | ---------- | --------- | --------- | --------- |
| **Hardware Failure (disk)** | Medium | 1 min | 30 min | Restore from latest backup |
| **Data Corruption** | High | 1 min | 1 hour | PITR to before corruption |
| **Ransomware Attack** | Critical | 1 hour | 4 hours | Restore from immutable offsite |
| **Datacenter Disaster** | Critical | 1 hour | 8 hours | Full rebuild on new server |
| **Accidental Deletion** | Low | 15 min | 30 min | Table-level restore |
| **Database Upgrade Failure** | Medium | 0 | 1 hour | Rollback to pre-upgrade |

## 10.2 Full System Recovery Runbook

```bash
#!/bin/bash
# /usr/local/bin/disaster_recovery_full.sh
# Complete system recovery from Hetzner Storage Box

set -euo pipefail

# Configuration
STORAGE_BOX="uXXXXXX@uXXXXXX.your-storagebox.de"
BORG_REPO="ssh://${STORAGE_BOX}:23/./backups/borg-repo"
export BORG_PASSPHRASE="$(cat /root/.borg_passphrase)"
export BORG_RSH="ssh -p 23"

echo "=============================================="
echo "  CERNIQ.APP DISASTER RECOVERY - FULL SYSTEM"
echo "=============================================="
echo ""
echo "This will restore the ENTIRE system from backups."
echo "Press Ctrl+C within 10 seconds to abort..."
sleep 10

# Step 1: Verify connectivity
echo "=== Step 1: Verifying Storage Box connectivity ==="
ssh -p 23 "$STORAGE_BOX" "ls backups/" || {
    echo "ERROR: Cannot connect to Storage Box!"
    exit 1
}

# Step 2: List available backups
echo "=== Step 2: Available backups ==="
borg list --remote-path=borg-1.4 "$BORG_REPO" | head -20

read -p "Enter archive name to restore (or 'latest'): " ARCHIVE_NAME

if [[ "$ARCHIVE_NAME" == "latest" ]]; then
    ARCHIVE_NAME=$(borg list --remote-path=borg-1.4 --last 1 --short "$BORG_REPO")
fi

echo "Restoring from: $ARCHIVE_NAME"

# Step 3: Stop all services
echo "=== Step 3: Stopping services ==="
systemctl stop docker
systemctl stop postgresql
systemctl stop redis

# Step 4: Restore application configs
echo "=== Step 4: Restoring application configs ==="
cd /
borg extract \
    --remote-path=borg-1.4 \
    "${BORG_REPO}::${ARCHIVE_NAME}" \
    opt/cerniq \
    etc/docker \
    etc/postgresql \
    etc/redis

# Step 5: Restore PostgreSQL
echo "=== Step 5: Restoring PostgreSQL ==="

# Get latest base backup
LATEST_BASE=$(ssh -p 23 "$STORAGE_BOX" "ls -td backups/postgresql/basebackups/base_* | head -1")

# Download and restore
mkdir -p /tmp/pg_restore
rsync -avz --progress -e 'ssh -p23' \
    "${STORAGE_BOX}:${LATEST_BASE}/" \
    /tmp/pg_restore/

# Restore using PITR script
/usr/local/bin/pg_pitr_restore.sh "" "/tmp/pg_restore"

# Step 6: Restore Redis
echo "=== Step 6: Restoring Redis ==="

# Get latest RDB
LATEST_RDB=$(ssh -p 23 "$STORAGE_BOX" "ls -t backups/redis/hourly/*.rdb.zst | head -1")
rsync -avz -e 'ssh -p23' \
    "${STORAGE_BOX}:${LATEST_RDB}" \
    /tmp/redis_restore.rdb.zst

/usr/local/bin/redis_restore.sh /tmp/redis_restore.rdb.zst rdb

# Step 7: Start services
echo "=== Step 7: Starting services ==="
systemctl start postgresql
systemctl start redis
systemctl start docker

# Step 8: Verify
echo "=== Step 8: Verification ==="
sleep 10

# Check PostgreSQL
psql -h /var/run/postgresql -U postgres -c "SELECT current_timestamp, pg_is_in_recovery();"

# Check Redis
redis-cli PING

# Check Docker
docker ps

echo "=============================================="
echo "  DISASTER RECOVERY COMPLETE"
echo "=============================================="
echo ""
echo "Next steps:"
echo "1. Verify application functionality"
echo "2. Check for any data gaps"
echo "3. Update DNS/load balancer if needed"
echo "4. Document incident and recovery"
```

## 10.3 Selective Table Recovery

```bash
#!/bin/bash
# /usr/local/bin/restore_table.sh
# Restore specific table from backup

set -euo pipefail

TABLE_NAME="${1:-}"
TIMESTAMP="${2:-}"  # Format: YYYYMMDD_HHMMSS or 'latest'

if [[ -z "$TABLE_NAME" ]]; then
    echo "Usage: $0 <table_name> [timestamp|latest]"
    echo "Example: $0 approval_tasks latest"
    exit 1
fi

BACKUP_DIR="/var/backups/cerniq/postgresql"

# Find backup
if [[ "$TIMESTAMP" == "latest" || -z "$TIMESTAMP" ]]; then
    BACKUP_FILE=$(ls -t "$BACKUP_DIR/critical/${TABLE_NAME}_"*.dump 2>/dev/null | head -1)
else
    BACKUP_FILE="$BACKUP_DIR/critical/${TABLE_NAME}_${TIMESTAMP}.dump"
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "ERROR: Backup not found: $BACKUP_FILE"
    echo "Available backups for $TABLE_NAME:"
    ls -la "$BACKUP_DIR/critical/${TABLE_NAME}_"*.dump 2>/dev/null || echo "None found"
    exit 1
fi

echo "Restoring $TABLE_NAME from: $BACKUP_FILE"

# Create temporary table
TEMP_TABLE="${TABLE_NAME}_restored_$(date +%s)"

pg_restore \
    -h /var/run/postgresql \
    -U postgres \
    -d cerniq_production \
    --data-only \
    --table="$TABLE_NAME" \
    --no-owner \
    "$BACKUP_FILE"

echo "Table $TABLE_NAME restored successfully!"
echo ""
echo "IMPORTANT: Verify data integrity before proceeding."
echo "The original table has been preserved."
```

---

## 11. Monitoring & Alerting

## 11.1 Backup Health Checks

```bash
#!/bin/bash
# /usr/local/bin/backup_health_check.sh
# Comprehensive backup health monitoring

set -euo pipefail

ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"
ISSUES=()

check_issue() {
    if [[ $? -ne 0 ]]; then
        ISSUES+=("$1")
    fi
}

echo "=== Backup Health Check: $(date) ==="

# Check 1: PostgreSQL WAL archiving
echo -n "PostgreSQL WAL archiving: "
LAST_WAL=$(ls -t /var/backups/cerniq/postgresql/wal_archive/*.zst 2>/dev/null | head -1)
if [[ -n "$LAST_WAL" ]]; then
    WAL_AGE=$(( $(date +%s) - $(stat -c %Y "$LAST_WAL") ))
    if [[ $WAL_AGE -gt 300 ]]; then
        echo "WARNING - Last WAL ${WAL_AGE}s ago (threshold: 300s)"
        ISSUES+=("WAL archiving lag: ${WAL_AGE}s")
    else
        echo "OK (${WAL_AGE}s ago)"
    fi
else
    echo "ERROR - No WAL files found"
    ISSUES+=("No WAL archive files found")
fi

# Check 2: Latest pg_dump
echo -n "PostgreSQL daily dump: "
LAST_DUMP=$(ls -t /var/backups/cerniq/postgresql/daily_dumps/cluster_*.sql.zst 2>/dev/null | head -1)
if [[ -n "$LAST_DUMP" ]]; then
    DUMP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LAST_DUMP")) / 3600 ))
    if [[ $DUMP_AGE -gt 25 ]]; then
        echo "WARNING - Last dump ${DUMP_AGE}h ago"
        ISSUES+=("pg_dump older than 25 hours")
    else
        echo "OK (${DUMP_AGE}h ago)"
    fi
else
    echo "ERROR - No dumps found"
    ISSUES+=("No pg_dump files found")
fi

# Check 3: Redis backup
echo -n "Redis backup: "
LAST_REDIS=$(ls -t /var/backups/cerniq/redis/*.rdb.zst 2>/dev/null | head -1)
if [[ -n "$LAST_REDIS" ]]; then
    REDIS_AGE=$(( ($(date +%s) - $(stat -c %Y "$LAST_REDIS")) / 3600 ))
    if [[ $REDIS_AGE -gt 2 ]]; then
        echo "WARNING - Last backup ${REDIS_AGE}h ago"
        ISSUES+=("Redis backup older than 2 hours")
    else
        echo "OK (${REDIS_AGE}h ago)"
    fi
else
    echo "ERROR - No Redis backups found"
    ISSUES+=("No Redis backup files found")
fi

# Check 4: BorgBackup
echo -n "BorgBackup: "
BORG_REPO="ssh://uXXXXXX@uXXXXXX.your-storagebox.de:23/./backups/borg-repo"
export BORG_PASSPHRASE="$(cat /root/.borg_passphrase 2>/dev/null || echo '')"
export BORG_RSH="ssh -p 23"

if borg info --remote-path=borg-1.4 "$BORG_REPO" > /dev/null 2>&1; then
    LAST_BORG=$(borg list --remote-path=borg-1.4 --last 1 --format '{time}' "$BORG_REPO" 2>/dev/null)
    echo "OK (last: $LAST_BORG)"
else
    echo "ERROR - Cannot access Borg repository"
    ISSUES+=("BorgBackup repository inaccessible")
fi

# Check 5: Storage Box connectivity
echo -n "Hetzner Storage Box: "
if ssh -p 23 -o ConnectTimeout=5 uXXXXXX@uXXXXXX.your-storagebox.de "echo ok" > /dev/null 2>&1; then
    echo "OK"
else
    echo "ERROR - Cannot connect"
    ISSUES+=("Storage Box unreachable")
fi

# Check 6: Disk space
echo -n "Local backup disk: "
DISK_USAGE=$(df /var/backups | tail -1 | awk '{print $5}' | tr -d '%')
if [[ $DISK_USAGE -gt 85 ]]; then
    echo "WARNING - ${DISK_USAGE}% used"
    ISSUES+=("Local backup disk at ${DISK_USAGE}%")
else
    echo "OK (${DISK_USAGE}% used)"
fi

# Summary
echo ""
echo "=== Summary ==="
if [[ ${#ISSUES[@]} -eq 0 ]]; then
    echo "All backup systems healthy!"
else
    echo "ISSUES DETECTED (${#ISSUES[@]}):"
    for issue in "${ISSUES[@]}"; do
        echo "  - $issue"
    done
    
    # Send alert if webhook configured
    if [[ -n "$ALERT_WEBHOOK" ]]; then
        curl -s -X POST "$ALERT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"Backup Health Issues: ${ISSUES[*]}\"}"
    fi
    
    exit 1
fi
```

## 11.2 Prometheus Metrics

```yaml
# /opt/cerniq/monitoring/backup_exporter.yml
# Custom backup metrics for Prometheus

scrape_configs:
  - job_name: 'backup_metrics'
    static_configs:
      - targets: ['localhost:9199']
    scrape_interval: 5m
```

```python
#!/usr/bin/env python3
# /opt/cerniq/monitoring/backup_exporter.py
# Prometheus exporter for backup metrics

from prometheus_client import start_http_server, Gauge, Counter
import os
import time
import subprocess
from pathlib import Path

# Metrics
backup_age_seconds = Gauge('backup_age_seconds', 'Age of last backup in seconds', ['type'])
backup_size_bytes = Gauge('backup_size_bytes', 'Size of backup in bytes', ['type'])
backup_success = Gauge('backup_success', 'Last backup success (1=success, 0=failure)', ['type'])
backup_count = Counter('backup_total', 'Total backup operations', ['type', 'status'])

def get_file_age(path_pattern):
    """Get age of most recent file matching pattern"""
    files = sorted(Path('/var/backups/cerniq').glob(path_pattern), 
                   key=os.path.getmtime, reverse=True)
    if files:
        return time.time() - os.path.getmtime(files[0])
    return float('inf')

def collect_metrics():
    """Collect backup metrics"""
    # PostgreSQL WAL
    backup_age_seconds.labels(type='postgresql_wal').set(
        get_file_age('postgresql/wal_archive/*.zst'))
    
    # PostgreSQL dump
    backup_age_seconds.labels(type='postgresql_dump').set(
        get_file_age('postgresql/daily_dumps/cluster_*.sql.zst'))
    
    # Redis
    backup_age_seconds.labels(type='redis_rdb').set(
        get_file_age('redis/*.rdb.zst'))

if __name__ == '__main__':
    start_http_server(9199)
    while True:
        collect_metrics()
        time.sleep(60)
```

## 11.3 Alert Rules

```yaml
# /opt/cerniq/monitoring/alerts/backup_alerts.yml
# Prometheus alerting rules for backups

groups:
  - name: backup_alerts
    rules:
      - alert: BackupWALArchivingLag
        expr: backup_age_seconds{type="postgresql_wal"} > 300
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL WAL archiving lag"
          description: "WAL archiving is {{ $value }}s behind (threshold: 300s)"

      - alert: BackupPostgreSQLDumpOld
        expr: backup_age_seconds{type="postgresql_dump"} > 90000  # 25 hours
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL daily dump is old"
          description: "Last dump was {{ $value | humanizeDuration }} ago"

      - alert: BackupRedisOld
        expr: backup_age_seconds{type="redis_rdb"} > 7200  # 2 hours
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis backup is old"
          description: "Last Redis backup was {{ $value | humanizeDuration }} ago"

      - alert: BackupStorageBoxUnreachable
        expr: probe_success{job="storagebox_probe"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Hetzner Storage Box unreachable"
          description: "Cannot connect to offsite backup storage"

      - alert: BackupDiskSpaceLow
        expr: (node_filesystem_avail_bytes{mountpoint="/var/backups"} / node_filesystem_size_bytes{mountpoint="/var/backups"}) * 100 < 15
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Backup disk space low"
          description: "Only {{ $value }}% space remaining on backup disk"
```

---

## 12. Testing & Validation

## 12.1 Automated Restore Testing

```bash
#!/bin/bash
# /usr/local/bin/backup_restore_test.sh
# Weekly automated restore testing

set -euo pipefail

TEST_DIR="/tmp/backup_restore_test_$(date +%s)"
REPORT_FILE="/var/log/cerniq/restore_test_$(date +%Y%m%d).log"
ISSUES=()

mkdir -p "$TEST_DIR"
exec > >(tee -a "$REPORT_FILE") 2>&1

echo "=============================================="
echo "  BACKUP RESTORE TEST: $(date)"
echo "=============================================="

# Test 1: PostgreSQL pg_dump restore
echo ""
echo "=== Test 1: PostgreSQL pg_dump restore ==="
LATEST_DUMP=$(ls -t /var/backups/cerniq/postgresql/daily_dumps/cerniq_production_* 2>/dev/null | head -1)

if [[ -n "$LATEST_DUMP" ]]; then
    echo "Testing restore from: $LATEST_DUMP"
    
    # Create test database
    psql -h /var/run/postgresql -U postgres -c "DROP DATABASE IF EXISTS restore_test;"
    psql -h /var/run/postgresql -U postgres -c "CREATE DATABASE restore_test;"
    
    # Restore
    START_TIME=$(date +%s)
    pg_restore \
        -h /var/run/postgresql \
        -U postgres \
        -d restore_test \
        --jobs=4 \
        --no-owner \
        "$LATEST_DUMP" 2>&1 || true
    END_TIME=$(date +%s)
    
    DURATION=$((END_TIME - START_TIME))
    
    # Verify
    TABLE_COUNT=$(psql -h /var/run/postgresql -U postgres -d restore_test -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
    
    echo "Restore completed in ${DURATION}s"
    echo "Tables restored: $TABLE_COUNT"
    
    if [[ $TABLE_COUNT -lt 10 ]]; then
        ISSUES+=("PostgreSQL restore: only $TABLE_COUNT tables")
    fi
    
    # Cleanup
    psql -h /var/run/postgresql -U postgres -c "DROP DATABASE restore_test;"
else
    echo "ERROR: No dump file found"
    ISSUES+=("No PostgreSQL dump file for testing")
fi

# Test 2: Redis RDB restore
echo ""
echo "=== Test 2: Redis RDB restore ==="
LATEST_RDB=$(ls -t /var/backups/cerniq/redis/*.rdb.zst 2>/dev/null | head -1)

if [[ -n "$LATEST_RDB" ]]; then
    echo "Testing restore from: $LATEST_RDB"
    
    # Decompress to test dir
    zstd -d -q "$LATEST_RDB" -o "$TEST_DIR/dump.rdb"
    
    # Validate RDB
    if redis-check-rdb "$TEST_DIR/dump.rdb" > /dev/null 2>&1; then
        echo "RDB validation: PASSED"
    else
        echo "RDB validation: FAILED"
        ISSUES+=("Redis RDB validation failed")
    fi
else
    echo "ERROR: No RDB file found"
    ISSUES+=("No Redis RDB file for testing")
fi

# Test 3: BorgBackup restore
echo ""
echo "=== Test 3: BorgBackup restore ==="
BORG_REPO="ssh://uXXXXXX@uXXXXXX.your-storagebox.de:23/./backups/borg-repo"
export BORG_PASSPHRASE="$(cat /root/.borg_passphrase)"
export BORG_RSH="ssh -p 23"

LATEST_ARCHIVE=$(borg list --remote-path=borg-1.4 --last 1 --short "$BORG_REPO" 2>/dev/null)

if [[ -n "$LATEST_ARCHIVE" ]]; then
    echo "Testing extract from: $LATEST_ARCHIVE"
    
    # Extract small subset
    mkdir -p "$TEST_DIR/borg"
    cd "$TEST_DIR/borg"
    
    START_TIME=$(date +%s)
    borg extract \
        --remote-path=borg-1.4 \
        "${BORG_REPO}::${LATEST_ARCHIVE}" \
        opt/cerniq 2>&1 || true
    END_TIME=$(date +%s)
    
    DURATION=$((END_TIME - START_TIME))
    FILE_COUNT=$(find . -type f | wc -l)
    
    echo "Extract completed in ${DURATION}s"
    echo "Files extracted: $FILE_COUNT"
    
    if [[ $FILE_COUNT -lt 10 ]]; then
        ISSUES+=("BorgBackup: only $FILE_COUNT files extracted")
    fi
else
    echo "ERROR: No Borg archive found"
    ISSUES+=("No BorgBackup archive for testing")
fi

# Cleanup
rm -rf "$TEST_DIR"

# Summary
echo ""
echo "=============================================="
echo "  TEST SUMMARY"
echo "=============================================="

if [[ ${#ISSUES[@]} -eq 0 ]]; then
    echo "All restore tests PASSED!"
    echo "Estimated RTO based on tests: < 1 hour"
else
    echo "ISSUES DETECTED (${#ISSUES[@]}):"
    for issue in "${ISSUES[@]}"; do
        echo "  - $issue"
    done
    exit 1
fi
```

## 12.2 Test Schedule

| Test | Frecvență | Automatizat | Responsabil |
| ---- | --------- | ----------- | ----------- |
| WAL archiving integrity | Zilnic | Da | Cron |
| pg_dump restore (test DB) | Săptămânal | Da | Cron |
| Redis RDB validation | Zilnic | Da | Cron |
| BorgBackup extract | Săptămânal | Da | Cron |
| Full PITR recovery | Lunar | Parțial | DevOps |
| Complete DR drill | Trimestrial | Nu | Team |

## 12.3 DR Drill Checklist

```markdown
# Disaster Recovery Drill Checklist

## Pre-Drill (24h before)
- [ ] Notify stakeholders of maintenance window
- [ ] Ensure test environment available
- [ ] Verify backup integrity
- [ ] Document current system state

## During Drill
- [ ] Simulate disaster scenario
- [ ] Execute recovery runbook
- [ ] Measure actual RTO
- [ ] Verify RPO met (check data loss)
- [ ] Test all critical functions:
  - [ ] e-Factura submission
  - [ ] HITL approvals
  - [ ] BullMQ job processing
  - [ ] API endpoints
  - [ ] Web application

## Post-Drill
- [ ] Document lessons learned
- [ ] Update runbooks if needed
- [ ] Report RTO/RPO achieved vs targets
- [ ] Create action items for gaps
- [ ] Store drill report (7 years per Master Spec)
```

---

## 13. Compliance & Audit

## 13.1 Legal Requirements

| Regulament | Cerință | Implementare |
| ---------- | ------- | ------------ |
| **GDPR Art. 32** | Measures to restore availability | PITR + offsite backups |
| **GDPR Art. 5(1)(e)** | Storage limitation | Retention policies |
| **Legea 82/1991** | 10 ani date contabile | BorgBackup yearly retention |
| **ANAF e-Factura** | 10 ani arhivare facturi | Encrypted offsite storage |
| **Legea 190/2018** | Audit trail measures | Hash chain in audit_log |

## 13.2 Audit Log Requirements

Din Master Spec v1.2 Secțiunea 7.5 (Hash Chain):

```sql
-- Toate operațiunile de backup sunt logate
CREATE TABLE backup_audit_log (
    id BIGSERIAL PRIMARY KEY,
    backup_type TEXT NOT NULL,          -- 'wal', 'basebackup', 'pg_dump', 'redis', 'borg'
    operation TEXT NOT NULL,            -- 'create', 'transfer', 'verify', 'restore', 'delete'
    status TEXT NOT NULL,               -- 'success', 'failure', 'in_progress'
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    source_path TEXT,
    destination_path TEXT,
    size_bytes BIGINT,
    checksum TEXT,                      -- SHA256 of backup file
    duration_seconds INTEGER,
    error_message TEXT,
    previous_hash TEXT,
    event_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger pentru hash chain (similar cu approval_audit_log)
CREATE TRIGGER backup_audit_hash
    BEFORE INSERT ON backup_audit_log
    FOR EACH ROW EXECUTE FUNCTION compute_audit_hash();

CREATE INDEX idx_backup_audit_type ON backup_audit_log(backup_type, created_at);
CREATE INDEX idx_backup_audit_status ON backup_audit_log(status, created_at);
```

## 13.3 Compliance Reporting

```bash
#!/bin/bash
# /usr/local/bin/backup_compliance_report.sh
# Generate monthly compliance report

REPORT_FILE="/var/log/cerniq/compliance/backup_report_$(date +%Y%m).md"
mkdir -p "$(dirname "$REPORT_FILE")"

cat > "$REPORT_FILE" << EOF
# Backup Compliance Report - $(date +%B\ %Y)

Generated: $(date -Iseconds)
System: Cerniq.app Production

## Executive Summary

### Backup Statistics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
EOF

# Calculate statistics from logs
WAL_COUNT=$(ls /var/backups/cerniq/postgresql/wal_archive/*.zst 2>/dev/null | wc -l)
DUMP_COUNT=$(ls /var/backups/cerniq/postgresql/daily_dumps/cluster_*.sql.zst 2>/dev/null | wc -l)
BORG_COUNT=$(borg list --remote-path=borg-1.4 "$BORG_REPO" 2>/dev/null | wc -l)

cat >> "$REPORT_FILE" << EOF
| WAL Archives | $WAL_COUNT | Continuous | ✅ |
| Daily Dumps | $DUMP_COUNT | 30/month | $([ $DUMP_COUNT -ge 28 ] && echo "✅" || echo "⚠️") |
| Borg Archives | $BORG_COUNT | 30/month | $([ $BORG_COUNT -ge 28 ] && echo "✅" || echo "⚠️") |

## Retention Compliance

| Category | Required | Actual | Compliant |
|----------|----------|--------|-----------|
| Financial Data | 10 years | $(borg list --remote-path=borg-1.4 "$BORG_REPO" | head -1 | cut -d' ' -f1) - present | ✅ |
| Audit Logs | 7 years | As above | ✅ |
| WAL Archives | 30 days | 30 days | ✅ |

## Restore Tests

$(cat /var/log/cerniq/restore_test_*.log 2>/dev/null | tail -50)

## Incidents

$(grep -i "error\|fail" /var/log/cerniq/backup*.log 2>/dev/null | tail -20 || echo "No incidents this period")

---
Report generated automatically. Store for 7 years per Master Spec v1.2.
EOF

echo "Compliance report generated: $REPORT_FILE"
```

---

## 14. Scripts & Automation

## 14.1 Cron Schedule

```cron
# /etc/cron.d/cerniq-backup
# Cerniq.app Backup Automation Schedule

SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
MAILTO=ops@cerniq.app

# PostgreSQL
* * * * *     root /usr/local/bin/pg_dump_critical.sh >> /var/log/cerniq/critical_backup.log 2>&1
0 2 * * *     root /usr/local/bin/pg_dump_daily.sh >> /var/log/cerniq/pg_dump.log 2>&1
0 3 * * 0     root /usr/local/bin/pg_basebackup_weekly.sh >> /var/log/cerniq/basebackup.log 2>&1

# Redis
0 * * * *     root /usr/local/bin/redis_backup_hourly.sh >> /var/log/cerniq/redis_backup.log 2>&1
0 4 * * *     root /usr/local/bin/redis_backup_aof.sh >> /var/log/cerniq/redis_aof.log 2>&1

# BorgBackup
0 5 * * *     root /usr/local/bin/borg_backup_daily.sh >> /var/log/cerniq/borg_backup.log 2>&1

# Cleanup
0 6 * * *     root /usr/local/bin/cleanup_wal_archive.sh >> /var/log/cerniq/cleanup.log 2>&1
0 6 * * *     root /usr/local/bin/cleanup_redis_backups.sh >> /var/log/cerniq/cleanup.log 2>&1

# Monitoring
*/5 * * * *   root /usr/local/bin/backup_health_check.sh >> /var/log/cerniq/health_check.log 2>&1

# Testing
0 7 * * 0     root /usr/local/bin/backup_restore_test.sh >> /var/log/cerniq/restore_test.log 2>&1

# Compliance
0 8 1 * *     root /usr/local/bin/backup_compliance_report.sh >> /var/log/cerniq/compliance.log 2>&1
```

## 14.2 Systemd Services

```ini
# /etc/systemd/system/backup-health.timer
[Unit]
Description=Backup Health Check Timer

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/backup-health.service
[Unit]
Description=Backup Health Check
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup_health_check.sh
StandardOutput=append:/var/log/cerniq/health_check.log
StandardError=append:/var/log/cerniq/health_check.log

[Install]
WantedBy=multi-user.target
```

## 14.3 Logrotate Configuration

```conf
# /etc/logrotate.d/cerniq-backup
/var/log/cerniq/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 640 root root
    sharedscripts
    postrotate
        # Signal any log-watching processes
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
```

---

## 15. Checklist & Runbooks

## 15.1 Daily Operations Checklist

```markdown
# Daily Backup Verification Checklist

## Morning Check (09:00)
- [ ] Review backup_health_check output
- [ ] Verify WAL archiving current (< 5 min lag)
- [ ] Confirm pg_dump from last night succeeded
- [ ] Check Redis backup exists from last hour
- [ ] Verify Storage Box connectivity
- [ ] Check disk space on backup volumes

## Alerts to Watch
- [ ] No critical alerts in monitoring dashboard
- [ ] No failed backup jobs in cron logs
- [ ] Email notifications empty or acknowledged

## Weekly Tasks (Monday)
- [ ] Review restore test results from Sunday
- [ ] Check BorgBackup prune completed
- [ ] Verify basebackup from weekend exists
- [ ] Update documentation if changes made
```

## 15.2 Emergency Contact List

| Role | Contact | When to Call |
| ---- | ------- | ------------ |
| Primary DBA | +40 XXX XXX XXX | Any DB issue |
| Backup Admin | +40 XXX XXX XXX | Backup failures |
| Hetzner Support | Robot ticket | Storage Box issues |
| Management | +40 XXX XXX XXX | Data loss > 1 hour |

## 15.3 Quick Reference Card

```text
╔══════════════════════════════════════════════════════════════════════════╗
║                 CERNIQ BACKUP QUICK REFERENCE                            ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  LOCATIONS                                                               ║
║  ─────────                                                               ║
║  Local staging:  /var/backups/cerniq/                                    ║
║  Storage Box:    ssh -p23 uXXXXXX@uXXXXXX.your-storagebox.de             ║
║  Borg repo:      ssh://uXXXXXX@...:23/./backups/borg-repo                ║
║                                                                          ║
║  QUICK COMMANDS                                                          ║
║  ──────────────                                                          ║
║  Check backup health:    /usr/local/bin/backup_health_check.sh           ║
║  List Borg archives:     /usr/local/bin/borg_restore.sh list             ║
║  Restore table:          /usr/local/bin/restore_table.sh <table>         ║
║  PITR restore:           /usr/local/bin/pg_pitr_restore.sh <time>        ║
║  Redis restore:          /usr/local/bin/redis_restore.sh <file> rdb      ║
║  Full DR:                /usr/local/bin/disaster_recovery_full.sh        ║
║                                                                          ║
║  RPO/RTO TARGETS                                                         ║
║  ───────────────                                                         ║
║  Tier 1 (Critical): RPO 1min,  RTO 15min                                 ║
║  Tier 2 (Important): RPO 15min, RTO 1hr                                  ║
║  Tier 3 (Standard): RPO 1hr,   RTO 4hr                                   ║
║                                                                          ║
║  BORG PASSPHRASE: /root/.borg_passphrase                                 ║
║  (NEVER share, store offline copy in safe)                               ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## Appendix A: Version History

| Versiune | Data | Autor | Modificări |
| -------- | ---- | ----- | ---------- |
| 1.0 | 12 Jan 2026 | Claude | Versiune inițială |

## Appendix B: Related Documents

| Document | Locație | Relație |
| -------- | ------- | ------- |
| Master Spec v1.2 | `/mnt/project/__Cerniq_Master_Spec_Normativ_Complet.md` | Sursă de adevăr |
| Docker Infrastructure | `/mnt/project/__Docker_Infrastructure_Technical_Reference.rtf` | Configurare server |
| arc42 Architecture | `Cerniq_App_Architecture_arc42_Vertical_Slice.md` | Vedere de ansamblu |
| coding-standards.md | `/mnt/project/coding-standards.md` | Standarde dezvoltare |

---

**Document Status:** NORMATIV - Parte din documentația operațională Cerniq.app  
**Review Schedule:** Trimestrial sau după incidente majore  
**Owner:** DevOps / 1-Person-Team
