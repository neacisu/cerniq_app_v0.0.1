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

/** Intrări read-only pentru catalog UI admin — sursa unică este acest fișier + `register`. */
export type ApiPrometheusMetricCatalogEntry = {
  name: string;
  help: string;
  type: string;
};

export function getRegisteredPrometheusMetricsCatalog(): ApiPrometheusMetricCatalogEntry[] {
  return register.getMetricsAsArray().map((m) => ({
    name: m.name,
    help: m.help,
    type: String(m.type),
  }));
}

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

// ── E3 AI Sales metrics ────────────────────────────────────────────────────
export const e3NegotiationsTotal = new Counter({
  name: "cerniq_e3_negotiations_total",
  help: "Total E3 negotiations created/transitioned",
  labelNames: ["action", "fsm_state"],
  registers: [register],
});

export const e3ProductsCreatedTotal = new Counter({
  name: "cerniq_e3_products_created_total",
  help: "Total E3 product catalog entries created",
  labelNames: ["action"],
  registers: [register],
});

export const e3FiscalDocumentsTotal = new Counter({
  name: "cerniq_e3_fiscal_documents_total",
  help: "Total E3 fiscal documents processed (Oblio + SPV ANAF)",
  labelNames: ["type", "status"],
  registers: [register],
});

// ── E4 Post-Sale metrics ───────────────────────────────────────────────────
export const e4OrdersCreatedTotal = new Counter({
  name: "cerniq_e4_orders_created_total",
  help: "Total E4 orders created",
  labelNames: ["status"],
  registers: [register],
});

export const e4OrdersSoftDeletedTotal = new Counter({
  name: "cerniq_e4_orders_soft_deleted_total",
  help: "Total E4 orders soft-deleted",
  labelNames: [],
  registers: [register],
});

export const e4CreditEvaluationsTotal = new Counter({
  name: "cerniq_e4_credit_evaluations_total",
  help: "Total E4 credit score evaluations",
  labelNames: ["tier"],
  registers: [register],
});

export const e4ContractsGeneratedTotal = new Counter({
  name: "cerniq_e4_contracts_generated_total",
  help: "Total E4 contracts generated/signed",
  labelNames: ["action", "status"],
  registers: [register],
});

// ── E5 Nurturing metrics ───────────────────────────────────────────────────
export const e5NpsRequestsTotal = new Counter({
  name: "cerniq_e5_nps_requests_total",
  help: "Total E5 NPS survey requests sent",
  labelNames: ["channel"],
  registers: [register],
});

export const e5ChurnEvaluationsTotal = new Counter({
  name: "cerniq_e5_churn_evaluations_total",
  help: "Total E5 churn risk evaluations",
  labelNames: ["risk_level"],
  registers: [register],
});

export const e5ReferralsCreatedTotal = new Counter({
  name: "cerniq_e5_referrals_created_total",
  help: "Total E5 referral programs created",
  labelNames: ["status"],
  registers: [register],
});

export const e5GraphDetectionsTotal = new Counter({
  name: "cerniq_e5_graph_detections_total",
  help: "Total E5 graph community detection runs",
  labelNames: ["algorithm"],
  registers: [register],
});

export const e5AlertsTriggeredTotal = new Counter({
  name: "cerniq_e5_alerts_triggered_total",
  help: "Total E5 alerts triggered (weather/APIA/campaign/compliance)",
  labelNames: ["type", "severity"],
  registers: [register],
});

export const e4ShipmentsRequestedTotal = new Counter({
  name: "cerniq_e4_shipments_requested_total",
  help: "Total E4 Sameday AWB shipments requested",
  labelNames: ["action", "status"],
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
