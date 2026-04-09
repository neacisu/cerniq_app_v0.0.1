#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

PROFILE="${1:-health}"
K6_IMAGE="${K6_IMAGE:-grafana/k6:0.57.0}"
OUT_JSON="${K6_OUT_JSON:-$ROOT/test-results/k6-summary.json}"
SUMMARY_EXPORT="${K6_SUMMARY_EXPORT:-$ROOT/test-results/k6-summary-export.json}"
mkdir -p "$(dirname "$OUT_JSON")" 2>/dev/null || true
mkdir -p "$(dirname "$SUMMARY_EXPORT")" 2>/dev/null || true

run_k6() {
  local script="$1"
  shift
  local extra=("$@")
  if command -v k6 >/dev/null 2>&1; then
    k6 run "${extra[@]}" "$script"
  else
    docker run --rm \
      --add-host=host.docker.internal:host-gateway \
      -v "$ROOT:/work" -w /work \
      -e API_BASE="${API_BASE:-http://host.docker.internal:64010}" \
      -e K6_BEARER_TOKEN="${K6_BEARER_TOKEN:-}" \
      -e K6_LOGIN_EMAIL="${K6_LOGIN_EMAIL:-}" \
      -e K6_LOGIN_PASSWORD="${K6_LOGIN_PASSWORD:-}" \
      -e K6_VUS="${K6_VUS:-}" \
      -e K6_DURATION="${K6_DURATION:-}" \
      -e K6_PROFILE="${K6_PROFILE:-}" \
      -e K6_HEALTH_P95_MS="${K6_HEALTH_P95_MS:-}" \
      -e K6_INCLUDE_IMPORT="${K6_INCLUDE_IMPORT:-}" \
      "$K6_IMAGE" run "${extra[@]}" "$script"
  fi
}

case "$PROFILE" in
  health)
    export K6_PROFILE="${K6_PROFILE:-}"
    run_k6 "tests/load/api-health.k6.js" \
      --summary-export="$SUMMARY_EXPORT" \
      --out "json=$OUT_JSON"
    ;;
  health-ramp)
    export K6_PROFILE=ramp
    run_k6 "tests/load/api-health.k6.js" \
      --summary-export="$SUMMARY_EXPORT" \
      --out "json=$OUT_JSON"
    ;;
  health-ci)
    export K6_PROFILE=ciRamp
    run_k6 "tests/load/api-health.k6.js" \
      --summary-export="$SUMMARY_EXPORT" \
      --out "json=$OUT_JSON"
    ;;
  enrichment)
    export K6_PROFILE="${K6_PROFILE:-}"
    run_k6 "tests/load/api-enrichment.k6.js" \
      --summary-export="$SUMMARY_EXPORT" \
      --out "json=$OUT_JSON"
    ;;
  outreach)
    export K6_PROFILE="${K6_PROFILE:-}"
    run_k6 "tests/load/api-outreach.k6.js" \
      --summary-export="$SUMMARY_EXPORT" \
      --out "json=$OUT_JSON"
    ;;
  steady | spike | soak)
    export K6_PROFILE="$PROFILE"
    run_k6 "tests/load/api-health.k6.js" \
      --summary-export="$SUMMARY_EXPORT" \
      --out "json=$OUT_JSON"
    ;;
  *)
    echo "Usage: $0 [health|health-ramp|health-ci|enrichment|outreach|steady|spike|soak]" >&2
    echo "Env: API_BASE, K6_BEARER_TOKEN sau K6_LOGIN_EMAIL/K6_LOGIN_PASSWORD, K6_OUT_JSON, K6_SUMMARY_EXPORT" >&2
    exit 1
    ;;
esac
