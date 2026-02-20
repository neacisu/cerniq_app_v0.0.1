#!/usr/bin/env python3
from __future__ import annotations

import hashlib
from pathlib import Path


def main() -> int:
    s = Path("/tmp/cerniq_pgbouncer_auth_password.txt").read_text(encoding="utf-8").strip()
    print(hashlib.sha256(s.encode("utf-8")).hexdigest())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

