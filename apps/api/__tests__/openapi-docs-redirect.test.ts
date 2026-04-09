import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

describe("OpenAPI / Swagger UI", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /documentation redirecționează către /docs/", async () => {
    const res = await app.inject({ method: "GET", url: "/documentation" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/docs/");
  });

  it("GET /docs/json returnează OpenAPI 3.x cu info.title", async () => {
    const res = await app.inject({ method: "GET", url: "/docs/json" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      openapi?: string;
      info?: { title?: string; description?: string };
    };
    expect(body.openapi).toMatch(/^3\./);
    expect(body.info?.title).toBe("Cerniq API");
    expect(body.info?.description).toContain("Zod");
  });
});
