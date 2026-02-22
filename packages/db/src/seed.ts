import { db } from "./client.js";
import { tenants } from "./schemas/tenants.js";
import { users } from "./schemas/users.js";
import { roles } from "./schemas/rbac.js";
import { approvalTypeConfigs } from "./schemas/approval.js";

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
    .returning();

  const [tenant2] = await db
    .insert(tenants)
    .values({
      name: "Test Tenant",
      slug: "test-tenant",
      status: "trial",
      settings: { plan: "starter", maxUsers: 5 },
    })
    .returning();

  for (const tenant of [tenant1, tenant2]) {
    await db.insert(users).values([
      {
        tenantId: tenant.id,
        email: `owner@${tenant.slug}.com`,
        name: "Owner User",
        role: "owner",
        status: "active",
        passwordHash: "$2b$10$placeholder",
      },
      {
        tenantId: tenant.id,
        email: `admin@${tenant.slug}.com`,
        name: "Admin User",
        role: "admin",
        status: "active",
        passwordHash: "$2b$10$placeholder",
      },
      {
        tenantId: tenant.id,
        email: `operator@${tenant.slug}.com`,
        name: "Operator User",
        role: "operator",
        status: "active",
        passwordHash: "$2b$10$placeholder",
      },
    ]);

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

  await db.insert(approvalTypeConfigs).values([
    {
      tenantId: tenant1.id,
      type: "company_validation",
      etapa: "E1",
      autoApproveThreshold: 0.95,
      autoRejectThreshold: 0.3,
      requiresHumanReview: "threshold",
    },
    {
      tenantId: tenant1.id,
      type: "lead_qualification",
      etapa: "E1",
      autoApproveThreshold: 0.9,
      autoRejectThreshold: 0.2,
      requiresHumanReview: "always",
    },
    {
      tenantId: tenant1.id,
      type: "outreach_approval",
      etapa: "E2",
      autoApproveThreshold: 0.85,
      autoRejectThreshold: 0.25,
      requiresHumanReview: "threshold",
    },
  ]);

  console.log("Seed completed");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
