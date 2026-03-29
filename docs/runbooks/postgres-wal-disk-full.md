# Runbook: PostgreSQL CT107 — WAL Accumulation / Disk Full

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Version      | 1.0.0                              |
| Last Updated | 2026-03-25                         |
| Host         | CT107 — 10.0.1.107:5432            |
| PostgreSQL   | 18 (native, NOT Docker)            |
| Backup tool  | pgbackrest stanza=main             |
| Severity     | CRITICAL — causes full DB outage   |

---

## Incident Summary (2026-03-25)

**What happened**: PostgreSQL 18 on CT107 crashed at 18:46 UTC because the 216GB disk
reached 100% capacity. `pg_wal/` grew to 186GB (19,821 × 16MB WAL segments).

**Root cause**: Deadlock storms in `neanelu_shopify_dev` + heavy contention on
`zitadel.current_states` table generated ~46GB WAL/hour over 4 hours. PostgreSQL was
recycling WAL normally (checkpoints every ~5min) but the write rate exceeded the recycling
rate, causing WAL to accumulate.

**All WAL files were archived** to pgbackrest before the crash (all had `.done` status in
`pg_wal/archive_status/`). No data was lost.

---

## Symptoms

- `pnpm db:migrate` fails with `ECONNREFUSED 10.0.1.107:5432`
- `nc -zv 10.0.1.107 5432` → `Connection refused`
- `ssh root@10.0.1.107 pg_lsclusters` → `Status: down`
- `df -h /var/lib/postgresql/` → `100% / 0 avail`

---

## Recovery Procedure

**Estimated RTO**: 5–10 minutes once root cause is confirmed.

### Step 1 — Verify root cause

```bash
ssh root@10.0.1.107
pg_lsclusters
df -h /var/lib/postgresql/
du -sh /var/lib/postgresql/18/main/pg_wal/
```

Expected: `Status: down`, disk `100%`, `pg_wal/` >100GB.

### Step 2 — Find the REDO WAL file (crash-safe starting point)

```bash
sudo -u postgres /usr/lib/postgresql/18/bin/pg_controldata \
  /var/lib/postgresql/18/main | grep "REDO WAL file"
```

Note the value, e.g. `0000000100000301000000B7`. This is the **oldest WAL file PostgreSQL
needs** to perform crash recovery.

### Step 3 — Verify all WAL before REDO file is archived

```bash
pgbackrest --stanza=main info 2>&1 | grep "wal archive"
ls /var/lib/postgresql/18/main/pg_wal/archive_status/ | wc -l
```

Expected: pgbackrest shows a WAL archive range. All files in `archive_status/` should be
`.done` (not `.ready`). If `.ready` files exist, wait for archiving to complete before
proceeding (PostgreSQL must be running for that — see emergency workaround below).

### Step 4 — Dry run pg_archivecleanup

```bash
sudo -u postgres /usr/lib/postgresql/18/bin/pg_archivecleanup -n \
  /var/lib/postgresql/18/main/pg_wal \
  <REDO_WAL_FILE_FROM_STEP_2> 2>&1 | wc -l
```

Output = number of files that WILL be deleted. Verify it's >1000 (makes sense for large
accumulation). The files being deleted are ALL archived (`.done`) — safe to remove.

### Step 5 — Execute cleanup

```bash
sudo -u postgres /usr/lib/postgresql/18/bin/pg_archivecleanup \
  /var/lib/postgresql/18/main/pg_wal \
  <REDO_WAL_FILE_FROM_STEP_2>
df -h /var/lib/postgresql/
```

Expected: disk usage drops significantly (e.g. from 100% to ~15%).

### Step 6 — Start PostgreSQL

```bash
systemctl start postgresql@18-main
sleep 8
pg_lsclusters
ss -tlnp | grep 5432
```

Expected: `Status: online`, listening on `0.0.0.0:5432`.

### Step 7 — Verify connectivity and run migrations

From the orchestrator (10.0.1.6):

```bash
nc -zv 10.0.1.107 5432
cd /var/www/CerniqAPP
pnpm db:migrate
```

Expected: migration runs to completion with `Done.`.

---

## Emergency Workaround: `.ready` files present (unarchived WAL)

If `ls pg_wal/archive_status/*.ready | wc -l` > 0, PostgreSQL crashed before finishing
archiving. Options:

1. **Preferred**: Free 2GB+ of space by removing old log files or temp files first:

   ```bash
   # Remove old compressed postgres logs (already rotated)
   rm /var/log/postgresql/postgresql-18-main.log.{3..7}.gz
   journalctl --vacuum-size=50M
   ```

   Then start PostgreSQL briefly to let it archive the remaining `.ready` files:

   ```bash
   systemctl start postgresql@18-main
   # Monitor archiving:
   tail -f /var/log/postgresql/postgresql-18-main.log | grep archive-push
   # Wait until no more .ready files:
   watch 'ls /var/lib/postgresql/18/main/pg_wal/archive_status/*.ready 2>/dev/null | wc -l'
   systemctl stop postgresql@18-main
   # Then proceed with Step 4-7 above
   ```

2. **Last resort**: If disk is truly 0%, manually archive `.ready` files using pgbackrest
   directly (without PostgreSQL):

   ```bash
   for f in /var/lib/postgresql/18/main/pg_wal/archive_status/*.ready; do
     wal=$(basename ${f%.ready})
     pgbackrest --stanza=main archive-push \
       /var/lib/postgresql/18/main/pg_wal/$wal
   done
   ```

---

## Preventive Measures

### Monitoring alerts (already added in infra-cerniq-alerts.yml)

- `CerniqDiskCritical` — fires at <5% free (severity: critical)
- `CerniqDiskLow` — fires at <15% free (severity: warning)
- `CerniqPostgresWalDirLarge` — fires when CT107 has <20GB free

### PostgreSQL configuration recommendations

Set `max_slot_wal_keep_size = 10240` (10GB) to prevent replication slots from holding
unlimited WAL (currently `-1` = unlimited). Even though no slots exist now, this is a
safety net.

```bash
ssh root@10.0.1.107
sudo -u postgres psql -c "ALTER SYSTEM SET max_slot_wal_keep_size = '10GB';"
sudo -u postgres psql -c "SELECT pg_reload_conf();"
```

### Disk sizing

Current disk: 216GB (35GB data + ~30GB WAL overhead expected).
**Recommendation**: Expand CT107 disk to 500GB or migrate to ZFS with compression to
accommodate WAL spikes from co-located workloads (neanelu_shopify, zitadel).

### Co-located workload isolation

The WAL spike was caused by `neanelu_shopify_dev` deadlocks, NOT by Cerniq.
**Recommendation**: Migrate Zitadel and Neanelu databases to a dedicated PostgreSQL
instance (CT108 planned for warm standby per Faza 16b).

---

## Related

- Faza 16a: Redis HA Sentinel (fix-redis-ha-sentinel)
- Faza 16b: PostgreSQL Warm Standby CT107→CT108 (postgresql-warm-standby)
- Faza 16d: Disaster Recovery Runbook (disaster-recovery-runbook)
- Alert: `CerniqDiskCritical` in `infra/config/prometheus/infra-cerniq-alerts.yml`
