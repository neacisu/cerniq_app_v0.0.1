#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path


def parse_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k] = v
    return out


def main() -> int:
    p = Path("/run/cerniq/runtime-secrets/api/api.env")
    vals = parse_env(p)
    u = vals.get("POSTGRES_USER", "")
    print(f"has_database_url={bool(vals.get('DATABASE_URL'))}")
    print(f"user_is_auth_user={u == 'cerniq_pgbouncer_auth'}")
    print(f"user_startswith_v={u.startswith('v-')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

