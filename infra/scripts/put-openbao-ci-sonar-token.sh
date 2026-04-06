#!/usr/bin/env bash
# =============================================================================
# Scrie tokenul SonarCloud/SonarQube în OpenBao KV v1: secret/cerniq/ci/sonar
# =============================================================================
# - Tokenul se citește de la stdin (fără argv — evită leak în ps).
# - Necesită BAO_TOKEN (după `bao login -address=$OPENBAO_ADDR` sau export manual).
# - Necesită OPENBAO_ADDR (ex. https://s3cr3ts.neanelu.ro).
# Utilizare:
#   export OPENBAO_ADDR=https://s3cr3ts.neanelu.ro
#   export BAO_TOKEN=...   # din `bao login -token-only` sau token root/operator
#   ./infra/scripts/put-openbao-ci-sonar-token.sh < /path/to/tokenfile
#   # sau: printf '%s' 'TOKEN' | ./infra/scripts/put-openbao-ci-sonar-token.sh
# =============================================================================
set -euo pipefail

if [[ -z "${OPENBAO_ADDR:-}" ]]; then
  echo "OPENBAO_ADDR nu este setat." >&2
  exit 1
fi

if [[ -z "${BAO_TOKEN:-}" ]]; then
  echo "BAO_TOKEN nu este setat. Autentifică-te cu CLI OpenBao și exportă tokenul." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq este necesar." >&2
  exit 1
fi

if ! IFS= read -r TOKEN; then
  echo "Nu s-a putut citi tokenul din stdin." >&2
  exit 1
fi
TOKEN="${TOKEN//$'\r'/}"
TOKEN="${TOKEN//$'\n'/}"
if [[ -z "$TOKEN" ]]; then
  echo "Token gol (stdin)." >&2
  exit 1
fi

payload="$(jq -n --arg t "$TOKEN" '{token: $t}')"

curl -sS --fail --retry 3 --max-time 30 \
  -H "X-Vault-Token: ${BAO_TOKEN}" \
  -H "Content-Type: application/json" \
  -X POST \
  --data-binary "$payload" \
  "${OPENBAO_ADDR%/}/v1/secret/cerniq/ci/sonar"

echo "OK: secret/cerniq/ci/sonar (cheie token) actualizat." >&2
