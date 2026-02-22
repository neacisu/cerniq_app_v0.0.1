# syntax=docker/dockerfile:1.7
# =============================================================================
# Cerniq.app - Web Frontend Dockerfile
# Reference: ADR-0015 Container Strategy
# =============================================================================

FROM node:25.6.1-alpine3.23 AS base
RUN apk add --no-cache curl
RUN npm install -g pnpm@10.29.3
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile --filter @cerniq/web...

# --- Build ---
FROM deps AS builder
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/web/ ./apps/web/
RUN pnpm --filter @cerniq/web build

# --- Serve ---
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 64000;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location /health {
        return 200 '{"status":"ok"}';
        add_header Content-Type application/json;
    }
}
EOF

EXPOSE 64000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:64000/health || exit 1
