#!/usr/bin/env bash
# =============================================================================
# Rulează suite-ul pgTAP din tests/pgtap/*.sql (ordonat lexicografic).
# Conexiune: DATABASE_URL sau PGTAP_DATABASE_URL (URI complet libpq).
#
# Moduri:
#   - implicit: psql -f pe fiecare fișier (compatibil cu orice URI)
#   - PGTAP_PREFER_PG_PROVE=1: pg_prove -v (TAP pe stdout) dacă e instalat; necesită
#     variabile libpq (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE) sau un URI
#     recunoscut de mediul tău pg_prove — vezi documentația pachetului pgtap.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGURL="${PGTAP_DATABASE_URL:-${DATABASE_URL:-}}"

if [[ -z "${PGURL}" ]]; then
  echo "run-pgtap.sh: setează DATABASE_URL sau PGTAP_DATABASE_URL" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "run-pgtap.sh: psql nu e în PATH" >&2
  exit 1
fi

shopt -s nullglob
mapfile -t FILES < <(find "${ROOT}/tests/pgtap" -maxdepth 1 -type f -name '*.sql' | LC_ALL=C sort)
if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "run-pgtap.sh: nu există tests/pgtap/*.sql" >&2
  exit 1
fi

if [[ "${PGTAP_PREFER_PG_PROVE:-0}" == "1" ]] && command -v pg_prove >/dev/null 2>&1; then
  # pg_prove emite TAP; conexiunea depinde de pachet (de obicei PG* sau dsn în env)
  exec pg_prove -v "${FILES[@]}"
fi

for f in "${FILES[@]}"; do
  echo "==> ${f}" >&2
  psql "${PGURL}" -v ON_ERROR_STOP=1 -f "${f}"
done

echo "run-pgtap.sh: OK (${#FILES[@]} fișiere)." >&2
