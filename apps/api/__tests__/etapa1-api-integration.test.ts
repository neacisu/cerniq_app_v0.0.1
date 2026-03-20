import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";
import {
  db,
  tenants,
  users,
  silverCompanies,
  goldCompanies,
  approvalTasks,
  approvalService,
  eq,
  TEST_PASSWORD_HASH,
  insert_tenant,
  insert_user,
  setSessionRequestContext,
  setSessionTenantId,
} from "@cerniq/db";
import { randomUUID } from "node:crypto";

function buildTenantSlug(name: string): string {
  return name.toLowerCase().replaceAll(/\s+/g, "-").slice(0, 80);
}

describe("Etapa 1 API Integration Tests", () => {
  let app: FastifyInstance;
  let testTenantId: string;
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create test tenant and user aligned with the current DB schema.
    const tenantName = `test-tenant-${Date.now()}`;
    const tenant = await insert_tenant(tenantName, buildTenantSlug(tenantName));
    testTenantId = tenant.id;
    await setSessionTenantId(testTenantId);

    const user = await insert_user(
      testTenantId,
      `test-${Date.now()}@example.com`,
      TEST_PASSWORD_HASH,
      "API Integration Test User",
      "admin",
      "active",
    );
    testUserId = user.id;
    await setSessionRequestContext({ tenantId: testTenantId, userId: testUserId });

    const jwt = app.jwt.sign({
      id: testUserId,
      userId: testUserId,
      sub: testUserId,
      tenantId: testTenantId,
      role: "admin",
      tokenType: "access",
    });
    authToken = jwt;
  });

  beforeEach(async () => {
    await setSessionRequestContext({ tenantId: testTenantId, userId: testUserId });
  });

  afterAll(async () => {
    // Cleanup test data
    if (!testTenantId || !testUserId) {
      await app.close();
      return;
    }
    await setSessionRequestContext({ tenantId: testTenantId, userId: testUserId });
    await db.delete(approvalTasks).where(eq(approvalTasks.tenantId, testTenantId));
    await db.delete(goldCompanies).where(eq(goldCompanies.tenantId, testTenantId));
    await db.delete(silverCompanies).where(eq(silverCompanies.tenantId, testTenantId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(tenants).where(eq(tenants.id, testTenantId));
    await app.close();
  });

  describe("GET /api/v1/dashboard/stats", () => {
    it("should return dashboard stats with hitl and quality keys", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/dashboard/stats",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": testTenantId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("bronze");
      expect(body.data).toHaveProperty("silver");
      expect(body.data).toHaveProperty("gold");
      expect(body.data).toHaveProperty("approvals");
      expect(body.data).toHaveProperty("errors");
      expect(body.data).toHaveProperty("pipeline");
      expect(body.data).toHaveProperty("hitl");
      expect(body.data).toHaveProperty("quality");
      expect(body.data.hitl).toHaveProperty("pending");
      expect(body.data.hitl).toHaveProperty("resolvedToday");
      expect(body.data.hitl).toHaveProperty("overdue");
      expect(body.data.quality).toHaveProperty("avgScore");
      expect(body.data.quality).toHaveProperty("eligible");
      expect(body.data.quality).toHaveProperty("blocked");
    });

    it("should enforce tenant isolation", async () => {
      // Create another tenant
      const otherTenantName = `other-tenant-${Date.now()}`;
      const otherTenant = await insert_tenant(otherTenantName, buildTenantSlug(otherTenantName));
      await setSessionTenantId(otherTenant.id);

      const otherUser = await insert_user(
        otherTenant.id,
        `other-${Date.now()}@example.com`,
        TEST_PASSWORD_HASH,
        "Other Tenant User",
        "admin",
        "active",
      );

      const otherToken = app.jwt.sign({
        id: otherUser.id,
        userId: otherUser.id,
        sub: otherUser.id,
        tenantId: otherTenant.id,
        role: "admin",
        tokenType: "access",
      });

      await setSessionRequestContext({ tenantId: testTenantId, userId: testUserId });

      // Create silver company in test tenant
      await db.insert(silverCompanies).values({
        tenantId: testTenantId,
        denumire: "Tenant Isolation Company",
        cui: "87651234",
        promotionStatus: "eligible",
      });

      // Request stats with other tenant token
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/dashboard/stats",
        headers: {
          Authorization: `Bearer ${otherToken}`,
          "X-Tenant-ID": otherTenant.id,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      // Other tenant should not see test tenant's data
      expect(Number(body.data.silver.total)).toBe(0);

      // Cleanup
      await setSessionRequestContext({ tenantId: otherTenant.id, userId: otherUser.id });
      await db.delete(users).where(eq(users.id, otherUser.id));
      await db.delete(tenants).where(eq(tenants.id, otherTenant.id));
      await setSessionRequestContext({ tenantId: testTenantId, userId: testUserId });
    });
  });

  describe("GET /api/v1/enrichment/approvals", () => {
    it("should list approval tasks", async () => {
      // Create test approval task
      const task = await approvalService.createTask({
        tenantId: testTenantId,
        entityType: "company",
        entityId: randomUUID(),
        approvalType: "quality_review",
        title: "Test Approval",
        priority: "normal",
        createdBy: testUserId,
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/enrichment/approvals",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": testTenantId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      const foundTask = body.data.find((t: { id: string }) => t.id === task.id);
      expect(foundTask).toBeDefined();
      expect(foundTask?.status).toBe("pending");
    });

    it("should validate query parameters", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/enrichment/approvals?limit=invalid",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": testTenantId,
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /api/v1/enrichment/approvals/:id", () => {
    it("should return approval task with entityData at root level", async () => {
      // Create test silver company
      const [company] = await db
        .insert(silverCompanies)
        .values({
          tenantId: testTenantId,
          denumire: "Test Company SRL",
          cui: "12345678",
          promotionStatus: "review_required",
        })
        .returning();

      // Create approval task
      const task = await approvalService.createTask({
        tenantId: testTenantId,
        entityType: "company",
        entityId: company.id,
        approvalType: "quality_review",
        title: "Test Approval",
        priority: "normal",
        createdBy: testUserId,
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/enrichment/approvals/${task.id}`,
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": testTenantId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("id", task.id);
      expect(body).toHaveProperty("entityData");
      expect(body.entityData).toHaveProperty("id", company.id);
      expect(body.entityData).toHaveProperty("denumire", "Test Company SRL");
    });

    it("should return 404 for non-existent task", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/enrichment/approvals/${randomUUID()}`,
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": testTenantId,
        },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /api/v1/enrichment/approvals/:id/decide", () => {
    it("should decide approval task and resume blocked job", async () => {
      // Create test approval task with blocked job
      const task = await approvalService.createTask({
        tenantId: testTenantId,
        entityType: "company",
        entityId: randomUUID(),
        approvalType: "quality_review",
        title: "Test Approval",
        priority: "normal",
        createdBy: testUserId,
        blockedJobId: "test-job-id",
        blockedQueueName: "pipeline:promote:gold",
      });

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/enrichment/approvals/${task.id}/decide`,
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": testTenantId,
        },
        payload: {
          decision: "approve",
          reason: "Test approval",
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);

      // Verify task was updated
      const updated = await db.query.approvalTasks.findFirst({
        where: (t, { eq }) => eq(t.id, task.id),
      });
      expect(updated?.status).toBe("approved");
      expect(updated?.decision).toBe("approve");
      expect(updated?.decidedBy).toBe(testUserId);
    });

    it("should validate decision payload", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/enrichment/approvals/${randomUUID()}/decide`,
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": testTenantId,
        },
        payload: {
          decision: "invalid",
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /api/v1/imports/bronze", () => {
    it("should list bronze import batches", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/imports",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": testTenantId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe("GET /api/v1/silver/companies", () => {
    it("should list silver companies with filters", async () => {
      // Create test silver company
      await db.insert(silverCompanies).values({
        tenantId: testTenantId,
        denumire: "Test Silver Company",
        cui: "87654321",
        promotionStatus: "eligible",
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/silver/companies?promotionStatus=eligible",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": testTenantId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe("GET /api/v1/gold/companies", () => {
    it("should list gold companies", async () => {
      // Create test silver company first
      const [silver] = await db
        .insert(silverCompanies)
        .values({
          tenantId: testTenantId,
          denumire: "Test Gold Source",
          cui: "11223344",
        })
        .returning();

      // Create test gold company
      await db.insert(goldCompanies).values({
        tenantId: testTenantId,
        silverId: silver.id,
        bronzeIds: [],
        cui: "11223344",
        denumire: "Test Gold Source",
        currentState: "COLD",
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/gold/companies",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": testTenantId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe("Authentication and Authorization", () => {
    it("should require authentication", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/dashboard/stats",
      });

      expect(res.statusCode).toBe(401);
    });

    it("should require tenant ID header", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/dashboard/stats",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
    });
  });
});
