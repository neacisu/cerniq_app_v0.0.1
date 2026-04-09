/**
 * GDPR API — POST /api/v1/gdpr/consent-log (anonim sau JWT) și POST /api/v1/gdpr/erasure (admin).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";
import {
  db,
  silverCompanies,
  goldCompanies,
  goldContacts,
  eq,
  sql,
  TEST_PASSWORD_HASH,
  insert_tenant,
  insert_user,
  setSessionRequestContext,
  setSessionTenantId,
  gdprErasureLog,
} from "@cerniq/db";

function slug(s: string) {
  return s.toLowerCase().replaceAll(/\s+/g, "-").slice(0, 80);
}

describe.sequential("GDPR API — consent-log și erasure", () => {
  let app: FastifyInstance;
  let tenantId: string;
  let adminId: string;
  let operatorId: string;
  let adminToken: string;
  let operatorToken: string;
  let otherTenantId: string;
  let otherGoldId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const t = await insert_tenant(`gdpr-api-${Date.now()}`, slug(`gdpr-${Date.now()}`));
    tenantId = t.id;
    await setSessionRequestContext({ tenantId, userId: "00000000-0000-0000-0000-000000000001" });

    const adm = await insert_user(
      tenantId,
      `gdpr-admin-${Date.now()}@example.com`,
      TEST_PASSWORD_HASH,
      "GDPR Admin",
      "admin",
      "active",
    );
    adminId = adm.id;

    const op = await insert_user(
      tenantId,
      `gdpr-op-${Date.now()}@example.com`,
      TEST_PASSWORD_HASH,
      "GDPR Op",
      "operator",
      "active",
    );
    operatorId = op.id;

    adminToken = app.jwt.sign({
      id: adminId,
      userId: adminId,
      sub: adminId,
      tenantId,
      role: "admin",
      tokenType: "access",
    });
    operatorToken = app.jwt.sign({
      id: operatorId,
      userId: operatorId,
      sub: operatorId,
      tenantId,
      role: "operator",
      tokenType: "access",
    });

    const ot = await insert_tenant(`gdpr-other-${Date.now()}`, slug(`gdpro-${Date.now()}`));
    otherTenantId = ot.id;
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${otherTenantId}, true)`);
      const [s] = await tx
        .insert(silverCompanies)
        .values({
          tenantId: otherTenantId,
          denumire: "Other Silver",
          cui: String(77000000 + (Date.now() % 9999)).slice(0, 10),
          promotionStatus: "eligible",
        })
        .returning();
      if (!s) throw new Error("silver");
      const [g] = await tx
        .insert(goldCompanies)
        .values({
          tenantId: otherTenantId,
          silverId: s.id,
          bronzeIds: [],
          cui: String(88000001 + (Date.now() % 999)).slice(0, 10),
          denumire: "Other Gold",
          currentState: "COLD",
        })
        .returning();
      if (!g) throw new Error("gold");
      otherGoldId = g.id;
    });
    await setSessionRequestContext({ tenantId, userId: adminId });
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /gdpr/consent-log — anonim → 200", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/gdpr/consent-log",
      payload: {
        tenantId: null,
        userId: null,
        consentCategories: { necessary: true, analytics: false, marketing: false },
        timestamp: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("POST /gdpr/erasure — operator → 403", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/gdpr/erasure",
      headers: { authorization: `Bearer ${operatorToken}` },
      payload: {
        subjectType: "contact",
        subjectId: "00000000-0000-0000-0000-000000000099",
        reason: "test",
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("POST /gdpr/erasure — cross-tenant company → 404", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/gdpr/erasure",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        subjectType: "company",
        subjectId: otherGoldId,
        reason: "test erasure cross-tenant",
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /gdpr/erasure — company fără comenzi → 200, rânduri șterse", async () => {
    let goldId = "";
    let contactId = "";
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
      const [s] = await tx
        .insert(silverCompanies)
        .values({
          tenantId,
          denumire: "Silver GDPR",
          cui: String(66000000 + (Date.now() % 9999)).slice(0, 10),
          promotionStatus: "eligible",
        })
        .returning();
      if (!s) throw new Error("s");
      const [g] = await tx
        .insert(goldCompanies)
        .values({
          tenantId,
          silverId: s.id,
          bronzeIds: [],
          cui: String(99000002 + (Date.now() % 999)).slice(0, 10),
          denumire: "Gold GDPR Erase",
          currentState: "COLD",
        })
        .returning();
      if (!g) throw new Error("g");
      goldId = g.id;
      const [c] = await tx
        .insert(goldContacts)
        .values({
          tenantId,
          companyId: g.id,
          prenume: "Test",
          nume: "Contact",
        })
        .returning();
      if (!c) throw new Error("c");
      contactId = c.id;
    });
    await setSessionRequestContext({ tenantId, userId: adminId });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/gdpr/erasure",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        subjectType: "contact",
        subjectId: contactId,
        reason: "test contact erasure",
      },
    });
    expect(res.statusCode).toBe(200);

    const [gone] = await db
      .select()
      .from(goldContacts)
      .where(eq(goldContacts.id, contactId))
      .limit(1);
    expect(gone).toBeUndefined();

    await setSessionTenantId(tenantId);
    const logs = await db
      .select()
      .from(gdprErasureLog)
      .where(eq(gdprErasureLog.subjectId, contactId))
      .limit(1);
    expect(logs.length).toBe(1);

    const resCo = await app.inject({
      method: "POST",
      url: "/api/v1/gdpr/erasure",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        subjectType: "company",
        subjectId: goldId,
        reason: "test company erasure",
      },
    });
    expect(resCo.statusCode).toBe(200);
    const [goneCo] = await db
      .select()
      .from(goldCompanies)
      .where(eq(goldCompanies.id, goldId))
      .limit(1);
    expect(goneCo).toBeUndefined();
  });
});
