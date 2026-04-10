#!/usr/bin/env bash
# Rebuild complet fără cache Turbo + reinstalare dependențe + repornire stack Docker dev.
# Utilizare (din rădăcina repo-ului sau oriunde):
#   bash infra/scripts/cerniq-dev-rebuild-nocache.sh
#   SKIP_DOCKER=1 bash infra/scripts/cerniq-dev-rebuild-nocache.sh   # doar pnpm + turbo, fără compose
#   SKIP_RM_NODE_MODULES=1 ... # păstrează node_modules (doar .turbo + build --force)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
COMPOSE=(docker compose -f infra/docker/docker-compose.dev.yml)

echo "==> [1/6] Repo: $ROOT"

if [[ "${SKIP_RM_NODE_MODULES:-}" != "1" ]]; then
  echo "==> [2/6] Elimină node_modules și artefacte build (workspace)"
  rm -rf node_modules 2>/dev/null || true
  rm -rf apps/*/node_modules packages/*/node_modules workers/*/node_modules 2>/dev/null || true
  rm -rf apps/*/dist packages/*/dist workers/*/dist 2>/dev/null || true
else
  echo "==> [2/6] SKIP_RM_NODE_MODULES=1 — păstrăm node_modules"
fi

rm -rf .turbo 2>/dev/null || true

echo "==> [3/6] pnpm install (fără cache de store vechi — reîncarcă dependențe)"
corepack enable >/dev/null 2>&1 || true
pnpm install --no-frozen-lockfile

echo "==> [4/6] turbo build --force (fără cache Turbo)"
pnpm exec turbo run build --force

if [[ "${SKIP_DOCKER:-}" == "1" ]]; then
  echo "==> SKIP_DOCKER=1 — nu pornesc compose. Gata."
  exit 0
fi

echo "==> [5/6] Docker: opresc stack dev (dacă există)"
"${COMPOSE[@]}" down --remove-orphans 2>/dev/null || true

echo "==> [5b/6] Docker: pull imagini de bază (fără cache layer-uri locale vechi)"
docker pull node:25.8.1 2>/dev/null || true

echo "==> [6/6] Docker: pornesc stack dev (recreate)"
"${COMPOSE[@]}" up -d --force-recreate

echo ""
echo "OK. Urmărește loguri:"
echo "  ${COMPOSE[*]} logs -f cerniq-web cerniq-api"
echo ""
