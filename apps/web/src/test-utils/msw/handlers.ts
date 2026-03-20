import { http, HttpResponse } from "msw";
import { isDemoLoginCredentials } from "@/lib/demo-auth.js";

const apiBase = "http://localhost:64010";

export const handlers = [
  http.post(`${apiBase}/api/v1/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (isDemoLoginCredentials(body ?? {})) {
      return HttpResponse.json({
        success: true,
        data: {
          token: "mock-jwt-token",
          user: { email: body.email, tenantId: "tenant-1", role: "admin" },
        },
      });
    }
    return HttpResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
  }),
  http.post(`${apiBase}/api/v1/auth/refresh`, () =>
    HttpResponse.json({
      success: true,
      data: {
        token: "mock-jwt-token-refreshed",
        expiresIn: "15m",
      },
    }),
  ),
  http.post(`${apiBase}/api/v1/auth/logout`, () =>
    HttpResponse.json({ success: true, data: { loggedOut: true } }),
  ),

  http.get(`${apiBase}/health`, () =>
    HttpResponse.json({ status: "ok", timestamp: new Date().toISOString() }),
  ),
  http.get(`${apiBase}/health/deps`, () =>
    HttpResponse.json({
      status: "ok",
      dependencies: {
        database: { status: "up", latencyMs: 1 },
        redis: { status: "up", latencyMs: 1 },
      },
    }),
  ),

  http.get(`${apiBase}/api/admin/queues`, () =>
    HttpResponse.json({
      success: true,
      data: [{ name: "cerniq.ai-processing", waiting: 0, active: 0, completed: 10, failed: 0 }],
    }),
  ),

  http.get(`${apiBase}/api/admin/system/metrics`, () =>
    HttpResponse.json({
      success: true,
      data: {
        cpu: { count: 4, loadAvg: [0.5, 0.4, 0.3] },
        memory: { used: 512, total: 1024, usagePercent: "50" },
        uptime: 3600,
        hostname: "test",
      },
    }),
  ),

  http.get(`${apiBase}/api/v1/dashboard/stats`, () =>
    HttpResponse.json({
      success: true,
      data: {
        bronze: { total: 47382 },
        silver: { total: 8941 },
        gold: { total: 1247 },
        pipeline: { queueDepth: 184000 },
      },
    }),
  ),
  http.get(`/api/v1/dashboard/stats`, () =>
    HttpResponse.json({
      success: true,
      data: {
        bronze: { total: 47382 },
        silver: { total: 8941 },
        gold: { total: 1247 },
        pipeline: { queueDepth: 184000 },
      },
    }),
  ),
  http.get(`${apiBase}/api/v1/dashboard/activity`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "a1",
          type: "pipeline_error",
          severity: "warning",
          message: "Activity test event",
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  ),
  http.get(`/api/v1/dashboard/activity`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "a1",
          type: "pipeline_error",
          severity: "warning",
          message: "Activity test event",
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  ),
  http.get(`${apiBase}/api/v1/dashboard/daily-stats`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "ds1",
          statDate: new Date().toISOString(),
          bronzeTotal: 100,
          silverTotal: 50,
          goldTotal: 10,
          enrichmentJobsCompleted: 42,
          enrichmentJobsFailed: 2,
        },
      ],
      meta: { total: 1, limit: 30, offset: 0 },
    }),
  ),
  http.get(`/api/v1/dashboard/daily-stats`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "ds1",
          statDate: new Date().toISOString(),
          bronzeTotal: 100,
          silverTotal: 50,
          goldTotal: 10,
          enrichmentJobsCompleted: 42,
          enrichmentJobsFailed: 2,
        },
      ],
      meta: { total: 1, limit: 30, offset: 0 },
    }),
  ),
];
