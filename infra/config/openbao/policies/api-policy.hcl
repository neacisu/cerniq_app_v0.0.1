# =============================================================================
# OpenBao Policy: API Service
# =============================================================================
# Reference: ADR-0033 OpenBao Secrets Management
# Applied to: crnq-api AppRole
# Version: 1.0
# =============================================================================

# =============================================================================
# KV Secrets Engine - Static Secrets
# =============================================================================

# API-specific configuration secrets
path "secret/data/cerniq/api/*" {
  capabilities = ["read", "list"]
}

# Shared secrets (external API keys, etc.)
path "secret/data/cerniq/shared/*" {
  capabilities = ["read", "list"]
}

# Allow reading secret metadata for versioning info
path "secret/metadata/cerniq/api/*" {
  capabilities = ["read", "list"]
}

path "secret/metadata/cerniq/shared/*" {
  capabilities = ["read", "list"]
}

# =============================================================================
# Database Secrets Engine - Dynamic PostgreSQL Credentials
# =============================================================================

# Generate dynamic database credentials
path "database/creds/api-role" {
  capabilities = ["read"]
}

# Allow listing available database roles
path "database/roles" {
  capabilities = ["list"]
}

# =============================================================================
# PKI Secrets Engine - TLS Certificates
# =============================================================================

# Issue service certificates from intermediate CA
path "pki_int/issue/service-cert" {
  capabilities = ["create", "update"]
}

# Read CA certificate chain
path "pki_int/ca/pem" {
  capabilities = ["read"]
}

path "pki_int/ca_chain" {
  capabilities = ["read"]
}

# =============================================================================
# Transit Secrets Engine - Encryption as a Service
# =============================================================================

# Encrypt PII data
path "transit/encrypt/pii" {
  capabilities = ["update"]
}

# Decrypt PII data
path "transit/decrypt/pii" {
  capabilities = ["update"]
}

# Rewrap encrypted data with new key version
path "transit/rewrap/pii" {
  capabilities = ["update"]
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
