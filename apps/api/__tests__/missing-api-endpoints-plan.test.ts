/**
 * Plan `missing-api-endpoints` — contract + auth pentru rute noi (E3 SSE/ai, E4 postsale, E5 nurturing alias).
 * SSE complet (după hijack) nu e acoperit aici — același motiv ca în cognitive-brain-api (inject).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";
import {
  db,
  tenants,
  users,
  eq,
  TEST_PASSWORD_HASH,
  insert_tenant,
  insert_user,
  setSessionRequestContext,
  setSessionTenantId,
} from "@cerniq/db";

function buildSlug(name: string) {
  return name.toLowerCase().replaceAll(/\s+/g, "-").slice(0, 80);
}

let app: FastifyInstance;
let testTenantId: string;
let testUserId: string;
let authToken: string;

const SAMPLE_UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

beforeAll(async () => {
  app = await buildApp();
  await app.ready();

  const tenantName = `test-missing-endpoints-${Date.now()}`;
  const tenant = await insert_tenant(tenantName, buildSlug(tenantName));
  testTenantId = tenant.id;
  await setSessionTenantId(testTenantId);

  const adminUser = await insert_user(
    testTenantId,
    `test-missing-api-${Date.now()}@example.com`,
    TEST_PASSWORD_HASH,
    "Admin Missing API",
    "admin",
    "active",
  );
  testUserId = adminUser.id;
  await setSessionRequestContext({ tenantId: testTenantId, userId: testUserId });

  authToken = app.jwt.sign({
    id: testUserId,
    userId: testUserId,
    sub: testUserId,
    tenantId: testTenantId,
    role: "admin",
    tokenType: "access",
  });
});

beforeEach(async () => {
  await setSessionRequestContext({ tenantId: testTenantId, userId: testUserId });
});

afterAll(async () => {
  if (!testTenantId) {
    await app?.close();
    return;
  }
  await setSessionRequestContext({ tenantId: testTenantId, userId: testUserId });
  await db.delete(users).where(eq(users.tenantId, testTenantId));
  await db.delete(tenants).where(eq(tenants.id, testTenantId));
  await app.close();
});

describe("missing-api-endpoints — SSE import logs (pre-hijack)", () => {
  it("GET /imports/:id/logs/stream — 401 fără JWT", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/imports/${SAMPLE_UUID}/logs/stream`,
    });
    expect(res.statusCode).toBe(401);
  });

  it("GET /imports/:id/logs/stream — 400 pentru importId invalid", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/imports/not-a-uuid/logs/stream",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { error?: string };
    expect(body.error).toBeDefined();
  });

  it("GET /imports/:id/logs/stream — 404 batch inexistent (tenant gol)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/imports/${SAMPLE_UUID}/logs/stream`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("missing-api-endpoints — /api/v1/ai (guardrails, audit, search, consensus)", () => {
  it("GET /ai/guardrails/status — 200 structură", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/ai/guardrails/status",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      success?: boolean;
      data?: { by_violation_type?: unknown[]; by_severity?: unknown[] };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data?.by_violation_type)).toBe(true);
    expect(Array.isArray(body.data?.by_severity)).toBe(true);
  });

  it("GET /ai/audit-log — 200, limit default", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/ai/audit-log",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success?: boolean; data?: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("POST /ai/products/search — 200 enqueue (același contract ca /products/search)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/ai/products/search",
      headers: {
        authorization: `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      payload: JSON.stringify({ q: "test query", limit: 5 }),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      success?: boolean;
      data?: { jobId?: string; status?: string };
      meta?: { aliasOf?: string };
    };
    expect(body.success).toBe(true);
    expect(body.data?.status).toBe("PROCESSING");
    expect(body.meta?.aliasOf).toContain("products/search");
  });

  it("GET /ai/consensus/votes — 200 listă (poate fi goală)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/ai/consensus/votes",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success?: boolean; data?: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("GET /ai/guardrails/status — 401 fără auth", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/ai/guardrails/status" });
    expect(res.statusCode).toBe(401);
  });
});

describe("missing-api-endpoints — /api/v1/postsale", () => {
  it("GET /postsale/payments/:id — 404 fără plată", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/postsale/payments/${SAMPLE_UUID}`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it("GET /postsale/credit-scores/:companyId — 404 fără profil credit", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/postsale/credit-scores/${SAMPLE_UUID}`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("missing-api-endpoints — /api/v1/nurturing alias", () => {
  it("GET /nurturing/churn-risks?threshold=70 — 200", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/nurturing/churn-risks?threshold=70",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      success?: boolean;
      data?: unknown[];
      meta?: { threshold?: number };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta?.threshold).toBe(70);
  });

  it("GET /nurturing/referrals — 200 (listă goală tenant nou)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/nurturing/referrals",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success?: boolean; data?: unknown[]; meta?: unknown };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta).toMatchObject({ aliasOf: "GET /api/v1/referrals" });
  });
});
