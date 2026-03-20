# syntax=docker/dockerfile:1.7
# =============================================================================
# Cerniq.app - Monitoring API Dockerfile
# Reference: ADR-0015 Container Strategy
# =============================================================================

ARG WOLFI_BASE_IMAGE=cgr.dev/chainguard/wolfi-base:latest@sha256:a9a3a0c9fb954fd70b398afdd055d74a4f196095b9fdfbcfb13495aefeefd075
ARG NODE_VERSION=25.8.1
ARG NPM_VERSION=11.11.1
ARG PNPM_VERSION=10.32.1

FROM ${WOLFI_BASE_IMAGE} AS base
ENV CI=true
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
COPY apps/monitoring-api/package.json ./apps/monitoring-api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/config/package.json ./packages/config/
COPY workers/shared/package.json ./workers/shared/
RUN pnpm install --frozen-lockfile --filter @cerniq/monitoring-api...

# --- Build ---
FROM deps AS builder
COPY packages/ ./packages/
COPY workers/shared/ ./workers/shared/
COPY apps/monitoring-api/ ./apps/monitoring-api/
RUN pnpm --filter @cerniq/shared-types build
RUN pnpm --filter @cerniq/worker-shared build
RUN pnpm --filter @cerniq/monitoring-api build

# --- Production ---
FROM ${WOLFI_BASE_IMAGE} AS runner
RUN apk add --no-cache ca-certificates-bundle curl libatomic libstdc++
COPY --from=base /usr/local/ /usr/local/
ENV PATH=/usr/local/bin:${PATH}
WORKDIR /app

COPY --from=deps --chown=65532:65532 /app/node_modules ./node_modules
COPY --from=deps --chown=65532:65532 /app/apps/monitoring-api/node_modules ./apps/monitoring-api/node_modules
COPY --from=deps --chown=65532:65532 /app/workers/shared/node_modules ./workers/shared/node_modules
COPY --from=builder --chown=65532:65532 /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder --chown=65532:65532 /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=builder --chown=65532:65532 /app/packages/config/ ./packages/config/
COPY --from=builder --chown=65532:65532 /app/workers/shared/dist ./workers/shared/dist
COPY --from=builder --chown=65532:65532 /app/workers/shared/package.json ./workers/shared/
COPY --from=builder --chown=65532:65532 /app/apps/monitoring-api/dist ./apps/monitoring-api/dist
COPY --from=builder --chown=65532:65532 /app/apps/monitoring-api/package.json ./apps/monitoring-api/
USER 65532:65532

EXPOSE 64080

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:64080/health/live || exit 1

CMD ["node", "apps/monitoring-api/dist/index.js"]
