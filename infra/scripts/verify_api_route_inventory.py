#!/usr/bin/env python3
"""Validează schema fișierului de inventar rute OpenAPI (folosit în CI)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INV = ROOT / "docs" / "generated" / "api-route-inventory.json"


def _fail(msg: str) -> int:
    print(msg, file=sys.stderr)
    return 1


def _load_inventory() -> dict | None:
    if not INV.is_file():
        return None
    data = json.loads(INV.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        return None
    return data


def _validate_paths_object(paths: object) -> int | None:
    if not isinstance(paths, dict) or len(paths) < 1:
        return _fail("ERROR: paths must be non-empty object")
    return None


def _validate_route_entry(route: object, methods: object) -> int | None:
    if not isinstance(route, str) or not route.startswith("/"):
        return _fail(f"ERROR: invalid route key: {route!r}")
    if not isinstance(methods, list) or not methods:
        return _fail(f"ERROR: methods for {route} must be non-empty list")
    for m in methods:
        if not isinstance(m, str) or not m:
            return _fail(f"ERROR: invalid method in {route}: {m!r}")
    return None


def main() -> int:
    data = _load_inventory()
    if data is None:
        if not INV.is_file():
            return _fail(f"ERROR: missing {INV}")
        return _fail("ERROR: root must be object")

    err = _validate_paths_object(data.get("paths"))
    if err is not None:
        return err

    paths = data["paths"]
    assert isinstance(paths, dict)
    for route, methods in paths.items():
        err = _validate_route_entry(route, methods)
        if err is not None:
            return err

    print(f"OK: {len(paths)} paths in {INV.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
