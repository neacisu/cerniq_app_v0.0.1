import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";

const recordMock = vi.fn();

vi.mock("@cerniq/observability", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cerniq/observability")>();
  return {
    ...actual,
    recordAuditEvent: recordMock,
  };
});

describe("audit-trail plugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.AUDIT_TRAIL_DISABLED;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("POST /api/v1/auth/login NU apelează recordAuditEvent (SKIP_PREFIXES — anti-dublare cu auditWriter)", async () => {
    const { auditTrailPlugin } = await import("./audit-trail.js");
    const app = Fastify({ logger: false });
    await app.register(auditTrailPlugin);
    app.post("/api/v1/auth/login", async () => ({ ok: true }));
    await app.ready();

    await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { email: "a@b.co" } });

    expect(recordMock).not.toHaveBeenCalled();
    await app.close();
  });

  it("POST /api/v1/auth/refresh NU apelează recordAuditEvent (SKIP_PREFIXES)", async () => {
    const { auditTrailPlugin } = await import("./audit-trail.js");
    const app = Fastify({ logger: false });
    await app.register(auditTrailPlugin);
    app.post("/api/v1/auth/refresh", async () => ({ ok: true }));
    await app.ready();

    await app.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: {} });

    expect(recordMock).not.toHaveBeenCalled();
    await app.close();
  });

  it("onResponse POST înregistrează durationMs, resource, action în metadata", async () => {
    const { auditTrailPlugin } = await import("./audit-trail.js");
    const app = Fastify({ logger: false });
    await app.register(auditTrailPlugin);
    app.post("/api/v1/widgets", async () => ({ ok: true }));
    await app.ready();

    await app.inject({ method: "POST", url: "/api/v1/widgets", payload: { a: 1 } });

    expect(recordMock).toHaveBeenCalledTimes(1);
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        metadata: expect.objectContaining({
          action: "POST",
          durationMs: expect.any(Number),
          resource: expect.any(String),
        }),
      }),
    );
    await app.close();
  });
});
