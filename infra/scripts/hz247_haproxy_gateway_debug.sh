#!/usr/bin/env bash
set -euo pipefail

echo "== hz247_haproxy_gateway_debug =="
date -Is || true
echo "hostname=$(hostname)"
echo

echo "# haproxy status"
systemctl is-active haproxy >/dev/null 2>&1 && echo "haproxy=active" || echo "haproxy=inactive"
echo

CFG="/etc/haproxy/haproxy.cfg"
echo "# haproxy.cfg location"
if [ -f "$CFG" ]; then
  ls -la "$CFG" || true
else
  echo "missing:${CFG}"
fi
echo

echo "# grep-like extract (bind 10.0.1.10 / port 443 / backend servers)"
python3 - <<'PY'
from pathlib import Path

paths = [Path("/etc/haproxy/haproxy.cfg")]
extra = list(Path("/etc/haproxy").glob("**/*.cfg"))
for p in extra:
    if p not in paths:
        paths.append(p)

need = ("10.0.1.10", ":443", "frontend", "backend", "bind", "server", "mode tcp", "option tcplog")

for p in paths:
    if not p.is_file():
        continue
    txt = p.read_text(errors="replace").splitlines()
    hits = []
    for i, line in enumerate(txt, start=1):
        if any(n in line for n in need):
            hits.append((i, line))
    if not hits:
        continue
    print(f"## FILE {p} (hits={len(hits)})")
    for i, line in hits[:240]:
        print(f"{i}: {line}")
    if len(hits) > 240:
        print("... truncated ...")
    print()
PY
echo

echo "# listeners (ss) for VIP"
sudo ss -lntp | grep -E '10\\.0\\.1\\.10:(443|6379|19000|19010|19012|29000|29010|29012)\\b' || true

