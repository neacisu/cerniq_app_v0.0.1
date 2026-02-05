# =============================================================================
# OpenBao Policy: CI/CD Pipeline
# =============================================================================
# Reference: ADR-0033 OpenBao Secrets Management
# Applied to: cicd AppRole (GitHub Actions)
# Version: 1.0
# =============================================================================

# =============================================================================
# KV Secrets Engine - CI/CD Secrets
# =============================================================================

# Read deployment secrets (SSH keys, registry tokens)
path "secret/data/cerniq/ci/*" {
  capabilities = ["read", "list"]
}

# Read container registry credentials
path "secret/data/cerniq/shared/ghcr" {
  capabilities = ["read"]
}

# Allow reading secret metadata for versioning info
path "secret/metadata/cerniq/ci/*" {
  capabilities = ["read", "list"]
}

# =============================================================================
# AppRole Secret ID Management
# =============================================================================
# CI/CD can generate new secret_ids for services during deployment
# This enables automated credential rotation during deploys
# =============================================================================

# Generate new secret_id for API service
path "auth/approle/role/api/secret-id" {
  capabilities = ["create", "update"]
}

# Generate new secret_id for Workers service
path "auth/approle/role/workers/secret-id" {
  capabilities = ["create", "update"]
}

# Read role_id (needed for deployment automation)
path "auth/approle/role/api/role-id" {
  capabilities = ["read"]
}

path "auth/approle/role/workers/role-id" {
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
