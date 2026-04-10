#!/usr/bin/env python3
"""
Compară manifestul static de rute HTTP cu inventarul OpenAPI (snapshot din Swagger).

Intrări:
  - docs/generated/api-http-route-manifest.json (metodă + path Fastify)
  - docs/generated/api-route-inventory.json (paths OpenAPI → liste metode)

Ieșire: JSON stdout + stderr sumar. Implicit exit 0 (nu blochează merge).
Cu --strict: exit 1 dacă există rute în manifest fără corespondent OpenAPI (după normalizare).

Normalizare: path Fastify `:id` → `{id}` pentru aliniere la OpenAPI 3.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


def fastify_path_to_openapi(path: str) -> str:
    return re.sub(r":([a-zA-Z_]\w*)", r"{\1}", path)


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--manifest",
        default=str(root / "docs/generated/api-http-route-manifest.json"),
    )
    ap.add_argument(
        "--openapi-inventory",
        default=str(root / "docs/generated/api-route-inventory.json"),
    )
    ap.add_argument(
        "--strict",
        action="store_true",
        help="Exit 1 dacă apar rute manifest fără OpenAPI (după normalizare).",
    )
    args = ap.parse_args()

    mpath = Path(args.manifest)
    opath = Path(args.openapi_inventory)
    if not mpath.is_file():
        print(f"ERROR: manifest inexistent: {mpath}", file=sys.stderr)
        return 2
    if not opath.is_file():
        print(
            f"WARN: inventar OpenAPI lipsă: {opath}. "
            "Generează cu UPDATE_ROUTE_INVENTORY=1 și testul openapi-route-inventory.",
            file=sys.stderr,
        )
        print(json.dumps({"skipped": True, "reason": "no_openapi_inventory"}, indent=2))
        return 0

    manifest = json.loads(mpath.read_text(encoding="utf-8"))
    inv = json.loads(opath.read_text(encoding="utf-8"))
    openapi_paths: dict[str, list[str]] = inv.get("paths") or {}

    manifest_pairs: set[tuple[str, str]] = set()
    for r in manifest.get("routes") or []:
        method = str(r.get("method", "")).upper()
        p = str(r.get("path", ""))
        oa_path = fastify_path_to_openapi(p)
        manifest_pairs.add((method, oa_path))

    openapi_pairs: set[tuple[str, str]] = set()
    for path_key, methods in openapi_paths.items():
        for m in methods:
            openapi_pairs.add((str(m).upper(), str(path_key)))

    manifest_only = sorted(manifest_pairs - openapi_pairs)
    openapi_only = sorted(openapi_pairs - manifest_pairs)

    infra_prefixes = ("/docs", "/documentation", "/metrics", "/health")
    manifest_only_filtered = [
        x for x in manifest_only if not any(x[1].startswith(pref) for pref in infra_prefixes)
    ]

    out = {
        "manifestPath": str(mpath.relative_to(root)) if mpath.is_relative_to(root) else str(mpath),
        "openapiInventoryPath": str(opath.relative_to(root)) if opath.is_relative_to(root) else str(opath),
        "counts": {
            "manifestRoutes": len(manifest_pairs),
            "openapiOperations": len(openapi_pairs),
            "manifestOnlyOpenapi": len(manifest_only),
            "manifestOnlyOpenapiExcludingInfraHint": len(manifest_only_filtered),
            "openapiOnlyManifest": len(openapi_only),
        },
        "sampleManifestOnly": manifest_only[:40],
        "sampleOpenapiOnly": openapi_only[:40],
        "notes": [
            "OpenAPI poate fi incomplet (rute dinamice, plugin-only, schema Zod parțială).",
            "Vezi docs/developer-guide/openapi-route-parity.md pentru fals pozitive cunoscute.",
        ],
    }
    print(json.dumps(out, indent=2, ensure_ascii=False))

    if manifest_only_filtered and args.strict:
        print(
            f"STRICT FAIL: {len(manifest_only_filtered)} rute manifest fără OpenAPI (excl. hint infra). "
            f"Primele: {manifest_only_filtered[:10]}",
            file=sys.stderr,
        )
        return 1

    if manifest_only_filtered:
        print(
            f"WARN: {len(manifest_only_filtered)} rute în manifest fără corespondent în OpenAPI "
            f"(nu blochează fără --strict).",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
