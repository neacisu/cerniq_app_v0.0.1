# =============================================================================
# OpenBao Server Configuration
# =============================================================================
# Reference: ADR-0033 OpenBao Secrets Management
# Version: 1.0
# Created: 2026-02-05
# =============================================================================

# Enable UI for administration
ui = true

# Cluster identification
cluster_name = "cerniq-openbao"

# Logging configuration
log_level = "info"
log_format = "standard"

# Note: disable_mlock removed in OpenBao v2.2.0
# Memory locking is handled by the Docker container with IPC_LOCK capability
# See: https://openbao.org/docs/install/#post-installation-hardening

# =============================================================================
# Storage Backend - Raft (HA-ready)
# =============================================================================
# Using integrated Raft storage for:
# - Simple setup (no external storage dependency)
# - Built-in HA support for future scaling
# - Snapshot backup capability
# =============================================================================

storage "raft" {
  path    = "/openbao/data"
  node_id = "cerniq-openbao-1"
  
  # Enable autopilot for automatic cleanup
  autopilot_reconcile_interval = "10s"
  
  # Performance tuning
  performance_multiplier = 1
}

# =============================================================================
# TCP Listener
# =============================================================================
# Port 8200 internal - exposed as 64090 on localhost only via Docker
# TLS disabled internally - traffic secured by Docker network isolation
# External access through Traefik with TLS termination
# =============================================================================

listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_disable   = true  # TLS handled by Traefik/Docker network isolation
  
  # Telemetry endpoint for Prometheus scraping
  telemetry {
    unauthenticated_metrics_access = true
  }
}

# =============================================================================
# API and Cluster Addresses
# =============================================================================
# api_addr: Address for client redirection (used by agents and CLI)
# cluster_addr: Address for cluster communication (HA setup)
# =============================================================================

api_addr     = "http://openbao:8200"
cluster_addr = "https://openbao:8201"

# =============================================================================
# Telemetry Configuration
# =============================================================================
  # Prometheus metrics endpoint (scraped by Prometheus)
# =============================================================================

telemetry {
  prometheus_retention_time = "30s"
  disable_hostname          = true
  
  # Additional metrics
  usage_gauge_period           = "10m"
  maximum_gauge_cardinality    = 500
}

# =============================================================================
# Auto-Unseal Configuration
# =============================================================================
# Eliminates manual unsealing after server restart.
# Without auto-unseal: server restart = total downtime for all 313+ workers
# until manual intervention.
#
# Option A (recommended for production HA): Transit seal via secondary OpenBao
# Option B (single-node): AES-GCM key from environment variable
#
# Uncomment ONE seal block below based on deployment topology.
# After enabling auto-unseal, existing data must be migrated:
#   bao operator unseal -migrate
# =============================================================================

# --- Option A: Transit auto-unseal (requires secondary OpenBao instance) ---
# seal "transit" {
#   address         = "https://secondary-openbao:8200"
#   token           = "s.TRANSIT_TOKEN_HERE"
#   disable_renewal = false
#   key_name        = "autounseal"
#   mount_path      = "transit/"
#   tls_skip_verify = false
# }

# --- Option B: AES-GCM auto-unseal via environment variable ---
# Requires: OPENBAO_SEAL_KEY env var set to a 32-byte base64 key
# Generate key: openssl rand -base64 32
# WARNING: Store key separately from OpenBao data volume
seal "aes-gcm" {
  key = "env://OPENBAO_SEAL_KEY"
}

# =============================================================================
# Default Lease TTL Configuration
# =============================================================================
# These can be overridden per-mount or per-role
# =============================================================================

default_lease_ttl = "1h"
max_lease_ttl     = "24h"

# =============================================================================
# Audit Backend - Enabled via CLI after initialization
# =============================================================================
# Audit logging will be enabled via:
#   bao audit enable file file_path=/openbao/data/audit.log
# =============================================================================
#
# --- Secrete așteptate în fișiere render-uite de Agent (referință operațională) ---
# Policy/mount-uri se definesc în cluster (CLI/Terraform), nu în acest HCL server-only.
#
# `/secrets/workers.env` (vezi workers/shared/src/secrets.ts — SENSITIVE_KEYS):
#   DATABASE_URL, DATABASE_DIRECT_URL, POSTGRES_*, REDIS_*, BULLMQ_PREFIX,
#   JWT_SECRET, JWT_REFRESH_SECRET, INFRAQ_GUARD_TOKEN,
#   XAI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, GOOGLE_AI_API_KEY, DEEPSEEK_API_KEY,
#   TIMELINESAI_API_KEY, INSTANTLY_API_KEY, RESEND_API_KEY
#
# `/secrets/api.env` (apps/api): acoperă în principal DB/Redis/JWT; aliniază cu EnvSchema din apps/api/src/config.ts
#
