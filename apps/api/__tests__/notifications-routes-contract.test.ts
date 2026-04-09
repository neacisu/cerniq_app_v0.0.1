/**
 * Contract + auth pentru `/api/v1/notifications` (RLS necesită DB — happy path omis fără Postgres).
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

describe("notifications API — contract", () => {
  it("GET /api/v1/notifications returnează 401 fără JWT", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/notifications" });
    expect(res.statusCode).toBe(401);
  });

  it("PATCH /api/v1/notifications/:id/read returnează 401 fără JWT", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/notifications/f47ac10b-58cc-4372-a567-0e02b2c3d479/read",
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /api/v1/notifications/read-all returnează 401 fără JWT", async () => {
    const res = await app.inject({ method: "POST", url: "/api/v1/notifications/read-all" });
    expect(res.statusCode).toBe(401);
  });
});
