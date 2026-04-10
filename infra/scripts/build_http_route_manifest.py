#!/usr/bin/env python3
"""
Inventar static HTTP (metodă + cale + fișier sursă) din apps/api.

Parsează apps/api/src/routes/index.ts (register + importuri) și fișierele *.ts din routes/
(excl. index.ts). Reflectă aliasul real din cod: negotiationRoutes este înregistrat de două ori
(/api/v1/negotiation și /api/v1/negotiations).

Limitări (nu inferă dinamic):
- Doar path-uri string literal la app.get/post/put/patch/delete/head/options(...).
- Nu detectează app.route({ url: variabilă }).
- Rute plugin-only: /metrics, /docs*, /documentation — secțiunea „infrastructure”.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ROUTES_DIR = ROOT / "apps" / "api" / "src" / "routes"
INDEX_PATH = ROUTES_DIR / "index.ts"

# import { a, b } from "./file.js" | import x from "./file.js"
RE_IMPORT_NAMED = re.compile(
    r"""import\s+\{\s*([^}]+)\s*\}\s+from\s+["']\./([^"']+)\.js["']\s*;"""
)
RE_IMPORT_DEFAULT = re.compile(
    r"""import\s+(\w+)\s+from\s+["']\./([^"']+)\.js["']\s*;"""
)
# await app.register(fooRoutes, { prefix: "/path" });
RE_REGISTER = re.compile(
    r"""await\s+app\.register\(\s*(\w+)\s*,\s*\{\s*prefix:\s*["']([^"']+)["']\s*\}\s*\)\s*;"""
)
# app.get("/path" sau app.post('/path'
RE_HANDLER = re.compile(
    r"""\bapp\.(get|post|put|patch|delete|head|options)\s*\(\s*["']([^"']+)["']""",
    re.IGNORECASE,
)
# app.get("/", în index.ts
RE_INDEX_INLINE = re.compile(
    r"""\bapp\.(get|post|put|patch|delete|head|options)\s*\(\s*["']([^"']+)["']""",
    re.IGNORECASE,
)

INFRASTRUCTURE = [
    {
        "kind": "prometheus",
        "method": "GET",
        "path": "/metrics",
        "note": "Plugin metrics.ts — allowlist IP",
    },
    {
        "kind": "swagger-ui",
        "method": "GET",
        "path": "/docs",
        "note": "@fastify/swagger-ui",
    },
    {
        "kind": "openapi-json",
        "method": "GET",
        "path": "/docs/json",
        "note": "@fastify/swagger",
    },
    {
        "kind": "redirect",
        "method": "GET",
        "path": "/documentation",
        "note": "Redirect către /docs/ (plugins/index.ts)",
    },
]


def _normalize_full_path(prefix: str, route_path: str) -> str:
    p = prefix.rstrip("/")
    r = route_path if route_path.startswith("/") else f"/{route_path}"
    if not p:
        return r
    # `p` este nevid aici — `p or "/"` ar fi mereu `p` (Sonar S2583).
    return f"{p}{r}" if r != "/" else p


def _parse_index_imports(text: str) -> dict[str, str]:
    """symbol -> basename fără .ts (ex. healthRoutes -> health)."""
    mapping: dict[str, str] = {}
    for m in RE_IMPORT_NAMED.finditer(text):
        names = [x.strip() for x in m.group(1).split(",") if x.strip()]
        base = m.group(2)
        for name in names:
            mapping[name] = base
    for m in RE_IMPORT_DEFAULT.finditer(text):
        mapping[m.group(1)] = m.group(2)
    return mapping


def _parse_registers(text: str) -> list[tuple[str, str]]:
    return RE_REGISTER.findall(text)


def _extract_handlers(file_text: str) -> list[tuple[str, str]]:
    return [(m[0].upper(), m[1]) for m in RE_HANDLER.findall(file_text)]


def build_manifest() -> dict:
    if not INDEX_PATH.is_file():
        raise SystemExit(f"Missing {INDEX_PATH}")

    index_text = INDEX_PATH.read_text(encoding="utf-8")
    sym_to_file = _parse_index_imports(index_text)
    registrations = _parse_registers(index_text)

    routes: list[dict[str, str]] = []
    by_file_counter: Counter[str] = Counter()

    # Înregistrări: același simbol poate apărea de două ori (negotiation / negotiations)
    for sym, prefix in registrations:
        base = sym_to_file.get(sym)
        if not base:
            raise SystemExit(f"Unknown register symbol (no import): {sym}")
        ts_path = ROUTES_DIR / f"{base}.ts"
        if not ts_path.is_file():
            raise SystemExit(f"Route file missing for {sym}: {ts_path}")
        body = ts_path.read_text(encoding="utf-8")
        for method, rpath in _extract_handlers(body):
            full = _normalize_full_path(prefix, rpath)
            routes.append(
                {
                    "method": method,
                    "path": full,
                    "sourceFile": f"apps/api/src/routes/{base}.ts",
                    "registerSymbol": sym,
                    "prefix": prefix,
                }
            )
            by_file_counter[f"{base}.ts"] += 1

    # Rute definite direct în index.ts (ex. GET /)
    for method, rpath in _extract_handlers(index_text):
        # Evită dublarea handler-elor din comentarii sau duplicate — doar căi fără prefix
        full = rpath if rpath.startswith("/") else f"/{rpath}"
        routes.append(
            {
                "method": method,
                "path": full,
                "sourceFile": "apps/api/src/routes/index.ts",
                "registerSymbol": "_inline_",
                "prefix": "",
            }
        )
        by_file_counter["index.ts"] += 1

    # Verificare manuală plan: ambele prefixuri pentru negotiation
    neg_paths = {r["prefix"] for r in routes if r.get("registerSymbol") == "negotiationRoutes"}
    if neg_paths != {"/api/v1/negotiation", "/api/v1/negotiations"}:
        print(
            f"WARNING: expected negotiationRoutes on both prefixes, got {neg_paths}",
            file=sys.stderr,
        )

    # Sort stabil pentru snapshot
    routes.sort(key=lambda x: (x["path"], x["method"], x["sourceFile"]))

    return {
        "generatedAt": "",  # setat la write
        "version": 1,
        "routes": routes,
        "routeCount": len(routes),
        "byFile": dict(sorted(by_file_counter.items())),
        "infrastructure": INFRASTRUCTURE,
        "limitations": [
            "Doar path-uri string literal la app.(get|post|...); path-uri din variabile nu apar.",
            "Fără app.route({ url }) — repo-ul folosește exclusiv app.METHOD.",
            "Prefixele Fastify din registerRoutes trebuie să rămână în forma await app.register(..., { prefix: \"...\" }).",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Build HTTP route manifest for apps/api")
    parser.add_argument(
        "--write",
        metavar="PATH",
        help="Write JSON to PATH (relative to repo root or absolute)",
    )
    args = parser.parse_args()
    _write_dest = "write"
    write_arg = getattr(args, _write_dest, None)

    from datetime import datetime, timezone

    manifest = build_manifest()
    manifest["generatedAt"] = datetime.now(timezone.utc).isoformat()

    text = json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
    if write_arg:
        out = Path(write_arg)
        if not out.is_absolute():
            out = ROOT / out
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text, encoding="utf-8")
        print(f"Wrote {out.relative_to(ROOT)}", file=sys.stderr)
    else:
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
