# =============================================================================
# OpenBao Policy: Workers Service
# =============================================================================
# Reference: ADR-0033 OpenBao Secrets Management
# Applied to: crnq-workers AppRole
# Version: 1.0
# =============================================================================

# =============================================================================
# KV Secrets Engine - Static Secrets
# =============================================================================

# Workers-specific configuration secrets
path "secret/data/cerniq/workers/*" {
  capabilities = ["read", "list"]
}

# Shared secrets (external API keys for enrichment, etc.)
path "secret/data/cerniq/shared/*" {
  capabilities = ["read", "list"]
}

# Allow reading secret metadata for versioning info
path "secret/metadata/cerniq/workers/*" {
  capabilities = ["read", "list"]
}

path "secret/metadata/cerniq/shared/*" {
  capabilities = ["read", "list"]
}

# =============================================================================
# Database Secrets Engine - Dynamic PostgreSQL Credentials
# =============================================================================

# Generate dynamic database credentials for workers
path "database/creds/workers-role" {
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

# Encrypt PII data (for data enrichment workers)
path "transit/encrypt/pii" {
  capabilities = ["update"]
}

# Decrypt PII data (for processing)
path "transit/decrypt/pii" {
  capabilities = ["update"]
}

# Rewrap encrypted data with new key version
path "transit/rewrap/pii" {
  capabilities = ["update"]
}

# General encryption key for non-PII sensitive data
path "transit/encrypt/general" {
  capabilities = ["update"]
}

path "transit/decrypt/general" {
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
