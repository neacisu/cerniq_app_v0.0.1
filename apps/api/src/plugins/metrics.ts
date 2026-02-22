import type { FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";
import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from "prom-client";

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

  app.get("/metrics", async (_request, reply) => {
    const metrics = await register.metrics();
    reply.header("Content-Type", register.contentType);
    return metrics;
  });

  done();
};

export const metricsPlugin = fp(metricsPluginFn, { name: "metrics" });
