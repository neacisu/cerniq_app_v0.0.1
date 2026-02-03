# =============================================================================
# Cerniq.app - API Service Dockerfile
# =============================================================================
# PLACEHOLDER - Will be updated when API development begins
# Reference: ADR-0015 Container Strategy
# =============================================================================

FROM node:22-alpine AS base

# Install dependencies for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S cerniq && \
    adduser -S -D -H -u 1001 -G cerniq cerniq

# Placeholder package.json for health check server
RUN echo '{"name":"cerniq-api","version":"0.0.1","scripts":{"start":"node server.js"}}' > package.json

# Simple health check server
RUN cat > server.js << 'EOF'
const http = require('http');
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      service: 'cerniq-api',
      version: process.env.VERSION || '0.0.1',
      placeholder: true,
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'Cerniq API - Placeholder Service',
      endpoints: ['/health', '/api/health']
    }));
  }
});
server.listen(3000, '0.0.0.0', () => {
  console.log('Cerniq API placeholder running on port 3000');
});
EOF

# Set ownership
RUN chown -R cerniq:cerniq /app

USER cerniq

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
