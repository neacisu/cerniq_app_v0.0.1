import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { trace } from "@opentelemetry/api";
import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
  type OpenMetricsContentType,
} from "prom-client";

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
/** OpenMetrics permite exemplare pe histograme (`enableExemplars`); înainte de instanțierea acestor histograme. */
(register as unknown as Registry<OpenMetricsContentType>).setContentType(
  Registry.OPENMETRICS_CONTENT_TYPE,
);
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
  enableExemplars: true,
});

/** In-flight HTTP requests (use route template label only via paired metrics). */
export const httpActiveRequests = new Gauge({
  name: "cerniq_http_active_requests",
  help: "Number of HTTP requests currently being processed",
  registers: [register],
});

/** Fastify route pattern (e.g. /api/v1/imports/:id) — never the raw URL (avoids high cardinality). */
export function httpRouteLabel(request: {
  url?: string;
  routeOptions?: { url?: string };
  routerPath?: string;
}): string {
  const pattern = request.routeOptions?.url;
  if (typeof pattern === "string" && pattern.length > 0) {
    return pattern;
  }
  const legacy = request.routerPath;
  if (typeof legacy === "string" && legacy.length > 0) {
    return legacy;
  }
  return "unknown";
}

/** Suprafață trafic pentru agregări fără PII — `webhook` = prefix canonic `/api/v1/webhooks`. */
export type HttpRequestSurface = "api" | "webhook";

export function httpRequestSurface(request: {
  url?: string;
  routeOptions?: { url?: string };
  routerPath?: string;
}): HttpRequestSurface {
  const route = httpRouteLabel(request);
  if (route.startsWith("/api/v1/webhooks")) {
    return "webhook";
  }
  const rawPath = (request.url ?? "").split("?")[0] ?? "";
  if (rawPath.startsWith("/api/v1/webhooks")) {
    return "webhook";
  }
  return "api";
}

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

/** Depășiri rate-limit global sau per-rută (@fastify/rate-limit). Label `route` = șablon Fastify (nu URL brut). */
export const rateLimitExceededTotal = new Counter({
  name: "cerniq_rate_limit_exceeded_total",
  help: "Requests rejected by rate limiter",
  labelNames: ["route", "surface"],
  registers: [register],
});

/**
 * Eșecuri de autorizare HTTP agregate pe șablon rută (complementar `cerniq_http_requests_total{status}`).
 * Nu include403 pe `/metrics` (interdicție IP, nu JWT/RBAC).
 */
export const httpAuthFailuresTotal = new Counter({
  name: "cerniq_http_auth_failures_total",
  help: "HTTP 401/403 responses by route template (no user identifiers)",
  labelNames: ["route", "reason", "surface"],
  registers: [register],
});

/** Încercări login (POST /api/v1/auth/login) — fără PII în label-uri. */
export const authLoginAttemptsTotal = new Counter({
  name: "cerniq_auth_login_attempts_total",
  help: "Login attempts by result",
  labelNames: ["result"],
  registers: [register],
});

/** Sesiuni SSE încheiate (răspuns text/event-stream închis). */
export const sseStreamsCompletedTotal = new Counter({
  name: "cerniq_sse_streams_completed_total",
  help: "Completed Server-Sent Events response streams",
  labelNames: ["route"],
  registers: [register],
});

export const sseStreamDurationSeconds = new Histogram({
  name: "cerniq_sse_stream_duration_seconds",
  help: "Duration of completed SSE responses in seconds",
  labelNames: ["route"],
  buckets: [1, 5, 15, 30, 60, 120, 300, 600, 1800],
  registers: [register],
});

/** Evenimente `data:` (sau echivalent) trimise pe SSE — separat de histograma HTTP scurtă. */
export const sseEventsSentTotal = new Counter({
  name: "cerniq_sse_events_sent_total",
  help: "SSE data events written to clients",
  labelNames: ["route"],
  registers: [register],
});

/** Erori la scriere/pe polling SSE (client închis, excepții). */
export const sseConnectionErrorsTotal = new Counter({
  name: "cerniq_sse_connection_errors_total",
  help: "SSE stream write or poll errors",
  labelNames: ["route", "phase"],
  registers: [register],
});

/**
 * Durată apeluri HTTP outbound din API (fără URL complet în label — doar peer logic).
 * Populat explicit unde avem clienți cunoscuți (ex. `monitoringInternalFetch`).
 */
export const httpClientRequestDurationSeconds = new Histogram({
  name: "cerniq_http_client_request_duration_seconds",
  help: "Outbound HTTP client request duration in seconds",
  labelNames: ["method", "peer_service"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 15],
  registers: [register],
  enableExemplars: true,
});

function activeTraceIdForExemplar(): string | undefined {
  const sc = trace.getActiveSpan()?.spanContext();
  const id = sc?.traceId;
  return id && id !== "00000000000000000000000000000000" ? id : undefined;
}

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
  app.addHook("onRequest", (_request, _reply, hookDone) => {
    httpActiveRequests.inc();
    hookDone();
  });

  app.addHook("onResponse", (request, reply, hookDone) => {
    httpActiveRequests.dec();
    const route = httpRouteLabel(request);
    const statusCode = reply.statusCode;
    if (statusCode === 401 || statusCode === 403) {
      if (route !== "/metrics") {
        httpAuthFailuresTotal.inc({
          route,
          reason: statusCode === 401 ? "unauthenticated" : "forbidden",
          surface: httpRequestSurface(request),
        });
      }
    }
    const labels = {
      method: request.method,
      route,
      status: String(statusCode),
    };
    httpRequestsTotal.inc(labels);
    const ct = reply.getHeader("content-type");
    let ctStr = "";
    if (typeof ct === "string") ctStr = ct;
    else if (Array.isArray(ct) && ct.length > 0) ctStr = String(ct[0]);
    const isSse = ctStr.includes("text/event-stream");
    const durationSec = reply.elapsedTime / 1000;
    const traceId = activeTraceIdForExemplar();
    if (isSse) {
      sseStreamsCompletedTotal.inc({ route });
      sseStreamDurationSeconds.observe({ route }, durationSec);
    } else if (traceId) {
      /** OpenMetrics: exemplar cu `trace_id` — tipurile prom-client 15 limitează greșit exemplarLabels la label-urile histogramei. */
      httpRequestDuration.observe({
        value: durationSec,
        labels,
        exemplarLabels: { trace_id: traceId },
      } as never);
    } else {
      httpRequestDuration.observe(labels, durationSec);
    }
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
