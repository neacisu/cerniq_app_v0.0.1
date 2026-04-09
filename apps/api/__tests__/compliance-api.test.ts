/**
 * Integrare API — rute compliance AI (`/api/v1/ai/decisions/...`) din `routes/compliance.ts`.
 * GDPR produs/referral sunt acoperite în `compliance-product-gdpr-consent-api.test.ts`.
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

const NONEXISTENT_COMPANY_UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

let app: FastifyInstance;
let testTenantId: string;
let testUserId: string;
let authToken: string;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();

  const tenantName = `test-compliance-ai-${Date.now()}`;
  const tenant = await insert_tenant(tenantName, buildSlug(tenantName));
  testTenantId = tenant.id;
  await setSessionTenantId(testTenantId);

  const adminUser = await insert_user(
    testTenantId,
    `test-compliance-ai-${Date.now()}@example.com`,
    TEST_PASSWORD_HASH,
    "Admin Compliance AI",
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

describe("Compliance AI — /api/v1/ai/decisions", () => {
  it("GET .../explanation cu UUID inexistent returnează 404", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/ai/decisions/${NONEXISTENT_COMPANY_UUID}/explanation`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it("GET .../explanation cu id invalid returnează 400", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/ai/decisions/not-a-uuid/explanation",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { error?: string };
    expect(body.error).toBe("INVALID_ID");
  });
});
