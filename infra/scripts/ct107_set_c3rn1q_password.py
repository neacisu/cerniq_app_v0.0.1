#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from pathlib import Path


PASS_FILE = Path("/tmp/cerniq_postgres_password.txt")


def main() -> int:
    if not PASS_FILE.exists():
        raise SystemExit(f"[ERROR] password file missing: {PASS_FILE}")

    pw = PASS_FILE.read_text(encoding="utf-8", errors="strict").strip()
    if not pw:
        raise SystemExit("[ERROR] password file is empty")

    # Escape single quotes for SQL literal (defensive; token_urlsafe shouldn't contain them).
    pw_sql = pw.replace("'", "''")
    sql = f"ALTER ROLE c3rn1q PASSWORD '{pw_sql}';"

    # Run as postgres locally (inside CT107). No secrets are printed.
    subprocess.run(
        ["sudo", "-u", "postgres", "psql", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atqc", sql],
        check=True,
        stdout=subprocess.DEVNULL,
    )

    print("[OK] Updated role password for c3rn1q")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

