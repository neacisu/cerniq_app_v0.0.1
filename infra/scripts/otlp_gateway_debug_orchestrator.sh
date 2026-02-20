#!/usr/bin/env bash
set -euo pipefail

echo "== otlp_gateway_debug_orchestrator =="
date -Is || true
echo "hostname=$(hostname)"
echo

HOST="otel-cerniq.neanelu.ro"
VIP_IP="10.0.1.10"
URL="https://${HOST}/v1/traces"

echo "# cerniq.yml (SoT runtime): host file snippet"
python3 - <<'PY' || true
from pathlib import Path
lines = Path("/opt/traefik/dynamic/cerniq.yml").read_text(errors="replace").splitlines()
needle = "cerniq-otlp-allowlist:"
idxs = [i for i,l in enumerate(lines) if l.strip() == needle]
print("found=", bool(idxs))
if idxs:
    i = idxs[0]
    start = max(0, i-2)
    end = min(len(lines), i+20)
    print("--- snippet ---")
    print("\n".join(lines[start:end]))
    print("--- end snippet ---")
PY
echo

echo "# cerniq.yml (SoT runtime): container file snippet"
if docker exec traefik sh -lc "test -f /etc/traefik/dynamic/cerniq.yml"; then
  docker exec traefik sh -lc "python3 - <<'PY'\nfrom pathlib import Path\nlines = Path('/etc/traefik/dynamic/cerniq.yml').read_text(errors='replace').splitlines()\nneedle='cerniq-otlp-allowlist:'\nidxs=[i for i,l in enumerate(lines) if l.strip()==needle]\nprint('found=', bool(idxs))\nif idxs:\n  i=idxs[0]\n  start=max(0,i-2)\n  end=min(len(lines), i+20)\n  print('--- snippet ---')\n  print('\\n'.join(lines[start:end]))\n  print('--- end snippet ---')\nPY" || true
else
  echo "traefik_container_missing_or_no_shell"
fi
echo

echo "# Request from orchestrator forcing VIP (should NOT be 403 if allowlist effective)"
code_vip="$(curl -sk -o /tmp/otlp_orch_vip_body.txt -w '%{http_code}' \
  --connect-timeout 3 --max-time 8 \
  --resolve "${HOST}:443:${VIP_IP}" \
  -X POST -H 'Content-Type: application/x-protobuf' --data-binary '' \
  "${URL}" || true)"
echo "orch_http_code_vip=${code_vip}"
echo "orch_body_vip_head:"
sed -n '1,10p' /tmp/otlp_orch_vip_body.txt 2>/dev/null || true
echo

echo "# Traefik logs filter (last 5m, rejecting ipwhitelist + traces)"
docker logs --since 5m traefik 2>/dev/null | grep -E 'Rejecting IP|POST /v1/traces|cerniq-otlp-allowlist' | tail -n 80 || true

rm -f /tmp/otlp_orch_vip_body.txt || true

