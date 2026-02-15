const http = require("http");

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Cerniq.app - Coming Soon</title>
  <style>
    body { font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #111827; color: #f9fafb; }
    .container { text-align: center; padding: 24px; }
    h1 { font-size: 48px; margin: 0 0 8px; }
    p { opacity: 0.85; margin: 0; }
    .status { margin-top: 24px; padding: 16px 20px; background: rgba(255,255,255,0.06); border-radius: 10px; }
    .status p { margin: 6px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Cerniq.app</h1>
    <p>Infrastructure ready. Application coming soon.</p>
    <div class="status">
      <p>OK: Infra</p>
      <p>TODO: App</p>
    </div>
  </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ status: "healthy", service: "cerniq-web", placeholder: true }),
    );
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(html);
});

server.listen(3000, "0.0.0.0", () => {
  console.log("Cerniq Web placeholder running on port 3000");
});

