# =============================================================================
# OpenBao Agent Configuration: Workers Service
# =============================================================================
# Reference: ADR-0033 OpenBao Secrets Management
# Service: cerniq-workers (BullMQ)
# Version: 1.0
# =============================================================================

# PID file for process management
pid_file = "/openbao/agent.pid"

# =============================================================================
# Auto-Auth Configuration
# =============================================================================
# AppRole authentication method
# role_id is static, secret_id rotates monthly
# =============================================================================

auto_auth {
  method "approle" {
    mount_path = "auth/approle"
    config = {
      role_id_file_path                   = "/openbao/config/role_id"
      secret_id_file_path                 = "/openbao/config/secret_id"
      remove_secret_id_file_after_reading = false
    }
  }

  # Note: File sink removed due to volume permission issues
  # Token is cached in memory for template rendering
}

# =============================================================================
# Caching Configuration
# =============================================================================
# Note: In OpenBao 2.5.0, using cache with auto_auth_token requires api_proxy
# which needs a listener. For pure template rendering, we disable caching.
# =============================================================================

# cache - disabled for template-only agent
# If you need caching, add a listener block and api_proxy configuration

# =============================================================================
# OpenBao Server Connection
# =============================================================================

vault {
  address = "https://s3cr3ts.neanelu.ro"
  retry {
    num_retries = 5
  }
}

# =============================================================================
# Template Configuration
# =============================================================================

# Workers Environment File
template {
  source      = "/openbao/templates/workers-env.tpl"
  destination = "/secrets/workers.env"
  perms       = 0600
  
  # Send HUP signal to Python workers for graceful reload
  command     = "pkill -HUP python3 2>/dev/null || true"
  
  # Error handling
  error_on_missing_key = true
  
  # Wait for secrets before rendering
  wait {
    min = "2s"
    max = "10s"
  }
}

# Dynamic PostgreSQL Password (direct from database engine)
template {
  source      = "/openbao/templates/pg-password.tpl"
  destination = "/secrets/pg_password"
  perms       = 0600
  
  # Don't fail if database engine not yet configured
  error_on_missing_key = false
}

# =============================================================================
# Telemetry
# =============================================================================

telemetry {
  prometheus_retention_time = "60s"
  disable_hostname          = true
}
