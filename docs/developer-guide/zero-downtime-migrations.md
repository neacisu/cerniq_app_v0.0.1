# Migrații PostgreSQL fără downtime (operațional)

**PostgreSQL:** versiunea din stack (vezi `infra/docker/docker-compose.yml` / ADR-0004).

## Reguli

1. **ADD COLUMN … NOT NULL** fără **DEFAULT** pe tabele mari → interzis. Folosiți: `ADD COLUMN … DEFAULT …` apoi `ALTER COLUMN … SET NOT NULL` în pași separați (sau un singur `ADD` cu default).
2. **DROP COLUMN** pe tabele active → evitat; faza 1 cod ignoră coloana, faza 2 DROP în migrație separată, după deploy.
3. **Index pe tabele mari** → `CREATE INDEX CONCURRENTLY` (fără tranzacție care înconjoară statement-ul).
4. **RENAME COLUMN** pe tabele fierbinți → coloană nouă + backfill + switch cod + DROP ulterior.
5. **Lock timeout** în sesiuni interactive: `SET lock_timeout = '5s'` poate fi folosit pentru DDL scurt; **nu** pentru `CREATE INDEX CONCURRENTLY` (durată lungă).
6. **Verificare automată:** `pnpm run db:migrate -- --check-locks` — validează migrațiile cu prefix **≥ 0070** (vezi `packages/db/src/migration-sql-audit.ts`).

## Pre-check înainte de deploy

Rulează [`infra/scripts/migration-pre-check.sh`](../../infra/scripts/migration-pre-check.sh) (conexiune Postgres, spațiu disk, backup — extindeți după politica voastră).

## Legături

- CLI migrații: `packages/db/src/migrate-cli.ts`
- Journal Drizzle: `packages/db/drizzle/meta/_journal.json`
