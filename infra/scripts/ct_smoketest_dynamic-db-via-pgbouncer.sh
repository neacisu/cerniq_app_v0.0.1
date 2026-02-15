#!/usr/bin/env bash
set -euo pipefail

# Smoke test: prove OpenBao dynamic DB creds work through PgBouncer.
# - Reads DATABASE_URL from OpenBao-rendered env file (tmpfs).
# - Runs a trivial query; output is ONLY the current database name.

ENV_FILE="${1:-/run/cerniq/runtime-secrets/api/api.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ERROR] env file missing: $ENV_FILE" >&2
  exit 1
fi

docker run --rm \
  --network cerniq_backend \
  --env-file "$ENV_FILE" \
  postgres:18 \
  sh -c 'exec psql "$DATABASE_URL" -Atqc "SELECT current_database();"' \
  | tr -d '\r'

