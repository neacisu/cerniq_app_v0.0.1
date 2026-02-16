#!/usr/bin/env bash
set -euo pipefail

echo "== preflight_extins_ct107_pg =="
date -Is || true
echo "hostname=$(hostname)"
echo "ip=$(hostname -I | tr -s ' ' | sed 's/ $//')"
echo "os=$( . /etc/os-release && echo "${PRETTY_NAME}" )"
echo "kernel=$(uname -r)"
echo

echo "# systemd: postgresql"
if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active postgresql >/dev/null 2>&1; then
    echo "postgresql=active"
  else
    echo "postgresql=inactive"
  fi
else
  echo "systemctl_missing"
fi
echo

echo "# psql version"
psql --version 2>/dev/null || echo "psql_missing"
echo

echo "# PostgreSQL version()"
sudo -u postgres psql -d postgres -Atqc "SELECT version();" 2>/dev/null || echo "psql_connect_failed"
echo

echo "# WAL archiving config"
sudo -u postgres psql -d postgres -Atqc "SHOW archive_mode;" 2>/dev/null || true
sudo -u postgres psql -d postgres -Atqc "SHOW archive_command;" 2>/dev/null || true
sudo -u postgres psql -d postgres -Atqc "SHOW wal_level;" 2>/dev/null || true
echo

echo "# WAL archive dir status"
WAL_DIR="/var/lib/postgresql/18/main/wal_archive"
if [ -d "$WAL_DIR" ]; then
  echo "wal_archive_dir=present path=$WAL_DIR"
  # shellcheck disable=SC2012
  ls -la "$WAL_DIR" | tail -n 15 || true
else
  echo "wal_archive_dir=missing path=$WAL_DIR"
fi
echo

echo "# pg_isready (local socket + tcp listen check)"
pg_isready 2>/dev/null || true
pg_isready -h 127.0.0.1 -p 5432 2>/dev/null || true
echo

echo "# tcp connectivity checks (from CT107)"
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
    ("10.0.1.10", 443),    # VIP internal gateway (TLS passthrough)
    ("10.0.1.10", 6379),   # VIP internal gateway (Redis passthrough)
    ("10.0.0.2", 443),     # orchestrator HTTPS (Traefik/OpenBao via internal IP)
]
for host, port in targets:
    print(f"tcp_connect {host}:{port} {check(host, port)}")
PY

