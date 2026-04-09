#!/usr/bin/env bash
# Chaos runner — Pumba + verificări pre/post (Docker, health opțional, Prometheus opțional).
# Utilizare:
#   ./tests/chaos/run-chaos-test.sh redis-kill
#   PROMETHEUS_URL=http://localhost:9090 ./tests/chaos/run-chaos-test.sh pgbouncer-pause
#
# Cerințe: Docker daemon, containere pornite din infra/docker/docker-compose.yml, opțional `pumba` în PATH
# sau: docker run --rm -v /var/run/docker.sock:/var/run/docker.sock gaiaadm/pumba pumba <args>

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCENARIOS_YML="${ROOT}/tests/chaos/pumba-scenarios.yml"
SCENARIO_ID="${1:-}"

log() { printf '[chaos] %s\n' "$*"; }
fail() { printf '[chaos][FAIL] %s\n' "$*" >&2; exit 1; }

need_cmd() { command -v "$1" >/dev/null 2>&1 || fail "Comandă lipsă: $1"; }

pumba_exec() {
  if command -v pumba >/dev/null 2>&1; then
    pumba "$@"
  else
    log "pumba nu e în PATH — folosesc imaginea gaiaadm/pumba (montez docker.sock, entrypoint /pumba)"
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock --entrypoint /pumba gaiaadm/pumba "$@"
  fi
}

container_running() {
  local name="$1"
  docker ps --format '{{.Names}}' | grep -qx "$name"
}

wait_healthy() {
  local name="$1"
  local max="${2:-120}"
  local i=0
  while (( i < max )); do
    local status
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$name" 2>/dev/null || echo unknown)"
    if [[ "$status" == "healthy" ]] || [[ "$status" == "none" ]]; then
      return 0
    fi
    sleep 1
    ((i++)) || true
  done
  return 1
}

prom_query() {
  local q="$1"
  local base="${PROMETHEUS_URL:-http://localhost:9090}"
  curl -sf "${base}/api/v1/query?query=$(printf '%s' "$q" | sed 's/ /%20/g')" | head -c 4000 || true
}

if [[ -z "$SCENARIO_ID" ]]; then
  fail "Utilizare: $0 <scenario_id>   (ex: redis-kill, pgbouncer-pause, worker-enrichment-net-delay, worker-enrichment-stress)"
fi

need_cmd docker
need_cmd curl
need_cmd grep

[[ -f "$SCENARIOS_YML" ]] || fail "Lipsește $SCENARIOS_YML"

log "Pre-condiții: Docker..."
docker info >/dev/null || fail "Docker nu răspunde"

# Parsare YAML fără dependențe externe: bloc curent după `- id:`
CONTAINER_NAME="$(python3 - "$SCENARIOS_YML" "$SCENARIO_ID" <<'PY'
import sys
path, sid = sys.argv[1], sys.argv[2]
cur = None
for line in open(path, encoding="utf-8"):
    s = line.strip()
    if s.startswith("- id:"):
        cur = s.split("id:", 1)[1].strip()
    elif cur == sid and "container_name:" in line:
        v = line.split("container_name:", 1)[1].strip()
        print(v)
        sys.exit(0)
sys.exit(1)
PY
)" || fail "Scenariu necunoscut sau fără container_name: $SCENARIO_ID"

log "Container țintă: $CONTAINER_NAME"
container_running "$CONTAINER_NAME" || fail "Containerul $CONTAINER_NAME nu rulează (docker ps). Pornește stack-ul compose."

log "Snapshot metrici (dacă Prometheus e disponibil la \${PROMETHEUS_URL:-http://localhost:9090})..."
prom_query 'up{job=~".+"}' | head -c 200 || log "(Prometheus indisponibil — continuăm fără metrici)"

case "$SCENARIO_ID" in
  redis-kill)
    log "Inject: SIGKILL redis master"
    pumba_exec kill -s SIGKILL "$CONTAINER_NAME"
    log "Așteptare recovery (Sentinel/Redis)..."
    sleep 5
    container_running "$CONTAINER_NAME" || log "ATENȚIE: containerul poate avea alt nume după recreate — verifică docker ps"
    ;;
  pgbouncer-pause)
    log "Inject: pause 30s PgBouncer"
    pumba_exec pause -d 30s "$CONTAINER_NAME"
    wait_healthy "$CONTAINER_NAME" 90 || log "Healthcheck: verifică manual docker inspect $CONTAINER_NAME"
    ;;
  worker-enrichment-net-delay)
    log "Inject: netem delay 500ms / 60s (egress)"
    pumba_exec netem -d 60s --tc-image=gaiadocker/iproute2 delay -t 500 "$CONTAINER_NAME"
    ;;
  worker-enrichment-stress)
    log "Inject: stress-ng în container (implicit stress-ng din imaginea Pumba)"
    pumba_exec stress -d 30s "$CONTAINER_NAME"
    ;;
  *)
    fail "Scenariu fără handler în run-chaos-test.sh: $SCENARIO_ID (actualizează scriptul)"
    ;;
esac

log "Post-condiții: verifică serviciile (staging)..."
if wait_healthy "$CONTAINER_NAME" 5; then
  log "Container $CONTAINER_NAME raportat healthy/none."
fi

log "PASS — scenariu $SCENARIO_ID executat (validare funcțională completă = manuală pe staging + metrici)."
exit 0
