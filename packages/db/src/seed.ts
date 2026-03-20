import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db, closeDbConnection } from "./client.js";
import { tenants } from "./schemas/tenants.js";
import { users } from "./schemas/users.js";
import { roles } from "./schemas/rbac.js";
import { approvalTypeConfigs } from "./schemas/approval.js";
import { silverCompanies, silverContacts } from "./schemas/silver.js";

const DEMO_PASSWORD_HASH = bcrypt.hashSync("demo123456", 10);

async function seedTenantPipelineData(tenantId: string, tenantSlug: string) {
  const insertedCompanies = await db
    .insert(silverCompanies)
    .values(
      Array.from({ length: 10 }).map((_, idx) => {
        const companyNo = idx + 1;
        return {
          tenantId,
          cui: `${tenantSlug.replaceAll("-", "").slice(0, 6).toUpperCase()}${String(companyNo).padStart(4, "0")}`,
          denumire: `Ferma ${tenantSlug} ${companyNo}`,
          email: `office${companyNo}@${tenantSlug}.ro`,
          telefon: `07${String(10000000 + companyNo)}`,
          adresa: `Str. Agricultorilor ${companyNo}`,
          judet: "Cluj",
          localitate: "Cluj-Napoca",
          enrichmentStatus: "pending" as const,
          promotionStatus: "blocked" as const,
          dedupStatus: "pending" as const,
          metadata: { seeded: true, seedBatch: "s1-pr6" },
        };
      }),
    )
    .onConflictDoNothing({ target: [silverCompanies.tenantId, silverCompanies.cui] })
    .returning({ id: silverCompanies.id });

  const companyIds =
    insertedCompanies.length > 0
      ? insertedCompanies.map((row) => row.id)
      : (
          await db
            .select({ id: silverCompanies.id })
            .from(silverCompanies)
            .where(eq(silverCompanies.tenantId, tenantId))
            .limit(10)
        ).map((row) => row.id);

  const contactsPayload = companyIds.flatMap((companyId, companyIndex) =>
    Array.from({ length: 5 }).map((_, contactIndex) => {
      const n = companyIndex * 5 + contactIndex + 1;
      return {
        tenantId,
        companyId,
        prenume: `Contact${n}`,
        nume: `Demo${companyIndex + 1}`,
        email: `contact${n}.${tenantSlug}@example.com`,
        telefon: `07${String(20000000 + n)}`,
        telefonE164: `+407${String(20000000 + n)}`,
        functie: n % 2 === 0 ? "Administrator" : "Manager",
        seniority: n % 2 === 0 ? "senior" : "mid",
        isDecisionMaker: n % 3 === 0,
        isPrimary: contactIndex === 0,
        enrichmentStatus: "pending" as const,
        metadata: { seeded: true, seedBatch: "s1-pr6" },
      };
    }),
  );

  if (contactsPayload.length > 0) {
    await db
      .insert(silverContacts)
      .values(contactsPayload)
      .onConflictDoNothing({
        target: [silverContacts.tenantId, silverContacts.companyId, silverContacts.emailNormalized],
      });
  }
}

async function seed() {
  console.log("Seeding database...");

  const [tenant1] = await db
    .insert(tenants)
    .values({
      name: "Demo Tenant",
      slug: "demo-tenant",
      status: "active",
      settings: { plan: "professional", maxUsers: 10 },
    })
    .onConflictDoNothing({ target: tenants.slug })
    .returning();

  const [tenant2] = await db
    .insert(tenants)
    .values({
      name: "Test Tenant",
      slug: "test-tenant",
      status: "trial",
      settings: { plan: "starter", maxUsers: 5 },
    })
    .onConflictDoNothing({ target: tenants.slug })
    .returning();

  const demoTenant =
    tenant1 ?? (await db.select().from(tenants).where(eq(tenants.slug, "demo-tenant")).limit(1))[0];
  const testTenant =
    tenant2 ?? (await db.select().from(tenants).where(eq(tenants.slug, "test-tenant")).limit(1))[0];

  for (const tenant of [demoTenant, testTenant]) {
    if (!tenant) continue;
    await db
      .insert(users)
      .values([
        {
          tenantId: tenant.id,
          email: `owner@${tenant.slug}.com`,
          name: "Owner User",
          role: "owner",
          status: "active",
          passwordHash: DEMO_PASSWORD_HASH,
        },
        {
          tenantId: tenant.id,
          email: `admin@${tenant.slug}.com`,
          name: "Admin User",
          role: "admin",
          status: "active",
          passwordHash: DEMO_PASSWORD_HASH,
        },
        {
          tenantId: tenant.id,
          email: `operator@${tenant.slug}.com`,
          name: "Operator User",
          role: "operator",
          status: "active",
          passwordHash: DEMO_PASSWORD_HASH,
        },
      ])
      .onConflictDoNothing({ target: [users.tenantId, users.email] });

    await db.insert(roles).values([
      {
        tenantId: tenant.id,
        name: "Super Admin",
        description: "Full access",
        isSystem: true,
      },
      {
        tenantId: tenant.id,
        name: "Sales Manager",
        description: "Sales team lead",
      },
      {
        tenantId: tenant.id,
        name: "Sales Operator",
        description: "Sales representative",
      },
    ]);

    await seedTenantPipelineData(tenant.id, tenant.slug);
  }

  if (demoTenant) {
    await db.insert(approvalTypeConfigs).values([
      {
        tenantId: demoTenant.id,
        type: "dedup_review",
        etapa: "E1",
        autoApproveThreshold: 0.95,
        autoRejectThreshold: 0.3,
        requiresHumanReview: "threshold",
        maxDecisionTimeHours: 24,
        escalationTimeHours: 4,
      },
      {
        tenantId: demoTenant.id,
        type: "identity_conflict",
        etapa: "E1",
        autoApproveThreshold: 0.98,
        autoRejectThreshold: 0.4,
        requiresHumanReview: "always",
        maxDecisionTimeHours: 8,
        escalationTimeHours: 2,
      },
      {
        tenantId: demoTenant.id,
        type: "quality_review",
        etapa: "E1",
        autoApproveThreshold: 0.9,
        autoRejectThreshold: 0.2,
        requiresHumanReview: "threshold",
        maxDecisionTimeHours: 48,
        escalationTimeHours: 8,
      },
      {
        tenantId: demoTenant.id,
        type: "ai_structuring_review",
        etapa: "E1",
        autoApproveThreshold: 0.85,
        autoRejectThreshold: 0.25,
        requiresHumanReview: "threshold",
        maxDecisionTimeHours: 24,
        escalationTimeHours: 4,
      },
      {
        tenantId: demoTenant.id,
        type: "ai_merge_review",
        etapa: "E1",
        autoApproveThreshold: 0.92,
        autoRejectThreshold: 0.35,
        requiresHumanReview: "threshold",
        maxDecisionTimeHours: 12,
        escalationTimeHours: 2,
      },
      {
        tenantId: demoTenant.id,
        type: "low_confidence_review",
        etapa: "E1",
        autoApproveThreshold: 0.8,
        autoRejectThreshold: 0.2,
        requiresHumanReview: "always",
        maxDecisionTimeHours: 72,
        escalationTimeHours: 12,
      },
      {
        tenantId: demoTenant.id,
        type: "error_review",
        etapa: "E1",
        autoApproveThreshold: 0,
        autoRejectThreshold: 0,
        requiresHumanReview: "always",
        maxDecisionTimeHours: 4,
        escalationTimeHours: 1,
      },
    ]);
  }

  const [e2eTenant] = await db
    .insert(tenants)
    .values({
      name: "E2E Test Tenant",
      slug: "e2e-test",
      status: "trial",
      settings: { plan: "test", maxUsers: 3, isE2E: true },
    })
    .onConflictDoNothing({ target: tenants.slug })
    .returning();

  if (e2eTenant) {
    await db
      .insert(users)
      .values({
        tenantId: e2eTenant.id,
        email: "test@e2e-test.com",
        name: "E2E Test User",
        role: "admin",
        status: "active",
        passwordHash: DEMO_PASSWORD_HASH,
      })
      .onConflictDoNothing({ target: [users.tenantId, users.email] });
  }

  console.log("Seed completed");
  await closeDbConnection();
  process.exit(0);
}

// Enterprise-grade: Use top-level await instead of promise chain for better error handling and clarity
try {
  await seed();
} catch (err) {
  console.error("Seed failed:", err);
  process.exit(1);
}
