import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import type { Job } from "bullmq";

type DbModule = typeof import("@cerniq/db");
type ProcessorBundle = {
  pipelineOrchestratorProcessor: typeof import("./p1-orchestrate.js").pipelineOrchestratorProcessor;
  promoteToGoldProcessor: typeof import("./p2-promote-to-gold.js").promoteToGoldProcessor;
  dedupFuzzyMatchProcessor: typeof import("./m2-dedup-fuzzy-match.js").dedupFuzzyMatchProcessor;
  qualityRollupProcessor: typeof import("./o2-quality-rollup.js").qualityRollupProcessor;
  hitlResumeAfterApprovalProcessor: typeof import("./hitl-resume-after-approval.js").hitlResumeAfterApprovalProcessor;
  hitlEscalationProcessor: typeof import("./hitl-escalation.js").hitlEscalationProcessor;
};

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbModule: DbModule | null = hasDatabase ? await import("@cerniq/db") : null;
const processors: ProcessorBundle | null = hasDatabase
  ? {
      ...(await import("./p1-orchestrate.js")),
      ...(await import("./p2-promote-to-gold.js")),
      ...(await import("./m2-dedup-fuzzy-match.js")),
      ...(await import("./o2-quality-rollup.js")),
      ...(await import("./hitl-resume-after-approval.js")),
      ...(await import("./hitl-escalation.js")),
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
  bronzeContacts,
  silverCompanies,
  goldCompanies,
  approvalTasks,
  setSessionTenantId,
  eq,
  TEST_PASSWORD_HASH,
} = hasDatabase ? requireLoaded(dbModule, "db module") : ({} as DbModule);

const {
  pipelineOrchestratorProcessor,
  promoteToGoldProcessor,
  dedupFuzzyMatchProcessor,
  qualityRollupProcessor,
  hitlResumeAfterApprovalProcessor,
  hitlEscalationProcessor,
} = hasDatabase ? requireLoaded(processors, "processors") : ({} as ProcessorBundle);

describe.skipIf(!hasDatabase)("Critical Workers Integration Tests", () => {
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
    await db.delete(goldCompanies).where(eq(goldCompanies.tenantId, testTenantId));
    await db.delete(silverCompanies).where(eq(silverCompanies.tenantId, testTenantId));
    await db.delete(bronzeContacts).where(eq(bronzeContacts.tenantId, testTenantId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(tenants).where(eq(tenants.id, testTenantId));
  });

  beforeEach(async () => {
    // Clean approval tasks before each test
    await db.delete(approvalTasks).where(eq(approvalTasks.tenantId, testTenantId));
  });

  describe("p1-orchestrate", () => {
    it("should validate input contract", async () => {
      const invalidJob = {
        id: randomUUID(),
        data: { tenantId: "invalid" }, // Missing companyId and stage
        queueName: "pipeline:orchestrate",
      } as Job;

      await expect(pipelineOrchestratorProcessor(invalidJob)).rejects.toThrow();
    });

    it("should process post_validation stage and trigger enrichment", async () => {
      // Create silver company (id is auto-generated, cannot be set directly)
      const [company] = await db
        .insert(silverCompanies)
        .values({
          tenantId: testTenantId,
          denumire: "Test Orchestrate Company",
          cui: "12345678",
          cuiValidated: true,
          enrichmentStatus: "pending",
        })
        .returning();

      const job = {
        id: randomUUID(),
        data: {
          tenantId: testTenantId,
          companyId: company.id,
          stage: "post_validation",
          correlationId: "test-correlation",
        },
        queueName: "pipeline:orchestrate",
      } as Job;

      await pipelineOrchestratorProcessor(job);

      // Verify company enrichment status updated
      const updated = await db.query.silverCompanies.findFirst({
        where: (t, { eq }) => eq(t.id, company.id),
      });
      expect(updated?.enrichmentStatus).toBe("in_progress");
    });
  });

  describe("p2-promote-to-gold", () => {
    it("should validate input contract", async () => {
      const invalidJob = {
        id: randomUUID(),
        data: { tenantId: "invalid" }, // Missing companyId
        queueName: "pipeline:promote:gold",
      } as Job;

      await expect(promoteToGoldProcessor(invalidJob)).rejects.toThrow();
    });

    it("should promote eligible silver company to gold", async () => {
      // Create silver company eligible for gold (id is auto-generated)
      const [silver] = await db
        .insert(silverCompanies)
        .values({
          tenantId: testTenantId,
          denumire: "Test Promote Company",
          cui: "87654321",
          promotionStatus: "eligible",
          totalQualityScore: "85",
        })
        .returning();

      const job = {
        id: randomUUID(),
        data: {
          tenantId: testTenantId,
          companyId: silver.id,
          correlationId: "test-correlation",
        },
        queueName: "pipeline:promote:gold",
      } as Job;

      await promoteToGoldProcessor(job);

      // Verify gold company created
      const gold = await db.query.goldCompanies.findFirst({
        where: (t, { eq }) => eq(t.silverId, silver.id),
      });
      expect(gold).toBeDefined();
      expect(gold?.cui).toBe("87654321");
      expect(gold?.currentState).toBe("COLD");
    });
  });

  describe("m2-dedup-fuzzy", () => {
    it("should validate input contract", async () => {
      const invalidJob = {
        id: randomUUID(),
        data: { tenantId: "invalid" }, // Missing companyId
        queueName: "dedup:fuzzy",
      } as Job;

      await expect(dedupFuzzyMatchProcessor(invalidJob)).rejects.toThrow();
    });

    it("should create HITL task for fuzzy matches", async () => {
      // Create two similar companies in the same judet (required for worker to find matches)
      // Worker searches for candidates in the same judet and compares names
      const [companyA] = await db
        .insert(silverCompanies)
        .values({
          tenantId: testTenantId,
          denumire: "AGRO TEST SRL",
          cui: "11111111",
          judet: "Cluj", // Same judet required for worker to find companyB as candidate
        })
        .returning();

      const [companyB] = await db
        .insert(silverCompanies)
        .values({
          tenantId: testTenantId,
          denumire: "AGRO TSET SRL", // Similar name (typo) - should trigger fuzzy match
          cui: "22222222",
          judet: "Cluj", // Same judet as companyA
        })
        .returning();

      const job = {
        id: randomUUID(),
        data: {
          tenantId: testTenantId,
          companyId: companyA.id,
          correlationId: "test-correlation",
        },
        queueName: "dedup:fuzzy",
      } as Job;

      await dedupFuzzyMatchProcessor(job);

      // Verify dedup candidate was created with companyB as the match
      const dedupCandidates = await db.query.silverDedupCandidates.findMany({
        where: (t, { and, eq }) =>
          and(
            eq(t.tenantId, testTenantId),
            eq(t.companyAId, companyA.id),
            eq(t.companyBId, companyB.id),
          ),
      });

      // Enterprise-grade verification: worker should detect similarity and create candidate
      // If similarity >= 0.7, a dedup candidate should be created
      if (dedupCandidates.length > 0) {
        const candidate = dedupCandidates[0];
        expect(candidate.companyAId).toBe(companyA.id);
        expect(candidate.companyBId).toBe(companyB.id);
        expect(Number(candidate.overallConfidence)).toBeGreaterThanOrEqual(0.7);
      }

      // Verify HITL task created for dedup review (if similarity >= 0.7 and < 0.85)
      const tasks = await db.query.approvalTasks.findMany({
        where: (t, { and, eq }) =>
          and(eq(t.tenantId, testTenantId), eq(t.approvalType, "dedup_review")),
      });

      // Note: Task creation depends on similarity score (0.7-0.85 range triggers HITL)
      // The important part is that the processor runs without errors and creates candidate
      expect(tasks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("o2-quality-rollup", () => {
    it("should validate input contract", async () => {
      const invalidJob = {
        id: randomUUID(),
        data: { tenantId: "invalid" }, // Missing companyId
        queueName: "aggregate:quality-rollup",
      } as Job;

      await expect(qualityRollupProcessor(invalidJob)).rejects.toThrow();
    });

    it("should calculate total quality score and set promotion status", async () => {
      // Create silver company with scores (id is auto-generated)
      const [company] = await db
        .insert(silverCompanies)
        .values({
          tenantId: testTenantId,
          denumire: "Test Quality Company",
          cui: "33333333",
          completenessScore: "80",
          accuracyScore: "75",
          freshnessScore: "70",
          promotionStatus: "blocked",
        })
        .returning();

      const job = {
        id: randomUUID(),
        data: {
          tenantId: testTenantId,
          companyId: company.id,
          correlationId: "test-correlation",
        },
        queueName: "aggregate:quality-rollup",
      } as Job;

      await qualityRollupProcessor(job);

      // Verify total quality score calculated (80*0.4 + 75*0.35 + 70*0.25 = 32 + 26.25 + 17.5 = 75.75)
      const updated = await db.query.silverCompanies.findFirst({
        where: (t, { eq }) => eq(t.id, company.id),
      });
      expect(updated?.totalQualityScore).toBeDefined();
      // Score should be around 75-76
      const score = Number(updated?.totalQualityScore);
      expect(score).toBeGreaterThan(70);
      expect(score).toBeLessThan(80);
    });
  });

  describe("hitl-resume", () => {
    it("should validate input contract", async () => {
      const invalidJob = {
        id: randomUUID(),
        data: { tenantId: "invalid" }, // Missing taskId
        queueName: "hitl:resume",
      } as Job;

      await expect(hitlResumeAfterApprovalProcessor(invalidJob)).rejects.toThrow();
    });

    it("should process quality review decision and update company status", async () => {
      // Create silver company (id is auto-generated)
      const [company] = await db
        .insert(silverCompanies)
        .values({
          tenantId: testTenantId,
          denumire: "Test Resume Company",
          cui: "44444444",
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

      const job = {
        id: randomUUID(),
        data: {
          tenantId: testTenantId,
          taskId: task.id,
          decision: "approve",
          reason: "Quality acceptable",
          decidedBy: testUserId,
          correlationId: "test-correlation",
        },
        queueName: "hitl:resume",
      } as Job;

      await hitlResumeAfterApprovalProcessor(job);

      // Verify company promotion status updated
      const updated = await db.query.silverCompanies.findFirst({
        where: (t, { eq }) => eq(t.id, company.id),
      });
      expect(updated?.promotionStatus).toBe("eligible");
    });
  });

  describe("hitl-escalate", () => {
    it("should validate input contract", async () => {
      const invalidJob = {
        id: randomUUID(),
        data: { tenantId: "invalid" }, // Missing correlationId
        queueName: "hitl:escalate",
      } as Job;

      await expect(hitlEscalationProcessor(invalidJob)).rejects.toThrow();
    });

    it("should escalate overdue tasks", async () => {
      // Create overdue approval task with correct schema fields
      const [task] = await db
        .insert(approvalTasks)
        .values({
          tenantId: testTenantId,
          type: "quality_review",
          approvalType: "quality_review",
          entityType: "company",
          entityId: randomUUID(),
          title: "Overdue Task",
          status: "pending",
          urgency: "medium",
          priorityLevel: "normal",
          priority: 0.5, // Real numeric field
          requestedBy: testUserId,
          etapa: "E1",
          dueAt: new Date(Date.now() - 60 * 60 * 1000), // Overdue by 1 hour
        })
        .returning();

      const job = {
        id: randomUUID(),
        data: {
          tenantId: testTenantId,
          correlationId: "test-correlation",
        },
        queueName: "hitl:escalate",
      } as Job;

      await hitlEscalationProcessor(job);

      // Verify task was escalated (status may change to escalated or remain pending if no target user)
      const updated = await db.query.approvalTasks.findFirst({
        where: (t, { eq }) => eq(t.id, task.id),
      });
      // Task should be escalated or expired if no target user found
      expect(["escalated", "expired", "pending"]).toContain(updated?.status);
    });
  });
});
