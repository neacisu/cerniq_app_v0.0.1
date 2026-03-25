# syntax=docker/dockerfile:1.7
# Build from repository root: docker build -f workers/ai/Dockerfile .
FROM node:25.8.1-alpine3.23 AS base
ENV CI=true
RUN apk upgrade --no-cache && apk add --no-cache curl && npm install -g pnpm@10.32.1
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY workers/ai/package.json ./workers/ai/
COPY workers/shared/package.json ./workers/shared/
RUN pnpm install --frozen-lockfile --filter @cerniq/worker-ai...

FROM deps AS builder
COPY workers/ai/ ./workers/ai/
COPY workers/shared/ ./workers/shared/
RUN pnpm --filter @cerniq/worker-shared build

FROM base AS runner
RUN addgroup -g 1001 -S cerniq && \
    adduser -S -D -H -u 1001 -G cerniq cerniq
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/workers/ai/node_modules ./workers/ai/node_modules
COPY --from=deps /app/workers/shared/node_modules ./workers/shared/node_modules
COPY --from=builder /app/workers/shared/dist ./workers/shared/dist
COPY --from=builder /app/workers/shared/package.json ./workers/shared/
COPY --from=builder /app/workers/ai/src ./workers/ai/src
COPY --from=builder /app/workers/ai/package.json ./workers/ai/
RUN chown -R cerniq:cerniq /app
USER cerniq
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
WORKDIR /app/workers/ai
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
