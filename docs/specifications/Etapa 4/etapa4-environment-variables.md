# CERNIQ.APP — ETAPA 4: ENVIRONMENT VARIABLES
## Payments & Logistics
### Versiunea 1.0 | 01 Februarie 2026

---

## 1. Core Application

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `NODE_ENV` | Yes | `production` | Environment mode |
| `APP_NAME` | Yes | `cerniq-etapa4` | Service name |
| `APP_PORT` | Yes | - | API/worker port |

## 2. Database (PostgreSQL)

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `POSTGRES_HOST` | Yes | `postgres` | PostgreSQL host |
| `POSTGRES_PORT` | Yes | `64032` | PostgreSQL port |
| `POSTGRES_USER` | Yes | - | DB user |
| `POSTGRES_PASSWORD` | Yes | - | DB password (secret) |
| `POSTGRES_DB` | Yes | `cerniq_e4` | Database name |
| `DATABASE_URL` | Yes | - | Full connection string |

## 3. Redis

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `REDIS_HOST` | Yes | `redis` | Redis host |
| `REDIS_PORT` | Yes | `64039` | Redis port |
| `REDIS_PASSWORD` | No | - | Redis password |
| `REDIS_DB` | No | `4` | Redis DB (Etapa 4) |
| `REDIS_URL` | No | - | Full connection string |

> **Notă:** Matricea completă `REDIS_DB` pe etape este documentată aici: [`redis-db-assignment.md`](../../infrastructure/redis-db-assignment.md)

## 4. BullMQ

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `BULLMQ_PREFIX` | No | `e4` | Queue prefix |
| `BULLMQ_CONCURRENCY` | No | `5` | Default concurrency |

## 5. Payments & Logistics Providers

### Revolut Business

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `REVOLUT_API_URL` | Yes | - | Revolut API base URL |
| `REVOLUT_API_KEY` | Yes | - | API key (secret) |

### Sameday

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `SAMEDAY_API_URL` | Yes | - | Sameday API base URL |
| `SAMEDAY_API_KEY` | Yes | - | API key (secret) |

### Oblio (Stock & Invoices)

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `OBLIO_API_URL` | Yes | - | Oblio API base URL |
| `OBLIO_API_KEY` | Yes | - | API key (secret) |

---

**Referințe:**
- [Etapa 0 — Environment Variables](../Etapa%200/etapa0-environment-variables.md)
