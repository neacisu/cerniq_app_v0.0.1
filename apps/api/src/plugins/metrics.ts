import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from "prom-client";

/** CIDR-style allowlist for /metrics (internal network + localhost). Comma-separated, e.g. "10.0.0.0/16,127.0.0.1,::1". */
const METRICS_ALLOW_CIDR = (process.env.METRICS_ALLOW_CIDR ?? "10.0.0.0/16,127.0.0.1,::1")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isIpAllowed(ip: string): boolean {
  if (!ip) return false;
  if (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1") return true;
  if (ip.startsWith("10.0.")) return true;
  if (ip.startsWith("fd") || ip === "::") return false;
  for (const cidr of METRICS_ALLOW_CIDR) {
    if (cidr === ip) return true;
    if (cidr.endsWith("/16") && cidr.startsWith("10.0.") && ip.startsWith("10.0.")) return true;
    if (cidr.endsWith("/32") && ip === cidr.replace("/32", "")) return true;
  }
  return false;
}

const register = new Registry();
collectDefaultMetrics({ register, prefix: "cerniq_" });

export const httpRequestsTotal = new Counter({
  name: "cerniq_http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: "cerniq_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

export const healthCheckStatus = new Gauge({
  name: "cerniq_health_check_status",
  help: "Health check status (1=healthy, 0=unhealthy)",
  labelNames: ["component"],
  registers: [register],
});

export const healthCheckLatency = new Histogram({
  name: "cerniq_health_check_latency_ms",
  help: "Health check latency in milliseconds",
  labelNames: ["component"],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000],
  registers: [register],
});

export const secretsReloadTotal = new Counter({
  name: "cerniq_secrets_reload_total",
  help: "Total secret reload attempts",
  labelNames: ["service", "status"],
  registers: [register],
});

export const secretsLastReloadTimestamp = new Gauge({
  name: "cerniq_secrets_last_reload_timestamp",
  help: "Unix timestamp of last successful secrets reload",
  labelNames: ["service"],
  registers: [register],
});

export const secretsFileAgeSeconds = new Gauge({
  name: "cerniq_secrets_file_age_seconds",
  help: "Age in seconds of the rendered secrets file",
  labelNames: ["service"],
  registers: [register],
});

const metricsPluginFn: FastifyPluginCallback = (app, _opts, done) => {
  app.addHook("onResponse", (request, reply, hookDone) => {
    const route = request.routeOptions?.url ?? request.url;
    const labels = {
      method: request.method,
      route,
      status: String(reply.statusCode),
    };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, reply.elapsedTime / 1000);
    hookDone();
  });

  app.get("/metrics", async (request: FastifyRequest, reply: FastifyReply) => {
    const ip = request.ip ?? request.headers["x-forwarded-for"] ?? request.headers["x-real-ip"];
    const clientIp = typeof ip === "string" ? ip.split(",")[0].trim() : String(ip ?? "");
    if (!isIpAllowed(clientIp)) {
      request.log.warn({ ip: clientIp }, "Metrics access denied");
      return reply.status(403).send({ error: "Forbidden" });
    }
    const metrics = await register.metrics();
    reply.header("Content-Type", register.contentType);
    return metrics;
  });

  done();
};

export const metricsPlugin = fp(metricsPluginFn, { name: "metrics" });
