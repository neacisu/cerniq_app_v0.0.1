/**
 * POST /api/v1/errors/client — contract minim + persist (mock insert).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import * as db from "@cerniq/db";

describe("POST /api/v1/errors/client", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.spyOn(db, "insertErrorLogRows").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("202 + apelează insertErrorLogRows pentru body valid", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/errors/client",
      headers: { "x-correlation-id": "not-a-uuid-session" },
      payload: {
        message: "boundary test",
        name: "Error",
        url: "https://example.com/page",
      },
    });
    expect(res.statusCode).toBe(202);
    const body = res.json() as { success?: boolean; data?: { accepted?: boolean } };
    expect(body.success).toBe(true);
    expect(body.data?.accepted).toBe(true);
    expect(db.insertErrorLogRows).toHaveBeenCalledTimes(1);
    const rows = vi.mocked(db.insertErrorLogRows).mock.calls[0]?.[0];
    expect(rows?.[0]?.context).toMatchObject({ sourceType: "frontend" });
    expect(rows?.[0]?.correlationId).toBeNull();
  });

  it("400 pentru body invalid", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/errors/client",
      payload: { message: "" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("corelează correlationId când header e UUID valid", async () => {
    const cid = "550e8400-e29b-41d4-a716-446655440000";
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/errors/client",
      headers: { "x-correlation-id": cid },
      payload: { message: "x" },
    });
    expect(res.statusCode).toBe(202);
    const rows = vi.mocked(db.insertErrorLogRows).mock.calls[0]?.[0];
    expect(rows?.[0]?.correlationId).toBe(cid);
  });

  it("Idempotency-Key: al doilea apel cu aceeași cheie nu mai inserează", async () => {
    const headers = { "idempotency-key": "idem-test-key-12345678" };
    const payload = { message: "same flood" };
    const r1 = await app.inject({
      method: "POST",
      url: "/api/v1/errors/client",
      headers,
      payload,
    });
    expect(r1.statusCode).toBe(202);
    expect(db.insertErrorLogRows).toHaveBeenCalledTimes(1);
    const r2 = await app.inject({
      method: "POST",
      url: "/api/v1/errors/client",
      headers,
      payload,
    });
    expect(r2.statusCode).toBe(202);
    expect(db.insertErrorLogRows).toHaveBeenCalledTimes(1);
  });
});
