# syntax=docker/dockerfile:1.7
FROM node:25.8.1-alpine3.23 AS base
ENV CI=true
RUN apk upgrade --no-cache && apk add --no-cache curl && npm install -g pnpm@10.32.1
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY workers/enrichment/package.json ./workers/enrichment/
COPY workers/shared/package.json ./workers/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile --filter @cerniq/worker-enrichment...

FROM deps AS builder
COPY workers/ ./workers/
COPY packages/ ./packages/
RUN pnpm --filter @cerniq/shared-types build
RUN pnpm --filter @cerniq/db build
RUN pnpm --filter @cerniq/worker-shared build
RUN pnpm --filter @cerniq/worker-enrichment build

FROM base AS runner
RUN addgroup -g 1001 -S cerniq && adduser -S -D -H -u 1001 -G cerniq cerniq
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/workers/enrichment/node_modules ./workers/enrichment/node_modules
COPY --from=deps /app/workers/shared/node_modules ./workers/shared/node_modules
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/drizzle ./packages/db/drizzle
COPY --from=builder /app/packages/db/package.json ./packages/db/
COPY --from=builder /app/workers/shared/dist ./workers/shared/dist
COPY --from=builder /app/workers/shared/package.json ./workers/shared/
COPY --from=builder /app/workers/enrichment/dist ./workers/enrichment/dist
COPY --from=builder /app/workers/enrichment/package.json ./workers/enrichment/
RUN chown -R cerniq:cerniq /app
USER cerniq

ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "workers/enrichment/dist/main.js"]
