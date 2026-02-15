# CERNIQ.APP — ETAPA 0: BACKUP & RESTORE PROCEDURES (Infra noua)

### Versiunea 2.0 | 2026-02-15

> Document canonic (strategie): `docs/infrastructure/backup-strategy.md`  
> Runbook DB: `docs/runbooks/database-recovery.md`

## 1) Backup PostgreSQL (CT107)

### 1.1 pg_dump zilnic (db-only, custom format)

- Script (repo): `infra/scripts/ct107_pg_dump_cerniq.sh`
- Cron (repo): `infra/config/cron/ct107-cerniq-pg-dump`

Principiu:
- PostgreSQL ruleaza nativ pe CT107; nu exista container `cerniq-postgres` pe CT109/CT110.
- Dump-urile se fac pe CT107, pentru DB-urile `cerniq` si `cerniq_staging`.

### 1.2 WAL archiving (PITR)

Director tipic (PG18):
- `/var/lib/postgresql/18/main/wal_archive/`

Verificare:

```bash
sudo -u postgres psql -d postgres -c "SHOW archive_mode;"
sudo -u postgres psql -d postgres -c "SHOW archive_command;"
sudo ls -la /var/lib/postgresql/18/main/wal_archive/ | tail -n 10
```

## 2) Restore PostgreSQL (CT107)

Restore recomandat (safe pentru host shared):

```bash
pg_restore --clean --if-exists --no-owner --no-privileges -d cerniq /path/to/cerniq_db.dump
```

Verificare minima:

```bash
psql -d cerniq -c "SELECT now();"
psql -d cerniq -c "SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema');"
```

## 3) Redis

In infra noua, Redis este shared pe orchestrator si este izolat prin ACL + prefix `cerniq:`.
Nu executa `FLUSHDB/FLUSHALL` in proceduri Etapa 0 fara aprobarea operatorului de infra (shared impact).

## 4) Offsite (Borg/StorageBox)

Init/verify Borg repo sunt taskuri manuale in plan (necesita credentiale):
- `f4-01-borg-backup-init`
- `f4-02-backup-verify`

