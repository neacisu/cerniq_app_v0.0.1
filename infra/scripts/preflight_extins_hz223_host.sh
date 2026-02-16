#!/usr/bin/env bash
set -euo pipefail

echo "== preflight_extins_hz223_host =="
date -Is || true
echo "hostname=$(hostname)"
echo "ip=$(hostname -I | tr -s ' ' | sed 's/ $//')"
echo "os=$( . /etc/os-release && echo "\"${PRETTY_NAME}\"" )"
echo "kernel=$(uname -r)"
echo

echo "# pve-firewall (if present)"
if systemctl list-unit-files 2>/dev/null | grep -q '^pve-firewall\\.service'; then
  systemctl is-active pve-firewall >/dev/null 2>&1 && echo "pve-firewall=active" || echo "pve-firewall=inactive"
else
  echo "pve-firewall=unknown"
fi
echo

echo "# iptables policies (quick)"
sudo iptables -S | sed -n '1,40p' || true
echo

echo "# iptables FORWARD excerpts (CT108/109/110)"
sudo iptables -S FORWARD | grep -E '10\\.0\\.1\\.(108|109|110)/32' | sed -n '1,260p' || true
echo

echo "# iptables FORWARD excerpts (traffic to orchestrator/redis/openbao)"
sudo iptables -S FORWARD | grep -E '10\\.0\\.0\\.2/32|77\\.42\\.76\\.185' | sed -n '1,220p' || true
echo

echo "# iptables PVEFW-FORWARD (first 120; where per-CT rules often live)"
sudo iptables -S PVEFW-FORWARD 2>/dev/null | sed -n '1,120p' || true
echo

echo "# iptables PVEFW-FORWARD excerpts (CT108/109/110, orchestrator 10.0.0.2)"
sudo iptables -S PVEFW-FORWARD 2>/dev/null | grep -E '10\\.0\\.1\\.(108|109|110)/32|10\\.0\\.0\\.2/32|77\\.42\\.76\\.185' | sed -n '1,220p' || true
echo

echo "# pct list (CT placement on this node)"
pct list || true
echo

echo "# CT108/CT109/CT110 status/config summaries"
for id in 108 109 110; do
  echo "---- CT ${id} ----"
  pct status "${id}" 2>/dev/null || true
  pct config "${id}" 2>/dev/null | sed -n '1,140p' || true
done

