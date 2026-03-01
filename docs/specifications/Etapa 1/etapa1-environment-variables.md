# CERNIQ.APP — ETAPA 1: ENVIRONMENT VARIABLES

## Data Enrichment Pipeline

### Versiunea 1.1 | 27 Februarie 2026

---

## Set minim obligatoriu (24 variabile)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | Yes | `production` | Mod runtime (`development/staging/production/test`) |
| `PORT` | Yes | `3000` (workers) / `64010` (api) | Port serviciu |
| `DATABASE_URL` | Yes | - | Conexiune PostgreSQL prin PgBouncer |
| `POSTGRES_USER` | Yes | - | User DB (din OpenBao) |
| `POSTGRES_PASSWORD` | Yes | - | Parola DB (din OpenBao) |
| `REDIS_URL` | Yes | - | Conexiune Redis |
| `REDIS_PASSWORD` | No | - | Parola Redis |
| `REDIS_PREFIX` | No | `cerniq` | Prefix legacy queue keys |
| `BULLMQ_PREFIX` | No | `cerniq` | Prefix BullMQ queues |
| `JWT_SECRET` | Yes (API) | - | Secret access token |
| `JWT_REFRESH_SECRET` | Yes (API) | - | Secret refresh token |
| `JWT_EXPIRES_IN` | No | `24h` | TTL access token |
| `JWT_REFRESH_EXPIRES_IN` | No | `30d` | TTL refresh token |
| `ANAF_API_URL` | Yes | - | Endpoint ANAF |
| `TERMENE_API_URL` | Yes | - | Endpoint Termene |
| `TERMENE_API_KEY` | Yes | - | Key Termene |
| `HUNTER_API_KEY` | No | - | Key Hunter |
| `ZEROBOUNCE_API_KEY` | No | - | Key ZeroBounce |
| `NOMINATIM_URL` | No | `https://nominatim.openstreetmap.org` | Endpoint geocoding |
| `ONRC_PORTAL_URL` | Yes | - | Endpoint ONRC portal |
| `HLR_API_KEY` | No | - | Key HLR lookup |
| `BING_API_KEY` | No | - | Key Bing Search API |
| `XAI_API_KEY` | No | - | Key xAI Grok |
| `SECRETS_PATH` | No | `/secrets/api.env` | Path fisier renderizat de OpenBao |

---

## Variabile recomandate suplimentare (state-of-the-art)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `LOG_LEVEL` | No | `info` | Nivel log API |
| `CORS_ORIGIN` | No | `*` | Allowed origins |
| `RATE_LIMIT_MAX` | No | `100` | API requests per window |
| `RATE_LIMIT_WINDOW` | No | `1 minute` | Fereastra rate limit |
| `SHUTDOWN_TIMEOUT_MS` | No | `10000` | Graceful shutdown timeout |
| `SYSTEM_USER_ID` | No | - | Fallback actor sistem |
| `DEFAULT_JOB_ATTEMPTS` | No | `3` | Retry attempts BullMQ |
| `DEFAULT_JOB_BACKOFF_MS` | No | `1000` | Retry backoff initial |
| `JOB_RETENTION_COMPLETE_SECONDS` | No | `86400` | Retentie job-uri complete |
| `JOB_RETENTION_FAIL_SECONDS` | No | `604800` | Retentie job-uri esuate |
| `ANAF_API_TIMEOUT_MS` | No | `25000` | Timeout ANAF |
| `TERMENE_API_TIMEOUT_MS` | No | `20000` | Timeout Termene |
| `ONRC_API_TIMEOUT_MS` | No | `20000` | Timeout ONRC |
| `HUNTER_API_TIMEOUT_MS` | No | `20000` | Timeout Hunter |
| `ZEROBOUNCE_API_TIMEOUT_MS` | No | `20000` | Timeout ZeroBounce |
| `HLR_API_TIMEOUT_MS` | No | `20000` | Timeout HLR |
| `NOMINATIM_TIMEOUT_MS` | No | `20000` | Timeout Nominatim |
| `NOMINATIM_USER_AGENT` | No | `CerniqApp/1.0 (contact@cerniq.app)` | User-Agent pentru geocoding |
| `BING_TIMEOUT_MS` | No | `15000` | Timeout Bing Search |
| `XAI_BASE_URL` | No | `https://api.x.ai/v1` | Endpoint xAI |
| `XAI_MODEL` | No | `grok-beta` | Model xAI |
| `XAI_TIMEOUT_MS` | No | `60000` | Timeout xAI |

---

## Observatii operationale

- In staging/prod, PostgreSQL se acceseaza prin PgBouncer, nu direct pe portul DB backend.
- Cheile externe se injecteaza exclusiv din OpenBao (`secret/cerniq/shared/external`), nu din fisiere locale committed.
- Worker-ii trebuie porniti cu `BULLMQ_PREFIX` identic intre API si workers pentru consistenta queue namespace.

---

## Referinte

- `docs/specifications/Etapa 1/etapa1-runbook-monitoring.md`
- `infra/config/openbao/templates/workers-env.tpl`
- `apps/api/src/config.ts`
