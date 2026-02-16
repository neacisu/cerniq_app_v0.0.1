#!/usr/bin/env bash
set -euo pipefail

echo "== otel_collector_intra_network_probe_orchestrator =="
date -Is || true
echo "hostname=$(hostname)"
echo

echo "# docker ps (vector, otel-collector)"
docker ps --format '{{.Names}} {{.Status}}' | grep -E '^(vector|otel-collector) ' || true
echo

echo "# probe from vector container -> otel-collector:4318"
if docker inspect vector >/dev/null 2>&1; then
  docker exec vector sh -lc '
    set -e
    echo "inside_container=$(hostname)"
    if command -v curl >/dev/null 2>&1; then
      echo "-- curl / (verbose head) --"
      curl -sv --max-time 4 http://otel-collector:4318/ 2>&1 | sed -n "1,30p" || true
      echo "-- curl /v1/traces (empty protobuf) --"
      curl -sv --http1.1 --max-time 4 -X POST -H "Content-Type: application/x-protobuf" --data-binary "" http://otel-collector:4318/v1/traces 2>&1 | sed -n "1,40p" || true
    elif command -v wget >/dev/null 2>&1; then
      echo "-- wget / --"
      wget -S -O- -T 4 http://otel-collector:4318/ 2>&1 | sed -n "1,40p" || true
    elif command -v python3 >/dev/null 2>&1; then
      echo "-- python3 socket probe --"
      python3 - <<PY
import socket
host="otel-collector"
port=4318
s=socket.socket(); s.settimeout(3)
try:
  s.connect((host,port)); print("tcp_connect OK", host, port)
except Exception as e:
  print("tcp_connect FAIL", e)
finally:
  try: s.close()
  except: pass
PY
    else
      echo "no_curl_no_wget_no_python3"
    fi
  ' || true
else
  echo "vector container missing"
fi

