# ADR-0030: Environment Management (dev/staging/prod)

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Necesităm separare clară între environments.

## Decizie

| Environment | Purpose | Database | Deployment |
| ----------- | ------- | -------- | ---------- |
| development | Local dev | Docker PostgreSQL local | Manual |
| staging | Pre-prod testing | Separate DB pe Hetzner | Auto on PR merge |
| production | Live | Production DB | Auto on main merge |

## Consecințe

### Environment Variables

```bash
# .env.development
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:64032/cerniq_dev
REDIS_URL=redis://localhost:64039
LOG_LEVEL=debug

# .env.staging
NODE_ENV=staging
DATABASE_URL=postgresql://...staging...
REDIS_URL=redis://...staging...
LOG_LEVEL=info

# .env.production
NODE_ENV=production
DATABASE_URL_FILE=/run/secrets/database_url
REDIS_URL_FILE=/run/secrets/redis_url
LOG_LEVEL=info
```

### Docker Compose Override

```yaml
# docker-compose.override.yml (development only)
services:
  api:
    build:
      target: development
    volumes:
      - ./apps/api/src:/app/src:ro
    environment:
      - NODE_ENV=development
    command: ["node", "--watch", "src/index.ts"]
```
