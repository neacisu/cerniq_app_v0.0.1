import { test, expect } from "@playwright/test";
import {
  db,
  tenants,
  users,
  bronzeContacts,
  silverCompanies,
  goldCompanies,
  setSessionTenantId,
  eq,
  TEST_PASSWORD_HASH,
} from "@cerniq/db";
import { createHash } from "node:crypto";

function buildSha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

test.describe("Etapa 1 - Pipeline Flow Bronze → Silver → Gold", () => {
  let testTenantId: string;
  let testUserId: string;

  test.beforeAll(async () => {
    // Respect the real tenant schema: slug is mandatory.
    const tenantName = `test-tenant-${Date.now()}`;
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: tenantName,
        slug: tenantName.toLowerCase().replaceAll(/\s+/g, "-").slice(0, 80),
        status: "active",
      })
      .returning();
    testTenantId = tenant.id;

    // Reuse the shared test hash so auth-related fixtures stay consistent across suites.
    const [user] = await db
      .insert(users)
      .values({
        tenantId: testTenantId,
        email: `test-${Date.now()}@example.com`,
        name: "Pipeline Test User",
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
    await db.delete(goldCompanies).where(eq(goldCompanies.tenantId, testTenantId));
    await db.delete(silverCompanies).where(eq(silverCompanies.tenantId, testTenantId));
    await db.delete(bronzeContacts).where(eq(bronzeContacts.tenantId, testTenantId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(tenants).where(eq(tenants.id, testTenantId));
  });

  test("should process complete flow: Bronze → Silver → Gold", async () => {
    // Step 1: Create Bronze contact
    const bronzePayload = { name: "Test Pipeline Company SRL", cui: "12345678" };
    const bronzeSourceIdentifier = `manual:${testTenantId}:pipeline-company:12345678`;
    const [bronze] = await db
      .insert(bronzeContacts)
      .values({
        tenantId: testTenantId,
        extractedName: "Test Pipeline Company SRL",
        extractedCui: "12345678",
        extractedEmail: "test@example.com",
        sourceType: "manual",
        sourceIdentifier: bronzeSourceIdentifier,
        processingStatus: "pending",
        rawPayload: bronzePayload,
        contentHash: buildSha256(JSON.stringify(bronzePayload)),
        sourcePayloadHash: buildSha256(
          `${bronzeSourceIdentifier}:${JSON.stringify(bronzePayload)}`,
        ),
      })
      .returning();

    // Verify Bronze created
    const bronzeCheck = await db.query.bronzeContacts.findFirst({
      where: (t, { eq }) => eq(t.id, bronze.id),
    });
    expect(bronzeCheck).toBeDefined();
    expect(bronzeCheck?.processingStatus).toBe("pending");

    // Step 2: Simulate normalize (update bronze with normalized data)
    await db
      .update(bronzeContacts)
      .set({
        extractedName: "TEST PIPELINE COMPANY SRL",
        extractedCui: "12345678",
        processingStatus: "processing",
      })
      .where(eq(bronzeContacts.id, bronze.id));

    // Step 3: Simulate validate (identitate rezolvată — schema `bronze_contacts` nu are `cuiValidated`)
    await db
      .update(bronzeContacts)
      .set({
        identityStatus: "resolved",
        processingStatus: "promoted",
      })
      .where(eq(bronzeContacts.id, bronze.id));

    // Step 4: Promote to Silver
    const [silver] = await db
      .insert(silverCompanies)
      .values({
        tenantId: testTenantId,
        sourceBronzeId: bronze.id,
        denumire: "TEST PIPELINE COMPANY SRL",
        cui: "12345678",
        cuiValidated: true,
        enrichmentStatus: "pending",
        promotionStatus: "blocked",
      })
      .returning();

    // Verify Silver created
    const silverCheck = await db.query.silverCompanies.findFirst({
      where: (t, { eq }) => eq(t.id, silver.id),
    });
    expect(silverCheck).toBeDefined();
    expect(silverCheck?.sourceBronzeId).toBe(bronze.id);
    expect(silverCheck?.enrichmentStatus).toBe("pending");

    // Step 5: Simulate enrichment (update scores)
    await db
      .update(silverCompanies)
      .set({
        enrichmentStatus: "complete",
        completenessScore: "85",
        accuracyScore: "80",
        freshnessScore: "75",
        totalQualityScore: "80", // Above 70, should be eligible
        promotionStatus: "eligible",
      })
      .where(eq(silverCompanies.id, silver.id));

    // Verify enrichment complete
    const silverEnriched = await db.query.silverCompanies.findFirst({
      where: (t, { eq }) => eq(t.id, silver.id),
    });
    expect(silverEnriched?.enrichmentStatus).toBe("complete");
    expect(silverEnriched?.promotionStatus).toBe("eligible");
    expect(silverEnriched?.totalQualityScore).toBe("80");

    // Step 6: Promote to Gold
    const [gold] = await db
      .insert(goldCompanies)
      .values({
        tenantId: testTenantId,
        silverId: silver.id,
        bronzeIds: [bronze.id],
        cui: "12345678",
        denumire: "TEST PIPELINE COMPANY SRL",
        currentState: "COLD",
        leadScore: "80",
      })
      .returning();

    // Verify Gold created
    const goldCheck = await db.query.goldCompanies.findFirst({
      where: (t, { eq }) => eq(t.id, gold.id),
    });
    expect(goldCheck).toBeDefined();
    expect(goldCheck?.silverId).toBe(silver.id);
    expect(goldCheck?.currentState).toBe("COLD");
    expect(goldCheck?.leadScore).toBe("80");

    const bronzeFinal = await db.query.bronzeContacts.findFirst({
      where: (t, { eq }) => eq(t.id, bronze.id),
    });
    const silverFinal = await db.query.silverCompanies.findFirst({
      where: (t, { eq }) => eq(t.id, silver.id),
    });

    // Verify complete flow: Bronze → Silver → Gold
    expect(bronzeFinal?.processingStatus).toBe("promoted");
    expect(silverFinal?.enrichmentStatus).toBe("complete");
    expect(silverFinal?.promotionStatus).toBe("eligible");
    expect(goldCheck?.currentState).toBe("COLD");
  });

  test("should handle quality review flow when score is 40-70", async () => {
    // Create Bronze
    const bronzePayload = { name: "Test Review Company SRL", cui: "87654321" };
    const bronzeSourceIdentifier = `manual:${testTenantId}:review-company:87654321`;
    const [bronze] = await db
      .insert(bronzeContacts)
      .values({
        tenantId: testTenantId,
        extractedName: "Test Review Company SRL",
        extractedCui: "87654321",
        sourceType: "manual",
        sourceIdentifier: bronzeSourceIdentifier,
        rawPayload: bronzePayload,
        contentHash: buildSha256(JSON.stringify(bronzePayload)),
        sourcePayloadHash: buildSha256(
          `${bronzeSourceIdentifier}:${JSON.stringify(bronzePayload)}`,
        ),
        processingStatus: "promoted",
      })
      .returning();

    // Create Silver with intermediate score
    const [silver] = await db
      .insert(silverCompanies)
      .values({
        tenantId: testTenantId,
        sourceBronzeId: bronze.id,
        denumire: "Test Review Company SRL",
        cui: "87654321",
        enrichmentStatus: "complete",
        completenessScore: "50",
        accuracyScore: "45",
        freshnessScore: "40",
        totalQualityScore: "45", // Between 40-70, should trigger review
        promotionStatus: "review_required",
      })
      .returning();

    // Verify Silver is in review_required status
    const silverCheck = await db.query.silverCompanies.findFirst({
      where: (t, { eq }) => eq(t.id, silver.id),
    });
    expect(silverCheck?.promotionStatus).toBe("review_required");
    expect(silverCheck?.totalQualityScore).toBe("45");

    // Cleanup
    await db.delete(silverCompanies).where(eq(silverCompanies.id, silver.id));
    await db.delete(bronzeContacts).where(eq(bronzeContacts.id, bronze.id));
  });
});
