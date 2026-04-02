import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";
import {
  bronzeImportBatches,
  db,
  tenants,
  users,
  silverCompanies,
  goldCompanies,
  approvalTasks,
  approvalService,
  importRuntimeSessions,
  jobLogs,
  eq,
  sql,
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

async function withTenantDbContext<T>(
  tenantId: string,
  userId: string,
  callback: (tx: typeof db) => Promise<T>,
) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      SELECT
        set_config('app.tenant_id', ${tenantId}, true),
        set_config('app.current_user_id', ${userId}, true)
    `);
    return callback(tx);
  });
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

  function withTestTenantDbContext<T>(callback: (tx: typeof db) => Promise<T>) {
    return withTenantDbContext(testTenantId, testUserId, callback);
  }

  async function createImportBatch(filenamePrefix = "job-logs-batch") {
    return withTestTenantDbContext(async (tx) => {
      const [batch] = await tx
        .insert(bronzeImportBatches)
        .values({
          tenantId: testTenantId,
          filename: `${filenamePrefix}-${Date.now()}-${randomUUID()}.csv`,
          fileSizeBytes: 1024,
          totalRows: 12,
          importedBy: testUserId,
        })
        .returning();
      return batch;
    });
  }

  afterAll(async () => {
    // Cleanup test data
    if (!testTenantId || !testUserId) {
      await app.close();
      return;
    }
    await setSessionRequestContext({ tenantId: testTenantId, userId: testUserId });
    await withTestTenantDbContext(async (tx) => {
      await tx.delete(jobLogs).where(eq(jobLogs.tenantId, testTenantId));
      await tx
        .delete(importRuntimeSessions)
        .where(eq(importRuntimeSessions.tenantId, testTenantId));
      await tx.delete(bronzeImportBatches).where(eq(bronzeImportBatches.tenantId, testTenantId));
      await tx.delete(approvalTasks).where(eq(approvalTasks.tenantId, testTenantId));
      await tx.delete(goldCompanies).where(eq(goldCompanies.tenantId, testTenantId));
      await tx.delete(silverCompanies).where(eq(silverCompanies.tenantId, testTenantId));
    });
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
      await withTestTenantDbContext(async (tx) => {
        await tx.insert(silverCompanies).values({
          tenantId: testTenantId,
          denumire: "Tenant Isolation Company",
          cui: "87651234",
          promotionStatus: "eligible",
        });
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

  describe("GET /api/v1/imports/:id/job-logs", () => {
    it("uses the latest runtime session by default when sessionId is omitted", async () => {
      const batch = await createImportBatch("default-session");
      const olderUpdatedAt = new Date("2026-03-30T10:00:00.000Z");
      const newerUpdatedAt = new Date("2026-03-30T10:05:00.000Z");

      const { newerSession } = await withTestTenantDbContext(async (tx) => {
        const [olderSession] = await tx
          .insert(importRuntimeSessions)
          .values({
            tenantId: testTenantId,
            batchId: batch.id,
            kind: "ingest",
            status: "completed",
            startedAt: olderUpdatedAt,
            updatedAt: olderUpdatedAt,
          })
          .returning();

        const [newerSession] = await tx
          .insert(importRuntimeSessions)
          .values({
            tenantId: testTenantId,
            batchId: batch.id,
            kind: "retry",
            status: "running",
            startedAt: newerUpdatedAt,
            updatedAt: newerUpdatedAt,
          })
          .returning();

        await tx.insert(jobLogs).values([
          {
            tenantId: testTenantId,
            batchId: batch.id,
            sessionId: olderSession.id,
            workerName: "worker-older",
            level: "info",
            step: "older",
            message: "older-session-log",
          },
          {
            tenantId: testTenantId,
            batchId: batch.id,
            sessionId: newerSession.id,
            workerName: "worker-newer",
            level: "info",
            step: "newer",
            message: "newer-session-log",
          },
        ]);

        return { newerSession };
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/imports/${batch.id}/job-logs`,
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": testTenantId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.meta.total).toBe(1);
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toMatchObject({
        sessionId: newerSession.id,
        workerName: "worker-newer",
        message: "newer-session-log",
      });
    });

    it("includes legacy rows when includeLegacy=true and maps debug rows to step", async () => {
      const batch = await createImportBatch("include-legacy");
      const sessionTimestamp = new Date("2026-03-30T11:00:00.000Z");

      const session = await withTestTenantDbContext(async (tx) => {
        const [session] = await tx
          .insert(importRuntimeSessions)
          .values({
            tenantId: testTenantId,
            batchId: batch.id,
            kind: "ingest",
            status: "running",
            startedAt: sessionTimestamp,
            updatedAt: sessionTimestamp,
          })
          .returning();

        await tx.insert(jobLogs).values([
          {
            tenantId: testTenantId,
            batchId: batch.id,
            sessionId: session.id,
            workerName: "worker-session",
            level: "debug",
            step: "hydrate",
            message: "session-debug-log",
            context: { durationMs: 101.6 },
          },
          {
            tenantId: testTenantId,
            batchId: batch.id,
            workerName: "worker-legacy",
            level: "info",
            step: "legacy",
            message: "legacy-log",
          },
        ]);

        return session;
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/imports/${batch.id}/job-logs?includeLegacy=true`,
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": testTenantId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.meta.total).toBe(2);
      expect(body.data).toHaveLength(2);

      const sessionRow = body.data.find(
        (row: { sessionId: string | null }) => row.sessionId === session.id,
      );
      const legacyRow = body.data.find(
        (row: { sessionId: string | null }) => row.sessionId === null,
      );

      expect(sessionRow).toMatchObject({
        workerName: "worker-session",
        level: "step",
        message: "session-debug-log",
        durationMs: 102,
      });
      expect(legacyRow).toMatchObject({
        workerName: "worker-legacy",
        level: "info",
        message: "legacy-log",
      });
    });

    it("honors explicit sessionId and level=step filters", async () => {
      const batch = await createImportBatch("explicit-session");
      const firstUpdatedAt = new Date("2026-03-30T12:00:00.000Z");
      const secondUpdatedAt = new Date("2026-03-30T12:05:00.000Z");

      const { firstSession } = await withTestTenantDbContext(async (tx) => {
        const [firstSession] = await tx
          .insert(importRuntimeSessions)
          .values({
            tenantId: testTenantId,
            batchId: batch.id,
            kind: "ingest",
            status: "running",
            startedAt: firstUpdatedAt,
            updatedAt: firstUpdatedAt,
          })
          .returning();

        const [secondSession] = await tx
          .insert(importRuntimeSessions)
          .values({
            tenantId: testTenantId,
            batchId: batch.id,
            kind: "retry",
            status: "running",
            startedAt: secondUpdatedAt,
            updatedAt: secondUpdatedAt,
          })
          .returning();

        await tx.insert(jobLogs).values([
          {
            tenantId: testTenantId,
            batchId: batch.id,
            sessionId: firstSession.id,
            workerName: "worker-first",
            level: "debug",
            step: "first-step",
            message: "first-debug-log",
          },
          {
            tenantId: testTenantId,
            batchId: batch.id,
            sessionId: firstSession.id,
            workerName: "worker-first",
            level: "info",
            step: "first-info",
            message: "first-info-log",
          },
          {
            tenantId: testTenantId,
            batchId: batch.id,
            sessionId: secondSession.id,
            workerName: "worker-second",
            level: "debug",
            step: "second-step",
            message: "second-debug-log",
          },
        ]);

        return { firstSession, secondSession };
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/imports/${batch.id}/job-logs?sessionId=${firstSession.id}&level=step`,
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-ID": testTenantId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.meta.total).toBe(1);
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toMatchObject({
        sessionId: firstSession.id,
        workerName: "worker-first",
        level: "step",
        message: "first-debug-log",
      });
    });
  });

  describe("GET /api/v1/silver/companies", () => {
    it("should list silver companies with filters", async () => {
      // Create test silver company
      await withTestTenantDbContext(async (tx) => {
        await tx.insert(silverCompanies).values({
          tenantId: testTenantId,
          denumire: "Test Silver Company",
          cui: "87654321",
          promotionStatus: "eligible",
        });
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
      await withTestTenantDbContext(async (tx) => {
        const [silver] = await tx
          .insert(silverCompanies)
          .values({
            tenantId: testTenantId,
            denumire: "Test Gold Source",
            cui: "11223344",
          })
          .returning();

        // Create test gold company
        await tx.insert(goldCompanies).values({
          tenantId: testTenantId,
          silverId: silver.id,
          bronzeIds: [],
          cui: "11223344",
          denumire: "Test Gold Source",
          currentState: "COLD",
        });
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
