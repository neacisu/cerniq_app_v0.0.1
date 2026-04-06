/**
 * POST/PATCH silver-gold: promote, enrich (queued), gold PATCH, transition — contract handler-e reale (BullMQ + DB).
 * Complement la `silver-gold-routes-contract.test.ts` (liste + Zod GET).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";
import {
  db,
  eq,
  goldCompanies,
  insert_tenant,
  insert_user,
  setSessionRequestContext,
  setSessionTenantId,
  silverCompanies,
  silverDedupCandidates,
  sql,
  tenants,
  users,
  TEST_PASSWORD_HASH,
} from "@cerniq/db";

describe.sequential("Silver / Gold — mutații POST/PATCH (contract)", () => {
  let app: FastifyInstance;
  let tenantId: string;
  let userId: string;
  let token: string;
  let silverId: string;
  let goldId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const t = await insert_tenant(`sg-mut-${Date.now()}`, `sgm-${Date.now()}`);
    tenantId = t.id;
    await setSessionTenantId(tenantId);

    const user = await insert_user(
      tenantId,
      `sgm-${Date.now()}@example.com`,
      TEST_PASSWORD_HASH,
      "SG Mutations",
      "admin",
      "active",
    );
    userId = user.id;

    token = app.jwt.sign({
      id: user.id,
      userId: user.id,
      sub: user.id,
      tenantId,
      role: "admin",
      tokenType: "access",
    });

    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
      const [s] = await tx
        .insert(silverCompanies)
        .values({
          tenantId,
          denumire: "Mutation Silver Co",
          cui: "90000001",
          promotionStatus: "eligible",
        })
        .returning();
      if (!s) throw new Error("insert silver failed");
      silverId = s.id;

      const [g] = await tx
        .insert(goldCompanies)
        .values({
          tenantId,
          silverId,
          bronzeIds: [],
          cui: "90000001",
          denumire: "Mutation Gold Co",
          currentState: "COLD",
        })
        .returning();
      if (!g) throw new Error("insert gold failed");
      goldId = g.id;
    });
  });

  afterAll(async () => {
    await setSessionRequestContext({ tenantId, userId });
    await db.delete(goldCompanies).where(eq(goldCompanies.tenantId, tenantId));
    await db.delete(silverCompanies).where(eq(silverCompanies.tenantId, tenantId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(tenants).where(eq(tenants.id, tenantId));
    await app.close();
  });

  function hdr(): Record<string, string> {
    return { authorization: `Bearer ${token}`, "x-tenant-id": tenantId };
  }

  it("POST /silver/companies/:id/promote — 200 queued", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/silver/companies/${silverId}/promote`,
      headers: { ...hdr(), "content-type": "application/json" },
      payload: { force: false },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: { id: string; queued: boolean } };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(silverId);
    expect(body.data.queued).toBe(true);
  });

  it("POST /silver/companies/:id/enrich — 200 queued", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/silver/companies/${silverId}/enrich`,
      headers: { ...hdr(), "content-type": "application/json" },
      payload: { force: false },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: { queued: boolean } };
    expect(body.success).toBe(true);
    expect(body.data.queued).toBe(true);
  });

  it("PATCH /gold/companies/:id — 200 actualizare câmpuri", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/gold/companies/${goldId}`,
      headers: { ...hdr(), "content-type": "application/json" },
      payload: { doNotContact: true },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: { doNotContact?: boolean } };
    expect(body.success).toBe(true);
    expect(body.data.doNotContact).toBe(true);
  });

  it("POST /gold/companies/:id/transition — 200 tranzitie validă COLD → CONTACTED_WA", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/gold/companies/${goldId}/transition`,
      headers: { ...hdr(), "content-type": "application/json" },
      payload: { toState: "CONTACTED_WA" },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { success: boolean }).success).toBe(true);
  });

  it("POST /gold/companies/:id/transition — 409 tranzitie invalidă", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/gold/companies/${goldId}/transition`,
      headers: { ...hdr(), "content-type": "application/json" },
      payload: { toState: "NEGOTIATION" },
    });
    expect(res.statusCode).toBe(409);
    expect((res.json() as { success: boolean }).success).toBe(false);
  });

  it("POST /silver/dedup-candidates/:id/decide — 404 candidat inexistent", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/silver/dedup-candidates/00000000-0000-4000-8000-000000000099/decide",
      headers: { ...hdr(), "content-type": "application/json" },
      payload: { decision: "reject" },
    });
    expect(res.statusCode).toBe(404);
  });
});

/**
 * Dedup decide: merge (200) — același flux ca `silver-gold.ts` (secondary → master în DB).
 * Reject (200) — candidat `rejected`, fără mutație silverCompanies.
 */
describe.sequential("Silver / Gold — dedup decide merge & reject (contract DB)", () => {
  let app: FastifyInstance;
  let tenantId: string;
  let userId: string;
  let token: string;
  let silverMergeA: string;
  let silverMergeB: string;
  let candMergeId: string;
  let silverRejectA: string;
  let silverRejectB: string;
  let candRejectId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const t = await insert_tenant(`sg-dedup-${Date.now()}`, `sgd-${Date.now()}`);
    tenantId = t.id;
    await setSessionTenantId(tenantId);

    const user = await insert_user(
      tenantId,
      `sgd-${Date.now()}@example.com`,
      TEST_PASSWORD_HASH,
      "SG Dedup",
      "admin",
      "active",
    );
    userId = user.id;
    token = app.jwt.sign({
      id: user.id,
      userId: user.id,
      sub: user.id,
      tenantId,
      role: "admin",
      tokenType: "access",
    });

    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);

      const [a] = await tx
        .insert(silverCompanies)
        .values({
          tenantId,
          denumire: "Dedup Master Silver",
          cui: `DM${suffix}`,
          promotionStatus: "eligible",
        })
        .returning();
      const [b] = await tx
        .insert(silverCompanies)
        .values({
          tenantId,
          denumire: "Dedup Secondary Silver",
          cui: `DS${suffix}`,
          promotionStatus: "eligible",
        })
        .returning();
      if (!a?.id || !b?.id) throw new Error("insert merge silvers failed");
      silverMergeA = a.id;
      silverMergeB = b.id;

      const [cm] = await tx
        .insert(silverDedupCandidates)
        .values({
          tenantId,
          companyAId: silverMergeA,
          companyBId: silverMergeB,
          overallConfidence: "0.9500",
          status: "pending",
        })
        .returning();
      if (!cm?.id) throw new Error("insert merge candidate failed");
      candMergeId = cm.id;

      const [ra] = await tx
        .insert(silverCompanies)
        .values({
          tenantId,
          denumire: "Reject A Silver",
          cui: `RA${suffix}`,
          promotionStatus: "eligible",
        })
        .returning();
      const [rb] = await tx
        .insert(silverCompanies)
        .values({
          tenantId,
          denumire: "Reject B Silver",
          cui: `RB${suffix}`,
          promotionStatus: "eligible",
        })
        .returning();
      if (!ra?.id || !rb?.id) throw new Error("insert reject silvers failed");
      silverRejectA = ra.id;
      silverRejectB = rb.id;

      const [cr] = await tx
        .insert(silverDedupCandidates)
        .values({
          tenantId,
          companyAId: silverRejectA,
          companyBId: silverRejectB,
          overallConfidence: "0.8800",
          status: "pending",
        })
        .returning();
      if (!cr?.id) throw new Error("insert reject candidate failed");
      candRejectId = cr.id;
    });
  });

  afterAll(async () => {
    await setSessionRequestContext({ tenantId, userId });
    await db.delete(silverDedupCandidates).where(eq(silverDedupCandidates.tenantId, tenantId));
    await db.delete(silverCompanies).where(eq(silverCompanies.tenantId, tenantId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(tenants).where(eq(tenants.id, tenantId));
    await app.close();
  });

  function hdr(): Record<string, string> {
    return { authorization: `Bearer ${token}`, "x-tenant-id": tenantId };
  }

  it("POST /silver/dedup-candidates/:id/decide — 200 merge, secondary marcat merged în DB", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/silver/dedup-candidates/${candMergeId}/decide`,
      headers: { ...hdr(), "content-type": "application/json" },
      payload: { decision: "merge", reason: "contract-test-merge" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      success: boolean;
      data: { decision: string; masterCompanyId: string | null };
    };
    expect(body.success).toBe(true);
    expect(body.data.decision).toBe("merge");
    expect(body.data.masterCompanyId).toBe(silverMergeA);

    const [candRow] = await db
      .select({ status: silverDedupCandidates.status })
      .from(silverDedupCandidates)
      .where(eq(silverDedupCandidates.id, candMergeId));
    expect(candRow?.status).toBe("merged");

    const [sec] = await db
      .select({
        dedupStatus: silverCompanies.dedupStatus,
        masterRecordId: silverCompanies.masterRecordId,
      })
      .from(silverCompanies)
      .where(eq(silverCompanies.id, silverMergeB));
    expect(sec?.dedupStatus).toBe("merged");
    expect(sec?.masterRecordId).toBe(silverMergeA);
  });

  it("POST /silver/dedup-candidates/:id/decide — 200 reject, candidat rejected în DB", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/silver/dedup-candidates/${candRejectId}/decide`,
      headers: { ...hdr(), "content-type": "application/json" },
      payload: { decision: "reject", reason: "contract-test-reject" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: { decision: string } };
    expect(body.success).toBe(true);
    expect(body.data.decision).toBe("reject");

    const [candRow] = await db
      .select({ status: silverDedupCandidates.status })
      .from(silverDedupCandidates)
      .where(eq(silverDedupCandidates.id, candRejectId));
    expect(candRow?.status).toBe("rejected");

    const [sa] = await db
      .select({ dedupStatus: silverCompanies.dedupStatus })
      .from(silverCompanies)
      .where(eq(silverCompanies.id, silverRejectA));
    const [sb] = await db
      .select({ dedupStatus: silverCompanies.dedupStatus })
      .from(silverCompanies)
      .where(eq(silverCompanies.id, silverRejectB));
    expect(sa?.dedupStatus).not.toBe("merged");
    expect(sb?.dedupStatus).not.toBe("merged");
  });
});
