import { http, HttpResponse } from "msw";

const apiBase = "http://localhost:64010";

export const handlers = [
  http.post(`${apiBase}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (body?.email === "admin@demo-tenant.com" && body?.password === "demo123456") {
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
      data: [{ name: "cerniq:ai-processing", waiting: 0, active: 0, completed: 10, failed: 0 }],
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
];
