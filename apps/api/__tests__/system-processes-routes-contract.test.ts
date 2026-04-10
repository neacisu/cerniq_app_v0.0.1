/**
 * Contract + auth pentru GET /api/v1/system/processes.
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

let app: FastifyInstance;
let testTenantId: string;
let testUserId: string;
let authToken: string;

function buildSlug(name: string) {
  return name.toLowerCase().replaceAll(/\s+/g, "-").slice(0, 80);
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();

  const tenantName = `test-sys-proc-${Date.now()}`;
  const tenant = await insert_tenant(tenantName, buildSlug(tenantName));
  testTenantId = tenant.id;
  await setSessionTenantId(testTenantId);

  const u = await insert_user(
    testTenantId,
    `test-sys-proc-${Date.now()}@example.com`,
    TEST_PASSWORD_HASH,
    "Sys Proc",
    "admin",
    "active",
  );
  testUserId = u.id;
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

describe("system processes API — contract", () => {
  it("GET /api/v1/system/processes returnează 401 fără JWT", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/system/processes" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /api/v1/system/processes — 200 cu structură (tenant gol)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/system/processes",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      success?: boolean;
      data?: { processes?: unknown[]; activeCount?: number; queuesReachable?: boolean };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data?.processes)).toBe(true);
    expect(typeof body.data?.activeCount).toBe("number");
    expect(typeof body.data?.queuesReachable).toBe("boolean");
  });
});
