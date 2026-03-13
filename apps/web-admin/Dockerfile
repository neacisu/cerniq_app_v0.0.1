# syntax=docker/dockerfile:1.7
# =============================================================================
# Cerniq.app - Web Admin Dockerfile
# Reference: ADR-0015 Container Strategy
# =============================================================================

ARG WOLFI_BASE_IMAGE=cgr.dev/chainguard/wolfi-base:latest@sha256:a9a3a0c9fb954fd70b398afdd055d74a4f196095b9fdfbcfb13495aefeefd075
ARG NODE_VERSION=25.8.1
ARG NPM_VERSION=11.11.1
ARG PNPM_VERSION=10.32.1

FROM ${WOLFI_BASE_IMAGE} AS base
ARG NODE_VERSION
ARG NPM_VERSION
ARG PNPM_VERSION
ARG TARGETARCH
RUN apk add --no-cache ca-certificates-bundle curl libatomic libstdc++ \
    && case "${TARGETARCH}" in \
      amd64) node_arch="x64" ;; \
      arm64) node_arch="arm64" ;; \
      *) echo "Unsupported TARGETARCH: ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
    && node_dist="node-v${NODE_VERSION}-linux-${node_arch}.tar.xz" \
    && curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/${node_dist}" \
    && curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" \
    && grep " ${node_dist}$" SHASUMS256.txt | sha256sum -c - \
    && tar -xJf "${node_dist}" -C /usr/local --strip-components=1 --no-same-owner \
    && rm -f "${node_dist}" SHASUMS256.txt \
    && npm install -g "npm@${NPM_VERSION}" "pnpm@${PNPM_VERSION}" \
    && npm cache clean --force
ENV PATH=/usr/local/bin:${PATH}
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web-admin/package.json ./apps/web-admin/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile --filter @cerniq/web-admin...

# --- Build ---
FROM deps AS builder
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/web-admin/ ./apps/web-admin/
RUN pnpm --filter @cerniq/web-admin build

# --- Serve (unprivileged nginx — no root capabilities needed) ---
FROM nginxinc/nginx-unprivileged:alpine AS runner
COPY --from=builder /app/apps/web-admin/dist /usr/share/nginx/html
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 64012;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location /health { return 200 '{"status":"ok"}'; add_header Content-Type application/json; }
    location /health/live { return 200 '{"status":"ok"}'; add_header Content-Type application/json; }
}
EOF

EXPOSE 64012

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --spider -q http://localhost:64012/health || exit 1
