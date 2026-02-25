#!/usr/bin/env bash
set -euo pipefail

echo "== otlp_gateway_e2e_test_ct =="
date -Is || true
echo "hostname=$(hostname)"
echo "ip=$(hostname -I | tr -s ' ' | sed 's/ $//')"
echo

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl_missing"
  exit 2
fi

URL="https://otel-cerniq.neanelu.ro/v1/traces"
VIP_IP="10.0.1.10"
HOST="otel-cerniq.neanelu.ro"

echo "# DNS baseline (getent)"
getent hosts "${HOST}" || true
echo

echo "# Test A: direct (no --resolve)"
code_direct="$(curl -sk -o /tmp/otlp_direct_body.txt -w '%{http_code}' \
  --connect-timeout 3 --max-time 8 \
  --http1.1 -X POST -H 'Content-Type: application/x-protobuf' --data-binary '' \
  "${URL}" || true)"
echo "http_code_direct=${code_direct}"
echo "body_direct_head:"
sed -n '1,20p' /tmp/otlp_direct_body.txt 2>/dev/null || true
echo

echo "# Test B: force VIP via --resolve (SNI preserved)"
code_vip="$(curl -sk -o /tmp/otlp_vip_body.txt -w '%{http_code}' \
  --connect-timeout 3 --max-time 8 \
  --resolve "${HOST}:443:${VIP_IP}" \
  --http1.1 -X POST -H 'Content-Type: application/x-protobuf' --data-binary '' \
  "${URL}" || true)"
echo "http_code_vip=${code_vip}"
echo "body_vip_head:"
sed -n '1,20p' /tmp/otlp_vip_body.txt 2>/dev/null || true
echo

echo "# Interpretation"
echo "expected: VIP request from CT109/CT110 should NOT be 403/502; direct may be 403 due to NAT public IP."
if [ "${code_vip}" = "403" ]; then
  echo "result=FAIL reason=vip_allowlist_blocked"
  exit 1
fi
if [ "${code_vip}" = "502" ]; then
  echo "result=FAIL reason=vip_upstream_bad_gateway"
  exit 1
fi
if [ "${code_vip}" = "000" ]; then
  echo "result=FAIL reason=vip_connect_failed"
  exit 1
fi
echo "result=OK (vip request not blocked by allowlist)"

rm -f /tmp/otlp_direct_body.txt /tmp/otlp_vip_body.txt || true

