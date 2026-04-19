# AGENTS.md

## Cursor Cloud specific instructions

### Runtime & package manager

- **Node.js v25.8.1** (specified in `.nvmrc`), **pnpm 10.32.1** (via `corepack`).
- After `nvm use`, run `corepack enable` — Node 25.x does not ship `corepack` globally; install it first with `npm install -g corepack` if the command is not found.

### Key commands (see also `CONTRIBUTING.md`)

| Task | Command |
|------|---------|
| Install deps | `pnpm install` |
| Lint | `pnpm lint` |
| Type-check | `pnpm typecheck` |
| Unit/integration tests | `pnpm test` |
| Full validation (lint+typecheck+test) | `pnpm validate` |
| Build all | `pnpm build` |
| Dev (all apps via Turbo) | `pnpm dev` |
| Dev frontend only | `pnpm --filter @cerniq/web dev` (port 64000) |
| Coverage policy | `pnpm verify:coverage-policy` |

### Pre-existing issues (as of branch `work/cognitive_neural_brain_impl`)

- **`@cerniq/worker-shared` tests**: 3 failures — 2 test timeouts (circuit breaker, queue monitor) and 1 Prometheus metric re-registration error. These are pre-existing and not caused by environment setup.
- **`@cerniq/worker-outreach` build**: `tsc -p tsconfig.build.json` fails with `TS6059` (files outside `rootDir`). `typecheck` (`tsc --noEmit`) passes; only the build emit step is affected.

### Environment variables

- Copy `.env.example` → `.env` for local dev. Default values point to `localhost` services.
- The API server (`apps/api`, port 64010) requires **PostgreSQL** (via PgBouncer on port 6432) and **Redis** (port 6379) to start. Without these, only the frontend (`apps/web`, port 64000) can run standalone (Vite dev server, no backend proxy target).
- Workers depend on Redis (BullMQ) and PostgreSQL.

### Services overview

| Service | Port | Notes |
|---------|------|-------|
| `apps/web` (React SPA) | 64000 | Runs standalone with `vite`; proxies `/api` to `localhost:64010` |
| `apps/api` (Fastify) | 64010 | Needs PostgreSQL + Redis |
| `apps/web-admin` | 64012 | Admin dashboard |
| `apps/monitoring-api` | 64080 | WebSocket monitoring |
| Workers (`workers/*`) | — | Need Redis (BullMQ) |

### Git hooks

Husky + lint-staged are configured. `pre-commit` runs lint-staged (ESLint + Prettier on staged `*.{ts,tsx}`) and `pnpm typecheck`. `pre-push` (to `main` only) runs full `pnpm lint`, `pnpm typecheck`, `pnpm test`. Use `--no-verify` to skip hooks when needed for intermediate commits.

### Development without external services

The frontend (`apps/web`) can be started without PostgreSQL or Redis — `pnpm --filter @cerniq/web dev` launches the Vite dev server on port 64000. Login page loads with demo credentials pre-filled (`admin@demo-tenant.com`). API calls will fail without the backend running.
