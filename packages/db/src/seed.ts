import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db, closeDbConnection } from "./client.js";
import { tenants } from "./schemas/tenants.js";
import { users } from "./schemas/users.js";
import { roles } from "./schemas/rbac.js";
import { approvalTypeConfigs } from "./schemas/approval.js";

const DEMO_PASSWORD_HASH = bcrypt.hashSync("demo123456", 10);

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
  }

  if (demoTenant) {
    await db.insert(approvalTypeConfigs).values([
      {
        tenantId: demoTenant.id,
        type: "company_validation",
        etapa: "E1",
        autoApproveThreshold: 0.95,
        autoRejectThreshold: 0.3,
        requiresHumanReview: "threshold",
      },
      {
        tenantId: demoTenant.id,
        type: "lead_qualification",
        etapa: "E1",
        autoApproveThreshold: 0.9,
        autoRejectThreshold: 0.2,
        requiresHumanReview: "always",
      },
      {
        tenantId: demoTenant.id,
        type: "outreach_approval",
        etapa: "E2",
        autoApproveThreshold: 0.85,
        autoRejectThreshold: 0.25,
        requiresHumanReview: "threshold",
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

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
