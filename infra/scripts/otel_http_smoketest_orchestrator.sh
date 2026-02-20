#!/usr/bin/env bash
set -euo pipefail

echo "== otel_http_smoketest_orchestrator =="
date -Is || true
echo "hostname=$(hostname)"
echo

echo "# POST empty protobuf to OTLP HTTP receiver (expected: 400/415, not reset)"
code="$(curl -sv --http1.1 --max-time 5 \
  -o /tmp/otlp_http_body.txt -w '%{http_code}' \
  -X POST -H 'Content-Type: application/x-protobuf' --data-binary '' \
  http://127.0.0.1:4318/v1/traces 2>/tmp/otlp_http_err.txt || true)"
echo "http_code=${code}"
echo "-- stderr head --"
sed -n '1,40p' /tmp/otlp_http_err.txt || true
echo "-- body head --"
sed -n '1,40p' /tmp/otlp_http_body.txt || true
rm -f /tmp/otlp_http_err.txt /tmp/otlp_http_body.txt || true

