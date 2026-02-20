#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass(frozen=True)
class Rule:
    line: str


HBA_PATH = Path("/etc/postgresql/18/main/pg_hba.conf")

RULES = [
    Rule("# --- Cerniq.app additive rules (do not remove trust rules below) ---\n"),
    Rule("host cerniq cerniq_vault 10.0.0.2/32 scram-sha-256\n"),
    Rule("host cerniq_staging cerniq_vault 10.0.0.2/32 scram-sha-256\n"),
    Rule("host cerniq c3rn1q 10.0.1.109/32 scram-sha-256\n"),
    Rule("host cerniq_staging c3rn1q 10.0.1.110/32 scram-sha-256\n"),
    Rule("# --- end cerniq.app rules ---\n"),
]


def _utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")


def main() -> int:
    if not HBA_PATH.exists():
        raise SystemExit(f"[ERROR] pg_hba.conf not found: {HBA_PATH}")

    original_lines = HBA_PATH.read_text(encoding="utf-8", errors="replace").splitlines(True)
    original_text = "".join(original_lines)

    needed = [r.line.strip() for r in RULES if r.line.strip() and not r.line.lstrip().startswith("#")]
    missing = [r for r in needed if r not in original_text]

    if not missing:
        print("[OK] NOOP: Cerniq rules already present")
        return 0

    # Backup first.
    backup_path = HBA_PATH.with_suffix(HBA_PATH.suffix + f".bak.{_utc_stamp()}")
    backup_path.write_text(original_text, encoding="utf-8")

    # Insert before first 'trust' host entry (keep existing behavior for other projects).
    insert_at = 0
    for idx, line in enumerate(original_lines):
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        parts = s.split()
        if parts and parts[-1] == "trust":
            insert_at = idx
            break

    new_lines = original_lines[:insert_at] + [r.line for r in RULES] + original_lines[insert_at:]
    HBA_PATH.write_text("".join(new_lines), encoding="utf-8")

    print(f"[OK] UPDATED: inserted_at_line={insert_at+1} backup={backup_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

