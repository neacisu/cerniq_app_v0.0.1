#!/bin/bash
set -euo pipefail

# CT107 (PostgreSQL host): daily logical backup for DB `cerniq`.
# Runs as user `postgres` from /etc/cron.d/ct107-cerniq-pg-dump.
#
# No secrets needed: local socket as postgres.

umask 077

OUT_DIR="/var/backups/cerniq/pg"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="${OUT_DIR}/cerniq_${TS}.dump"

mkdir -p "${OUT_DIR}"

pg_dump -d cerniq -Fc -f "${FILE}"

# Keep 14 days locally.
find "${OUT_DIR}" -type f -name 'cerniq_*.dump' -mtime +14 -delete 2>/dev/null || true

echo "[OK] wrote ${FILE}"

