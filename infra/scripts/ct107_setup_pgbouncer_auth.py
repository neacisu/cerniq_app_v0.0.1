#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from pathlib import Path


PASS_FILE = Path("/tmp/cerniq_pgbouncer_auth_password.txt")
AUTH_ROLE = "cerniq_pgbouncer_auth"
CERNIQ_ROLE = "c3rn1q"
DB = "postgres"


SQL = f"""
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{AUTH_ROLE}') THEN
    CREATE ROLE {AUTH_ROLE} LOGIN NOINHERIT;
  END IF;
END
$$;

-- Password is applied separately (generated per run).
-- auth_user must be able to connect to the auth_dbname.
GRANT CONNECT ON DATABASE {DB} TO {AUTH_ROLE};
GRANT USAGE ON SCHEMA public TO {AUTH_ROLE};

CREATE OR REPLACE FUNCTION public.cerniq_pgbouncer_get_auth(username text)
RETURNS TABLE (usename text, passwd text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $fn$
  WITH target AS (
    SELECT oid, rolname, rolpassword
    FROM pg_authid
    WHERE rolname = username
      AND rolcanlogin
      AND rolpassword IS NOT NULL
  )
  SELECT t.rolname, t.rolpassword
  FROM target t
  WHERE
    -- Allow the base Cerniq role itself
    t.rolname = '{CERNIQ_ROLE}'
    OR EXISTS (
      SELECT 1
      FROM pg_auth_members m
      JOIN pg_roles r ON r.oid = m.roleid
      WHERE m.member = t.oid
        AND r.rolname = '{CERNIQ_ROLE}'
    );
$fn$;

ALTER FUNCTION public.cerniq_pgbouncer_get_auth(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.cerniq_pgbouncer_get_auth(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cerniq_pgbouncer_get_auth(text) TO {AUTH_ROLE};
"""


def _run_sql(sql: str) -> None:
    subprocess.run(
        ["sudo", "-u", "postgres", "psql", "-d", DB, "-v", "ON_ERROR_STOP=1", "-q"],
        check=True,
        input=sql.encode("utf-8"),
    )


def main() -> int:
    if not PASS_FILE.exists():
        raise SystemExit(f"[ERROR] password file missing: {PASS_FILE}")

    pw = PASS_FILE.read_text(encoding="utf-8", errors="strict").strip()
    if not pw:
        raise SystemExit("[ERROR] password file is empty")

    pw_sql = pw.replace("'", "''")
    sql = SQL + f"\nALTER ROLE {AUTH_ROLE} PASSWORD '{pw_sql}';\n"

    _run_sql(sql)
    print("[OK] PgBouncer auth role + auth_query function ready")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

