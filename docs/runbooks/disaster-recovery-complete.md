# Disaster Recovery — runbook complet (Cerniq)

Acest runbook leagă **obiectivele RTO/RPO**, **topologia din repo** și **comenzi reale** din `infra/scripts/`. Nu introduce comenzi care nu există în scripturi sau în `infra/docker/docker-compose.yml`.

## Documentație obligatorie înainte de intervenție

| Subiect | Fișier |
| --- | --- |
| WAL / disc plin | [postgres-wal-disk-full.md](./postgres-wal-disk-full.md) |
| OpenBao unseal | [openbao-auto-unseal.md](./openbao-auto-unseal.md) |
| Recuperare DB (detaliu) | [database-recovery.md](./database-recovery.md) |
| Strategie backup | [backup-strategy.md](../infrastructure/backup-strategy.md) |
| Incident credențiale | [credential-exposure-incident.md](./credential-exposure-incident.md) |

---

## a) RTO / RPO (ținte orientative)

| Componentă | RPO (orientativ) | RTO (orientativ) | Bază în repo |
| --- | --- | --- | --- |
| PostgreSQL | ~1 h (dump zilnic + WAL; verificare vârstă în `backup_health_check.sh`) | ~30 min (PITR / restore logic) | `pg_dump_daily.sh`, `pg_pitr_restore.sh`, `disaster_recovery_full.sh` |
| Redis | ~1 h (snapshot-uri orare în `/var/backups/cerniq/redis/hourly/`) | ~5 min | `redis_backup_hourly.sh`, `redis_restore.sh` |
| Aplicație (cod) | 0 (git / imagini în registry) | ~15 min (redeploy) | `docker compose` + imagini `ghcr.io/...` din compose |
| OpenBao / date în Borg | zilnic (arhive Borg) | ~10 min (unseal + reîncărcare secrets) | `borg_backup_daily.sh`, runbook OpenBao |

---

## b) Topologie rețea și identificatori (din `infra/docker/docker-compose.yml`)

Rețele Docker **externe** (create pe host; subnete documentate în compose):

- `cerniq_public`: `172.29.10.0/24`
- `cerniq_backend`: `172.29.20.0/24`
- `cerniq_data`: `172.29.30.0/24`

**PostgreSQL (CT107)** — rezolvare nume către IP în stack:

- `extra_hosts`: `ct107-postgres:10.0.1.107` (folosit de `cerniq-api`, `pgbouncer`)

**PgBouncer** (`cerniq-pgbouncer`):

- `cerniq_data`: `172.29.30.11`
- `cerniq_backend`: `172.29.20.11`
- port intern healthcheck: `64033` (etichetă `com.cerniq.port`)

**Gateway / HAProxy (comentariu routing în compose)**:

- `10.0.1.10` — menționat pentru trafic orchestrator → app; `extra_hosts` pentru `s3cr3ts.neanelu.ro:10.0.1.10` (OpenBao).

**monitoring-api** (`cerniq-monitoring-api`):

- port mapat: `64080:64080`
- health: `http://localhost:64080/health/live`

**Profil Redis HA** (opțional): `docker compose --profile redis-ha up` — servicii `cerniq-redis-master` / `replica` / `sentinel` cu IP-uri `172.29.30.12`–`17` în `cerniq_data` (vezi secțiunea Redis în același fișier).

---

## c) Scenarii DR

### Scenario 1 — Pierdere totală date PostgreSQL (CT107 / logică DB)

1. Evaluare: `./infra/scripts/disaster_recovery_full.sh assess`
2. Dacă e nevoie de PITR la un moment T: `./infra/scripts/pg_pitr_restore.sh --target-time 'YYYY-MM-DD HH:MM:SS'` (sau `--dry-run` / `--list` conform help din script).
3. Alternativ restore orchestrat: `./infra/scripts/disaster_recovery_full.sh recover-postgres --target-time 'YYYY-MM-DD HH:MM:SS'` (apel intern `pg_pitr_restore.sh` când `--target-time` este setat).
4. Base backup fizic periodic: `./infra/scripts/pg_basebackup_weekly.sh` (rulare pe host cu acces la primary; vezi comentarii PG_HOST/Patroni în script).

### Scenario 2 — Pierdere totală stack aplicație (CT109/CT110 sau echivalent)

1. Recuperare cod: checkout versiune cunoscută + imagini din registry (variabile `REGISTRY`, `IMAGE_OWNER`, `CERNIQ_VERSION` din compose).
2. Repornire: din directorul proiectului, cu fișierul compose:  
   `docker compose -f infra/docker/docker-compose.yml up -d` (adaptat mediului; secrets OpenBao trebuie deja disponibile pe host).
3. Verificare: vezi [Checklist post-recovery](#checklist-post-recovery).

### Scenario 3 — Redis corupție / pierdere cache

1. Listă / restore: `./infra/scripts/disaster_recovery_full.sh recover-redis` sau direct `./infra/scripts/redis_restore.sh` (vezi opțiuni în script).
2. Profil HA: consultați [redis-failover.md](./redis-failover.md) dacă folosiți Sentinel.

### Scenario 4 — OpenBao sealed / pierdere chei unseal

1. Urmați [openbao-auto-unseal.md](./openbao-auto-unseal.md) și [openbao-recovery.md](./openbao-recovery.md).
2. După unseal: reîncărcare fișiere render (`/opt/cerniq/runtime-secrets` sau `CERNIQ_RENDERED_SECRETS_DIR` din compose).

### Scenario 5 — Eșec total datacenter (ex. Hetzner)

1. Reprovisionare servere + refacere rețele Docker conform comentariilor din compose.
2. Restaurare Borg din Storage Box — **repository exact** (din scripturi):  
   `ssh://u502048@u502048.your-storagebox.de:23/./backups/cerniq/borg`  
   Comenzi utile: `borg list`, `borg info` (vezi `disaster_recovery_full.sh status`, `borg_restore.sh`).
3. Aplicație din arhivă: `./infra/scripts/disaster_recovery_full.sh recover-app [--archive NAME] [--dry-run]`.

### Scenario 6 — Expunere credențiale

Vezi [credential-exposure-incident.md](./credential-exposure-incident.md).

---

## d) Proceduri pas-cu-pas (comenzi verificabile)

Toate căile sunt relative la rădăcina repo-ului (ex. `/var/www/CerniqAPP` pe serverul de build/deploy).

```bash
# Stare backup + containere + Borg + Storage Box
./infra/scripts/disaster_recovery_full.sh status

# Evaluare recomandări recover-postgres / recover-redis / recover-app
./infra/scripts/disaster_recovery_full.sh assess

# Restore PostgreSQL fără timp țintă = ultimul dump local (logică în script)
./infra/scripts/disaster_recovery_full.sh recover-postgres

# PITR la timp țintă (apel pg_pitr_restore.sh)
./infra/scripts/disaster_recovery_full.sh recover-postgres --target-time '2026-04-06 14:30:00' --dry-run

# Listare base backup-uri pe Storage Box (script PITR)
./infra/scripts/pg_pitr_restore.sh --list

# Restore Redis
./infra/scripts/disaster_recovery_full.sh recover-redis --dry-run

# Verificare după intervenție (PostgreSQL/Redis/app pe disc)
./infra/scripts/disaster_recovery_full.sh verify
```

**Health backup automat:** `./infra/scripts/backup_health_check.sh` (borg, vârstă pg_dump local, redis hourly, Storage Box, `borg_check_last.json`).

**Test extins restore (lunar, opțional):** vezi `infra/scripts/dr-test-monthly.sh` și variabila `DR_RUN_RESTORE_TEST`.

**Înainte de deploy:** `./infra/scripts/backup-pre-deploy.sh` (pg_dump via PgBouncer cu `DATABASE_URL` din env OpenBao).

---

## Checklist post-recovery

1. **PostgreSQL**  
   - Container client cu același model ca în `disaster_recovery_full.sh`: `pg_isready` / `psql` prin `DATABASE_URL` (fișier `PG_ENV_FILE` implicit `/opt/cerniq/runtime-secrets/api/api.env`).  
   - Exemplu număr tabele (ca în `verify`):  
     `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';`

2. **Redis**  
   - `redis-cli -u "$REDIS_URL" PING` și `DBSIZE` (același env ca în script). Pentru mai multe DB logice, folosiți indexul din `REDIS_URL` / config workers (`SELECT n` apoi `DBSIZE`).

3. **BullMQ / cozi**  
   - Pe host cu API monitoring:  
     `curl -fsS http://127.0.0.1:64080/api/queues`  
     (port `64080` din serviciul `cerniq-monitoring-api`).

4. **OpenBao**  
   - `bao status` pe mașina unde este instalat CLI-ul și `BAO_ADDR` (ex. `https://s3cr3ts.neanelu.ro` în scriptul de rotație). `Sealed` trebuie să fie `false` după unseal.

5. **Servicii Docker**  
   - `docker compose -f infra/docker/docker-compose.yml ps` (sau calea folosită în producție).

6. **Integritate migrări (dry-run)**  
   - Din rădăcina monorepo:  
     `pnpm --filter @cerniq/db run db:migrate -- --dry-run`  
     (vezi `packages/db/src/migrate-cli.ts`).

7. **FK (spot check)** — rulat în sesiunea SQL cu drepturi adecvate; exemple concrete depind de schema (`packages/db`).

---

## f) Test DR lunar și metrici Prometheus

```bash
# Minim: health backup + status DR; opțional test restore extins
TEXTFILE_DIR=/var/lib/node_exporter/textfile_collector ./infra/scripts/dr-test-monthly.sh

# Include și backup_restore_test.sh (greu — Storage Box / Borg)
DR_RUN_RESTORE_TEST=1 TEXTFILE_DIR=/var/lib/node_exporter/textfile_collector ./infra/scripts/dr-test-monthly.sh
```

Metrici scrise când `TEXTFILE_DIR` este setat (gauge): `backup_dr_test_success`, `backup_dr_test_last_success_timestamp`. Alerta `DRTestStale` este definită în `infra/config/prometheus/infra-cerniq-alerts.yml`.

---

## g) Index scripturi `infra/scripts/` relevante DR

| Script | Rol scurt |
| --- | --- |
| `disaster_recovery_full.sh` | status, assess, recover-*, verify |
| `pg_pitr_restore.sh` | PITR `--target-time`, `--list` |
| `pg_basebackup_weekly.sh` | base backup fizic spre Storage Box |
| `pg_dump_daily.sh` / `pg_dump_critical.sh` | dump logic |
| `redis_backup_hourly.sh` / `redis_restore.sh` / `redis_backup_aof.sh` | Redis |
| `borg_backup_daily.sh` / `borg_restore.sh` / `borg_check.sh` | Borg |
| `backup_health_check.sh` / `backup_restore_test.sh` | verificări și test restore |
| `backup-pre-deploy.sh` | înainte de deploy |
| `dr-test-monthly.sh` | orchestrare lunară + textfile Prometheus |

Ultima actualizare: aliniat la `infra/docker/docker-compose.yml` (versiune antet) și scripturile de mai sus.
