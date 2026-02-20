#!/usr/bin/env bash
set -euo pipefail

echo "== otel_collector_listeners_orchestrator =="
date -Is || true
echo "hostname=$(hostname)"
echo

echo "# docker inspect otel-collector (cmd + mounts)"
docker inspect -f 'Cmd={{json .Config.Cmd}} Args={{json .Args}} Entrypoint={{json .Config.Entrypoint}}' otel-collector || true
echo "-- mounts --"
docker inspect -f '{{range .Mounts}}{{println .Destination " <- " .Source}}{{end}}' otel-collector | sed -n '1,200p' || true
echo

echo "# inside container: listeners"
docker exec otel-collector sh -lc 'set -e; (command -v ss >/dev/null 2>&1 && ss -lntp) || (command -v netstat >/dev/null 2>&1 && netstat -lntp) || (echo no_ss_no_netstat)' || true
echo

echo "# inside container: try curl localhost:4318 (if curl exists)"
docker exec otel-collector sh -lc 'if command -v curl >/dev/null 2>&1; then curl -sv --max-time 3 http://127.0.0.1:4318/ 2>&1 | sed -n "1,40p"; else echo curl_missing; fi' || true
echo

echo "# host: curl verbose 127.0.0.1:4318 (first 40 lines)"
curl -sv --max-time 3 http://127.0.0.1:4318/ 2>&1 | sed -n '1,40p' || true

