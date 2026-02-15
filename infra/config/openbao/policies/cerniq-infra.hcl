# =============================================================================
# OpenBao Policy: Cerniq Infra Sidecars (PgBouncer auth/config)
# =============================================================================

path "secret/cerniq/infra/pgbouncer" {
  capabilities = ["read"]
}

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

