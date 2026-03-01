/**
 * Proxy routes to Monitoring API (internal). Used by Admin Dashboard.
 * Monitoring API is on cerniq_backend and not exposed to the browser.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { envConfig } from "../config.js";

const MONITORING_API_BASE =
  process.env.MONITORING_API_INTERNAL_URL ?? "http://cerniq-monitoring-api:64080";

const QueueNameSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-zA-Z0-9_-]+$/);

async function proxyGet(request: FastifyRequest, reply: FastifyReply, path: string) {
  try {
    const res = await fetch(`${MONITORING_API_BASE}${path}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
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

const ALLOWED_ADMIN_ROLES = ["admin", "owner", "superadmin"];

async function requireAdminOrOwner(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ success: false, error: "Unauthorized" });
  }
  const user = request.user as { role?: string } | undefined;
  const role = user?.role;
  if (!role || !ALLOWED_ADMIN_ROLES.includes(role)) {
    return reply.status(403).send({ success: false, error: "Forbidden" });
  }
}

export async function adminMonitoringRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [requireAdminOrOwner] };

  app.get("/queues", authOpts, async (request, reply) => {
    return proxyGet(request, reply, "/api/queues");
  });

  app.get("/queues/:name", authOpts, async (request, reply) => {
    const parsed = QueueNameSchema.safeParse((request.params as { name?: string })?.name);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: "Invalid queue name" });
    }
    return proxyGet(request, reply, `/api/queues/${encodeURIComponent(parsed.data)}`);
  });

  app.get("/system/metrics", authOpts, async (request, reply) => {
    return proxyGet(request, reply, "/api/system/metrics");
  });

  app.post<{
    Body: { queue: string; action: "pause" | "resume" };
  }>("/control/pause", async (request, reply) => {
    const adminKey = request.headers["x-admin-key"];
    const key = envConfig.ADMIN_KEY;
    if (!key || adminKey !== key) {
      return reply.status(403).send({ success: false, error: "Forbidden" });
    }
    try {
      const res = await fetch(`${MONITORING_API_BASE}/api/control/pause`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": String(adminKey ?? ""),
        },
        body: JSON.stringify(request.body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return reply.status(res.status).send(data);
      }
      return data;
    } catch (err) {
      request.log.warn({ err }, "Monitoring API control proxy error");
      return reply.status(502).send({
        success: false,
        error: "Monitoring API unavailable",
      });
    }
  });
}
