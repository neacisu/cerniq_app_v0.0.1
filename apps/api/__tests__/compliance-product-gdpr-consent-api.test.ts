/**
 * Compliance produs — contract API pentru consimțământ referral (GDPR Art.7 în mesaje),
 * NPS cu cooldown + override `force`, export leads CSV (antete documentate).
 * Fără PII în aserțiuni: identificatori sintetici, fără logare de corp răspuns.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";
import {
  db,
  tenants,
  users,
  silverCompanies,
  goldCompanies,
  goldReferrals,
  goldNpsSurveys,
  eq,
  sql,
  TEST_PASSWORD_HASH,
  insert_tenant,
  insert_user,
  setSessionRequestContext,
  setSessionTenantId,
} from "@cerniq/db";

function buildSlug(name: string) {
  return name.toLowerCase().replaceAll(/\s+/g, "-").slice(0, 80);
}

type HttpMethod = "GET" | "POST" | "PATCH";

interface InjectOpts {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  payload?: string;
}

describe("Compliance — referral consent, NPS force, leads export (contract API)", () => {
  let app: FastifyInstance;
  let tenantId: string;
  let userId: string;
  let token: string;
  let referralIdAccept: string;
  let referralIdDecline: string;
  let npsLeadId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const t = await insert_tenant(`compliance-gdpr-${Date.now()}`, buildSlug(`cg-${Date.now()}`));
    tenantId = t.id;
    await setSessionTenantId(tenantId);

    const u = await insert_user(
      tenantId,
      `compliance-api-${Date.now()}@example.com`,
      TEST_PASSWORD_HASH,
      "Compliance API User",
      "admin",
      "active",
    );
    userId = u.id;
    await setSessionRequestContext({ tenantId, userId: userId });

    token = app.jwt.sign({
      id: userId,
      userId,
      sub: userId,
      tenantId,
      role: "admin",
      tokenType: "access",
    });

    const ts = Date.now();
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
      const [s] = await tx
        .insert(silverCompanies)
        .values({
          tenantId,
          denumire: `Silver Compliance ${ts}`,
          cui: String(88000000 + (ts % 9999)).slice(0, 10),
          promotionStatus: "eligible",
        })
        .returning();
      if (!s) throw new Error("silver insert failed");
      const silverId = s.id;

      const [g1] = await tx
        .insert(goldCompanies)
        .values({
          tenantId,
          silverId,
          bronzeIds: [],
          cui: String(99000001 + (ts % 999)).slice(0, 10),
          denumire: "Gold Referrer Synthetic",
          currentState: "COLD",
        })
        .returning();
      const [g2] = await tx
        .insert(goldCompanies)
        .values({
          tenantId,
          silverId,
          bronzeIds: [],
          cui: String(99000002 + (ts % 999)).slice(0, 10),
          denumire: "Gold Referred Synthetic",
          currentState: "COLD",
        })
        .returning();
      if (!g1 || !g2) throw new Error("gold insert failed");
      const referrerGoldId = g1.id;
      const referredGoldId = g2.id;

      const expiresAt = new Date(Date.now() + 30 * 86400000);
      const [refDecline] = await tx
        .insert(goldReferrals)
        .values({
          tenantId,
          referrerId: referrerGoldId,
          referredId: referredGoldId,
          referralType: "EXPLICIT",
          status: "PENDING_CONSENT",
          consentGiven: false,
          expiresAt,
        })
        .returning();
      const [refAccept] = await tx
        .insert(goldReferrals)
        .values({
          tenantId,
          referrerId: referrerGoldId,
          referredId: referredGoldId,
          referralType: "SOFT_MENTION",
          status: "PENDING_CONSENT",
          consentGiven: false,
          expiresAt,
        })
        .returning();
      if (!refDecline || !refAccept) throw new Error("referral insert failed");
      referralIdDecline = refDecline.id;
      referralIdAccept = refAccept.id;

      const [lead] = await tx
        .insert(goldCompanies)
        .values({
          tenantId,
          silverId,
          bronzeIds: [],
          cui: String(99000003 + (ts % 999)).slice(0, 10),
          denumire: "Gold NPS Lead Synthetic",
          currentState: "COLD",
        })
        .returning();
      if (!lead) throw new Error("nps lead insert failed");
      npsLeadId = lead.id;

      const cooldownUntil = new Date(Date.now() + 14 * 86400000);
      await tx.insert(goldNpsSurveys).values({
        tenantId,
        leadId: npsLeadId,
        sentVia: "EMAIL",
        cooldownUntil,
      });
    });
  });

  beforeEach(async () => {
    await setSessionRequestContext({ tenantId, userId: userId });
  });

  afterAll(async () => {
    if (!tenantId) {
      await app?.close();
      return;
    }
    await setSessionRequestContext({ tenantId, userId: userId });
    await db.delete(goldReferrals).where(eq(goldReferrals.tenantId, tenantId));
    await db.delete(goldNpsSurveys).where(eq(goldNpsSurveys.tenantId, tenantId));
    await db.delete(goldCompanies).where(eq(goldCompanies.tenantId, tenantId));
    await db.delete(silverCompanies).where(eq(silverCompanies.tenantId, tenantId));
    await db.delete(users).where(eq(users.tenantId, tenantId));
    await db.delete(tenants).where(eq(tenants.id, tenantId));
    await app.close();
  });

  function authed(method: HttpMethod, url: string, body?: unknown): InjectOpts {
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
    if (body !== undefined) {
      headers["content-type"] = "application/json";
      return { method, url, headers, payload: JSON.stringify(body) };
    }
    return { method, url, headers };
  }

  it("PATCH /api/v1/referrals/:id/consent — refuz documentat → DECLINED", async () => {
    const res = await app.inject(
      authed("PATCH", `/api/v1/referrals/${referralIdDecline}/consent`, {
        consentGiven: false,
      }),
    );
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      success: boolean;
      data: { consentGiven: boolean; status: string; consentGivenAt: string | null };
    };
    expect(body.success).toBe(true);
    expect(body.data.consentGiven).toBe(false);
    expect(body.data.status).toBe("DECLINED");
    expect(body.data.consentGivenAt).toBeNull();
  });

  it("PATCH /api/v1/referrals/:id/consent — contract câmpuri legale (consimțământ acordat)", async () => {
    const syntheticProofRef = "legal-proof-msg-ref-synthetic-001";
    const res = await app.inject(
      authed("PATCH", `/api/v1/referrals/${referralIdAccept}/consent`, {
        consentGiven: true,
        proofMessageId: syntheticProofRef,
      }),
    );
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      success: boolean;
      data: {
        consentGiven: boolean;
        status: string;
        consentGivenAt: string | null;
        consentProofMessageId: string | null;
      };
    };
    expect(body.success).toBe(true);
    expect(body.data.consentGiven).toBe(true);
    expect(body.data.status).toBe("ACTIVE");
    expect(typeof body.data.consentGivenAt).toBe("string");
    expect(body.data.consentProofMessageId).toBe(syntheticProofRef);
  });

  it("POST /api/v1/nurturing/nps/:leadId/send — 400 cooldown; 200 cu force:true și jobId", async () => {
    const cool = await app.inject(
      authed("POST", `/api/v1/nurturing/nps/${npsLeadId}/send`, {
        channel: "EMAIL",
        force: false,
      }),
    );
    expect(cool.statusCode).toBe(400);
    const coolBody = cool.json() as {
      success: boolean;
      error: string;
      meta?: { cooldownUntil: string };
    };
    expect(coolBody.success).toBe(false);
    expect(coolBody.error).toMatch(/cooldown/i);
    expect(coolBody.meta?.cooldownUntil).toBeDefined();
    expect(typeof coolBody.meta?.cooldownUntil).toBe("string");

    const forced = await app.inject(
      authed("POST", `/api/v1/nurturing/nps/${npsLeadId}/send`, {
        channel: "EMAIL",
        force: true,
      }),
    );
    expect(forced.statusCode).toBe(200);
    const ok = forced.json() as { success: boolean; data: { jobId: string } };
    expect(ok.success).toBe(true);
    expect(typeof ok.data.jobId).toBe("string");
    expect(ok.data.jobId.length).toBeGreaterThan(0);
  });

  it("GET /api/v1/outreach/leads/export — antete CSV documentate (tenant gol, fără rânduri date)", async () => {
    const res = await app.inject(authed("GET", "/api/v1/outreach/leads/export"));
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.headers["content-disposition"]).toMatch(/attachment/i);
    expect(res.headers["content-disposition"]).toMatch(/outreach-leads\.csv/);
    const lines = res.body.split("\n").filter((l: string) => l.length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(1);
    const header = lines[0] ?? "";
    expect(header).toContain("Company Name");
    expect(header).toContain("CUI");
    expect(header).toContain("Email");
    expect(header).toContain("State");
  });
});
