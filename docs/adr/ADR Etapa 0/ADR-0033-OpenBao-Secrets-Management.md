# ADR-0033: OpenBao pentru Centralized Secrets Management

**Status:** Accepted  
**Data:** 2026-02-05  
**Deciders:** Alex (1-Person-Team)  
**Supersedes:** ADR-0017 (Docker Secrets Strategy)

---

## Context

Gestionarea secretelor prin Docker secrets și fișiere `.env` prezintă limitări semnificative:

1. **Rotație manuală** — Scripturile de rotație necesită intervenție umană
2. **Lipsa auditului** — Nu există trail pentru accesarea secretelor
3. **Dynamic secrets imposibile** — Nu putem genera credențiale temporare
4. **Scalabilitate** — Cu 10+ servicii, managementul devine complex
5. **Certificate management** — TLS certificates necesită management separat

## Decizie

**Adoptăm OpenBao** (fork open-source al HashiCorp Vault) ca platformă centralizată pentru:

- **Secrets Management** — Toate credențialele aplicației
- **Dynamic Secrets** — Credențiale PostgreSQL/Redis generate on-demand
- **PKI** — Certificate management automat
- **Encryption as a Service** — Encrypt/decrypt without exposing keys
- **Audit Logging** — Trail complet pentru compliance

## Implementare pe Etape

### Etapa 0 (Foundation) — Sprint 4

| Component | Descriere |
|-----------|-----------|
| OpenBao Server | Container standalone în docker-compose |
| Auto-Unseal | Transit auto-unseal cu recovery keys |
| KV Secrets Engine | Static secrets (API keys, passwords existente) |
| AppRole Auth | Autentificare servicii via role_id/secret_id |
| Policies | Politici granulare per serviciu |
| Agent Sidecar | Agent pentru injection în containere |

### Etapa 1-2 (Dynamic Secrets)

| Component | Descriere |
|-----------|-----------|
| Database Engine | Dynamic PostgreSQL credentials |
| PKI Engine | Auto-issue TLS certificates |
| Transit Engine | Encryption for PII data |
| LDAP/OIDC | SSO integration (dacă necesar) |

### Etapa 3+ (Advanced)

| Component | Descriere |
|-----------|-----------|
| Namespaces | Multi-tenant secret isolation |
| Sentinel Policies | Advanced policy-as-code |
| Replication | HA with Raft storage |
| HSM Integration | Hardware security modules |

## Arhitectura

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         CERNIQ Secrets Architecture                        │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐    │
│  │     API         │     │    Workers      │     │   Web-Admin     │    │
│  │   (Fastify)     │     │   (BullMQ)      │     │    (React)      │    │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘    │
│           │                       │                       │             │
│           │ AppRole Auth          │ AppRole Auth          │ (via API)   │
│           ▼                       ▼                       │             │
│  ┌────────────────────────────────────────────────────────┴────────┐    │
│  │                     OpenBao Agent (Sidecar)                      │    │
│  │  • Template rendering pentru secrets injection                   │    │
│  │  • Auto-renewal of leases                                       │    │
│  │  • Caching pentru performance                                   │    │
│  └──────────────────────────────┬──────────────────────────────────┘    │
│                                 │                                       │
│                                 │ mTLS                                  │
│                                 ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                       OpenBao Server                              │   │
│  │                                                                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │   │
│  │  │  KV Engine   │  │  Database    │  │  PKI Engine  │           │   │
│  │  │  (secrets)   │  │  Engine      │  │  (certs)     │           │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │   │
│  │                                                                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │   │
│  │  │   Transit    │  │   AppRole    │  │    Audit     │           │   │
│  │  │  (encrypt)   │  │   (auth)     │  │   (logs)     │           │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │   │
│  │                                                                   │   │
│  │  Storage: Integrated Raft (HA-ready)                             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                 │                                       │
│                                 │ Encrypted                             │
│                                 ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Hetzner Storage Box                            │   │
│  │                    (Backup unseal keys + snapshots)               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Specificații Tehnice

### Container OpenBao

```yaml
# docker-compose.yml
services:
  openbao:
    image: quay.io/openbao/openbao:2.2.0
    container_name: cerniq-openbao
    cap_add:
      - IPC_LOCK
    environment:
      - BAO_ADDR=http://127.0.0.1:8200
      - BAO_API_ADDR=http://openbao:8200
      - BAO_CLUSTER_ADDR=https://openbao:8201
    volumes:
      - openbao_data:/openbao/data
      - ./infra/config/openbao:/openbao/config:ro
    command: server
    ports:
      - "127.0.0.1:64200:8200"  # API (localhost only)
    networks:
      cerniq_backend:
        ipv4_address: 172.28.0.50
    healthcheck:
      test: ["CMD", "bao", "status", "-format=json"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped
```

### Configurație Server

```hcl
# infra/config/openbao/openbao.hcl
ui = true
cluster_name = "cerniq-openbao"
log_level = "info"

storage "raft" {
  path = "/openbao/data"
  node_id = "cerniq-openbao-1"
}

listener "tcp" {
  address = "0.0.0.0:8200"
  tls_disable = true  # TLS handled by Traefik
  telemetry {
    unauthenticated_metrics_access = true
  }
}

api_addr = "http://openbao:8200"
cluster_addr = "https://openbao:8201"

telemetry {
  prometheus_retention_time = "30s"
  disable_hostname = true
}
```

### Policies per Serviciu

```hcl
# policies/api-policy.hcl
path "secret/data/cerniq/api/*" {
  capabilities = ["read"]
}

path "secret/data/cerniq/shared/*" {
  capabilities = ["read"]
}

path "database/creds/api-role" {
  capabilities = ["read"]
}

path "pki/issue/api" {
  capabilities = ["create", "update"]
}
```

```hcl
# policies/workers-policy.hcl
path "secret/data/cerniq/workers/*" {
  capabilities = ["read"]
}

path "secret/data/cerniq/shared/*" {
  capabilities = ["read"]
}

path "database/creds/workers-role" {
  capabilities = ["read"]
}

path "transit/encrypt/pii" {
  capabilities = ["update"]
}

path "transit/decrypt/pii" {
  capabilities = ["update"]
}
```

### AppRole Setup

```bash
#!/bin/bash
# infra/scripts/openbao-setup-approle.sh

# Enable AppRole auth
bao auth enable approle

# Create API role
bao write auth/approle/role/api \
    token_policies="api-policy" \
    token_ttl=1h \
    token_max_ttl=4h \
    secret_id_ttl=24h \
    secret_id_num_uses=0

# Create Workers role
bao write auth/approle/role/workers \
    token_policies="workers-policy" \
    token_ttl=1h \
    token_max_ttl=4h \
    secret_id_ttl=24h \
    secret_id_num_uses=0

# Get role_id (store in CI/CD secrets)
bao read auth/approle/role/api/role-id
bao read auth/approle/role/workers/role-id

# Generate secret_id (rotate quarterly)
bao write -f auth/approle/role/api/secret-id
bao write -f auth/approle/role/workers/secret-id
```

### Agent Template

```hcl
# infra/config/openbao/agent-api.hcl
auto_auth {
  method "approle" {
    mount_path = "auth/approle"
    config = {
      role_id_file_path = "/openbao/role_id"
      secret_id_file_path = "/openbao/secret_id"
      remove_secret_id_file_after_reading = false
    }
  }

  sink "file" {
    config = {
      path = "/openbao/.token"
      mode = 0600
    }
  }
}

template {
  source = "/openbao/templates/env.tpl"
  destination = "/secrets/.env"
  perms = 0600
}

template {
  source = "/openbao/templates/pg.tpl"
  destination = "/secrets/pg_password"
  perms = 0600
}
```

### Secret Template

```gotemplate
{{/* /openbao/templates/env.tpl */}}
{{- with secret "secret/data/cerniq/api/config" -}}
DATABASE_URL=postgresql://{{ .Data.data.pg_user }}:{{ .Data.data.pg_password }}@pgbouncer:64033/cerniq
REDIS_URL=redis://:{{ .Data.data.redis_password }}@redis:64039/0
JWT_SECRET={{ .Data.data.jwt_secret }}
{{- end }}

{{- with secret "secret/data/cerniq/shared/external" -}}
ANAF_CLIENT_SECRET={{ .Data.data.anaf_client_secret }}
RESEND_API_KEY={{ .Data.data.resend_api_key }}
{{- end }}
```

## Rotație Automată

### Static Secrets (Quarterly)

```bash
#!/bin/bash
# infra/scripts/openbao-rotate-secrets.sh

# Generează parole noi
NEW_PG_PASS=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 64)
NEW_REDIS_PASS=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 64)
NEW_JWT_SECRET=$(openssl rand -base64 64)

# Actualizează în OpenBao (versioning automat)
bao kv put secret/cerniq/api/config \
    pg_user=cerniq_app \
    pg_password="$NEW_PG_PASS" \
    redis_password="$NEW_REDIS_PASS" \
    jwt_secret="$NEW_JWT_SECRET"

# Serviciile vor primi automat noile secrete via Agent
# (după TTL expiry sau trigger manual)
```

### Dynamic Secrets (Auto-Rotation)

```bash
# Configurare Database Engine pentru PostgreSQL
bao secrets enable database

bao write database/config/postgres \
    plugin_name=postgresql-database-plugin \
    connection_url="postgresql://{{username}}:{{password}}@postgres:64032/cerniq?sslmode=disable" \
    allowed_roles="api-role,workers-role" \
    username="cerniq_vault" \
    password="initial_password"

# Roluri cu TTL (auto-expire)
bao write database/roles/api-role \
    db_name=postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}' IN ROLE cerniq_app;" \
    default_ttl="1h" \
    max_ttl="24h"
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    steps:
      - name: 🔐 Get OpenBao Secrets
        uses: hashicorp/vault-action@v2
        with:
          url: ${{ secrets.OPENBAO_ADDR }}
          method: approle
          roleId: ${{ secrets.OPENBAO_ROLE_ID }}
          secretId: ${{ secrets.OPENBAO_SECRET_ID }}
          secrets: |
            secret/data/cerniq/ci/deploy ghcr_token | GHCR_TOKEN ;
            secret/data/cerniq/ci/deploy ssh_key | SSH_KEY
```

## Backup & DR

### Unseal Keys

```bash
# După init, backup unseal keys în Hetzner Storage Box
bao operator init -key-shares=5 -key-threshold=3 > /tmp/init.txt

# Encrypt și upload
gpg --symmetric --armor /tmp/init.txt
scp -P 23 /tmp/init.txt.asc u502048@storagebox:backups/openbao/unseal-keys.gpg

# Secure delete local
shred -u /tmp/init.txt /tmp/init.txt.asc
```

### Automatic Snapshots

```bash
# Raft snapshots (daily via cron)
bao operator raft snapshot save /tmp/openbao-snapshot.snap
scp -P 23 /tmp/openbao-snapshot.snap u502048@storagebox:backups/openbao/
```

## Consecințe

### Pozitive

- ✅ **Rotație automată** — Secrets rotate fără downtime
- ✅ **Audit complet** — Trail pentru compliance (GDPR, ISO 27001)
- ✅ **Dynamic secrets** — Credențiale temporare, minimize exposure
- ✅ **Centralizare** — Single source of truth pentru secrets
- ✅ **PKI integrat** — Certificate management automat
- ✅ **Zero-trust ready** — mTLS între servicii

### Negative

- ⚠️ **Complexitate** — Learning curve pentru operare
- ⚠️ **Single point of failure** — Necesită HA în production
- ⚠️ **Resource overhead** — ~256MB RAM per instanță
- ⚠️ **Unseal management** — Necesită procedură DR pentru unseal keys

### Mitigări

| Risc | Mitigare |
|------|----------|
| OpenBao unavailable | Secrets cached în Agent, retry logic |
| Unseal keys lost | Backup encrypted în Hetzner Storage Box |
| Performance | Agent caching, optimized policies |
| Complexity | Automation scripts, runbooks detaliate |

## Referințe

- [OpenBao Documentation](https://openbao.org/docs/)
- [HashiCorp Vault Patterns](https://developer.hashicorp.com/vault/tutorials)
- [ADR-0020: BorgBackup](./ADR-0020-BorgBackup-cu-Hetzner-Storage-Box.md)
- [NIST SP 800-57: Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)

---

**Document generat:** 5 Februarie 2026  
**Versiune:** 1.0
