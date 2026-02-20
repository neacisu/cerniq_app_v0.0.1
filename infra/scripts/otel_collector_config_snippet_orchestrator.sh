#!/usr/bin/env bash
set -euo pipefail

echo "== otel_collector_config_snippet_orchestrator =="
date -Is || true
echo "hostname=$(hostname)"
echo

CFG="/opt/observability/otel/otel-collector.yml"
echo "# config path: ${CFG}"
if [ ! -f "${CFG}" ]; then
  echo "missing:${CFG}"
  exit 2
fi
ls -la "${CFG}" || true
echo

echo "# excerpt: receivers/otlp (first ~220 lines of file)"
sed -n '1,220p' "${CFG}"
echo

echo "# quick grep-like: lines containing 'receivers', 'otlp', 'protocols', '4317', '4318'"
python3 - <<'PY'
from pathlib import Path
p = Path("/opt/observability/otel/otel-collector.yml")
lines = p.read_text(errors="replace").splitlines()
need = ("receivers", "otlp", "protocols", "4317", "4318")
for i, l in enumerate(lines, start=1):
    if any(n in l for n in need):
        print(f"{i}: {l}")
PY

