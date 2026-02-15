const http = require("http");

const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        service: "cerniq-api",
        version: process.env.VERSION || "0.0.1",
        placeholder: true,
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      message: "Cerniq API - Placeholder Service",
      endpoints: ["/health", "/api/health"],
    }),
  );
});

server.listen(3000, "0.0.0.0", () => {
  console.log("Cerniq API placeholder running on port 3000");
});

