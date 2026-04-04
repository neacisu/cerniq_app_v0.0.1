import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";
import { insert_tenant, insert_user, setSessionTenantId, TEST_PASSWORD_HASH } from "@cerniq/db";

/**
 * Contract smoke pentru rutele din `silver-gold.ts` folosite de UI E1 (liste Silver/Gold).
 * Client: `apps/web/src/lib/etapa1-api.ts` — `fetchSilverCompanies`, `fetchGoldCompanies`, etc.
 */
describe("Silver / Gold routes contract", () => {
  let app: FastifyInstance;
  let tenantId: string;
  let token: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const t = await insert_tenant(`sg-contract-${Date.now()}`, `sg-${Date.now()}`);
    tenantId = t.id;
    await setSessionTenantId(tenantId);

    const user = await insert_user(
      tenantId,
      `sg-user-${Date.now()}@example.com`,
      TEST_PASSWORD_HASH,
      "SG Contract",
      "admin",
      "active",
    );

    token = app.jwt.sign({
      id: user.id,
      userId: user.id,
      sub: user.id,
      tenantId,
      role: "admin",
      tokenType: "access",
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/silver/companies — 200 listă + meta", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/silver/companies?limit=10&offset=0",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      success: boolean;
      data: unknown[];
      meta?: { total: number; limit: number; offset: number };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.meta?.total).toBe("number");
  });

  it("GET /api/v1/silver/companies — 400 când limit > 100 (schema Zod)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/silver/companies?limit=200",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { success: boolean }).success).toBe(false);
  });

  it("GET /api/v1/gold/companies — 200 listă + meta", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/gold/companies?limit=5&offset=0",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      success: boolean;
      data: unknown[];
      meta?: { total: number };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.meta?.total).toBe("number");
  });

  it("GET /api/v1/silver/companies/:id — 404 UUID valid inexistent", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/silver/companies/00000000-0000-4000-8000-000000000001",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });
});
