# =============================================================================
# Cerniq.app - Admin Dashboard Dockerfile
# =============================================================================
# PLACEHOLDER - Will be updated when Admin development begins
# Reference: ADR-0015 Container Strategy
# =============================================================================

FROM node:22-alpine AS base

RUN apk add --no-cache curl

WORKDIR /app

RUN addgroup -g 1001 -S cerniq && \
    adduser -S -D -H -u 1001 -G cerniq cerniq

RUN cat > server.js << 'EOF'
const http = require('http');
const html = `<!DOCTYPE html>
<html>
<head>
  <title>Cerniq Admin - Coming Soon</title>
  <style>
    body { font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0f0f23; color: white; }
    .container { text-align: center; }
    h1 { font-size: 2.5rem; }
    .badge { background: #fbbf24; color: black; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚙️ Cerniq Admin</h1>
    <span class="badge">PLACEHOLDER</span>
    <p style="margin-top: 2rem; opacity: 0.7;">Admin dashboard under development</p>
  </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', service: 'cerniq-web-admin', placeholder: true }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }
});
server.listen(3000, '0.0.0.0', () => console.log('Cerniq Admin placeholder on port 3000'));
EOF

RUN chown -R cerniq:cerniq /app
USER cerniq

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
