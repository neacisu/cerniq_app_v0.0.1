#!/usr/bin/env bash
set -euo pipefail

echo "== traefik_runtime_debug_orchestrator =="
date -Is || true
echo "hostname=$(hostname)"
echo

echo "# Traefik static config (/opt/traefik/traefik.yml) snippet"
if [ -f /opt/traefik/traefik.yml ]; then
  ls -la /opt/traefik/traefik.yml || true
  echo "--- begin snippet ---"
  sed -n '1,220p' /opt/traefik/traefik.yml
  echo "--- end snippet ---"
else
  echo "missing:/opt/traefik/traefik.yml"
fi
echo

echo "# Dynamic config files (stat)"
for p in /opt/traefik/dynamic_conf.yml /opt/traefik/dynamic/cerniq.yml; do
  if [ -f "$p" ]; then
    echo "--- $p ---"
    ls -la "$p" || true
    sha256sum "$p" | awk '{print "sha256=" $1}' || true
  else
    echo "--- $p ---"
    echo "missing"
  fi
done
echo

echo "# Traefik logs (last 120 lines from last 60m)"
if docker inspect traefik >/dev/null 2>&1; then
  docker logs --since 60m traefik 2>/dev/null | tail -n 120 || true
else
  echo "traefik_container_missing"
fi

