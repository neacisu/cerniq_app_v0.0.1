#!/usr/bin/env bash
set -euo pipefail

echo "== traefik_restart_orchestrator =="
date -Is || true
echo "hostname=$(hostname)"
echo

echo "# pre: traefik status"
docker ps --filter name='^traefik$' --format '{{.Names}} {{.Status}}' || true
echo

echo "# restart traefik (may briefly impact ingress)"
docker restart traefik
echo

echo "# post: wait running (max ~30s)"
python3 - <<'PY'
import subprocess, time

deadline = time.time() + 30
while True:
    try:
        out = subprocess.check_output(
            ["docker", "inspect", "-f", "{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}", "traefik"],
            text=True,
        ).strip()
    except Exception as e:
        out = f"inspect_error {e}"
    print("traefik_state=", out, flush=True)
    if out.startswith("running"):
        break
    if time.time() > deadline:
        raise SystemExit(1)
    time.sleep(2)
PY

