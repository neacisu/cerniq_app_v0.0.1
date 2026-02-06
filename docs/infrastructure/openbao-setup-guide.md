# CERNIQ.APP — OpenBao Setup Guide

## Centralized Secrets Management

**Versiune:** 1.0  
**Data:** 5 Februarie 2026  
**Referință ADR:** [ADR-0033: OpenBao Secrets Management](../adr/ADR%20Etapa%200/ADR-0033-OpenBao-Secrets-Management.md)

---

## Cuprins

1. [Overview](#1-overview)
2. [Quick Start](#2-quick-start)
3. [Installation](#3-installation)
4. [Initial Configuration](#4-initial-configuration)
5. [Secrets Engines](#5-secrets-engines)
6. [Authentication Methods](#6-authentication-methods)
7. [Policies](#7-policies)
8. [Agent Configuration](#8-agent-configuration)
9. [Service Integration](#9-service-integration)
10. [Rotation Procedures](#10-rotation-procedures)
11. [Backup & Recovery](#11-backup--recovery)
12. [Monitoring](#12-monitoring)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Overview

### Ce este OpenBao?

OpenBao este un fork open-source al HashiCorp Vault, oferind:

- **Secrets Management** — Stocare securizată pentru credențiale
- **Dynamic Secrets** — Generare automată de credențiale temporare
- **PKI** — Certificate authority pentru TLS
- **Encryption as a Service** — Criptare/decriptare fără expunerea cheilor
- **Audit Logging** — Trail complet pentru compliance

### Arhitectura CERNIQ

```
                                 ┌──────────────────────┐
                                 │   GitHub Actions     │
                                 │   (CI/CD)            │
                                 └──────────┬───────────┘
                                           │
                                           │ AppRole Auth
                                           ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  ┌─────────────┐
│    API      │  │   Workers   │  │    OpenBao Server   │  │  Web-Admin  │
│  (Fastify)  │  │  (BullMQ)   │  │                     │  │   (React)   │
└──────┬──────┘  └──────┬──────┘  │  ┌───────────────┐  │  └──────┬──────┘
       │                │         │  │  KV Secrets   │  │         │
       └────────────────┼─────────┤  │  Database     │◄─┼─────────┘
                        │         │  │  PKI          │  │
        OpenBao Agent   │         │  │  Transit      │  │
        (Template)      ▼         │  └───────────────┘  │
                   ┌────────┐     │                     │
                   │ Secrets│     │  Storage: Raft      │
                   │ Files  │     └─────────────────────┘
                   └────────┘               │
                                           │ Encrypted
                                           ▼
                               ┌───────────────────────┐
                               │  Hetzner Storage Box  │
                               │  (Unseal Keys Backup) │
                               └───────────────────────┘
```

---

## 2. Quick Start

### Prerequisites

- Docker Engine 28.x+
- Docker Compose 2.40+
- `bao` CLI instalat
- Network access la port 64090 (local only)

### 5-Minute Setup

```bash
# 1. Start OpenBao
cd /var/www/CerniqAPP
docker compose up -d openbao

# 2. Initialize (doar prima dată)
docker exec -it cerniq-openbao bao operator init \
    -key-shares=5 -key-threshold=3 > /tmp/openbao-init.txt

# 3. Unseal (necesită 3 din 5 keys)
docker exec -it cerniq-openbao bao operator unseal <key1>
docker exec -it cerniq-openbao bao operator unseal <key2>
docker exec -it cerniq-openbao bao operator unseal <key3>

# 4. Login cu root token
export BAO_TOKEN=$(grep 'Root Token' /tmp/openbao-init.txt | awk '{print $4}')
docker exec -it cerniq-openbao bao login $BAO_TOKEN

# 5. Run setup script
./infra/scripts/openbao-init.sh
```

---

## 3. Installation

### Docker Compose Service

```yaml
# docker-compose.yml
services:
  openbao:
    image: quay.io/openbao/openbao:2.5.0
    container_name: cerniq-openbao
    cap_add:
      - IPC_LOCK  # Prevent memory swapping
    environment:
      - BAO_ADDR=http://127.0.0.1:8200
      - BAO_API_ADDR=http://openbao:8200
      - BAO_CLUSTER_ADDR=https://openbao:8201
      - BAO_LOG_LEVEL=info
    volumes:
      - openbao_data:/openbao/data
      - ./infra/config/openbao:/openbao/config:ro
    command: server -config=/openbao/config/openbao.hcl
    ports:
      - "127.0.0.1:64090:8200"  # API - localhost only for security
    networks:
      cerniq_backend:
        ipv4_address: 172.29.20.50
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8200/v1/sys/health?standbyok=true"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

volumes:
  openbao_data:
    driver: local
```

### Server Configuration

```hcl
# infra/config/openbao/openbao.hcl
ui = true
cluster_name = "cerniq-openbao"
log_level = "info"
disable_mlock = false

# Raft Storage (HA-ready)
storage "raft" {
  path = "/openbao/data"
  node_id = "cerniq-openbao-1"
  
  # Enable autopilot for automatic cleanup
  autopilot_reconcile_interval = "10s"
}

# TCP Listener
listener "tcp" {
  address = "0.0.0.0:8200"
  tls_disable = true  # TLS handled by Traefik in production
  
  # Telemetry for Prometheus
  telemetry {
    unauthenticated_metrics_access = true
  }
}

# API Address
api_addr = "http://openbao:8200"
cluster_addr = "https://openbao:8201"

# Telemetry
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname = true
}

# Audit logging
# (enabled via CLI after init)
```

### CLI Installation

```bash
# Ubuntu/Debian
wget https://github.com/openbao/openbao/releases/download/v2.2.0/bao_2.2.0_linux_amd64.deb
sudo dpkg -i bao_2.2.0_linux_amd64.deb

# Verify
bao version
# OpenBao v2.2.0

# Set environment
echo 'export BAO_ADDR="http://127.0.0.1:64090"' >> ~/.bashrc
source ~/.bashrc
```

---

## 4. Initial Configuration

### Initialize OpenBao

```bash
#!/bin/bash
# infra/scripts/openbao-init.sh

set -euo pipefail

BAO_ADDR="${BAO_ADDR:-http://127.0.0.1:64090}"
SECRETS_DIR="/var/www/CerniqAPP/secrets"
STORAGE_BOX="u502048@u502048.your-storagebox.de"

echo "🔐 Initializing OpenBao..."

# Check if already initialized
if bao status 2>/dev/null | grep -q "Initialized.*true"; then
    echo "✅ OpenBao already initialized"
    exit 0
fi

# Initialize with 5 key shares, 3 threshold
INIT_OUTPUT=$(bao operator init -key-shares=5 -key-threshold=3 -format=json)

# Extract keys and root token
echo "$INIT_OUTPUT" | jq -r '.unseal_keys_b64[]' > "$SECRETS_DIR/openbao_unseal_keys.txt"
echo "$INIT_OUTPUT" | jq -r '.root_token' > "$SECRETS_DIR/openbao_root_token.txt"

# Secure permissions
chmod 600 "$SECRETS_DIR/openbao_unseal_keys.txt"
chmod 600 "$SECRETS_DIR/openbao_root_token.txt"

echo "🔑 Unseal keys saved to $SECRETS_DIR/openbao_unseal_keys.txt"
echo "🔑 Root token saved to $SECRETS_DIR/openbao_root_token.txt"

# Unseal
echo "🔓 Unsealing OpenBao..."
for i in 1 2 3; do
    KEY=$(sed -n "${i}p" "$SECRETS_DIR/openbao_unseal_keys.txt")
    bao operator unseal "$KEY"
done

# Login
export BAO_TOKEN=$(cat "$SECRETS_DIR/openbao_root_token.txt")
bao login "$BAO_TOKEN"

echo "✅ OpenBao initialized and unsealed!"

# Backup keys to Hetzner Storage Box (encrypted)
echo "📦 Backing up unseal keys..."
gpg --symmetric --cipher-algo AES256 -o /tmp/openbao_keys.gpg "$SECRETS_DIR/openbao_unseal_keys.txt"
scp -P 23 -i /root/.ssh/hetzner_storagebox /tmp/openbao_keys.gpg \
    "$STORAGE_BOX:./backups/cerniq/openbao/unseal_keys_$(date +%Y%m%d).gpg"
shred -u /tmp/openbao_keys.gpg

echo "✅ Keys backed up to Hetzner Storage Box"
```

### Enable Audit Logging

```bash
#!/bin/bash
# Enable file audit backend
bao audit enable file file_path=/openbao/data/audit.log

# Verify
bao audit list
# Path     Type    Description
# ----     ----   -----------
# file/    file   n/a
```

---

## 5. Secrets Engines

### KV Secrets Engine (v2)

```bash
#!/bin/bash
# infra/scripts/openbao-setup-kv.sh

# Enable KV v2 at secret/
bao secrets enable -version=2 -path=secret kv

# Create initial secrets structure
cat << 'EOF' | bao kv put secret/cerniq/api/config -
{
  "pg_user": "c3rn1q",
  "pg_password": "$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 64)",
  "redis_password": "$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 64)",
  "jwt_secret": "$(openssl rand -base64 64)"
}
EOF

bao kv put secret/cerniq/workers/config \
    worker_concurrency=10 \
    max_retries=3

bao kv put secret/cerniq/shared/external \
    anaf_client_id="$ANAF_CLIENT_ID" \
    anaf_client_secret="$ANAF_CLIENT_SECRET" \
    resend_api_key="$RESEND_API_KEY" \
    termene_api_key="$TERMENE_API_KEY" \
    hunter_api_key="$HUNTER_API_KEY"

bao kv put secret/cerniq/ci/deploy \
    ghcr_token="$GHCR_TOKEN" \
    ssh_key="$SSH_KEY"

# CI test secrets (used by CI Pipeline)
bao kv put secret/cerniq/ci/test \
  pg_user="c3rn1q" \
  pg_password="$CI_PG_PASSWORD" \
  redis_password="$CI_REDIS_PASSWORD" \
  jwt_secret="$CI_JWT_SECRET"

**CI NOTE (must match CI service containers):**
- `pg_user` must be `c3rn1q`
- `pg_password` must be `cerniq_ci`
- `redis_password` should be empty (Redis in CI has no requirepass)

**CI connectivity:**
- `OPENBAO_ADDR` must be reachable from the self-hosted runner
- If OpenBao is bound to `0.0.0.0:64090`, allowlist the runner IP in firewall
```

### Database Secrets Engine (Dynamic)

```bash
#!/bin/bash
# infra/scripts/openbao-setup-database.sh

# Enable database secrets engine
bao secrets enable database

# Configure PostgreSQL connection
bao write database/config/postgres \
    plugin_name=postgresql-database-plugin \
    connection_url="postgresql://{{username}}:{{password}}@postgres:64032/cerniq?sslmode=disable" \
    allowed_roles="api-role,workers-role,readonly-role" \
    username="cerniq_vault" \
    password="$VAULT_PG_PASSWORD"

# Create API role (read-write, 1h TTL)
bao write database/roles/api-role \
    db_name=postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
                        GRANT c3rn1q TO \"{{name}}\";" \
    revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Create Workers role (read-write, 1h TTL)
bao write database/roles/workers-role \
    db_name=postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
                        GRANT c3rn1q TO \"{{name}}\";" \
    revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Create Read-only role for reporting
bao write database/roles/readonly-role \
    db_name=postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
                        GRANT pg_read_all_data TO \"{{name}}\";" \
    default_ttl="4h" \
    max_ttl="8h"
```

### PKI Secrets Engine

```bash
#!/bin/bash
# infra/scripts/openbao-setup-pki.sh

# Enable PKI engine
bao secrets enable pki

# Configure max TTL
bao secrets tune -max-lease-ttl=87600h pki

# Generate root CA
bao write -format=json pki/root/generate/internal \
    common_name="Cerniq Internal CA" \
    issuer_name="cerniq-root-ca" \
    ttl=87600h > /tmp/root_ca.json

# Configure CA and CRL URLs
bao write pki/config/urls \
    issuing_certificates="http://openbao:8200/v1/pki/ca" \
    crl_distribution_points="http://openbao:8200/v1/pki/crl"

# Enable intermediate PKI for service certificates
bao secrets enable -path=pki_int pki
bao secrets tune -max-lease-ttl=43800h pki_int

# Generate intermediate CSR and sign with root
bao write -format=json pki_int/intermediate/generate/internal \
    common_name="Cerniq Intermediate CA" \
    issuer_name="cerniq-intermediate" > /tmp/int_csr.json

CSR=$(cat /tmp/int_csr.json | jq -r '.data.csr')
bao write -format=json pki/root/sign-intermediate \
    csr="$CSR" \
    format=pem_bundle \
    ttl=43800h > /tmp/int_cert.json

INT_CERT=$(cat /tmp/int_cert.json | jq -r '.data.certificate')
bao write pki_int/intermediate/set-signed certificate="$INT_CERT"

# Create role for service certificates
bao write pki_int/roles/service-cert \
    allowed_domains="cerniq.local,cerniq.app" \
    allow_subdomains=true \
    max_ttl=720h \
    generate_lease=true
```

### Transit Engine (Encryption)

```bash
#!/bin/bash
# infra/scripts/openbao-setup-transit.sh

# Enable transit engine
bao secrets enable transit

# Create key for PII encryption
bao write -f transit/keys/pii \
    type=aes256-gcm96 \
    auto_rotate_period=90d

# Create key for general encryption
bao write -f transit/keys/general \
    type=aes256-gcm96

# Test encryption
echo -n "test data" | base64 | \
    bao write transit/encrypt/pii plaintext=- -format=json | \
    jq -r '.data.ciphertext'
```

---

## 6. Authentication Methods

### AppRole Authentication

```bash
#!/bin/bash
# infra/scripts/openbao-setup-approle.sh

# Enable AppRole auth
bao auth enable approle

# Create API service role
bao write auth/approle/role/api \
    token_policies="api-policy" \
    token_ttl=1h \
    token_max_ttl=4h \
    secret_id_ttl=720h \
    secret_id_num_uses=0

# Create Workers service role
bao write auth/approle/role/workers \
    token_policies="workers-policy" \
    token_ttl=1h \
    token_max_ttl=4h \
    secret_id_ttl=720h \
    secret_id_num_uses=0

# Create CI/CD role
bao write auth/approle/role/cicd \
    token_policies="cicd-policy" \
    token_ttl=30m \
    token_max_ttl=1h \
    secret_id_ttl=24h \
    secret_id_num_uses=10

# Get role_id for each service (store in config)
bao read -field=role_id auth/approle/role/api/role-id > /tmp/api_role_id
bao read -field=role_id auth/approle/role/workers/role-id > /tmp/workers_role_id
bao read -field=role_id auth/approle/role/cicd/role-id > /tmp/cicd_role_id

# Generate secret_id (rotate as needed)
bao write -f -field=secret_id auth/approle/role/api/secret-id > /tmp/api_secret_id
bao write -f -field=secret_id auth/approle/role/workers/secret-id > /tmp/workers_secret_id
bao write -f -field=secret_id auth/approle/role/cicd/secret-id > /tmp/cicd_secret_id

echo "✅ AppRole configured"
echo "Store role_id in service config, secret_id in CI/CD secrets"
```

---

## 7. Policies

### API Policy

```hcl
# infra/config/openbao/policies/api-policy.hcl
# Read static secrets
path "secret/data/cerniq/api/*" {
  capabilities = ["read"]
}

path "secret/data/cerniq/shared/*" {
  capabilities = ["read"]
}

# Dynamic database credentials
path "database/creds/api-role" {
  capabilities = ["read"]
}

# PKI - issue certificates
path "pki_int/issue/service-cert" {
  capabilities = ["create", "update"]
}

# Transit - encrypt/decrypt PII
path "transit/encrypt/pii" {
  capabilities = ["update"]
}

path "transit/decrypt/pii" {
  capabilities = ["update"]
}

# Token self-management
path "auth/token/renew-self" {
  capabilities = ["update"]
}

path "auth/token/lookup-self" {
  capabilities = ["read"]
}
```

### Workers Policy

```hcl
# infra/config/openbao/policies/workers-policy.hcl
# Read static secrets
path "secret/data/cerniq/workers/*" {
  capabilities = ["read"]
}

path "secret/data/cerniq/shared/*" {
  capabilities = ["read"]
}

# Dynamic database credentials
path "database/creds/workers-role" {
  capabilities = ["read"]
}

# Transit - encrypt/decrypt PII
path "transit/encrypt/pii" {
  capabilities = ["update"]
}

path "transit/decrypt/pii" {
  capabilities = ["update"]
}

# Token self-management
path "auth/token/renew-self" {
  capabilities = ["update"]
}
```

### CI/CD Policy

```hcl
# infra/config/openbao/policies/cicd-policy.hcl
# Read deployment secrets
path "secret/data/cerniq/ci/*" {
  capabilities = ["read"]
}

# Read container registry credentials
path "secret/data/cerniq/shared/ghcr" {
  capabilities = ["read"]
}

# Rotate AppRole secret_ids
path "auth/approle/role/api/secret-id" {
  capabilities = ["create", "update"]
}

path "auth/approle/role/workers/secret-id" {
  capabilities = ["create", "update"]
}
```

### Apply Policies

```bash
#!/bin/bash
# Apply all policies
for policy in infra/config/openbao/policies/*.hcl; do
    name=$(basename "$policy" .hcl)
    bao policy write "$name" "$policy"
    echo "✅ Policy $name applied"
done

bao policy list
```

---

## 8. Agent Configuration

### Agent for API Service

```hcl
# infra/config/openbao/agent-api.hcl
pid_file = "/openbao/agent.pid"

auto_auth {
  method "approle" {
    mount_path = "auth/approle"
    config = {
      role_id_file_path = "/openbao/config/api_role_id"
      secret_id_file_path = "/openbao/config/api_secret_id"
      remove_secret_id_file_after_reading = false
    }
  }

  sink "file" {
    config = {
      path = "/secrets/.token"
      mode = 0600
    }
  }
}

cache {
  use_auto_auth_token = true
}

vault {
  address = "http://openbao:8200"
}

# Template for environment file
template {
  source = "/openbao/templates/api-env.tpl"
  destination = "/secrets/api.env"
  perms = 0600
  command = "pkill -HUP node || true"  # Graceful reload signal
}

# Template for PostgreSQL password
template {
  source = "/openbao/templates/pg-password.tpl"
  destination = "/secrets/pg_password"
  perms = 0600
}
```

### Template Files

```gotemplate
{{/* infra/config/openbao/templates/api-env.tpl */}}
# Auto-generated by OpenBao Agent - DO NOT EDIT
# Generated: {{ timestamp }}

{{- with secret "secret/data/cerniq/api/config" }}
DATABASE_URL=postgresql://{{ .Data.data.pg_user }}:{{ .Data.data.pg_password }}@pgbouncer:64033/cerniq
REDIS_URL=redis://:{{ .Data.data.redis_password }}@redis:64039/0
JWT_SECRET={{ .Data.data.jwt_secret }}
{{- end }}

{{- with secret "secret/data/cerniq/shared/external" }}
ANAF_CLIENT_ID={{ .Data.data.anaf_client_id }}
ANAF_CLIENT_SECRET={{ .Data.data.anaf_client_secret }}
RESEND_API_KEY={{ .Data.data.resend_api_key }}
{{- end }}
```

```gotemplate
{{/* infra/config/openbao/templates/pg-password.tpl */}}
{{- with secret "database/creds/api-role" -}}
{{ .Data.password }}
{{- end -}}
```

### Docker Compose with Agent Sidecar

```yaml
# docker-compose.yml - API with OpenBao Agent
services:
  api:
    image: ghcr.io/neacisu/cerniq-api:latest
    depends_on:
      openbao-agent-api:
        condition: service_healthy
    volumes:
      - api_secrets:/secrets:ro
    environment:
      - ENV_FILE=/secrets/api.env
    # ... rest of config

  openbao-agent-api:
    image: quay.io/openbao/openbao:2.5.0
    command: agent -config=/openbao/config/agent-api.hcl
    volumes:
      - ./infra/config/openbao:/openbao/config:ro
      - ./infra/config/openbao/templates:/openbao/templates:ro
      - api_secrets:/secrets
      - ./secrets/api_role_id:/openbao/config/api_role_id:ro
      - ./secrets/api_secret_id:/openbao/config/api_secret_id:ro
    networks:
      - cerniq_backend
    healthcheck:
      test: ["CMD", "test", "-f", "/secrets/api.env"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  api_secrets:
```

---

## 9. Service Integration

### Node.js/TypeScript Integration

```typescript
// packages/shared/src/lib/secrets.ts
import { readFileSync, existsSync, watchFile } from 'fs';
import { EventEmitter } from 'events';

export class SecretsManager extends EventEmitter {
  private secrets: Record<string, string> = {};
  private envFile: string;

  constructor(envFile: string = '/secrets/api.env') {
    super();
    this.envFile = envFile;
    this.loadSecrets();
    this.watchSecrets();
  }

  private loadSecrets(): void {
    if (!existsSync(this.envFile)) {
      console.warn(`Secrets file not found: ${this.envFile}`);
      return;
    }

    const content = readFileSync(this.envFile, 'utf-8');
    const newSecrets: Record<string, string> = {};

    content.split('\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key) {
          newSecrets[key.trim()] = valueParts.join('=').trim();
        }
      }
    });

    // Check for changes
    const changed = Object.keys(newSecrets).some(
      k => this.secrets[k] !== newSecrets[k]
    );

    if (changed) {
      this.secrets = newSecrets;
      this.emit('secrets-updated', this.secrets);
    }
  }

  private watchSecrets(): void {
    watchFile(this.envFile, { interval: 1000 }, () => {
      console.log('🔄 Secrets file changed, reloading...');
      this.loadSecrets();
    });
  }

  get(key: string): string | undefined {
    return this.secrets[key] || process.env[key];
  }

  getRequired(key: string): string {
    const value = this.get(key);
    if (!value) {
      throw new Error(`Required secret not found: ${key}`);
    }
    return value;
  }
}

// Singleton instance
export const secrets = new SecretsManager();
```

### Usage in Fastify

```typescript
// apps/api/src/config.ts
import { secrets } from '@cerniq/shared/secrets';

// React to secret updates
secrets.on('secrets-updated', () => {
  console.log('🔐 Secrets updated, refreshing connections...');
  // Trigger reconnection if needed
});

export const config = {
  database: {
    url: secrets.getRequired('DATABASE_URL'),
  },
  redis: {
    url: secrets.getRequired('REDIS_URL'),
  },
  jwt: {
    secret: secrets.getRequired('JWT_SECRET'),
  },
  providers: {
    anaf: {
      clientId: secrets.get('ANAF_CLIENT_ID'),
      clientSecret: secrets.get('ANAF_CLIENT_SECRET'),
    },
  },
};
```

---

## 10. Rotation Procedures

### Static Secrets Rotation (Quarterly)

```bash
#!/bin/bash
# infra/scripts/openbao-rotate-static-secrets.sh

set -euo pipefail

echo "🔄 Starting quarterly secrets rotation..."

# Generate new secrets
NEW_PG_PASS=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 64)
NEW_REDIS_PASS=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 64)
NEW_JWT_SECRET=$(openssl rand -base64 64)

# Update in OpenBao (automatic versioning)
bao kv put secret/cerniq/api/config \
    pg_user=c3rn1q \
    pg_password="$NEW_PG_PASS" \
    redis_password="$NEW_REDIS_PASS" \
    jwt_secret="$NEW_JWT_SECRET"

# Update PostgreSQL password
docker exec cerniq-postgres psql -U postgres -c \
    "ALTER USER c3rn1q WITH PASSWORD '$NEW_PG_PASS';"

# Update Redis password (requires restart)
docker exec cerniq-redis redis-cli CONFIG SET requirepass "$NEW_REDIS_PASS"

# Rotate AppRole secret_ids
bao write -f auth/approle/role/api/secret-id \
    -field=secret_id > /tmp/new_api_secret_id
bao write -f auth/approle/role/workers/secret-id \
    -field=secret_id > /tmp/new_workers_secret_id

# Update secret_id files
cp /tmp/new_api_secret_id secrets/api_secret_id
cp /tmp/new_workers_secret_id secrets/workers_secret_id
chmod 600 secrets/*_secret_id

# Agents will automatically pick up new secrets
echo "✅ Static secrets rotated!"
echo "⚠️  Services will receive new secrets within Agent TTL (default: 5 minutes)"

# Cleanup
shred -u /tmp/new_*_secret_id
```

### Dynamic Secrets (Automatic)

Dynamic secrets (database credentials) rotate automatically:

1. Service requests credentials from OpenBao
2. OpenBao creates temporary PostgreSQL role with TTL
3. When TTL expires, role is automatically revoked
4. Service requests new credentials (via Agent or direct API)

```typescript
// Example: Getting dynamic credentials
async function getDatabaseCredentials(): Promise<{ username: string; password: string }> {
  const response = await fetch('http://openbao:8200/v1/database/creds/api-role', {
    headers: { 'X-Vault-Token': token },
  });
  
  const { data } = await response.json();
  return {
    username: data.username,
    password: data.password,
    // Lease duration: 1 hour
    // Automatically renewed or rotated
  };
}
```

---

## 11. Backup & Recovery

### Daily Raft Snapshots

```bash
#!/bin/bash
# infra/scripts/openbao-backup.sh
# Run via cron daily at 04:00

set -euo pipefail

BACKUP_DIR="/var/backups/cerniq/openbao"
STORAGE_BOX="u502048@u502048.your-storagebox.de"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Create Raft snapshot
bao operator raft snapshot save "$BACKUP_DIR/snapshot_$DATE.snap"

# Compress
gzip "$BACKUP_DIR/snapshot_$DATE.snap"

# Upload to Hetzner Storage Box
scp -P 23 -i /root/.ssh/hetzner_storagebox \
    "$BACKUP_DIR/snapshot_$DATE.snap.gz" \
    "$STORAGE_BOX:./backups/cerniq/openbao/"

# Cleanup old local backups (keep 7 days)
find "$BACKUP_DIR" -name "snapshot_*.snap.gz" -mtime +7 -delete

echo "✅ OpenBao backup completed: snapshot_$DATE.snap.gz"
```

### Disaster Recovery

```bash
#!/bin/bash
# infra/scripts/openbao-disaster-recovery.sh

set -euo pipefail

SNAPSHOT_FILE="${1:-/tmp/snapshot.snap}"
KEYS_FILE="${2:-/tmp/unseal_keys.txt}"

echo "🔴 DISASTER RECOVERY - OpenBao"
echo "================================"

# 1. Stop existing OpenBao
docker compose stop openbao

# 2. Clear data directory
docker run --rm -v openbao_data:/data alpine sh -c "rm -rf /data/*"

# 3. Start fresh OpenBao
docker compose up -d openbao
sleep 5

# 4. Restore from snapshot
bao operator raft snapshot restore -force "$SNAPSHOT_FILE"

# 5. Unseal
echo "🔓 Unsealing OpenBao..."
for i in 1 2 3; do
    KEY=$(sed -n "${i}p" "$KEYS_FILE")
    bao operator unseal "$KEY"
done

# 6. Verify
bao status
bao secrets list

echo "✅ Disaster recovery completed!"
```

---

## 12. Monitoring

### Prometheus Metrics

```yaml
# Prometheus scrape config
scrape_configs:
  - job_name: 'openbao'
    metrics_path: '/v1/sys/metrics'
    params:
      format: ['prometheus']
    static_configs:
      - targets: ['openbao:8200']
```

### Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `vault_core_unsealed` | 1 if unsealed | = 0 → Critical |
| `vault_token_count` | Active tokens | > 1000 → Warning |
| `vault_secret_lease_count` | Active leases | > 5000 → Warning |
| `vault_audit_log_request_failure` | Audit failures | > 0 → Critical |
| `vault_runtime_alloc_bytes` | Memory usage | > 400MB → Warning |

### Health Check Script

```bash
#!/bin/bash
# infra/scripts/openbao-health-check.sh

STATUS=$(curl -s http://localhost:64090/v1/sys/health)

SEALED=$(echo "$STATUS" | jq -r '.sealed')
INITIALIZED=$(echo "$STATUS" | jq -r '.initialized')

if [[ "$INITIALIZED" != "true" ]]; then
    echo "🔴 CRITICAL: OpenBao not initialized"
    exit 2
fi

if [[ "$SEALED" == "true" ]]; then
    echo "🔴 CRITICAL: OpenBao is sealed"
    exit 2
fi

echo "✅ OpenBao healthy (unsealed, initialized)"
exit 0
```

---

## 13. Troubleshooting

### OpenBao is Sealed

```bash
# Check status
bao status

# If sealed, unseal with keys
bao operator unseal <key1>
bao operator unseal <key2>
bao operator unseal <key3>

# If keys are lost, restore from backup
./infra/scripts/openbao-disaster-recovery.sh /path/to/snapshot.snap /path/to/keys.txt
```

### Agent Not Rendering Templates

```bash
# Check agent logs
docker logs cerniq-openbao-agent-api

# Common issues:
# 1. Invalid role_id/secret_id
bao write auth/approle/login role_id=... secret_id=...

# 2. Policy missing permissions
bao token capabilities <token> secret/data/cerniq/api/config

# 3. Secret path doesn't exist
bao kv get secret/cerniq/api/config
```

### Token Expired

```bash
# Check token info
bao token lookup

# Renew token (if renewable)
bao token renew

# Generate new token (if AppRole)
bao write auth/approle/login \
    role_id="$(cat /path/to/role_id)" \
    secret_id="$(cat /path/to/secret_id)"
```

### Performance Issues

```bash
# Check lease count
bao read sys/metrics | grep lease

# Revoke expired leases
bao lease revoke -prefix database/creds/

# Check memory usage
docker stats cerniq-openbao --no-stream
```

---

## Referințe

- [OpenBao Documentation](https://openbao.org/docs/)
- [ADR-0033: OpenBao Secrets Management](../adr/ADR%20Etapa%200/ADR-0033-OpenBao-Secrets-Management.md)
- [Backup Strategy](./backup-strategy.md)
- [Security Policy](../governance/security-policy.md)

---

**Document generat:** 5 Februarie 2026  
**Versiune:** 1.0
