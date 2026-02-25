#!/usr/bin/env bash
set -euo pipefail

echo "== otel_collector_restart_orchestrator =="
date -Is || true
echo "hostname=$(hostname)"
echo

echo "# pre: otel-collector status"
docker ps --filter name='^otel-collector$' --format '{{.Names}} {{.Status}}' || true
echo

echo "# restart otel-collector"
docker restart otel-collector
echo

echo "# post: wait running (max ~30s)"
python3 - <<'PY'
import subprocess, time

deadline = time.time() + 30
while True:
    out = subprocess.check_output(["docker", "inspect", "-f", "{{.State.Status}}", "otel-collector"], text=True).strip()
    print("otel_collector_state=", out, flush=True)
    if out == "running":
        break
    if time.time() > deadline:
        raise SystemExit(1)
    time.sleep(2)
PY

