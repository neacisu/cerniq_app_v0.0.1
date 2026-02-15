# =============================================================================
# OpenBao Policy: API Service
# =============================================================================
# Reference: ADR-0033 OpenBao Secrets Management
# Applied to: crnq-api AppRole
# Version: 1.0
# =============================================================================

# Static secrets (KV v1 mount `secret/`)
path "secret/cerniq/api/config" {
  capabilities = ["read"]
}

path "secret/cerniq/shared/external" {
  capabilities = ["read"]
}

# =============================================================================
# Database Secrets Engine - Dynamic PostgreSQL Credentials
# =============================================================================

# Generate dynamic database credentials (Cerniq isolated DB engine)
path "cerniq-db/creds/api-dynamic" {
  capabilities = ["read"]
}

path "cerniq-db/roles" {
  capabilities = ["list"]
}

# =============================================================================
# Token Self-Management
# =============================================================================

# Allow agent preflight capability checks
path "sys/capabilities-self" {
  capabilities = ["update"]
}

# Renew own token
path "auth/token/renew-self" {
  capabilities = ["update"]
}

# Lookup own token information
path "auth/token/lookup-self" {
  capabilities = ["read"]
}

# Revoke own token (for graceful shutdown)
path "auth/token/revoke-self" {
  capabilities = ["update"]
}

# =============================================================================
# Lease Management (for credential renewal)
# =============================================================================

# Renew leases (for database credentials)
path "sys/leases/renew" {
  capabilities = ["update"]
}

# Lookup lease information
path "sys/leases/lookup" {
  capabilities = ["update"]
}
