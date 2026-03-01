import http from "node:http";
import { metricsRegistry } from "./metrics.js";

export function createHealthServer(
  port: number,
  getPayload: () => Record<string, unknown>,
): http.Server {
  const server = http.createServer(async (req, res) => {
    if (req.url === "/health" || req.url === "/health/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(getPayload()));
      return;
    }

    if (req.url === "/metrics") {
      res.writeHead(200, { "Content-Type": metricsRegistry.contentType });
      res.end(await metricsRegistry.metrics());
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  });

  server.listen(port, "0.0.0.0");
  return server;
}
