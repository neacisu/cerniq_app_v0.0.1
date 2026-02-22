#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
from dataclasses import dataclass


CF_API = "https://api.cloudflare.com/client/v4"


@dataclass(frozen=True)
class RecordSpec:
    zone: str  # zone name (e.g. "cerniq.app") or explicit zone id (starts with a UUID-like string)
    type: str  # "A" | "CNAME"
    name: str
    content: str
    ttl: int = 60
    proxied: bool = False


def _env(name: str) -> str:
    v = os.environ.get(name, "").strip()
    if not v:
        raise SystemExit(f"[ERROR] Missing env var: {name}")
    return v


def _http_json(method: str, url: str, token: str, payload: dict | None = None) -> dict:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"[ERROR] Cloudflare API HTTP {e.code}: {url}\n{body}") from e
    out = json.loads(raw) if raw else {}
    if not out.get("success", True):
        raise SystemExit(f"[ERROR] Cloudflare API error: {url}\n{json.dumps(out, indent=2)}")
    return out


def _get_zone_id(token: str, zone_name: str) -> str:
    q = urllib.parse.urlencode({"name": zone_name, "per_page": 50})
    url = f"{CF_API}/zones?{q}"
    out = _http_json("GET", url, token)
    results = out.get("result") or []
    if not results:
        raise SystemExit(f"[ERROR] Cloudflare zone not found for name={zone_name!r}")
    # Pick exact match
    for z in results:
        if (z.get("name") or "").strip(".") == zone_name.strip("."):
            zid = z.get("id")
            if zid:
                return str(zid)
    raise SystemExit(f"[ERROR] Cloudflare zone id missing for name={zone_name!r}")


def _find_record(zone_id: str, token: str, record_type: str, name: str) -> dict | None:
    q = urllib.parse.urlencode({"type": record_type, "name": name, "per_page": 50})
    url = f"{CF_API}/zones/{zone_id}/dns_records?{q}"
    out = _http_json("GET", url, token)
    results = out.get("result") or []
    if not results:
        return None
    # If multiple, take the first exact match (name+type are already filtered).
    return results[0]


def _list_records_by_name(zone_id: str, token: str, name: str) -> list[dict]:
    q = urllib.parse.urlencode({"name": name, "per_page": 50})
    url = f"{CF_API}/zones/{zone_id}/dns_records?{q}"
    out = _http_json("GET", url, token)
    return list(out.get("result") or [])


def _delete_record(zone_id: str, token: str, record_id: str) -> None:
    url = f"{CF_API}/zones/{zone_id}/dns_records/{record_id}"
    _http_json("DELETE", url, token)


def _resolve_zone_id(spec: RecordSpec, token: str, zones: dict[str, str]) -> str:
    # If user passed explicit zone id, use it.
    # Otherwise treat as zone name.
    z = spec.zone
    if z in zones:
        return zones[z]
    # Heuristic: Cloudflare zone ids are 32 hex chars; accept that directly.
    if len(z) == 32 and all(c in "0123456789abcdef" for c in z.lower()):
        zones[z] = z
        return z
    zones[z] = _get_zone_id(token, z)
    return zones[z]


def _upsert(spec: RecordSpec, token: str, apply: bool, zones: dict[str, str]) -> tuple[str, str]:
    zone_id = _resolve_zone_id(spec, token, zones)
    existing = _find_record(zone_id, token, spec.type, spec.name)
    desired = {
        "type": spec.type,
        "name": spec.name,
        "content": spec.content,
        "ttl": spec.ttl,
        "proxied": spec.proxied,
    }

    if existing is None:
        # Handle "host already exists" conflicts (e.g. replacing A -> CNAME).
        others = [r for r in _list_records_by_name(zone_id, token, spec.name) if r.get("type") != spec.type]
        if others:
            types = ",".join(sorted({str(r.get("type")) for r in others}))
            if not apply:
                return ("REPLACE", f"{spec.type} {spec.name} (delete {types} then create)")
            for r in others:
                rid = r.get("id")
                if rid:
                    _delete_record(zone_id, token, str(rid))

        if not apply:
            return ("CREATE", f"{spec.type} {spec.name} -> {spec.content} ttl={spec.ttl} proxied={spec.proxied}")
        url = f"{CF_API}/zones/{zone_id}/dns_records"
        _http_json("POST", url, token, desired)
        return ("CREATED", f"{spec.type} {spec.name}")

    # Only update if drift exists (idempotent).
    drift = []
    for k in ("content", "ttl", "proxied"):
        if existing.get(k) != desired.get(k):
            drift.append(f"{k}:{existing.get(k)}->{desired.get(k)}")
    if drift:
        if not apply:
            return ("UPDATE", f"{spec.type} {spec.name} ({', '.join(drift)})")
        rec_id = existing["id"]
        url = f"{CF_API}/zones/{zone_id}/dns_records/{rec_id}"
        _http_json("PUT", url, token, desired)
        return ("UPDATED", f"{spec.type} {spec.name}")

    return ("OK", f"{spec.type} {spec.name}")


def _specs(orchestrator_ip: str) -> list[RecordSpec]:
    # Zone names by default; can be overridden with env vars for explicit IDs.
    z_cerniq = os.environ.get("CLOUDFLARE_ZONE_ID_CERNIQ_APP", "").strip() or "cerniq.app"
    z_neanelu = os.environ.get("CLOUDFLARE_ZONE_ID_NEANELU_RO", "").strip() or "neanelu.ro"
    return [
        # cerniq.app
        RecordSpec(z_cerniq, "A", "cerniq.app", orchestrator_ip),
        RecordSpec(z_cerniq, "CNAME", "www.cerniq.app", "cerniq.app"),
        RecordSpec(z_cerniq, "A", "api.cerniq.app", orchestrator_ip),
        RecordSpec(z_cerniq, "A", "admin.cerniq.app", orchestrator_ip),
        RecordSpec(z_cerniq, "A", "staging.cerniq.app", orchestrator_ip),
        RecordSpec(z_cerniq, "A", "api.staging.cerniq.app", orchestrator_ip),
        RecordSpec(z_cerniq, "A", "admin.staging.cerniq.app", orchestrator_ip),
        RecordSpec(z_cerniq, "A", "dev.cerniq.app", orchestrator_ip),
        RecordSpec(z_cerniq, "A", "api.dev.cerniq.app", orchestrator_ip),
        RecordSpec(z_cerniq, "A", "admin.dev.cerniq.app", orchestrator_ip),
        # neanelu.ro
        RecordSpec(z_neanelu, "A", "otel-cerniq.neanelu.ro", orchestrator_ip),
        # Cerniq-only Loki push endpoint (scoped allowlist via Traefik router labels)
        RecordSpec(z_neanelu, "A", "logs-cerniq.neanelu.ro", orchestrator_ip),
    ]


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        description="Idempotent Cloudflare DNS sync for Cerniq migration (F1.3).",
    )
    ap.add_argument("--apply", action="store_true", help="Actually create/update records (default: dry-run).")
    ap.add_argument("--orchestrator-ip", default="77.42.76.185", help="Traefik orchestrator public IP.")
    args = ap.parse_args(argv)

    token = _env("CLOUDFLARE_API_TOKEN")
    specs = _specs(args.orchestrator_ip)
    zones: dict[str, str] = {}

    print(f"[INFO] mode={'APPLY' if args.apply else 'DRY_RUN'}")
    print(f"[INFO] orchestrator_ip={args.orchestrator_ip}")

    changes = 0
    for s in specs:
        status, msg = _upsert(s, token=token, apply=args.apply, zones=zones)
        print(f"[{status}] {msg}")
        if status in ("CREATE", "UPDATE", "CREATED", "UPDATED"):
            changes += 1

    if not args.apply:
        print("[INFO] Dry-run only. Re-run with --apply to make changes.")
    else:
        print(f"[OK] Applied. changed={changes}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

