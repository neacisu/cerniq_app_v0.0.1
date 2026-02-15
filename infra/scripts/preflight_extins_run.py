#!/usr/bin/env python3
import argparse
import datetime as dt
import os
import shlex
import subprocess
import sys
from pathlib import Path


def run(cmd: list[str], *, check: bool = True) -> subprocess.CompletedProcess:
    # Stream output live to allow terminal monitoring.
    p = subprocess.run(cmd, check=check)
    return p


def ssh(host: str, remote_cmd: str) -> list[str]:
    return [
        "ssh",
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=8",
        host,
        remote_cmd,
    ]


def main() -> int:
    ap = argparse.ArgumentParser(
        description=(
            "Pre-flight extins: urca script temporar pe noduri Proxmox, "
            "il pct push in CT-uri, ruleaza local in CT, apoi sterge."
        )
    )
    ap.add_argument("--ct", action="append", default=[], help="CT id (repetabil), ex: --ct 109 --ct 110")
    ap.add_argument(
        "--node-for-ct",
        action="append",
        default=[],
        help="Mapare node:ct, ex: --node-for-ct hz.223:109",
    )
    ap.add_argument(
        "--script",
        default=str(Path(__file__).with_name("preflight_extins_ct.sh")),
        help="Calea catre scriptul rulat in CT",
    )
    ap.add_argument(
        "--remote-prefix",
        default="/tmp/cerniq-preflight-extins",
        help="Prefix pentru directoare temporare remote pe noduri",
    )
    args = ap.parse_args()

    script_path = Path(args.script)
    if not script_path.exists():
        print(f"ERROR: script missing: {script_path}", file=sys.stderr)
        return 2

    # Default targets per setup curent:
    # - CT109/CT110 pe hz.223
    # - (optional) CT107 pe hz.247
    mapping: dict[str, list[str]] = {
        "hz.223": ["109", "110"],
        # "hz.247": ["107"],  # optional, activati explicit daca vreti
    }

    for m in args.node_for_ct:
        node, ct = m.split(":", 1)
        mapping.setdefault(node, [])
        if ct not in mapping[node]:
            mapping[node].append(ct)

    if args.ct:
        # If ct list provided, keep only those CTs in mapping.
        keep = set(args.ct)
        mapping = {node: [ct for ct in cts if ct in keep] for node, cts in mapping.items()}
        mapping = {node: cts for node, cts in mapping.items() if cts}

    if not mapping:
        print("ERROR: no targets selected", file=sys.stderr)
        return 2

    ts = dt.datetime.now(dt.UTC).strftime("%Y%m%dT%H%M%SZ")
    prefix = f"{args.remote_prefix}-{ts}-{os.getpid()}"

    script_bytes = script_path.read_bytes()
    script_b64 = subprocess.check_output(["python3", "-c", "import base64,sys;print(base64.b64encode(sys.stdin.buffer.read()).decode())"], input=script_bytes)
    script_b64_str = script_b64.decode().strip()

    for node, cts in mapping.items():
        if not cts:
            continue
        print(f"\n### NODE {node} -> CTs {', '.join(cts)}", flush=True)

        # Create a temp dir and materialize the script on the node.
        node_tmp = f"{prefix}-{node.replace('.', '_')}"
        remote_script = f"{node_tmp}/preflight_extins_ct.sh"

        mk_and_write = (
            f"set -euo pipefail; "
            f"mkdir -p {shlex.quote(node_tmp)}; "
            f"python3 - <<'PY'\n"
            f"import base64\n"
            f"data=base64.b64decode({script_b64_str!r})\n"
            f"open({remote_script!r}, 'wb').write(data)\n"
            f"PY\n"
            f"chmod 0755 {shlex.quote(remote_script)}"
        )
        run(ssh(node, mk_and_write))

        try:
            for ct in cts:
                print(f"\n--- CT {ct} (via {node}) ---", flush=True)
                ct_path = "/tmp/preflight_extins_ct.sh"
                push_cmd = f"set -euo pipefail; pct push {shlex.quote(ct)} {shlex.quote(remote_script)} {shlex.quote(ct_path)} -perms 0755"
                run(ssh(node, push_cmd))

                exec_cmd = f"set -euo pipefail; pct exec {shlex.quote(ct)} -- bash -lc {shlex.quote(ct_path)}"
                run(ssh(node, exec_cmd), check=False)

                cleanup_ct = f"set -euo pipefail; pct exec {shlex.quote(ct)} -- rm -f {shlex.quote(ct_path)} || true"
                run(ssh(node, cleanup_ct), check=False)
        finally:
            # Cleanup temp dir on the node.
            cleanup_node = f"rm -rf {shlex.quote(node_tmp)} || true"
            run(ssh(node, cleanup_node), check=False)

    return 0


if __name__ == '__main__':
    raise SystemExit(main())

