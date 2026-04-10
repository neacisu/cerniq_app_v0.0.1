#!/usr/bin/env python3
"""CI: compară manifestul generat din cod cu snapshot-ul din repo."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = ROOT / "docs" / "generated" / "api-http-route-manifest.json"
BUILDER = ROOT / "infra" / "scripts" / "build_http_route_manifest.py"

# Prag minim — drift masiv fără actualizare snapshot
MIN_ROUTES = 200


def _canonical_routes(m: dict) -> list[tuple[str, str, str, str]]:
    out = []
    for r in m.get("routes", []):
        out.append(
            (
                r["method"],
                r["path"],
                r["sourceFile"],
                r.get("prefix", ""),
            )
        )
    return sorted(out)


def main() -> int:
    if not SNAPSHOT.is_file():
        print(f"ERROR: missing snapshot {SNAPSHOT}", file=sys.stderr)
        return 1

    raw = subprocess.check_output([sys.executable, str(BUILDER)], text=True)
    live = json.loads(raw)
    expected = json.loads(SNAPSHOT.read_text(encoding="utf-8"))

    if live.get("routeCount", 0) < MIN_ROUTES:
        print(
            f"ERROR: routeCount {live.get('routeCount')} < MIN_ROUTES {MIN_ROUTES}",
            file=sys.stderr,
        )
        return 1

    cr_live = _canonical_routes(live)
    cr_exp = _canonical_routes(expected)
    if cr_live != cr_exp:
        print("ERROR: HTTP route manifest drift — rerun:", file=sys.stderr)
        print(
            f"  python3 {BUILDER.relative_to(ROOT)} --write {SNAPSHOT.relative_to(ROOT)}",
            file=sys.stderr,
        )
        s_live, s_exp = set(cr_live), set(cr_exp)
        only_live = sorted(s_live - s_exp)[:20]
        only_exp = sorted(s_exp - s_live)[:20]
        if only_live:
            print(f"  Only in code (first {len(only_live)}): {only_live[:5]}...", file=sys.stderr)
        if only_exp:
            print(f"  Only in snapshot (first {len(only_exp)}): {only_exp[:5]}...", file=sys.stderr)
        print(f"  live={len(cr_live)} snapshot={len(cr_exp)}", file=sys.stderr)
        return 1

    print(f"OK: api-http-route-manifest.json ({len(cr_live)} routes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
