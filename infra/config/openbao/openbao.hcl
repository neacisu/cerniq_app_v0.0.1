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
# Port 8200 internal - exposed as 64200 on localhost only via Docker
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
# Prometheus metrics for SigNoz integration
# =============================================================================

telemetry {
  prometheus_retention_time = "30s"
  disable_hostname          = true
  
  # Additional metrics
  usage_gauge_period           = "10m"
  maximum_gauge_cardinality    = 500
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
