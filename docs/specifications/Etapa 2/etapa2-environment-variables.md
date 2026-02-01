# CERNIQ.APP — ETAPA 2: ENVIRONMENT VARIABLES
## Cold Outreach Multi-Canal
### Versiunea 1.0 | 01 Februarie 2026

---

## 1. Core Application

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `NODE_ENV` | Yes | `production` | Environment mode |
| `APP_NAME` | Yes | `cerniq-etapa2` | Service name |
| `APP_PORT` | Yes | - | API/worker port |

## 2. Database (PostgreSQL)

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `POSTGRES_HOST` | Yes | `postgres` | PostgreSQL host |
| `POSTGRES_PORT` | Yes | `64032` | PostgreSQL port |
| `POSTGRES_USER` | Yes | - | DB user |
| `POSTGRES_PASSWORD` | Yes | - | DB password (secret) |
| `POSTGRES_DB` | Yes | `cerniq_e2` | Database name |
| `DATABASE_URL` | Yes | - | Full connection string |

## 3. Redis

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `REDIS_HOST` | Yes | `redis` | Redis host |
| `REDIS_PORT` | Yes | `64039` | Redis port |
| `REDIS_PASSWORD` | No | - | Redis password |
| `REDIS_DB` | No | `2` | Redis DB (Etapa 2) |
| `REDIS_URL` | No | - | Full connection string |

> **Notă:** Matricea completă `REDIS_DB` pe etape este documentată aici: [`redis-db-assignment.md`](../../infrastructure/redis-db-assignment.md)

## 4. BullMQ

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `BULLMQ_PREFIX` | No | `e2` | Queue prefix |
| `BULLMQ_CONCURRENCY` | No | `5` | Default concurrency |

## 5. Outreach Providers

### TimelinesAI (WhatsApp)

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `TIMELINES_API_URL` | Yes | - | TimelinesAI base URL |
| `TIMELINES_API_KEY` | Yes | - | API key (secret) |

### Instantly.ai (Email Cold)

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `INSTANTLY_API_URL` | Yes | - | Instantly base URL |
| `INSTANTLY_API_KEY` | Yes | - | API key (secret) |

### Resend (Email Warm)

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `RESEND_API_URL` | Yes | - | Resend base URL |
| `RESEND_API_KEY` | Yes | - | API key (secret) |

## 6. Quotas & Rate Limits

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `WA_DAILY_CONTACTS_PER_PHONE` | No | `200` | WhatsApp quota per phone/day |
| `WA_RATE_LIMIT_RPS` | No | `1` | WhatsApp send rate |
| `EMAIL_RATE_LIMIT_RPS` | No | `5` | Email send rate |

---

**Referințe:**
- [Etapa 0 — Environment Variables](../Etapa%200/etapa0-environment-variables.md)
