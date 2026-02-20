#!/usr/bin/env python3
import datetime as dt
import os
import re
import shutil
import sys
from pathlib import Path


TARGET = Path("/opt/traefik/dynamic/cerniq.yml")


def sha256(p: Path) -> str:
    import hashlib

    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    if not TARGET.exists():
        print(f"ERROR: missing target: {TARGET}", file=sys.stderr)
        return 2

    before_sha = sha256(TARGET)
    text = TARGET.read_text(errors="replace")
    lines = text.splitlines(True)

    # Find middleware definition.
    mw_idx = None
    for i, line in enumerate(lines):
        if line.strip() == "cerniq-otlp-allowlist:":
            mw_idx = i
            break
    if mw_idx is None:
        print("result=NO_CHANGE reason=middleware_not_found")
        print(f"sha_before={before_sha}")
        return 0

    mw_indent = len(lines[mw_idx]) - len(lines[mw_idx].lstrip(" "))

    # Find the "sourceRange:" line within this block.
    src_idx = None
    for j in range(mw_idx + 1, len(lines)):
        l = lines[j]
        if l.strip() == "":
            continue
        indent = len(l) - len(l.lstrip(" "))
        if indent <= mw_indent:
            break
        if l.strip() == "sourceRange:":
            src_idx = j
            break
    if src_idx is None:
        print("result=NO_CHANGE reason=sourceRange_not_found")
        print(f"sha_before={before_sha}")
        return 0

    src_indent = len(lines[src_idx]) - len(lines[src_idx].lstrip(" "))

    # Collect list item lines following sourceRange.
    dash_re = re.compile(r"^(\s*)-\s*(.+?)\s*$")
    item_idxs: list[int] = []
    items: list[str] = []
    for j in range(src_idx + 1, len(lines)):
        l = lines[j]
        if l.strip() == "":
            continue
        indent = len(l) - len(l.lstrip(" "))
        # Stop when leaving the sourceRange list context.
        if indent <= src_indent and not l.lstrip().startswith("-"):
            break

        m = dash_re.match(l)
        if not m:
            # If we already saw items, stop at first non-item.
            if item_idxs:
                break
            continue
        item_idxs.append(j)
        items.append(m.group(2))

    if not item_idxs:
        print("result=NO_CHANGE reason=no_items_found")
        print(f"sha_before={before_sha}")
        return 0

    # Normalize items: ensure quotes and proper indentation (src_indent + 2).
    wanted_indent = " " * (src_indent + 2)
    normalized = []
    for raw in items:
        v = raw.strip().strip('"').strip("'")
        normalized.append(f'{wanted_indent}- "{v}"\n')

    # Only change if any line differs.
    existing_block = [lines[i] for i in item_idxs]
    if existing_block == normalized:
        print("result=NO_CHANGE reason=already_normalized")
        print(f"sha_before={before_sha}")
        return 0

    # Backup + write.
    ts = dt.datetime.now(dt.UTC).strftime("%Y%m%dT%H%M%SZ")
    backup = TARGET.with_suffix(TARGET.suffix + f".bak.{ts}")
    shutil.copy2(TARGET, backup)

    for k, idx in enumerate(item_idxs):
        lines[idx] = normalized[k]

    tmp = TARGET.with_suffix(TARGET.suffix + f".tmp.{os.getpid()}")
    tmp.write_text("".join(lines))
    os.replace(tmp, TARGET)

    after_sha = sha256(TARGET)
    print("result=CHANGED")
    print(f"target={TARGET}")
    print(f"backup={backup}")
    print(f"sha_before={before_sha}")
    print(f"sha_after={after_sha}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

