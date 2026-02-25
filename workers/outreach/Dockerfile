# syntax=docker/dockerfile:1.7
# =============================================================================
# Cerniq.app - Outreach Worker Dockerfile (multi-stage)
# =============================================================================
# Handles: Email campaigns, LinkedIn automation, multi-channel sequences
# Reference: ADR-0015 Container Strategy
# =============================================================================

FROM node:25.6.1-alpine3.23 AS base
ENV CI=true
RUN apk add --no-cache curl
RUN npm install -g pnpm@10.29.3
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM base AS runner
RUN addgroup -g 1001 -S cerniq && \
    adduser -S -D -H -u 1001 -G cerniq cerniq
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY worker.js ./worker.js
RUN chown -R cerniq:cerniq /app
USER cerniq
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "worker.js"]
