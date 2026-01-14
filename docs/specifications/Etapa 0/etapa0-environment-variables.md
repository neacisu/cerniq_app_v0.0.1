# CERNIQ.APP — ETAPA 0: ENVIRONMENT VARIABLES REFERENCE

## Documentație Completă pentru Toate Variabilele de Mediu

### Versiunea 1.0 | 15 Ianuarie 2026

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

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `NODE_ENV` | Yes | `development` | Environment: development, staging, production |
| `HOST` | No | `0.0.0.0` | API server bind address |
| `PORT` | No | `64000` | API server port |
| `APP_VERSION` | No | `0.1.0` | Application version for logging/telemetry |
| `LOG_LEVEL` | No | `info` | Pino log level: trace, debug, info, warn, error, fatal |
| `SHUTDOWN_TIMEOUT` | No | `30000` | Graceful shutdown timeout in milliseconds |

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

## PostgreSQL

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `DATABASE_URL` | Yes* | - | Full PostgreSQL connection string |
| `DATABASE_URL_FILE` | Yes* | - | Path to file containing DATABASE_URL (Docker secrets) |
| `POSTGRES_HOST` | No | `postgres` | PostgreSQL hostname |
| `POSTGRES_PORT` | No | `64032` | PostgreSQL port |
| `POSTGRES_USER` | No | `cerniq` | PostgreSQL username |
| `POSTGRES_PASSWORD` | Yes* | - | PostgreSQL password |
| `POSTGRES_PASSWORD_FILE` | Yes* | - | Path to password file (Docker secrets) |
| `POSTGRES_DB` | No | `cerniq_production` | Database name |
| `DATABASE_POOL_MIN` | No | `2` | Minimum connection pool size |
| `DATABASE_POOL_MAX` | No | `20` | Maximum connection pool size |

*Unul dintre DATABASE_URL sau componentele individuale trebuie furnizat.

**Exemplu .env:**

```bash
# Option 1: Connection string
DATABASE_URL=postgresql://cerniq:password@postgres:64032/cerniq_production

# Option 2: Individual components
POSTGRES_HOST=postgres
POSTGRES_PORT=64032
POSTGRES_USER=cerniq
POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password
POSTGRES_DB=cerniq_production

# Pool settings
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20
```

## PgBouncer (Optional)

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `PGBOUNCER_HOST` | No | - | PgBouncer hostname (if using) |
| `PGBOUNCER_PORT` | No | `64042` | PgBouncer port |

---

## 3. REDIS VARIABLES

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `REDIS_URL` | Yes* | - | Full Redis connection string |
| `REDIS_URL_FILE` | Yes* | - | Path to file containing REDIS_URL |
| `REDIS_HOST` | No | `redis` | Redis hostname |
| `REDIS_PORT` | No | `64039` | Redis port |
| `REDIS_PASSWORD` | No | - | Redis password (if AUTH enabled) |
| `REDIS_PASSWORD_FILE` | No | - | Path to password file |
| `REDIS_DB` | No | `0` | Redis database number |

**Exemplu .env:**

```bash
# Option 1: Connection string
REDIS_URL=redis://redis:64039/0

# Option 2: Individual components
REDIS_HOST=redis
REDIS_PORT=64039
REDIS_DB=0
```

## BullMQ Specific

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `BULLMQ_PREFIX` | No | `{cerniq}` | Queue prefix for cluster compatibility |
| `BULLMQ_CONCURRENCY` | No | `5` | Default worker concurrency |
| `BULLMQ_STALLED_INTERVAL` | No | `30000` | Check for stalled jobs interval (ms) |

---

## 4. AUTHENTICATION VARIABLES

## JWT

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `JWT_SECRET` | Yes* | - | JWT signing secret (HS256) |
| `JWT_SECRET_FILE` | Yes* | - | Path to JWT secret file |
| `JWT_PRIVATE_KEY` | No | - | RSA private key for RS256 |
| `JWT_PRIVATE_KEY_FILE` | No | - | Path to private key file |
| `JWT_PUBLIC_KEY` | No | - | RSA public key for RS256 |
| `JWT_PUBLIC_KEY_FILE` | No | - | Path to public key file |
| `JWT_ACCESS_EXPIRES` | No | `15m` | Access token expiration |
| `JWT_REFRESH_EXPIRES` | No | `7d` | Refresh token expiration |

## Cookies

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `COOKIE_SECRET` | Yes | - | Cookie signing secret |
| `COOKIE_SECRET_FILE` | No | - | Path to cookie secret file |
| `COOKIE_SECURE` | No | `true` | Secure flag for cookies |
| `COOKIE_SAME_SITE` | No | `strict` | SameSite policy |

**Exemplu .env:**

```bash
JWT_SECRET_FILE=/run/secrets/jwt_secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
COOKIE_SECRET_FILE=/run/secrets/cookie_secret
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
```

---

## 5. EXTERNAL SERVICES

## ANAF API (e-Factura)

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `ANAF_CLIENT_ID` | Yes | - | OAuth2 Client ID |
| `ANAF_CLIENT_SECRET` | Yes | - | OAuth2 Client Secret |
| `ANAF_CLIENT_SECRET_FILE` | No | - | Path to secret file |
| `ANAF_REDIRECT_URI` | Yes | - | OAuth2 redirect URI |
| `ANAF_API_URL` | No | `https://api.anaf.ro/prod/FCTEL/rest` | ANAF API base URL |
| `ANAF_AUTH_URL` | No | `https://logincert.anaf.ro/anaf-oauth2/v1` | ANAF OAuth URL |

## Termene.ro

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `TERMENE_API_KEY` | Yes | - | Termene.ro API key |
| `TERMENE_API_KEY_FILE` | No | - | Path to API key file |
| `TERMENE_API_URL` | No | `https://api.termene.ro/v1` | Termene.ro base URL |

## Hunter.io (Email Discovery)

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `HUNTER_API_KEY` | Yes | - | Hunter.io API key |
| `HUNTER_API_KEY_FILE` | No | - | Path to API key file |

## TimelinesAI (WhatsApp)

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `TIMELINES_API_KEY` | Yes | - | TimelinesAI API key |
| `TIMELINES_API_KEY_FILE` | No | - | Path to API key file |
| `TIMELINES_WEBHOOK_SECRET` | Yes | - | Webhook signature secret |

## Instantly.ai (Email)

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `INSTANTLY_API_KEY` | Yes | - | Instantly.ai API key |
| `INSTANTLY_API_KEY_FILE` | No | - | Path to API key file |

## LLM Providers

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `XAI_API_KEY` | Yes | - | xAI (Grok) API key |
| `OPENAI_API_KEY` | Yes | - | OpenAI API key (embeddings) |
| `GROQ_API_KEY` | No | - | Groq API key |
| `ANTHROPIC_API_KEY` | No | - | Anthropic API key (fallback) |
| `OLLAMA_HOST` | No | `http://localhost:11434` | Ollama local host |

**Exemplu .env:**

```bash
# ANAF
ANAF_CLIENT_ID=your-client-id
ANAF_CLIENT_SECRET_FILE=/run/secrets/anaf_client_secret
ANAF_REDIRECT_URI=https://app.cerniq.app/auth/anaf/callback

# External APIs
TERMENE_API_KEY_FILE=/run/secrets/termene_api_key
HUNTER_API_KEY_FILE=/run/secrets/hunter_api_key
TIMELINES_API_KEY_FILE=/run/secrets/timelines_api_key
INSTANTLY_API_KEY_FILE=/run/secrets/instantly_api_key

# LLM
XAI_API_KEY_FILE=/run/secrets/xai_api_key
OPENAI_API_KEY_FILE=/run/secrets/openai_api_key
```

---

## 6. OBSERVABILITY VARIABLES

## OpenTelemetry

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | `http://otel-collector:64070` | OTel collector endpoint |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | No | `grpc` | Protocol: grpc or http/protobuf |
| `OTEL_SERVICE_NAME` | No | `cerniq-api` | Service name for traces |
| `OTEL_TRACES_SAMPLER` | No | `parentbased_traceidratio` | Sampling strategy |
| `OTEL_TRACES_SAMPLER_ARG` | No | `1.0` | Sampling ratio (0.0-1.0) |

## SigNoz

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `SIGNOZ_ACCESS_TOKEN` | No | - | SigNoz access token (if secured) |
| `SIGNOZ_ACCESS_TOKEN_FILE` | No | - | Path to token file |

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
DATABASE_URL=postgresql://cerniq:devpassword@localhost:64032/cerniq_dev
REDIS_URL=redis://localhost:64039/0
JWT_SECRET=dev-secret-not-for-production
COOKIE_SECRET=dev-cookie-secret
COOKIE_SECURE=false
```

## Staging

```bash
# .env.staging
NODE_ENV=staging
LOG_LEVEL=info
DATABASE_URL_FILE=/run/secrets/database_url_staging
REDIS_URL_FILE=/run/secrets/redis_url_staging
JWT_SECRET_FILE=/run/secrets/jwt_secret_staging
COOKIE_SECRET_FILE=/run/secrets/cookie_secret_staging
COOKIE_SECURE=true
```

## Production

```bash
# .env.production
NODE_ENV=production
LOG_LEVEL=info
DATABASE_URL_FILE=/run/secrets/database_url
REDIS_URL_FILE=/run/secrets/redis_url
JWT_SECRET_FILE=/run/secrets/jwt_secret
COOKIE_SECRET_FILE=/run/secrets/cookie_secret
COOKIE_SECURE=true
OTEL_TRACES_SAMPLER_ARG=0.1  # Sample 10% in production
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
DATABASE_URL=postgresql://cerniq:password@localhost:64032/cerniq_dev
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20

# ===================
# REDIS
# ===================
REDIS_URL=redis://localhost:64039/0
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
