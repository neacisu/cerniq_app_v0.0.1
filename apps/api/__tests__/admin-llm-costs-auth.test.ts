/**
 * GET /api/v1/admin/llm-costs — contract minim: fără JWT → 401.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";

describe("Admin LLM costs (/api/v1/admin/llm-costs)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  it("GET fără Authorization → 401", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/llm-costs?tenantId=00000000-0000-0000-0000-000000000001&period=today",
    });
    expect(res.statusCode).toBe(401);
  });
});
