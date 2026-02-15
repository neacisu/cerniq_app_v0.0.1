# CERNIQ.APP — ETAPA 0: ENVIRONMENT VARIABLES REFERENCE

## Documentație Completă pentru Toate Variabilele de Mediu

### Versiunea 1.1 | 18 Ianuarie 2026

> **📋 ADR Asociat:** [ADR-0030: Environment Management](../../adr/ADR%20Etapa%200/ADR-0030-Environment-Management.md)

---

**DOCUMENT STATUS:** NORMATIV — Subordonat Master Spec v1.2  
**SCOPE:** Referință completă pentru toate variabilele de environment

---

## CUPRINS

1. [API Service Variables](#1-api-service-variables)
2. [Database Variables](#2-database-variables)
3. [Redis Variables](#3-redis-variables)
4. [Authentication Variables](#4-authentication-variables)
5. [External Services](#5-external-services)
6. [Observability Variables](#6-observability-variables)
7. [Environment-Specific](#7-environment-specific)

---

## 1. API SERVICE VARIABLES

| Variable           | Required | Default       | Description                                            |
| ------------------ | -------- | ------------- | ------------------------------------------------------ |
| `NODE_ENV`         | Yes      | `development` | Environment: development, staging, production          |
| `HOST`             | No       | `0.0.0.0`     | API server bind address                                |
| `PORT`             | No       | `64000`       | API server port                                        |
| `APP_VERSION`      | No       | `0.1.0`       | Application version for logging/telemetry              |
| `LOG_LEVEL`        | No       | `info`        | Pino log level: trace, debug, info, warn, error, fatal |
| `SHUTDOWN_TIMEOUT` | No       | `30000`       | Graceful shutdown timeout in milliseconds              |

**Exemplu .env:**

```bash
NODE_ENV=production
HOST=0.0.0.0
PORT=64000
APP_VERSION=0.1.0
LOG_LEVEL=info
SHUTDOWN_TIMEOUT=30000
```

---

## 2. DATABASE VARIABLES

> ⚠️ **Notă OpenBao (5 Februarie 2026):**
> În producție, toate credențialele database sunt gestionate prin OpenBao:
>
> - **Static secrets**: `secret/cerniq/api/config` (pg_password, redis_password)
> - **Dynamic secrets**: `database/creds/api-role` (credențiale temporare PostgreSQL)
>
> Variabilele `_FILE` sunt încă suportate pentru compatibilitate, dar nu sunt recomandate.
> Vezi: [OpenBao Setup Guide](../../infrastructure/openbao-setup-guide.md)

## PostgreSQL

| Variable                 | Required | Default    | Description                                      |
| ------------------------ | -------- | ---------- | ------------------------------------------------ |
| `DATABASE_URL`           | Yes\*    | -          | Full PostgreSQL connection string                |
| `DATABASE_URL_FILE`      | Yes\*    | -          | Path to file (OpenBao Agent → `/secrets/db.env`) |
| `POSTGRES_HOST`          | No       | `postgres` | PostgreSQL hostname                              |
| `POSTGRES_PORT`          | No       | `64033`    | PostgreSQL port (prin PgBouncer)                 |
| `POSTGRES_USER`          | No       | `cerniq`   | PostgreSQL username                              |
| `POSTGRES_PASSWORD`      | Yes\*    | -          | PostgreSQL password                              |
| `POSTGRES_PASSWORD_FILE` | Yes\*    | -          | Path to file (OpenBao Agent → `/secrets/db.env`) |
| `POSTGRES_DB`            | No       | `cerniq`   | Database name                                    |
| `DATABASE_POOL_MIN`      | No       | `2`        | Minimum connection pool size                     |
| `DATABASE_POOL_MAX`      | No       | `20`       | Maximum connection pool size                     |

\*Unul dintre DATABASE_URL sau componentele individuale trebuie furnizat.

**Exemplu .env:**

```bash
# Option 1: Connection string (OpenBao injects dynamically)
DATABASE_URL=postgresql://v-approle-crnq-api-XXX:dynamic_pass@pgbouncer:64033/cerniq

# Option 2: Individual components (OpenBao Agent renders to /secrets/db.env)
POSTGRES_HOST=pgbouncer
POSTGRES_PORT=64033
POSTGRES_USER=v-approle-crnq-api-XXX  # Dynamic user from OpenBao
POSTGRES_PASSWORD=<dynamic_from_openbao>
POSTGRES_DB=cerniq

# Pool settings
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20
```

## PgBouncer (Optional)

| Variable         | Required | Default | Description                   |
| ---------------- | -------- | ------- | ----------------------------- |
| `PGBOUNCER_HOST` | No       | -       | PgBouncer hostname (if using) |
| `PGBOUNCER_PORT` | No       | `64033` | PgBouncer port                |

---

## 3. REDIS VARIABLES

| Variable              | Required | Default     | Description                                     |
| --------------------- | -------- | ----------- | ----------------------------------------------- |
| `REDIS_URL`           | Yes\*    | -           | Full Redis connection string                    |
| `REDIS_URL_FILE`      | Yes\*    | -           | Path to file containing REDIS_URL               |
| `REDIS_HOST`          | No       | `10.0.1.10` | Redis gateway host (hz.247)                     |
| `REDIS_PORT`          | No       | `6379`      | Redis port (shared)                             |
| `REDIS_PASSWORD`      | No       | -           | Redis password (if AUTH enabled)                |
| `REDIS_PASSWORD_FILE` | No       | -           | Path to password file                           |
| `REDIS_DB`            | No       | `0`         | Redis database number (vezi matricea per etapă) |

**Exemplu .env:**

```bash
# Option 1: Connection string
REDIS_URL=redis://10.0.1.10:6379/0

# Option 2: Individual components
REDIS_HOST=10.0.1.10
REDIS_PORT=6379
REDIS_DB=0
```

> **Notă:** Alocarea canonică a `REDIS_DB` pe etape este documentată aici: [`redis-db-assignment.md`](../../infrastructure/redis-db-assignment.md)

## BullMQ Specific

| Variable                  | Required | Default    | Description                            |
| ------------------------- | -------- | ---------- | -------------------------------------- |
| `BULLMQ_PREFIX`           | No       | `{cerniq}` | Queue prefix for cluster compatibility |
| `BULLMQ_CONCURRENCY`      | No       | `5`        | Default worker concurrency             |
| `BULLMQ_STALLED_INTERVAL` | No       | `30000`    | Check for stalled jobs interval (ms)   |

---

## 4. AUTHENTICATION VARIABLES

## JWT

| Variable               | Required | Default | Description                |
| ---------------------- | -------- | ------- | -------------------------- |
| `JWT_SECRET`           | Yes\*    | -       | JWT signing secret (HS256) |
| `JWT_SECRET_FILE`      | Yes\*    | -       | Path to JWT secret file    |
| `JWT_PRIVATE_KEY`      | No       | -       | RSA private key for RS256  |
| `JWT_PRIVATE_KEY_FILE` | No       | -       | Path to private key file   |
| `JWT_PUBLIC_KEY`       | No       | -       | RSA public key for RS256   |
| `JWT_PUBLIC_KEY_FILE`  | No       | -       | Path to public key file    |
| `JWT_ACCESS_EXPIRES`   | No       | `15m`   | Access token expiration    |
| `JWT_REFRESH_EXPIRES`  | No       | `7d`    | Refresh token expiration   |

## Cookies

| Variable             | Required | Default  | Description                |
| -------------------- | -------- | -------- | -------------------------- |
| `COOKIE_SECRET`      | Yes      | -        | Cookie signing secret      |
| `COOKIE_SECRET_FILE` | No       | -        | Path to cookie secret file |
| `COOKIE_SECURE`      | No       | `true`   | Secure flag for cookies    |
| `COOKIE_SAME_SITE`   | No       | `strict` | SameSite policy            |

**Exemplu .env:**

```bash
# OpenBao Agent renders to /secrets/auth.env:
JWT_SECRET=<loaded_from_openbao_kv>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
COOKIE_SECRET=<loaded_from_openbao_kv>
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
```

---

## 5. EXTERNAL SERVICES

## ANAF API (e-Factura)

| Variable                  | Required | Default                                    | Description          |
| ------------------------- | -------- | ------------------------------------------ | -------------------- |
| `ANAF_CLIENT_ID`          | Yes      | -                                          | OAuth2 Client ID     |
| `ANAF_CLIENT_SECRET`      | Yes      | -                                          | OAuth2 Client Secret |
| `ANAF_CLIENT_SECRET_FILE` | No       | -                                          | Path to secret file  |
| `ANAF_REDIRECT_URI`       | Yes      | -                                          | OAuth2 redirect URI  |
| `ANAF_API_URL`            | No       | `https://api.anaf.ro/prod/FCTEL/rest`      | ANAF API base URL    |
| `ANAF_AUTH_URL`           | No       | `https://logincert.anaf.ro/anaf-oauth2/v1` | ANAF OAuth URL       |

## Termene.ro

| Variable               | Required | Default                     | Description          |
| ---------------------- | -------- | --------------------------- | -------------------- |
| `TERMENE_API_KEY`      | Yes      | -                           | Termene.ro API key   |
| `TERMENE_API_KEY_FILE` | No       | -                           | Path to API key file |
| `TERMENE_API_URL`      | No       | `https://api.termene.ro/v1` | Termene.ro base URL  |

## Hunter.io (Email Discovery)

| Variable              | Required | Default | Description          |
| --------------------- | -------- | ------- | -------------------- |
| `HUNTER_API_KEY`      | Yes      | -       | Hunter.io API key    |
| `HUNTER_API_KEY_FILE` | No       | -       | Path to API key file |

## TimelinesAI (WhatsApp)

| Variable                   | Required | Default | Description              |
| -------------------------- | -------- | ------- | ------------------------ |
| `TIMELINES_API_KEY`        | Yes      | -       | TimelinesAI API key      |
| `TIMELINES_API_KEY_FILE`   | No       | -       | Path to API key file     |
| `TIMELINES_WEBHOOK_SECRET` | Yes      | -       | Webhook signature secret |

## Instantly.ai (Email)

| Variable                 | Required | Default | Description          |
| ------------------------ | -------- | ------- | -------------------- |
| `INSTANTLY_API_KEY`      | Yes      | -       | Instantly.ai API key |
| `INSTANTLY_API_KEY_FILE` | No       | -       | Path to API key file |

## LLM Providers

| Variable            | Required | Default                  | Description                  |
| ------------------- | -------- | ------------------------ | ---------------------------- |
| `XAI_API_KEY`       | Yes      | -                        | xAI (Grok) API key           |
| `OPENAI_API_KEY`    | Yes      | -                        | OpenAI API key (embeddings)  |
| `GROQ_API_KEY`      | No       | -                        | Groq API key                 |
| `ANTHROPIC_API_KEY` | No       | -                        | Anthropic API key (fallback) |
| `OLLAMA_HOST`       | No       | `http://localhost:64060` | Ollama local host            |

**Exemplu (OpenBao Agent injectează în `/secrets/external.env`):**

```bash
# OpenBao Agent renders from kv/data/api/external:
ANAF_CLIENT_ID=your-client-id
ANAF_CLIENT_SECRET=<from_openbao_kv>
ANAF_REDIRECT_URI=https://app.cerniq.app/auth/anaf/callback

# External APIs (from kv/data/api/external)
TERMENE_API_KEY=<from_openbao_kv>
HUNTER_API_KEY=<from_openbao_kv>
TIMELINES_API_KEY=<from_openbao_kv>
INSTANTLY_API_KEY=<from_openbao_kv>

# LLM (from kv/data/api/llm)
XAI_API_KEY=<from_openbao_kv>
OPENAI_API_KEY=<from_openbao_kv>
```

---

## 6. OBSERVABILITY VARIABLES

## OpenTelemetry

| Variable                      | Required | Default                       | Description                     |
| ----------------------------- | -------- | ----------------------------- | ------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No       | `http://otel-collector:64070` | OTel collector endpoint         |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | No       | `grpc`                        | Protocol: grpc or http/protobuf |
| `OTEL_SERVICE_NAME`           | No       | `cerniq-api`                  | Service name for traces         |
| `OTEL_TRACES_SAMPLER`         | No       | `parentbased_traceidratio`    | Sampling strategy               |
| `OTEL_TRACES_SAMPLER_ARG`     | No       | `1.0`                         | Sampling ratio (0.0-1.0)        |

**Exemplu .env:**

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:64070
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
OTEL_SERVICE_NAME=cerniq-api
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=1.0
```

---

## 7. ENVIRONMENT-SPECIFIC

## Development

```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug
DATABASE_URL=postgresql://cerniq:devpassword@localhost:5432/cerniq_dev
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=dev-secret-not-for-production
COOKIE_SECRET=dev-cookie-secret
COOKIE_SECURE=false
```

## Staging

> **📌 OpenBao:** Toate secretele sunt injectate automat de OpenBao Agent.
> Aplicația citește din `/secrets/*.env` renderizate de Agent.

```bash
# Static config (non-secrets)
NODE_ENV=staging
LOG_LEVEL=info
COOKIE_SECURE=true

# OpenBao Agent renders secrets to:
# - /secrets/db.env (DATABASE_URL cu credențiale dinamice)
# - /secrets/redis.env (REDIS_URL)
# - /secrets/auth.env (JWT_SECRET, COOKIE_SECRET)
```

## Production

```bash
# Static config (non-secrets)
NODE_ENV=production
LOG_LEVEL=info
COOKIE_SECURE=true
OTEL_TRACES_SAMPLER_ARG=0.1  # Sample 10% in production

# OpenBao Agent renders secrets to:
# - /secrets/db.env (DATABASE_URL cu TTL=1h, auto-rotate)
# - /secrets/redis.env (REDIS_URL)
# - /secrets/auth.env (JWT_SECRET, COOKIE_SECRET)
# - /secrets/external.env (API keys)
```

---

## TEMPLATE: .env.example

```bash
# Cerniq.app Environment Variables Template
# Copy to .env and fill in values

# ===================
# GENERAL
# ===================
NODE_ENV=development
HOST=0.0.0.0
PORT=64000
APP_VERSION=0.1.0
LOG_LEVEL=info

# ===================
# DATABASE
# ===================
DATABASE_URL=postgresql://cerniq:password@localhost:5432/cerniq_dev
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20

# ===================
# REDIS
# ===================
REDIS_URL=redis://localhost:6379/0
BULLMQ_PREFIX={cerniq}
BULLMQ_CONCURRENCY=5

# ===================
# AUTHENTICATION
# ===================
JWT_SECRET=your-jwt-secret-here
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
COOKIE_SECRET=your-cookie-secret-here
COOKIE_SECURE=false

# ===================
# EXTERNAL SERVICES
# ===================
# ANAF_CLIENT_ID=
# ANAF_CLIENT_SECRET=
# ANAF_REDIRECT_URI=

# TERMENE_API_KEY=
# HUNTER_API_KEY=
# TIMELINES_API_KEY=
# INSTANTLY_API_KEY=

# XAI_API_KEY=
# OPENAI_API_KEY=

# ===================
# OBSERVABILITY
# ===================
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:64070
OTEL_SERVICE_NAME=cerniq-api
```

---

**Document generat:** 15 Ianuarie 2026  
**Sursă de adevăr:** Master Spec v1.2
