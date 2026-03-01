#!/usr/bin/env bash
set -euo pipefail

echo "== otel_collector_intra_network_probe2_orchestrator =="
date -Is || true
echo "hostname=$(hostname)"
echo

targets=(grafana prometheus alertmanager loki tempo)

for c in "${targets[@]}"; do
  echo "---- container=${c} ----"
  if ! docker inspect "${c}" >/dev/null 2>&1; then
    echo "missing"
    echo
    continue
  fi

  # Best-effort: try sh -lc + curl/wget/python3
  docker exec "${c}" sh -lc '
    set -e
    echo "inside=$(hostname)"
    if command -v curl >/dev/null 2>&1; then
      echo "-- curl tcp connect --"
      curl -sv --max-time 4 http://otel-collector:4318/ 2>&1 | sed -n "1,25p" || true
      echo "-- curl traces empty protobuf --"
      curl -sv --http1.1 --max-time 4 -X POST -H "Content-Type: application/x-protobuf" --data-binary "" http://otel-collector:4318/v1/traces 2>&1 | sed -n "1,35p" || true
    elif command -v wget >/dev/null 2>&1; then
      wget -S -O- -T 4 http://otel-collector:4318/ 2>&1 | sed -n "1,35p" || true
    elif command -v python3 >/dev/null 2>&1; then
      python3 - <<PY
import socket
s=socket.socket(); s.settimeout(3)
try:
  s.connect(("otel-collector",4318)); print("tcp_connect OK")
except Exception as e:
  print("tcp_connect FAIL", e)
finally:
  s.close()
PY
    else
      echo "no_tooling"
    fi
  ' 2>&1 | sed -n '1,160p' || true
  echo
done

