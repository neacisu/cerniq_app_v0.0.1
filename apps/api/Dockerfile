# syntax=docker/dockerfile:1.7
# =============================================================================
# Cerniq.app - API Service Dockerfile
# Reference: ADR-0015 Container Strategy
# =============================================================================

FROM node:25.6.1-alpine3.23 AS base
RUN apk add --no-cache curl
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate
WORKDIR /app

# --- Dependencies stage ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile --filter @cerniq/api...

# --- Build stage ---
FROM deps AS builder
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm --filter @cerniq/shared-types build || true
RUN pnpm --filter @cerniq/db build || true
RUN pnpm --filter @cerniq/api build || true

# --- Production stage ---
FROM base AS runner
RUN addgroup -g 1001 -S cerniq && \
    adduser -S -D -H -u 1001 -G cerniq cerniq

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/api/ ./apps/api/

RUN chown -R cerniq:cerniq /app
USER cerniq

EXPOSE 64010

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:64010/health/live || exit 1

CMD ["node", "--import", "tsx", "apps/api/src/index.ts"]
