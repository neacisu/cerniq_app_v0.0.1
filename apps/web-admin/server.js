const http = require("http");

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Cerniq Admin - Coming Soon</title>
  <style>
    body { font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0b1020; color: #f9fafb; }
    .container { text-align: center; padding: 24px; }
    h1 { font-size: 40px; margin: 0 0 10px; }
    .badge { display: inline-block; background: #fbbf24; color: #111827; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    p { margin-top: 22px; opacity: 0.8; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Cerniq Admin</h1>
    <span class="badge">PLACEHOLDER</span>
    <p>Admin dashboard under development</p>
  </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        service: "cerniq-web-admin",
        placeholder: true,
      }),
    );
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(html);
});

server.listen(3000, "0.0.0.0", () => {
  console.log("Cerniq Admin placeholder running on port 3000");
});

