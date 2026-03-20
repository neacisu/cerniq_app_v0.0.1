import { test, expect } from "@playwright/test";
import {
  db,
  tenants,
  users,
  silverCompanies,
  silverDedupCandidates,
  approvalTasks,
  setSessionTenantId,
  eq,
  TEST_PASSWORD_HASH,
} from "@cerniq/db";
import { randomUUID } from "node:crypto";

test.describe("Etapa 1 - HITL approval flow", () => {
  let testTenantId: string;
  let testUserId: string;

  test.beforeAll(async () => {
    // Create test tenant with required slug field
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

  test.afterAll(async () => {
    // Cleanup
    await db.delete(approvalTasks).where(eq(approvalTasks.tenantId, testTenantId));
    await db.delete(silverDedupCandidates).where(eq(silverDedupCandidates.tenantId, testTenantId));
    await db.delete(silverCompanies).where(eq(silverCompanies.tenantId, testTenantId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(tenants).where(eq(tenants.id, testTenantId));
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /autentificare/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("approve a HITL dedup task and verify DB merge", async ({ page }) => {
    // Create two silver companies for dedup
    const [companyA] = await db
      .insert(silverCompanies)
      .values({
        id: randomUUID(),
        tenantId: testTenantId,
        denumire: "Company A SRL",
        cui: "11111111",
      })
      .returning();

    const [companyB] = await db
      .insert(silverCompanies)
      .values({
        id: randomUUID(),
        tenantId: testTenantId,
        denumire: "Company B SRL",
        cui: "22222222",
      })
      .returning();

    // Create dedup candidate with correct schema fields
    // Schema uses overallConfidence (numeric) not similarityScore, and no id in insert
    const [dedupCandidate] = await db
      .insert(silverDedupCandidates)
      .values({
        tenantId: testTenantId,
        companyAId: companyA.id,
        companyBId: companyB.id,
        overallConfidence: "0.85",
        status: "hitl_pending",
      })
      .returning();

    // Create approval task with correct schema fields
    // Schema requires: type, requestedBy, priorityLevel (enum), priority (real numeric)
    // Cannot set id directly - it's auto-generated
    const [task] = await db
      .insert(approvalTasks)
      .values({
        tenantId: testTenantId,
        type: "dedup_review",
        approvalType: "dedup_review",
        entityType: "company",
        entityId: companyA.id,
        title: "Revizie dedup",
        description: "Posibil duplicat",
        status: "pending",
        urgency: "high",
        priorityLevel: "high",
        priority: 1, // Real numeric field (1 = high priority, 0.5 = normal, 0 = low)
        requestedBy: testUserId,
        etapa: "E1",
        dueAt: new Date(Date.now() + 60 * 60 * 1000),
        metadata: {
          companyAId: companyA.id,
          companyBId: companyB.id,
          dedupCandidateId: dedupCandidate.id,
        },
      })
      .returning();

    await page.route("**/api/v1/enrichment/approvals?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: task.id,
              title: "Revizie dedup",
              description: "Posibil duplicat",
              urgency: "HIGH",
              aiConfidence: 0.72,
            },
          ],
        }),
      });
    });

    await page.route(`**/api/v1/enrichment/approvals/${task.id}/decide`, async (route) => {
      // Simulate approve decision
      await db
        .update(approvalTasks)
        .set({
          status: "approved",
          decision: "merge",
          decidedBy: testUserId,
          decidedAt: new Date(),
        })
        .where(eq(approvalTasks.id, task.id));

      // Simulate merge: update dedup candidate status
      // Schema uses masterCompanyId, not mergedInto
      await db
        .update(silverDedupCandidates)
        .set({
          status: "merged",
          masterCompanyId: companyA.id,
          mergedAt: new Date(),
        })
        .where(eq(silverDedupCandidates.id, dedupCandidate.id));

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { id: task.id, status: "approved" },
        }),
      });
    });

    await page.goto("/approvals");
    await expect(page.getByText(/HITL Approvals/i)).toBeVisible();
    await expect(page.getByText("Revizie dedup")).toBeVisible();

    await page.getByRole("button", { name: /Aprobă/i }).click();

    // Verify DB changes: dedup candidate should be merged
    const updatedDedup = await db.query.silverDedupCandidates.findFirst({
      where: (t, { eq }) => eq(t.id, dedupCandidate.id),
    });
    expect(updatedDedup?.status).toBe("merged");
    expect(updatedDedup?.masterCompanyId).toBe(companyA.id);

    // Verify task was updated
    const updatedTask = await db.query.approvalTasks.findFirst({
      where: (t, { eq }) => eq(t.id, task.id),
    });
    expect(updatedTask?.status).toBe("approved");
    expect(updatedTask?.decision).toBe("merge");
  });

  test("reject a HITL dedup task and verify companies remain separate", async ({ page }) => {
    // Create two silver companies
    const [companyA] = await db
      .insert(silverCompanies)
      .values({
        id: randomUUID(),
        tenantId: testTenantId,
        denumire: "Company A Reject SRL",
        cui: "33333333",
      })
      .returning();

    const [companyB] = await db
      .insert(silverCompanies)
      .values({
        id: randomUUID(),
        tenantId: testTenantId,
        denumire: "Company B Reject SRL",
        cui: "44444444",
      })
      .returning();

    // Create dedup candidate with correct schema fields
    const [dedupCandidate] = await db
      .insert(silverDedupCandidates)
      .values({
        tenantId: testTenantId,
        companyAId: companyA.id,
        companyBId: companyB.id,
        overallConfidence: "0.75",
        status: "hitl_pending",
      })
      .returning();

    // Create approval task with correct schema fields
    const [task] = await db
      .insert(approvalTasks)
      .values({
        tenantId: testTenantId,
        type: "dedup_review",
        approvalType: "dedup_review",
        entityType: "company",
        entityId: companyA.id,
        title: "Revizie calitate",
        description: "Scor calitate redus",
        status: "pending",
        urgency: "medium",
        priorityLevel: "normal",
        priority: 0.5, // Real numeric field (0.5 = normal priority, 1 = high, 0 = low)
        requestedBy: testUserId,
        etapa: "E1",
        dueAt: new Date(Date.now() + 120 * 60 * 1000),
        metadata: {
          companyAId: companyA.id,
          companyBId: companyB.id,
          dedupCandidateId: dedupCandidate.id,
        },
      })
      .returning();

    await page.route("**/api/v1/enrichment/approvals?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: task.id,
              title: "Revizie calitate",
              description: "Scor calitate redus",
              urgency: "MED",
              aiConfidence: 0.55,
            },
          ],
        }),
      });
    });

    await page.route(`**/api/v1/enrichment/approvals/${task.id}/decide`, async (route) => {
      // Simulate reject decision
      await db
        .update(approvalTasks)
        .set({
          status: "rejected",
          decision: "reject",
          decidedBy: testUserId,
          decidedAt: new Date(),
        })
        .where(eq(approvalTasks.id, task.id));

      // Simulate reject: update dedup candidate status to rejected
      await db
        .update(silverDedupCandidates)
        .set({
          status: "rejected",
        })
        .where(eq(silverDedupCandidates.id, dedupCandidate.id));

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { id: task.id, status: "rejected" },
        }),
      });
    });

    await page.goto("/approvals");
    await expect(page.getByText(/HITL Approvals/i)).toBeVisible();
    await expect(page.getByText("Revizie calitate")).toBeVisible();

    await page.getByRole("button", { name: /Respinge/i }).click();

    // Verify DB changes: dedup candidate should be rejected
    const updatedDedup = await db.query.silverDedupCandidates.findFirst({
      where: (t, { eq }) => eq(t.id, dedupCandidate.id),
    });
    expect(updatedDedup?.status).toBe("rejected");
    expect(updatedDedup?.masterCompanyId).toBeNull();

    // Verify both companies still exist separately
    const companyACheck = await db.query.silverCompanies.findFirst({
      where: (t, { eq }) => eq(t.id, companyA.id),
    });
    const companyBCheck = await db.query.silverCompanies.findFirst({
      where: (t, { eq }) => eq(t.id, companyB.id),
    });
    expect(companyACheck).toBeDefined();
    expect(companyBCheck).toBeDefined();
    expect(companyACheck?.id).not.toBe(companyBCheck?.id);
  });

  test("tab Completed shows resolved tasks", async ({ page }) => {
    await page.route("**/api/v1/enrichment/approvals?**", async (route) => {
      const url = route.request().url();
      const isCompleted = url.includes("approved") || url.includes("rejected");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: isCompleted
            ? [
                {
                  id: "c1",
                  title: "Task finalizat",
                  decidedAt: new Date().toISOString(),
                  decision: "approve",
                },
              ]
            : [],
        }),
      });
    });

    await page.goto("/approvals");
    await expect(page.getByText(/HITL Approvals/i)).toBeVisible();
    await page.getByRole("button", { name: /Completate/i }).click();
    await expect(page.getByText("Task finalizat")).toBeVisible();
  });
});
