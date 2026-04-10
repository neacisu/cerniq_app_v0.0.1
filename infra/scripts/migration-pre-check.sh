#!/usr/bin/env bash
# Gate opțional înainte de deploy cu migrații: verificări minime mediu.
# Ieșire 0 = OK, ≠0 = nu continua deploy (configurabil în CI).
set -euo pipefail

: "${PGHOST:=localhost}"
: "${PGPORT:=5432}"
: "${PGUSER:=postgres}"
: "${PGDATABASE:=cerniq}"

echo "[migration-pre-check] PGHOST=$PGHOST PGPORT=$PGPORT PGDATABASE=$PGDATABASE"

if ! command -v psql >/dev/null 2>&1; then
  echo "[migration-pre-check] WARN: psql lipsă — skip conexiune"
  exit 0
fi

if ! psql "host=$PGHOST port=$PGPORT user=$PGUSER dbname=$PGDATABASE" -c "SELECT 1" >/dev/null 2>&1; then
  echo "[migration-pre-check] ERROR: nu mă pot conecta la Postgres"
  exit 1
fi

# Spațiu minim1G pe / (ajustați)
avail_kb=$(df -Pk / | awk 'NR==2 {print $4}')
if [ "${avail_kb:-0}" -lt 1048576 ]; then
  echo "[migration-pre-check] WARN: mai puțin de 1G liber pe /"
fi

echo "[migration-pre-check] OK"
exit 0
