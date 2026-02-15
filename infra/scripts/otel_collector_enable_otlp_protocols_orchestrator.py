#!/usr/bin/env python3
import datetime as dt
import os
import re
import shutil
import sys
from pathlib import Path


TARGET = Path("/opt/observability/otel/otel-collector.yml")


def sha256(p: Path) -> str:
    import hashlib

    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    if not TARGET.exists():
        print(f"ERROR: missing {TARGET}", file=sys.stderr)
        return 2

    before_sha = sha256(TARGET)
    txt = TARGET.read_text(errors="replace").splitlines(True)

    changed = False
    out: list[str] = []

    # Minimal, targeted normalization:
    # under receivers.otlp.protocols, ensure grpc/http are objects not null:
    #   grpc: {} / http: {}
    grpc_re = re.compile(r"^(\s*)grpc:\s*$")
    http_re = re.compile(r"^(\s*)http:\s*$")

    for line in txt:
        m = grpc_re.match(line)
        if m:
            out.append(f"{m.group(1)}grpc: {{}}\n")
            changed = True
            continue
        m = http_re.match(line)
        if m:
            out.append(f"{m.group(1)}http: {{}}\n")
            changed = True
            continue
        out.append(line)

    if not changed:
        print("result=NO_CHANGE reason=no_null_protocols_found")
        print(f"sha_before={before_sha}")
        return 0

    ts = dt.datetime.now(dt.UTC).strftime("%Y%m%dT%H%M%SZ")
    backup = TARGET.with_suffix(TARGET.suffix + f".bak.{ts}")
    shutil.copy2(TARGET, backup)

    tmp = TARGET.with_suffix(TARGET.suffix + f".tmp.{os.getpid()}")
    tmp.write_text("".join(out))
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

