# CERNIQ.APP — Backup & Disaster Recovery Strategy (Infrastructura noua)

> **Versiune:** 3.0  
> **Ultima actualizare:** 2026-02-15  
> **Scope:** Cerniq pe Proxmox/LXC + orchestrator central (CT107/108/109/110)

## 1) Rezumat executiv

- PostgreSQL este extern pe `CT107 (10.0.1.107:5432)` si se backupeaza pe CT107 (pg_dump + WAL archiving).
- Redis este shared pe orchestrator (ACL + prefix `cerniq:`); nu facem operatii destructive pe shared infra.
- Secretele sunt gestionate de OpenBao pe orchestrator; backup/DR pentru OpenBao este separat (snapshot/raft, gestionat pe orchestrator).
- Offsite (StorageBox/Borg) ramane parte din design, dar init/credentale sunt operatii manuale (vezi planul de migrare).

## 2) Componente si RPO/RTO (orientativ)

| Componenta | RPO | RTO | Observatii |
|---|---:|---:|---|
| PostgreSQL (CT107) | minute (cu WAL) / 24h (cu dump zilnic) | 15-60 min | depinde de incident si procedura |
| Redis shared (orchestrator) | secunde/minute | 5-30 min | depinde de infra shared |
| Config-uri deploy (CT109/CT110) | 24h | 30-60 min | repo + config sync CI/CD |

## 3) PostgreSQL (CT107)

### 3.1 Backup logic (pg_dump)

- Script: `infra/scripts/ct107_pg_dump_cerniq.sh`
- Cron (repo): `infra/config/cron/ct107-cerniq-pg-dump`

Recomandare:
- format custom (`-Fc`) pentru restore controlat
- `--no-owner --no-privileges` pentru siguranta pe host shared

### 3.2 WAL archiving (PITR)

WAL archiving trebuie sa fie activ pe CT107, cu director dedicat (PG18):
- `/var/lib/postgresql/18/main/wal_archive/`

Verificari:

```bash
sudo -u postgres psql -d postgres -c "SHOW archive_mode;"
sudo -u postgres psql -d postgres -c "SHOW archive_command;"
sudo ls -la /var/lib/postgresql/18/main/wal_archive/ | tail -n 10
```

## 4) Restore (DB)

Restore pentru DB `cerniq` / `cerniq_staging` se face pe CT107 (nu pe CT109/CT110):

```bash
pg_restore --clean --if-exists --no-owner --no-privileges -d cerniq /path/to/cerniq_db.dump
```

Verificare post-restore:

```bash
psql -d cerniq -c "SELECT now();"
psql -d cerniq -c "SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema');"
```

## 5) Redis (shared pe orchestrator)

- Izolare: user ACL `cerniq` + prefix `cerniq:`
- Backup-ul Redis (daca e necesar) este o responsabilitate de orchestrator/shared infra.
- Pentru Cerniq, prioritatea este sa nu poluam shared Redis si sa avem proceduri de requeue/rebuild daca BullMQ state se pierde.

## 6) OpenBao (orchestrator)

OpenBao DR se trateaza pe orchestrator:
- sealed/unseal
- snapshot/raft restore (daca e configurat)

Vezi runbook: `docs/runbooks/openbao-recovery.md`.

## 7) Offsite (Borg/StorageBox) — status in plan

Operatiile de init/verify sunt taskuri manuale (necesita credentiale):
- `f4-01-borg-backup-init`
- `f4-02-backup-verify`

## 8) Runbooks

- DB: `docs/runbooks/database-recovery.md`
- OpenBao: `docs/runbooks/openbao-recovery.md`
- Redis: `docs/runbooks/redis-failover.md`
- Incident response: `docs/runbooks/incident-response.md`

