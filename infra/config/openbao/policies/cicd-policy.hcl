# =============================================================================
# OpenBao Policy: CI/CD Pipeline (cerniq-cicd)
# =============================================================================
# Reference: ADR-0033 OpenBao Secrets Management
# Applied to: cerniq-cicd AppRole (GitHub Actions)
# =============================================================================

# =============================================================================
# KV Secrets Engine — CI/CD Secrets
# =============================================================================

path "secret/data/cerniq/ci/*" {
  capabilities = ["read", "list"]
}

path "secret/metadata/cerniq/ci/*" {
  capabilities = ["read", "list"]
}

path "secret/data/cerniq/shared/ghcr" {
  capabilities = ["read"]
}

path "secret/cerniq/*" {
  capabilities = ["read"]
}

# =============================================================================
# Database Dynamic Credentials
# =============================================================================

path "database/creds/api-dynamic" {
  capabilities = ["read"]
}

path "database/creds/workers-dynamic" {
  capabilities = ["read"]
}

# =============================================================================
# AppRole Secret ID Management
# =============================================================================
# CI/CD generates new secret_ids for services during deployment
# This enables automated credential rotation during deploys
# =============================================================================

path "auth/approle/role/cerniq-api/secret-id" {
  capabilities = ["create", "update"]
}

path "auth/approle/role/cerniq-workers/secret-id" {
  capabilities = ["create", "update"]
}

path "auth/approle/role/cerniq-infra/secret-id" {
  capabilities = ["create", "update"]
}

path "auth/approle/role/cerniq-api/role-id" {
  capabilities = ["read"]
}

path "auth/approle/role/cerniq-workers/role-id" {
  capabilities = ["read"]
}

path "auth/approle/role/cerniq-infra/role-id" {
  capabilities = ["read"]
}

# =============================================================================
# Token Self-Management
# =============================================================================

path "auth/token/renew-self" {
  capabilities = ["update"]
}

path "auth/token/lookup-self" {
  capabilities = ["read"]
}

# =============================================================================
# System Status (health checks)
# =============================================================================

path "sys/health" {
  capabilities = ["read"]
}

path "sys/seal-status" {
  capabilities = ["read"]
}
