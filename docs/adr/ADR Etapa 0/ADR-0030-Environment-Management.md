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

> **📌 Notă (Februarie 2026):** Pentru production, secretele sunt gestionate prin OpenBao.
> Vezi [ADR-0033](ADR-0033-OpenBao-Secrets-Management.md) pentru detalii.

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

# .env.production (secrets injectate de OpenBao Agent)
NODE_ENV=production
# DATABASE_URL - renderizat în /secrets/db.env de OpenBao Agent
# REDIS_URL - renderizat în /secrets/redis.env de OpenBao Agent
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

## Documentație Detaliată

Pentru lista completă de variabile de environment, vezi:
**[`docs/specifications/Etapa 0/etapa0-environment-variables.md`](../../specifications/Etapa%200/etapa0-environment-variables.md)**
