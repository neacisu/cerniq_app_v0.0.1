# =============================================================================
# OpenBao Policy: CI/CD Pipeline
# =============================================================================
# Reference: ADR-0033 OpenBao Secrets Management
# Applied to: cicd AppRole (GitHub Actions)
# Version: 1.0
# =============================================================================

# =============================================================================
# KV Secrets Engine v2 - CI/CD Secrets
# =============================================================================
# KV v2 API uses secret/data/ for reads and secret/metadata/ for metadata.
# Policy paths must match the full API path including the /data/ prefix.
# =============================================================================

# Read deployment secrets (GitHub Actions / runners) — KV v2 data path
path "secret/data/cerniq/ci/*" {
  capabilities = ["read", "list"]
}

# Metadata access (optional, for listing versions)
path "secret/metadata/cerniq/ci/*" {
  capabilities = ["read", "list"]
}

path "secret/data/cerniq/shared/ghcr" {
  capabilities = ["read"]
}

# =============================================================================
# AppRole Secret ID Management
# =============================================================================
# CI/CD can generate new secret_ids for services during deployment
# This enables automated credential rotation during deploys
# =============================================================================

# Generate new secret_id for API service
path "auth/approle/role/cerniq-api/secret-id" {
  capabilities = ["create", "update"]
}

# Generate new secret_id for Workers service
path "auth/approle/role/cerniq-workers/secret-id" {
  capabilities = ["create", "update"]
}

# Read role_id (needed for deployment automation)
path "auth/approle/role/cerniq-api/role-id" {
  capabilities = ["read"]
}

path "auth/approle/role/cerniq-workers/role-id" {
  capabilities = ["read"]
}

# =============================================================================
# Token Self-Management
# =============================================================================

# Renew own token
path "auth/token/renew-self" {
  capabilities = ["update"]
}

# Lookup own token information
path "auth/token/lookup-self" {
  capabilities = ["read"]
}

# =============================================================================
# System Status (for health checks)
# =============================================================================

# Read health status
path "sys/health" {
  capabilities = ["read"]
}

# Read seal status
path "sys/seal-status" {
  capabilities = ["read"]
}
