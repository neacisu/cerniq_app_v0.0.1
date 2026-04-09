/**
 * Integrare API — rute cognitive brain (`/api/v1/brain/*`).
 * Pattern aliniat cu etapa3-e5: buildApp + tenant + JWT admin.
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

beforeAll(async () => {
  app = await buildApp();
  await app.ready();

  const tenantName = `test-brain-api-${Date.now()}`;
  const tenant = await insert_tenant(tenantName, buildSlug(tenantName));
  testTenantId = tenant.id;
  await setSessionTenantId(testTenantId);

  const adminUser = await insert_user(
    testTenantId,
    `test-brain-admin-${Date.now()}@example.com`,
    TEST_PASSWORD_HASH,
    "Admin Brain API",
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

describe("Cognitive brain API — /api/v1/brain", () => {
  it("GET /catalog returnează catalog static + statistici", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/brain/catalog",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      success?: boolean;
      data?: { stats?: { total?: number } };
    };
    expect(body.success).toBe(true);
    expect(body.data?.stats?.total).toBeGreaterThan(0);
  });

  it("GET /topology fără batchId folosește catalog (fără eroare 400)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/brain/topology",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success?: boolean };
    expect(body.success).toBe(true);
  });
});
