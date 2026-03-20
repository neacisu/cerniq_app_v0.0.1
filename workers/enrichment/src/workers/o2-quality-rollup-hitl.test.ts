import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import type { Job } from "bullmq";

type DbModule = typeof import("@cerniq/db");
type ProcessorBundle = {
  qualityRollupProcessor: typeof import("./o2-quality-rollup.js").qualityRollupProcessor;
  hitlResumeAfterApprovalProcessor: typeof import("./hitl-resume-after-approval.js").hitlResumeAfterApprovalProcessor;
};

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbModule: DbModule | null = hasDatabase ? await import("@cerniq/db") : null;
const processors: ProcessorBundle | null = hasDatabase
  ? {
      ...(await import("./o2-quality-rollup.js")),
      ...(await import("./hitl-resume-after-approval.js")),
    }
  : null;

function requireLoaded<T>(value: T | null, name: string): T {
  if (!value) {
    throw new Error(`${name} unavailable without DATABASE_URL`);
  }
  return value;
}

const {
  db,
  tenants,
  users,
  silverCompanies,
  approvalTasks,
  setSessionTenantId,
  eq,
  TEST_PASSWORD_HASH,
} = hasDatabase ? requireLoaded(dbModule, "db module") : ({} as DbModule);

const { qualityRollupProcessor, hitlResumeAfterApprovalProcessor } = hasDatabase
  ? requireLoaded(processors, "processors")
  : ({} as ProcessorBundle);

describe.skipIf(!hasDatabase)("HITL Quality Review Integration Tests", () => {
  let testTenantId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test tenant with required slug field (enterprise-grade: all required fields)
    const tenantName = `test-tenant-${Date.now()}`;
    const tenantSlug = tenantName.toLowerCase().replaceAll(/\s+/g, "-").slice(0, 80);
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: tenantName,
        slug: tenantSlug,
        status: "active",
      })
      .returning();
    testTenantId = tenant.id;

    // Create test user with required name field and enterprise-grade test password hash
    const [user] = await db
      .insert(users)
      .values({
        tenantId: testTenantId,
        email: `test-${Date.now()}@example.com`,
        name: "Test User",
        passwordHash: TEST_PASSWORD_HASH,
        role: "admin",
        status: "active",
      })
      .returning();
    testUserId = user.id;

    await setSessionTenantId(testTenantId);
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(approvalTasks).where(eq(approvalTasks.tenantId, testTenantId));
    await db.delete(silverCompanies).where(eq(silverCompanies.tenantId, testTenantId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(tenants).where(eq(tenants.id, testTenantId));
  });

  beforeEach(async () => {
    // Clean approval tasks before each test
    await db.delete(approvalTasks).where(eq(approvalTasks.tenantId, testTenantId));
  });

  describe("Quality Review Trigger", () => {
    it("should create HITL task when promotionStatus is review_required", async () => {
      // Create silver company with scores that trigger review_required (id is auto-generated)
      const [company] = await db
        .insert(silverCompanies)
        .values({
          tenantId: testTenantId,
          denumire: "Test Company Review",
          cui: "12345678",
          completenessScore: "50",
          accuracyScore: "45",
          freshnessScore: "40",
          totalQualityScore: "45", // Between 40-70, should trigger review
          promotionStatus: "review_required",
        })
        .returning();

      // Run quality rollup processor
      const job = {
        id: randomUUID(),
        data: {
          tenantId: testTenantId,
          companyId: company.id,
        },
        queueName: "aggregate:quality-rollup",
      } as Job;

      await qualityRollupProcessor(job);

      // Verify HITL task was created
      const tasks = await db.query.approvalTasks.findMany({
        where: (t, { and, eq }) =>
          and(eq(t.tenantId, testTenantId), eq(t.approvalType, "quality_review")),
      });

      expect(tasks.length).toBeGreaterThan(0);
      const task = tasks[0];
      expect(task.entityType).toBe("company");
      expect(task.entityId).toBe(company.id);
      expect(task.status).toBe("pending");
      expect(task.approvalType).toBe("quality_review");
    });

    it("should NOT create HITL task when promotionStatus is eligible", async () => {
      // Create silver company with high scores (id is auto-generated)
      const [company] = await db
        .insert(silverCompanies)
        .values({
          tenantId: testTenantId,
          denumire: "Test Company Eligible",
          cui: "87654321",
          completenessScore: "90",
          accuracyScore: "85",
          freshnessScore: "80",
          totalQualityScore: "85", // Above 70, should be eligible
          promotionStatus: "eligible",
        })
        .returning();

      // Run quality rollup processor
      const job = {
        id: randomUUID(),
        data: {
          tenantId: testTenantId,
          companyId: company.id,
        },
        queueName: "aggregate:quality-rollup",
      } as Job;

      await qualityRollupProcessor(job);

      // Verify NO HITL task was created
      const tasks = await db.query.approvalTasks.findMany({
        where: (t, { and, eq }) =>
          and(eq(t.tenantId, testTenantId), eq(t.approvalType, "quality_review")),
      });

      expect(tasks.length).toBe(0);
    });
  });

  describe("Quality Review Resume Flow", () => {
    it("should promote to gold when quality review is approved", async () => {
      // Create silver company in review_required status (id is auto-generated)
      const [company] = await db
        .insert(silverCompanies)
        .values({
          tenantId: testTenantId,
          denumire: "Test Company Approve",
          cui: "11111111",
          promotionStatus: "review_required",
        })
        .returning();

      // Create approval task with correct schema fields
      // Schema requires: type, requestedBy, priorityLevel (enum), priority (real numeric)
      const [task] = await db
        .insert(approvalTasks)
        .values({
          tenantId: testTenantId,
          type: "quality_review",
          approvalType: "quality_review",
          entityType: "company",
          entityId: company.id,
          title: "Test Quality Review",
          status: "pending",
          urgency: "medium",
          priorityLevel: "normal",
          priority: 0.5, // Real numeric field
          requestedBy: testUserId,
          etapa: "E1",
          dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .returning();

      // Simulate approve decision
      const job = {
        id: randomUUID(),
        data: {
          tenantId: testTenantId,
          taskId: task.id,
          decision: "approve",
          reason: "Quality is acceptable",
          decidedBy: testUserId,
          correlationId: "test-correlation",
        },
        queueName: "hitl:resume",
      } as Job;

      await hitlResumeAfterApprovalProcessor(job);

      // Verify company promotionStatus changed to eligible
      const updated = await db.query.silverCompanies.findFirst({
        where: (t, { eq }) => eq(t.id, company.id),
      });

      expect(updated?.promotionStatus).toBe("eligible");

      // Verify task was updated
      const updatedTask = await db.query.approvalTasks.findFirst({
        where: (t, { eq }) => eq(t.id, task.id),
      });

      expect(updatedTask?.status).toBe("approved");
      expect(updatedTask?.decision).toBe("approve");
    });

    it("should block company when quality review is rejected", async () => {
      // Create silver company in review_required status (id is auto-generated)
      const [company] = await db
        .insert(silverCompanies)
        .values({
          tenantId: testTenantId,
          denumire: "Test Company Reject",
          cui: "22222222",
          promotionStatus: "review_required",
        })
        .returning();

      // Create approval task with correct schema fields
      const [task] = await db
        .insert(approvalTasks)
        .values({
          tenantId: testTenantId,
          type: "quality_review",
          approvalType: "quality_review",
          entityType: "company",
          entityId: company.id,
          title: "Test Quality Review",
          status: "pending",
          urgency: "medium",
          priorityLevel: "normal",
          priority: 0.5, // Real numeric field
          requestedBy: testUserId,
          etapa: "E1",
          dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .returning();

      // Simulate reject decision
      const job = {
        id: randomUUID(),
        data: {
          tenantId: testTenantId,
          taskId: task.id,
          decision: "reject",
          reason: "Quality is insufficient",
          decidedBy: testUserId,
          correlationId: "test-correlation",
        },
        queueName: "hitl:resume",
      } as Job;

      await hitlResumeAfterApprovalProcessor(job);

      // Verify company promotionStatus changed to blocked
      const updated = await db.query.silverCompanies.findFirst({
        where: (t, { eq }) => eq(t.id, company.id),
      });

      expect(updated?.promotionStatus).toBe("blocked");

      // Verify task was updated
      const updatedTask = await db.query.approvalTasks.findFirst({
        where: (t, { eq }) => eq(t.id, task.id),
      });

      expect(updatedTask?.status).toBe("rejected");
      expect(updatedTask?.decision).toBe("reject");
    });
  });
});
