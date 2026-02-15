#!/usr/bin/env bash
set -euo pipefail

echo "== preflight_extins_hz247_host =="
date -Is || true
echo "hostname=$(hostname)"
echo "ip=$(hostname -I | tr -s ' ' | sed 's/ $//')"
echo "os=$( . /etc/os-release && echo \"${PRETTY_NAME}\" )"
echo "kernel=$(uname -r)"
echo

echo "# haproxy"
if systemctl is-active haproxy >/dev/null 2>&1; then
  echo "haproxy=active"
else
  echo "haproxy=inactive"
fi
echo

echo "# listeners on VIP 10.0.1.10"
sudo ss -lntp | egrep "10\\.0\\.1\\.10:(443|6379|19000|19010|19012|29000|29010|29012)\\b" || true
echo

echo "# iptables: VIP allowlist excerpts"
sudo iptables -S | egrep "10\\.0\\.1\\.10/32|--dport (443|6379)|--dports 19100|--dports 29100|10\\.0\\.1\\.(109|110)/32|10\\.0\\.0\\.2/32" | sed -n "1,200p" || true
echo

echo "# iptables: FORWARD egress policy excerpts (CT107/108/109/110)"
sudo iptables -S FORWARD | egrep "10\\.0\\.1\\.(107|108|109|110)/32" | sed -n "1,260p" || true
echo

echo "# pct list (CT placement on this node)"
pct list || true
echo

echo "# CT107 status/config summary"
pct status 107 2>/dev/null || true
pct config 107 2>/dev/null | sed -n "1,120p" || true

