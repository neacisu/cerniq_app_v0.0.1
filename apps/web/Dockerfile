# =============================================================================
# Cerniq.app - Web Frontend Dockerfile
# =============================================================================
# PLACEHOLDER - Will be updated when Web development begins
# Reference: ADR-0015 Container Strategy
# =============================================================================

FROM node:22-alpine AS base

RUN apk add --no-cache curl

WORKDIR /app

RUN addgroup -g 1001 -S cerniq && \
    adduser -S -D -H -u 1001 -G cerniq cerniq

# Simple static server placeholder
RUN cat > server.js << 'EOF'
const http = require('http');
const html = `<!DOCTYPE html>
<html>
<head>
  <title>Cerniq.app - Coming Soon</title>
  <style>
    body { font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; }
    .container { text-align: center; }
    h1 { font-size: 3rem; margin-bottom: 0.5rem; }
    p { opacity: 0.8; }
    .status { background: rgba(255,255,255,0.1); padding: 1rem 2rem; border-radius: 8px; margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Cerniq.app</h1>
    <p>AI-Powered Sales Intelligence Platform</p>
    <div class="status">
      <p>✅ Infrastructure Ready</p>
      <p>🔧 Application Coming Soon</p>
    </div>
  </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', service: 'cerniq-web', placeholder: true }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }
});
server.listen(3000, '0.0.0.0', () => console.log('Cerniq Web placeholder on port 3000'));
EOF

RUN chown -R cerniq:cerniq /app
USER cerniq

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
