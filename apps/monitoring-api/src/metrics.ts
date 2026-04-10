import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from "prom-client";

const METRICS_ALLOW_CIDR = (process.env.METRICS_ALLOW_CIDR ?? "10.0.0.0/16,127.0.0.1,::1")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isIpAllowed(ip: string): boolean {
  if (!ip) return false;
  if (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1") return true;
  if (ip.startsWith("10.0.")) return true;
  for (const cidr of METRICS_ALLOW_CIDR) {
    if (cidr === ip) return true;
    if (cidr.endsWith("/16") && cidr.startsWith("10.0.") && ip.startsWith("10.0.")) return true;
    if (cidr.endsWith("/32") && ip === cidr.replace("/32", "")) return true;
  }
  return false;
}

const register = new Registry();
collectDefaultMetrics({ register, prefix: "cerniq_monitoring_" });

export function httpRouteLabel(request: {
  routeOptions?: { url?: string };
  routerPath?: string;
}): string {
  const pattern = request.routeOptions?.url;
  if (typeof pattern === "string" && pattern.length > 0) return pattern;
  const legacy = request.routerPath;
  if (typeof legacy === "string" && legacy.length > 0) return legacy;
  return "unknown";
}

export const httpRequestsTotal = new Counter({
  name: "cerniq_monitoring_http_requests_total",
  help: "Monitoring API HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: "cerniq_monitoring_http_request_duration_seconds",
  help: "Monitoring API request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

export const httpActiveRequests = new Gauge({
  name: "cerniq_monitoring_http_active_requests",
  help: "In-flight HTTP requests",
  registers: [register],
});

/** Conexiuni WebSocket active pe `/ws/live`. */
export const wsLiveConnections = new Gauge({
  name: "cerniq_monitoring_ws_live_connections",
  help: "Active WebSocket connections on /ws/live",
  registers: [register],
});

/** Mesaje JSON trimise către clienți pe `/ws/live` (broadcast la 2s). */
export const wsLiveMessagesSentTotal = new Counter({
  name: "cerniq_monitoring_ws_live_messages_sent_total",
  help: "WebSocket messages sent on /ws/live",
  registers: [register],
});

/** Eșecuri la trimiterea broadcast-ului (ex. client deconectat). */
export const wsLiveBroadcastErrorsTotal = new Counter({
  name: "cerniq_monitoring_ws_live_broadcast_errors_total",
  help: "WebSocket broadcast failures on /ws/live",
  registers: [register],
});

const metricsPluginFn: FastifyPluginCallback = (app, _opts, done) => {
  app.addHook("onRequest", (_request, _reply, hookDone) => {
    httpActiveRequests.inc();
    hookDone();
  });

  app.addHook("onResponse", (request, reply, hookDone) => {
    httpActiveRequests.dec();
    const route = httpRouteLabel(request);
    const labels = { method: request.method, route, status: String(reply.statusCode) };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, reply.elapsedTime / 1000);
    hookDone();
  });

  app.get("/metrics", async (request: FastifyRequest, reply: FastifyReply) => {
    const ip = request.ip ?? request.headers["x-forwarded-for"] ?? request.headers["x-real-ip"];
    const clientIp = typeof ip === "string" ? ip.split(",")[0].trim() : String(ip ?? "");
    if (!isIpAllowed(clientIp)) {
      request.log.warn({ ip: clientIp }, "Monitoring metrics access denied");
      return reply.status(403).send({ error: "Forbidden" });
    }
    const body = await register.metrics();
    reply.header("Content-Type", register.contentType);
    return body;
  });

  done();
};

export const monitoringMetricsPlugin = fp(metricsPluginFn, { name: "monitoring-metrics" });
