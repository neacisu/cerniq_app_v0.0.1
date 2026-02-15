#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import re
from pathlib import Path


def main() -> int:
    t = Path("/run/cerniq/runtime-secrets/infra/userlist.txt").read_text(encoding="utf-8").strip()
    m = re.match(r'^"[^"]+"\s+"(.*)"$', t)
    if not m:
        raise SystemExit("[ERROR] unexpected userlist format")
    s = m.group(1)
    print(hashlib.sha256(s.encode("utf-8")).hexdigest())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

