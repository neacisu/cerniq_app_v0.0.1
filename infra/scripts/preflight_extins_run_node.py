#!/usr/bin/env python3
import argparse
import datetime as dt
import os
import shlex
import subprocess
import sys
from pathlib import Path


def run(cmd: list[str], *, check: bool = True) -> subprocess.CompletedProcess:
    # Stream output live (subprocess.run does that by default).
    return subprocess.run(cmd, check=check)


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
            "Ruleaza un script pe un node (ex: hz.247) cu upload temporar in /tmp, "
            "executie, apoi cleanup complet."
        )
    )
    ap.add_argument("--node", required=True, help="Host SSH, ex: hz.247")
    ap.add_argument("--script", required=True, help="Cale catre scriptul .sh de rulat pe node")
    ap.add_argument(
        "--env",
        action="append",
        default=[],
        help="Variabila de mediu KEY=VALUE (repetabil). Se aplica la executia remote prin `sudo env ...`.",
    )
    ap.add_argument(
        "--remote-prefix",
        default="/tmp/cerniq-preflight-extins-node",
        help="Prefix director temporar pe node",
    )
    args = ap.parse_args()

    script_path = Path(args.script)
    if not script_path.exists():
        print(f"ERROR: script missing: {script_path}", file=sys.stderr)
        return 2

    ts = dt.datetime.now(dt.UTC).strftime("%Y%m%dT%H%M%SZ")
    node_tmp = f"{args.remote_prefix}-{ts}-{os.getpid()}"
    remote_script = f"{node_tmp}/{script_path.name}"

    b64 = subprocess.check_output(
        ["python3", "-c", "import base64,sys;print(base64.b64encode(sys.stdin.buffer.read()).decode())"],
        input=script_path.read_bytes(),
    ).decode().strip()

    mk_and_write = (
        f"set -euo pipefail; "
        f"mkdir -p {shlex.quote(node_tmp)}; "
        f"python3 - <<'PY'\n"
        f"import base64\n"
        f"data=base64.b64decode({b64!r})\n"
        f"open({remote_script!r}, 'wb').write(data)\n"
        f"PY\n"
        f"chmod 0755 {shlex.quote(remote_script)}"
    )

    run(ssh(args.node, mk_and_write))
    try:
        env_pairs: list[tuple[str, str]] = []
        for item in args.env:
            if "=" not in item:
                print(f"ERROR: --env must be KEY=VALUE, got: {item}", file=sys.stderr)
                return 2
            k, v = item.split("=", 1)
            env_pairs.append((k, v))

        env_prefix = "env"
        for k, v in env_pairs:
            env_prefix += f" {shlex.quote(k)}={shlex.quote(v)}"

        run(
            ssh(args.node, f"set -euo pipefail; sudo {env_prefix} {shlex.quote(remote_script)}"),
            check=False,
        )
    finally:
        run(ssh(args.node, f"rm -rf {shlex.quote(node_tmp)} || true"), check=False)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

