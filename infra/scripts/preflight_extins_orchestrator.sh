#!/usr/bin/env bash
set -euo pipefail

echo "== preflight_extins_orchestrator =="
date -Is || true
echo "hostname=$(hostname)"
echo "ip=$(hostname -I | tr -s ' ' | sed 's/ $//')"
# shellcheck disable=SC1091
echo "os=$( . /etc/os-release && echo "\"${PRETTY_NAME}\"" )"
echo "kernel=$(uname -r)"
echo

echo "# docker versions"
docker --version 2>/dev/null || echo "docker_missing"
docker compose version 2>/dev/null || echo "docker_compose_missing"
echo

echo "# docker ps (core control-plane)"
docker ps --format '{{.Names}} {{.Status}}' | grep -E '^(traefik|openbao|prometheus|grafana|loki|tempo|alertmanager|vector|otel-collector|cadvisor|node-exporter) ' | sort || true
echo

echo "# docker inspect (status + health) core control-plane"
for c in traefik openbao prometheus grafana loki tempo alertmanager vector otel-collector cadvisor node-exporter; do
  if docker inspect "$c" >/dev/null 2>&1; then
    printf '%s\t' "$c"
    docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$c" || true
  else
    printf '%s\tmissing\n' "$c"
  fi
done
echo

echo "# OpenBao sys/health (status + safe fields)"
status="$(curl -sk -o /tmp/openbao_health.json -w '%{http_code}' https://s3cr3ts.neanelu.ro/v1/sys/health || true)"
echo "openbao_http_status=${status}"
python3 - <<'PY' || true
import json
p = "/tmp/openbao_health.json"
try:
    j = json.load(open(p, "r"))
    for k in ["initialized", "sealed", "standby", "version"]:
        if k in j:
            print(f"openbao_{k}={j[k]}")
except Exception as e:
    print("openbao_health_parse_error", e)
PY
echo

echo "# Traefik dynamic config: cerniq.yml"
CERNIQ_YML_PATH="/opt/traefik/dynamic/cerniq.yml"
if [ -f "$CERNIQ_YML_PATH" ]; then
  ls -la "$CERNIQ_YML_PATH" || true
  actual_sha="$(sha256sum "$CERNIQ_YML_PATH" | awk '{print $1}')"
  echo "cerniq_yml_sha256_actual=${actual_sha}"
  if [ -n "${CERNIQ_YML_EXPECTED_SHA256:-}" ]; then
    echo "cerniq_yml_sha256_expected=${CERNIQ_YML_EXPECTED_SHA256}"
    if [ "${CERNIQ_YML_EXPECTED_SHA256}" = "${actual_sha}" ]; then
      echo "cerniq_yml_sha256_match=YES"
    else
      echo "cerniq_yml_sha256_match=NO"
    fi
  else
    echo "cerniq_yml_sha256_expected=missing_env(CERNIQ_YML_EXPECTED_SHA256)"
  fi
else
  echo "cerniq_yml_missing path=${CERNIQ_YML_PATH}"
fi
echo

echo "# Traefik file provider (SoT): /opt/traefik/dynamic/*.yml (sanity: contains cerniq identifiers)"
CERNIQ_YML="/opt/traefik/dynamic/cerniq.yml"
if [ -f "${CERNIQ_YML}" ]; then
  ls -la "${CERNIQ_YML}" || true
  python3 - <<'PY' || true
from pathlib import Path
txt = Path("/opt/traefik/dynamic/cerniq.yml").read_text(errors="replace")
need = ["cerniq.app", "api.cerniq.app", "admin.cerniq.app", "staging.cerniq.app", "otel-cerniq.neanelu.ro"]
print("cerniq_yml_contains:")
for s in need:
    print(f"  {s}={'YES' if s in txt else 'NO'}")
print("cerniq_yml_cerniq_occurrences=", txt.count("cerniq"))
PY
else
  echo "cerniq_yml_missing path=${CERNIQ_YML}"
fi

