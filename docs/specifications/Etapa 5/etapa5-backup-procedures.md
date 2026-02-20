# CERNIQ.APP — ETAPA 5: Backup Procedures (Infra noua)

### Versiunea 2.0 | 2026-02-15

Etapa 5 foloseste aceeasi fundatie operationala ca Etapa 0:

- PostgreSQL extern pe `CT107 (10.0.1.107:5432)`
- WAL archiving pentru PITR (pe CT107)
- Dump-uri zilnice (pg_dump custom format) pe CT107
- Offsite (Borg/StorageBox) conform planului (operatii manuale)

## 1) Backup (PostgreSQL)

- Script: `infra/scripts/ct107_pg_dump_cerniq.sh`
- Cron: `infra/config/cron/ct107-cerniq-pg-dump`

## 2) Restore (PostgreSQL)

Runbook: `docs/runbooks/database-recovery.md`

Comanda recomandata (CT107):

```bash
pg_restore --clean --if-exists --no-owner --no-privileges -d cerniq /path/to/cerniq_db.dump
```

## 3) PITR (WAL)

PITR se executa pe CT107 (nativ), folosind basebackup + WAL-uri arhivate.
Acest document nu include script complet (risc operational); procedura este documentata operational in runbook-ul DB.

## 4) Verificare backup

Minim:

- `pg_restore --list <dump>` se executa fara erori
- test `psql -c "SELECT 1"` pe DB
