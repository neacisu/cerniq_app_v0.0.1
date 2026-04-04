/**
 * Proxy Fastify → Monitoring API: authz admin, validare isKnownQueueName, 502 la fetch eșuat.
 * fetch este mock-uit; MONITORING_API_INTERNAL_URL + ADMIN_KEY din setup.ts.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";
import {
  db,
  tenants,
  users,
  eq,
  TEST_PASSWORD_HASH,
  insert_tenant,
  insert_user,
  setSessionTenantId,
  setSessionRequestContext,
} from "@cerniq/db";
import { QUEUES } from "@cerniq/worker-shared";

const fetchMock = vi.fn();

function jsonBody(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Admin monitoring proxy (/api/admin/*)", () => {
  let app: FastifyInstance;
  let tenantId: string;
  let adminToken: string;
  let adminUserId: string;
  let viewerToken: string;
  const q = QUEUES.INGEST_CSV;

  beforeAll(async () => {
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = new URL(String(input));
        const method = (init?.method ?? "GET").toUpperCase();
        const path = url.pathname;

        if (method === "GET" && path === "/api/queues") {
          return Promise.resolve(
            jsonBody({
              success: true,
              data: [
                {
                  name: q,
                  waiting: 2,
                  active: 0,
                  completed: 10,
                  failed: 0,
                  delayed: 0,
                  paused: false,
                  throughput: 1,
                  latency: 3,
                },
              ],
            }),
          );
        }
        if (method === "GET" && path === "/api/system/metrics") {
          return Promise.resolve(jsonBody({ success: true, data: { cpu: 0.1 } }));
        }
        if (method === "GET" && path === `/api/queues/${encodeURIComponent(q)}`) {
          return Promise.resolve(
            jsonBody({
              success: true,
              data: {
                name: q,
                waiting: 2,
                active: 0,
                completed: 10,
                failed: 0,
                delayed: 0,
                paused: false,
                throughput: 1,
                latency: 3,
              },
            }),
          );
        }
        if (method === "POST" && path === `/api/queues/${encodeURIComponent(q)}/pause`) {
          return Promise.resolve(
            jsonBody({
              success: true,
              data: { name: q, paused: true, waiting: 2, active: 0, completed: 10, failed: 0 },
            }),
          );
        }
        return Promise.resolve(jsonBody({ success: false, error: "mock miss" }, 404));
      },
    );

    app = await buildApp();
    await app.ready();

    const tenantName = `admin-mon-${Date.now()}`;
    const tenant = await insert_tenant(
      tenantName,
      tenantName.toLowerCase().replaceAll(/\s+/g, "-"),
    );
    tenantId = tenant.id;
    await setSessionTenantId(tenantId);

    const admin = await insert_user(
      tenantId,
      `adm-mon-${Date.now()}@example.com`,
      TEST_PASSWORD_HASH,
      "Admin Mon",
      "admin",
      "active",
    );
    adminUserId = admin.id;
    adminToken = app.jwt.sign({
      id: admin.id,
      userId: admin.id,
      sub: admin.id,
      tenantId,
      role: "admin",
      tokenType: "access",
    });

    const viewer = await insert_user(
      tenantId,
      `view-mon-${Date.now()}@example.com`,
      TEST_PASSWORD_HASH,
      "Viewer Mon",
      "viewer",
      "active",
    );
    viewerToken = app.jwt.sign({
      id: viewer.id,
      userId: viewer.id,
      sub: viewer.id,
      tenantId,
      role: "viewer",
      tokenType: "access",
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = new URL(String(input));
        const method = (init?.method ?? "GET").toUpperCase();
        const path = url.pathname;
        if (method === "GET" && path === "/api/queues") {
          return Promise.resolve(
            jsonBody({
              success: true,
              data: [
                {
                  name: q,
                  waiting: 2,
                  active: 0,
                  completed: 10,
                  failed: 0,
                  delayed: 0,
                  paused: false,
                },
              ],
            }),
          );
        }
        if (method === "GET" && path === "/api/system/metrics") {
          return Promise.resolve(jsonBody({ success: true, data: { cpu: 0.1 } }));
        }
        if (method === "GET" && path === `/api/queues/${encodeURIComponent(q)}`) {
          return Promise.resolve(jsonBody({ success: true, data: { name: q, waiting: 2 } }));
        }
        if (method === "POST" && path === `/api/queues/${encodeURIComponent(q)}/pause`) {
          return Promise.resolve(jsonBody({ success: true, data: { name: q, paused: true } }));
        }
        return Promise.resolve(jsonBody({ success: false, error: "mock miss" }, 404));
      },
    );
  });

  afterAll(async () => {
    await setSessionRequestContext({ tenantId, userId: adminUserId });
    await db.delete(users).where(eq(users.tenantId, tenantId));
    await db.delete(tenants).where(eq(tenants.id, tenantId));
    await app.close();
  });

  it("GET /api/admin/queues — proxy listă cozi", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/queues",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("GET /api/admin/live — 200, agregă queues + system", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/live",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.queues)).toBe(true);
    expect(body.data.queues[0].name).toBe(q);
    expect(body.data.system).toEqual({ cpu: 0.1 });
  });

  it("GET /api/admin/live — 403 pentru viewer", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/live",
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it("GET /api/admin/live — 502 când Monitoring răspunde non-OK", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonBody({ error: "down" }, 500)));
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/live",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(502);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
    expect(String(body.error)).toMatch(/unavailable/i);
  });

  it("GET /api/admin/queues/:name — 400 pentru nume coadă necunoscut", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/queues/not-a-valid-queue-name",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET /api/admin/queues/:name — 200 pentru coadă cunoscută", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/admin/queues/${encodeURIComponent(q)}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.name).toBe(q);
  });

  it("POST /api/admin/queues/:name/pause — 200, corp din Monitoring", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/admin/queues/${encodeURIComponent(q)}/pause`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.paused).toBe(true);
  });

  it("GET /api/admin/prometheus/api-plugin-catalog — 200, include cerniq_http_requests_total și cerniq_e3_*", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/prometheus/api-plugin-catalog",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as {
      success: boolean;
      data: { metrics: { name: string; help: string; type: string }[]; sourceModule?: string };
    };
    expect(body.success).toBe(true);
    const names = body.data.metrics.map((m) => m.name);
    expect(names).toContain("cerniq_http_requests_total");
    expect(names.some((n) => n.startsWith("cerniq_e3_"))).toBe(true);
    expect(names.some((n) => n.startsWith("cerniq_e4_"))).toBe(true);
    expect(names.some((n) => n.startsWith("cerniq_e5_"))).toBe(true);
    expect(body.data.metrics.every((m) => m.help.length > 0)).toBe(true);
  });

  it("GET /api/admin/prometheus/api-plugin-catalog — 403 pentru viewer", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/prometheus/api-plugin-catalog",
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(res.statusCode).toBe(403);
  });
});
