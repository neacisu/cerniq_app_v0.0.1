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

| Component         | Descriere                                                                     |
| ----------------- | ----------------------------------------------------------------------------- |
| OpenBao Server    | Centralizat pe orchestrator, expus prin Traefik: `https://s3cr3ts.neanelu.ro` |
| Auto-Unseal       | Transit auto-unseal cu recovery keys                                          |
| KV Secrets Engine | Static secrets (API keys, passwords existente)                                |
| AppRole Auth      | Autentificare servicii via role_id/secret_id                                  |
| Policies          | Politici granulare per serviciu                                               |
| Agent Sidecar     | Agent pentru injection în containere                                          |

### Etapa 1-2 (Dynamic Secrets)

| Component       | Descriere                      |
| --------------- | ------------------------------ |
| Database Engine | Dynamic PostgreSQL credentials |
| PKI Engine      | Auto-issue TLS certificates    |
| Transit Engine  | Encryption for PII data        |
| LDAP/OIDC       | SSO integration (dacă necesar) |

### Etapa 3+ (Advanced)

| Component         | Descriere                     |
| ----------------- | ----------------------------- |
| Namespaces        | Multi-tenant secret isolation |
| Sentinel Policies | Advanced policy-as-code       |
| Replication       | HA with Raft storage          |
| HSM Integration   | Hardware security modules     |

## Arhitectura

```text
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

## Specificatii tehnice (implementare curenta)

### OpenBao centralizat (orchestrator)

- Address: `OPENBAO_ADDR=https://s3cr3ts.neanelu.ro`
- CT109/CT110 NU ruleaza OpenBao server local; ruleaza doar agenti.
- Paths KV sunt pe KV v1: `secret/cerniq/...` (fara `secret/data/...`).
- Dynamic DB creds folosesc mount dedicat pentru Cerniq: `cerniq-db/`.
- Traficul intern CT109/CT110 catre OpenBao este rutat prin gateway-ul `hz.247` (VIP `10.0.1.10:443`) pentru stabilitate.

### Paths (KV v1) si mount DB (dedicat)

Exemple KV v1:

- `secret/cerniq/api/config`
- `secret/cerniq/workers/config`
- `secret/cerniq/shared/external`
- `secret/cerniq/infra/pgbouncer`
- `secret/cerniq/ci/test`

Database engine dedicat:

- `cerniq-db/roles/api-dynamic`
- `cerniq-db/roles/workers-dynamic`
- `cerniq-db/creds/api-dynamic`
- `cerniq-db/creds/workers-dynamic`

Nota: pentru stabilitate, TTL-urile rolurilor dinamice sunt setate astfel incat sa nu expire prea des (ex: default 12h, max 72h), ca sa evitam erori de tip "no such user" in PgBouncer.

### AppRoles (naming)

- `auth/approle/role/cerniq-api`
- `auth/approle/role/cerniq-workers`
- `auth/approle/role/cerniq-cicd`
- `auth/approle/role/cerniq-infra`

### Agent template rendering (CT109/CT110)

Agenti randeaza secretele in tmpfs:

- `/opt/cerniq/runtime-secrets/api/api.env`
- `/opt/cerniq/runtime-secrets/workers/workers.env`
- `/opt/cerniq/runtime-secrets/infra/pgbouncer.ini`

Template-urile folosesc:

- KV v1: `secret/cerniq/...`
- DB creds: `cerniq-db/creds/*-dynamic`

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
    pg_user=c3rn1q \
    pg_password="$NEW_PG_PASS" \
    redis_password="$NEW_REDIS_PASS" \
    jwt_secret="$NEW_JWT_SECRET"

# Serviciile vor primi automat noile secrete via Agent
# (după TTL expiry sau trigger manual)
```

### Dynamic Secrets (Auto-Rotation)

```bash
# Configurare Database Engine pentru PostgreSQL (IMPLEMENTARE CURENTA)
#
# - mount dedicat: cerniq-db/
# - PostgreSQL este extern (CT107), nu postgres in docker-compose
#
# Rolurile de credențiale dinamice sunt:
#   - cerniq-db/roles/api-dynamic
#   - cerniq-db/roles/workers-dynamic
#
# Credențiale sunt citite de agenti din:
#   - cerniq-db/creds/api-dynamic
#   - cerniq-db/creds/workers-dynamic
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

| Risc                | Mitigare                                |
| ------------------- | --------------------------------------- |
| OpenBao unavailable | Secrets cached în Agent, retry logic    |
| Unseal keys lost    | Backup encrypted în Hetzner Storage Box |
| Performance         | Agent caching, optimized policies       |
| Complexity          | Automation scripts, runbooks detaliate  |

## Referințe

- [OpenBao Documentation](https://openbao.org/docs/)
- [HashiCorp Vault Patterns](https://developer.hashicorp.com/vault/tutorials)
- [ADR-0020: BorgBackup](./ADR-0020-BorgBackup-cu-Hetzner-Storage-Box.md)
- [NIST SP 800-57: Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)

---

**Document generat:** 5 Februarie 2026  
**Versiune:** 1.0
