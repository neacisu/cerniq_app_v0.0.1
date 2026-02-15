# syntax=docker/dockerfile:1.7
# =============================================================================
# Cerniq.app - API Service Dockerfile
# =============================================================================
# PLACEHOLDER - Will be updated when API development begins
# Reference: ADR-0015 Container Strategy
# =============================================================================

FROM node:25.6.1-alpine3.23 AS base

# Install dependencies for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S cerniq && \
    adduser -S -D -H -u 1001 -G cerniq cerniq

# Placeholder package.json for health check server
RUN echo '{"name":"cerniq-api","version":"0.0.1","scripts":{"start":"node server.js"}}' > package.json

# Keep runtime code in a real file to avoid IDE Dockerfile linter false-positives.
COPY server.js ./server.js

# Set ownership
RUN chown -R cerniq:cerniq /app

USER cerniq

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
