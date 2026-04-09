/**
 * Contract + auth pentru GET /api/v1/system/processes.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("system processes API — contract", () => {
  it("GET /api/v1/system/processes returnează 401 fără JWT", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/system/processes" });
    expect(res.statusCode).toBe(401);
  });
});
