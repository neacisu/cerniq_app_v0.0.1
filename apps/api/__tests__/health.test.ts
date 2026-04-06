import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";

describe("Health Check Endpoints", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  it("GET /health/live returns ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health/live" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).status).toBe("ok");
  });

  it("GET /health/live includes timestamp", async () => {
    const res = await app.inject({ method: "GET", url: "/health/live" });
    expect(JSON.parse(res.payload).timestamp).toBeDefined();
  });

  it("GET /health/ready — 200 sau 503, structură checks stabilă", async () => {
    const res = await app.inject({ method: "GET", url: "/health/ready" });
    expect([200, 503]).toContain(res.statusCode);
    const body = JSON.parse(res.payload) as {
      status?: string;
      checks?: {
        database?: { status: string; latencyMs: number };
        redis?: { status: string; latencyMs: number };
      };
      timestamp?: string;
    };
    expect(body.status === "ready" || body.status === "not_ready").toBe(true);
    expect(body.checks?.database?.status).toMatch(/healthy|unhealthy/);
    expect(body.checks?.redis?.status).toMatch(/healthy|unhealthy/);
    expect(typeof body.checks?.database?.latencyMs).toBe("number");
    expect(typeof body.checks?.redis?.latencyMs).toBe("number");
    expect(body.timestamp).toBeDefined();
  });

  it("GET /health/deps — 200, dependencies + timestamp", async () => {
    const res = await app.inject({ method: "GET", url: "/health/deps" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as {
      status?: string;
      dependencies?: {
        database: { status: string; latencyMs: number };
        redis: { status: string; latencyMs: number };
      };
      timestamp?: string;
    };
    expect(body.status).toBe("ok");
    expect(body.dependencies?.database?.status).toMatch(/healthy|unhealthy/);
    expect(body.dependencies?.redis?.status).toMatch(/healthy|unhealthy/);
    expect(body.timestamp).toBeDefined();
  });
});
