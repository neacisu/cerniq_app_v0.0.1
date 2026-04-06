import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";
import { insert_tenant, insert_user, setSessionTenantId, TEST_PASSWORD_HASH } from "@cerniq/db";

/**
 * Contract smoke pentru rutele din `imports-bronze.ts` folosite intens de UI E1.
 * Matrice UI ↔ HTTP: docs/e1-imports-ui-api-matrix.md
 */
describe("Imports / bronze routes contract", () => {
  let app: FastifyInstance;
  let tenantId: string;
  let viewerToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const t = await insert_tenant(`imp-brz-contract-${Date.now()}`, `imp-${Date.now()}`);
    tenantId = t.id;
    await setSessionTenantId(tenantId);

    const viewer = await insert_user(
      tenantId,
      `imp-view-${Date.now()}@example.com`,
      TEST_PASSWORD_HASH,
      "Imp Viewer",
      "viewer",
      "active",
    );

    viewerToken = app.jwt.sign({
      id: viewer.id,
      userId: viewer.id,
      sub: viewer.id,
      tenantId,
      role: "viewer",
      tokenType: "access",
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/imports — 200 listă + meta (autentificat)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/imports?limit=10&offset=0",
      headers: { authorization: `Bearer ${viewerToken}` },
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

  it("GET /api/v1/imports — 400 când limit depășește schema Zod (max 100)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/imports?limit=200",
      headers: { authorization: `Bearer ${viewerToken}` },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { success: boolean };
    expect(body.success).toBe(false);
  });

  it("GET /api/v1/imports/control — 200 stare control global", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/imports/control",
      headers: { authorization: `Bearer ${viewerToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: unknown };
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  it("GET /api/v1/bronze/contacts — 200 listă (poate fi goală)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/bronze/contacts?limit=5&offset=0",
      headers: { authorization: `Bearer ${viewerToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: unknown[]; meta?: { total: number } };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.meta?.total).toBe("number");
  });

  it("POST /api/v1/imports/control/pause — viewer primește 403 (necesită operator+)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/imports/control/pause",
      headers: { authorization: `Bearer ${viewerToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it("GET /api/v1/imports/mapping-targets — 200, date pentru mapare coloane", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/imports/mapping-targets",
      headers: { authorization: `Bearer ${viewerToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: unknown };
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  it("GET /api/v1/imports/template — 200, corp CSV (nu JSON)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/imports/template?format=csv",
      headers: { authorization: `Bearer ${viewerToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(String(res.headers["content-type"])).toMatch(/csv/i);
    expect(res.payload).toMatch(/denumire|cui|email/i);
  });

  it("GET /api/v1/imports/template/columns — 200, definiții coloane JSON", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/imports/template/columns",
      headers: { authorization: `Bearer ${viewerToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: { header: string }[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });
});
