/**
 * Matrice body invalid → răspuns de validare predictibil (handler-e cu .parse() pe Zod
 * trec prin errorHandler: ZodError → 422 + details.issues).
 *
 * Nu asertăm textul liber al mesajului — doar status + success: false + structură details.
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

const NONEXISTENT_PRODUCT_UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

function buildSlug(name: string): string {
  return name.toLowerCase().replaceAll(/\s+/g, "-").slice(0, 80);
}

function expectValidationFailure(res: { statusCode: number; body: string }): void {
  expect([400, 422]).toContain(res.statusCode);
  const b = JSON.parse(res.body) as {
    success: boolean;
    details?: { issues?: unknown[]; validation?: unknown; code?: string };
  };
  expect(b.success).toBe(false);
  if (res.statusCode === 422) {
    expect(Array.isArray(b.details?.issues)).toBe(true);
  } else {
    expect(b.details?.validation ?? b.details?.issues).toBeDefined();
  }
}

describe("Zod — matrice POST/PATCH (E3–E5 + outreach)", () => {
  let app: FastifyInstance;
  let testTenantId: string;
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const tenantName = `test-zod-matrix-${Date.now()}`;
    const tenant = await insert_tenant(tenantName, buildSlug(tenantName));
    testTenantId = tenant.id;
    await setSessionTenantId(testTenantId);

    const adminUser = await insert_user(
      testTenantId,
      `zod-matrix-${Date.now()}@example.com`,
      TEST_PASSWORD_HASH,
      "Zod Matrix",
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

  const jsonHeaders = (token: string) => ({
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  });

  it("POST /api/v1/products — body {} → validare eșuată", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/products",
      headers: jsonHeaders(authToken),
      payload: JSON.stringify({}),
    });
    expectValidationFailure(res);
  });

  it("PATCH /api/v1/products/:id — body {} (refine) → validare eșuată", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/products/${NONEXISTENT_PRODUCT_UUID}`,
      headers: jsonHeaders(authToken),
      payload: JSON.stringify({}),
    });
    expectValidationFailure(res);
  });

  it("POST /api/v1/negotiations — body {} → validare eșuată", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/negotiations",
      headers: jsonHeaders(authToken),
      payload: JSON.stringify({}),
    });
    expectValidationFailure(res);
  });

  it("PATCH /api/v1/negotiations/:id — body {} (refine) → validare eșuată", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/negotiations/${NONEXISTENT_PRODUCT_UUID}`,
      headers: jsonHeaders(authToken),
      payload: JSON.stringify({}),
    });
    expectValidationFailure(res);
  });

  it("POST /api/v1/orders — body {} → validare eșuată", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: jsonHeaders(authToken),
      payload: JSON.stringify({}),
    });
    expectValidationFailure(res);
  });

  it("POST /api/v1/nurturing/drips — body {} → validare eșuată", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/nurturing/drips",
      headers: jsonHeaders(authToken),
      payload: JSON.stringify({}),
    });
    expectValidationFailure(res);
  });

  it("POST /api/v1/referrals — body {} → validare eșuată", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/referrals",
      headers: jsonHeaders(authToken),
      payload: JSON.stringify({}),
    });
    expectValidationFailure(res);
  });

  it("POST /api/v1/outreach/leads — body {} → validare eșuată", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/outreach/leads",
      headers: jsonHeaders(authToken),
      payload: JSON.stringify({}),
    });
    expectValidationFailure(res);
  });
});
