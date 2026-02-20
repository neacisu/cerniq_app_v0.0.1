# syntax=docker/dockerfile:1.7
# =============================================================================
# Cerniq.app - Web Frontend Dockerfile
# =============================================================================
# PLACEHOLDER - Will be updated when Web development begins
# Reference: ADR-0015 Container Strategy
# =============================================================================

FROM node:25.6.1-alpine3.23 AS base

RUN apk add --no-cache curl

WORKDIR /app

RUN addgroup -g 1001 -S cerniq && \
    adduser -S -D -H -u 1001 -G cerniq cerniq

COPY server.js ./server.js

RUN chown -R cerniq:cerniq /app
USER cerniq

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
