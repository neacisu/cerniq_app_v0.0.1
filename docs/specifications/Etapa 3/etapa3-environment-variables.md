# CERNIQ.APP — ETAPA 3: ENVIRONMENT VARIABLES
## AI Sales Agent Neuro-Simbolic
### Versiunea 1.0 | 01 Februarie 2026

---

## 1. Core Application

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `NODE_ENV` | Yes | `production` | Environment mode |
| `APP_NAME` | Yes | `cerniq-etapa3` | Service name |
| `APP_PORT` | Yes | - | API/worker port |

## 2. Database (PostgreSQL)

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `POSTGRES_HOST` | Yes | `postgres` | PostgreSQL host |
| `POSTGRES_PORT` | Yes | `64032` | PostgreSQL port |
| `POSTGRES_USER` | Yes | - | DB user |
| `POSTGRES_PASSWORD` | Yes | - | DB password (secret) |
| `POSTGRES_DB` | Yes | `cerniq_e3` | Database name |
| `DATABASE_URL` | Yes | - | Full connection string |

## 3. Redis

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `REDIS_HOST` | Yes | `redis` | Redis host |
| `REDIS_PORT` | Yes | `64039` | Redis port |
| `REDIS_PASSWORD` | No | - | Redis password |
| `REDIS_DB` | No | `3` | Redis DB (Etapa 3) |
| `REDIS_URL` | No | - | Full connection string |

> **Notă:** Matricea completă `REDIS_DB` pe etape este documentată aici: [`redis-db-assignment.md`](../../infrastructure/redis-db-assignment.md)

## 4. BullMQ

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `BULLMQ_PREFIX` | No | `e3` | Queue prefix |
| `BULLMQ_CONCURRENCY` | No | `5` | Default concurrency |

## 5. LLM Providers

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `XAI_API_KEY` | Yes | - | xAI Grok API key |
| `OPENAI_API_KEY` | No | - | OpenAI fallback key |
| `ANTHROPIC_API_KEY` | No | - | Anthropic fallback key |
| `LLM_MAX_TOKENS` | No | `4096` | Max tokens |

## 6. MCP & Tooling

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `MCP_SERVER_URL` | Yes | - | MCP server URL |
| `MCP_TIMEOUT_MS` | No | `30000` | MCP request timeout |

## 7. Fiscal Integrations

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `OBLIO_API_URL` | Yes | - | Oblio API base URL |
| `OBLIO_API_KEY` | Yes | - | Oblio API key |
| `EFactura_API_URL` | Yes | - | ANAF SPV endpoint |
| `EFactura_CERT_PATH` | Yes | - | SPV certificate path |

---

**Referințe:**
- [Etapa 0 — Environment Variables](../Etapa%200/etapa0-environment-variables.md)
