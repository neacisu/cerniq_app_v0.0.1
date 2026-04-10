/**
 * Proxy routes to Monitoring API (internal). Used by Admin Dashboard.
 * Monitoring API is on cerniq_backend and not exposed to the browser.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { isKnownQueueName } from "@cerniq/worker-shared";
import { auditWriter } from "@cerniq/observability";
import { monitoringInternalFetch } from "../lib/monitoring-internal-fetch.js";
import { getRegisteredPrometheusMetricsCatalog } from "../plugins/metrics.js";

async function proxyRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  path: string,
  init: RequestInit = {},
) {
  try {
    const res = await monitoringInternalFetch(
      path,
      {
        headers: {
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...(init.headers as Record<string, string> | undefined),
        },
        ...init,
      },
      { incomingAuthorization: request.headers.authorization },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return reply.status(res.status).send(data);
    }
    return data;
  } catch (err) {
    request.log.warn({ err, path }, "Monitoring API proxy error");
    return reply.status(502).send({
      success: false,
      error: "Monitoring API unavailable",
    });
  }
}

const ALLOWED_ADMIN_ROLES = new Set(["admin", "owner", "superadmin"]);

function actorUserIdFromRequest(request: FastifyRequest): string | null {
  const user = request.user as { id?: string; userId?: string; sub?: string } | undefined;
  const id = user?.id ?? user?.userId ?? user?.sub;
  return typeof id === "string" && id.length > 0 ? id : null;
}

async function requireAdminOrOwner(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    request.log.warn({ err }, "admin monitoring: JWT verification failed");
    return reply.status(401).send({ success: false, error: "Unauthorized" });
  }
  const user = request.user as { role?: string } | undefined;
  const role = user?.role;
  if (!role || !ALLOWED_ADMIN_ROLES.has(role)) {
    return reply.status(403).send({ success: false, error: "Forbidden" });
  }
}

export async function adminMonitoringRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [requireAdminOrOwner] };

  app.get("/queues", authOpts, async (request, reply) => {
    return proxyRequest(request, reply, "/api/queues");
  });

  app.get("/queues/:name", authOpts, async (request, reply) => {
    const name = (request.params as { name?: string })?.name ?? "";
    if (!isKnownQueueName(name)) {
      return reply.status(400).send({ success: false, error: "Invalid queue name" });
    }
    return proxyRequest(request, reply, `/api/queues/${encodeURIComponent(name)}`);
  });

  app.get("/system/metrics", authOpts, async (request, reply) => {
    return proxyRequest(request, reply, "/api/system/metrics");
  });

  app.get<{ Querystring: { limit?: string } }>("/logs", authOpts, async (request, reply) => {
    const raw = request.query?.limit;
    const parsed = raw !== undefined && raw !== "" ? Number(raw) : Number.NaN;
    const limit = Number.isFinite(parsed) ? Math.min(500, Math.max(1, Math.trunc(parsed))) : 100;
    return proxyRequest(request, reply, `/api/logs?limit=${limit}`);
  });

  /**
   * Catalog read-only al metricilor Prometheus înregistrate în plugin-ul API (`metrics.ts`).
   * Nu expune `/metrics` text în browser; valorile seriilor se observă prin Prometheus/Grafana.
   */
  app.get("/prometheus/api-plugin-catalog", authOpts, async () => {
    return {
      success: true,
      data: {
        metrics: getRegisteredPrometheusMetricsCatalog(),
        sourceModule: "apps/api/src/plugins/metrics.ts",
        scrapeNote:
          "Text Prometheus: GET /metrics (allowlist IP METRICS_ALLOW_CIDR). SPA public nu trebuie să apeleze /metrics direct.",
      },
    };
  });

  app.get("/live", authOpts, async (request, reply) => {
    try {
      const authOptsFetch = { incomingAuthorization: request.headers.authorization };
      const [queuesRes, metricsRes] = await Promise.all([
        monitoringInternalFetch("/api/queues", {}, authOptsFetch),
        monitoringInternalFetch("/api/system/metrics", {}, authOptsFetch),
      ]);
      const [queuesBody, metricsBody] = await Promise.all([
        queuesRes.json().catch(() => ({})),
        metricsRes.json().catch(() => ({})),
      ]);
      if (!queuesRes.ok || !metricsRes.ok) {
        return reply.status(502).send({
          success: false,
          error: "Monitoring API unavailable",
          details: {
            queues: queuesBody,
            metrics: metricsBody,
          },
        });
      }
      return {
        success: true,
        data: {
          timestamp: Date.now(),
          queues: Array.isArray((queuesBody as { data?: unknown }).data)
            ? (queuesBody as { data: unknown[] }).data
            : [],
          system:
            typeof metricsBody === "object" && metricsBody !== null && "data" in metricsBody
              ? (metricsBody as { data: unknown }).data
              : null,
        },
      };
    } catch (err) {
      request.log.warn({ err }, "Monitoring API live proxy error");
      return reply.status(502).send({
        success: false,
        error: "Monitoring API unavailable",
      });
    }
  });

  const controlRoute =
    (action: "pause" | "resume" | "retry-failed" | "drain") =>
    async (request: FastifyRequest, reply: FastifyReply) => {
      const name = (request.params as { name?: string })?.name ?? "";
      if (!isKnownQueueName(name)) {
        return reply.status(400).send({ success: false, error: "Invalid queue name" });
      }
      const path = `/api/queues/${encodeURIComponent(name)}/${action}`;
      try {
        const res = await monitoringInternalFetch(
          path,
          { method: "POST" },
          { incomingAuthorization: request.headers.authorization },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return reply.status(res.status).send(data);
        }
        const userId = actorUserIdFromRequest(request);
        if (userId) {
          const tenantId = (request.user as { tenantId?: string } | undefined)?.tenantId ?? null;
          auditWriter.write({
            method: "POST",
            routePattern: `/api/admin/queues/:name/${action}`,
            statusCode: res.status,
            userId,
            tenantId,
            action: `admin_queue_${action.replaceAll("-", "_")}`,
            resource: "bullmq_queue",
            resourceId: name,
            metadata: { queue: name, controlAction: action },
          });
        }
        return data;
      } catch (err) {
        request.log.warn({ err, path }, "Monitoring API proxy error");
        return reply.status(502).send({
          success: false,
          error: "Monitoring API unavailable",
        });
      }
    };

  app.post("/queues/:name/pause", authOpts, controlRoute("pause"));
  app.post("/queues/:name/resume", authOpts, controlRoute("resume"));
  app.post("/queues/:name/retry-failed", authOpts, controlRoute("retry-failed"));
  app.post("/queues/:name/drain", authOpts, controlRoute("drain"));

  app.post<{
    Body: { queue: string; action: "pause" | "resume" };
  }>("/control/pause", authOpts, async (request, reply) => {
    const { queue, action } = request.body ?? {};
    if (typeof queue !== "string" || !isKnownQueueName(queue)) {
      return reply.status(400).send({ success: false, error: "Invalid queue name" });
    }
    if (action !== "pause" && action !== "resume") {
      return reply.status(400).send({ success: false, error: "Invalid action" });
    }
    const path = `/api/queues/${encodeURIComponent(queue)}/${action}`;
    try {
      const res = await monitoringInternalFetch(
        path,
        { method: "POST" },
        { incomingAuthorization: request.headers.authorization },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return reply.status(res.status).send(data);
      }
      const userId = actorUserIdFromRequest(request);
      if (userId) {
        const tenantId = (request.user as { tenantId?: string } | undefined)?.tenantId ?? null;
        auditWriter.write({
          method: "POST",
          routePattern: "/api/admin/control/pause",
          statusCode: res.status,
          userId,
          tenantId,
          action: `admin_queue_${action}`,
          resource: "bullmq_queue",
          resourceId: queue,
          metadata: { queue, controlAction: action },
        });
      }
      return data;
    } catch (err) {
      request.log.warn({ err, path }, "Monitoring API proxy error");
      return reply.status(502).send({
        success: false,
        error: "Monitoring API unavailable",
      });
    }
  });
}
