# ADR-0024: Directory Structure Standard

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Structura directoarelor trebuie să suporte:

- Monorepo cu workspaces
- Vertical Slice Architecture
- Separare clară apps/packages/workers

## Decizie

```text
/var/www/CerniqAPP/
├── apps/
│   ├── api/                    # Backend Fastify v5.6.2
│   │   ├── src/
│   │   │   ├── features/       # Vertical Slice
│   │   │   │   ├── auth/
│   │   │   │   ├── companies/
│   │   │   │   ├── leads/
│   │   │   │   └── approvals/
│   │   │   ├── plugins/        # Fastify plugins
│   │   │   ├── middleware/
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/                    # Frontend React 19 + Refine v5
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── providers/
│       │   └── App.tsx
│       ├── Dockerfile
│       └── package.json
├── packages/
│   ├── db/                     # Drizzle ORM + Migrații
│   │   ├── drizzle/
│   │   ├── schema/
│   │   │   ├── bronze.ts
│   │   │   ├── silver.ts
│   │   │   └── gold.ts
│   │   └── package.json
│   ├── shared-types/           # Zod schemas shared
│   │   ├── src/
│   │   │   ├── company.ts
│   │   │   ├── lead.ts
│   │   │   └── events.ts
│   │   └── package.json
│   └── config/
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
├── workers/                    # Python 3.14 Free-Threading
│   ├── enrichment/
│   ├── outreach/
│   ├── ai/
│   ├── pyproject.toml
│   └── requirements.txt
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.override.yml
│   │   └── traefik/
│   ├── scripts/
│   │   ├── backup.sh
│   │   └── bootstrap.sh
│   └── config/
│       ├── postgres/
│       ├── redis/
│       └── otel/
├── docs/
│   ├── adr/                    # Architecture Decision Records
│   ├── architecture/
│   ├── runbooks/
│   └── api/
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
└── .npmrc
```
