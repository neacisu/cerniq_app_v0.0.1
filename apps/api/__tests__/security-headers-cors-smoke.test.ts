/**
 * Smoke securitate: rute protejate fără JWT → 401; CORS reflectă origini permise (nu wildcard la credentials);
 * antete Helmet pe răspunsuri publice (fără a presupune CORS permisiv pentru origini arbitrare).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";

describe("Securitate — 401 neautentificat, CORS, headers", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/referrals fără Authorization → 401", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/referrals" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /api/v1/outreach/leads/export fără Authorization → 401", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/outreach/leads/export" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /api/v1/nurturing/states fără Authorization → 401", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/nurturing/states" });
    expect(res.statusCode).toBe(401);
  });

  it("OPTIONS preflight cu Origin permisă (localhost:64000) → antete CORS pentru ruta API", async () => {
    const res = await app.inject({
      method: "OPTIONS",
      url: "/api/v1/negotiations",
      headers: {
        origin: "http://localhost:64000",
        "access-control-request-method": "GET",
      },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(200);
    expect(res.statusCode).toBeLessThan(300);
    const allowOrigin = res.headers["access-control-allow-origin"];
    expect(allowOrigin).toBe("http://localhost:64000");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("OPTIONS cu Origin nepermisă → fără echo CORS către domeniu arbitrar", async () => {
    const res = await app.inject({
      method: "OPTIONS",
      url: "/api/v1/negotiations",
      headers: {
        origin: "https://untrusted-example.test",
        "access-control-request-method": "GET",
      },
    });
    const allowOrigin = res.headers["access-control-allow-origin"];
    expect(allowOrigin).not.toBe("https://untrusted-example.test");
  });

  it("GET /health/live include antete securitate tip Helmet (non-dev)", async () => {
    const res = await app.inject({ method: "GET", url: "/health/live" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeDefined();
  });

  it("GET /health/live include Content-Security-Policy (Helmet CSP în mediul test)", async () => {
    const res = await app.inject({ method: "GET", url: "/health/live" });
    expect(res.statusCode).toBe(200);
    const csp = res.headers["content-security-policy"];
    expect(csp).toBeDefined();
    expect(String(csp)).toContain("'self'");
  });
});
