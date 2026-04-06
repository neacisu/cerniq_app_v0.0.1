# =============================================================================
# OpenBao Agent: CI / tooling — Sonar token (AppRole cerniq-cicd)
# =============================================================================
# Randare: /secrets/sonar.env → pe host: $CERNIQ_RENDERED_SECRETS_DIR/ci/sonar.env
# Credențiale: fișiere role_id / secret_id pentru AppRole CI (NU în git).
# Pornire: docker compose --profile ci-sonar up -d openbao-agent-ci-sonar
# =============================================================================

pid_file = "/tmp/openbao-agent-ci-sonar.pid"
log_level  = "info"

auto_auth {
  method "approle" {
    mount_path = "auth/approle"
    config = {
      role_id_file_path                   = "/openbao/config/role_id"
      secret_id_file_path                 = "/openbao/config/secret_id"
      remove_secret_id_file_after_reading = false
    }
  }
}

vault {
  address = "https://s3cr3ts.neanelu.ro"
  retry {
    num_retries = 5
  }
}

template {
  source      = "/openbao/templates/ci-sonar.env.tpl"
  destination = "/secrets/sonar.env"
  perms       = 0600

  error_on_missing_key = true

  wait {
    min = "2s"
    max = "10s"
  }
}

telemetry {
  prometheus_retention_time = "60s"
  disable_hostname          = true
}
