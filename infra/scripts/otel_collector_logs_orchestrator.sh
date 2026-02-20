#!/usr/bin/env bash
set -euo pipefail

echo "== otel_collector_logs_orchestrator =="
date -Is || true
echo "hostname=$(hostname)"
echo

echo "# docker ps (otel-collector)"
docker ps --filter name='^otel-collector$' --format '{{.Names}} {{.Status}}' || true
echo

echo "# docker logs otel-collector (last 200 lines, last 120m)"
docker logs --since 120m otel-collector 2>/dev/null | tail -n 200 || true

