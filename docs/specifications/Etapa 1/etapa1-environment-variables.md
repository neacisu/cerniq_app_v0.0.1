# CERNIQ.APP — ETAPA 1: ENVIRONMENT VARIABLES
## Data Enrichment Pipeline
### Versiunea 1.0 | 01 Februarie 2026

---

## 1. Core Application

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `NODE_ENV` | Yes | `production` | Environment mode |
| `APP_NAME` | Yes | `cerniq-etapa1` | Service name |
| `APP_PORT` | Yes | - | API/worker port |

## 2. Database (PostgreSQL)

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `POSTGRES_HOST` | Yes | `postgres` | PostgreSQL host |
| `POSTGRES_PORT` | Yes | `64032` | PostgreSQL port |
| `POSTGRES_USER` | Yes | - | DB user |
| `POSTGRES_PASSWORD` | Yes | - | DB password (secret) |
| `POSTGRES_DB` | Yes | `cerniq_e1` | Database name |
| `DATABASE_URL` | Yes | - | Full connection string |

## 3. Redis

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `REDIS_HOST` | Yes | `redis` | Redis host |
| `REDIS_PORT` | Yes | `64039` | Redis port |
| `REDIS_PASSWORD` | No | - | Redis password |
| `REDIS_DB` | No | `1` | Redis DB (Etapa 1) |
| `REDIS_URL` | No | - | Full connection string |

> **Notă:** Matricea completă `REDIS_DB` pe etape este documentată aici: [`redis-db-assignment.md`](../../infrastructure/redis-db-assignment.md)

## 4. BullMQ

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `BULLMQ_PREFIX` | No | `e1` | Queue prefix |
| `BULLMQ_CONCURRENCY` | No | `5` | Default concurrency |

## 5. Enrichment Providers

### ANAF

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `ANAF_API_URL` | Yes | - | ANAF WS endpoint |
| `ANAF_RATE_LIMIT_RPS` | No | `1` | Requests per second |

### Termene.ro

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `TERMENE_API_URL` | Yes | - | Termene API base URL |
| `TERMENE_API_KEY` | Yes | - | API key (secret) |

### ONRC

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `ONRC_PORTAL_URL` | Yes | - | ONRC portal base URL |

### Hunter & ZeroBounce

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `HUNTER_API_KEY` | No | - | Hunter API key |
| `ZEROBOUNCE_API_KEY` | No | - | ZeroBounce API key |

### Geocoding

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `NOMINATIM_URL` | No | `https://nominatim.openstreetmap.org` | Geocoding endpoint |

---

**Referințe:**
- [Etapa 0 — Environment Variables](../Etapa%200/etapa0-environment-variables.md)
