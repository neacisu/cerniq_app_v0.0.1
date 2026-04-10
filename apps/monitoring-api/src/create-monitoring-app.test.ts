import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QueueSnapshot } from "./queue-monitor.js";
import { buildMonitoringApp, type MonitorRef } from "./create-monitoring-app.js";

const baseSnapshot = (name: string): QueueSnapshot => ({
  name,
  waiting: 0,
  active: 0,
  completed: 0,
  failed: 0,
  delayed: 0,
  paused: false,
  throughput: 0,
  latency: 0,
});

describe("buildMonitoringApp — contract HTTP aliniat la proxy `/api/admin/*`", () => {
  let monitorRef: MonitorRef;

  beforeEach(() => {
    monitorRef = {
      current: {
        getAllQueues: vi.fn(async () => [baseSnapshot("ingest:csv")]),
        getQueue: vi.fn(async (name: string) => baseSnapshot(name)),
        controlQueue: vi.fn(async (name: string) => baseSnapshot(name)),
      },
    };
    vi.stubEnv("ADMIN_KEY", "test-admin-key");
    vi.stubEnv("JWT_SECRET", "a".repeat(32));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("GET /health și GET /health/live — status ok", async () => {
    const app = await buildMonitoringApp({
      monitorRef,
      metrics: { collect: () => ({ hostname: "t" }) },
      logger: false,
    });
    await app.ready();

    const h = await app.inject({ method: "GET", url: "/health" });
    expect(h.statusCode).toBe(200);
    expect(JSON.parse(h.payload).status).toBe("ok");

    const l = await app.inject({ method: "GET", url: "/health/live" });
    expect(l.statusCode).toBe(200);
    expect(JSON.parse(l.payload).status).toBe("ok");

    await app.close();
  });

  it("GET /api/queues — 401 fără auth", async () => {
    const app = await buildMonitoringApp({
      monitorRef,
      metrics: { collect: () => ({}) },
      logger: false,
    });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/queues" });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it("GET /api/queues — envelope { success, data }", async () => {
    const app = await buildMonitoringApp({
      monitorRef,
      metrics: { collect: () => ({}) },
      logger: false,
    });
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/api/queues",
      headers: { "x-admin-key": "test-admin-key" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as { success: boolean; data: QueueSnapshot[] };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("ingest:csv");

    await app.close();
  });

  it("GET /api/queues/:name — delegă getQueue", async () => {
    const app = await buildMonitoringApp({
      monitorRef,
      metrics: { collect: () => ({}) },
      logger: false,
    });
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/api/queues/ingest%3Acsv",
      headers: { "x-admin-key": "test-admin-key" },
    });
    expect(res.statusCode).toBe(200);
    expect(monitorRef.current.getQueue).toHaveBeenCalledWith("ingest:csv");

    await app.close();
  });

  it("GET /api/system/metrics — envelope { success, data }", async () => {
    const app = await buildMonitoringApp({
      monitorRef,
      metrics: { collect: () => ({ hostname: "x", uptime: 1 }) },
      logger: false,
    });
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/api/system/metrics",
      headers: { "x-admin-key": "test-admin-key" },
    });
    const body = JSON.parse(res.payload) as { success: boolean; data: { hostname: string } };
    expect(body.success).toBe(true);
    expect(body.data.hostname).toBe("x");

    await app.close();
  });

  it("GET /api/logs — data array gol, limit clamp 1..500", async () => {
    const app = await buildMonitoringApp({
      monitorRef,
      metrics: { collect: () => ({}) },
      logger: false,
    });
    await app.ready();

    const a = await app.inject({
      method: "GET",
      url: "/api/logs",
      headers: { "x-admin-key": "test-admin-key" },
    });
    const bodyA = JSON.parse(a.payload) as { data: unknown[]; meta: { limit: number } };
    expect(bodyA.data).toEqual([]);
    expect(bodyA.meta.limit).toBe(100);

    const b = await app.inject({
      method: "GET",
      url: "/api/logs?limit=9999",
      headers: { "x-admin-key": "test-admin-key" },
    });
    expect((JSON.parse(b.payload) as { meta: { limit: number } }).meta.limit).toBe(500);

    const c = await app.inject({
      method: "GET",
      url: "/api/logs?limit=0",
      headers: { "x-admin-key": "test-admin-key" },
    });
    expect((JSON.parse(c.payload) as { meta: { limit: number } }).meta.limit).toBe(1);

    await app.close();
  });

  it("POST control queue — 401 fără auth; 200 cu x-admin-key", async () => {
    const app = await buildMonitoringApp({
      monitorRef,
      metrics: { collect: () => ({}) },
      logger: false,
    });
    await app.ready();

    const forbidden = await app.inject({
      method: "POST",
      url: "/api/queues/ingest:csv/pause",
    });
    expect(forbidden.statusCode).toBe(401);

    const ok = await app.inject({
      method: "POST",
      url: "/api/queues/ingest:csv/pause",
      headers: { "x-admin-key": "test-admin-key" },
    });
    expect(ok.statusCode).toBe(200);
    expect(monitorRef.current.controlQueue).toHaveBeenCalledWith("ingest:csv", "pause");

    await app.close();
  });

  it("POST resume, retry-failed, drain — mapare acțiuni", async () => {
    const app = await buildMonitoringApp({
      monitorRef,
      metrics: { collect: () => ({}) },
      logger: false,
    });
    await app.ready();
    const h = { "x-admin-key": "test-admin-key" };

    await app.inject({ method: "POST", url: "/api/queues/q/resume", headers: h });
    await app.inject({ method: "POST", url: "/api/queues/q/retry-failed", headers: h });
    await app.inject({ method: "POST", url: "/api/queues/q/drain", headers: h });

    expect(monitorRef.current.controlQueue).toHaveBeenCalledWith("q", "resume");
    expect(monitorRef.current.controlQueue).toHaveBeenCalledWith("q", "retry-failed");
    expect(monitorRef.current.controlQueue).toHaveBeenCalledWith("q", "drain");

    await app.close();
  });
});

describe("Mapare către apps/api admin-monitoring (document de paritate)", () => {
  it("fiecare rută proxy GET/POST are echivalent în Monitoring API", () => {
    const monitoringPaths = new Set([
      "/api/queues",
      "/api/system/metrics",
      "/api/logs",
      "/api/queues/:name",
      "/api/queues/:name/pause",
      "/api/queues/:name/resume",
      "/api/queues/:name/retry-failed",
      "/api/queues/:name/drain",
      "/health",
      "/health/live",
      "/ws/live",
    ]);

    const proxied = [
      "/api/queues",
      "/api/system/metrics",
      "/api/logs",
      "/api/queues/:name",
      "/api/queues/:name/pause",
      "/api/queues/:name/resume",
      "/api/queues/:name/retry-failed",
      "/api/queues/:name/drain",
    ];

    for (const p of proxied) {
      expect(monitoringPaths.has(p)).toBe(true);
    }
  });
});
