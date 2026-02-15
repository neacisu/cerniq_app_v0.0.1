#!/usr/bin/env bash
set -euo pipefail

echo "== otel_collector_upstream_debug_orchestrator =="
date -Is || true
echo "hostname=$(hostname)"
echo

echo "# host listeners (4317/4318)"
sudo ss -lntp | egrep ':(4317|4318)\\b' || true
echo

echo "# container otel-collector inspect (ports + network mode)"
if docker inspect otel-collector >/dev/null 2>&1; then
  docker inspect -f 'name={{.Name}} status={{.State.Status}} networkMode={{.HostConfig.NetworkMode}} ports={{json .NetworkSettings.Ports}}' otel-collector || true
  echo "-- networks --"
  docker inspect -f '{{json .NetworkSettings.Networks}}' otel-collector | python3 -c "import json,sys; j=json.load(sys.stdin); print(list(j.keys()));" || true
  echo "-- container IPs --"
  docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{println $k $v.IPAddress}}{{end}}' otel-collector || true
else
  echo "otel-collector container missing"
fi
echo

echo "# curl to OTEL endpoints via host loopback (expected if Traefik points to 127.0.0.1)"
for u in http://127.0.0.1:4318/ http://127.0.0.1:4318/v1/traces; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 --max-time 4 \"$u\" || true)"
  echo "${u} -> ${code}"
done
echo

echo "# curl to OTEL endpoints via container IP (best-effort)"
ip="$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{if $v.IPAddress}}{{println $v.IPAddress}}{{end}}{{end}}' otel-collector 2>/dev/null | head -n1 || true)"
if [ -n "${ip}" ]; then
  for u in "http://${ip}:4318/" "http://${ip}:4318/v1/traces"; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 --max-time 4 \"$u\" || true)"
    echo "${u} -> ${code}"
  done
else
  echo "no_container_ip_detected"
fi

