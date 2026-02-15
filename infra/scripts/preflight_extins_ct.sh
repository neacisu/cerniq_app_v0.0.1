#!/usr/bin/env bash
set -euo pipefail

echo "== preflight_extins_ct =="
date -Is || true
echo "hostname=$(hostname)"
echo "ip=$(hostname -I | tr -s ' ' | sed 's/ $//')"
echo

echo "# docker version"
docker --version 2>/dev/null || echo "docker_missing"
echo

echo "# /opt/cerniq"
if [ -d /opt/cerniq ]; then
  echo "opt_cerniq=present"
  ls -la /opt/cerniq | sed -n '1,80p' || true
else
  echo "opt_cerniq=missing"
fi
echo

echo "# docker compose ps (/opt/cerniq)"
if [ -d /opt/cerniq ]; then
  cd /opt/cerniq
  if docker compose version >/dev/null 2>&1; then
    if [ -f /opt/cerniq/docker-compose.yml ] || [ -f /opt/cerniq/docker-compose.yaml ]; then
      docker compose ps || true
    elif [ -f /opt/cerniq/infra/docker/docker-compose.yml ]; then
      echo "compose_root_missing=1 (using /opt/cerniq/infra/docker/docker-compose.yml)"
      docker compose -f /opt/cerniq/infra/docker/docker-compose.yml ps || true
    else
      echo "compose_file_not_found_under_/opt/cerniq"
      echo "# compose candidates (top 50)"
      python3 - <<'PY'
from pathlib import Path
root = Path("/opt/cerniq")
hits = []
for p in root.rglob("docker-compose*.yml"):
    hits.append(str(p))
for p in root.rglob("docker-compose*.yaml"):
    hits.append(str(p))
for p in root.rglob("compose*.yml"):
    hits.append(str(p))
for p in root.rglob("compose*.yaml"):
    hits.append(str(p))
hits = sorted(set(hits))
for p in hits[:50]:
    print(p)
print(f"compose_candidates_count={len(hits)}")
PY
    fi
  else
    echo "docker_compose_missing"
  fi
else
  echo "compose_ps_skipped"
fi
echo

echo "# docker ps (filter name=cerniq)"
docker ps --filter name=cerniq --format '{{.Names}}\t{{.Status}}' | sort || true
echo

echo "# tcp connectivity checks"
python3 - <<'PY'
import socket

def check(host: str, port: int, timeout: float = 2.5) -> str:
    s = socket.socket()
    s.settimeout(timeout)
    try:
        s.connect((host, port))
        return "OK"
    except Exception as e:
        return f"FAIL {e}"
    finally:
        try:
            s.close()
        except Exception:
            pass

targets = [
    ("10.0.1.107", 5432),  # CT107 PostgreSQL
    ("10.0.1.10", 443),    # VIP internal gateway (TLS passthrough)
    ("10.0.1.10", 6379),   # VIP internal gateway (Redis passthrough)
]
for host, port in targets:
    print(f"tcp_connect {host}:{port} {check(host, port)}")
PY
echo

echo "# getent hosts (raw; expect 10.0.1.10 from /etc/hosts override)"
for h in s3cr3ts.neanelu.ro logs-cerniq.neanelu.ro otel-cerniq.neanelu.ro; do
  echo "---- $h ----"
  getent hosts "$h" || true
done
echo

echo "# docker inspect: ExtraHosts (to verify container-only overrides)"
for c in cerniq-vector cerniq-otel-collector cerniq-openbao-agent-api cerniq-openbao-agent-infra; do
  if docker inspect "$c" >/dev/null 2>&1; then
    echo "---- $c ----"
    docker inspect -f '{{json .HostConfig.ExtraHosts}}' "$c" || true
  else
    echo "---- $c ----"
    echo "missing"
  fi
done
echo

echo "# HTTPS: OpenBao sys/health (status code only)"
code="$(curl -sk -o /dev/null -w '%{http_code}' https://s3cr3ts.neanelu.ro/v1/sys/health || true)"
echo "openbao_http_status=${code}"

