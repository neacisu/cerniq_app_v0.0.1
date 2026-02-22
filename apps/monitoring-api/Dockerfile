# syntax=docker/dockerfile:1.7
# =============================================================================
# Cerniq.app - Monitoring API Dockerfile
# Reference: ADR-0015 Container Strategy
# =============================================================================

FROM node:25.6.1-alpine3.23 AS base
RUN apk add --no-cache curl
RUN npm install -g pnpm@10.29.3
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/monitoring-api/package.json ./apps/monitoring-api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile --filter @cerniq/monitoring-api...

# --- Build ---
FROM deps AS builder
COPY packages/ ./packages/
COPY apps/monitoring-api/ ./apps/monitoring-api/
RUN pnpm --filter @cerniq/shared-types build
RUN pnpm --filter @cerniq/monitoring-api build

# --- Production dependencies only ---
FROM deps AS prod-deps
RUN pnpm install --frozen-lockfile --filter @cerniq/monitoring-api... --prod

# --- Production stage ---
FROM base AS runner
RUN addgroup -g 1001 -S cerniq && adduser -S -D -H -u 1001 -G cerniq cerniq
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/monitoring-api/node_modules ./apps/monitoring-api/node_modules
COPY --from=prod-deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=builder /app/packages/config/ ./packages/config/
COPY --from=builder /app/apps/monitoring-api/dist ./apps/monitoring-api/dist
COPY --from=builder /app/apps/monitoring-api/package.json ./apps/monitoring-api/

RUN chown -R cerniq:cerniq /app
USER cerniq

EXPOSE 64080

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:64080/health/live || exit 1

CMD ["node", "apps/monitoring-api/dist/index.js"]
