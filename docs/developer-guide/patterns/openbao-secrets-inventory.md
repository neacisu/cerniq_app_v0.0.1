# OpenBao Secrets Inventory — Cerniq

**Priority:** BLOCKER | **Version:** 1.0 | **February 2026**

## Overview

Complete inventory of all OpenBao secret paths used by Cerniq. All secrets are stored in OpenBao (KV v1 and Database engine) and rendered at runtime via agents. Never hardcode secrets in code or environment files.

---

## 1. Secret Paths

### `secret/cerniq/api/config`

Application config for the API service.

| Key           | Description                    | Rotation |
|---------------|--------------------------------|----------|
| `db_host`     | PostgreSQL host (PgBouncer)    | Rare     |
| `db_port`     | PgBouncer port (64033)         | Rare     |
| `db_user`     | API database user              | Via DB engine |
| `db_password` | API database password         | Via DB engine |
| `redis_url`   | Redis connection string        | Rare     |
| `jwt_secret`  | JWT signing secret             | Quarterly |
| `jwt_refresh_secret` | Refresh token secret       | Quarterly |

**AppRole:** `api`

---

### `secret/cerniq/shared/external`

External API credentials shared across API and workers.

| Key                | Description           | Provider   |
|--------------------|-----------------------|------------|
| `anaf_api_key`     | ANAF API key          | ANAF       |
| `termene_api_key`  | Termene.ro API key    | Termene    |
| `hunter_api_key`   | Hunter.io API key     | Hunter     |
| `resend_api_key`   | Resend email API key  | Resend     |
| `openai_api_key`   | OpenAI API key        | OpenAI     |

**AppRole:** `api`, `workers`

---

### `secret/cerniq/ci/test`

Credentials for CI/CD and test environments.

| Key           | Description              |
|---------------|--------------------------|
| `db_url`      | Test database URL        |
| `redis_url`   | Test Redis URL           |
| `api_base_url`| Staging API URL          |

**AppRole:** `cicd`

---

### `cerniq-db/creds/api-dynamic`

Dynamic database credentials (short-lived, auto-rotated by OpenBao).

- **Role:** `api-dynamic`
- **TTL:** 1h (renewed by agent)
- **Usage:** API connects to PgBouncer with these creds

**AppRole:** `api`, `infra`

---

## 2. Rotation Procedure

### Static Secrets (KV)

1. Update value in OpenBao: `bao kv put secret/cerniq/shared/external anaf_api_key=<new_value>`
2. Restart OpenBao agent (or wait for template re-render)
3. Restart API/workers to pick up new secrets
4. Verify health checks pass

### Dynamic DB Creds

- Rotated automatically by OpenBao Database engine
- Agent renews token before expiry
- No manual intervention for `api-dynamic`

### JWT Secrets

1. Generate new secret: `openssl rand -hex 32`
2. Update in `secret/cerniq/api/config`
3. Deploy with both old and new valid for grace period (e.g. 24h)
4. Remove old after migration

---

## 3. Access Policies per AppRole

| AppRole   | Paths                                                      |
|-----------|------------------------------------------------------------|
| `api`     | `secret/cerniq/api/config`, `secret/cerniq/shared/external`, `cerniq-db/creds/api-dynamic` |
| `workers` | `secret/cerniq/shared/external`, DB creds (workers template) |
| `infra`   | `cerniq-db/creds/*`, backup-related paths                  |
| `cicd`    | `secret/cerniq/ci/test`                                    |

---

## 4. Agent Templates

Templates render secrets to files under `/opt/cerniq/runtime-secrets/`:

- `api-env.tpl` → `runtime-secrets/api/.env`
- `workers-env.tpl` → `runtime-secrets/workers/.env`
- `pg-password-api.tpl` → used by PgBouncer userlist

---

## 5. Romanian Context

- **ANAF** credentials: used for CUI validation, TVA status, e-Factura
- **CUI** (Cod Unic de Identificare): Romanian company identifier; ANAF API requires valid credentials
- **e-Factura:** Romanian electronic invoicing; ANAF integration mandatory

---

## 6. Reading Secrets in Code

Never read directly from OpenBao in application code. Agents render to files; app reads from env or file:

```typescript
// From env (agent renders to .env)
const dbPassword = process.env.DB_PASSWORD;

// Or from file
const secrets = JSON.parse(fs.readFileSync('/opt/cerniq/runtime-secrets/api/config.json'));
```

---

## 7. Adding New Secrets

1. Add key to appropriate path in OpenBao
2. Update agent template to include new key
3. Restart agent
4. Update app to read new env var or config key
5. Document in this inventory

---

## 8. Related Documents

- `docs/infrastructure/openbao-setup-guide.md` — Setup
- `docs/runbooks/openbao-recovery.md` — Recovery
- `docs/infrastructure/secrets-rotation-procedure.md` — Rotation
- `external-api-integration.md` — Credential usage

---

## Checklist

- [ ] All paths documented
- [ ] AppRole access minimal
- [ ] Rotation procedure tested
- [ ] No secrets in git or Docker images
- [ ] New secrets documented
