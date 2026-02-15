#!/usr/bin/env python3
import datetime as dt
import os
import re
import shutil
import sys
from pathlib import Path


TARGET = Path("/opt/traefik/dynamic_conf.yml")
ENTRY = "10.0.1.10/32"


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
    lines = TARGET.read_text(errors="replace").splitlines(True)

    # Locate middleware definition line exactly.
    idx = None
    for i, line in enumerate(lines):
        if line.strip() == "cerniq-otlp-allowlist:":
            idx = i
            break

    if idx is None:
        print("result=NO_CHANGE reason=middleware_not_found")
        print(f"target={TARGET}")
        print(f"sha_before={before_sha}")
        return 0

    # Find sourceRange under that middleware block.
    # We'll walk forward until indentation drops back to <= middleware indent.
    mw_indent = len(lines[idx]) - len(lines[idx].lstrip(" "))
    src_idx = None
    for j in range(idx + 1, len(lines)):
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
        print(f"target={TARGET}")
        print(f"sha_before={before_sha}")
        return 0

    # Check if ENTRY already exists within contiguous list items following sourceRange.
    # List items might be at same indent as sourceRange (valid YAML) or indented.
    entry_re = re.compile(r"^\s*-\s*" + re.escape(ENTRY) + r"\s*$")
    list_item_re = re.compile(r"^(\s*)-\s+.+$")

    insert_at = None
    dash_indent_str = None
    seen_any_list = False

    for j in range(src_idx + 1, len(lines)):
        l = lines[j]
        if l.strip() == "":
            continue
        indent = len(l) - len(l.lstrip(" "))
        src_indent = len(lines[src_idx]) - len(lines[src_idx].lstrip(" "))
        if indent <= src_indent and not l.lstrip().startswith("-"):
            break

        m = list_item_re.match(l)
        if not m:
            # Stop once list ends.
            if seen_any_list:
                break
            continue

        seen_any_list = True
        dash_indent_str = m.group(1)
        if entry_re.match(l):
            print("result=NO_CHANGE reason=already_present")
            print(f"target={TARGET}")
            print(f"sha_before={before_sha}")
            return 0
        insert_at = j + 1

    if insert_at is None:
        # No list items found; insert directly after sourceRange with same indent.
        src_indent = len(lines[src_idx]) - len(lines[src_idx].lstrip(" "))
        dash_indent_str = " " * src_indent
        insert_at = src_idx + 1

    new_line = f"{dash_indent_str}- {ENTRY}\n"
    lines.insert(insert_at, new_line)

    ts = dt.datetime.now(dt.UTC).strftime("%Y%m%dT%H%M%SZ")
    backup = TARGET.with_suffix(TARGET.suffix + f".bak.{ts}")
    shutil.copy2(TARGET, backup)

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

