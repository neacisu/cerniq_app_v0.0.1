# CERNIQ.APP — Database Recovery Runbook (PostgreSQL extern CT107)

> **Clasificare:** OPERATIONAL CRITIC  
> **Versiune:** 2.0  
> **Ultima actualizare:** 2026-02-15  
> **Target:** Infrastructura noua (PostgreSQL nativ pe `CT107`, acces din CT109/CT110 prin PgBouncer)

## 1) Context si scope

- PostgreSQL ruleaza **nativ** pe `CT107 (10.0.1.107:5432)`, nu in Docker pe CT109/CT110.
- Aplicatia (CT109/CT110) se conecteaza la DB prin **PgBouncer** (`64033` in reteaua Docker a stack-ului Cerniq).
- Backup-urile DB pentru Cerniq sunt definite ca procese pe `CT107` (pg_dump + WAL archiving).

## 2) Scenarii

### A) DB indisponibil (serviciu PostgreSQL down pe CT107)

1. Conecteaza-te pe `CT107`.
2. Verifica status PostgreSQL:

```bash
sudo systemctl status postgresql
sudo journalctl -u postgresql --since "30 min ago" --no-pager
sudo ss -lntp | rg ':5432\\b'
```

3. Restart controlat:

```bash
sudo systemctl restart postgresql
sudo systemctl status postgresql
```

4. Smoke test local:

```bash
sudo -u postgres psql -d postgres -c "SELECT 1;"
sudo -u postgres psql -d cerniq -c "SELECT 1;"
sudo -u postgres psql -d cerniq_staging -c "SELECT 1;"
```

### B) Aplicatia nu se conecteaza la DB (PgBouncer/credentale/secrets)

1. Pe CT109/CT110, verifica `pgbouncer` + OpenBao agent infra:

```bash
cd /opt/cerniq
docker compose ps
docker inspect -f '{{.State.Health.Status}}' cerniq-openbao-agent-infra cerniq-pgbouncer
```

2. Verifica faptul ca agentul a randat configurile in runtime secrets:

```bash
ls -la /run/cerniq/runtime-secrets/infra || true
```

3. Test conexiune prin PgBouncer (dintr-un container cu psql, sau din host daca ai `psql`):

```bash
# Exemplu (host): necesita user/parola valida (din OpenBao dynamic creds)
psql -h 127.0.0.1 -p 64033 -U <db_user> -d cerniq -c "SELECT 1;"
```

> Nota: in staging/prod, credentialele sunt dinamice (OpenBao database engine). Nu hardcoda user/parola in runbook.

### C) Restore logic (db-only) din dump custom-format

1. Pe `CT107`, asigura-te ca ai dump-ul `-Fc` (custom) pentru DB tinta.
2. Restore recomandat (sigur pentru multi-DB / shared host):

```bash
# Exemple: db-only restore fara owner/privileges, cu clean safe
pg_restore --clean --if-exists --no-owner --no-privileges -d cerniq /path/to/cerniq_db.dump
```

3. Verificari minime post-restore:

```bash
psql -d cerniq -c "SELECT now();"
psql -d cerniq -c "SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema');"
psql -d cerniq -c "SELECT extname FROM pg_extension ORDER BY 1;"
```

## 3) WAL archiving / PITR (Punctual)

WAL archiving ruleaza pe `CT107`. Director tipic:

- `/var/lib/postgresql/18/main/wal_archive/`

Verificare rapida:

```bash
sudo -u postgres psql -d postgres -c "SHOW archive_mode;"
sudo -u postgres psql -d postgres -c "SHOW archive_command;"
sudo ls -la /var/lib/postgresql/18/main/wal_archive/ | tail -n 10
```

PITR este un procedeu avansat; se executa doar cu:

- snapshot/basebackup compatibil + WAL-uri complete
- fereastra tinta clara (timestamp) + plan de rollback

## 4) Ce NU facem (siguranta)

- Nu rulam comenzi destructive “globale” care ar afecta alte baze de date de pe CT107.
- Nu mutam secrete in repo si nu salvam parole in fisiere din repo.
- Nu presupunem ca exista containere `postgres` pe CT109/CT110 (nu exista in infra noua).
