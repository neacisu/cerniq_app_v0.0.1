# syntax=docker/dockerfile:1.7
FROM node:25.6.1-alpine3.23 AS base
RUN apk add --no-cache curl
RUN npm install -g pnpm@10.29.3
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/monitoring-api/package.json ./apps/monitoring-api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile --filter @cerniq/monitoring-api...

FROM deps AS builder
COPY packages/ ./packages/
COPY apps/monitoring-api/ ./apps/monitoring-api/

FROM base AS runner
RUN addgroup -g 1001 -S cerniq && adduser -S -D -H -u 1001 -G cerniq cerniq
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/monitoring-api/ ./apps/monitoring-api/
RUN chown -R cerniq:cerniq /app
USER cerniq
EXPOSE 64080
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:64080/health/live || exit 1
CMD ["node", "--import", "tsx", "apps/monitoring-api/src/index.ts"]
