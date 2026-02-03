# =============================================================================
# Cerniq.app - Outreach Worker Dockerfile
# =============================================================================
# PLACEHOLDER - Will be updated when Outreach Worker development begins
# Handles: Email campaigns, LinkedIn automation, multi-channel sequences
# Reference: ADR-0015 Container Strategy
# =============================================================================

FROM node:22-alpine AS base

RUN apk add --no-cache curl

WORKDIR /app

RUN addgroup -g 1001 -S cerniq && \
    adduser -S -D -H -u 1001 -G cerniq cerniq

RUN cat > worker.js << 'EOF'
const http = require('http');

console.log('📧 Cerniq Outreach Worker starting (placeholder mode)...');

const status = {
  service: 'cerniq-worker-outreach',
  status: 'idle',
  placeholder: true,
  queues: ['email-campaigns', 'linkedin-automation', 'sequence-processing'],
  processedJobs: 0
};

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ...status, timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Outreach Worker - Use /health for status' }));
  }
});

server.listen(3000, '0.0.0.0', () => {
  console.log('✅ Outreach Worker health endpoint on port 3000');
});

setInterval(() => {
  console.log(`💓 Outreach Worker heartbeat - Status: ${status.status} - Jobs: ${status.processedJobs}`);
}, 30000);
EOF

RUN chown -R cerniq:cerniq /app
USER cerniq

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "worker.js"]
