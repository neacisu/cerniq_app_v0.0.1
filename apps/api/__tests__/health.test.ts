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
});
