# syntax=docker/dockerfile:1.7
FROM node:25.6.1-alpine3.23 AS base
RUN apk add --no-cache curl
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web-admin/package.json ./apps/web-admin/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile --filter @cerniq/web-admin...

FROM deps AS builder
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/web-admin/ ./apps/web-admin/
RUN pnpm --filter @cerniq/web-admin build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web-admin/dist /usr/share/nginx/html
RUN printf 'server {\n  listen 64012;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / { try_files $uri $uri/ /index.html; }\n  location /health { return 200 '"'"'{"status":"ok"}'"'"'; add_header Content-Type application/json; }\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 64012
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:64012/health || exit 1
