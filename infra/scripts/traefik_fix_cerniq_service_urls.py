#!/usr/bin/env python3
"""Fix Cerniq service URLs in Traefik runtime config (dynamic_conf.yml).

Replaces direct CT IP:port URLs with VIP gateway URLs to match the repo
cerniq.yml (SoT). Traefik auto-reloads when the file changes (watch: true).

Changes:
  Production (CT109):
    http://10.0.1.109:64000  ->  http://10.0.1.10:29000
    http://10.0.1.109:64010  ->  http://10.0.1.10:29010
    http://10.0.1.109:64012  ->  http://10.0.1.10:29012
  Staging (CT110):
    http://10.0.1.110:64000  ->  http://10.0.1.10:19000
    http://10.0.1.110:64010  ->  http://10.0.1.10:19010
    http://10.0.1.110:64012  ->  http://10.0.1.10:19012

Usage (on orchestrator):
    python3 traefik_fix_cerniq_service_urls.py [--dry-run]
"""
import argparse
import datetime as dt
import shutil
import sys
from pathlib import Path

DYNAMIC_CONF = Path("/opt/traefik/dynamic_conf.yml")

# (old_url, new_url) pairs.
REPLACEMENTS = [
    # Production (CT109 direct -> VIP gateway 29xxx)
    ("http://10.0.1.109:64000", "http://10.0.1.10:29000"),
    ("http://10.0.1.109:64010", "http://10.0.1.10:29010"),
    ("http://10.0.1.109:64012", "http://10.0.1.10:29012"),
    # Staging (CT110 direct -> VIP gateway 19xxx)
    ("http://10.0.1.110:64000", "http://10.0.1.10:19000"),
    ("http://10.0.1.110:64010", "http://10.0.1.10:19010"),
    ("http://10.0.1.110:64012", "http://10.0.1.10:19012"),
]


def main() -> int:
    ap = argparse.ArgumentParser(description="Fix Cerniq service URLs in dynamic_conf.yml")
    ap.add_argument("--dry-run", action="store_true", help="Show changes without applying")
    args = ap.parse_args()

    if not DYNAMIC_CONF.exists():
        print(f"ERROR: {DYNAMIC_CONF} not found", file=sys.stderr)
        return 1

    content = DYNAMIC_CONF.read_text()
    original = content

    changes = []
    for old, new in REPLACEMENTS:
        count = content.count(old)
        if count > 0:
            content = content.replace(old, new)
            changes.append(f"  {old} -> {new} ({count} occurrence(s))")

    if not changes:
        print("No changes needed — all URLs already correct.")
        return 0

    print("Changes to apply:")
    for c in changes:
        print(c)

    if args.dry_run:
        print("\n(dry-run: no changes written)")
        return 0

    # Backup.
    ts = dt.datetime.now(dt.UTC).strftime("%Y%m%dT%H%M%SZ")
    backup = DYNAMIC_CONF.with_suffix(f".yml.bak.{ts}")
    shutil.copy2(DYNAMIC_CONF, backup)
    print(f"\nBackup: {backup}")

    # Write.
    DYNAMIC_CONF.write_text(content)
    print(f"Updated: {DYNAMIC_CONF}")
    print("Traefik will auto-reload (watch: true).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
