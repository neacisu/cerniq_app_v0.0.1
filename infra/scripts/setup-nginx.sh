#!/bin/bash
# Deprecated by architecture decision:
# ingress/SSL is handled exclusively by Traefik on orchestrator.
set -euo pipefail

echo "[ERROR] setup-nginx.sh is deprecated and must not be used."
echo "[ERROR] Cerniq uses orchestrator Traefik only (no local Nginx)."
echo "[INFO] Use Traefik dynamic config: infra/config/traefik-orchestrator/cerniq.yml"
exit 1
