#!/usr/bin/env python3
"""
Generează matricea grup (prefix) → rută reprezentativă pentru smoke traces (OTel http.route).
Intrare: docs/generated/api-http-route-manifest.json
Ieșire: docs/generated/http-trace-smoke-matrix.json

Rulare:
  python3 infra/scripts/build_http_trace_smoke_matrix.py --write=docs/generated/http-trace-smoke-matrix.json
  python3 infra/scripts/build_http_trace_smoke_matrix.py --write=docs/generated/http-trace-smoke-matrix.json --verify
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


def template_to_sample_path(path_tpl: str) -> str:
    """Înlocuiește :param cu valori sintetice pentru app.inject."""
    out: list[str] = []
    for seg in path_tpl.split("/"):
        if not seg:
            out.append("")
            continue
        if seg.startswith(":") or seg.startswith("*"):
            if "id" in seg.lower() or seg in (":id", ":batchId", ":name"):
                out.append("00000000-0000-4000-8000-000000000001")
            else:
                out.append("smoke")
        else:
            out.append(seg)
    return "/".join(out) if path_tpl.startswith("/") else "/".join(out).lstrip("/")


def pick_representative(routes: list[dict]) -> dict:
    """Preferă GET, apoi HEAD, apoi prima metodă; cea mai scurtă cale la egalitate."""
    order = {"GET": 0, "HEAD": 1, "OPTIONS": 2}
    sorted_r = sorted(
        routes,
        key=lambda r: (
            order.get(r["method"], 99),
            len(r["path"]),
            r["path"],
        ),
    )
    return sorted_r[0]


CRITICAL_PREFIXES = (
    "/api/v1/gdpr",
    "/api/v1/webhooks",
    "/api/v1/negotiation",
    "/api/v1/negotiations",
)

_NOTES = [
    "Un grup = prefix din manifest; o rută reprezentativă per grup (preferință GET).",
    "criticalRoutes acoperă explicit GDPR, webhooks, negotiation (alias).",
    "Smoke OTel: asert http.route == routeTemplate după Fastify inject (vezi packages/observability/src/http-route-trace-smoke.test.ts).",
]


def build_route_groups(routes: list[dict]) -> dict[str, dict]:
    by_prefix: dict[str, list[dict]] = defaultdict(list)
    for r in routes:
        pfx = r.get("prefix") or ""
        by_prefix[pfx].append(r)
    groups: dict[str, dict] = {}
    for pfx, rs in sorted(by_prefix.items(), key=lambda x: (x[0] == "", x[0])):
        key = pfx if pfx else "__root__"
        rep = pick_representative(rs)
        tpl = rep["path"]
        groups[key] = {
            "prefix": pfx,
            "method": rep["method"],
            "routeTemplate": tpl,
            "samplePath": template_to_sample_path(tpl),
            "sourceFile": rep.get("sourceFile"),
            "registerSymbol": rep.get("registerSymbol"),
        }
    return groups


def build_critical_routes(routes: list[dict]) -> dict[str, dict]:
    critical: dict[str, dict] = {}
    for cp in CRITICAL_PREFIXES:
        rs = [r for r in routes if r.get("path", "").startswith(cp + "/") or r.get("path") == cp]
        if not rs:
            continue
        rep = pick_representative(rs)
        tpl = rep["path"]
        critical[cp] = {
            "method": rep["method"],
            "routeTemplate": tpl,
            "samplePath": template_to_sample_path(tpl),
        }
    return critical


def compose_matrix_payload(root: Path, manifest_path: Path, routes: list[dict]) -> dict:
    groups = build_route_groups(routes)
    critical = build_critical_routes(routes)
    rel_manifest = (
        str(manifest_path.relative_to(root)) if manifest_path.is_relative_to(root) else str(manifest_path)
    )
    return {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "manifestPath": rel_manifest,
        "groupCount": len(groups),
        "groups": groups,
        "criticalRoutes": critical,
        "notes": list(_NOTES),
    }


def verify_matrix_file(root: Path, write_rel: str, expected: dict) -> int:
    if not write_rel:
        print("ERROR: --verify necesită --write", file=sys.stderr)
        return 2
    dest = root / write_rel
    if not dest.is_file():
        print(f"ERROR: lipsește {dest} — rulează fără --verify pentru generare.", file=sys.stderr)
        return 1
    old = json.loads(dest.read_text(encoding="utf-8"))
    for key in ("version", "groupCount", "groups", "criticalRoutes"):
        if old.get(key) != expected.get(key):
            print(f"DRIFT: câmp «{key}» diferă față de manifest. Regenerează cu --write.", file=sys.stderr)
            return 1
    print(f"OK: {dest.relative_to(root)} aliniat la manifest.", file=sys.stderr)
    return 0


def write_matrix_or_stdout(root: Path, write_rel: str, text: str) -> None:
    if write_rel:
        dest = root / write_rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(text, encoding="utf-8")
        print(f"Scris: {dest.relative_to(root)}", file=sys.stderr)
    else:
        print(text, end="")


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--manifest",
        default=str(root / "docs/generated/api-http-route-manifest.json"),
    )
    parser.add_argument("--write", default="", help="Scrie JSON la această cale relativă la root.")
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Verifică că fișierul de la --write are aceleași groups/criticalRoutes ca manifestul (fără regenerare).",
    )
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.is_file():
        print(f"ERROR: manifest inexistent: {manifest_path}", file=sys.stderr)
        return 2

    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    routes = data.get("routes") or []
    out = compose_matrix_payload(root, manifest_path, routes)
    text = json.dumps(out, indent=2, ensure_ascii=False) + "\n"

    if args.verify:
        return verify_matrix_file(root, args.write, out)

    write_matrix_or_stdout(root, args.write, text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
